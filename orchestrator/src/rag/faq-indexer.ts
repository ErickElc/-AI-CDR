/**
 * FAQ Indexer - Sistema de indexação de FAQs no Qdrant
 * Fase 1.3 TDD: Carrega FAQs, gera embeddings e indexa no Qdrant
 * 
 * Features:
 * - Carrega FAQs do JSON
 * - Gera embeddings via EmbeddingService  
 * - Indexa em batch no Qdrant
 * - Verifica status de indexação
 * - Suporta re-indexação
 * - Logging e métricas
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { QdrantClient } from './qdrant-client';
import { EmbeddingService } from './embedding-service';
import { QdrantPoint } from '../types';

export interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    keywords?: string[];
}

export interface IndexingResult {
    success: boolean;
    indexed: number;
    failed: number;
    errors: number;
    duration: number;
}

export class FAQIndexer {
    private readonly faqFilePath: string;

    constructor(
        private qdrantClient: QdrantClient,
        private embeddingService: EmbeddingService,
        customPath?: string
    ) {
        this.faqFilePath = customPath || path.join(__dirname, '../data/faq.json');
    }

    /**
     * Carrega FAQs do arquivo JSON
     */
    async loadFAQs(): Promise<FAQ[]> {
        try {
            const fileContent = await fs.readFile(this.faqFilePath, 'utf-8');
            const faqs = JSON.parse(fileContent);

            // Validar estrutura básica
            if (!Array.isArray(faqs)) {
                throw new Error('FAQ file must contain an array');
            }

            faqs.forEach((faq, index) => {
                if (!faq.id || !faq.question || !faq.answer || !faq.category) {
                    throw new Error(`FAQ at index ${index} is missing required fields`);
                }
            });

            return faqs;
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                throw new Error(`FAQ file not found: ${this.faqFilePath}`);
            }
            throw error;
        }
    }

    /**
     * Gera embeddings para todos os FAQs
     */
    async generateEmbeddings(faqs: FAQ[]): Promise<number[][]> {
        const embeddings: number[][] = [];

        for (const faq of faqs) {
            const embedding = await this.embeddingService.embedFAQ({
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
                keywords: faq.keywords,
            });
            embeddings.push(embedding);
        }

        return embeddings;
    }

    /**
     * Indexa todos os FAQs no Qdrant
     */
    async indexAll(): Promise<IndexingResult> {
        const startTime = Date.now();
        let indexed = 0;
        let failed = 0;
        let errors = 0;

        try {
            console.log('🔄 Iniciando indexação de FAQs...');

            // 1. Inicializar Qdrant
            await this.qdrantClient.initialize();
            console.log('✅ Qdrant inicializado');

            // 2. Carregar FAQs
            const faqs = await this.loadFAQs();
            console.log(`📚 ${faqs.length} FAQs carregados`);

            // 3. Gerar embeddings
            const points: QdrantPoint[] = [];

            for (let i = 0; i < faqs.length; i++) {
                try {
                    const faq = faqs[i];
                    const embedding = await this.embeddingService.embedFAQ({
                        question: faq.question,
                        answer: faq.answer,
                        category: faq.category,
                        keywords: faq.keywords,
                    });

                    points.push({
                        id: faq.id,
                        vector: embedding,
                        payload: {
                            question: faq.question,
                            answer: faq.answer,
                            category: faq.category,
                            keywords: faq.keywords || [],
                            indexedAt: new Date().toISOString(),
                        },
                    });

                    indexed++;
                } catch (error) {
                    console.error(`❌ Erro ao processar FAQ ${faqs[i].id}:`, error);
                    failed++;
                    errors++;
                }
            }

            console.log(`🧠 Embeddings gerados: ${indexed}/${faqs.length}`);

            // 4. Indexar em batch no Qdrant
            if (points.length > 0) {
                await this.qdrantClient.batchUpsertFAQ(points);
                console.log(`✅ ${points.length} FAQs indexados no Qdrant`);
            }

            const duration = Date.now() - startTime;
            console.log(`⏱️ Indexação concluída em ${duration}ms`);

            return {
                success: errors === 0,
                indexed,
                failed,
                errors,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Erro na indexação:', error);

            return {
                success: false,
                indexed,
                failed,
                errors: errors + 1,
                duration,
            };
        }
    }

    /**
     * Re-indexa todos os FAQs (usa cache de embeddings)
     */
    async reindex(): Promise<IndexingResult> {
        console.log('🔄 Re-indexando FAQs...');
        return await this.indexAll();
    }

    /**
     * Verifica se FAQs estão indexados
     */
    async isIndexed(): Promise<boolean> {
        const stats = await this.qdrantClient.getCollectionStats();
        return stats.faq > 0;
    }

    /**
     * Retorna contagem de FAQs indexados
     */
    async getIndexedCount(): Promise<number> {
        const stats = await this.qdrantClient.getCollectionStats();
        return stats.faq;
    }
}
