/**
 * ResponseParserService
 * 
 * Responsabilidade: Parsear respostas do LLM para extrair slots mencionados
 * Princípio SOLID: Single Responsibility - apenas parsing de respostas
 */

import { Slots } from '../types';

export class ResponseParserService {
    /**
     * Parseia resposta do LLM para extrair slots mencionados
     * Fix para bug onde LLM mostra dados na confirmação sem salvá-los como slots
     */
    parseResponseForSlots(responseText: string): Partial<Slots> {
        const slots: Partial<Slots> = {};

        // Extrair data (vários formatos)
        // "Data: 10 de dezembro de 2025", "Data:** 10/12/2025", etc.
        const datePatterns = [
            /Data[:\s*]+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
            /Data[:\s*]+(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /Data[:\s*]+(\d{4})-(\d{2})-(\d{2})/,
        ];

        for (const pattern of datePatterns) {
            const match = responseText.match(pattern);
            if (match) {
                if (pattern === datePatterns[0]) {
                    // "10 de dezembro de 2025"
                    const day = match[1].padStart(2, '0');
                    const monthNames: Record<string, string> = {
                        janeiro: '01', fevereiro: '02', março: '03', abril: '04',
                        maio: '05', junho: '06', julho: '07', agosto: '08',
                        setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
                    };
                    const month = monthNames[match[2].toLowerCase()];
                    const year = match[3];
                    if (month) {
                        slots.data = `${year}-${month}-${day}`;
                        break;
                    }
                } else if (pattern === datePatterns[1]) {
                    // "10/12/2025"
                    const day = match[1].padStart(2, '0');
                    const month = match[2].padStart(2, '0');
                    const year = match[3];
                    slots.data = `${year}-${month}-${day}`;
                    break;
                } else {
                    // "2025-12-10"
                    slots.data = match[0].split(/Data[:\s*]+/)[1];
                    break;
                }
            }
        }

        // Extrair horário
        // "Horário: 10:30", "Horário:** 14:00", etc.
        const timeMatch = responseText.match(/Hor[aá]rio[:\s*]+(\d{1,2}:\d{2})/i);
        if (timeMatch) {
            slots.horario = timeMatch[1];
        }

        return slots;
    }

    /**
     * Extrai nome de paciente da resposta
     */
    extractNameFromResponse(responseText: string): string | undefined {
        const nameMatch = responseText.match(/(?:Nome|Paciente)[:\s*]+([A-Za-zÀ-ÿ\s]+)/i);
        return nameMatch ? nameMatch[1].trim() : undefined;
    }

    /**
     * Extrai procedimento da resposta
     */
    extractProcedureFromResponse(responseText: string): string | undefined {
        const procMatch = responseText.match(/(?:Procedimento|Consulta)[:\s*]+([A-Za-zÀ-ÿ\s]+)/i);
        return procMatch ? procMatch[1].trim() : undefined;
    }
}
