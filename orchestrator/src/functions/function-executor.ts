/**
 * Executor de funções que chama o backend
 */

import { FunctionCall, FunctionCallResult } from '../types';

export class FunctionExecutor {
  private backendUrl: string;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
  }

  /**
   * Executa uma função chamando o backend
   */
  async executeFunction(functionCall: FunctionCall): Promise<FunctionCallResult> {
    console.log(`\n🔧 Executando função: ${functionCall.functionName}`);
    console.log(`   Parâmetros: ${JSON.stringify(functionCall.parameters)}`);

    try {
      const endpoint = this.getEndpoint(functionCall.functionName);
      if (!endpoint) {
        console.log(`   ❌ Função não encontrada`);
        return {
          success: false,
          errorMessage: `Função ${functionCall.functionName} não encontrada`,
        };
      }

      const method = this.getMethod(functionCall.functionName);
      const url = this.getUrlWithParams(functionCall.functionName, functionCall.parameters);
      console.log(`   → ${method} ${url}`);

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST' && Object.keys(functionCall.parameters).length > 0) {
        options.body = JSON.stringify(functionCall.parameters);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
        return {
          success: false,
          errorMessage: `Erro HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json() as { success?: boolean; data?: unknown; errorMessage?: string };

      // Log detalhado da resposta
      console.log(`   ✅ Sucesso!`);
      if (functionCall.functionName === 'listar_procedimentos' || functionCall.functionName === 'listar_unidades') {
        console.log(`   📋 Dados retornados (${Array.isArray(data.data) ? data.data.length : 0} itens):`);
        console.log(JSON.stringify(data.data, null, 2));
      } else if (data.data) {
        const dataStr = JSON.stringify(data.data);
        console.log(`   📊 Dados:`, dataStr.length > 200 ? dataStr.substring(0, 200) + '...' : dataStr);
      } else {
        console.log(`   📦 Resposta bruta:`, JSON.stringify(data, null, 2));
        console.log(`   ℹ️ Sem dados retornados (success=${data.success})`);
      }

      return {
        success: data.success !== false,
        data: data.data,
        errorMessage: data.errorMessage,
      };
    } catch (error) {
      console.log(`   ❌ Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Executa múltiplas funções em sequência
   */
  async executeMultipleFunctions(
    functionCalls: FunctionCall[]
  ): Promise<FunctionCallResult[]> {
    const results: FunctionCallResult[] = [];

    for (const functionCall of functionCalls) {
      const result = await this.executeFunction(functionCall);
      results.push(result);
    }

    return results;
  }

  /**
   * Obtém o endpoint da função
   */
  private getEndpoint(functionName: string): string | null {
    const endpoints: Record<string, string> = {
      consultar_disponibilidade: '/api/functions/consultar-disponibilidade',
      criar_agendamento: '/api/functions/criar-agendamento',
      validar_duplicidade: '/api/functions/validar-duplicidade',
      listar_unidades: '/api/functions/unidades',
      listar_procedimentos: '/api/functions/procedimentos',
      validar_procedimento: '/api/procedimentos/validar',
      validar_unidade: '/api/unidades/validar',
    };

    return endpoints[functionName] || null;
  }

  /**
   * Obtém o método HTTP da função
   */
  private getMethod(functionName: string): 'GET' | 'POST' {
    const getMethods = ['listar_unidades', 'listar_procedimentos', 'validar_procedimento', 'validar_unidade'];
    return getMethods.includes(functionName) ? 'GET' : 'POST';
  }

  /**
   * Obtém a URL completa com parâmetros
   */
  private getUrlWithParams(functionName: string, parameters: Record<string, unknown>): string {
    const baseEndpoint = this.getEndpoint(functionName);
    if (!baseEndpoint) return '';

    const url = `${this.backendUrl}${baseEndpoint}`;

    // Para validações, adicionar o nome como path parameter
    if (functionName === 'validar_procedimento' || functionName === 'validar_unidade') {
      const nome = parameters.nome as string;
      if (nome) {
        return `${url}/${encodeURIComponent(nome)}`;
      }
    }

    return url;
  }
}
