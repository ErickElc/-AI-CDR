/**
 * Agente principal LangChain com integração completa
 */

import { ChatOpenAI } from '@langchain/openai';
import { ShortTermMemory } from '../memory/short-term-memory';
import { SlotExtractor } from '../utils/slot-extractor';
import { FunctionExecutor } from '../functions/function-executor';
import { ContextRetrieval } from '../rag/context-retrieval';
import { FallbackDetector } from '../fallback/fallback-detector';
import { ValidationService } from '../services/validation.service';
import { FunctionCallHandler } from '../services/function-call-handler';
import { DataPreloadService } from '../services/data-preload.service';
import { SuggestionEngine } from '../services/suggestion-engine.service';
// 🆕 SOLID Services
import { ScenarioDetectorService } from '../services/scenario-detector.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { ResponseParserService } from '../services/response-parser.service';
import { ProactivityEngineService } from '../services/proactivity-engine.service';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { getScenarioPrompt } from '../prompts/scenario-prompts';
import { FUNCTION_DEFINITIONS } from '../functions/function-definitions';
import { env } from '../config/env';
import {
  OrchestratorRequest,
  OrchestratorResponse,
  FunctionCall,
  FunctionCallResult,
  SessionMemory,
  Slots,
} from '../types';

export class Agent {
  private llm: ChatOpenAI;
  private memory: ShortTermMemory;
  private slotExtractor: SlotExtractor;
  private functionExecutor: FunctionExecutor;
  private contextRetrieval: ContextRetrieval;
  private fallbackDetector: FallbackDetector;
  private validationService: ValidationService;
  private functionCallHandler: FunctionCallHandler;
  private dataPreloadService: DataPreloadService;
  private suggestionEngine: SuggestionEngine;

  // 🆕 SOLID Services
  private scenarioDetector: ScenarioDetectorService;
  private promptBuilder: PromptBuilderService;
  private responseParser: ResponseParserService;
  private proactivityEngine: ProactivityEngineService;

  constructor(
    memory: ShortTermMemory,
    slotExtractor: SlotExtractor,
    functionExecutor: FunctionExecutor,
    contextRetrieval: ContextRetrieval
  ) {
    this.llm = new ChatOpenAI({
      modelName: env.openai.model,
      temperature: env.openai.temperature,
      openAIApiKey: env.openai.apiKey,
    });

    this.memory = memory;
    this.slotExtractor = slotExtractor;
    this.functionExecutor = functionExecutor;
    this.contextRetrieval = contextRetrieval;
    this.fallbackDetector = new FallbackDetector();

    // Inicializar novos serviços
    this.validationService = new ValidationService(functionExecutor);
    this.suggestionEngine = new SuggestionEngine();
    this.dataPreloadService = new DataPreloadService(functionExecutor);
    this.functionCallHandler = new FunctionCallHandler(functionExecutor, this.llm, this.suggestionEngine);

    // 🆕 Inicializar SOLID Services
    this.scenarioDetector = new ScenarioDetectorService();
    this.promptBuilder = new PromptBuilderService(
      this.dataPreloadService,
      env.backend.url
    );
    this.responseParser = new ResponseParserService();
    this.proactivityEngine = new ProactivityEngineService();

    // Pré-carregar dados do backend (async não-bloqueante)
    this.dataPreloadService.preloadAllData().catch(err => {
      console.error('Erro ao pré-carregar dados:', err);
    });
  }

  /**
   * Processa uma mensagem e retorna resposta
   */
  async processMessage(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    console.log('\n🎯 ========== PROCESSANDO MENSAGEM ==========');
    console.log(`📥 "${request.message}"`);

    // Recuperar ou criar sessão
    let session = this.memory.getSession(request.sessionId);

    if (!session) {
      if (request.sessionId && request.sessionId.trim() !== '') {
        this.memory.createSession(request.sessionId);
        session = this.memory.getSession(request.sessionId)!;
        console.log('✅ Nova sessão:', request.sessionId.substring(0, 8) + '...');
      } else {
        const sessionId = this.memory.createSession();
        session = this.memory.getSession(sessionId)!;
        request.sessionId = sessionId;
        console.log('✅ Nova sessão:', sessionId.substring(0, 8) + '...');
      }
    }

    // Adicionar mensagem do usuário
    this.memory.addMessage(request.sessionId, 'user', request.message);

    // BUSCAR DATA ATUAL DO BACKEND para passar ao extractor
    console.log('📅 Buscando data atual do backend...');
    let currentDateInfo = '';
    try {
      const response = await fetch(`${this.functionExecutor['backendUrl']}/api/system/current-datetime`);
      if (response.ok) {
        const data = await response.json() as {
          date: string;
          dayOfWeek: string;
          formattedDate: string;
        };
        currentDateInfo = `DATA ATUAL: ${data.formattedDate} (${data.date}) - ${data.dayOfWeek}`;
        console.log(`  ✅ ${currentDateInfo}`);
      }
    } catch (error) {
      console.warn('  ⚠️ Erro ao buscar data do backend:', error);
      const now = new Date();
      currentDateInfo = `DATA ATUAL: ${now.toLocaleDateString('pt-BR')} (${now.toISOString().split('T')[0]})`;
    }

    // Extrair slots da mensagem com contexto de data
    const extractedSlots = await this.slotExtractor.extractSlotsFromMessage(
      request.message,
      session.slots,
      currentDateInfo
    );

    // Atualizar slots na sessão (merge com existentes)
    if (extractedSlots.nome) {
      console.log('  ✅ Nome extraído:', extractedSlots.nome);
      session.slots.nome = extractedSlots.nome;
    }
    if (extractedSlots.procedimento) {
      console.log('  ✅ Procedimento extraído:', extractedSlots.procedimento);
      session.slots.procedimento = extractedSlots.procedimento;
    }
    if (extractedSlots.unidade) {
      console.log('  ✅ Unidade extraída:', extractedSlots.unidade);
      session.slots.unidade = extractedSlots.unidade;
    }
    if (extractedSlots.data) {
      console.log('  ✅ Data extraída:', extractedSlots.data);
      session.slots.data = extractedSlots.data;
    }
    if (extractedSlots.horario) {
      console.log('  ✅ Horário extraído:', extractedSlots.horario);
      session.slots.horario = extractedSlots.horario;
    }
    if (extractedSlots.email) {
      console.log('  ✅ Email extraído:', extractedSlots.email);
      session.slots.email = extractedSlots.email;
    }

    // Validar slots com backend
    const validationContext = await this.validationService.validateAllSlots(session.slots);

    this.memory.updateSlots(request.sessionId, session.slots);

    // Buscar contexto RAG
    const ragContext = await this.contextRetrieval.retrieveContext(
      request.message,
      session.slots
    );

    // 🆕 Detectar cenário usando SOLID service
    const scenario = this.scenarioDetector.detectScenario(session, extractedSlots);
    this.memory.updateContext(request.sessionId, { scenario });

    // Verificar fallback
    const fallback = this.fallbackDetector.detect(session);
    if (fallback.needsHuman) {
      this.fallbackDetector.incrementFallbackCount(session);
      return {
        response: 'Entendo que você precisa de ajuda adicional. Vou redirecionar você para um atendente humano. 😊',
        slots: session.slots,
        needsHuman: true,
        scenario,
      };
    }

    // 🆕 Construir prompt com contexto usando SOLID service
    console.log('📝 Construindo prompt...');
    console.log('  Cenário detectado:', scenario);
    const prompt = await this.promptBuilder.buildPrompt(session, ragContext, scenario, validationContext);

    // 🆕 MIDDLEWARE PROATIVO - Usa SOLID service
    const forcedFunctionCalls = this.proactivityEngine.determineForcedFunctionCalls(scenario, session.slots);

    if (forcedFunctionCalls.length > 0) {
      console.log(`\n⚡ MIDDLEWARE PROATIVO: Forçando ${forcedFunctionCalls.length} chamada(s) de função`);
      forcedFunctionCalls.forEach((fc: FunctionCall) => {
        console.log(`  → ${fc.functionName}(${JSON.stringify(fc.parameters)})`);
      });

      const result = await this.functionCallHandler.processAndRespond(
        forcedFunctionCalls,
        request.message,
        session.slots
      );

      this.memory.addMessage(request.sessionId, 'assistant', result.text);

      return {
        response: result.text,
        slots: session.slots,
        functionCalls: result.functionCalls,
        scenario,
      };
    }

    // Chamar LLM com function calling (só se não foi forçado)
    const response = await this.callLLMWithFunctions(prompt, session);

    // Processa function calls se houver
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(`\n📞 FUNCTION CALLING (${response.functionCalls.length} chamadas):`);
      for (const fc of response.functionCalls) {
        console.log(`  → ${fc.functionName}(${JSON.stringify(fc.parameters)})`);
      }

      const result = await this.functionCallHandler.processAndRespond(
        response.functionCalls,
        request.message,
        session.slots
      );

      this.memory.addMessage(request.sessionId, 'assistant', result.text);

      // 🔄 RESET SLOTS: Se agendamento foi criado, limpar slots para próxima conversa
      // Detectar sucesso através das function calls e resposta
      let sessionCompleted = false;
      if (result.functionCalls?.some(fc => fc.functionName === 'criar_agendamento')) {
        // Se a resposta contém mensagem de sucesso, limpar slots
        if (result.text.includes('confirmado com sucesso') || result.text.includes('✅')) {
          console.log('🔄 Agendamento criado! Limpando slots para próxima conversa...');
          session.slots = {}; // Limpar todos os slots
          this.memory.updateSlots(request.sessionId, session.slots);
          sessionCompleted = true; // 🎯 Sinalizar que sessão foi completada
        }
      }

      return {
        response: result.text,
        slots: session.slots,
        functionCalls: result.functionCalls,
        scenario,
        sessionCompleted, // 🎯 Informar frontend que pode iniciar nova sessão
      };
    }

    // 🆕 Extrair slots mencionados na resposta do LLM usando SOLID service
    const extractedFromResponse = this.responseParser.parseResponseForSlots(response.text);
    if (Object.keys(extractedFromResponse).length > 0) {
      Object.assign(session.slots, extractedFromResponse);
      this.memory.updateSlots(request.sessionId, session.slots);
    }

    // Adicionar resposta à memória
    this.memory.addMessage(request.sessionId, 'assistant', response.text);

    console.log('📤 Resposta final');
    console.log('🎯 ========== FIM DO PROCESSAMENTO ==========\n');

    return {
      response: response.text,
      slots: session.slots,
      scenario,
    };
  }

  /**
   * Chama LLM com function calling
   */
  private async callLLMWithFunctions(
    prompt: string,
    session: SessionMemory
  ): Promise<{ text: string; functionCalls?: FunctionCall[] }> {
    const recentMessages = this.memory.getRecentMessages(session.sessionId, 10);

    // Construir mensagens no formato LangChain
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: prompt },
    ];

    recentMessages.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    try {
      // Converter definições para formato LangChain
      const tools = FUNCTION_DEFINITIONS.map(fn => ({
        type: 'function' as const,
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters,
        },
      }));

      console.log(`🔧 LLM configurado com ${tools.length} tools disponíveis:`, tools.map(t => t.function.name).join(', '));

      // Bind tools ao LLM
      const llmWithTools = this.llm.bindTools(tools);

      // Se scenario greeting, forçar LLM a chamar função
      const invokeOptions: any = {};
      const scenario = (session as any).context?.scenario;

      if (scenario === 'greeting') {
        // tool_choice: "auto" força o modelo a considerar as ferramentas mais fortemente
        invokeOptions.tool_choice = "auto";
        console.log('  🎯 Forçando consideração de tools para greeting');
      }

      const response = await llmWithTools.invoke(messages, invokeOptions);

      console.log('🤖 Resposta do LLM recebida');
      console.log('  tool_calls?', response.tool_calls ? `SIM (${response.tool_calls.length})` : 'NÃO');

      // Verificar se há tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`📞 LLM CHAMOU ${response.tool_calls.length} FUNCTIONS:`);
        response.tool_calls.forEach((tc: any) => {
          console.log(`  → ${tc.name}(${JSON.stringify(tc.args)})`);
        });

        const functionCalls: FunctionCall[] = response.tool_calls.map((tc: any) => ({
          functionName: tc.name,
          parameters: tc.args as Record<string, unknown>,
        }));

        // ⚠️ IMPORTANTE: Ignorar texto intermediário quando há function calls
        // O LLM pode gerar texto como "Vou consultar..." mas queremos APENAS
        // a resposta gerada APÓS executar as funções
        return {
          text: '', // ← Texto vazio! Só usaremos a resposta pós-execução
          functionCalls,
        };
      }

      console.log('  ℹ️ LLM não chamou nenhuma função (resposta direta)');
      return {
        text: response.content as string,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Erro ao chamar LLM:', error);
      return {
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Pode repetir?',
      };
    }
  }

  /**
   * Gera resposta final após executar função
   */
  private async generateFinalResponse(
    session: SessionMemory,
    functionCall: FunctionCall,
    result: any,
    userMessage: string
  ): Promise<string> {
    const prompt = `${SYSTEM_PROMPT}

## RESULTADO DA FUNÇÃO
Função: ${functionCall.functionName}
Resultado: ${JSON.stringify(result.data, null, 2)}

## MENSAGEM DO USUÁRIO
${userMessage}

## SLOTS COLETADOS
${JSON.stringify(session.slots, null, 2)}

Gere uma resposta natural e amigável baseada no resultado da função. Se a função foi bem-sucedida, confirme os dados. Se houve erro, explique de forma amigável e ofereça alternativas.`;

    const response = await this.llm.invoke([{ role: 'user', content: prompt }]);
    return response.content as string;
  }
}

