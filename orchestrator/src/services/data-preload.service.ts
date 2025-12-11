/**
 * Serviço de pré-carregamento de dados do backend
 * Mantém cache em memória de procedimentos e unidades
 */

import { FunctionExecutor } from '../functions/function-executor';

interface Procedimento {
    id: string;
    nome: string;
    duracaoMinutos?: number;
}

interface Unidade {
    id: string;
    nome: string;
    endereco: string;
    ativa?: boolean;
}

export class DataPreloadService {
    private procedimentos: Procedimento[] = [];
    private unidades: Unidade[] = [];
    private lastRefresh = 0;
    private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos
    private isLoading = false;

    constructor(private functionExecutor: FunctionExecutor) { }

    /**
     * Pré-carrega todos os dados do backend
     */
    async preloadAllData(): Promise<void> {
        if (this.isLoading) {
            console.log('  ⏳ Pré-carregamento já em andamento, aguardando...');
            return;
        }

        this.isLoading = true;
        console.log('📦 Pré-carregando dados do backend...');

        try {
            // Carregar procedimentos
            const procResult = await this.functionExecutor.executeFunction({
                functionName: 'listar_procedimentos',
                parameters: {},
            });

            if (procResult.success && procResult.data) {
                this.procedimentos = procResult.data as Procedimento[];
                console.log(`  ✅ ${this.procedimentos.length} procedimentos carregados`);
            } else {
                console.warn('  ⚠️ Falha ao carregar procedimentos');
            }

            // Carregar unidades
            const unidResult = await this.functionExecutor.executeFunction({
                functionName: 'listar_unidades',
                parameters: {},
            });

            if (unidResult.success && unidResult.data) {
                this.unidades = unidResult.data as Unidade[];
                console.log(`  ✅ ${this.unidades.length} unidades carregadas`);
            } else {
                console.warn('  ⚠️ Falha ao carregar unidades');
            }

            this.lastRefresh = Date.now();
            console.log('✅ Pré-carregamento concluído');
        } catch (error) {
            console.error('❌ Erro ao pré-carregar dados:', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Retorna lista de procedimentos em cache
     */
    getProcedimentos(): Procedimento[] {
        return this.procedimentos;
    }

    /**
     * Retorna lista de unidades em cache
     */
    getUnidades(): Unidade[] {
        return this.unidades;
    }

    /**
     * Verifica se o cache deve ser atualizado
     */
    shouldRefresh(): boolean {
        return Date.now() - this.lastRefresh > this.REFRESH_INTERVAL;
    }

    /**
     * Verifica se dados foram carregados com sucesso
     */
    isDataLoaded(): boolean {
        return this.procedimentos.length > 0 && this.unidades.length > 0;
    }

    /**
     * Força refresh do cache
     */
    async forceRefresh(): Promise<void> {
        this.lastRefresh = 0;
        await this.preloadAllData();
    }
}
