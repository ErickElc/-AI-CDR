/**
 * Testes TDD para Memory Management System
 * Fase 3: Short-term + Long-term Memory
 * 
 * METODOLOGIA TDD:
 * 1. ✅ Escrever testes (este arquivo)
 * 2. ❌ Ver testes falharem
 * 3. ✅ Implementar memory system
 * 4. ✅ Ver testes passarem
 */

import { MemoryManager } from '../memory-manager';
import { QdrantClient } from '../../rag/qdrant-client';
import { EmbeddingService } from '../../rag/embedding-service';

// Mock das dependências
jest.mock('../../rag/qdrant-client');
jest.mock('../../rag/embedding-service');

describe('MemoryManager - TDD Fase 3', () => {
    let memoryManager: MemoryManager;
    let mockQdrantClient: jest.Mocked<QdrantClient>;
    let mockEmbeddingService: jest.Mocked<EmbeddingService>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockQdrantClient = {
            upsertConversation: jest.fn(),
            searchConversations: jest.fn(),
            upsertAppointment: jest.fn(),
            searchAppointments: jest.fn(),
        } as any;

        mockEmbeddingService = {
            embedQuery: jest.fn(),
            embedPatientName: jest.fn(),
        } as any;

        memoryManager = new MemoryManager(mockQdrantClient, mockEmbeddingService);
    });

    /**
     * TESTE 1: Short-term Memory (Buffer Window)
     */
    describe('Short-term Memory (BufferWindow)', () => {
        it('deve criar sessão com ID único', () => {
            const sessionId1 = memoryManager.createSession();
            const sessionId2 = memoryManager.createSession();

            expect(sessionId1).toBeDefined();
            expect(sessionId2).toBeDefined();
            expect(sessionId1).not.toBe(sessionId2);
        });

        it('deve armazenar mensagens em buffer window', () => {
            const sessionId = memoryManager.createSession();

            memoryManager.addMessage(sessionId, 'user', 'Olá');
            memoryManager.addMessage(sessionId, 'assistant', 'Oi! Como posso ajudar?');
            memoryManager.addMessage(sessionId, 'user', 'Quero agendar');

            const messages = memoryManager.getMessages(sessionId);

            expect(messages).toHaveLength(3);
            expect(messages[0].content).toBe('Olá');
            expect(messages[2].content).toBe('Quero agendar');
        });

        it('deve manter apenas últimas N mensagens (buffer window)', () => {
            const sessionId = memoryManager.createSession();

            // Adicionar 15 mensagens (limite padrão: 10)
            for (let i = 1; i <= 15; i++) {
                memoryManager.addMessage(sessionId, 'user', `Message ${i}`);
            }

            const messages = memoryManager.getMessages(sessionId);

            expect(messages.length).toBeLessThanOrEqual(10);
            // Deve ter apenas as últimas 10
            expect(messages[0].content).toBe('Message 6');
            expect(messages[9].content).toBe('Message 15');
        });

        it('deve atualizar timestamp de lastActivity', () => {
            const sessionId = memoryManager.createSession();
            const session1 = memoryManager.getSession(sessionId);
            const initialTime = session1!.lastActivity;

            // Aguardar 10ms
            setTimeout(() => {
                memoryManager.addMessage(sessionId, 'user', 'Test');
                const session2 = memoryManager.getSession(sessionId);

                expect(session2!.lastActivity.getTime()).toBeGreaterThan(initialTime.getTime());
            }, 10);
        });

        it('deve permitir configurar buffer size customizado', () => {
            const customMemory = new MemoryManager(
                mockQdrantClient,
                mockEmbeddingService,
                { bufferSize: 5 }
            );

            const sessionId = customMemory.createSession();

            // Adicionar 10 mensagens
            for (let i = 1; i <= 10; i++) {
                customMemory.addMessage(sessionId, 'user', `Msg ${i}`);
            }

            const messages = customMemory.getMessages(sessionId);

            expect(messages).toHaveLength(5);
            expect(messages[0].content).toBe('Msg 6');
        });
    });

    /**
     * TESTE 2: Slots Management
     */
    describe('Slots Management', () => {
        it('deve atualizar slots incrementalmente (merge)', () => {
            const sessionId = memoryManager.createSession();

            memoryManager.updateSlots(sessionId, { nome: 'João' });
            memoryManager.updateSlots(sessionId, { procedimento: 'Dermatologia' });
            memoryManager.updateSlots(sessionId, { unidade: 'Centro' });

            const session = memoryManager.getSession(sessionId);

            expect(session!.slots).toEqual({
                nome: 'João',
                procedimento: 'Dermatologia',
                unidade: 'Centro',
            });
        });

        it('deve sobrescrever slots duplicados', () => {
            const sessionId = memoryManager.createSession();

            memoryManager.updateSlots(sessionId, { nome: 'João' });
            memoryManager.updateSlots(sessionId, { nome: 'João Silva' });

            const session = memoryManager.getSession(sessionId);

            expect(session!.slots.nome).toBe('João Silva');
        });

        it('deve retornar slots completos', () => {
            const sessionId = memoryManager.createSession();

            memoryManager.updateSlots(sessionId, {
                nome: 'Maria',
                procedimento: 'Limpeza de pele',
                unidade: 'Zona Sul',
                data: '2024-12-15',
                horario: '14:00',
            });

            const isComplete = memoryManager.areSlotsComplete(sessionId);

            expect(isComplete).toBe(true);
        });

        it('deve retornar false se slots incompletos', () => {
            const sessionId = memoryManager.createSession();

            memoryManager.updateSlots(sessionId, {
                nome: 'Maria',
                procedimento: 'Limpeza de pele',
                // Faltando unidade, data, horario
            });

            const isComplete = memoryManager.areSlotsComplete(sessionId);

            expect(isComplete).toBe(false);
        });
    });

    /**
     * TESTE 3: Long-term Memory - Conversation Archival
     */
    describe('Long-term Memory - Conversations', () => {
        it('deve arquivar conversa completa no Qdrant', async () => {
            const sessionId = memoryManager.createSession();
            const mockVector = new Array(1536).fill(0.1);

            mockEmbeddingService.embedQuery.mockResolvedValue(mockVector);
            mockQdrantClient.upsertConversation.mockResolvedValue(undefined);

            memoryManager.addMessage(sessionId, 'user', 'Olá');
            memoryManager.addMessage(sessionId, 'assistant', 'Oi!');
            memoryManager.updateSlots(sessionId, { nome: 'João' });

            await memoryManager.archiveConversation(sessionId, 'completed');

            expect(mockEmbeddingService.embedQuery).toHaveBeenCalled();
            expect(mockQdrantClient.upsertConversation).toHaveBeenCalled();

            const conversationPoint = mockQdrantClient.upsertConversation.mock.calls[0][0];
            expect(conversationPoint.payload.sessionId).toBe(sessionId);
            expect(conversationPoint.payload.outcome).toBe('completed');
            expect(conversationPoint.payload.messages).toHaveLength(2);
        });

        it('deve incluir metadata na conversa arquivada', async () => {
            const sessionId = memoryManager.createSession();
            const mockVector = new Array(1536).fill(0.1);

            mockEmbeddingService.embedQuery.mockResolvedValue(mockVector);
            mockQdrantClient.upsertConversation.mockResolvedValue(undefined);

            memoryManager.addMessage(sessionId, 'user', 'Test');
            await memoryManager.archiveConversation(sessionId, 'completed', {
                sentiment: 'positive',
                duration: 120,
            });

            const conversationPoint = mockQdrantClient.upsertConversation.mock.calls[0][0];

            expect(conversationPoint.payload.sentiment).toBe('positive');
            expect(conversationPoint.payload.duration).toBe(120);
            expect(conversationPoint.payload.timestamp).toBeDefined();
        });

        it('deve buscar conversas similares para contexto', async () => {
            const mockVector = new Array(1536).fill(0.1);
            const mockResults = [
                {
                    id: 'conv-1',
                    score: 0.88,
                    payload: {
                        slots: { procedimento: 'Dermatologia' },
                        outcome: 'completed',
                    },
                },
            ];

            mockEmbeddingService.embedQuery.mockResolvedValue(mockVector);
            mockQdrantClient.searchConversations.mockResolvedValue(mockResults);

            const similar = await memoryManager.findSimilarConversations('Quero dermatologia', 3);

            expect(mockEmbeddingService.embedQuery).toHaveBeenCalledWith('Quero dermatologia');
            expect(mockQdrantClient.searchConversations).toHaveBeenCalledWith(
                mockVector,
                3,
                expect.any(Number)
            );
            expect(similar).toHaveLength(1);
            expect(similar[0].payload.outcome).toBe('completed');
        });

        it('deve auto-arquivar quando sessão completa', async () => {
            const memoryWithAutoArchive = new MemoryManager(
                mockQdrantClient,
                mockEmbeddingService,
                { autoArchive: true }
            );

            const sessionId = memoryWithAutoArchive.createSession();
            const mockVector = new Array(1536).fill(0.1);

            mockEmbeddingService.embedQuery.mockResolvedValue(mockVector);
            mockQdrantClient.upsertConversation.mockResolvedValue(undefined);

            memoryWithAutoArchive.addMessage(sessionId, 'user', 'Test');
            memoryWithAutoArchive.updateSlots(sessionId, {
                nome: 'João',
                procedimento: 'Dermatologia',
                unidade: 'Centro',
                data: '2024-12-15',
                horario: '14:00',
            });

            // Marcar como completo deve auto-arquivar
            await memoryWithAutoArchive.markComplete(sessionId);

            expect(mockQdrantClient.upsertConversation).toHaveBeenCalled();
        });
    });

    /**
     * TESTE 4: Long-term Memory - Patient History
     */
    describe('Long-term Memory - Patient History', () => {
        it('deve salvar histórico do paciente', async () => {
            const mockVector = new Array(1536).fill(0.1);

            mockEmbeddingService.embedPatientName.mockResolvedValue(mockVector);
            mockQdrantClient.upsertAppointment.mockResolvedValue(undefined);

            await memoryManager.savePatientHistory({
                patientName: 'João Silva',
                procedure: 'Dermatologia',
                unit: 'Centro',
                dateTime: '2024-12-15T14:00:00Z',
                sessionId: 'session-123',
            });

            expect(mockEmbeddingService.embedPatientName).toHaveBeenCalledWith('João Silva');
            expect(mockQdrantClient.upsertAppointment).toHaveBeenCalled();
        });

        it('deve buscar histórico do paciente por nome', async () => {
            const mockVector = new Array(1536).fill(0.1);
            const mockHistory = [
                {
                    id: 'appt-1',
                    score: 0.95,
                    payload: {
                        patientName: 'João Silva',
                        procedure: 'Dermatologia',
                        dateTime: '2024-01-15T14:00:00Z',
                    },
                },
            ];

            mockEmbeddingService.embedPatientName.mockResolvedValue(mockVector);
            mockQdrantClient.searchAppointments.mockResolvedValue(mockHistory);

            const history = await memoryManager.getPatientHistory('João Silva');

            expect(mockEmbeddingService.embedPatientName).toHaveBeenCalledWith('João Silva');
            expect(history).toHaveLength(1);
            expect(history[0].payload.procedure).toBe('Dermatologia');
        });

        it('deve inferir preferências do histórico', async () => {
            const mockVector = new Array(1536).fill(0.1);
            const mockHistory = [
                {
                    id: 'appt-1',
                    score: 0.95,
                    payload: {
                        procedure: 'Dermatologia',
                        unit: 'Centro',
                        preferences: {
                            preferredUnit: 'Centro',
                            preferredTime: '14:00',
                        },
                    },
                },
                {
                    id: 'appt-2',
                    score: 0.92,
                    payload: {
                        procedure: 'Limpeza de pele',
                        unit: 'Centro',
                        preferences: {
                            preferredUnit: 'Centro',
                            preferredTime: '14:00',
                        },
                    },
                },
            ];

            mockEmbeddingService.embedPatientName.mockResolvedValue(mockVector);
            mockQdrantClient.searchAppointments.mockResolvedValue(mockHistory);

            const preferences = await memoryManager.inferPatientPreferences('João Silva');

            expect(preferences.preferredUnit).toBe('Centro');
            expect(preferences.preferredTime).toBe('14:00');
            expect(preferences.preferredProcedures).toContain('Dermatologia');
        });
    });

    /**
     * TESTE 5: Session Lifecycle
     */
    describe('Session Lifecycle', () => {
        it('deve limpar sessões expiradas', () => {
            const session1 = memoryManager.createSession();
            const session2 = memoryManager.createSession();

            // Modificar manualmente lastActivity para simular expiração
            const oldSession = memoryManager.getSession(session1)!;
            oldSession.lastActivity = new Date(Date.now() - 31 * 60 * 1000); // 31 min atrás

            memoryManager.cleanupExpiredSessions(30); // timeout de 30min

            expect(memoryManager.getSession(session1)).toBeUndefined();
            expect(memoryManager.getSession(session2)).toBeDefined();
        });

        it('deve retornar estatísticas de sessões', () => {
            memoryManager.createSession();
            memoryManager.createSession();
            const session3 = memoryManager.createSession();

            memoryManager.updateSlots(session3, {
                nome: 'Test',
                procedimento: 'Test',
                unidade: 'Test',
                data: '2024-12-15',
                horario: '14:00',
            });

            const stats = memoryManager.getStats();

            expect(stats.totalSessions).toBe(3);
            expect(stats.activeSessions).toBe(3);
            expect(stats.completeSessions).toBe(1);
        });

        it('deve permitir deletar sessão manualmente', () => {
            const sessionId = memoryManager.createSession();

            expect(memoryManager.getSession(sessionId)).toBeDefined();

            memoryManager.deleteSession(sessionId);

            expect(memoryManager.getSession(sessionId)).toBeUndefined();
        });
    });

    /**
     * TESTE 6: Integration
     */
    describe('Integration Tests', () => {
        it('deve gerenciar ciclo completo: criar → popular → arquivar', async () => {
            const mockVector = new Array(1536).fill(0.1);
            mockEmbeddingService.embedQuery.mockResolvedValue(mockVector);
            mockQdrantClient.upsertConversation.mockResolvedValue(undefined);

            // 1. Criar sessão
            const sessionId = memoryManager.createSession();

            // 2. Popular com mensagens
            memoryManager.addMessage(sessionId, 'user', 'Olá');
            memoryManager.addMessage(sessionId, 'assistant', 'Oi! Como posso ajudar?');
            memoryManager.addMessage(sessionId, 'user', 'Quero agendar dermatologia');

            // 3. Atualizar slots
            memoryManager.updateSlots(sessionId, {
                nome: 'João Silva',
                procedimento: 'Dermatologia',
                unidade: 'Centro',
                data: '2024-12-15',
                horario: '14:00',
            });

            // 4. Arquivar
            await memoryManager.archiveConversation(sessionId, 'completed');

            // Verificar que foi arquivado
            expect(mockQdrantClient.upsertConversation).toHaveBeenCalledTimes(1);
            const archived = mockQdrantClient.upsertConversation.mock.calls[0][0];
            expect((archived.payload as any).slots.nome).toBe('João Silva');
        });
    });
});
