# AI-CDR Backend API

Backend .NET para o sistema de agente de IA SDR para clínicas digitais. Fornece validações de negócio, gerenciamento de agendamentos e integração com o orquestrador de IA.

## 📋 Visão Geral

O backend é responsável por:
- **Validações de Negócio**: Horários comerciais, disponibilidade de slots, duplicidade
- **Gerenciamento de Agendamentos**: Criação, consulta e validação
- **Integração com Orquestrador**: Comunicação HTTP com serviço de IA
- **Persistência**: MongoDB para agendamentos, unidades e procedimentos

## 🏗️ Arquitetura

```
Controllers → Services → Repositories → MongoDB
```

**Padrões**: Repository Pattern, Dependency Injection, Interface Segregation

## 🛠️ Tecnologias

- .NET 10.0
- ASP.NET Core
- MongoDB.Driver 2.23.1
- Swashbuckle.AspNetCore 6.5.0 (Swagger)
- xUnit (testes)

## 🚀 Início Rápido

### Com Docker (Recomendado)

```bash
# Na raiz do projeto
docker-compose -f docker-compose.backend.yml up -d

# Verificar status
docker-compose -f docker-compose.backend.yml ps

# Ver logs
docker-compose -f docker-compose.backend.yml logs -f backend
```

**API disponível em:**
- HTTP: `http://localhost:5000`
- Swagger: `http://localhost:5000/swagger`
- Health: `http://localhost:5000/Health`

### Localmente (sem Docker)

```bash
# Pré-requisito: MongoDB rodando em localhost:27017
cd backend/AI-CDR.Backend.Api
dotnet run
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
ConnectionStrings__MongoDB=mongodb://localhost:27017
MongoDB__DatabaseName=ai-cdr
Orchestrator__BaseUrl=http://localhost:3000
```

### appsettings.json

```json
{
  "ConnectionStrings": {
    "MongoDB": "mongodb://localhost:27017"
  },
  "MongoDB": {
    "DatabaseName": "ai-cdr"
  },
  "Orchestrator": {
    "BaseUrl": "http://localhost:3000"
  }
}
```

### Perfis de Configuração

- **appsettings.json**: Configuração padrão (produção)
- **appsettings.Development.json**: Desenvolvimento local
- **appsettings.Docker.json**: Ambiente Docker

## 📡 API Endpoints

### Chat
- `POST /api/chat/message` - Processa mensagem do frontend

**Request:**
```json
{
  "message": "Quero agendar uma consulta",
  "sessionId": "opcional-guid"
}
```

**Response:**
```json
{
  "sessionId": "guid",
  "response": "Resposta do agente de IA"
}
```

### Functions (Orquestrador)
- `POST /api/functions/consultar-disponibilidade` - Consulta slots disponíveis
- `POST /api/functions/criar-agendamento` - Cria agendamento validado
- `POST /api/functions/validar-duplicidade` - Valida duplicidade
- `GET /api/functions/unidades` - Lista unidades disponíveis
- `GET /api/functions/procedimentos` - Lista procedimentos disponíveis

### Health
- `GET /Health` - Status da API e MongoDB

## 📋 Regras de Negócio

### Horário Comercial
- **Dias**: Segunda a Sexta-feira
- **Horários**: 
  - Manhã: 08:00 - 12:00
  - Tarde: 14:00 - 18:00
- **Intervalo**: 30 minutos entre slots
- **Não atende**: Sábados e Domingos

### Validações
1. **Data no Passado**: Bloqueado
2. **Horário Comercial**: Verifica se está dentro do período
3. **Duplicidade**: Mesmo nome OU email + mesma data/hora + mesma unidade
4. **Disponibilidade**: Slots de 30 em 30 minutos, excluindo agendamentos existentes

## 🧪 Testes

### Executar Testes

```bash
# Apenas testes unitários (rápido)
./test-backend.sh

# Testes completos (unitários + integração com MongoDB)
RUN_INTEGRATION_TESTS=true ./test-backend.sh

# Via dotnet CLI
dotnet test
```

### Cobertura de Testes

- ✅ **28 testes unitários** - Services, Controllers, Health Checks
- ✅ **24 testes de integração** - Repositories com MongoDB real

📚 **Veja [TESTES.md](./TESTES.md) para documentação completa de testes**

## 🐳 Docker

### Comandos Úteis

```bash
# Iniciar serviços
docker-compose -f docker-compose.backend.yml up -d

# Parar serviços
docker-compose -f docker-compose.backend.yml down

# Rebuild backend
docker-compose -f docker-compose.backend.yml build --no-cache backend
docker-compose -f docker-compose.backend.yml up -d

# Ver logs
docker-compose -f docker-compose.backend.yml logs -f backend

# Limpar tudo (⚠️ apaga dados)
docker-compose -f docker-compose.backend.yml down -v
```

### MongoDB

```bash
# Acessar MongoDB
docker exec -it ai-cdr-mongodb mongosh ai-cdr

# Verificar dados iniciais
docker exec -it ai-cdr-mongodb mongosh ai-cdr --eval "
  db.unidades.find().pretty();
  db.procedimentos.find().pretty();
"

# Inicializar dados (se necessário)
docker exec -i ai-cdr-mongodb mongosh ai-cdr < scripts/init-mongo.js
```

## 📁 Estrutura do Projeto

```
backend/
├── AI-CDR.Backend.Api/
│   ├── Controllers/      # ChatController, FunctionsController, HealthController
│   ├── Services/         # AgendamentoService, ValidacaoAgendaService, ChatService
│   ├── Repositories/     # AgendamentoRepository, UnidadeRepository, ProcedimentoRepository
│   ├── Models/           # Agendamento, Unidade, Procedimento, SlotDisponibilidade
│   ├── DTOs/            # DTOs para requisições/respostas
│   └── Infrastructure/  # MongoDbContext
├── AI-CDR.Backend.Tests/ # Testes unitários e de integração
└── scripts/              # Scripts auxiliares
```

## 🔧 Troubleshooting

### Backend não inicia

1. Verificar logs:
   ```bash
   docker-compose -f docker-compose.backend.yml logs backend
   ```

2. Verificar se MongoDB está saudável:
   ```bash
   docker-compose -f docker-compose.backend.yml ps mongodb
   curl http://localhost:5000/Health
   ```

3. Rebuild:
   ```bash
   docker-compose -f docker-compose.backend.yml build --no-cache backend
   docker-compose -f docker-compose.backend.yml up -d
   ```

### MongoDB não conecta

1. Verificar se está rodando:
   ```bash
   docker ps | grep mongodb
   ```

2. Testar conexão:
   ```bash
   docker exec ai-cdr-mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. Verificar network:
   ```bash
   docker network inspect ai-cdr-network
   ```

### Porta em uso

Altere a porta no `docker-compose.backend.yml`:
```yaml
ports:
  - "5001:8080"  # Mude 5000 para 5001
```

## 📚 Documentação Adicional

- [TESTES.md](./TESTES.md) - Guia completo de testes
- [Swagger UI](http://localhost:5000/swagger) - Documentação interativa da API
