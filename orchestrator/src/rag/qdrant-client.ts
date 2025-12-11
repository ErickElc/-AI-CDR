/**
 * Cliente Qdrant para RAG com 3 coleções
 * Fase 1 TDD: Implementação conforme testes
 * 
 * Coleções:
 * 1. faq_embeddings - Knowledge base FAQ
 * 2. conversation_history - Histórico de conversas 
 * 3. appointment_history - Histórico de agendamentos por paciente
 */

import { QdrantClient as QdrantSDK } from '@qdrant/js-client-rest';
import { QdrantPoint } from '../types';
import { env } from '../config/env';

export interface CollectionFilter {
  must?: Array<{ key: string; match: { value: string | number | boolean } }>;
  should?: Array<{ key: string; match: { value: string | number | boolean } }>;
  must_not?: Array<{ key: string; match: { value: string | number | boolean } }>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export interface CollectionStats {
  faq: number;
  conversations: number;
  appointments: number;
}

export class QdrantClient {
  private client: QdrantSDK;

  // Nomes das coleções do env config
  private readonly collections = {
    faq: env.qdrant.collections.faq,
    conversations: env.qdrant.collections.conversations,
    appointments: env.qdrant.collections.appointments,
  };

  constructor(url: string, apiKey?: string) {
    this.client = new QdrantSDK({
      url,
      apiKey,
    });
  }

  /**
   * Inicializa as 3 coleções necessárias
   * Cria apenas as que não existem
   */
  async initialize(): Promise<void> {
    const existingCollections = await this.client.getCollections();
    const collectionNames = existingCollections.collections.map(c => c.name);

    // Criar FAQ collection se não existir
    if (!collectionNames.includes(this.collections.faq)) {
      await this.client.createCollection(this.collections.faq, {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small
          distance: 'Cosine',
        },
      });
    }

    // Criar conversations collection se não existir
    if (!collectionNames.includes(this.collections.conversations)) {
      await this.client.createCollection(this.collections.conversations, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
    }

    // Criar appointments collection se não existir
    if (!collectionNames.includes(this.collections.appointments)) {
      await this.client.createCollection(this.collections.appointments, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
    }
  }

  // ==========================================
  // FAQ Collection Operations
  // ==========================================

  /**
   * Insere ou atualiza FAQ
   */
  async upsertFAQ(point: QdrantPoint): Promise<void> {
    await this.client.upsert(this.collections.faq, {
      wait: true,
      points: [point],
    });
  }

  /**
   * Batch upsert de FAQs (para indexação inicial)
   */
  async batchUpsertFAQ(points: QdrantPoint[]): Promise<void> {
    await this.client.upsert(this.collections.faq, {
      wait: true,
      points,
    });
  }

  /**
   * Busca FAQs por similaridade semântica
   */
  async searchFAQ(
    queryVector: number[],
    limit: number = 5,
    scoreThreshold: number = 0.3 // ← REDUZIDO de 0.7 para 0.3
  ): Promise<SearchResult[]> {
    const results = await this.client.search(this.collections.faq, {
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
    });

    return results.map(result => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as Record<string, unknown>,
    }));
  }

  /**
   * Scroll all FAQ points (para keyword search)
   */
  async scrollAllFAQ(limit: number = 100) {
    return await this.client.scroll(this.collections.faq, {
      limit,
      with_payload: true,
      with_vector: false
    });
  }

  // ==========================================
  // Conversation Collection Operations
  // ==========================================

  /**
   * Insere ou atualiza conversa completa
   */
  async upsertConversation(point: QdrantPoint): Promise<void> {
    await this.client.upsert(this.collections.conversations, {
      wait: true,
      points: [point],
    });
  }

  /**
   * Busca conversas similares com filtros opcionais
   */
  async searchConversations(
    queryVector: number[],
    limit: number = 5,
    scoreThreshold: number = 0.7,
    filter?: CollectionFilter
  ): Promise<SearchResult[]> {
    const searchParams: any = {
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
    };

    if (filter) {
      searchParams.filter = filter;
    }

    const results = await this.client.search(
      this.collections.conversations,
      searchParams
    );

    return results.map(result => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as Record<string, unknown>,
    }));
  }

  // ==========================================
  // Appointment Collection Operations
  // ==========================================

  /**
   * Insere ou atualiza agendamento
   */
  async upsertAppointment(point: QdrantPoint): Promise<void> {
    await this.client.upsert(this.collections.appointments, {
      wait: true,
      points: [point],
    });
  }

  /**
   * Busca agendamentos por nome do paciente (busca semântica)
   * Permite encontrar histórico mesmo com pequenas variações no nome
   */
  async searchAppointments(
    queryVector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    const results = await this.client.search(this.collections.appointments, {
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
    });

    return results.map(result => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as Record<string, unknown>,
    }));
  }

  /**
   * Deleta um agendamento específico
   */
  async deleteAppointment(pointId: string): Promise<void> {
    await this.client.delete(this.collections.appointments, {
      wait: true,
      points: [pointId],
    });
  }

  // ==========================================
  // Utilities
  // ==========================================

  /**
   * Retorna estatísticas de todas as coleções
   */
  async getCollectionStats(): Promise<CollectionStats> {
    const faqCount = await this.client.count(this.collections.faq);
    const conversationsCount = await this.client.count(this.collections.conversations);
    const appointmentsCount = await this.client.count(this.collections.appointments);

    return {
      faq: faqCount.count,
      conversations: conversationsCount.count,
      appointments: appointmentsCount.count,
    };
  }

  /**
   * Verifica se uma coleção existe
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    const existingCollections = await this.client.getCollections();
    const collectionNames = existingCollections.collections.map(c => c.name);
    return collectionNames.includes(collectionName);
  }

  /**
   * Retorna os nomes das coleções configuradas
   */
  getCollectionNames() {
    return {
      faq: this.collections.faq,
      conversations: this.collections.conversations,
      appointments: this.collections.appointments,
    };
  }

  /**
   * Retorna o cliente Qdrant para operações avançadas
   */
  getClient(): QdrantSDK {
    return this.client;
  }
}
