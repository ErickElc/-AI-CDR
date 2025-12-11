/**
 * Configuração global para testes
 */

// Configurar variáveis de ambiente para testes
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
process.env.PORT = process.env.PORT || '3000';
process.env.SESSION_TIMEOUT_MINUTES = process.env.SESSION_TIMEOUT_MINUTES || '30';

// Timeout padrão para testes
jest.setTimeout(30000);

// Arquivo de setup - não contém testes
export {};

