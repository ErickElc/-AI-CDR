/**
 * Script para inicializar FAQ no Qdrant
 * Executa uma vez para popular a base de conhecimento
 */

import { QdrantClient } from '../rag/qdrant-client';
import { EmbeddingService } from '../rag/embedding-service';
import { env } from '../config/env';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    keywords?: string[];
}

async function initializeFAQ() {
    try {
        console.log('🚀 Inicializando FAQ no Qdrant...');

        // Carregar FAQ
        const faqPath = join(__dirname, '../../data/faq.json');
        const faqData = JSON.parse(readFileSync(faqPath, 'utf-8')) as FAQItem[];

        // Inicializar serviços
        const qdrantClient = new QdrantClient(
            env.qdrant.url,
            env.qdrant.apiKey
        );
        await qdrantClient.initialize();

        const embeddingService = new EmbeddingService();

        // Processar cada item do FAQ
        console.log(`📚 Processando ${faqData.length} itens do FAQ...`);

        for (const item of faqData) {
            // Criar texto para embedding (pergunta + resposta)
            const text = `${item.question} ${item.answer}`;

            // Gerar embedding
            const embedding = await embeddingService.embedQuery(text);

            if (!embedding) {
                console.warn(`⚠️  Skipping FAQ item (embedding failed): ${item.question}`);
                continue;
            }

            // Criar ponto no Qdrant (sempre gerar novo UUID)
            const point = {
                id: uuidv4(), // Sempre novo UUID, ignorar item.id
                vector: embedding,
                payload: {
                    faqId: item.id, // Manter ID original no payload
                    pergunta: item.question,
                    resposta: item.answer,
                    categoria: item.category,
                    keywords: item.keywords || [],
                    timestamp: new Date().toISOString(),
                },
            };

            // Inserir na coleção FAQ
            await qdrantClient.upsertFAQ(point);
            console.log(`✅ FAQ item adicionado: ${item.question.substring(0, 50)}...`);
        }

        console.log('✅ FAQ inicializado com sucesso no Qdrant!');
    } catch (error) {
        console.error('❌ Erro ao inicializar FAQ:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    initializeFAQ();
}

export { initializeFAQ };

