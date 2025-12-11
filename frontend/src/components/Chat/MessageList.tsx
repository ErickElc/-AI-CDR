import React, { useRef, useEffect } from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import type { Message } from '../../types';
import { format } from 'date-fns';

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                mb: 2,
            }}
        >
            {!isUser && (
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 1, width: 32, height: 32 }}>
                    <SmartToyIcon fontSize="small" />
                </Avatar>
            )}

            <Paper
                elevation={0}
                sx={{
                    maxWidth: '70%',
                    p: 1.5,
                    bgcolor: isUser ? 'primary.main' : 'secondary.main',
                    color: 'white',
                    borderRadius: 2,
                }}
            >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'inherit' }}>
                    {message.content}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: '11px',
                    }}
                >
                    {format(new Date(message.timestamp), 'HH:mm')}
                </Typography>
            </Paper>

            {isUser && (
                <Avatar sx={{ bgcolor: 'primary.main', ml: 1, width: 32, height: 32 }}>
                    <PersonIcon fontSize="small" />
                </Avatar>
            )}
        </Box>
    );
};

interface MessageListProps {
    messages: Message[];
    isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef(messages.length);
    const isUserScrollingRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check if there's a new message
        const hasNewMessage = messages.length > prevMessagesLengthRef.current;

        // Only auto-scroll if:
        // 1. There's a new message AND
        // 2. User was already at/near the bottom (not scrolling through history)
        if (hasNewMessage) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

            if (isNearBottom || !isUserScrollingRef.current) {
                // Use setTimeout to ensure DOM is updated
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    // Track user scrolling
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let scrollTimeout: number;

        const handleScroll = () => {
            isUserScrollingRef.current = true;
            clearTimeout(scrollTimeout);

            // Reset after user stops scrolling
            scrollTimeout = setTimeout(() => {
                isUserScrollingRef.current = false;
            }, 1000) as unknown as number;
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
        };
    }, []);

    return (
        <Box
            ref={containerRef}
            sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: 'background.paper',
            }}
        >
            {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
            ))}

            {isTyping && (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Digitando...
                    </Typography>
                </Box>
            )}

            <div ref={messagesEndRef} />
        </Box>
    );
};
