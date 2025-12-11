/**
 * Testes TDD para Embedding Service
 * Fase 1.2: OpenAI Embeddings com cache e batch operations
 * 
 * METODOLOGIA TDD:
 * 1. ✅ Escrever testes (este arquivo)
 * 2. ❌ Ver testes falharem
 * 3. ✅ Implementar features
 * 4. ✅ Ver testes passarem
 */

import { EmbeddingService } from '../embedding-service';

// Mock do OpenAI Embeddings
jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: jest.fn(),
    embedDocuments: jest.fn(),
  })),
}));

describe('EmbeddingService - TDD Fase 1.2', () => {
  let service: EmbeddingService;
  let mockEmbedQuery: jest.Mock;
  let mockEmbedDocuments: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmbeddingService();

    // Get mocked functions
    mockEmbedQuery = (service as any).embeddings.embedQuery;
    mockEmbedDocuments = (service as any).embeddings.embedDocuments;
  });

  /**
   * TESTE 1: Geração básica de embeddings
   */
  describe('Basic Embedding Generation', () => {
    it('deve gerar embedding para texto simples', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const result = await service.embedQuery('Olá, quero agendar');

      expect(mockEmbedQuery).toHaveBeenCalledWith('Olá, quero agendar');
      expect(result).toEqual(mockVector);
      expect(result).toHaveLength(1536);
    });

    it('deve gerar embeddings para múltiplos textos', async () => {
      const mockVectors = [
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
        new Array(1536).fill(0.3),
      ];
      mockEmbedDocuments.mockResolvedValue(mockVectors);

      const texts = ['Texto 1', 'Texto 2', 'Texto 3'];
      const result = await service.embedDocuments(texts);

      expect(mockEmbedDocuments).toHaveBeenCalledWith(texts);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(1536);
    });

    it('deve retornar array vazio para lista vazia', async () => {
      const result = await service.embedDocuments([]);

      expect(mockEmbedDocuments).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('deve normalizar texto antes de gerar embedding', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      // Texto com espaços extras e quebras de linha
      await service.embedQuery('  Olá,  \n  mundo  \n');

      expect(mockEmbedQuery).toHaveBeenCalledWith('Olá, mundo');
    });
  });

  /**
   * TESTE 2: Cache de embeddings
   */
  describe('Embedding Cache', () => {
    it('deve cachear embeddings para textos idênticos', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const text = 'Qual o horário de funcionamento?';

      // Primeira chamada
      const result1 = await service.embedQuery(text);

      // Segunda chamada (deve usar cache)
      const result2 = await service.embedQuery(text);

      expect(mockEmbedQuery).toHaveBeenCalledTimes(1); // Chamado apenas uma vez
      expect(result1).toEqual(result2);
    });

    it('deve usar cache case-insensitive', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      await service.embedQuery('Olá Mundo');
      await service.embedQuery('olá mundo');
      await service.embedQuery('OLÁ MUNDO');

      expect(mockEmbedQuery).toHaveBeenCalledTimes(1);
    });

    it('deve limpar cache quando atingir limite', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      // Gerar mais embeddings que o limite do cache (assumindo limite de 100)
      for (let i = 0; i < 105; i++) {
        await service.embedQuery(`Texto ${i}`);
      }

      // Verificar que gerou 105 embeddings (não usou cache)
      expect(mockEmbedQuery).toHaveBeenCalledTimes(105);

      // Cache deve ter no máximo 100 itens
      const cacheSize = service.getCacheSize();
      expect(cacheSize).toBeLessThanOrEqual(100);
    });

    it('deve permitir limpar cache manualmente', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      await service.embedQuery('Texto 1');
      expect(service.getCacheSize()).toBe(1);

      service.clearCache();
      expect(service.getCacheSize()).toBe(0);

      // Após limpar, deve chamar API novamente
      await service.embedQuery('Texto 1');
      expect(mockEmbedQuery).toHaveBeenCalledTimes(2);
    });

    it('deve retornar estatísticas de cache', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      await service.embedQuery('Texto 1');
      await service.embedQuery('Texto 1'); // Cache hit
      await service.embedQuery('Texto 2');
      await service.embedQuery('Texto 2'); // Cache hit

      const stats = service.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5); // 2 hits / 4 total
    });
  });

  /**
   * TESTE 3: Batch operations otimizadas
   */
  describe('Batch Operations', () => {
    it('deve processar batch com chunking automático', async () => {
      const mockVectors = Array(50).fill(null).map(() => new Array(1536).fill(0.1));
      mockEmbedDocuments.mockResolvedValue(mockVectors);

      const texts = Array(50).fill(null).map((_, i) => `Texto ${i}`);
      const result = await service.embedDocuments(texts);

      expect(result).toHaveLength(50);
      // Deve ter processado em chunks (assumindo chunk size de 25)
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(2);
    });

    it('deve usar cache em batch operations', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      // Primeiro, cachear alguns textos
      await service.embedQuery('Texto 1');
      await service.embedQuery('Texto 2');

      // Agora batch com textos cacheados e novos
      const mockVectors = [
        mockVector, // Texto 1 (cached)
        mockVector, // Texto 2 (cached)
        new Array(1536).fill(0.2), // Texto 3 (novo)
      ];
      mockEmbedDocuments.mockResolvedValue([mockVectors[2]]);

      const texts = ['Texto 1', 'Texto 2', 'Texto 3'];
      const result = await service.embedDocuments(texts);

      expect(result).toHaveLength(3);
      // Deve ter chamado API apenas para 'Texto 3'
      expect(mockEmbedDocuments).toHaveBeenCalledWith(['Texto 3']);
    });

    it('deve tratar erros em batch gracefully', async () => {
      mockEmbedDocuments.mockRejectedValue(new Error('API Error'));

      const texts = ['Texto 1', 'Texto 2'];

      await expect(service.embedDocuments(texts)).rejects.toThrow('API Error');
    });
  });

  /**
   * TESTE 4: Embeddings para slots
   */
  describe('Slot Embeddings', () => {
    it('deve gerar embedding para slot com dados completos', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const slot = {
        nome: 'João Silva',
        procedimento: 'Dermatologia',
        unidade: 'Centro',
      };

      const result = await service.embedSlot(slot);

      expect(mockEmbedQuery).toHaveBeenCalledWith(
        'nome: João Silva, procedimento: Dermatologia, unidade: Centro'
      );
      expect(result).toEqual(mockVector);
    });

    it('deve ignorar campos undefined/null em slots', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const slot = {
        nome: 'João Silva',
        procedimento: undefined,
        unidade: 'Centro',
        data: null as any,
      };

      await service.embedSlot(slot);

      expect(mockEmbedQuery).toHaveBeenCalledWith('nome: João Silva, unidade: Centro');
    });

    it('deve lançar erro para slot vazio', async () => {
      const slot = {
        nome: undefined,
        procedimento: undefined,
      };

      await expect(service.embedSlot(slot)).rejects.toThrow(
        'Slot vazio não pode ser convertido em embedding'
      );
    });
  });

  /**
   * TESTE 5: Embeddings para FAQ
   */
  describe('FAQ Embeddings', () => {
    it('deve gerar embedding para FAQ combinando pergunta e resposta', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const faq = {
        question: 'Qual o horário de funcionamento?',
        answer: 'Seg-Sex: 08:00-12:00 e 14:00-18:00',
        category: 'horario',
      };

      const result = await service.embedFAQ(faq);

      expect(mockEmbedQuery).toHaveBeenCalledWith(expect.stringContaining('Qual o horário'));
      expect(mockEmbedQuery).toHaveBeenCalledWith(expect.stringContaining('08:00-12:00'));
      expect(result).toEqual(mockVector);
    });

    it('deve incluir keywords no embedding de FAQ', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const faq = {
        question: 'Como faço agendamento?',
        answer: 'Pelo WhatsApp',
        keywords: ['agendamento', 'marcar', 'consulta'],
      };

      await service.embedFAQ(faq);

      expect(mockEmbedQuery).toHaveBeenCalledWith(
        expect.stringContaining('agendamento')
      );
    });
  });

  /**
   * TESTE 6: Embeddings para nomes de pacientes
   */
  describe('Patient Name Embeddings', () => {
    it('deve gerar embedding para nome com variações', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      const result = await service.embedPatientName('João Silva');

      expect(result).toEqual(mockVector);
    });

    it('deve normalizar nome antes de embeddar', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      await service.embedPatientName('  JOÃO  da  SILVA  ');

      expect(mockEmbedQuery).toHaveBeenCalledWith('joão da silva');
    });

    it('deve cachear embeddings de nomes', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      await service.embedPatientName('João Silva');
      await service.embedPatientName('joão silva'); // Deve usar cache

      expect(mockEmbedQuery).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TESTE 7: Error handling
   */
  describe('Error Handling', () => {
    it('deve tratar erro de API do OpenAI', async () => {
      mockEmbedQuery.mockRejectedValue(new Error('OpenAI API Error'));

      await expect(service.embedQuery('Texto')).rejects.toThrow('OpenAI API Error');
    });

    it('deve tratar texto muito longo', async () => {
      const longText = 'a'.repeat(10000); // Texto muito longo

      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockVector);

      // Deve truncar automaticamente
      await service.embedQuery(longText);

      const calledWith = mockEmbedQuery.mock.calls[0][0];
      expect(calledWith.length).toBeLessThanOrEqual(8000);
    });

    it('deve retornar null para texto vazio', async () => {
      const result = await service.embedQuery('');

      expect(mockEmbedQuery).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  /**
   * TESTE 8: Performance e otimizações
   */
  describe('Performance', () => {
    it('deve medir tempo de geração de embedding', async () => {
      const mockVector = new Array(1536).fill(0.1);
      mockEmbedQuery.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockVector), 100))
      );

      const start = Date.now();
      await service.embedQuery('Texto');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });

    it('deve retornar métricas de performance', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('totalEmbeddings');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageLatency');
    });
  });
});
