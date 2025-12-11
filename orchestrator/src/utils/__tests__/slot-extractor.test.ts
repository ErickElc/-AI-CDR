/**
 * Testes TDD para slot extractor com RAG integrado
 */

import { SlotExtractor } from '../slot-extractor';
import { EmbeddingService } from '../../rag/embedding-service';
import { ContextRetrieval } from '../../rag/context-retrieval';
import { QdrantClient } from '../../rag/qdrant-client';

// Mocks
jest.mock('../../rag/embedding-service');
jest.mock('../../rag/context-retrieval');
jest.mock('../../rag/qdrant-client');
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

describe('SlotExtractor', () => {
  let extractor: SlotExtractor;
  let mockEmbeddingService: jest.Mocked<EmbeddingService>;
  let mockContextRetrieval: jest.Mocked<ContextRetrieval>;

  beforeEach(() => {
    mockEmbeddingService = {
      embedQuery: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
      embedDocuments: jest.fn(),
      embedSlot: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    } as any;

    mockContextRetrieval = {
      retrieveContext: jest.fn().mockResolvedValue({}),
    } as any;

    extractor = new SlotExtractor(mockEmbeddingService, mockContextRetrieval);
  });

  describe('extractSlotsFromMessage', () => {
    it('deve extrair slots completos de mensagem com todos os dados', async () => {
      const message = 'Oi, quero agendar consulta de dermatologia para João Silva amanhã às 14h na unidade Centro';
      
      // Mock do LLM retornando slots extraídos
      (extractor as any).llm = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            nome: 'João Silva',
            procedimento: 'dermatologia',
            unidade: 'Centro',
            data: '2024-01-16',
            horario: '14:00',
            email: null,
            confidence: 0.95,
          }),
        }),
      };

      const result = await extractor.extractSlotsFromMessage(message);

      expect(result.nome).toBe('João Silva');
      expect(result.procedimento).toBe('dermatologia');
      expect(result.unidade).toBe('Centro');
      expect(result.data).toBe('2024-01-16');
      expect(result.horario).toBe('14:00');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('deve extrair slots parciais e buscar contexto RAG', async () => {
      const message = 'Preciso marcar uma consulta, sou Maria, quero fazer limpeza de pele';

      // Mock do LLM retornando slots parciais
      (extractor as any).llm = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            nome: 'Maria',
            procedimento: 'limpeza de pele',
            unidade: null,
            data: null,
            horario: null,
            email: null,
            confidence: 0.75,
          }),
        }),
      };

      // Mock do RAG retornando contexto
      mockContextRetrieval.retrieveContext.mockResolvedValue({
        similarConversations: [
          {
            sessionId: 'session-1',
            message: 'Similar message',
            slots: { unidade: 'Centro' },
            outcome: 'success',
            score: 0.85,
          },
        ],
      });

      const result = await extractor.extractSlotsFromMessage(message, {
        nome: undefined,
        procedimento: undefined,
      });

      expect(result.nome).toBe('Maria');
      expect(result.procedimento).toBe('limpeza de pele');
      expect(result.ragContext).toBeDefined();
      expect(mockContextRetrieval.retrieveContext).toHaveBeenCalled();
    });

    it('deve buscar histórico de agendamentos quando nome é detectado', async () => {
      const message = 'Quero agendar para João Silva';

      (extractor as any).llm = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            nome: 'João Silva',
            procedimento: null,
            unidade: null,
            data: null,
            horario: null,
            email: null,
            confidence: 0.8,
          }),
        }),
      };

      mockContextRetrieval.retrieveContext.mockResolvedValue({
        appointmentHistory: [
          {
            nomePaciente: 'João Silva',
            procedimento: 'Dermatologia',
            unidade: 'Centro',
            dataHora: new Date(),
            preferences: {
              preferredUnits: ['Centro'],
              frequentProcedures: ['Dermatologia'],
              preferredTimes: ['14:00'],
            },
          },
        ],
      });

      const result = await extractor.extractSlotsFromMessage(message);

      expect(result.nome).toBe('João Silva');
      expect(result.ragContext?.appointmentHistory).toBeDefined();
      expect(result.suggestions?.procedimentos).toContain('Dermatologia');
      expect(result.suggestions?.unidades).toContain('Centro');
    });

    it('deve retornar slots vazios para mensagem genérica', async () => {
      const message = 'Olá';

      (extractor as any).llm = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            nome: null,
            procedimento: null,
            unidade: null,
            data: null,
            horario: null,
            email: null,
            confidence: 0.0,
          }),
        }),
      };

      const result = await extractor.extractSlotsFromMessage(message);

      expect(result.nome).toBeUndefined();
      expect(result.procedimento).toBeUndefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('deve normalizar data relativa (amanhã)', async () => {
      const message = 'Quero agendar para amanhã às 14h';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expectedDate = tomorrow.toISOString().split('T')[0];

      (extractor as any).llm = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            nome: null,
            procedimento: null,
            unidade: null,
            data: expectedDate,
            horario: '14:00',
            email: null,
            confidence: 0.7,
          }),
        }),
      };

      const result = await extractor.extractSlotsFromMessage(message);

      expect(result.data).toBe(expectedDate);
      expect(result.horario).toBe('14:00');
    });

    it('deve normalizar horário (14h -> 14:00)', async () => {
      const message = 'Quero agendar às 14h';

      (extractor as any).llm = {
        invoke: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            nome: null,
            procedimento: null,
            unidade: null,
            data: null,
            horario: '14:00',
            email: null,
            confidence: 0.6,
          }),
        }),
      };

      const result = await extractor.extractSlotsFromMessage(message);

      expect(result.horario).toBe('14:00');
    });

    it('deve usar RAG/Qdrant como fallback quando LLM falha', async () => {
      const message = 'Quero agendar consulta de dermatologia para João Silva';

      // Mock do LLM falhando
      (extractor as any).llm = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM API error')),
      };

      // Mock do RAG retornando conversas similares com slots
      mockContextRetrieval.retrieveContext.mockResolvedValue({
        similarConversations: [
          {
            sessionId: 'session-1',
            message: 'Quero agendar consulta de dermatologia para João Silva amanhã às 14h',
            slots: {
              nome: 'João Silva',
              procedimento: 'dermatologia',
              unidade: 'Centro',
              data: '2024-01-16',
              horario: '14:00',
            },
            outcome: 'success',
            score: 0.85,
          },
        ],
      });

      const result = await extractor.extractSlotsFromMessage(message);

      // Verificar que RAG foi usado como fallback (chamado apenas uma vez, dentro do extractWithRAG)
      expect(mockContextRetrieval.retrieveContext).toHaveBeenCalledWith(message);
      expect(mockContextRetrieval.retrieveContext).toHaveBeenCalledTimes(1);
      
      // Verificar que slots foram extraídos do RAG
      expect(result.nome).toBe('João Silva');
      expect(result.procedimento).toBe('dermatologia');
      expect(result.unidade).toBe('Centro');
      expect(result.confidence).toBeGreaterThan(0.0);
      expect(result.confidence).toBeLessThanOrEqual(0.7); // Máximo para RAG
      // Verificar que ragContext foi incluído no resultado
      expect(result.ragContext).toBeDefined();
    });

    it('deve usar histórico de agendamentos no fallback RAG quando nome é detectado', async () => {
      const message = 'Quero agendar para Maria';

      // Mock do LLM falhando
      (extractor as any).llm = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM API error')),
      };

      // Mock do RAG retornando histórico de agendamentos
      mockContextRetrieval.retrieveContext.mockResolvedValue({
        appointmentHistory: [
          {
            nomePaciente: 'Maria',
            procedimento: 'Limpeza de Pele',
            unidade: 'Zona Sul',
            dataHora: new Date('2024-01-15T14:00:00'),
            preferences: {
              preferredUnits: ['Zona Sul'],
              frequentProcedures: ['Limpeza de Pele'],
              preferredTimes: ['14:00'],
            },
          },
        ],
      });

      const result = await extractor.extractSlotsFromMessage(message);

      // Verificar que slots foram extraídos do histórico
      expect(result.nome).toBe('Maria');
      expect(result.procedimento).toBe('Limpeza de Pele');
      expect(result.unidade).toBe('Zona Sul');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('deve retornar slots vazios se RAG também falhar', async () => {
      const message = 'Mensagem sem contexto';

      // Mock do LLM falhando
      (extractor as any).llm = {
        invoke: jest.fn().mockRejectedValue(new Error('LLM API error')),
      };

      // Mock do RAG também falhando
      mockContextRetrieval.retrieveContext.mockRejectedValue(new Error('RAG error'));

      const result = await extractor.extractSlotsFromMessage(message);

      // Verificar que retornou slots vazios com confiança zero
      expect(result.nome).toBeUndefined();
      expect(result.procedimento).toBeUndefined();
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('enrichSlotsWithRAG', () => {
    it('deve enriquecer slots com sugestões do RAG', async () => {
      const slots = {
        nome: 'João Silva',
        procedimento: 'dermatologia',
      };

      mockContextRetrieval.retrieveContext.mockResolvedValue({
        appointmentHistory: [
          {
            nomePaciente: 'João Silva',
            procedimento: 'Dermatologia',
            unidade: 'Centro',
            dataHora: new Date(),
            preferences: {
              preferredUnits: ['Centro', 'Zona Sul'],
              frequentProcedures: ['Dermatologia'],
              preferredTimes: ['14:00', '15:00'],
            },
          },
        ],
      });

      const ragContext = {
        appointmentHistory: [
          {
            nomePaciente: 'João Silva',
            procedimento: 'Dermatologia',
            unidade: 'Centro',
            dataHora: new Date(),
            preferences: {
              preferredUnits: ['Centro', 'Zona Sul'],
              frequentProcedures: ['Dermatologia'],
              preferredTimes: ['14:00', '15:00'],
            },
          },
        ],
      };

      const enriched = await extractor.enrichSlotsWithRAG(slots, ragContext);

      expect(enriched.suggestions).toBeDefined();
      expect(enriched.suggestions?.unidades).toContain('Centro');
      expect(enriched.suggestions?.horarios).toContain('14:00');
    });
  });
});

