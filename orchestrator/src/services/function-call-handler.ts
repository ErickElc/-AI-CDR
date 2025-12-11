/**
 * Handler responsável por executar e processar function calls
 * Segue Single Responsibility Principle
 */

import { FunctionExecutor } from '../functions/function-executor';
import { FunctionCall, FunctionCallResult, Slots } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { VALIDATION_RESPONSE_PROMPTS } from '../prompts/validation-response-prompts';
import { SuggestionEngine } from './suggestion-engine.service';
import { env } from '../config/env';

export interface FunctionCallResponse {
    text: string;
    functionCalls: FunctionCall[];
}

export class FunctionCallHandler {
    constructor(
        private functionExecutor: FunctionExecutor,
        private llm: ChatOpenAI,
        private suggestionEngine: SuggestionEngine
    ) { }

    /**
     * Executa todas as function calls e retorna os resultados
     */
    async executeAll(
        functionCalls: FunctionCall[]
    ): Promise<Array<{ call: FunctionCall; result: FunctionCallResult }>> {
        const results: Array<{ call: FunctionCall; result: FunctionCallResult }> = [];

        console.log(`🔧 Executando ${functionCalls.length} função(ões)...`);

        for (const fc of functionCalls) {
            console.log(`  ⚙️ Executando: ${fc.functionName}`);
            const result = await this.functionExecutor.executeFunction(fc);

            results.push({ call: fc, result });

            if (result.success) {
                console.log(`  ✅ ${fc.functionName} → Sucesso`);
            } else {
                console.log(`  ❌ ${fc.functionName} → Erro: ${result.errorMessage}`);
            }
        }

        return results;
    }

    /**
     * Gera resposta final baseada nos resultados das funções
     */
    async generateFinalResponse(
        functionResults: Array<{ call: FunctionCall; result: FunctionCallResult }>,
        userMessage: string,
        slots: any
    ): Promise<string> {
        // Verificar se há algum resultado com sucesso
        const hasSuccessResults = functionResults.some(
            fr => fr.result.success && fr.result.data
        );

        if (!hasSuccessResults) {
            // Todas as funções falharam
            return 'Desculpe, ocorreu um erro ao processar sua solicitação. Pode tentar novamente?';
        }

        // 🔴 ANTI-ALUCINAÇÃO: Verificar validações primeiro
        const validacoes = {
            procedimentoValido: true,
            unidadeValida: true,
            mensagemErro: ''
        };

        functionResults.forEach(({ call, result }) => {
            if (call.functionName === 'validar_procedimento' && result.success && result.data) {
                const data = result.data as any;
                if (data.existe === false) {
                    validacoes.procedimentoValido = false;
                    validacoes.mensagemErro += `❌ Procedimento inválido. `;
                }
            }
            if (call.functionName === 'validar_unidade' && result.success && result.data) {
                const data = result.data as any;
                if (data.existe === false) {
                    validacoes.unidadeValida = false;
                    validacoes.mensagemErro += `❌ Unidade inválida. `;
                }
            }
        });

        // 🚫 Se procedure ou unidade inválidos, NÃO MOSTRAR outros dados
        // Usar prompts organizados para respostas consistentes
        if (!validacoes.procedimentoValido || !validacoes.unidadeValida) {
            const messages = [];

            if (!validacoes.procedimentoValido) {
                // Buscar lista de procedimentos se foi chamado
                const listarProc = functionResults.find(r => r.call.functionName === 'listar_procedimentos');
                if (listarProc && listarProc.result.success && listarProc.result.data) {
                    const procs = listarProc.result.data as any[];
                    messages.push(VALIDATION_RESPONSE_PROMPTS.invalidProcedure(procs));
                } else {
                    messages.push('❌ O procedimento solicitado não está disponível.');
                }
            }

            if (!validacoes.unidadeValida) {
                // Buscar lista de unidades se foi chamado
                const listarUnid = functionResults.find(r => r.call.functionName === 'listar_unidades');
                if (listarUnid && listarUnid.result.success && listarUnid.result.data) {
                    const unidades = listarUnid.result.data as any[];
                    messages.push(VALIDATION_RESPONSE_PROMPTS.invalidUnit(unidades));
                } else {
                    messages.push('❌ A unidade solicitada não existe.');
                }
            }

            // Gerar resposta usando LLM com prompt organizado
            const validationPrompt = messages.join('\n\n');
            const response = await this.llm.invoke([
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `${validationPrompt}\n\nMensagem do usuário: ${userMessage}\n\nGere uma resposta clara e útil seguindo as instruções acima.` }
            ]);

            return response.content as string;
        }

        // 🎯 DIRECT LIST FORMATTING - Bypass LLM for listing functions
        const listarProc = functionResults.find(r => r.call.functionName === 'listar_procedimentos');
        const listarUnid = functionResults.find(r => r.call.functionName === 'listar_unidades');

        // If we have listing functions, format and return directly
        if (listarProc?.result.success && listarProc.result.data) {
            const procs = listarProc.result.data as any[];
            console.log(`  📋 Formatando lista de ${procs.length} procedimentos diretamente`);

            let response = 'Temos os seguintes procedimentos disponíveis:\n\n';
            procs.forEach(p => {
                response += `• **${p.nome}** (${p.duracaoMinutos} minutos)\n`;
            });
            response += '\nQual procedimento você gostaria?';

            return response; // ← DIRECT RETURN - No LLM processing
        }

        if (listarUnid?.result.success && listarUnid.result.data) {
            const unidades = listarUnid.result.data as any[];
            console.log(`  📋 Formatando lista de ${unidades.length} unidades diretamente`);

            let response = 'Temos as seguintes unidades:\n\n';
            unidades.forEach(u => {
                response += `• **${u.nome}** - ${u.endereco}\n`;
            });
            response += '\nEm qual você prefere agendar?';

            return response; // ← DIRECT RETURN - No LLM processing
        }

        // Criar contexto com TODOS os resultados (APENAS se validações OK)
        let resultsContext = '## ⚠️ DADOS JÁ OBTIDOS - USE-OS IMEDIATAMENTE ⚠️\n\n';

        // 🆕 VERIFICAR SE HORÁRIO ESPECÍFICO ESTÁ DISPONÍVEL
        const disponibilidadeResult = functionResults.find(
            fr => fr.call.functionName === 'consultar_disponibilidade'
        );

        if (disponibilidadeResult?.result.data && slots.horario) {
            const slotsDisponiveis = disponibilidadeResult.result.data as Array<{
                dataHora: string;
                disponivel: boolean;
            }>;

            // Extrair apenas o horário (HH:mm) do slot solicitado
            const horarioSolicitado = slots.horario; // "14:00"

            // Verificar se horário específico está disponível
            const slotSolicitado = slotsDisponiveis.find(s => {
                const slotTime = s.dataHora.split('T')[1]?.substring(0, 5); // "2025-12-10T14:00" → "14:00"
                return slotTime === horarioSolicitado && s.disponivel;
            });

            if (!slotSolicitado) {
                // HORÁRIO INDISPONÍVEL - Sugerir alternativas
                console.log(`⚠️ Horário ${horarioSolicitado} indisponível - buscando alternativas...`);

                const alternativas = this.suggestionEngine.findClosestTimeSlots(
                    horarioSolicitado,
                    slotsDisponiveis,
                    3
                );

                console.log(`  💡 Sugestões: ${alternativas.join(', ')}`);

                // Adicionar ao contexto para LLM responder
                resultsContext += `\n## 🚨 HORÁRIO INDISPONÍVEL - SUGERIR ALTERNATIVAS\n\n`;
                resultsContext += `⚠️ **ATENÇÃO**: O horário solicitado NÃO está disponível!\n\n`;
                resultsContext += `Horário solicitado: **${horarioSolicitado}**\n`;
                resultsContext += `Status: ❌ INDISPONÍVEL\n\n`;

                if (alternativas.length > 0) {
                    resultsContext += `**Horários alternativos mais próximos:**\n`;
                    alternativas.forEach((h, i) => {
                        resultsContext += `${i + 1}. ${h}\n`;
                    });
                    resultsContext += `\n**INSTRUÇÃO CRÍTICA:**\n`;
                    resultsContext += `Você DEVE informar ao usuário que o horário ${horarioSolicitado} não está disponível e\n`;
                    resultsContext += `oferecer os horários acima como alternativa. Seja cortês e direto.\n\n`;
                } else {
                    resultsContext += `❌ Nenhum horário alternativo disponível para este dia.\n`;
                    resultsContext += `Sugira ao usuário escolher outra data.\n\n`;
                }
            }
        }

        // 🎉 DETECÇÃO DE SUCESSO: Agendamento criado
        let agendamentoCriado = false;
        let dadosAgendamento: any = null;

        functionResults.forEach(({ call, result }) => {
            if (call.functionName === 'criar_agendamento' && result.success && result.data) {
                agendamentoCriado = true;
                dadosAgendamento = result.data;
            }
        });

        // Se agendamento foi criado, confirmar explicitamente
        if (agendamentoCriado && dadosAgendamento) {
            const data = new Date(dadosAgendamento.dataHora);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            let response = `✅ **Agendamento confirmado com sucesso!**\n\n`;
            response += `📋 **Detalhes do agendamento:**\n`;
            response += `- 👤 Paciente: ${dadosAgendamento.nomePaciente}\n`;
            response += `- 🏥 Procedimento: ${dadosAgendamento.procedimento}\n`;
            response += `- 📍 Unidade: ${dadosAgendamento.unidade}\n`;
            response += `- 📅 Data: ${dataFormatada}\n`;
            response += `- ⏰ Horário: ${horaFormatada}\n`;
            response += `- 🆔 Protocolo: ${dadosAgendamento.id}\n\n`;
            response += `Por favor, chegue com 15 minutos de antecedência. Até lá! 😊`;

            return response;
        }

        // 🔴 DETECÇÃO DE DUPLICIDADE: Agendamento já existe
        let temDuplicidade = false;
        let mensagemDuplicidade = '';

        functionResults.forEach(({ call, result }) => {
            if (call.functionName === 'criar_agendamento' && !result.success && result.errorMessage) {
                // Backend retorna: "Já existe um agendamento para..."
                if (result.errorMessage.toLowerCase().includes('já existe um agendamento')) {
                    temDuplicidade = true;
                    mensagemDuplicidade = result.errorMessage;
                }
            }
        });

        // Se detectou duplicidade, responder com alternativas
        if (temDuplicidade) {
            let response = `⚠️ **${mensagemDuplicidade}**\n\n`;
            response += `Você gostaria de:\n`;
            response += `1. Escolher outro horário\n`;
            response += `2. Escolher outra data\n`;
            response += `3. Cancelar o agendamento existente e fazer um novo\n\n`;
            response += `O que prefere?`;

            // Retornar direto sem passar pelo LLM
            return response;
        }

        functionResults.forEach(({ call, result }) => {
            resultsContext += `### Função: ${call.functionName}\n`;
            if (result.success && result.data) {
                resultsContext += `✅ Status: SUCESSO - Dados disponíveis abaixo\n`;
                resultsContext += `📊 DADOS:\n${JSON.stringify(result.data, null, 2)}\n\n`;
            } else {
                resultsContext += `❌ Erro: ${result.errorMessage || 'Desconhecido'}\n\n`;
            }
        });

        // Gerar resposta final com instruções MUITO mais imperativas
        const finalPrompt = `${resultsContext}
## ⚠️ REGRA ABSOLUTA ⚠️

Você NÃO está consultando nada. Os dados JÁ estão aqui neste contexto.

⛔ NUNCA DIGA (ABSOLUTAMENTE PROIBIDO):
- "vou verificar"
- "vou consultar"
- "vou listar"
- "deixe-me checar"
- "consultando..."
- "verificando..."
- "aguarde"

✅ SEMPRE FAÇA (OBRIGATÓRIO):
1. MOSTRE os dados que foram retornados IMEDIATAMENTE
2. LISTE todas as opções disponíveis
3. SEJA DIRETO - sem rodeios ou frases intermediárias
4. FORMATE claramente (use bullets, quebras de linha)

## MENSAGEM DO USUÁRIO
${userMessage}

## SLOTS COLETADOS
${JSON.stringify(slots, null, 2)}

## SUA TAREFA AGORA
Use OS DADOS ACIMA que JÁ FORAM OBTIDOS e responda IMEDIATAMENTE.
NÃO mencione que está buscando/verificando/consultando.
MOSTRE as informações e PERGUNTE o que o usuário prefere.

RESPONDA AGORA:`;

        const finalMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            { role: 'user' as const, content: finalPrompt },
        ];

        const response = await this.llm.invoke(finalMessages);
        return response.content as string;
    }

    /**
     * Processa function calls: executa todas e gera resposta
     */
    async processAndRespond(
        functionCalls: FunctionCall[],
        userMessage: string,
        slots: any
    ): Promise<FunctionCallResponse> {
        const results = await this.executeAll(functionCalls);
        const text = await this.generateFinalResponse(results, userMessage, slots);

        return {
            text,
            functionCalls
        };
    }
}
