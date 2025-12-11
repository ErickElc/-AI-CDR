/**
 * Tipos e interfaces compartilhadas do orquestrador
 */

export interface SessionMemory {
  sessionId: string;
  messages: Message[];
  slots: Slots;
  context: SessionContext;
  createdAt: Date;
  lastActivity: Date;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Slots {
  nome?: string;
  procedimento?: string;
  procedimentoValidado?: boolean; // Flag: foi validado via listar_procedimentos
  unidade?: string;
  unidadeValidada?: boolean; // Flag: foi validado via listar_unidades
  data?: string;
  dataValidada?: boolean; // Flag: foi validado via consultar_disponibilidade
  horario?: string;
  email?: string;
}

export interface SessionContext {
  currentStep: number; // 1-5 (etapas do fluxo)
  lastFunctionCall?: string;
  fallbackCount: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  scenario?: ScenarioType;
}

export type ScenarioType =
  | 'greeting'
  | 'data-collection'
  | 'confirmation'
  | 'scheduling'
  | 'faq'
  | 'error-handling'
  | 'initial-message';

export interface ExtractedSlots {
  nome?: string;
  procedimento?: string;
  unidade?: string;
  horario?: string;
  data?: string;
  email?: string;
  confidence: number;
  ragContext?: RAGContext;
  suggestions?: SlotSuggestions;
}

export interface RAGContext {
  faqResults?: FAQResult[];
  appointmentHistory?: AppointmentHistory[];
  similarConversations?: ConversationResult[];
}

export interface FAQResult {
  question: string;
  answer: string;
  score: number;
}

export interface AppointmentHistory {
  nomePaciente: string;
  procedimento: string;
  unidade: string;
  dataHora: Date;
  preferences?: {
    preferredUnits?: string[];
    preferredTimes?: string[];
    frequentProcedures?: string[];
  };
}

export interface ConversationResult {
  sessionId: string;
  message: string;
  slots: Slots;
  outcome: string;
  score: number;
}

export interface SlotSuggestions {
  procedimentos?: string[];
  unidades?: string[];
  horarios?: string[];
  datas?: string[];
}

export interface FunctionCall {
  functionName: string;
  parameters: Record<string, unknown>;
}

export interface FunctionCallResult {
  success: boolean;
  data?: unknown;
  errorMessage?: string;
}

export interface OrchestratorRequest {
  sessionId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface OrchestratorResponse {
  response: string;
  slots?: Slots;
  functionCalls?: FunctionCall[];
  needsHuman?: boolean;
  scenario?: ScenarioType;
  sessionCompleted?: boolean; // Indica que a sessão foi completada (ex: agendamento criado)
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantCollection {
  name: string;
  vectors: {
    size: number;
    distance: string;
  };
}


