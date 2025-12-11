/**
 * Configuração centralizada de variáveis de ambiente
 * Todas as variáveis devem estar no .env
 */

import dotenv from 'dotenv';

// Carregar .env
dotenv.config();

export interface EnvConfig {
  // OpenAI
  openai: {
    apiKey: string;
    model: string;
    temperature: number;
    embeddingModel: string;
  };

  // Qdrant
  qdrant: {
    url: string;
    apiKey?: string;
    collections: {
      faq: string;
      conversations: string;
      appointments: string;
    };
  };

  // Backend
  backend: {
    url: string;
  };

  // Server
  server: {
    port: number;
    nodeEnv: string;
  };

  // Session
  session: {
    timeoutMinutes: number;
  };

  // Logging
  logging: {
    level: string;
    verbose: boolean;
    debug: boolean;
  };

  // RAG Configuration
  rag: {
    topK: number;
    scoreThreshold: number;
    enablePatientHistory: boolean;
  };

  // Memory Configuration
  memory: {
    bufferSize: number;
    autoArchive: boolean;
    archiveOnComplete: boolean;
  };

  // LangChain Configuration
  langchain: {
    tracing: boolean;
    endpoint?: string;
    apiKey?: string;
    project?: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Variável de ambiente ${key} não encontrada e sem valor padrão`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

function getEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

export const env: EnvConfig = {
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVar('OPENAI_MODEL', 'gpt-4o-mini'),
    temperature: getEnvFloat('OPENAI_TEMPERATURE', 0.7),
    embeddingModel: getEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
  },

  qdrant: {
    url: getEnvVar('QDRANT_URL', 'http://localhost:6333'),
    apiKey: process.env.QDRANT_API_KEY,
    collections: {
      faq: getEnvVar('QDRANT_FAQ_COLLECTION', 'faq_embeddings'),
      conversations: getEnvVar('QDRANT_CONVERSATIONS_COLLECTION', 'conversation_history'),
      appointments: getEnvVar('QDRANT_APPOINTMENTS_COLLECTION', 'appointment_history'),
    },
  },

  backend: {
    url: getEnvVar('BACKEND_URL', 'http://localhost:5000'),
  },

  server: {
    port: getEnvNumber('PORT', 3000),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
  },

  session: {
    timeoutMinutes: getEnvNumber('SESSION_TIMEOUT_MINUTES', 30),
  },

  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    verbose: getEnvBoolean('VERBOSE_LOGGING', false),
    debug: getEnvBoolean('DEBUG_MODE', false),
  },

  rag: {
    topK: getEnvNumber('RAG_TOP_K', 5),
    scoreThreshold: getEnvFloat('RAG_SCORE_THRESHOLD', 0.7),
    enablePatientHistory: getEnvBoolean('RAG_ENABLE_PATIENT_HISTORY', true),
  },

  memory: {
    bufferSize: getEnvNumber('MEMORY_BUFFER_SIZE', 10),
    autoArchive: getEnvBoolean('MEMORY_AUTO_ARCHIVE', true),
    archiveOnComplete: getEnvBoolean('MEMORY_ARCHIVE_ON_COMPLETE', true),
  },

  langchain: {
    tracing: getEnvBoolean('LANGCHAIN_TRACING_V2', false),
    endpoint: process.env.LANGCHAIN_ENDPOINT,
    apiKey: process.env.LANGCHAIN_API_KEY,
    project: process.env.LANGCHAIN_PROJECT,
  },
};

// Validar variáveis obrigatórias
if (!env.openai.apiKey) {
  throw new Error('OPENAI_API_KEY é obrigatória no .env');
}

// Log de configuração (apenas em desenvolvimento)
if (env.server.nodeEnv === 'development' && env.logging.debug) {
  console.log('⚙️ Configuração carregada:');
  console.log({
    openai: {
      model: env.openai.model,
      embeddingModel: env.openai.embeddingModel,
      temperature: env.openai.temperature,
    },
    qdrant: {
      url: env.qdrant.url,
      collections: env.qdrant.collections,
    },
    rag: env.rag,
    memory: env.memory,
  });
}


