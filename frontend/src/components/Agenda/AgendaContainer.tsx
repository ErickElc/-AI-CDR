import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Select, MenuItem, FormControl, InputLabel, IconButton, CircularProgress, Alert, Pagination } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { agendaService } from '../../services/agendaService';
import type { Appointment } from '../../types';

export const AgendaContainer: React.FC = () => {
    const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [selectedUnidade, setSelectedUnidade] = useState<string>('');
    const [selectedProcedimento, setSelectedProcedimento] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Carrossel
    const [carouselStartIndex, setCarouselStartIndex] = useState(0);
    const daysToShow = 5; // Quantos dias mostrar no carrossel
    const totalDays = 30; // Total de 30 dias

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Mostrar 5 agendamentos por página

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

    // Gerar próximos 30 dias
    const next30Days = Array.from({ length: totalDays }, (_, i) => addDays(new Date(), i));

    // Dias visíveis no carrossel
    const visibleDays = next30Days.slice(carouselStartIndex, carouselStartIndex + daysToShow);

    // Obter unidades e procedimentos únicos dos dados
    const unidades = Array.from(new Set(agendamentos.map(a => a.unidade))).sort();
    const procedimentos = Array.from(new Set(agendamentos.map(a => a.procedimento))).sort();

    // Filtrar agendamentos
    const agendamentosFiltrados = agendamentos
        .filter(a => {
            const matchDate = isSameDay(new Date(a.dataHora), selectedDate);
            const matchUnidade = !selectedUnidade || a.unidade === selectedUnidade;
            const matchProcedimento = !selectedProcedimento || a.procedimento === selectedProcedimento;
            return matchDate && matchUnidade && matchProcedimento;
        })
        .sort((a, b) => {
            const timeA = new Date(a.dataHora).getTime();
            const timeB = new Date(b.dataHora).getTime();
            return timeA - timeB;
        });

    // Calcular paginação
    const totalPages = Math.ceil(agendamentosFiltrados.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const agendamentosPaginados = agendamentosFiltrados.slice(startIndex, endIndex);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate, selectedUnidade, selectedProcedimento]);

    const handlePrevious = () => {
        if (carouselStartIndex > 0) {
            setCarouselStartIndex(prev => Math.max(0, prev - 1));
        }
    };

    const handleNext = () => {
        if (carouselStartIndex < totalDays - daysToShow) {
            setCarouselStartIndex(prev => Math.min(totalDays - daysToShow, prev + 1));
        }
    };

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
        <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2 }}>
                    <Typography variant="h6">📅</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Agenda em Tempo Real
                </Typography>
            </Box>

            {/* Filtros */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl fullWidth>
                    <InputLabel>Unidade</InputLabel>
                    <Select
                        value={selectedUnidade}
                        label="Unidade"
                        onChange={(e) => setSelectedUnidade(e.target.value)}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {unidades.map(unidade => (
                            <MenuItem key={unidade} value={unidade}>{unidade}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth>
                    <InputLabel>Especialidade</InputLabel>
                    <Select
                        value={selectedProcedimento}
                        label="Especialidade"
                        onChange={(e) => setSelectedProcedimento(e.target.value)}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {procedimentos.map(proc => (
                            <MenuItem key={proc} value={proc}>{proc}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Carrossel de Dias */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Esta Semana
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <IconButton
                    onClick={handlePrevious}
                    disabled={carouselStartIndex === 0}
                    sx={{ mr: 1 }}
                >
                    <NavigateBeforeIcon />
                </IconButton>

                <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
                    {visibleDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const count = agendamentos.filter(a =>
                            isSameDay(new Date(a.dataHora), day) &&
                            (!selectedUnidade || a.unidade === selectedUnidade) &&
                            (!selectedProcedimento || a.procedimento === selectedProcedimento)
                        ).length;

                        return (
                            <Card
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                sx={{
                                    flex: 1,
                                    minWidth: 100,
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid' : '1px solid',
                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                    bgcolor: isSelected ? 'primary.light' : 'background.paper',
                                    textAlign: 'center',
                                    p: 2,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 3,
                                    }
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        textTransform: 'uppercase',
                                        color: isSelected ? 'primary.dark' : 'text.secondary',
                                        fontWeight: 600,
                                        display: 'block'
                                    }}
                                >
                                    {format(day, 'EEEEEE', { locale: ptBR })}
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        color: isSelected ? 'primary.main' : 'text.primary'
                                    }}
                                >
                                    {format(day, 'dd', { locale: ptBR })}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: '0.7rem' }}
                                >
                                    {count} agend.
                                </Typography>
                            </Card>
                        );
                    })}
                </Box>

                <IconButton
                    onClick={handleNext}
                    disabled={carouselStartIndex >= totalDays - daysToShow}
                    sx={{ ml: 1 }}
                >
                    <NavigateNextIcon />
                </IconButton>
            </Box>

            {/* Grade de Horários */}
            <Typography variant="h6" sx={{ mb: 2 }}>
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </Typography>

            {agendamentosFiltrados.length === 0 ? (
                <Alert severity="info">Nenhum agendamento para este dia com os filtros selecionados</Alert>
            ) : (
                <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                        {agendamentosPaginados.map((agendamento) => (
                            <Card
                                key={agendamento.id}
                                sx={{
                                    p: 1.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        borderColor: 'primary.main'
                                    }
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    color="primary"
                                    sx={{
                                        fontWeight: 700,
                                        minWidth: 60
                                    }}
                                >
                                    {(() => {
                                        const date = new Date(agendamento.dataHora);
                                        const hours = String(date.getUTCHours()).padStart(2, '0');
                                        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                        return `${hours}:${minutes}`;
                                    })()}
                                </Typography>

                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {agendamento.nomePaciente}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {agendamento.procedimento}
                                    </Typography>
                                </Box>

                                <Typography
                                    variant="caption"
                                    color="primary"
                                    sx={{ fontWeight: 500 }}
                                >
                                    📍 {agendamento.unidade}
                                </Typography>
                            </Card>
                        ))}
                    </Box>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Pagination
                                count={totalPages}
                                page={currentPage}
                                onChange={(_, page) => setCurrentPage(page)}
                                color="primary"
                                size="large"
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    )}
                </>
            )}
        </Card>
    );
};
