/**
 * Script de demonstração: FAQ RAG (Retrieval Augmented Generation)
 * 
 * Demonstra:
 * 1. Indexação de FAQs com embeddings
 * 2. Busca semântica via RAG
 * 3. Retrieval de respostas relevantes
 * 
 * USO:
 * npm run init-faq  (roda este script)
 */

import { QdrantClient } from '../rag/qdrant-client';
import { EmbeddingService } from '../rag/embedding-service';
import { FAQIndexer } from '../rag/faq-indexer';
import { env } from '../config/env';

async function demonstrateFAQRAG() {
    console.log('\n🚀 Demonstração: FAQ com RAG (Embeddings + Qdrant)\n');
    console.log('='.repeat(60));

    try {
        // 1. Inicializar serviços
        console.log('\n📦 Inicializando serviços...');
        const qdrantClient = new QdrantClient(env.qdrant.url, env.qdrant.apiKey);
        const embeddingService = new EmbeddingService();
        const faqIndexer = new FAQIndexer(qdrantClient, embeddingService);

        // 2. Indexar FAQs
        console.log('\n📚 Indexando FAQs...');
        const indexResult = await faqIndexer.indexAll();

        console.log(`\n✅ Indexação concluída:`);
        console.log(`   • FAQs indexados: ${indexResult.indexed}`);
        console.log(`   • Falhas: ${indexResult.failed}`);
        console.log(`   • Tempo: ${indexResult.duration}ms`);

        // 3. Demonstrar busca semântica (RAG)
        console.log('\n\n🔍 Demonstrando RAG - Busca Semântica:\n');
        console.log('='.repeat(60));

        const queries = [
            'Qual o horário que vocês abrem?',
            'Quanto custa uma consulta?',
            'Posso remarcar minha consulta?',
            'Vocês ficam aonde?',
        ];

        for (const query of queries) {
            console.log(`\n❓ Pergunta: "${query}"`);

            // Gerar embedding da pergunta
            const queryEmbedding = await embeddingService.embedQuery(query);

            if (!queryEmbedding) {
                console.log('   ❌ Erro ao gerar embedding');
                continue;
            }

            // Buscar FAQs similares via RAG
            const results = await qdrantClient.searchFAQ(queryEmbedding, 1, 0.7);

            if (results.length > 0) {
                const bestMatch = results[0];
                console.log(`   ✅ Match encontrado (score: ${bestMatch.score.toFixed(3)})`);
                console.log(`   📝 Pergunta FAQ: ${bestMatch.payload.question}`);
                console.log(`   💬 Resposta: ${bestMatch.payload.answer}`);
                console.log(`   🏷️  Categoria: ${bestMatch.payload.category}`);
            } else {
                console.log('   ⚠️  Nenhum match encontrado');
            }
        }

        // 4. Estatísticas
        console.log('\n\n📊 Estatísticas do Sistema:\n');
        console.log('='.repeat(60));

        const collectionStats = await qdrantClient.getCollectionStats();
        console.log(`\n   Qdrant Collections:`);
        console.log(`   • FAQs: ${collectionStats.faq} documentos`);
        console.log(`   • Conversas: ${collectionStats.conversations} documentos`);
        console.log(`   • Agendamentos: ${collectionStats.appointments} documentos`);

        const cacheStats = embeddingService.getCacheStats();
        console.log(`\n   Embedding Cache:`);
        console.log(`   • Tamanho: ${cacheStats.size}`);
        console.log(`   • Hits: ${cacheStats.hits}`);
        console.log(`   • Misses: ${cacheStats.misses}`);
        console.log(`   • Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

        console.log('\n✅ Demonstração concluída com sucesso!\n');

    } catch (error) {
        console.error('\n❌ Erro na demonstração:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    demonstrateFAQRAG()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Erro fatal:', error);
            process.exit(1);
        });
}

export { demonstrateFAQRAG };
