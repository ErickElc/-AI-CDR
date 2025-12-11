import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeSlot } from '../../types';

interface WeekCalendarProps {
    timeSlots: TimeSlot[];
    onSlotClick: (slot: TimeSlot) => void;
}

export const WeekCalendar: React.FC<WeekCalendarProps> = ({ timeSlots, onSlotClick }) => {
    // Group slots by date
    const slotsByDate = timeSlots.reduce((acc, slot) => {
        if (!acc[slot.date]) {
            acc[slot.date] = [];
        }
        acc[slot.date].push(slot);
        return acc;
    }, {} as Record<string, TimeSlot[]>);

    const dates = Object.keys(slotsByDate).sort();

    return (
        <Box>
            {/* Week Header */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {dates.map((date) => {
                    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
                    const dayName = format(dateObj, 'EEE', { locale: ptBR }).toUpperCase();
                    const dayNum = format(dateObj, 'dd');

                    return (
                        <Box
                            key={date}
                            sx={{
                                flex: 1,
                                textAlign: 'center',
                                py: 1,
                                bgcolor: 'background.default',
                                borderRadius: 1,
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {dayName}
                            </Typography>
                            <Typography variant="h3" sx={{ fontSize: '20px' }}>
                                {dayNum}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* Time Slots Grid */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* For each time */}
                {['08:30', '10:15', '14:00', '16:00'].map((time) => (
                    <Box key={time} sx={{ display: 'flex', gap: 1 }}>
                        {dates.map((date) => {
                            const slot = slotsByDate[date]?.find((s) => s.time === time);

                            return (
                                <Box key={`${date}-${time}`} sx={{ flex: 1 }}>
                                    <Button
                                        fullWidth
                                        variant={slot?.available ? 'contained' : 'outlined'}
                                        disabled={!slot?.available}
                                        onClick={() => slot && onSlotClick(slot)}
                                        sx={{
                                            height: '48px',
                                            bgcolor: slot?.available ? 'primary.main' : 'transparent',
                                            color: slot?.available ? 'white' : 'text.disabled',
                                            borderColor: 'divider',
                                            '&:hover': {
                                                bgcolor: slot?.available ? 'primary.dark' : 'transparent',
                                            },
                                            '&.Mui-disabled': {
                                                bgcolor: 'transparent',
                                                borderColor: 'divider',
                                                color: 'text.disabled',
                                            },
                                        }}
                                    >
                                        {time}
                                    </Button>
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};
