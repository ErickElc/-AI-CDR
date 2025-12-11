/**
 * PromptBuilderService
 * 
 * Responsabilidade: Construir prompts contextualizados para o LLM
 * Princípio SOLID: Single Responsibility - apenas construção de prompts
 */

import { SessionMemory } from '../types';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { getScenarioPrompt } from '../prompts/scenario-prompts';
import { DataPreloadService } from './data-preload.service';

export class PromptBuilderService {
    constructor(
        private dataPreloadService: DataPreloadService,
        private backendUrl: string
    ) { }

    /**
     * Busca data/hora atual do backend
     */
    async getCurrentDateFromBackend(): Promise<string> {
        try {
            const response = await fetch(`${this.backendUrl}/api/system/current-datetime`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json() as {
                date: string;
                dayOfWeek: string;
                formattedDate: string;
                formattedTime: string;
            };

            return `DATA E HORA ATUAIS (do servidor):\n` +
                `📅 Data: ${data.formattedDate} (${data.date})\n` +
                `📆 Dia da semana: ${data.dayOfWeek}\n` +
                `🕐 Hora: ${data.formattedTime}\n\n` +
                `⚠️ IMPORTANTE: Use SEMPRE esta data como referência para calcular:\n` +
                `- "próxima segunda", "próxima terça", etc.\n` +
                `- "amanhã", "depois de amanhã"\n` +
                `- Qualquer data relativa\n\n`;
        } catch (error) {
            console.warn('⚠️ Erro ao buscar data do backend, usando data local:', error);
            const now = new Date();
            return `DATA E HORA ATUAIS (local - fallback):\n` +
                `📅 Data: ${now.toLocaleDateString('pt-BR')} (${now.toISOString().split('T')[0]})\n` +
                `📆 Dia da semana: ${now.toLocaleDateString('pt-BR', { weekday: 'long' })}\n` +
                `🕐 Hora: ${now.toLocaleTimeString('pt-BR')}\n\n`;
        }
    }

    /**
     * Constrói o prompt completo com contexto
     */
    async buildPrompt(
        session: SessionMemory,
        ragContext?: any,
        scenario?: string,
        validationContext?: string
    ): Promise<string> {
        let context = SYSTEM_PROMPT + '\n\n';

        // ADICIONAR DATA ATUAL DO BACKEND
        const currentDateInfo = await this.getCurrentDateFromBackend();
        context += `## 📅 CONTEXTO TEMPORAL\n\n${currentDateInfo}`;

        // ADICIONAR DADOS DO SISTEMA (procedimentos e unidades disponíveis)
        if (this.dataPreloadService.shouldRefresh()) {
            await this.dataPreloadService.preloadAllData();
        }

        if (this.dataPreloadService.isDataLoaded()) {
            const procs = this.dataPreloadService.getProcedimentos();
            const units = this.dataPreloadService.getUnidades();

            context += `\n## 📊 DADOS DISPONÍVEIS NO SISTEMA\n\n`;
            context += `**Procedimentos Disponíveis:**\n`;
            context += procs.map(p => `- ${p.nome}`).join('\n');
            context += `\n\n**Unidades Disponíveis:**\n`;
            context += units.map(u => `- ${u.nome} (${u.endereco})`).join('\n');
            context += `\n\n⚠️ IMPORTANTE: Estes são os ÚNICOS procedimentos e unidades válidos no sistema!\n`;
            context += `⛔ NUNCA mencione procedimentos ou unidades que NÃO estejam nesta lista!\n\n`;
        }

        // ADICIONAR CONTEXTO DE VALIDAÇÃO (se houver)
        if (validationContext) {
            context += `\n## ⚠️ VALIDAÇÃO DE DADOS\n${validationContext}\n`;
        }

        const scenarioPrompt = getScenarioPrompt(scenario as any);

        context += `## CONTEXTO ATUAL\n`;
        context += `Cenário: ${scenario}\n`;
        context += `${scenarioPrompt}\n\n`;

        // CRITICAL: Explicitamente listar slots JÁ coletados com instruções claras
        if (Object.keys(session.slots).length > 0) {
            context += `## ⚠️ INFORMAÇÕES JÁ FORNECIDAS - NÃO PERGUNTE NOVAMENTE ⚠️\n`;
            context += `O usuário JÁ forneceu as seguintes informações. NUNCA pergunte novamente:\n\n`;

            if (session.slots.nome) {
                context += `✅ NOME: ${session.slots.nome} (JÁ COLETADO - NÃO PERGUNTE)\n`;
            }
            if (session.slots.procedimento) {
                context += `✅ PROCEDIMENTO: ${session.slots.procedimento} (JÁ COLETADO - NÃO PERGUNTE)\n`;
            }
            if (session.slots.unidade) {
                context += `✅ UNIDADE: ${session.slots.unidade} (JÁ COLETADO - NÃO PERGUNTE)\n`;
            }
            if (session.slots.data) {
                context += `✅ DATA: ${session.slots.data} (JÁ COLETADO - NÃO PERGUNTE)\n`;
            }
            if (session.slots.horario) {
                context += `✅ HORÁRIO: ${session.slots.horario} (JÁ COLETADO - NÃO PERGUNTE)\n`;
            }
            if (session.slots.email) {
                context += `✅ EMAIL: ${session.slots.email} (JÁ COLETADO - NÃO PERGUNTE)\n`;
            }

            context += `\n`;
        }

        // Adicionar informações faltantes
        const missingInfo: string[] = [];
        if (!session.slots.nome) missingInfo.push('nome do paciente');
        if (!session.slots.procedimento) missingInfo.push('tipo de procedimento');
        if (!session.slots.unidade) missingInfo.push('unidade preferida');
        if (!session.slots.data) missingInfo.push('data desejada');
        if (!session.slots.horario) missingInfo.push('horário preferido');

        if (missingInfo.length > 0) {
            context += `## INFORMAÇÕES AINDA NECESSÁRIAS\n`;
            context += `Você DEVE perguntar apenas sobre:\n`;
            missingInfo.forEach(info => {
                context += `- ${info}\n`;
            });
            context += `\n`;
        }

        if (ragContext?.appointmentHistory && ragContext.appointmentHistory.length > 0) {
            context += `## HISTÓRICO DO PACIENTE\n`;
            context += `Com base em agendamentos anteriores, este paciente geralmente prefere:\n`;
            const history = ragContext.appointmentHistory[0];
            if (history.preferences) {
                if (history.preferences.preferredUnits) {
                    context += `- Unidades: ${history.preferences.preferredUnits.join(', ')}\n`;
                }
                if (history.preferences.frequentProcedures) {
                    context += `- Procedimentos: ${history.preferences.frequentProcedures.join(', ')}\n`;
                }
                if (history.preferences.preferredTimes) {
                    context += `- Horários: ${history.preferences.preferredTimes.join(', ')}\n`;
                }
            }
            context += '\n';
        }

        // 📚 ADICIONAR CONTEXTO FAQ do RAG
        if (ragContext?.faqResults && ragContext.faqResults.length > 0) {
            console.log(`📚 Adicionando ${ragContext.faqResults.length} FAQs ao prompt`);
            context += `## 📚 BASE DE CONHECIMENTO (FAQ)\n\n`;
            context += `Encontrei ${ragContext.faqResults.length} respostas relevantes na base de conhecimento:\n\n`;

            ragContext.faqResults.forEach((faq: import('../types').FAQResult, index: number) => {
                const relevancia = (faq.score * 100).toFixed(0);
                context += `### FAQ ${index + 1} (Relevância: ${relevancia}%)\n`;
                context += `**Pergunta**: ${faq.question}\n`;
                context += `**Resposta**: ${faq.answer}\n\n`;
            });

            context += `⚠️ INSTRUÇÕES IMPORTANTES SOBRE FAQ:\n`;
            context += `- Se a pergunta do usuário está relacionada a alguma FAQ acima, use APENAS a resposta da base\n`;
            context += `- NÃO invente informações que não estão na base de conhecimento\n`;
            context += `- NÃO adicione informações extras que não estão na resposta original\n`;
            context += `- Se nenhuma FAQ acima responde a pergunta, diga: "Não tenho essa informação na base. Posso ajudar com agendamentos?"\n\n`;
        } else {
            console.log(`ℹ️  Nenhuma FAQ para adicionar ao prompt (ragContext.faqResults: ${ragContext?.faqResults?.length || 0})`);
        }

        return context;
    }
}
