import api from './api';
import type {
    Unit,
    Procedure,
    AvailabilityRequest,
    AvailabilityResponse,
    Appointment,
} from '../types';

export const agendaService = {
    /**
     * Get all available units
     */
    getUnits: async (): Promise<Unit[]> => {
        const response = await api.get<{ success: boolean; data: Unit[]; errorMessage: string | null }>('/functions/unidades');
        return response.data.data || [];
    },

    /**
     * Get all available procedures
     */
    getProcedures: async (): Promise<Procedure[]> => {
        const response = await api.get<{ success: boolean; data: Procedure[]; errorMessage: string | null }>('/functions/procedimentos');
        return response.data.data || [];
    },

    /**
     * Check availability for specific unit, procedure and date
     */
    checkAvailability: async (request: AvailabilityRequest): Promise<AvailabilityResponse> => {
        const response = await api.post<AvailabilityResponse>(
            '/functions/consultar-disponibilidade',
            request
        );
        return response.data;
    },

    /**
     * Get all appointments
     */
    getAppointments: async (): Promise<Appointment[]> => {
        const response = await api.get<Appointment[]>('/agendamentos');
        return response.data || [];
    },

    /**
     * Create new appointment
     */
    createAppointment: async (appointment: Partial<Appointment>): Promise<Appointment> => {
        const response = await api.post<Appointment>('/functions/criar-agendamento', appointment);
        return response.data;
    },
};
