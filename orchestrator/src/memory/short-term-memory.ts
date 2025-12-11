/**
 * Memória short-term em memória para gerenciamento de sessões
 */

import { v4 as uuidv4 } from 'uuid';
import { SessionMemory, Slots, Message, SessionContext } from '../types';
import { env } from '../config/env';

export class ShortTermMemory {
  private sessions: Map<string, SessionMemory>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessions = new Map();
    this.startCleanupInterval();
  }

  /**
   * Cria uma nova sessão e retorna o sessionId
   * @param customSessionId - ID customizado (se fornecido pelo cliente)
   */
  createSession(customSessionId?: string): string {
    const sessionId = customSessionId || uuidv4();
    const now = new Date();

    // Verificar se já existe
    if (this.sessions.has(sessionId)) {
      console.warn(`⚠️ Sessão ${sessionId} já existe, retornando ID existente`);
      return sessionId;
    }

    const session: SessionMemory = {
      sessionId,
      messages: [],
      slots: {},
      context: {
        currentStep: 1,
        fallbackCount: 0,
      },
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ Sessão criada: ${sessionId}${customSessionId ? ' (ID do frontend)' : ' (novo UUID)'}`);
    return sessionId;
  }

  /**
   * Obtém uma sessão pelo sessionId
   */
  getSession(sessionId: string): SessionMemory | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Adiciona uma mensagem à sessão
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const message: Message = {
      role,
      content,
      timestamp: new Date(),
    };

    session.messages.push(message);
    session.lastActivity = new Date();
  }

  /**
   * Atualiza os slots da sessão (faz merge)
   */
  updateSlots(sessionId: string, slots: Partial<Slots>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.slots = {
      ...session.slots,
      ...slots,
    };
    session.lastActivity = new Date();
  }

  /**
   * Atualiza o contexto da sessão (faz merge)
   */
  updateContext(sessionId: string, context: Partial<SessionContext>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.context = {
      ...session.context,
      ...context,
    };
    session.lastActivity = new Date();
  }

  /**
   * Obtém mensagens recentes da sessão
   */
  getRecentMessages(sessionId: string, count: number): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    const messages = session.messages;
    const startIndex = Math.max(0, messages.length - count);
    return messages.slice(startIndex);
  }

  /**
   * Remove sessões expiradas
   */
  cleanupExpiredSessions(timeoutMinutes: number): void {
    const now = new Date();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceLastActivity > timeoutMs) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Retorna todas as sessões
   */
  getAllSessions(): SessionMemory[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Remove todas as sessões
   */
  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Inicia intervalo de limpeza automática
   */
  private startCleanupInterval(): void {
    // Limpa a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions(env.session.timeoutMinutes);
    }, 5 * 60 * 1000);
  }

  /**
   * Para o intervalo de limpeza
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

