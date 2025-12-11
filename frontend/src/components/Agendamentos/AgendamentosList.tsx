import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { agendaService } from '../../services/agendaService';
import type { Appointment } from '../../types';

export const AgendamentosList: React.FC = () => {
    const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAgendamentos();
    }, []);

    const loadAgendamentos = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await agendaService.getAppointments();
            setAgendamentos(data);
        } catch (err) {
            setError('Erro ao carregar agendamentos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar agendamentos do dia selecionado
    const agendamentosDoDia = agendamentos
        .filter(a => isSameDay(new Date(a.dataHora), selectedDate))
        .sort((a, b) => {
            // Ordenar por horário, depois por unidade
            const timeA = new Date(a.dataHora).getTime();
            const timeB = new Date(b.dataHora).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.unidade.localeCompare(b.unidade);
        });

    // Obter dias únicos com agendamentos
    const diasComAgendamentos = Array.from(
        new Set(
            agendamentos.map(a => {
                const date = new Date(a.dataHora);
                date.setHours(0, 0, 0, 0);
                return date.toISOString();
            })
        )
    )
        .map(iso => new Date(iso))
        .sort((a, b) => a.getTime() - b.getTime())
        .slice(0, 7); // Próximos 7 dias

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                📅 Agendamentos
            </Typography>

            {/* Seletor de Dias */}
            {diasComAgendamentos.length > 0 ? (
                <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Esta Semana
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                        {diasComAgendamentos.map((dia) => {
                            const isSelected = isSameDay(dia, selectedDate);
                            const count = agendamentos.filter(a =>
                                isSameDay(new Date(a.dataHora), dia)
                            ).length;

                            return (
                                <Card
                                    key={dia.toISOString()}
                                    onClick={() => setSelectedDate(dia)}
                                    sx={{
                                        minWidth: 120,
                                        cursor: 'pointer',
                                        border: isSelected ? '2px solid' : '1px solid',
                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                        bgcolor: isSelected ? 'primary.light' : 'background.paper',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 3,
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                textTransform: 'uppercase',
                                                color: isSelected ? 'primary.dark' : 'text.secondary',
                                                fontWeight: 600
                                            }}
                                        >
                                            {format(dia, 'EEEEEE', { locale: ptBR })}
                                        </Typography>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                color: isSelected ? 'primary.main' : 'text.primary'
                                            }}
                                        >
                                            {format(dia, 'dd', { locale: ptBR })}
                                        </Typography>
                                        <Chip
                                            label={`${count} consultas`}
                                            size="small"
                                            sx={{
                                                mt: 0.5,
                                                fontSize: '0.7rem',
                                                height: 20,
                                                bgcolor: isSelected ? 'primary.main' : 'divider',
                                                color: isSelected ? 'white' : 'text.secondary'
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>

                    {/* Lista de Agendamentos do Dia */}
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </Typography>

                    {agendamentosDoDia.length === 0 ? (
                        <Alert severity="info">Nenhum agendamento neste dia</Alert>
                    ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            {agendamentosDoDia.map((agendamento) => (
                                <Box
                                    key={agendamento.id}
                                    sx={{
                                        width: {
                                            xs: '100%',
                                            sm: 'calc(50% - 8px)',
                                            md: 'calc(33.333% - 11px)',
                                            lg: 'calc(25% - 12px)',
                                        },
                                    }}
                                >
                                    <Card
                                        elevation={2}
                                        sx={{
                                            height: '100%',
                                            transition: 'transform 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 4
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Typography
                                                variant="h6"
                                                color="primary"
                                                sx={{
                                                    fontWeight: 700,
                                                    mb: 0.5,
                                                    fontSize: '1rem'
                                                }}
                                            >
                                                {format(new Date(agendamento.dataHora), 'HH:mm')}
                                            </Typography>

                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    mb: 0.5,
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {agendamento.nomePaciente}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}
                                            >
                                                {agendamento.procedimento}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                color="primary"
                                                sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 500 }}
                                            >
                                                📍 {agendamento.unidade}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Box>
                            ))}
                        </Box>
                    )}
                </>
            ) : (
                <Alert severity="info">Nenhum agendamento encontrado</Alert>
            )}
        </Box>
    );
};
