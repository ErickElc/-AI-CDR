import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../services/chatService';
import type { Message } from '../types';

export const useChat = () => {
    // Tornar sessionId mutável para permitir nova conversa
    const [sessionId, setSessionId] = useState(() => {
        // Get or create session ID
        const stored = localStorage.getItem('chatSessionId');
        if (stored) return stored;
        const newId = uuidv4();
        localStorage.setItem('chatSessionId', newId);
        return newId;
    });

    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Função para iniciar nova conversa
    const startNewConversation = useCallback(() => {
        const newId = uuidv4();
        localStorage.setItem('chatSessionId', newId);
        setSessionId(newId);
        setMessages([]);
        console.log('✨ Nova conversa iniciada:', newId);
    }, []);

    const sendMessage = useCallback(
        async (content: string) => {
            // Add user message
            const userMessage: Message = {
                id: uuidv4(),
                role: 'user',
                content,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setIsTyping(true);

            try {
                // Send to backend
                const response = await chatService.sendMessage({
                    sessionId,
                    message: content,
                });

                // Add assistant response
                const assistantMessage: Message = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, assistantMessage]);
            } catch (error) {
                console.error('Error sending message:', error);

                // Add error message
                const errorMessage: Message = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsTyping(false);
            }
        },
        [sessionId]
    );

    return {
        sessionId,
        messages,
        isTyping,
        sendMessage,
        startNewConversation,
    };
};
