import api from './api';
import type { ChatRequest, ChatResponse } from '../types';

export const chatService = {
    /**
     * Send message to backend chat controller
     */
    sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
        const response = await api.post<ChatResponse>('/chat/message', request);
        return response.data;
    },

    /**
     * Get chat history for a session
     */
    getHistory: async (sessionId: string): Promise<ChatResponse[]> => {
        const response = await api.get<ChatResponse[]>(`/chat/history/${sessionId}`);
        return response.data;
    },
};
