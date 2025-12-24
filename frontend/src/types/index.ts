// Chat types

/**
 * Representa uma mensagem individual no chat
 */
export interface Message {
    /** ID único da mensagem */
    id: string;
    /** Papel do autor: usuário ou assistente */
    role: 'user' | 'assistant';
    /** Conteúdo textual da mensagem */
    content: string;
    /** Data e hora de criação da mensagem */
    timestamp: Date;
}

/**
 * Requisição enviada para o chat
 */
export interface ChatRequest {
    /** ID da sessão de conversa */
    sessionId: string;
    /** Mensagem do usuário */
    message: string;
}

/**
 * Resposta recebida do chat
 */
export interface ChatResponse {
    /** Resposta do assistente */
    response: string;
    /** Slots extraídos da conversa */
    slots?: {
        nome?: string;
        procedimento?: string;
        unidade?: string;
        data?: string;
        horario?: string;
    };
    /** Chamadas de função executadas */
    functionCalls?: FunctionCall[];
}

/**
 * Representa uma chamada de função executada pelo agente
 */
export interface FunctionCall {
    /** Nome da função */
    functionName: string;
    /** Parâmetros da função */
    parameters: Record<string, unknown>;
}

// Agenda types

/**
 * Representa um slot de horário disponível
 */
export interface TimeSlot {
    /** Data do slot */
    date: string;
    /** Horário do slot */
    time: string;
    /** Se o slot está disponível */
    available: boolean;
    /** Se o slot está selecionado */
    selected?: boolean;
}

/**
 * Requisição para consultar disponibilidade
 */
export interface AvailabilityRequest {
    /** Unidade desejada */
    unidade: string;
    /** Procedimento desejado */
    procedimento: string;
    /** Data desejada */
    data: string;
}

/**
 * Resposta com horários disponíveis
 */
export interface AvailabilityResponse {
    /** Lista de horários disponíveis */
    horariosDisponiveis: string[];
}

/**
 * Representa uma unidade de atendimento
 */
export interface Unit {
    /** ID único da unidade */
    id: string;
    /** Nome da unidade */
    nome: string;
}

/**
 * Representa um procedimento médico
 */
export interface Procedure {
    /** ID único do procedimento */
    id: string;
    /** Nome do procedimento */
    nome: string;
}

/**
 * Representa um agendamento/appointment
 */
export interface Appointment {
    /** ID único do agendamento */
    id: string;
    /** Nome do paciente */
    nomePaciente: string;
    /** Procedimento agendado */
    procedimento: string;
    /** Unidade do agendamento */
    unidade: string;
    /** Data e hora do agendamento (ISO string) */
    dataHora: string;
    /** Status do agendamento */
    status?: string;
}
