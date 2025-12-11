/**
 * ProactivityEngineService
 * 
 * Responsabilidade: Determinar quais funções devem ser chamadas proativamente
 * Princípio SOLID: Single Responsibility - apenas lógica de proatividade
 */

import { FunctionCall, Slots } from '../types';

export class ProactivityEngineService {
    /**
     * Determina funções que DEVEM ser chamadas automaticamente
     * Bypass do LLM para garantir comportamento proativo
     */
    determineForcedFunctionCalls(scenario: string, slots: Slots): FunctionCall[] {
        const forcedCalls: FunctionCall[] = [];

        // GREETING: Sempre listar procedimentos
        if (scenario === 'greeting') {
            forcedCalls.push({
                functionName: 'listar_procedimentos',
                parameters: {},
            });
        }

        // CONFIRMATION: SEMPRE validar tudo antes de pedir confirmação
        // CRÍTICO: Ignora flags de validação e valida novamente para garantir
        if (scenario === 'confirmation') {
            console.log('  🎯 Cenário CONFIRMATION: Validando TUDO antes de confirmar...');

            // SEMPRE validar procedimento
            if (slots.procedimento) {
                console.log('     → Validar procedimento');
                forcedCalls.push({
                    functionName: 'validar_procedimento',
                    parameters: { nome: slots.procedimento },
                });
            }

            // SEMPRE validar unidade
            if (slots.unidade) {
                console.log('     → Validar unidade');
                forcedCalls.push({
                    functionName: 'validar_unidade',
                    parameters: { nome: slots.unidade },
                });
            }

            // CRÍTICO: Verificar se o HORÁRIO ESPECÍFICO está disponível
            if (slots.unidade && slots.data && slots.horario) {
                console.log('     → Consultar disponibilidade para verificar horário específico');
                forcedCalls.push({
                    functionName: 'consultar_disponibilidade',
                    parameters: {
                        unidade: slots.unidade,
                        data: slots.data,
                    },
                });

                // Adicionar validação de duplicidade
                console.log('     → Validar duplicidade');
                const dataHoraISO = `${slots.data}T${slots.horario}:00`;
                forcedCalls.push({
                    functionName: 'validar_duplicidade',
                    parameters: {
                        nomePaciente: slots.nome,
                        dataHora: dataHoraISO,
                        unidade: slots.unidade,
                    },
                });
            }
        }

        // SCHEDULING: Usuário confirmou - criar agendamento IMEDIATAMENTE
        if (scenario === 'scheduling') {
            console.log('  🎯 Cenário SCHEDULING: Criando agendamento...');

            if (slots.nome && slots.procedimento && slots.unidade && slots.data && slots.horario) {
                // Combinar data e horário em DateTime
                const dataHora = `${slots.data}T${slots.horario}:00`;

                console.log(`     → criar_agendamento(${slots.nome}, ${slots.procedimento}, ${slots.unidade}, ${dataHora})`);

                forcedCalls.push({
                    functionName: 'criar_agendamento',
                    parameters: {
                        nomePaciente: slots.nome,
                        procedimento: slots.procedimento,
                        unidade: slots.unidade,
                        dataHora: dataHora,
                        // Backend rejeita email: "" (validação EmailAddress), enviar null se vazio
                        email: slots.email && slots.email.trim() !== '' ? slots.email : undefined,
                    },
                });
            }
        }

        // DATA-COLLECTION: Comportamento proativo baseado em slots faltantes
        if (scenario === 'data-collection') {
            // Se tem nome e procedimento mas NÃO tem unidade → Listar unidades
            if (slots.nome && slots.procedimento && !slots.unidade) {
                console.log('  🎯 Detectado: nome+procedimento sem unidade → listar_unidades()');
                forcedCalls.push({
                    functionName: 'listar_unidades',
                    parameters: {},
                });
            }

            // 🔴 REMOVIDO: Forçar consultar_disponibilidade com data automática
            // O bot deve PERGUNTAR qual dia o usuário prefere, não assumir "amanhã"
            // Após o usuário fornecer a data, o LLM chamará consultar_disponibilidade naturalmente
        }

        return forcedCalls;
    }

    /**
     * Verifica se o cenário requer proatividade
     */
    requiresProactivity(scenario: string): boolean {
        return ['greeting', 'confirmation', 'data-collection'].includes(scenario);
    }

    /**
     * Determina se deve listar opções automaticamente
     */
    shouldListOptions(scenario: string, slots: Slots): boolean {
        if (scenario === 'greeting') return true;
        if (scenario === 'data-collection' && !slots.procedimento) return true;
        return false;
    }
}
