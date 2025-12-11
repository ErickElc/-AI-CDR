import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Container,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { ChatContainer } from '../Chat/ChatContainer';
import { AgendaContainer } from '../Agenda/AgendaContainer';

export const MainLayout: React.FC = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <AppBar
                position="static"
                elevation={1}
                sx={{
                    bgcolor: 'white',
                    borderBottom: '2px solid #E5E7EB',
                }}
            >
                <Toolbar sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <LocalHospitalIcon sx={{ color: 'primary.main', fontSize: 36 }} />
                        <Box>
                            <Typography
                                variant="h5"
                                component="div"
                                sx={{ color: 'primary.main', fontWeight: 800, lineHeight: 1.2 }}
                            >
                                Clínica
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', lineHeight: 1, fontWeight: 500 }}
                            >
                                Integração Saúde
                            </Typography>
                        </Box>
                    </Box>

                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ mt: 5, mb: 4 }}>
                {/* Page Title */}
                <Typography
                    variant="h3"
                    align="center"
                    sx={{
                        mb: 5,
                        background: 'linear-gradient(135deg, #2E7D7D 0%, #1F3A52 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 800,
                        letterSpacing: '-0.5px',
                    }}
                >
                    Agendamento Digital Inteligente
                </Typography>

                {/* Chat and Calendar Side by Side */}
                <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                    {/* Chat - Left Side (50%) */}
                    <Box sx={{ flex: 1 }}>
                        <ChatContainer />
                    </Box>

                    {/* Agenda - Right Side (50%) */}
                    <Box sx={{ flex: 1 }}>
                        <AgendaContainer />
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};
