/**
 * Detector de fallback - identifica quando redirecionar para humano
 */

import { SessionMemory } from '../types';

export interface FallbackReason {
  needsHuman: boolean;
  reason?: string;
  confidence?: number;
}

export class FallbackDetector {
  /**
   * Detecta se precisa redirecionar para humano
   */
  detect(session: SessionMemory, lastResponse?: string): FallbackReason {
    // Múltiplas tentativas sem progresso
    if (session.context.fallbackCount >= 3) {
      return {
        needsHuman: true,
        reason: 'Múltiplas tentativas sem progresso',
      };
    }

    // Sentimento negativo
    if (session.context.sentiment === 'negative') {
      return {
        needsHuman: true,
        reason: 'Sentimento negativo detectado',
      };
    }

    // Muitas mensagens sem conclusão (mais de 10)
    if (session.messages.length > 10 && !session.slots.nome) {
      return {
        needsHuman: true,
        reason: 'Conversa muito longa sem progresso',
      };
    }

    // Não precisa de humano
    return {
      needsHuman: false,
    };
  }

  /**
   * Incrementa contador de fallback
   */
  incrementFallbackCount(session: SessionMemory): void {
    session.context.fallbackCount = (session.context.fallbackCount || 0) + 1;
  }
}


