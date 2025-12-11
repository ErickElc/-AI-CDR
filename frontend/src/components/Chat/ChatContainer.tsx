import React, { useState } from 'react';
import { Box, Paper, Typography, Avatar, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export const ChatContainer: React.FC = () => {
    const { messages, isTyping, sendMessage, startNewConversation } = useChat();
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const handleNewConversationClick = () => {
        // Se não há mensagens, pode iniciar nova conversa diretamente
        if (messages.length === 0) {
            startNewConversation();
            return;
        }
        // Caso contrário, pedir confirmação
        setConfirmDialogOpen(true);
    };

    const handleConfirmNewConversation = () => {
        setConfirmDialogOpen(false);
        startNewConversation();
    };

    const handleCancelNewConversation = () => {
        setConfirmDialogOpen(false);
    };

    return (
        <>
            <Paper
                elevation={3}
                sx={{
                    minHeight: '400px',
                    maxHeight: '700px',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 3,
                        background: 'linear-gradient(135deg, #1F3A52 0%, #2E7D7D 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>
                        <ChatIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Avatar>
                    <div style={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                            Assistente Virtual IA
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                            Online • Responde em segundos
                        </Typography>
                    </div>
                    {/* Botão Nova Conversa */}
                    <Tooltip title="Iniciar Nova Conversa">
                        <IconButton
                            onClick={handleNewConversationClick}
                            sx={{
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.15)',
                                },
                            }}
                        >
                            <RestartAltIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Messages */}
                <MessageList messages={messages} isTyping={isTyping} />

                {/* Input */}
                <MessageInput onSend={sendMessage} disabled={isTyping} />
            </Paper>

            {/* Dialog de Confirmação */}
            <Dialog
                open={confirmDialogOpen}
                onClose={handleCancelNewConversation}
            >
                <DialogTitle>Iniciar Nova Conversa?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja iniciar uma nova conversa? O histórico atual será limpo.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelNewConversation} color="inherit">
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirmNewConversation} color="primary" variant="contained">
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
