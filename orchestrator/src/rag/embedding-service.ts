/**
 * Serviço de geração de embeddings usando OpenAI
 * Fase 1.2 TDD: Implementação com cache e batch operations
 * 
 * Features:
 * - Geração de embeddings OpenAI text-embedding-3-small
 * - Cache LRU para evitar chamadas redundantes
 * - Batch operations otimizadas com chunking
 * - Métodos especializados (FAQ, slots, nomes de pacientes)
 * - Normalização automática de texto
 * - Métricas de performance
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { env } from '../config/env';

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

interface PerformanceMetrics {
  totalEmbeddings: number;
  cacheHitRate: number;
  averageLatency: number;
}

interface FAQData {
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
}

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;

  // Cache LRU com limite de 100 itens
  private cache: Map<string, number[]> = new Map();
  private readonly CACHE_LIMIT = 100;

  // Estatísticas
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalEmbeddings = 0;
  private totalLatency = 0;

  // Limites
  private readonly MAX_TEXT_LENGTH = 8000;
  private readonly BATCH_CHUNK_SIZE = 25;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: env.openai.embeddingModel,
      openAIApiKey: env.openai.apiKey,
    });
  }

  /**
   * Gera embedding para uma query
   * Com cache automático
   */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!text || text.trim() === '') {
      return null;
    }

    const normalizedText = this.normalizeText(text);
    const truncatedText = this.truncateText(normalizedText);

    // Chave de cache (lowercase para case-insensitive)
    const cacheKey = truncatedText.toLowerCase();

    // Verificar cache
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      return this.cache.get(cacheKey)!;
    }

    // Cache miss - gerar embedding
    this.cacheMisses++;
    const start = Date.now();

    const vector = await this.embeddings.embedQuery(truncatedText);

    const latency = Date.now() - start;
    this.totalLatency += latency;
    this.totalEmbeddings++;

    // Adicionar ao cache
    this.addToCache(cacheKey, vector);

    return vector;
  }

  /**
   * Gera embeddings para múltiplos documentos
   * Com cache e chunking automático
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const normalizedTexts = texts.map(t => this.normalizeText(t));

    // Separar textos cacheados de não-cacheados
    const results: number[][] = new Array(texts.length);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    for (let i = 0; i < normalizedTexts.length; i++) {
      const text = normalizedTexts[i];
      const cacheKey = text.toLowerCase();

      if (this.cache.has(cacheKey)) {
        this.cacheHits++;
        results[i] = this.cache.get(cacheKey)!;
      } else {
        this.cacheMisses++;
        uncachedIndices.push(i);
        uncachedTexts.push(text);
      }
    }

    // Processar textos não-cacheados em chunks
    if (uncachedTexts.length > 0) {
      const chunks = this.chunkArray(uncachedTexts, this.BATCH_CHUNK_SIZE);
      let uncachedResults: number[][] = [];

      for (const chunk of chunks) {
        const chunkVectors = await this.embeddings.embedDocuments(chunk);
        uncachedResults = uncachedResults.concat(chunkVectors);
        this.totalEmbeddings += chunk.length;
      }

      // Adicionar ao cache e aos resultados
      for (let i = 0; i < uncachedTexts.length; i++) {
        const text = uncachedTexts[i];
        const vector = uncachedResults[i];
        const originalIndex = uncachedIndices[i];

        this.addToCache(text.toLowerCase(), vector);
        results[originalIndex] = vector;
      }
    }

    return results;
  }

  /**
   * Gera embedding para um slot específico
   */
  async embedSlot(slot: Record<string, string | undefined>): Promise<number[]> {
    const text = Object.entries(slot)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    if (!text) {
      throw new Error('Slot vazio não pode ser convertido em embedding');
    }

    return (await this.embedQuery(text))!;
  }

  /**
   * Gera embedding para FAQ combinando pergunta, resposta e keywords
   */
  async embedFAQ(faq: FAQData): Promise<number[]> {
    let text = `${faq.question} ${faq.answer}`;

    if (faq.keywords && faq.keywords.length > 0) {
      text += ` ${faq.keywords.join(' ')}`;
    }

    return (await this.embedQuery(text))!;
  }

  /**
   * Gera embedding para nome de paciente
   * Normaliza para lowercase automático
   */
  async embedPatientName(name: string): Promise<number[]> {
    const normalized = name.trim().toLowerCase();
    return (await this.embedQuery(normalized))!;
  }

  // ==========================================
  // Cache Management
  // ==========================================

  /**
   * Adiciona ao cache com LRU (Least Recently Used)
   */
  private addToCache(key: string, vector: number[]): void {
    // Se atingiu limite, remover o mais antigo (primeiro item)
    if (this.cache.size >= this.CACHE_LIMIT) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, vector);
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Retorna tamanho do cache
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Retorna estatísticas do cache
   */
  getCacheStats(): CacheStats {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate,
    };
  }

  /**
   * Retorna métricas de performance
   */
  getMetrics(): PerformanceMetrics {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    const averageLatency = this.totalEmbeddings > 0
      ? this.totalLatency / this.totalEmbeddings
      : 0;

    return {
      totalEmbeddings: this.totalEmbeddings,
      cacheHitRate,
      averageLatency,
    };
  }

  // ==========================================
  // Text Processing Utilities
  // ==========================================

  /**
   * Normaliza texto (remove espaços extras, quebras de linha)
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Múltiplos espaços → espaço único
      .replace(/\n+/g, ' ') // Quebras de linha → espaço
      .trim();
  }

  /**
   * Trunca texto se exceder limite
   */
  private truncateText(text: string): string {
    if (text.length <= this.MAX_TEXT_LENGTH) {
      return text;
    }

    return text.substring(0, this.MAX_TEXT_LENGTH);
  }

  /**
   * Divide array em chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
