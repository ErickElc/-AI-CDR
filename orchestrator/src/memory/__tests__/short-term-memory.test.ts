/**
 * Testes TDD para memória short-term
 */

import { ShortTermMemory } from '../short-term-memory';
import { SessionMemory, Slots } from '../../types';

describe('ShortTermMemory', () => {
  let memory: ShortTermMemory;

  beforeEach(() => {
    memory = new ShortTermMemory();
  });

  afterEach(() => {
    memory.clearAll();
  });

  describe('createSession', () => {
    it('deve criar uma nova sessão com sessionId único', () => {
      const sessionId = memory.createSession();
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('deve criar sessões com IDs diferentes', () => {
      const sessionId1 = memory.createSession();
      const sessionId2 = memory.createSession();
      
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('deve inicializar sessão com estrutura correta', () => {
      const sessionId = memory.createSession();
      const session = memory.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.messages).toEqual([]);
      expect(session?.slots).toEqual({});
      expect(session?.context.currentStep).toBe(1);
      expect(session?.context.fallbackCount).toBe(0);
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('getSession', () => {
    it('deve retornar sessão existente', () => {
      const sessionId = memory.createSession();
      const session = memory.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('deve retornar undefined para sessão inexistente', () => {
      const session = memory.getSession('inexistente');
      
      expect(session).toBeUndefined();
    });
  });

  describe('addMessage', () => {
    it('deve adicionar mensagem do usuário', () => {
      const sessionId = memory.createSession();
      memory.addMessage(sessionId, 'user', 'Olá');
      
      const session = memory.getSession(sessionId);
      expect(session?.messages).toHaveLength(1);
      expect(session?.messages[0].role).toBe('user');
      expect(session?.messages[0].content).toBe('Olá');
      expect(session?.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('deve adicionar mensagem do assistente', () => {
      const sessionId = memory.createSession();
      memory.addMessage(sessionId, 'assistant', 'Olá! Como posso ajudar?');
      
      const session = memory.getSession(sessionId);
      expect(session?.messages).toHaveLength(1);
      expect(session?.messages[0].role).toBe('assistant');
      expect(session?.messages[0].content).toBe('Olá! Como posso ajudar?');
    });

    it('deve atualizar lastActivity ao adicionar mensagem', async () => {
      const sessionId = memory.createSession();
      const session1 = memory.getSession(sessionId);
      const initialActivity = session1?.lastActivity;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      memory.addMessage(sessionId, 'user', 'Teste');
      const session2 = memory.getSession(sessionId);
      
      expect(session2?.lastActivity.getTime()).toBeGreaterThan(initialActivity!.getTime());
    });

    it('deve lançar erro ao adicionar mensagem em sessão inexistente', () => {
      expect(() => {
        memory.addMessage('inexistente', 'user', 'Teste');
      }).toThrow('Session not found');
    });
  });

  describe('updateSlots', () => {
    it('deve atualizar slots da sessão', () => {
      const sessionId = memory.createSession();
      const slots: Slots = {
        nome: 'João Silva',
        procedimento: 'Dermatologia'
      };
      
      memory.updateSlots(sessionId, slots);
      const session = memory.getSession(sessionId);
      
      expect(session?.slots.nome).toBe('João Silva');
      expect(session?.slots.procedimento).toBe('Dermatologia');
    });

    it('deve fazer merge de slots existentes', () => {
      const sessionId = memory.createSession();
      memory.updateSlots(sessionId, { nome: 'João' });
      memory.updateSlots(sessionId, { procedimento: 'Dermatologia' });
      
      const session = memory.getSession(sessionId);
      expect(session?.slots.nome).toBe('João');
      expect(session?.slots.procedimento).toBe('Dermatologia');
    });

    it('deve atualizar lastActivity ao atualizar slots', async () => {
      const sessionId = memory.createSession();
      const session1 = memory.getSession(sessionId);
      const initialActivity = session1?.lastActivity;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      memory.updateSlots(sessionId, { nome: 'João' });
      const session2 = memory.getSession(sessionId);
      
      expect(session2?.lastActivity.getTime()).toBeGreaterThan(initialActivity!.getTime());
    });

    it('deve lançar erro ao atualizar slots em sessão inexistente', () => {
      expect(() => {
        memory.updateSlots('inexistente', { nome: 'João' });
      }).toThrow('Session not found');
    });
  });

  describe('updateContext', () => {
    it('deve atualizar contexto da sessão', () => {
      const sessionId = memory.createSession();
      memory.updateContext(sessionId, { currentStep: 2, scenario: 'data-collection' });
      
      const session = memory.getSession(sessionId);
      expect(session?.context.currentStep).toBe(2);
      expect(session?.context.scenario).toBe('data-collection');
    });

    it('deve fazer merge de contexto existente', () => {
      const sessionId = memory.createSession();
      memory.updateContext(sessionId, { currentStep: 2 });
      memory.updateContext(sessionId, { fallbackCount: 1 });
      
      const session = memory.getSession(sessionId);
      expect(session?.context.currentStep).toBe(2);
      expect(session?.context.fallbackCount).toBe(1);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('deve remover sessões expiradas', () => {
      const sessionId = memory.createSession();
      const session = memory.getSession(sessionId);
      
      // Simular sessão expirada (30 minutos atrás)
      if (session) {
        session.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      }
      
      memory.cleanupExpiredSessions(30);
      const expiredSession = memory.getSession(sessionId);
      
      expect(expiredSession).toBeUndefined();
    });

    it('não deve remover sessões ativas', () => {
      const sessionId = memory.createSession();
      memory.cleanupExpiredSessions(30);
      
      const session = memory.getSession(sessionId);
      expect(session).toBeDefined();
    });

    it('deve remover múltiplas sessões expiradas', () => {
      const sessionId1 = memory.createSession();
      const sessionId2 = memory.createSession();
      const sessionId3 = memory.createSession();
      
      const session1 = memory.getSession(sessionId1);
      const session2 = memory.getSession(sessionId2);
      
      if (session1) {
        session1.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      }
      if (session2) {
        session2.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      }
      
      memory.cleanupExpiredSessions(30);
      
      expect(memory.getSession(sessionId1)).toBeUndefined();
      expect(memory.getSession(sessionId2)).toBeUndefined();
      expect(memory.getSession(sessionId3)).toBeDefined();
    });
  });

  describe('clearAll', () => {
    it('deve remover todas as sessões', () => {
      memory.createSession();
      memory.createSession();
      memory.createSession();
      
      memory.clearAll();
      
      expect(memory.getAllSessions()).toHaveLength(0);
    });
  });

  describe('getAllSessions', () => {
    it('deve retornar todas as sessões', () => {
      const sessionId1 = memory.createSession();
      const sessionId2 = memory.createSession();
      
      const sessions = memory.getAllSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.sessionId)).toContain(sessionId1);
      expect(sessions.map(s => s.sessionId)).toContain(sessionId2);
    });

    it('deve retornar array vazio quando não há sessões', () => {
      const sessions = memory.getAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getRecentMessages', () => {
    it('deve retornar mensagens recentes da sessão', () => {
      const sessionId = memory.createSession();
      memory.addMessage(sessionId, 'user', 'Mensagem 1');
      memory.addMessage(sessionId, 'assistant', 'Resposta 1');
      memory.addMessage(sessionId, 'user', 'Mensagem 2');
      
      const messages = memory.getRecentMessages(sessionId, 2);
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Resposta 1');
      expect(messages[1].content).toBe('Mensagem 2');
    });

    it('deve retornar todas as mensagens se count for maior que total', () => {
      const sessionId = memory.createSession();
      memory.addMessage(sessionId, 'user', 'Mensagem 1');
      memory.addMessage(sessionId, 'assistant', 'Resposta 1');
      
      const messages = memory.getRecentMessages(sessionId, 10);
      
      expect(messages).toHaveLength(2);
    });

    it('deve retornar array vazio para sessão sem mensagens', () => {
      const sessionId = memory.createSession();
      const messages = memory.getRecentMessages(sessionId, 10);
      
      expect(messages).toEqual([]);
    });
  });
});


