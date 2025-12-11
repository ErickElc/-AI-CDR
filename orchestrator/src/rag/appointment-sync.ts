/**
 * Sincronização de agendamentos com Qdrant
 * CRÍTICO: Após criar agendamento no backend, adicionar embedding no Qdrant
 */

import { QdrantClient } from './qdrant-client';
import { EmbeddingService } from './embedding-service';
import { v4 as uuidv4 } from 'uuid';

export interface AppointmentData {
  id?: string;
  nomePaciente: string;
  procedimento: string;
  unidade: string;
  dataHora: Date | string;
  sessionId?: string;
}

export class AppointmentSync {
  private qdrantClient: QdrantClient;
  private embeddingService: EmbeddingService;

  constructor(qdrantClient: QdrantClient, embeddingService: EmbeddingService) {
    this.qdrantClient = qdrantClient;
    this.embeddingService = embeddingService;
  }

  /**
   * Sincroniza um agendamento criado no backend com Qdrant
   * CRÍTICO: Permite busca por nome do paciente
   */
  async syncAppointment(appointment: AppointmentData): Promise<void> {
    try {
      // Criar texto para embedding (nome do paciente é o mais importante)
      const text = `${appointment.nomePaciente} ${appointment.procedimento} ${appointment.unidade}`;

      // Gerar embedding
      const embedding = await this.embeddingService.embedQuery(text);

      if (!embedding) {
        throw new Error('Failed to generate embedding for appointment');
      }

      // Criar ponto no Qdrant
      const point = {
        id: appointment.id || uuidv4(),
        vector: embedding,
        payload: {
          nomePaciente: appointment.nomePaciente,
          procedimento: appointment.procedimento,
          unidade: appointment.unidade,
          dataHora: appointment.dataHora instanceof Date
            ? appointment.dataHora.toISOString()
            : appointment.dataHora,
          sessionId: appointment.sessionId,
          timestamp: new Date().toISOString(),
        },
      };

      // Inserir no Qdrant
      await this.qdrantClient.upsertAppointment(point);

      console.log(`✅ Agendamento sincronizado com Qdrant: ${appointment.nomePaciente}`);
    } catch (error) {
      console.error('Erro ao sincronizar agendamento com Qdrant:', error);
      throw error;
    }
  }

  /**
   * Remove agendamento do Qdrant (quando cancelado)
   */
  async removeAppointment(appointmentId: string): Promise<void> {
    try {
      await this.qdrantClient.deleteAppointment(appointmentId);
      console.log(`✅ Agendamento removido do Qdrant: ${appointmentId}`);
    } catch (error) {
      console.error('Erro ao remover agendamento do Qdrant:', error);
      throw error;
    }
  }
}


