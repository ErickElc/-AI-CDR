# 🏥 AI-CDR - Sistema Inteligente de Agendamento de Consultas

Sistema completo de agente de IA para agendamento de consultas médicas, com interface de chat inteligente, backend .NET, orquestrador Node.js/LangChain com RAG (Retrieval-Augmented Generation) e memória de conversação.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Status de Implementação](#-status-de-implementação)
- [Arquitetura](#️-arquitetura)
- [Tecnologias](#-tecnologias)
- [Início Rápido](#-início-rápido)
- [Configuração](#-configuração)
- [Desenvolvimento](#-desenvolvimento)
- [Comandos Úteis](#-comandos-úteis)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Endpoints](#-api-endpoints)
- [Funcionalidades](#-funcionalidades)
- [Troubleshooting](#-troubleshooting)

## 🎯 Visão Geral

O AI-CDR é um sistema completo de agendamento de consultas médicas que utiliza IA para proporcionar uma experiência conversacional natural aos usuários. O sistema:

- ✅ Entende linguagem natural e contexto
- ✅ Valida informações em tempo real com o backend
- ✅ Sugere horários e unidades disponíveis proativamente
- ✅ Mantém histórico de conversação
- ✅ Responde perguntas frequentes usando RAG
- ✅ Interface moderna e responsiva

## ✅ Status de Implementação

Esta seção mapeia os requisitos especificados em [specs.md](specs.md) com o que foi implementado:

### Funcionalidades Obrigatórias

| Requisito | Status | Implementação |
|-----------|--------|---------------|
| **Interface de Chat** | ✅ Completo | Frontend React com chat em tempo real |
| **5 Etapas Conversacionais** | ✅ Completo | Fluxo completo de agendamento implementado |
| **Memória Short-term** | ✅ Completo | `ShortTermMemory` com gerenciamento de sessões |
| **Memória Long-term** | ✅ Completo | Qdrant Vector DB para histórico e contexto |
| **Base de Conhecimento (RAG)** | ✅ Completo | RAG com embeddings OpenAI + Qdrant |
| **Function Calling** | ✅ Completo | 5+ funções implementadas (ver abaixo) |
| **Slot Filling** | ✅ Completo | Extração de: nome, procedimento, unidade, data, horário |
| **Fallback Inteligente** | ✅ Completo | `FallbackDetector` com contador e redirecionamento |

### Fluxo Conversacional (5 Etapas)

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 1️⃣ **Recepção** | Saudação e identificação do contexto | ✅ Implementado |
| 2️⃣ **Coleta** | Nome e tipo de procedimento | ✅ Implementado |
| 3️⃣ **Confirmação** | Unidade e horários disponíveis | ✅ Implementado |
| 4️⃣ **Verificação** | Validação de disponibilidade real | ✅ Implementado |
| 5️⃣ **Agendamento** | Criação do agendamento no sistema | ✅ Implementado |

### Funções Externas Implementadas

| Função | Descrição | Endpoint |
|--------|-----------|----------|
| `listar_unidades()` | Lista unidades disponíveis | `POST /api/functions/unidades` |
| `listar_procedimentos()` | Lista procedimentos disponíveis | `POST /api/functions/procedimentos` |
| `consultar_disponibilidade()` | Consulta horários disponíveis | `POST /api/functions/consultar-disponibilidade` |
| `criar_agendamento()` | Cria novo agendamento | `POST /api/functions/criar-agendamento` |
| `confirmar_agendamento()` | Confirma e finaliza agendamento | Integrado no fluxo |

### Stack Tecnológica (Comparação)

| Especificado | Implementado | Status |
|--------------|--------------|--------|
| Backend .NET + C# | ✅ .NET 10.0 + C# | ✅ Conforme |
| LLM OpenAI (GPT-4o) | ✅ OpenAI (GPT-4o-mini configurável) | ✅ Conforme |
| VectorDB (Qdrant/Pinecone) | ✅ Qdrant | ✅ Conforme |
| Frontend React | ✅ React 19 + TypeScript | ✅ Conforme |
| Orquestração Node.js | ✅ Node.js + LangChain | ✅ Conforme |

### Diferenciais Implementados

| Item | Status | Detalhes |
|------|--------|----------|
| **LangChain** | ✅ Implementado | Orquestração completa com LangChain |
| **Logging de Conversas** | ✅ Implementado | Logs detalhados em todos os serviços |
| **Banco de Dados Real** | ✅ Implementado | MongoDB com seed automático |
| **Interface Funcional** | ✅ Implementado | Interface web completa e responsiva |
| **Análise de Sentimento** | ⚠️ Parcial | Detecção de fallback implementada |

### Entregáveis

| Item | Status | Localização |
|------|--------|-------------|
| Código-fonte completo | ✅ | Todo o repositório |
| Instruções de execução | ✅ | Este README |
| .env.example | ✅ | Raiz do projeto |
| README técnico | ✅ | Este arquivo |
| Estrutura de fluxo | ✅ | Seção Arquitetura |
| Estratégia de memória | ✅ | [Documentação Orchestrator](orchestrator/README.md) |
| Lista de funções | ✅ | Seção API Endpoints |
| Prompt base | ✅ | [system-prompt.ts](orchestrator/src/prompts/system-prompt.ts) |

### Resumo de Implementação

**✅ 100% dos requisitos obrigatórios implementados**  
**✅ 83% dos diferenciais implementados**  
**✅ Todos os entregáveis presentes**

---


## 🏗️ Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│ Orchestrator │─────▶│   Backend   │
│   (React)   │◀─────│  (LangChain) │◀─────│   (.NET 10)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                       │
                            ▼                       ▼
                     ┌──────────┐          ┌──────────┐
                     │  Qdrant  │          │ MongoDB  │
                     │ (Vector) │          │  (Data)  │
                     └──────────┘          └──────────┘
```

### Componentes

1. **Frontend (React + TypeScript)**
   - Interface de chat moderna e responsiva
   - Dashboard de agendamentos em tempo real
   - Filtros e visualização de calendário

2. **Orchestrator (Node.js + LangChain)**
   - Processamento de linguagem natural via OpenAI
   - RAG com Qdrant para respostas contextualizadas
   - Gerenciamento de estado de conversação
   - Extração inteligente de slots (nome, procedimento, unidade, data, horário)

3. **Backend (.NET 10)**
   - APIs RESTful para gerenciamento de dados
   - Validação de regras de negócio
   - Integração com MongoDB
   - Seed de dados mock para testes

4. **MongoDB**
   - Armazenamento de agendamentos
   - Dados de unidades e procedimentos

5. **Qdrant**
   - Vector database para RAG
   - Embeddings de FAQ e conhecimento base
   - Busca semântica

## 🛠️ Tecnologias

### Frontend
- React 19
- TypeScript
- Material-UI (MUI)
- TanStack Query
- Axios
- Vite

### Backend
- .NET 10.0
- MongoDB Driver
- ASP.NET Core

### Orchestrator
- Node.js
- TypeScript
- LangChain
- OpenAI API
- Express.js
- Qdrant Client

### Infraestrutura
- Docker & Docker Compose
- MongoDB 7.0
- Qdrant (latest)
- Nginx

## 🚀 Início Rápido

### Pré-requisitos

- Docker instalado ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose instalado
- Chave de API da OpenAI ([Get API Key](https://platform.openai.com/api-keys))

### Passos

1. **Clone o repositório**
```bash
git clone <repository-url>
cd AI-CDR
```

2. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da OpenAI:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

3. **Inicie todos os serviços**
```bash
docker-compose up -d
```

Aguarde alguns segundos para todos os serviços iniciarem (você pode acompanhar com `docker-compose logs -f`)

4. **Acesse a aplicação**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Swagger**: http://localhost:5000/swagger
- **Orchestrator**: http://localhost:3000
- **Qdrant Dashboard**: http://localhost:6333/dashboard

## ⚙️ Configuração

### Arquivo .env

O arquivo `.env` na raiz do projeto contém todas as configurações necessárias. Veja `.env.example` para referência completa.

**Configurações principais:**

```env
# OpenAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=

# Backend
BACKEND_URL=http://backend:8080

# Session
SESSION_TIMEOUT_MINUTES=30

# Logging
LOG_LEVEL=info
```

### Configuração de Portas

Se precisar alterar as portas padrão, edite o `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "5173:5173"  # Altere a primeira porta (host)
  
  backend:
    ports:
      - "5000:8080"  # Altere a primeira porta (host)
```

## 💻 Desenvolvimento

### Desenvolvimento Local (sem Docker)

#### Backend

```bash
cd backend/AI-CDR.Backend.Api
dotnet run
```

#### Orchestrator

```bash
cd orchestrator
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Desenvolvimento com Docker (Hot Reload)

Use o compose de desenvolvimento:

```bash
docker-compose -f docker-compose.dev.yml up
```

## � Comandos Úteis

### Usando Makefile

```bash
# Iniciar todos os serviços
make up

# Parar todos os serviços
make down

# Ver logs de todos os serviços
make logs

# Ver logs de um serviço específico
make logs-backend
make logs-orchestrator
make logs-frontend

# Reconstruir todas as imagens
make build

# Limpar containers e volumes
make clean

# Apenas MongoDB e Qdrant (para dev local)
make dev-up
```

### Usando Docker Compose diretamente

```bash
# Iniciar em modo detached
docker-compose up -d

# Ver logs
docker-compose logs -f [service-name]

# Parar serviços
docker-compose down

# Rebuild
docker-compose up --build

# Remover volumes
docker-compose down -v
```

## 📁 Estrutura do Projeto

```
AI-CDR/
├── backend/                      # Backend .NET
│   ├── AI-CDR.Backend.Api/      # Projeto principal da API
│   │   ├── Controllers/         # Controllers REST
│   │   ├── Models/              # Models e DTOs
│   │   ├── Services/            # Serviços de negócio
│   │   ├── Data/                # Contexto e seeders
│   │   └── Dockerfile
│   └── AI-CDR.Backend.Tests/    # Testes unitários
│
├── orchestrator/                 # Orquestrador LangChain
│   ├── src/
│   │   ├── agent/               # Agente principal
│   │   ├── services/            # Serviços (prompt, validation, etc)
│   │   ├── rag/                 # RAG e embeddings
│   │   ├── memory/              # Gerenciamento de memória
│   │   ├── functions/           # Definições e executor de funções
│   │   ├── prompts/             # Templates de prompts
│   │   ├── utils/               # Utilitários
│   │   └── server.ts            # Servidor Express
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                     # Frontend React
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   │   ├── Chat/           # Componentes de chat
│   │   │   ├── Agenda/         # Componentes de agenda
│   │   │   └── Layout/         # Layout principal
│   │   ├── services/            # Serviços de API
│   │   ├── hooks/               # Custom hooks
│   │   ├── types/               # TypeScript types
│   │   └── theme.ts             # Tema Material-UI
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml            # Orquestração completa
├── docker-compose.dev.yml        # Compose para desenvolvimento
├── docker-compose.backend.yml    # Apenas backend
├── Makefile                      # Comandos úteis
├── .env.example                  # Exemplo de variáveis
├── .gitignore                    # Arquivos ignorados pelo git
└── README.md                     # Este arquivo
```

## � API Endpoints

### Backend API (http://localhost:5000)

#### Agendamentos
- `GET /api/agendamentos` - Lista todos os agendamentos
- `GET /api/agendamentos/{id}` - Busca agendamento por ID
- `POST /api/agendamentos` - Cria novo agendamento
- `PUT /api/agendamentos/{id}` - Atualiza agendamento
- `DELETE /api/agendamentos/{id}` - Remove agendamento

#### Funções (para o Orchestrator)
- `POST /api/functions/unidades` - Lista unidades disponíveis
- `POST /api/functions/procedimentos` - Lista procedimentos disponíveis
- `POST /api/functions/consultar-disponibilidade` - Consulta horários disponíveis
- `POST /api/functions/criar-agendamento` - Cria agendamento

#### Sistema
- `GET /api/system/current-datetime` - Retorna data/hora atual
- `GET /Health` - Health check

### Orchestrator API (http://localhost:3000)

- `POST /orchestrator/chat` - Processa mensagem do chat
- `POST /orchestrator/initialize-session` - Inicia nova sessão
- `GET /orchestrator/session/:sessionId` - Consulta sessão
- `POST /admin/reindex-faq` - Re-indexa FAQ
- `GET /health` - Health check

## ✨ Funcionalidades

### Chat Inteligente
- Processamento de linguagem natural
- Extração automática de informações (nome, procedimento, unidade, data, horário)
- Validação em tempo real com backend
- Sugestões proativas de horários e unidades
- Resposta a perguntas frequentes usando RAG

### Agendamentos
- Visualização em tempo real de agendamentos
- Filtros por unidade e procedimento
- Calendário navegável de 30 dias
- Paginação de resultados
- Design responsivo

### Dados Mock
O sistema já vem com dados de exemplo:
- 8 procedimentos médicos
- 4 unidades de atendimento
- Agendamentos mock criados automaticamente

## 🧪 Testes

### Backend

```bash
cd backend
dotnet test
```

## 🐛 Troubleshooting

### Problemas Comuns

#### Container não inicia

```bash
# Verifique o status
docker-compose ps

# Verifique os logs
docker-compose logs [service-name]

# Reconstrua a imagem
docker-compose up --build [service-name]
```

#### MongoDB não conecta

```bash
# Verifique se está rodando
docker-compose ps mongodb

# Teste a conexão
docker-compose exec mongodb mongosh
```

#### Erro "Port already in use"

```bash
# Encontre o processo usando a porta
lsof -i :5173  # ou 5000, 3000, etc

# Mate o processo ou altere a porta no docker-compose.yml
```

#### OpenAI API Error

Verifique:
1. Se sua chave está correta no `.env`
2. Se tem créditos disponíveis na sua conta OpenAI
3. Os logs do orchestrator: `docker-compose logs orchestrator`

#### Frontend não carrega dados

Verifique:
1. Se backend está saudável: http://localhost:5000/Health
2. Se orchestrator está saudável: http://localhost:3000/health
3. Console do navegador para erros

### Resetar Tudo

```bash
# Para todos containers e remove volumes
docker-compose down -v

# Remove imagens
docker-compose down --rmi all

# Reconstrua do zero
docker-compose up --build
```