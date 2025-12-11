/**
 * Serviço de recuperação de contexto usando RAG
 */

import { QdrantClient, SearchResult } from './qdrant-client';
import { EmbeddingService } from './embedding-service';
import { RAGContext, AppointmentHistory, FAQResult, ConversationResult, Slots } from '../types';

export class ContextRetrieval {
  private qdrantClient: QdrantClient;
  private embeddingService: EmbeddingService;

  constructor(qdrantClient: QdrantClient, embeddingService: EmbeddingService) {
    this.qdrantClient = qdrantClient;
    this.embeddingService = embeddingService;
  }

  /**
   * Busca contexto relevante para uma mensagem
   */
  async retrieveContext(
    message: string,
    slots?: Partial<Slots>
  ): Promise<RAGContext> {
    const context: RAGContext = {};

    // Buscar conversas similares
    const messageEmbedding = await this.embeddingService.embedQuery(message);

    if (!messageEmbedding) {
      return context; // Return empty context if embedding fails
    }

    const similarConversations = await this.qdrantClient.searchConversations(
      messageEmbedding,
      5
    );

    if (similarConversations.length > 0) {
      context.similarConversations = similarConversations.map(conv => ({
        sessionId: conv.payload.sessionId as string,
        message: conv.payload.message as string,
        slots: conv.payload.slots as Slots,
        outcome: conv.payload.outcome as string,
        score: conv.score,
      }));
    }

    // Buscar FAQs relacionados (semântico)
    let faqResults = await this.qdrantClient.searchFAQ(messageEmbedding, 5);

    // Se busca semântica não retornou resultados, tentar keywords
    if (faqResults.length === 0) {
      console.log('⚠️ Busca semântica vazia, tentando keywords...');
      faqResults = await this.searchFAQByKeywords(message);
    }

    if (faqResults.length > 0) {
      const topScore = faqResults[0]?.score.toFixed(2) || '0.00';
      console.log(`📊 FAQ: ${faqResults.length} resultados (top score: ${topScore})`);
      context.faqResults = faqResults.map(faq => ({
        question: faq.payload.pergunta as string,
        answer: faq.payload.resposta as string,
        score: faq.score,
      }));
    }

    // Se houver slots parciais, buscar informações relacionadas
    if (slots) {
      // Buscar histórico de agendamentos se nome estiver presente
      if (slots.nome) {
        const nomeEmbedding = await this.embeddingService.embedSlot({ nome: slots.nome });
        const appointments = await this.qdrantClient.searchAppointments(
          nomeEmbedding,
          10
        );

        if (appointments.length > 0) {
          context.appointmentHistory = appointments.map(apt => ({
            nomePaciente: apt.payload.nomePaciente as string,
            procedimento: apt.payload.procedimento as string,
            unidade: apt.payload.unidade as string,
            dataHora: new Date(apt.payload.dataHora as string),
            preferences: this.extractPreferences(appointments),
          }));
        }
      }

      // Buscar informações sobre procedimento
      if (slots.procedimento) {
        const procedimentoEmbedding = await this.embeddingService.embedSlot({
          procedimento: slots.procedimento,
        });
        // Aqui poderia buscar em FAQ ou conversas relacionadas
      }

      // Buscar informações sobre unidade
      if (slots.unidade) {
        const unidadeEmbedding = await this.embeddingService.embedSlot({
          unidade: slots.unidade,
        });
        // Aqui poderia buscar em FAQ ou conversas relacionadas
      }
    }

    return context;
  }

  /**
   * Busca FAQ por keywords como fallback
   */
  private async searchFAQByKeywords(query: string): Promise<SearchResult[]> {
    const queryWords = query.toLowerCase().split(/\s+/);

    try {
      // Buscar TODOS os FAQs usando método público
      const allResults = await this.qdrantClient.scrollAllFAQ(100);

      // Filtrar por keyword match
      const matches: SearchResult[] = [];

      for (const point of allResults.points) {
        if (!point.payload) continue;

        const keywords = (point.payload.keywords || []) as string[];
        const pergunta = (point.payload.pergunta || '') as string;

        // Checar se alguma palavra da query está nas keywords ou na pergunta
        const hasMatch = queryWords.some(word => {
          return keywords.some(kw => kw.toLowerCase().includes(word)) ||
            pergunta.toLowerCase().includes(word);
        });

        if (hasMatch) {
          matches.push({
            id: point.id as string,
            score: 0.5, // Score artificial para keyword match
            payload: point.payload
          });
        }
      }

      console.log(`🔍 Keyword search: ${matches.length} matches`);
      return matches.slice(0, 5); // Top 5

    } catch (error) {
      console.error('Erro em searchFAQByKeywords:', error);
      return [];
    }
  }

  /**
   * Extrai preferências do histórico de agendamentos
   */
  private extractPreferences(
    appointments: Array<{ payload: Record<string, unknown> }>
  ): AppointmentHistory['preferences'] {
    const unidades = new Set<string>();
    const procedimentos = new Set<string>();
    const horarios = new Set<string>();

    appointments.forEach(apt => {
      if (apt.payload.unidade) {
        unidades.add(apt.payload.unidade as string);
      }
      if (apt.payload.procedimento) {
        procedimentos.add(apt.payload.procedimento as string);
      }
      if (apt.payload.dataHora) {
        const date = new Date(apt.payload.dataHora as string);
        const hora = date.getHours().toString().padStart(2, '0') + ':00';
        horarios.add(hora);
      }
    });

    return {
      preferredUnits: Array.from(unidades),
      frequentProcedures: Array.from(procedimentos),
      preferredTimes: Array.from(horarios),
    };
  }
}


