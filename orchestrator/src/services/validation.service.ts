/**
 * Serviço responsável por validação de dados via backend
 * Segue Single Responsibility Principle
 */

import { FunctionExecutor } from '../functions/function-executor';

export interface ValidationResult {
    isValid: boolean;
    normalizedValue?: string;
    availableOptions?: string[];
    errorMessage?: string;
}

export interface AvailabilityResult {
    hasSlots: boolean;
    availableSlots?: string[];
    errorMessage?: string;
}

export class ValidationService {
    constructor(private functionExecutor: FunctionExecutor) { }

    /**
     * Valida procedimento com backend
     */
    async validateProcedimento(procedimento: string): Promise<ValidationResult> {
        try {
            const result = await this.functionExecutor.executeFunction({
                functionName: 'listar_procedimentos',
                parameters: {}
            });

            if (!result.success || !result.data) {
                return { isValid: false, errorMessage: 'Erro ao buscar procedimentos' };
            }

            const procedimentos = result.data as Array<{ nome: string }>;
            const procedimentoInput = procedimento.toLowerCase();

            const match = procedimentos.find(p =>
                p.nome.toLowerCase().includes(procedimentoInput) ||
                procedimentoInput.includes(p.nome.toLowerCase())
            );

            if (match) {
                return {
                    isValid: true,
                    normalizedValue: match.nome
                };
            }

            return {
                isValid: false,
                availableOptions: procedimentos.map(p => p.nome)
            };
        } catch (error) {
            return {
                isValid: false,
                errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }

    /**
     * Valida unidade com backend
     */
    async validateUnidade(unidade: string): Promise<ValidationResult> {
        try {
            const result = await this.functionExecutor.executeFunction({
                functionName: 'listar_unidades',
                parameters: {}
            });

            if (!result.success || !result.data) {
                return { isValid: false, errorMessage: 'Erro ao buscar unidades' };
            }

            const unidades = result.data as Array<{ nome: string }>;
            const unidadeInput = unidade.toLowerCase();

            const match = unidades.find(u =>
                u.nome.toLowerCase().includes(unidadeInput) ||
                unidadeInput.includes(u.nome.toLowerCase())
            );

            if (match) {
                return {
                    isValid: true,
                    normalizedValue: match.nome
                };
            }

            return {
                isValid: false,
                availableOptions: unidades.map(u => u.nome)
            };
        } catch (error) {
            return {
                isValid: false,
                errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }

    /**
     * Valida disponibilidade para uma data específica
     */
    async validateDisponibilidade(
        unidade: string,
        data: string
    ): Promise<AvailabilityResult> {
        try {
            const result = await this.functionExecutor.executeFunction({
                functionName: 'consultar_disponibilidade',
                parameters: { unidade, data }
            });

            if (!result.success || !result.data) {
                return {
                    hasSlots: false,
                    errorMessage: 'Erro ao buscar disponibilidade'
                };
            }

            const slots = result.data as Array<{ dataHora: string; disponivel: boolean }>;
            const disponiveis = slots.filter(s => s.disponivel);

            if (disponiveis.length === 0) {
                return { hasSlots: false };
            }

            const horarios = disponiveis.map(s => {
                const dt = new Date(s.dataHora);
                return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            });

            return {
                hasSlots: true,
                availableSlots: horarios
            };
        } catch (error) {
            return {
                hasSlots: false,
                errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }

    /**
     * Valida todos os slots necessários e retorna contexto de validação
     * CRITICAL: Preserve ALL existing fields, don't overwrite the object
     */
    async validateAllSlots(slots: any): Promise<string> {
        let validationContext = '';

        // 🔧 FIX: Preserve all existing fields before validation
        // Create a copy to avoid losing fields during validation
        const preservedFields = { ...slots };

        // Validar procedimento
        if (slots.procedimento && !slots.procedimentoValidado) {
            const result = await this.validateProcedimento(slots.procedimento);

            if (result.isValid && result.normalizedValue) {
                slots.procedimento = result.normalizedValue;
                slots.procedimentoValidado = true;
            } else {
                slots.procedimentoValidado = false;
                if (result.availableOptions) {
                    validationContext += `\n\nPROCEDIMENTOS DISPONÍVEIS:\n${result.availableOptions.map(p => `- ${p}`).join('\n')}`;
                }
            }
        }

        // Validar unidade
        if (slots.unidade && !slots.unidadeValidada) {
            const result = await this.validateUnidade(slots.unidade);

            if (result.isValid && result.normalizedValue) {
                slots.unidade = result.normalizedValue;
                slots.unidadeValidada = true;
            } else {
                slots.unidadeValidada = false;
                if (result.availableOptions) {
                    validationContext += `\n\nUNIDADES DISPONÍVEIS:\n${result.availableOptions.map(u => `- ${u}`).join('\n')}`;
                }
            }
        }

        // Validar disponibilidade
        if (slots.unidadeValidada && slots.data && !slots.dataValidada) {
            const result = await this.validateDisponibilidade(slots.unidade, slots.data);

            if (result.hasSlots && result.availableSlots) {
                slots.dataValidada = true;
                validationContext += `\n\nHORÁRIOS DISPONÍVEIS em ${slots.data}:\n${result.availableSlots.map(h => `- ${h}`).join('\n')}`;
            } else {
                slots.dataValidada = false;
                validationContext += `\n\n❌ Não há vagas disponíveis em ${slots.data}. Por favor, sugira outra data.`;
            }
        }

        // 🔧 FIX: Restore ALL fields that existed before validation
        // Validation should only ADD fields, never REMOVE them
        Object.keys(preservedFields).forEach(key => {
            if (!(key in slots)) {
                slots[key] = preservedFields[key];
            }
        });

        return validationContext;
    }
}
