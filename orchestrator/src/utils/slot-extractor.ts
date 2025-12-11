/**
 * Extrator de slots com RAG integrado
 * CRÍTICO: Extrai slots de TODAS as mensagens e enriquece com RAG
 */

import { ChatOpenAI } from '@langchain/openai';
import { EmbeddingService } from '../rag/embedding-service';
import { ContextRetrieval } from '../rag/context-retrieval';
import { ExtractedSlots, Slots, RAGContext, SlotSuggestions } from '../types';
import { SLOT_EXTRACTION_PROMPT } from '../prompts/slot-extraction-prompt';
import { env } from '../config/env';

export class SlotExtractor {
  private llm: ChatOpenAI;
  private embeddingService: EmbeddingService;
  private contextRetrieval: ContextRetrieval;

  constructor(
    embeddingService: EmbeddingService,
    contextRetrieval: ContextRetrieval
  ) {
    this.llm = new ChatOpenAI({
      modelName: env.openai.model,
      temperature: 0.1, // Baixa temperatura para extração precisa
      openAIApiKey: env.openai.apiKey,
    });
    this.embeddingService = embeddingService;
    this.contextRetrieval = contextRetrieval;
  }

  /**
   * Extrai slots de uma mensagem e enriquece com RAG
   * IMPORTANTE: Chamado em TODAS as mensagens, não apenas na inicial
   */
  async extractSlotsFromMessage(
    message: string,
    existingSlots?: Partial<Slots>,
    currentDateInfo?: string // Nova: informações de data do backend
  ): Promise<ExtractedSlots> {
    console.log('  🔎 [SlotExtractor] Iniciando extração...');
    console.log('    Mensagem:', message);
    if (existingSlots && Object.keys(existingSlots).length > 0) {
      const slotKeys = Object.keys(existingSlots).filter(k => existingSlots[k as keyof typeof existingSlots]);
      console.log('    Slots existentes:', slotKeys.join(', '));
    }
    if (currentDateInfo) {
      console.log('    Data atual (backend):', currentDateInfo);
    }

    // Passo 1: Extração inicial via LLM (com contexto de data se disponível)
    const extractionResult = await this.extractWithLLM(message, currentDateInfo);
    console.log('    Resultado da extração LLM:', JSON.stringify(extractionResult, null, 2));

    // Se o LLM falhou e usou RAG como fallback, extractionResult já contém ragContext
    if (extractionResult.ragContext) {
      // Já temos o contexto RAG do fallback, apenas enriquecer
      const enrichedSlots = await this.enrichSlotsWithRAG(extractionResult, extractionResult.ragContext);

      // CRITICAL: Merge inteligente - só manter slots existentes se NADA foi extraído
      const shouldKeepOldSlots = extractionResult.confidence < 0.3;

      const merged = {
        nome: extractionResult.nome || (shouldKeepOldSlots ? existingSlots?.nome : undefined),
        procedimento: extractionResult.procedimento || (shouldKeepOldSlots ? existingSlots?.procedimento : undefined),
        unidade: extractionResult.unidade || (shouldKeepOldSlots ? existingSlots?.unidade : undefined),
        data: extractionResult.data || (shouldKeepOldSlots ? existingSlots?.data : undefined),
        horario: extractionResult.horario || (shouldKeepOldSlots ? existingSlots?.horario : undefined),
        email: extractionResult.email || existingSlots?.email, // Email sempre persiste
        confidence: extractionResult.confidence,
        ragContext: extractionResult.ragContext,
        suggestions: enrichedSlots.suggestions,
      };

      console.log('    Slots após merge (com RAG):', JSON.stringify(merged, null, 2));
      return merged;
    }

    // Passo 2: Busca RAG com base nos slots parciais extraídos (fluxo normal)
    let ragContext;
    try {
      ragContext = await this.contextRetrieval.retrieveContext(
        message,
        extractionResult
      );
      // Log resumido do RAG context
      const ragSummary = {
        faqs: ragContext.faqResults?.length || 0,
        similarConversations: ragContext.similarConversations?.length || 0,
        appointmentHistory: ragContext.appointmentHistory?.length || 0
      };
      console.log('    📊 RAG:', `${ragSummary.faqs} FAQs, ${ragSummary.similarConversations} conversas, ${ragSummary.appointmentHistory} histórico`);
    } catch (error) {
      console.error('Erro ao buscar contexto RAG:', error);
      ragContext = {};
    }

    // Passo 3: Enriquecimento de slots usando informações do RAG
    const enrichedSlots = await this.enrichSlotsWithRAG(extractionResult, ragContext);
    console.log('    Slots enriquecidos com RAG:', JSON.stringify(enrichedSlots, null, 2));

    // CRITICAL: Merge inteligente - só manter slots existentes se NADA foi extraído agora
    // Se confidence > 0.3, significa que usuário disse ALGO, então não usar slots antigos
    const shouldKeepOldSlots = extractionResult.confidence < 0.3;

    const finalSlots: ExtractedSlots = {
      nome: extractionResult.nome || (shouldKeepOldSlots ? existingSlots?.nome : undefined),
      procedimento: extractionResult.procedimento || (shouldKeepOldSlots ? existingSlots?.procedimento : undefined),
      unidade: extractionResult.unidade || (shouldKeepOldSlots ? existingSlots?.unidade : undefined),
      data: extractionResult.data || (shouldKeepOldSlots ? existingSlots?.data : undefined),
      horario: extractionResult.horario || (shouldKeepOldSlots ? existingSlots?.horario : undefined),
      email: extractionResult.email || existingSlots?.email, // Email sempre persiste
      confidence: extractionResult.confidence,
      ragContext,
      suggestions: enrichedSlots.suggestions,
    };

    const finalKeys = Object.entries(finalSlots)
      .filter(([k, v]) => v && k !== 'ragContext' && k !== 'suggestions' && k !== 'confidence')
      .map(([k]) => k);
    console.log('    ✅ Slots finais:', finalKeys.join(', '));
    console.log('  ✅ [SlotExtractor] Extração concluída');

    return finalSlots;
  }

  /**
   * Extrai slots usando LLM com prompt estruturado
   */
  private async extractWithLLM(
    message: string,
    currentDateInfo?: string
  ): Promise<ExtractedSlots> {
    try {
      // Construir prompt do sistema com data atual se disponível
      let systemPrompt = SLOT_EXTRACTION_PROMPT;
      if (currentDateInfo) {
        systemPrompt = `${currentDateInfo}\n\n⚠️ IMPORTANTE: Ao calcular datas relativas (próxima segunda, amanhã, etc), use SEMPRE a DATA ATUAL acima como referência!\n\n${SLOT_EXTRACTION_PROMPT}`;
      }

      const response = await this.llm.invoke([
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Extraia os slots da seguinte mensagem: "${message}"\n\nRetorne APENAS um objeto JSON válido, sem markdown, sem código, sem explicações.`,
        },
      ]);

      let content = response.content as string;

      // Remover markdown code blocks se existirem
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Tentar extrair JSON se estiver dentro de texto
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }

      const parsed = JSON.parse(content);

      return {
        nome: parsed.nome || undefined,
        procedimento: parsed.procedimento || undefined,
        unidade: parsed.unidade || undefined,
        data: parsed.data || undefined,
        horario: parsed.horario || undefined,
        email: parsed.email || undefined,
        confidence: parsed.confidence || 0.0,
      };
    } catch (error) {
      console.error('Erro ao extrair slots com LLM:', error);
      // Fallback: usar RAG com vectorDB para extrair slots de conversas similares
      console.log('Usando RAG/Qdrant como fallback para extração de slots...');
      return this.extractWithRAG(message);
    }
  }

  /**
   * Extração usando RAG/Qdrant como fallback quando LLM falha
   * Busca conversas similares no vectorDB e extrai slots delas
   */
  private async extractWithRAG(message: string): Promise<ExtractedSlots> {
    try {
      // Usar ContextRetrieval para buscar contexto relevante
      const ragContext = await this.contextRetrieval.retrieveContext(message);

      const slots: ExtractedSlots = {
        confidence: 0.5, // Confiança média para RAG
        ragContext, // Incluir contexto para não precisar buscar novamente
      };

      // Se encontrou conversas similares, extrair slots delas
      if (ragContext.similarConversations && ragContext.similarConversations.length > 0) {
        // Agregar slots das conversas mais similares
        const allSlots: Array<Partial<Slots>> = [];

        ragContext.similarConversations.forEach(conv => {
          if (conv.slots) {
            allSlots.push(conv.slots);
          }
        });

        // Extrair slots mais comuns ou de maior score
        if (allSlots.length > 0) {
          // Nome: pegar o mais comum ou de maior score
          const nomes = allSlots
            .map(s => s.nome)
            .filter((n): n is string => n !== undefined && n !== null);
          if (nomes.length > 0) {
            slots.nome = nomes[0]; // Pegar o primeiro (maior score)
          }

          // Procedimento: pegar o mais comum
          const procedimentos = allSlots
            .map(s => s.procedimento)
            .filter((p): p is string => p !== undefined && p !== null);
          if (procedimentos.length > 0) {
            slots.procedimento = procedimentos[0];
          }

          // Unidade: pegar o mais comum
          const unidades = allSlots
            .map(s => s.unidade)
            .filter((u): u is string => u !== undefined && u !== null);
          if (unidades.length > 0) {
            slots.unidade = unidades[0];
          }

          // Data: pegar a mais recente ou comum
          const datas = allSlots
            .map(s => s.data)
            .filter((d): d is string => d !== undefined && d !== null);
          if (datas.length > 0) {
            slots.data = datas[0];
          }

          // Horário: pegar o mais comum
          const horarios = allSlots
            .map(s => s.horario)
            .filter((h): h is string => h !== undefined && h !== null);
          if (horarios.length > 0) {
            slots.horario = horarios[0];
          }
        }

        // Ajustar confiança baseado no score das conversas similares
        const avgScore = ragContext.similarConversations.reduce((sum, conv) => sum + (conv.score || 0), 0) / ragContext.similarConversations.length;
        slots.confidence = Math.min(0.7, avgScore * 0.8); // Máximo 0.7 para RAG
      }

      // Se encontrou histórico de agendamentos, usar informações deles
      if (ragContext.appointmentHistory && ragContext.appointmentHistory.length > 0) {
        const history = ragContext.appointmentHistory[0];

        // Preencher slots faltantes com informações do histórico
        if (!slots.nome && history.nomePaciente) {
          slots.nome = history.nomePaciente;
        }
        if (!slots.procedimento && history.procedimento) {
          slots.procedimento = history.procedimento;
        }
        if (!slots.unidade && history.unidade) {
          slots.unidade = history.unidade;
        }

        // Aumentar confiança se encontrou agendamento
        slots.confidence = Math.max(slots.confidence, 0.6);
      }

      return slots;
    } catch (error) {
      console.error('Erro ao extrair slots com RAG:', error);
      // Se RAG também falhar, retornar slots vazios
      return {
        confidence: 0.0,
        ragContext: {}, // Contexto vazio para evitar chamadas adicionais
      };
    }
  }

  /**
   * Enriquece slots com informações do RAG
   */
  async enrichSlotsWithRAG(
    slots: Partial<ExtractedSlots>,
    ragContext?: RAGContext
  ): Promise<{ suggestions: SlotSuggestions }> {
    if (!ragContext) {
      return { suggestions: {} };
    }
    const suggestions: SlotSuggestions = {};

    // Se houver histórico de agendamentos, extrair preferências
    if (ragContext?.appointmentHistory && ragContext.appointmentHistory.length > 0) {
      const history = ragContext.appointmentHistory[0];
      if (history.preferences) {
        suggestions.unidades = history.preferences.preferredUnits;
        suggestions.procedimentos = history.preferences.frequentProcedures;
        suggestions.horarios = history.preferences.preferredTimes;
      }
    }

    // Se houver conversas similares, extrair padrões
    if (ragContext?.similarConversations && ragContext.similarConversations.length > 0) {
      const similarSlots = ragContext.similarConversations
        .map(conv => conv.slots)
        .filter(s => s);

      // Agregar unidades mais comuns
      const unidades = similarSlots
        .map(s => s.unidade)
        .filter((u): u is string => u !== undefined);
      if (unidades.length > 0 && !suggestions.unidades) {
        suggestions.unidades = [...new Set(unidades)];
      }

      // Agregar procedimentos mais comuns
      const procedimentos = similarSlots
        .map(s => s.procedimento)
        .filter((p): p is string => p !== undefined);
      if (procedimentos.length > 0 && !suggestions.procedimentos) {
        suggestions.procedimentos = [...new Set(procedimentos)];
      }
    }

    return { suggestions };
  }
}

