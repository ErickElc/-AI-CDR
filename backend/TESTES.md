# 🧪 Guia de Testes - Backend AI-CDR

Documentação completa sobre os testes do backend.

## 📋 Visão Geral

O projeto possui dois tipos de testes:

1. **Testes Unitários** - Testam lógica de negócio isoladamente usando mocks
2. **Testes de Integração** - Testam integração real com MongoDB

## 🎯 Cobertura de Testes

### ✅ Testes Unitários (28 testes)

#### Services
- ✅ **AgendamentoService** (8 testes)
  - Criação de agendamento válido
  - Rejeição de horário inválido
  - Rejeição de duplicidade
  - Criação sem email
  - Duplicidade por email
  - Consulta de disponibilidade

- ✅ **ValidacaoAgendaService** (15 testes)
  - Validação de horário comercial
  - Rejeição de sábados e domingos
  - Validação de períodos (manhã/tarde)
  - Geração de slots de 30 em 30 minutos
  - Exclusão de slots ocupados
  - Validação de duplicidade

#### Controllers
- ✅ **ChatController** (5 testes)
  - Processamento de mensagens válidas
  - Validação de mensagens vazias
  - Geração de sessionId

- ✅ **FunctionsController** (6 testes)
  - Consulta de disponibilidade
  - Criação de agendamento
  - Validação de duplicidade
  - Listagem de unidades
  - Listagem de procedimentos

- ✅ **HealthController** (2 testes)
  - Health check quando MongoDB conectado
  - Health check quando MongoDB desconectado

### ✅ Testes de Integração (24 testes)

#### Repositories
- ✅ **AgendamentoRepositoryIntegrationTests** (13 testes)
  - Criação de agendamento no MongoDB
  - Busca por ID
  - Busca por unidade e data
  - Exclusão de cancelados
  - Validação de duplicidade (nome e email)
  - Atualização de agendamento
  - Listagem de todos

- ✅ **UnidadeRepositoryIntegrationTests** (6 testes)
  - Listagem de unidades ativas
  - Busca por ID
  - Busca por nome
  - Filtro de unidades inativas

- ✅ **ProcedimentoRepositoryIntegrationTests** (5 testes)
  - Listagem de procedimentos
  - Busca por ID
  - Busca por nome

**Total: 52 testes (28 unitários + 24 integração)**

## 🚀 Executando Testes

### Apenas Testes Unitários (Rápido)

```bash
cd backend
./test-backend.sh
```

### Testes Unitários + Integração (Completo)

```bash
cd backend
RUN_INTEGRATION_TESTS=true ./test-backend.sh
```

### Via dotnet CLI

```bash
# Apenas unitários
dotnet test --filter "FullyQualifiedName!~Integration"

# Apenas integração
dotnet test --filter "FullyQualifiedName~Integration"

# Todos
dotnet test
```

## 🐳 Testes de Integração com Docker

Os testes de integração requerem MongoDB rodando. O script automaticamente:

1. Inicia MongoDB em container Docker (porta 27018)
2. Executa os testes de integração
3. Para o container após os testes

### Executar Manualmente

```bash
# Iniciar MongoDB para testes
cd ..
docker-compose -f docker-compose.test.yml up -d mongodb-test

# Executar testes com variável de ambiente
cd backend
export MONGODB_TEST_CONNECTION="mongodb://localhost:27018"
dotnet test

# Parar MongoDB
cd ..
docker-compose -f docker-compose.test.yml down
```

## 📊 Estrutura dos Testes

```
AI-CDR.Backend.Tests/
├── Controllers/
│   ├── ChatControllerTests.cs          # Testes unitários
│   ├── FunctionsControllerTests.cs    # Testes unitários
│   └── HealthControllerTests.cs       # Testes unitários
├── Services/
│   ├── AgendamentoServiceTests.cs      # Testes unitários
│   └── ValidacaoAgendaServiceTests.cs  # Testes unitários
└── Repositories/
    ├── AgendamentoRepositoryIntegrationTests.cs  # Testes de integração
    ├── UnidadeRepositoryIntegrationTests.cs      # Testes de integração
    └── ProcedimentoRepositoryIntegrationTests.cs # Testes de integração
```

## ⚙️ Configuração

### Variáveis de Ambiente

- `MONGODB_TEST_CONNECTION` - Connection string do MongoDB para testes (padrão: `mongodb://localhost:27018`)
- `RUN_INTEGRATION_TESTS` - Executar testes de integração (padrão: `false`)

### MongoDB de Teste

- **Porta**: 27018 (para não conflitar com MongoDB de desenvolvimento na 27017)
- **Database**: Criado dinamicamente com GUID único (limpo após testes)
- **Container**: `ai-cdr-mongodb-test`

## 📝 Boas Práticas

### Testes Unitários
- ✅ Usar mocks para isolar dependências
- ✅ Testar uma funcionalidade por vez
- ✅ Nomes descritivos (Arrange-Act-Assert)
- ✅ Verificar comportamento, não implementação

### Testes de Integração
- ✅ Usar database isolado (GUID único)
- ✅ Limpar dados após testes
- ✅ Testar fluxos completos
- ✅ Verificar persistência real no MongoDB

## 🐛 Troubleshooting

### MongoDB não conecta nos testes de integração

1. Verificar se container está rodando:
   ```bash
   docker ps | grep mongodb-test
   ```

2. Verificar porta:
   ```bash
   docker-compose -f docker-compose.test.yml ps
   ```

3. Testar conexão manual:
   ```bash
   mongosh mongodb://localhost:27018
   ```

### Testes de integração falham

1. Verificar se MongoDB está acessível:
   ```bash
   export MONGODB_TEST_CONNECTION="mongodb://localhost:27018"
   dotnet test --filter "FullyQualifiedName~Integration" --verbosity detailed
   ```

2. Verificar logs do container:
   ```bash
   docker-compose -f docker-compose.test.yml logs mongodb-test
   ```

## 📈 Estatísticas

- **Total de Testes**: 52 (28 unitários + 24 integração)
- **Cobertura**: Services, Controllers, Repositories
- **Tempo médio**: ~30s (unitários), ~1min (com integração)

## 🔄 CI/CD

Para CI/CD, use:

```bash
# Executar todos os testes
RUN_INTEGRATION_TESTS=true ./test-backend.sh

# Ou via dotnet
dotnet test --configuration Release
```
