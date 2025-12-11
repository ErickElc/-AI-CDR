/**
 * Testes TDD para cliente Qdrant com LangChain
 * Fase 1: 3 Coleções (FAQ, Conversations, Appointments)
 * 
 * METODOLOGIA TDD:
 * 1. ✅ Escrever testes (este arquivo)
 * 2. ❌ Ver testes falharem (npm test)
 * 3. ✅ Implementar mínimo para passar
 * 4. ✅ Refatorar
 */

import { QdrantClient } from '../qdrant-client';
import { QdrantPoint } from '../../types';

// Mock do cliente Qdrant
jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    getCollections: jest.fn(),
    createCollection: jest.fn(),
    upsert: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  })),
}));

describe('QdrantClient - TDD Fase 1', () => {
  let client: QdrantClient;
  const mockQdrantUrl = 'http://localhost:6333';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new QdrantClient(mockQdrantUrl);
  });

  /**
   * TESTE 1: Inicializar 3 coleções
   * Deve criar FAQ, Conversations e Appointments
   */
  describe('initialize - 3 Collections', () => {
    it('deve criar TODAS as 3 coleções se não existirem', async () => {
      const mockGetCollections = jest.fn().mockResolvedValue({
        collections: [],
      });
      const mockCreateCollection = jest.fn().mockResolvedValue({});

      (client as any).client = {
        getCollections: mockGetCollections,
        createCollection: mockCreateCollection,
      };

      await client.initialize();

      // Deve criar EXATAMENTE 3 coleções
      expect(mockCreateCollection).toHaveBeenCalledTimes(3);

      // FAQ collection
      expect(mockCreateCollection).toHaveBeenCalledWith('faq_embeddings', {
        vectors: { size: 1536, distance: 'Cosine' },
      });

      // Conversations collection
      expect(mockCreateCollection).toHaveBeenCalledWith('conversation_history', {
        vectors: { size: 1536, distance: 'Cosine' },
      });

      // Appointments collection
      expect(mockCreateCollection).toHaveBeenCalledWith('appointment_history', {
        vectors: { size: 1536, distance: 'Cosine' },
      });
    });

    it('não deve criar coleção se já existir', async () => {
      const mockGetCollections = jest.fn().mockResolvedValue({
        collections: [
          { name: 'faq_embeddings' },
          { name: 'conversation_history' },
          { name: 'appointment_history' },
        ],
      });
      const mockCreateCollection = jest.fn();

      (client as any).client = {
        getCollections: mockGetCollections,
        createCollection: mockCreateCollection,
      };

      await client.initialize();

      expect(mockCreateCollection).not.toHaveBeenCalled();
    });

    it('deve criar apenas coleções faltantes', async () => {
      const mockGetCollections = jest.fn().mockResolvedValue({
        collections: [
          { name: 'faq_embeddings' }, // Já existe
          { name: 'conversation_history' }, // Já existe
          // appointment_history faltando
        ],
      });
      const mockCreateCollection = jest.fn().mockResolvedValue({});

      (client as any).client = {
        getCollections: mockGetCollections,
        createCollection: mockCreateCollection,
      };

      await client.initialize();

      expect(mockCreateCollection).toHaveBeenCalledTimes(1);
      expect(mockCreateCollection).toHaveBeenCalledWith('appointment_history', {
        vectors: { size: 1536, distance: 'Cosine' },
      });
    });

    it('deve usar nomes de coleções do env config', async () => {
      const mockGetCollections = jest.fn().mockResolvedValue({
        collections: [],
      });
      const mockCreateCollection = jest.fn().mockResolvedValue({});

      (client as any).client = {
        getCollections: mockGetCollections,
        createCollection: mockCreateCollection,
      };

      await client.initialize();

      // Verificar que usa env config
      const createCalls = mockCreateCollection.mock.calls;
      const collectionNames = createCalls.map(call => call[0]);

      expect(collectionNames).toContain('faq_embeddings');
      expect(collectionNames).toContain('conversation_history');
      expect(collectionNames).toContain('appointment_history');
    });
  });

  /**
   * TESTE 2: Operações na coleção FAQ
   */
  describe('FAQ Collection Operations', () => {
    it('deve inserir FAQ com estrutura correta', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({});
      (client as any).client = { upsert: mockUpsert };

      const faqPoint: QdrantPoint = {
        id: 'faq-1',
        vector: new Array(1536).fill(0.1),
        payload: {
          question: 'Qual o horário de funcionamento?',
          answer: 'Seg-Sex: 08:00-12:00 e 14:00-18:00',
          category: 'horario',
          keywords: ['horário', 'funcionamento', 'atendimento'],
        },
      };

      await client.upsertFAQ(faqPoint);

      expect(mockUpsert).toHaveBeenCalledWith('faq_embeddings', {
        wait: true,
        points: [faqPoint],
      });
    });

    it('deve buscar FAQs por similaridade', async () => {
      const mockResults = [
        {
          id: 'faq-1',
          score: 0.95,
          payload: {
            question: 'Horário de funcionamento?',
            answer: 'Seg-Sex 08:00-18:00',
            category: 'horario',
          },
        },
      ];

      const mockSearch = jest.fn().mockResolvedValue(mockResults);
      (client as any).client = { search: mockSearch };

      const queryVector = new Array(1536).fill(0.1);
      const results = await client.searchFAQ(queryVector, 5, 0.7);

      expect(mockSearch).toHaveBeenCalledWith('faq_embeddings', {
        vector: queryVector,
        limit: 5,
        score_threshold: 0.7,
      });
      expect(results).toHaveLength(1);
      expect(results[0].payload.category).toBe('horario');
    });

    it('deve permitir batch upsert de FAQs', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({});
      (client as any).client = { upsert: mockUpsert };

      const faqPoints: QdrantPoint[] = [
        {
          id: 'faq-1',
          vector: new Array(1536).fill(0.1),
          payload: { question: 'Q1', answer: 'A1' },
        },
        {
          id: 'faq-2',
          vector: new Array(1536).fill(0.2),
          payload: { question: 'Q2', answer: 'A2' },
        },
      ];

      await client.batchUpsertFAQ(faqPoints);

      expect(mockUpsert).toHaveBeenCalledWith('faq_embeddings', {
        wait: true,
        points: faqPoints,
      });
    });
  });

  /**
   * TESTE 3: Operações na coleção de Conversas
   */
  describe('Conversation Collection Operations', () => {
    it('deve inserir conversa com metadata completo', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({});
      (client as any).client = { upsert: mockUpsert };

      const conversationPoint: QdrantPoint = {
        id: 'conv-123',
        vector: new Array(1536).fill(0.1),
        payload: {
          sessionId: 'session-abc',
          messages: [
            { role: 'user', content: 'Olá' },
            { role: 'assistant', content: 'Oi!' },
          ],
          slots: {
            nome: 'João',
            procedimento: 'dermatologia',
          },
          outcome: 'completed',
          sentiment: 'positive',
          duration: 120,
          timestamp: new Date().toISOString(),
        },
      };

      await client.upsertConversation(conversationPoint);

      expect(mockUpsert).toHaveBeenCalledWith('conversation_history', {
        wait: true,
        points: [conversationPoint],
      });
    });

    it('deve buscar conversas similares', async () => {
      const mockResults = [
        {
          id: 'conv-1',
          score: 0.88,
          payload: {
            sessionId: 'session-1',
            slots: { procedimento: 'dermatologia' },
            outcome: 'completed',
          },
        },
      ];

      const mockSearch = jest.fn().mockResolvedValue(mockResults);
      (client as any).client = { search: mockSearch };

      const queryVector = new Array(1536).fill(0.1);
      const results = await client.searchConversations(queryVector, 5);

      expect(mockSearch).toHaveBeenCalledWith('conversation_history', {
        vector: queryVector,
        limit: 5,
        score_threshold: 0.7,
      });
    });

    it('deve permitir filtrar por outcome', async () => {
      const mockSearch = jest.fn().mockResolvedValue([]);
      (client as any).client = { search: mockSearch };

      const queryVector = new Array(1536).fill(0.1);
      await client.searchConversations(queryVector, 5, 0.7, {
        must: [{ key: 'outcome', match: { value: 'completed' } }],
      });

      expect(mockSearch).toHaveBeenCalledWith('conversation_history', {
        vector: queryVector,
        limit: 5,
        score_threshold: 0.7,
        filter: {
          must: [{ key: 'outcome', match: { value: 'completed' } }],
        },
      });
    });
  });

  /**
   * TESTE 4: Operações na coleção de Agendamentos
   */
  describe('Appointment Collection Operations', () => {
    it('deve inserir agendamento com preferências do paciente', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({});
      (client as any).client = { upsert: mockUpsert };

      const appointmentPoint: QdrantPoint = {
        id: 'appt-456',
        vector: new Array(1536).fill(0.1),
        payload: {
          patientName: 'João Silva',
          procedure: 'Dermatologia',
          unit: 'Centro',
          dateTime: '2024-01-15T14:00:00Z',
          preferences: {
            preferredUnit: 'Centro',
            preferredTime: '14:00',
            preferredProcedures: ['Dermatologia', 'Limpeza de pele'],
          },
          sessionId: 'session-123',
          timestamp: new Date().toISOString(),
        },
      };

      await client.upsertAppointment(appointmentPoint);

      expect(mockUpsert).toHaveBeenCalledWith('appointment_history', {
        wait: true,
        points: [appointmentPoint],
      });
    });

    it('deve buscar histórico de paciente por nome (similarity)', async () => {
      const mockResults = [
        {
          id: 'appt-1',
          score: 0.95,
          payload: {
            patientName: 'João Silva',
            procedure: 'Dermatologia',
            unit: 'Centro',
            dateTime: '2024-01-01T14:00:00Z',
          },
        },
        {
          id: 'appt-2',
          score: 0.92,
          payload: {
            patientName: 'João Silva',
            procedure: 'Limpeza de pele',
            unit: 'Centro',
            dateTime: '2024-02-01T14:00:00Z',
          },
        },
      ];

      const mockSearch = jest.fn().mockResolvedValue(mockResults);
      (client as any).client = { search: mockSearch };

      const queryVector = new Array(1536).fill(0.1);
      const results = await client.searchAppointments(queryVector, 10);

      expect(mockSearch).toHaveBeenCalledWith('appointment_history', {
        vector: queryVector,
        limit: 10,
        score_threshold: 0.7,
      });
      expect(results).toHaveLength(2);
    });

    it('deve deletar agendamento antigo', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      (client as any).client = { delete: mockDelete };

      await client.deleteAppointment('appt-old');

      expect(mockDelete).toHaveBeenCalledWith('appointment_history', {
        wait: true,
        points: ['appt-old'],
      });
    });
  });

  /**
   * TESTE 5: Validações e utilitários
   */
  describe('Utilities', () => {
    it('deve contar pontos em cada coleção', async () => {
      const mockCount = jest.fn()
        .mockResolvedValueOnce({ count: 150 }) // FAQ
        .mockResolvedValueOnce({ count: 523 }) // Conversations
        .mockResolvedValueOnce({ count: 1205 }); // Appointments

      (client as any).client = { count: mockCount };

      const stats = await client.getCollectionStats();

      expect(stats).toEqual({
        faq: 150,
        conversations: 523,
        appointments: 1205,
      });
    });

    it('deve verificar se coleção existe', async () => {
      const mockGetCollections = jest.fn().mockResolvedValue({
        collections: [
          { name: 'faq_embeddings' },
          { name: 'conversation_history' },
        ],
      });

      (client as any).client = { getCollections: mockGetCollections };

      const faqExists = await client.collectionExists('faq_embeddings');
      const appointmentsExists = await client.collectionExists('appointment_history');

      expect(faqExists).toBe(true);
      expect(appointmentsExists).toBe(false);
    });

    it('deve listar todas as coleções do sistema', async () => {
      const collections = client.getCollectionNames();

      expect(collections).toEqual({
        faq: 'faq_embeddings',
        conversations: 'conversation_history',
        appointments: 'appointment_history',
      });
    });
  });

  /**
   * TESTE 6: Error handling
   */
  describe('Error Handling', () => {
    it('deve tratar erro ao criar coleção', async () => {
      const mockGetCollections = jest.fn().mockResolvedValue({
        collections: [],
      });
      const mockCreateCollection = jest.fn().mockRejectedValue(
        new Error('Qdrant connection failed')
      );

      (client as any).client = {
        getCollections: mockGetCollections,
        createCollection: mockCreateCollection,
      };

      await expect(client.initialize()).rejects.toThrow('Qdrant connection failed');
    });

    it('deve tratar erro em busca', async () => {
      const mockSearch = jest.fn().mockRejectedValue(
        new Error('Search failed')
      );
      (client as any).client = { search: mockSearch };

      const queryVector = new Array(1536).fill(0.1);

      await expect(client.searchFAQ(queryVector)).rejects.toThrow('Search failed');
    });
  });
});

