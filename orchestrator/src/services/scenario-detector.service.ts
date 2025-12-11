/**
 * ScenarioDetectorService
 * 
 * Responsabilidade: Detectar o cenário atual da conversa baseado no estado da sessão
 * Princípio SOLID: Single Responsibility - apenas detecção de cenário
 */

import { SessionMemory, Slots, ScenarioType } from '../types';

export class ScenarioDetectorService {
    /**
     * Detecta o cenário atual da conversa
     */
    detectScenario(session: SessionMemory, extractedSlots: any): ScenarioType {
        const slots = session.slots;
        const messageCount = session.messages.length;
        const userMessage = session.messages[session.messages.length - 1]?.content.toLowerCase() || '';

        // Helper: verifica confirmação explícita
        const isExplicitConfirmation = (): boolean => {
            const confirmWords = [
                'sim', 'confirma', 'confirmado', 'tudo certo', 'ok',
                'pode agendar', 'correto', 'isso mesmo', 'isso', 'pode',
                'vamos', 'vai', 'certinho', 'perfeito', 'beleza'
            ];
            return confirmWords.some(word => userMessage.includes(word));
        };

        // PRIORIDADE 1: Scheduling/Confirmation - Todos os slots preenchidos
        // Verificar ANTES de FAQ para evitar interferência de scores baixos
        // IMPORTANTE: Só ir para confirmation se confidence > 0.5 OU for mensagem de confirmação
        // Isso evita ir para confirmation quando slots vêm de sessão antiga
        const hasAllSlots = slots.nome && slots.procedimento && slots.unidade && slots.data && slots.horario;
        const hasConfidence = extractedSlots.confidence > 0.5 || isExplicitConfirmation();

        if (hasAllSlots && hasConfidence) {
            // Se usuário confirma explicitamente, é scheduling
            if (isExplicitConfirmation()) {
                return 'scheduling';
            }
            // Caso contrário, pede confirmação
            return 'confirmation';
        }

        // PRIORIDADE 2: FAQ - Se não extraiu slots mas tem contexto FAQ
        if (extractedSlots?.ragContext?.faqResults?.length > 0 && extractedSlots.confidence < 0.5) {
            return 'faq';
        }

        // Greeting: primeira ou segunda mensagem sem slots significativos
        if (messageCount <= 2 && !slots.nome && !slots.procedimento && extractedSlots.confidence < 0.5) {
            return 'greeting';
        }

        // Initial Message: Primeira mensagem com dados substanciais (confidence alta)
        if (messageCount <= 3 && extractedSlots.confidence >= 0.5) {
            return 'initial-message';
        }

        // Data Collection: Coletando informações incrementalmente
        return 'data-collection';
    }

    /**
     * Verifica se a mensagem é uma confirmação explícita
     */
    isConfirmation(message: string): boolean {
        const confirmWords = [
            'sim', 'confirma', 'confirmado', 'tudo certo', 'ok',
            'pode agendar', 'correto', 'isso mesmo', 'isso', 'pode',
            'vamos', 'vai', 'certinho', 'perfeito', 'beleza'
        ];
        const lowerMessage = message.toLowerCase();
        return confirmWords.some(word => lowerMessage.includes(word));
    }

    /**
     * Verifica se a mensagem é uma negação
     */
    isDenial(message: string): boolean {
        const denyWords = ['não', 'nao', 'errado', 'incorreto', 'mudar', 'trocar', 'cancelar'];
        const lowerMessage = message.toLowerCase();
        return denyWords.some(word => lowerMessage.includes(word));
    }
}
