/**
 * Servidor Express do orquestrador
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { ShortTermMemory } from './memory/short-term-memory';
import { QdrantClient } from './rag/qdrant-client';
import { EmbeddingService } from './rag/embedding-service';
import { ContextRetrieval } from './rag/context-retrieval';
import { SlotExtractor } from './utils/slot-extractor';
import { FunctionExecutor } from './functions/function-executor';
import { Agent } from './agent/agent';
import { OrchestratorRequest, OrchestratorResponse } from './types';
import { env } from './config/env';
import { DataPreloadService } from './services/data-preload.service';

const app = express();
const PORT = env.server.port;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar serviços
let agent: Agent;
let qdrantClient: QdrantClient;

async function initializeServices() {
  try {
    // Inicializar Qdrant
    qdrantClient = new QdrantClient(
      env.qdrant.url,
      env.qdrant.apiKey
    );
    await qdrantClient.initialize();
    console.log('✅ Qdrant inicializado');

    // Inicializar serviços
    const memory = new ShortTermMemory();
    const embeddingService = new EmbeddingService();
    const contextRetrieval = new ContextRetrieval(qdrantClient, embeddingService);
    const slotExtractor = new SlotExtractor(embeddingService, contextRetrieval);
    const functionExecutor = new FunctionExecutor(env.backend.url);

    // Criar agente
    agent = new Agent(memory, slotExtractor, functionExecutor, contextRetrieval);
    console.log('✅ Serviços inicializados');

    // 📦 Pré-carregar procedimentos e unidades em cache
    const dataPreload = new DataPreloadService(functionExecutor);
    await dataPreload.preloadAllData();

    if (!dataPreload.isDataLoaded()) {
      console.warn('⚠️ AVISO: Dados não foram pré-carregados. Verifique conexão com backend.');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error);
    process.exit(1);
  }
}

// Endpoint: Processar mensagem
app.post('/orchestrator/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: OrchestratorRequest = req.body;

    if (!request.message || !request.sessionId) {
      res.status(400).json({
        error: 'sessionId e message são obrigatórios',
      });
      return;
    }

    const response: OrchestratorResponse = await agent.processMessage(request);

    res.json(response);
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    res.status(500).json({
      error: 'Erro interno ao processar mensagem',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Endpoint: Inicializar sessão
app.post('/orchestrator/initialize-session', async (req: Request, res: Response) => {
  try {
    const sessionId = (agent as any).memory.createSession();
    res.json({ sessionId });
  } catch (error) {
    console.error('Erro ao inicializar sessão:', error);
    res.status(500).json({
      error: 'Erro interno ao inicializar sessão',
    });
  }
});

// Endpoint: Consultar sessão
app.get('/orchestrator/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const session = (agent as any).memory.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        error: 'Sessão não encontrada',
      });
      return;
    }

    res.json({
      sessionId: session.sessionId,
      slots: session.slots,
      currentStep: session.context.currentStep,
      messages: session.messages.slice(-10), // Últimas 10 mensagens
      scenario: session.context.scenario,
    });
  } catch (error) {
    console.error('Erro ao consultar sessão:', error);
    res.status(500).json({
      error: 'Erro interno ao consultar sessão',
    });
  }
});

// Endpoint: Gerar embedding (para backend sync)
app.post('/embed', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({
        error: 'text é obrigatório',
      });
      return;
    }

    const embeddingService = new EmbeddingService();
    const embedding = await embeddingService.embedQuery(text);

    if (!embedding) {
      res.status(500).json({
        error: 'Falha ao gerar embedding',
      });
      return;
    }

    res.json({ embedding });
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    res.status(500).json({
      error: 'Erro interno ao gerar embedding',
    });
  }
});

// Endpoint: Re-indexar FAQ (admin)
app.post('/admin/reindex-faq', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 Iniciando re-indexação do FAQ...');

    // Importar dinamicamente
    const { initializeFAQ } = await import('./scripts/init-faq');

    await initializeFAQ();

    res.json({
      success: true,
      message: 'FAQ re-indexado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao re-indexar FAQ:', error);
    res.status(500).json({
      error: 'Erro ao re-indexar FAQ',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Endpoint: Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'orchestrator',
    timestamp: new Date().toISOString(),
  });
});

// Inicializar e iniciar servidor
initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Orquestrador rodando na porta ${PORT}`);
  });
});

export default app;

