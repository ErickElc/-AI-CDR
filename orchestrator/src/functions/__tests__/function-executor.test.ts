/**
 * Testes TDD para executor de funções
 */

import { FunctionExecutor } from '../function-executor';
import { FunctionCall, FunctionCallResult } from '../../types';

// Mock do axios/fetch
global.fetch = jest.fn();

describe('FunctionExecutor', () => {
  let executor: FunctionExecutor;
  const mockBackendUrl = 'http://localhost:5000';

  beforeEach(() => {
    executor = new FunctionExecutor(mockBackendUrl);
    (global.fetch as jest.Mock).mockClear();
  });

  describe('executeFunction', () => {
    it('deve executar função consultar_disponibilidade', async () => {
      const functionCall: FunctionCall = {
        functionName: 'consultar_disponibilidade',
        parameters: {
          unidade: 'Centro',
          data: '2024-01-16',
        },
      };

      const mockResponse = {
        success: true,
        data: [
          { dataHora: '2024-01-16T14:00:00', unidade: 'Centro', disponivel: true },
          { dataHora: '2024-01-16T14:30:00', unidade: 'Centro', disponivel: true },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/api/functions/consultar-disponibilidade`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('deve executar função criar_agendamento', async () => {
      const functionCall: FunctionCall = {
        functionName: 'criar_agendamento',
        parameters: {
          nomePaciente: 'João Silva',
          procedimento: 'Dermatologia',
          unidade: 'Centro',
          dataHora: '2024-01-16T14:00:00',
          sessionId: 'session-123',
        },
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'appointment-id',
          nomePaciente: 'João Silva',
          procedimento: 'Dermatologia',
          unidade: 'Centro',
          dataHora: '2024-01-16T14:00:00',
          status: 'Pendente',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/api/functions/criar-agendamento`,
        expect.any(Object)
      );
    });

    it('deve executar função validar_duplicidade', async () => {
      const functionCall: FunctionCall = {
        functionName: 'validar_duplicidade',
        parameters: {
          nomePaciente: 'João Silva',
          dataHora: '2024-01-16T14:00:00',
          unidade: 'Centro',
        },
      };

      const mockResponse = {
        success: true,
        data: { existeDuplicado: false },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(true);
      expect((result.data as any).existeDuplicado).toBe(false);
    });

    it('deve executar função listar_unidades', async () => {
      const functionCall: FunctionCall = {
        functionName: 'listar_unidades',
        parameters: {},
      };

      const mockResponse = {
        success: true,
        data: [
          { id: '1', nome: 'Centro', endereco: 'Rua A' },
          { id: '2', nome: 'Zona Sul', endereco: 'Rua B' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/api/functions/unidades`,
        expect.any(Object)
      );
    });

    it('deve executar função listar_procedimentos', async () => {
      const functionCall: FunctionCall = {
        functionName: 'listar_procedimentos',
        parameters: {},
      };

      const mockResponse = {
        success: true,
        data: [
          { id: '1', nome: 'Dermatologia', duracaoMinutos: 30 },
          { id: '2', nome: 'Limpeza de Pele', duracaoMinutos: 60 },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('deve tratar erro de função inexistente', async () => {
      const functionCall: FunctionCall = {
        functionName: 'funcao_inexistente',
        parameters: {},
      };

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('deve tratar erro de rede', async () => {
      const functionCall: FunctionCall = {
        functionName: 'consultar_disponibilidade',
        parameters: { unidade: 'Centro', data: '2024-01-16' },
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('deve tratar resposta de erro do backend', async () => {
      const functionCall: FunctionCall = {
        functionName: 'criar_agendamento',
        parameters: {
          nomePaciente: 'João',
          procedimento: 'Invalid',
          unidade: 'Centro',
          dataHora: '2024-01-16T14:00:00',
        },
      };

      const mockResponse = {
        success: false,
        errorMessage: 'Procedimento não encontrado',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await executor.executeFunction(functionCall);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Procedimento não encontrado');
    });
  });

  describe('executeMultipleFunctions', () => {
    it('deve executar múltiplas funções em sequência', async () => {
      const functionCalls: FunctionCall[] = [
        {
          functionName: 'listar_unidades',
          parameters: {},
        },
        {
          functionName: 'listar_procedimentos',
          parameters: {},
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      const results = await executor.executeMultipleFunctions(functionCalls);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });
});


