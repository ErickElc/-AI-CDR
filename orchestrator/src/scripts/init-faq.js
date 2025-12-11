/**
 * Script Node.js para inicializar FAQ (compilado)
 * Execute: node dist/scripts/init-faq.js
 */

require('dotenv').config();
const { QdrantClient } = require('../rag/qdrant-client');
const { EmbeddingService } = require('../rag/embedding-service');
const { readFileSync } = require('fs');
const { join } = require('path');
const { v4: uuidv4 } = require('uuid');

async function initializeFAQ() {
  try {
    console.log('🚀 Inicializando FAQ no Qdrant...');

    const faqPath = join(__dirname, '../../data/faq.json');
    const faqData = JSON.parse(readFileSync(faqPath, 'utf-8'));

    const qdrantClient = new QdrantClient(
      process.env.QDRANT_URL || 'http://localhost:6333',
      process.env.QDRANT_API_KEY
    );
    await qdrantClient.initialize();

    const embeddingService = new EmbeddingService();

    console.log(`📚 Processando ${faqData.length} itens do FAQ...`);

    for (const item of faqData) {
      const text = `${item.pergunta} ${item.resposta}`;
      const embedding = await embeddingService.embedQuery(text);

      const point = {
        id: item.id || uuidv4(),
        vector: embedding,
        payload: {
          pergunta: item.pergunta,
          resposta: item.resposta,
          categoria: item.categoria,
          timestamp: new Date().toISOString(),
        },
      };

      await qdrantClient.upsertConversation(point);
      console.log(`✅ FAQ item adicionado: ${item.pergunta.substring(0, 50)}...`);
    }

    console.log('✅ FAQ inicializado com sucesso no Qdrant!');
  } catch (error) {
    console.error('❌ Erro ao inicializar FAQ:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeFAQ();
}

module.exports = { initializeFAQ };


