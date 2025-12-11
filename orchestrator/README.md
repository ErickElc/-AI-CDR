# AI-CDR Orchestrator - Intelligent AI SDR Agent

> **Prova Técnica - High Agents AI**  
> Sistema de agendamento inteligente com IA usando memória, RAG, function calling e fluxo conversacional

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Decisões Técnicas](#decisões-técnicas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Componentes Principais](#componentes-principais)
- [Fluxo Conversacional](#fluxo-conversacional)
- [Setup e Instalação](#setup-e-instalação)
- [API Endpoints](#api-endpoints)
- [Configuração](#configuração)
- [Testes](#testes)
- [Docker](#docker)
- [Atendimento aos Requisitos](#atendimento-aos-requisitos)

---

## 🎯 Visão Geral

O **AI-CDR Orchestrator** é um agente de IA conversacional que atua como SDR (Sales Development Representative) digital para clínicas médicas. Ele gerencia todo o fluxo de agendamento de consultas e procedimentos através de conversas naturais, integrando:

- **Memória Contextual**: Short-term (sessões) e long-term (Qdrant)
- **RAG (Retrieval-Augmented Generation)**: Base de conhecimento (FAQ) e histórico de agendamentos
- **Function Calling**: Integração com backend (.NET) para validação e criação de agendamentos
- **Slot Filling**: Extração inteligente de informações (nome, procedimento, unidade, data, horário)
- **Fallback Inteligente**: Detecção automática de necessidade de intervenção humana
- **Proatividade**: Sugestão automática de opções sem necessidade de solicitação explícita

### Stack Tecnológico

- **Backend**: .NET 8 + C# (componente separado)
- **Orchestrator**: Node.js + TypeScript + LangChain
- **LLM**: OpenAI GPT-4o
- **Vector DB**: Qdrant
- **Frontend**: React + TypeScript (componente separado)
- **Containerização**: Docker + Docker Compose

---

## 🏗️ Arquitetura

### Diagrama de Alto Nível

```
┌─────────────┐         HTTP          ┌──────────────┐
│  Frontend   │ ─────────────────────▶│   Backend    │
│  (React)    │                        │  (.NET API)  │
└─────────────┘                        └──────┬───────┘
                                              │
                                              │ HTTP
                                              ▼
                                    ┌─────────────────┐
                                    │  Orchestrator   │
                                    │  (Node.js/TS)   │
                                    └────┬────┬───────┘
                                         │    │
                    ┌────────────────────┘    └────────────────┐
                    │                                          │
                    ▼                                          ▼
            ┌───────────────┐                          ┌──────────────┐
            │   OpenAI API  │                          │   Qdrant     │
            │  (GPT-4o)     │                          │  (Vector DB) │
            └───────────────┘                          └──────────────┘
```

### Fluxo de Processamento de Mensagem

```
User Message
      │
      ▼
┌──────────────────────────────────────────────────────────┐
│ 1. SHORT-TERM MEMORY                                     │
│    - Recuperar/criar sessão                              │
│    - Adicionar mensagem ao histórico                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 2. SLOT EXTRACTION (com RAG)                             │
│    - Extrair informações da mensagem (nome, proc., etc.) │
│    - Buscar contexto relevante (FAQ, histórico)          │
│    - Enriquecer slots com preferências do histórico      │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 3. SCENARIO DETECTION                                    │
│    - Detectar cenário atual (greeting, data-collection,  │
│      confirmation, scheduling, faq, error-handling)       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. PROACTIVITY ENGINE                                    │
│    - Determinar funções a serem chamadas automaticamente │
│    - Listar opções sem esperar solicitação do LLM       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 5. LLM CALL (com Function Calling)                       │
│    - Construir prompt contextualizado                    │
│    - Invocar GPT-4o com funções disponíveis              │
│    - Processar function calls do LLM                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 6. FUNCTION EXECUTION                                    │
│    - Executar funções contra backend (.NET)              │
│    - Validar dados (procedimento, unidade, horário)      │
│    - Consultar disponibilidade / Criar agendamento       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 7. RESPONSE GENERATION                                   │
│    - Gerar resposta final com base nos resultados        │
│    - Aplicar prompts anti-alucinação                     │
│    - Retornar resposta + slots para usuário              │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
              Response to User
```

---

## 💡 Decisões Técnicas

### 1. Por que TypeScript + Node.js?

- **Type Safety**: TypeScript fornece type safety crucial para sistemas complexos com múltiplas integrações
- **Ecossistema LangChain**: Melhor suporte e documentação para TypeScript
- **Performance**: Node.js é ideal para I/O intensivo (chamadas de API, vector DB)
- **Produtividade**: Desenvolvimento rápido com excelente tooling

### 2. Arquitetura Baseada em Serviços (SOLID)

Seguimos os princípios SOLID para garantir manutenibilidade e escalabilidade:

- **S**ingle Responsibility Principle: Cada serviço tem uma responsabilidade única
  - `Agent`: Orquestração do fluxo conversacional
  - `SlotExtractor`: Extração de informações
  - `FunctionExecutor`: Execução de funções
  - `ContextRetrieval`: Busca RAG

- **O**pen/Closed Principle: Serviços são abertos para extensão, fechados para modificação
  - Novos cenários/funções podem ser adicionados sem modificar código existente

- **L**iskov Substitution Principle: Abstrações bem definidas
  - Interfaces claras para cada serviço

- **I**nterface Segregation: Interfaces específicas por domínio
  - Tipos separados para diferentes preocupações (memória, RAG, functions)

- **D**ependency Inversion: Injeção de dependências
  - Agent depende de abstrações, não de implementações concretas

### 3. RAG (Retrieval-Augmented Generation)

Implementamos RAG para reduzir alucinações e melhorar a qualidade das respostas:

- **FAQ Collection**: Respostas pré-definidas para perguntas comuns
- **Appointments Collection**: Histórico de agendamentos para personalização
- **Conversations Collection**: Conversas anteriores para aprendizado

**Benefícios**:
- Respostas mais precisas e consistentes
- Personalização baseada em histórico
- Redução de alucinações (LLM não inventa dados)

### 4. Proatividade por Design

Ao invés de depender 100% do LLM para decidir quando chamar funções, implementamos:

- **ProactivityEngine**: Força chamada de funções em cenários específicos
- **Exemplo**: Ao mencionar procedimento, automaticamente lista procedimentos disponíveis
- **Resultado**: Experiência mais fluida e consistente

### 5. Anti-Alucinação

Implementamos múltiplas camadas de proteção:

- **Prompts explícitos**: Instruções claras para não inventar dados
- **Validação obrigatória**: Todos os dados são validados com backend
- **Function calling**: Informações dinâmicas vêm de funções, não do LLM
- **Confirmação**: Sempre confirma dados antes de agendar

---

## 📁 Estrutura do Projeto

```
orchestrator/
├── src/
│   ├── agent/                    # 🤖 Agente Principal
│   │   ├── agent.ts              # Orquestrador do fluxo conversacional
│   │   └── __tests__/            # Testes do fluxo conversacional completo
│   │
│   ├── memory/                   # 🧠 Gerenciamento de Memória
│   │   ├── short-term-memory.ts  # Sessões em memória (slots, contexto)
│   │   ├── memory-manager.ts     # Interface para long-term memory
│   │   └── __tests__/            # Testes de memória
│   │
│   ├── rag/                      # 🔍 RAG e Vector Database
│   │   ├── qdrant-client.ts      # Cliente Qdrant
│   │   ├── embedding-service.ts  # Geração de embeddings (OpenAI)
│   │   ├── context-retrieval.ts  # Busca semântica de contexto
│   │   ├── appointment-sync.ts   # Sincronização de agendamentos
│   │   ├── faq-indexer.ts        # Indexação de FAQ
│   │   └── __tests__/            # Testes RAG
│   │
│   ├── functions/                # ⚡ Function Calling
│   │   ├── function-definitions.ts  # Definições OpenAI function calling
│   │   ├── function-executor.ts     # Executor de funções (chamadas backend)
│   │   └── __tests__/               # Testes de execução
│   │
│   ├── services/                 # 🎯 Serviços de Negócio
│   │   ├── function-call-handler.ts    # Orquestra execução de funções
│   │   ├── validation.service.ts       # Validação de dados
│   │   ├── suggestion-engine.service.ts  # Motor de sugestões
│   │   └── data-preload.service.ts     # Pré-carregamento de dados
│   │
│   ├── prompts/                  # 💬 Engenharia de Prompts
│   │   ├── system-prompt.ts              # Prompt principal do sistema
│   │   ├── scenario-prompts.ts           # Prompts por cenário
│   │   ├── slot-extraction-prompt.ts     # Prompt para extração de slots
│   │   └── validation-response-prompts.ts # Prompts de validação
│   │
│   ├── utils/                    # 🛠️ Utilitários
│   │   ├── slot-extractor.ts     # Extração inteligente de slots
│   │   └── __tests__/            # Testes de utilidades
│   │
│   ├── fallback/                 # 🚨 Detecção de Fallback
│   │   └── fallback-detector.ts  # Detecta necessidade de humano
│   │
│   ├── types/                    # 📝 Definições de Tipos
│   │   └── index.ts              # Tipos TypeScript compartilhados
│   │
│   ├── config/                   # ⚙️ Configuração
│   │   └── env.ts                # Gerenciamento de variáveis de ambiente
│   │
│   ├── scripts/                  # 🔧 Scripts Utilitários
│   │   ├── init-faq.ts           # Inicialização do FAQ no Qdrant
│   │   └── demo-faq-rag.ts       # Demo de busca RAG
│   │
│   ├── data/                     # 📊 Dados
│   │   └── faq.json              # Base de conhecimento FAQ (24 perguntas)
│   │
│   └── server.ts                 # 🚀 Servidor Express (entry point)
│
├── dist/                         # Build output (gerado)
├── node_modules/                 # Dependências
│
├── package.json                  # Configuração NPM
├── tsconfig.json                 # Configuração TypeScript
├── jest.config.js                # Configuração de testes
├── Dockerfile                    # Containerização
└── README.md                     # Este arquivo
```

---

## 🔧 Componentes Principais

### Agent (`agent/agent.ts`)

**Responsabilidade**: Orquestrar o fluxo conversacional completo

**Principais Métodos**:
- `processMessage(request)`: Processa mensagem do usuário, retorna resposta
- `buildPrompt()`: Constrói prompt contextualizado
- `callLLMWithFunctions()`: Invoca GPT-4o com function calling
- `detectScenario()`: Detecta cenário atual da conversa

**Dependências**:
- `ShortTermMemory`: Gerenciamento de sessões
- `SlotExtractor`: Extração de informações
- `FunctionExecutor`: Execução de funções
- `ContextRetrieval`: Busca RAG

### Short-Term Memory (`memory/short-term-memory.ts`)

**Responsabilidade**: Gerenciar sessões ativas na memória RAM

**Funcionalidades**:
- Armazenamento de mensagens (user/assistant)
- Gerenciamento de slots (nome, procedimento, unidade, data, horário)
- Timeout automático de sessões (30 minutos)
- Limpeza automática de sessões expiradas

### Qdrant Client (`rag/qdrant-client.ts`)

**Responsabilidade**: Interface com Qdrant Vector Database

**Collections**:
- `faq`: Base de conhecimento (perguntas/respostas)
- `appointments`: Histórico de agendamentos
- `conversations`: Conversas anteriores

### Slot Extractor (`utils/slot-extractor.ts`)

**Responsabilidade**: Extrair informações estruturadas de mensagens não estruturadas

**Processo**:
1. Chama GPT-4o com prompt específico de extração
2. Busca contexto RAG para enriquecimento
3. Normaliza datas e horários
4. Retorna slots extraídos + confiança + contexto RAG

### Function Executor (`functions/function-executor.ts`)

**Responsabilidade**: Executar funções contra backend .NET

**Funções Disponíveis**:
- `listar_unidades`: Lista todas as unidades disponíveis
- `listar_procedimentos`: Lista todos os procedimentos disponíveis
- `consultar_disponibilidade`: Consulta horários disponíveis
- `criar_agendamento`: Cria novo agendamento
- `validar_procedimento`: Valida se procedimento existe
- `validar_unidade`: Valida se unidade existe

### Fallback Detector (`fallback/fallback-detector.ts`)

**Responsabilidade**: Detectar quando transferir para humano

**Critérios**:
- Múltiplas tentativas sem progresso (fallbackCount >= 3)
- Mensagens muito longas sem resolução
- Sentimento negativo persistente
- Solicitação explícita de falar com humano

---

## 🔄 Fluxo Conversacional

### 5 Etapas do Fluxo

#### 1. Recepção Inicial (Greeting)
**Cenário**: Primeira mensagem do usuário, geralmente cumprimento  
**Ação**: Agente saúda e oferece ajuda  
**Exemplo**:
```
User: "Oi"
Agent: "Olá! Tudo bem? Sou assistente virtual da clínica. Posso ajudar você a agendar consultas e procedimentos. Como posso te ajudar hoje?"
```

#### 2. Coleta de Dados (Data Collection)
**Cenário**: Extração progressiva de informações necessárias  
**Ação**: Perguntar nome, procedimento desejado  
**Exemplo**:
```
User: "Quero agendar uma consulta"
Agent: "Perfeito! Para qual procedimento você gostaria de agendar? Temos Consulta Geral, Dermatologia, Limpeza de Pele, entre outros."
User: "Dermatologia, meu nome é João Silva"
Agent: "Ótimo, João! Vamos agendar uma consulta de Dermatologia para você."
```

#### 3. Confirmação de Unidade e Horários
**Cenário**: Usuário escolhe unidade e horário  
**Ação**: Listar opções disponíveis, consultar disponibilidade  
**Proatividade**: Automaticamente lista unidades e horários sem perguntar ao LLM  
**Exemplo**:
```
Agent: "Temos as seguintes unidades disponíveis:
• Centro - Rua Principal, 123
• Zona Sul - Av. Beira Mar, 456

Em qual você prefere agendar?"
User: "Centro, amanhã às 14h"
```

#### 4. Verificação de Disponibilidade
**Cenário**: Validar se data/horário está disponível  
**Ação**: Chamar backend para verificar  
**Validação**: Se indisponível, sugerir alternativas próximas  
**Exemplo**:
```
Agent: "Deixa eu verificar a disponibilidade... ✓

Ótimo! O horário de 14:00 está disponível amanhã (11/12/2025) na unidade Centro para Dermatologia.

Posso confirmar o agendamento para você com esses dados?
• Paciente: João Silva
• Procedimento: Dermatologia
• Unidade: Centro
• Data: 11/12/2025 às 14:00"
```

#### 5. Agendamento (Scheduling)
**Cenário**: Confirmação final e criação  
**Ação**: Criar agendamento no backend  
**Finalização**: Confirmar criação e fornecer detalhes  
**Exemplo**:
```
User: "Sim, confirma"
Agent: "✅ Agendamento confirmado com sucesso!

Seu agendamento:
📋 Procedimento: Dermatologia
👤 Paciente: João Silva
📍 Local: Centro - Rua Principal, 123
📅 Data: 11/12/2025
🕐 Horário: 14:00

Você receberá uma confirmação em breve. Até lá!"
```

---

## 🚀 Setup e Instalação

### Pré-requisitos

- Node.js 18+ e npm
- Docker e Docker Compose
- Backend .NET rodando
- Qdrant rodando (via Docker)
- OpenAI API Key

### Instalação Local

1. **Clonar o repositório** (se ainda não fez):
```bash
git clone <repo-url>
cd AI-CDR/orchestrator
```

2. **Instalar dependências**:
```bash
npm install
```

3. **Configurar variáveis de ambiente**:
Crie um arquivo `.env` na raiz de `orchestrator/`:

```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Backend
BACKEND_URL=http://backend:5000

# Server
PORT=3000
NODE_ENV=development

# Memory
SESSION_TIMEOUT_MINUTES=30

# Logging
LOG_LEVEL=info
```

4. **Inicializar FAQ no Qdrant**:
```bash
npm run init-faq
```

5. **Rodar em desenvolvimento**:
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### Verificar Saúde

```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "service": "orchestrator",
  "timestamp": "2025-12-10T20:00:00.000Z"
}
```

---

## 📡 API Endpoints

### `POST /orchestrator/chat`

Processa uma mensagem do usuário e retorna resposta do agente.

**Request Body**:
```json
{
  "sessionId": "uuid-v4",
  "message": "Quero agendar consulta de dermatologia"
}
```

**Response**:
```json
{
  "response": "Perfeito! Para agendar Dermatologia, preciso de mais algumas informações...",
  "slots": {
    "procedimento": "Dermatologia"
  },
  "functionCalls": [
    {
      "functionName": "validar_procedimento",
      "parameters": { "nome": "Dermatologia" }
    }
  ],
  "scenario": "data-collection",
  "needsHuman": false
}
```

### `POST /orchestrator/initialize-session`

Cria uma nova sessão.

**Response**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `GET /orchestrator/session/:sessionId`

Consulta o estado atual de uma sessão.

**Response**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "slots": {
    "nome": "João Silva",
    "procedimento": "Dermatologia",
    "unidade": "Centro"
  },
  "currentStep": 3,
  "messages": [
    {
      "role": "user",
      "content": "Oi",
      "timestamp": "2025-12-10T20:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Olá! Como posso ajudar?",
      "timestamp": "2025-12-10T20:00:01.000Z"
    }
  ],
  "scenario": "confirmation"
}
```

### `POST /embed`

Gera embeddings para texto (usado pelo backend para sync).

**Request Body**:
```json
{
  "text": "Consulta de dermatologia"
}
```

**Response**:
```json
{
  "embedding": [0.123, -0.456, 0.789, ...]
}
```

### `GET /health`

Health check do serviço.

**Response**:
```json
{
  "status": "ok",
  "service": "orchestrator",
  "timestamp": "2025-12-10T20:00:00.000Z"
}
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `OPENAI_API_KEY` | ✅ Sim | - | Chave de API da OpenAI |
| `OPENAI_MODEL` | Não | `gpt-4o` | Modelo OpenAI a usar |
| `OPENAI_TEMPERATURE` | Não | `0.7` | Temperatura do modelo (0-1) |
| `QDRANT_URL` | Não | `http://localhost:6333` | URL do Qdrant |
| `QDRANT_API_KEY` | Não | `''` | API Key do Qdrant (se necessário) |
| `BACKEND_URL` | Não | `http://localhost:5000` | URL do backend .NET |
| `PORT` | Não | `3000` | Porta do servidor |
| `NODE_ENV` | Não | `development` | Ambiente (development/production) |
| `SESSION_TIMEOUT_MINUTES` | Não | `30` | Timeout de sessão em minutos |
| `LOG_LEVEL` | Não | `info` | Nível de log (debug/info/warn/error) |

### Configuração do OpenAI

Recomendamos:
- **Modelo**: `gpt-4o` (melhor qualidade) ou `gpt-4o-mini` (mais rápido/barato)
- **Temperature**: `0.7` (balanço entre criatividade e consistência)

### Configuração do Qdrant

Collections criadas automaticamente:
- `faq` - Vector size: 1536 (OpenAI embeddings)
- `appointments` - Vector size: 1536
- `conversations` - Vector size: 1536

---

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes unitários
npm test

# Watch mode
npm run test:watch

# Com coverage
npm run test:coverage

# Apenas integration tests
npm run test:integration
```

### Cobertura de Testes

Testes unitários implementados:

- ✅ `short-term-memory.test.ts` - Gerenciamento de sessões
- ✅ `embedding-service.test.ts` - Geração de embeddings
- ✅ `slot-extractor.test.ts` - Extração de slots
- ✅ `function-executor.test.ts` - Execução de funções
- ✅ `agent-conversational-flow.test.ts` - Fluxos conversacionais completos

**Total**: 70+ testes unitários

### Testes Manuais Recomendados

#### Teste 1: Fluxo Completo de Agendamento

1. Inicializar sessão
2. Enviar: "Oi"
3. Enviar: "Quero agendar dermatologia para João Silva amanhã às 14h na unidade Centro"
4. Confirmar com: "Sim, confirma"
5. Verificar agendamento criado no backend

#### Teste 2: Fluxo Incremental

1. Enviar: "Olá"
2. Enviar: "Quero marcar consulta"
3. Enviar: "Dermatologia"
4. Enviar: "João Silva"
5. Enviar: "Centro"
6. Enviar: "Amanhã às 14h"
7. Confirmar

#### Teste 3: FAQ

1. Enviar: "Quais procedimentos vocês oferecem?"
2. Verificar resposta com base no FAQ RAG

---

## 🐳 Docker

### Build da Imagem

```bash
docker build -t ai-cdr-orchestrator .
```

### Executar Container

```bash
docker run -p 3000:3000 --env-file .env ai-cdr-orchestrator
```

### Docker Compose (Completo)

O sistema completo (backend + frontend + orchestrator + Qdrant + MongoDB) pode ser executado com:

```bash
# Na raiz do projeto AI-CDR/
docker-compose up --build
```

Serviços incluídos:
- `backend`: .NET API (porta 5000)
- `orchestrator`: Este serviço (porta 3000)
- `frontend`: React app (porta 80)
- `qdrant`: Vector DB (porta 6333)
- `mongodb`: Database (porta 27017)

### Health Checks

O Docker Compose inclui health checks automáticos:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## ✅ Atendimento aos Requisitos

### Requisitos Funcionais (specs.md)

#### ✅ Fluxo Conversacional de 5 Etapas

1. **Recepção inicial do paciente** → Implementado em `scenario: 'greeting'`
2. **Coleta do nome e tipo de procedimento desejado** → Slot extraction com RAG
3. **Confirmação da unidade e horários disponíveis** → Proactivity engine + function calling
4. **Verificação de disponibilidade** → `consultar_disponibilidade` function
5. **Agendamento** → `criar_agendamento` function + confirmação

#### ✅ Base de Conhecimento (RAG)

- **FAQ**: 24 perguntas/respostas indexadas no Qdrant
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensões)
- **Busca Semântica**: Recuperação de contexto relevante em TODAS as mensagens
- **Histórico**: Agendamentos anteriores para personalização

**Arquivo**: `src/data/faq.json`

#### ✅ Memória Contextual

**Short-term**:
- Sessões em memória RAM
- Histórico de mensagens (últimas 10 mantidas)
- Slots coletados (nome, procedimento, unidade, data, horário)
- Contexto (currentStep, scenario, fallbackCount)
- Timeout automático (30 minutos)

**Long-term**:
- Vector DB Qdrant
- Collections: `faq`, `appointments`, `conversations`
- Busca por similaridade semântica
- Histórico de pacientes para personalização

#### ✅ Function Calling

6 funções implementadas:

1. `listar_unidades` - Lista todas as unidades
2. `listar_procedimentos` - Lista todos os procedimentos
3. `consultar_disponibilidade` - Consulta horários disponíveis
4. `criar_agendamento` - Cria novo agendamento
5. `validar_procedimento` - Valida se procedimento existe
6. `validar_unidade` - Valida se unidade existe

**Integração**: Todas as funções chamam backend .NET via HTTP

#### ✅ Slot Filling

Slots rastreados:
- `nome`: Nome do paciente
- `procedimento`: Procedimento desejado
- `unidade`: Unidade escolhida
- `data`: Data do agendamento (formato ISO)
- `horario`: Horário do agendamento (HH:mm)

**Extração**: Via LLM com prompt especializado + validação RAG

#### ✅ Fallback Inteligente

Detecção automática de necessidade de humano:
- fallbackCount >= 3 (múltiplas tentativas sem progresso)
- Mensagens muito longas (>= 20 mensagens)
- Sentimento negativo
- Solicitação explícita

**Resposta**: Transferência amigável para atendimento humano

### Stack Técnica (specs.md)

- ✅ **Backend**: .NET C# (serviço separado)
- ✅ **LLM**: OpenAI GPT-4o
- ✅ **Vector DB**: Qdrant
- ✅ **Frontend**: React (serviço separado)
- ✅ **Orchestration**: Node.js + TypeScript (este projeto)

### Entregáveis (specs.md)

- ✅ **Código-fonte completo**: Todos os arquivos no repositório
- ✅ **Instruções de execução**: Este README (seções Setup e Docker)
- ✅ **Arquivos .env.example**: Exemplo de configuração fornecido
- ✅ **README com explicações técnicas**: Este arquivo
- ✅ **Decisões arquiteturais**: Seção "Decisões Técnicas"
- ✅ **Estrutura de fluxo**: Seção "Fluxo Conversacional"
- ✅ **Estratégia de memória/contexto**: Seções "Arquitetura" e "Componentes"
- ✅ **Lista de funções**: Seção "Function Calling"
- ✅ **Prompt base do agente**: `src/prompts/system-prompt.ts`

### Diferenciais Implementados

- ✅ **Testes automatizados**: 70+ testes unitários com Jest
- ✅ **Logging de conversas**: Todas as mensagens são logadas
- ✅ **Integração com banco real**: Via backend .NET API
- ✅ **Interface funcional**: React frontend integrado

---

## 📝 Notas Adicionais

### Princípios de Design

1. **Fail Gracefully**: Sempre oferece alternativas em caso de erro
2. **Transparent**: Informa claramente o que está fazendo (validando, consultando, etc.)
3. **Consistent**: Respostas consistentes através de prompts bem definidos
4. **Proactive**: Sugere opções automaticamente ao invés de perguntar genéricamente

### Engenharia de Prompts

Os prompts foram cuidadosamente projetados para:
- Evitar alucinações (nunca inventar dados)
- Forçar uso de funções para dados dinâmicos
- Manter personalidade amigável e humana
- Sempre confirmar antes de agendar

**Arquivos principais**:
- `src/prompts/system-prompt.ts` - Instruções gerais do sistema
- `src/prompts/scenario-prompts.ts` - Prompts específicos por cenário
- `src/prompts/slot-extraction-prompt.ts` - Extração de informações
- `src/prompts/validation-response-prompts.ts` - Respostas de validação

### Performance

- **Tempo médio de resposta**: ~2-3 segundos
- **Uso de memória**: ~200MB (sessões ativas)
- **Throughput**: Limitado pela OpenAI API rate limits

### Segurança

- Não armazena dados sensíveis em plaintext
- Validação de entrada em todos os endpoints
- Rate limiting recomendado em produção
- CORS configurado adequadamente

---

## 🤝 Contribuição e Suporte

Para dúvidas ou melhorias, abra uma issue no repositório.

**Desenvolvido como prova técnica para High Agents AI**

---

## 📄 Licença

MIT
