import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agendaService } from '../services/agendaService';
import { format, addDays } from 'date-fns';
import type { TimeSlot, Unit, Procedure } from '../types';

export const useAgenda = () => {
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [selectedProcedure, setSelectedProcedure] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(
        format(new Date(), 'yyyy-MM-dd')
    );

    // Get units
    const { data: units = [] } = useQuery<Unit[]>({
        queryKey: ['units'],
        queryFn: agendaService.getUnits,
    });

    // Get procedures
    const { data: procedures = [] } = useQuery<Procedure[]>({
        queryKey: ['procedures'],
        queryFn: agendaService.getProcedures,
    });

    // Get availability
    const { data: availability, refetch: refetchAvailability } = useQuery({
        queryKey: ['availability', selectedUnit, selectedProcedure, selectedDate],
        queryFn: () =>
            agendaService.checkAvailability({
                unidade: selectedUnit,
                procedimento: selectedProcedure,
                data: selectedDate,
            }),
        enabled: !!selectedUnit && !!selectedProcedure,
    });

    // Generate week dates
    const getWeekDates = () => {
        const today = new Date();
        const week = [];
        for (let i = 0; i < 5; i++) {
            week.push(addDays(today, i));
        }
        return week;
    };

    // Generate time slots
    const generateTimeSlots = (): TimeSlot[] => {
        const slots: TimeSlot[] = [];
        const hours = ['08:30', '10:15', '14:00', '16:00'];
        const weekDates = getWeekDates();

        weekDates.forEach((date) => {
            hours.forEach((time) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isAvailable = availability?.horariosDisponiveis?.includes(
                    `${dateStr}T${time}:00`
                ) ?? false;

                slots.push({
                    date: dateStr,
                    time,
                    available: isAvailable,
                });
            });
        });

        return slots;
    };

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (selectedUnit && selectedProcedure) {
            const interval = setInterval(() => {
                refetchAvailability();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [selectedUnit, selectedProcedure, refetchAvailability]);

    return {
        units,
        procedures,
        selectedUnit,
        selectedProcedure,
        selectedDate,
        setSelectedUnit,
        setSelectedProcedure,
        setSelectedDate,
        timeSlots: generateTimeSlots(),
        availability,
        refetchAvailability,
    };
};
