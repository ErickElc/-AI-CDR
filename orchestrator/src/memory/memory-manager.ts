/**
 * Memory Manager - Sistema unificado de memória
 * Fase 3 TDD: Short-term (BufferWindow) + Long-term (Qdrant)
 * 
 * Features:
 * - Short-term: Buffer window memory (últimas N mensagens)
 * - Slots management com merge automático  
 * - Long-term: Arquivamento de conversas no Qdrant
 * - Patient history: Busca por nome com preferências
 * - Auto-archival quando sessão completa
 * - Session lifecycle management
 */

import { v4 as uuidv4 } from 'uuid';
import { QdrantClient } from '../rag/qdrant-client';
import { EmbeddingService } from '../rag/embedding-service';
import { SessionMemory, Slots, Message, SessionContext } from '../types';

export interface MemoryConfig {
    bufferSize?: number;
    autoArchive?: boolean;
    sessionTimeoutMinutes?: number;
}

export interface PatientHistoryEntry {
    patientName: string;
    procedure: string;
    unit: string;
    dateTime: string;
    sessionId: string;
    preferences?: PatientPreferences;
}

export interface PatientPreferences {
    preferredUnit?: string;
    preferredTime?: string;
    preferredProcedures?: string[];
}

export interface MemoryStats {
    totalSessions: number;
    activeSessions: number;
    completeSessions: number;
}

export class MemoryManager {
    private sessions: Map<string, SessionMemory> = new Map();
    private config: Required<MemoryConfig>;

    constructor(
        private qdrantClient: QdrantClient,
        private embeddingService: EmbeddingService,
        config: MemoryConfig = {}
    ) {
        this.config = {
            bufferSize: config.bufferSize || 10,
            autoArchive: config.autoArchive || false,
            sessionTimeoutMinutes: config.sessionTimeoutMinutes || 30,
        };
    }

    // ==========================================
    // Short-term Memory (BufferWindow)
    // ==========================================

    /**
     * Cria nova sessão
     */
    createSession(): string {
        const sessionId = uuidv4();
        const now = new Date();

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
        return sessionId;
    }

    /**
     * Obtém sessão
     */
    getSession(sessionId: string): SessionMemory | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Adiciona mensagem (mantém apenas buffer window)
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

        // Manter apenas últimas N mensagens (buffer window)
        if (session.messages.length > this.config.bufferSize) {
            session.messages = session.messages.slice(-this.config.bufferSize);
        }

        session.lastActivity = new Date();
    }

    /**
     * Obtém mensagens da sessão
     */
    getMessages(sessionId: string): Message[] {
        const session = this.sessions.get(sessionId);
        return session?.messages || [];
    }

    /**
     * Atualiza slots (merge)
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

        // Auto-archive se configurado e slots completos
        if (this.config.autoArchive && this.areSlotsComplete(sessionId)) {
            // Não arquivar imediatamente, esperar markComplete()
        }
    }

    /**
     * Verifica se slots estão completos
     */
    areSlotsComplete(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const slots = session.slots;
        return !!(
            slots.nome &&
            slots.procedimento &&
            slots.unidade &&
            slots.data &&
            slots.horario
        );
    }

    /**
     * Marca sessão como completa e auto-arquiva se configurado
     */
    async markComplete(sessionId: string): Promise<void> {
        if (this.config.autoArchive) {
            await this.archiveConversation(sessionId, 'completed');
        }
    }

    // ==========================================
    // Long-term Memory - Conversations
    // ==========================================

    /**
     * Arquiva conversa no Qdrant
     */
    async archiveConversation(
        sessionId: string,
        outcome: 'completed' | 'fallback' | 'abandoned',
        metadata?: { sentiment?: string; duration?: number }
    ): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Gerar embedding da conversa (summary)
        const conversationText = session.messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');

        const embedding = await this.embeddingService.embedQuery(conversationText);

        if (!embedding) {
            throw new Error('Failed to generate conversation embedding');
        }

        // Criar point
        await this.qdrantClient.upsertConversation({
            id: sessionId,
            vector: embedding,
            payload: {
                sessionId,
                messages: session.messages,
                slots: session.slots,
                outcome,
                sentiment: metadata?.sentiment || 'neutral',
                duration: metadata?.duration || 0,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Busca conversas similares (RAG)
     */
    async findSimilarConversations(
        query: string,
        limit: number = 5
    ): Promise<any[]> {
        const queryEmbedding = await this.embeddingService.embedQuery(query);

        if (!queryEmbedding) {
            return [];
        }

        return await this.qdrantClient.searchConversations(queryEmbedding, limit, 0.7);
    }

    // ==========================================
    // Long-term Memory - Patient History
    // ==========================================

    /**
     * Salva histórico do paciente
     */
    async savePatientHistory(entry: PatientHistoryEntry): Promise<void> {
        const nameEmbedding = await this.embeddingService.embedPatientName(entry.patientName);

        await this.qdrantClient.upsertAppointment({
            id: `appt-${entry.sessionId}`,
            vector: nameEmbedding,
            payload: {
                patientName: entry.patientName,
                procedure: entry.procedure,
                unit: entry.unit,
                dateTime: entry.dateTime,
                sessionId: entry.sessionId,
                preferences: entry.preferences || {},
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Busca histórico do paciente por nome
     */
    async getPatientHistory(patientName: string): Promise<any[]> {
        const nameEmbedding = await this.embeddingService.embedPatientName(patientName);

        return await this.qdrantClient.searchAppointments(nameEmbedding, 10, 0.7);
    }

    /**
     * Infere preferências do paciente baseado no histórico
     */
    async inferPatientPreferences(patientName: string): Promise<PatientPreferences> {
        const history = await this.getPatientHistory(patientName);

        if (history.length === 0) {
            return {};
        }

        // Análise simples: pegar unidade e horário mais frequentes
        const units: string[] = [];
        const times: string[] = [];
        const procedures: string[] = [];

        history.forEach(entry => {
            const payload = entry.payload;
            if (payload.unit) units.push(payload.unit);
            if (payload.preferences?.preferredTime) times.push(payload.preferences.preferredTime);
            if (payload.procedure) procedures.push(payload.procedure);
        });

        const mostFrequent = (arr: string[]) => {
            if (arr.length === 0) return undefined;
            const counts: Record<string, number> = {};
            arr.forEach(item => {
                counts[item] = (counts[item] || 0) + 1;
            });
            return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        };

        return {
            preferredUnit: mostFrequent(units),
            preferredTime: mostFrequent(times),
            preferredProcedures: [...new Set(procedures)],
        };
    }

    // ==========================================
    // Session Lifecycle
    // ==========================================

    /**
     * Limpa sessões expiradas
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
     * Deleta sessão
     */
    deleteSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    /**
     * Estatísticas
     */
    getStats(): MemoryStats {
        const allSessions = Array.from(this.sessions.values());

        return {
            totalSessions: allSessions.length,
            activeSessions: allSessions.length,
            completeSessions: allSessions.filter(s => this.areSessionSlotsComplete(s)).length,
        };
    }

    private areSessionSlotsComplete(session: SessionMemory): boolean {
        const slots = session.slots;
        return !!(
            slots.nome &&
            slots.procedimento &&
            slots.unidade &&
            slots.data &&
            slots.horario
        );
    }
}
