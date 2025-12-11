/**
 * Script de verificação da indexação do Qdrant
 * Diagnostica problemas de FAQ e embeddings
 */

import { QdrantClient } from '../rag/qdrant-client';
import { EmbeddingService } from '../rag/embedding-service';
import { env } from '../config/env';

async function verifyQdrantIndexing() {
    console.log('🔍 VERIFICAÇÃO DA INDEXAÇÃO DO QDRANT\n');
    console.log('=====================================\n');

    try {
        // Inicializar cliente Qdrant
        console.log('📡 Conectando ao Qdrant...');
        const qdrantClient = new QdrantClient(env.qdrant.url, env.qdrant.apiKey);
        await qdrantClient.initialize();
        console.log('✅ Conectado com sucesso!\n');

        // Inicializar embedding service
        const embeddingService = new EmbeddingService();

        // 1. Verificar coleções existentes
        console.log('📂 Verificando coleções...');
        const collections = await (qdrantClient as any).client.getCollections();
        console.log(`   Coleções encontradas: ${collections.collections.length}`);
        collections.collections.forEach((c: any) => {
            console.log(`   - ${c.name}`);
        });
        console.log('');

        // 2. Verificar FAQ collection
        console.log('📊 Analisando FAQ collection...');
        try {
            const faqInfo = await (qdrantClient as any).client.getCollection('faq-collection');
            console.log(`   Vectors count: ${faqInfo.vectors_count}`);
            console.log(`   Points count: ${faqInfo.points_count}`);
            console.log(`   Status: ${faqInfo.status}`);
        } catch (error) {
            console.log('   ❌ FAQ collection não encontrada ou erro:', (error as Error).message);
        }
        console.log('');

        // 3. Testar embedding
        console.log('🧪 Testando geração de embeddings...');
        const testText = 'consulta médica';
        console.log(`   Texto de teste: "${testText}"`);
        const embedding = await embeddingService.embedQuery(testText);

        if (embedding) {
            console.log(`   ✅ Embedding gerado com sucesso!`);
            console.log(`   Dimensões: ${embedding.length}`);
            console.log(`   Primeiros 5 valores: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        } else {
            console.log('   ❌ Falha ao gerar embedding');
        }
        console.log('');

        // 4. Testar busca semântica no FAQ
        console.log('🔎 Testando busca semântica no FAQ...');
        let results: any[] = [];
        if (embedding) {
            try {
                results = await qdrantClient.searchFAQ(embedding, 5, 0.0); // Score 0 para pegar tudo
                console.log(`   Resultados encontrados: ${results.length}`);

                if (results.length > 0) {
                    console.log(`\n   Top 3 resultados:`);
                    results.slice(0, 3).forEach((r: any, i: number) => {
                        console.log(`\n   ${i + 1}. Score: ${r.score?.toFixed(3) || 'N/A'}`);
                        console.log(`      Question: ${r.payload?.question || 'N/A'}`);
                        console.log(`      Category: ${r.payload?.category || 'N/A'}`);
                    });
                } else {
                    console.log('   ⚠️ Nenhum resultado encontrado - FAQ pode não estar indexado');
                }
            } catch (error) {
                console.log('   ❌ Erro na busca:', (error as Error).message);
            }
        }
        console.log('');

        // 5. Verificar conversations collection
        console.log('💬 Analisando Conversations collection...');
        try {
            const convsInfo = await (qdrantClient as any).client.getCollection('conversations-collection');
            console.log(`   Vectors count: ${convsInfo.vectors_count}`);
            console.log(`   Points count: ${convsInfo.points_count}`);
        } catch (error) {
            console.log('   ⚠️ Conversations collection não encontrada (normal se não houver conversas)');
        }
        console.log('');

        // Resumo final
        console.log('=====================================');
        console.log('📋 RESUMO DA VERIFICAÇÃO');
        console.log('=====================================\n');

        if (embedding && results.length > 0) {
            console.log('✅ Sistema RAG funcionando corretamente');
            console.log('✅ Embeddings sendo gerados');
            console.log('✅ FAQ indexado no Qdrant');
        } else if (embedding && results.length === 0) {
            console.log('⚠️ Embeddings funcionam, mas FAQ não está indexado');
            console.log('   Solução: Execute npm run init-faq');
        } else {
            console.log('❌ Problema detectado no sistema RAG');
            console.log('   Verifique configurações do OpenAI/Ollama');
        }

    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

// Executar verificação
verifyQdrantIndexing()
    .then(() => {
        console.log('\n✅ Verificação concluída!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erro:', error);
        process.exit(1);
    });
