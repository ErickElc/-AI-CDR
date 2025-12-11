# Frontend - Agendamento Digital Inteligente

Interface React moderna com chat IA e agenda em tempo real.

## 🚀 Início Rápido

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build
```

Acesse: http://localhost:5173

## 🏗️ Arquitetura

### Layout Split View

- **Esquerda (40%)**: Chat com assistente virtual IA
- **Direita (60%)**: Agenda em tempo real com horários disponíveis

### Integração Backend

O frontend consome as seguintes APIs do backend (via proxy):

- `POST /api/chat/message` - Enviar mensagens ao assistente
- `GET /api/functions/unidades` - Listar unidades
- `GET /api/functions/procedimentos` - Listar especialidades
- `POST /api/functions/consultar-disponibilidade` - Verificar horários
- `POST /api/functions/criar-agendamento` - Criar agendamento

**Proxy configurado**: `/api/*` → `http://localhost:5062`

## 📦 Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **Material-UI (MUI)** - UI Components
- **React Query** - Server state management
- **Axios** - HTTP client
- **date-fns** - Date utilities

## 📁 Estrutura

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatContainer.tsx       # Container principal
│   │   ├── MessageList.tsx         # Lista de mensagens
│   │   └── MessageInput.tsx        # Input de mensagem
│   ├── Agenda/
│   │   ├── AgendaContainer.tsx     # Container principal
│   │   ├── AgendaFilters.tsx       # Filtros (unidade/especialidade)
│   │   └── WeekCalendar.tsx        # Calendário semanal
│   └── Layout/
│       └── MainLayout.tsx          # Layout principal
├── hooks/
│   ├── useChat.ts                  # Hook de chat
│   └── useAgenda.ts                # Hook de agenda
├── services/
│   ├── api.ts                      # Axios config
│   ├── chatService.ts              # API de chat
│   └── agendaService.ts            # API de agenda
├── types/
│   └── index.ts                    # TypeScript types
├── theme.ts                        # Material-UI theme
└── App.tsx                         # App principal
```

## 🎨 Features

### Chat
- ✅ Histórico de mensagens
- ✅ Typing indicator
- ✅ Avatar do bot
- ✅ Timestamps
- ✅ Auto-scroll
- ✅ Session persistence

### Agenda
- ✅ Filtros por unidade e especialidade
- ✅ Calendário semanal (5 dias)
- ✅ Horários: 08:30, 10:15, 14:00, 16:00
- ✅ Indicador visual de disponibilidade
- ✅ Auto-refresh a cada 30 segundos
- ✅ Integração com backend

## 🔧 Configuração

### Variáveis de Ambiente

O frontend usa proxy reverso configurado em `vite.config.ts`.

**Backend deve estar rodando em**: `http://localhost:5062`

### Customização

**Cores** - Edite `src/theme.ts`:
```typescript
primary: { main: '#2E7D7D' }  // Verde-azulado
secondary: { main: '#1A3A52' } // Azul escuro
```

**Horários** - Edite `src/hooks/useAgenda.ts`:
```typescript
const hours = ['08:30', '10:15', '14:00', '16:00'];
```

## 🧪 Desenvolvimento

```bash
# Desenvolvimento com hot reload
npm run dev

# Build
npm run build

# Preview da build
npm run preview

# Lint
npm run lint
```

## 📱 Responsividade

- **Desktop**: Split view 40/60
- **Tablet**: Split view 50/50
- **Mobile**: (TODO) Tabs para trocar entre chat e agenda

## 🔗 Integração Completa

### Fluxo de Uso

1. Usuário acessa a aplicação
2. Chat inicia com mensagem de boas-vindas
3. Usuário digita: "Quero agendar dermatologia"
4. Frontend → Backend → Orchestrator (LLM + RAG)
5. Bot responde sugerindo unidades
6. Usuário seleciona unidade na agenda
7. Agenda mostra horários disponíveis
8. Usuário seleciona horário
9. Bot confirma e cria agendamento
10. Agendamento salvo no MongoDB + Qdrant (RAG)

### Session Management

- Session ID armazenado no `localStorage`
- Persiste entre recarregamentos
- Um usuário = uma sessão de conversação

## 🚀 Deploy

```bash
# Build para produção
npm run build

# Servir com qualquer servidor HTTP
# Exemplo com serve:
npx serve -s dist
```

**Importante**: Configure variáveis de ambiente para apontar para o backend em produção.

## 📝 TODO

- [ ] Adicionar testes (Vitest)
- [ ] WebSocket para atualizações em tempo real
- [ ] Layout mobile (tabs)
- [ ] Loading states
- [ ] Error boundaries
- [ ] Accessibility (ARIA labels)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT
