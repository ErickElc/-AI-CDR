/**
 * Motor de sugestões inteligentes
 * Encontra alternativas quando algo solicitado não está disponível
 */

interface TimeSlot {
    dataHora: string;
    disponivel: boolean;
}

export class SuggestionEngine {
    /**
     * Encontra os N horários mais próximos do solicitado
     * @param requestedTime Horário solicitado (formato "HH:mm")
     * @param availableSlots Lista de slots disponíveis
     * @param count Quantidade de sugestões a retornar
     */
    findClosestTimeSlots(
        requestedTime: string,
        availableSlots: TimeSlot[],
        count = 3
    ): string[] {
        // Filtrar apenas slots disponíveis
        const available = availableSlots.filter((slot) => slot.disponivel);

        if (available.length === 0) {
            return [];
        }

        // Converter horário solicitado para minutos desde meia-noite
        const requestedMinutes = this.timeToMinutes(requestedTime);

        // Calcular diferença para cada slot e ordenar por proximidade
        const slotsWithDistance = available.map((slot) => {
            // Extrair horário do dataHora (formato ISO: "2025-12-10T14:00:00")
            const slotTime = this.extractTime(slot.dataHora);
            const slotMinutes = this.timeToMinutes(slotTime);

            // Calcular diferença absoluta em minutos
            const distance = Math.abs(slotMinutes - requestedMinutes);

            return {
                time: slotTime,
                distance,
            };
        });

        // Ordenar por distância (mais próximo primeiro)
        slotsWithDistance.sort((a, b) => a.distance - b.distance);

        // Remover duplicatas e retornar top N
        const uniqueTimes = [...new Set(slotsWithDistance.map((s) => s.time))];
        return uniqueTimes.slice(0, count);
    }

    /**
     * Extrai horário de uma string ISO datetime
     * @param isoDateTime String no formato "2025-12-10T14:00:00" ou "2025-12-10T14:00:00Z"
     * @returns Horário no formato "HH:mm"
     */
    private extractTime(isoDateTime: string): string {
        if (!isoDateTime || typeof isoDateTime !== 'string') {
            return '00:00';
        }

        // Dividir por 'T' para separar data e hora
        const parts = isoDateTime.split('T');
        if (parts.length < 2) {
            return '00:00';
        }

        // Pegar apenas HH:mm
        const timePart = parts[1].substring(0, 5);
        return timePart;
    }

    /**
     * Converte horário (HH:mm) para minutos desde meia-noite
     */
    private timeToMinutes(time: string): number {
        if (!time || typeof time !== 'string') {
            return 0;
        }

        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            return 0;
        }

        return hours * 60 + minutes;
    }

    /**
     * Formata minutos de volta para HH:mm
     */
    private minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}
