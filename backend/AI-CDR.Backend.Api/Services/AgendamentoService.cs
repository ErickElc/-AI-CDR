using AI_CDR.Backend.Models;
using AI_CDR.Backend.Repositories;
using Microsoft.Extensions.Logging;

namespace AI_CDR.Backend.Services;

/// <summary>
/// Representa o resultado de uma operação de agendamento.
/// </summary>
public class AgendamentoResultado
{
    /// <summary>
    /// Indica se a operação foi bem-sucedida.
    /// </summary>
    public bool Sucesso { get; set; }
    
    /// <summary>
    /// Agendamento criado (quando sucesso = true).
    /// </summary>
    public Agendamento? Agendamento { get; set; }
    
    /// <summary>
    /// Mensagem de erro caso a operação tenha falhado.
    /// </summary>
    public string MensagemErro { get; set; } = string.Empty;
}

/// <summary>
/// Serviço responsável pelo gerenciamento de agendamentos.
/// Implementa a lógica de criação de agendamentos com validações de negócio.
/// </summary>
public class AgendamentoService : IAgendamentoService
{
    private readonly IAgendamentoRepository _agendamentoRepository;
    private readonly IValidacaoAgendaService _validacaoAgendaService;
    private readonly IValidacaoDadosService _validacaoDadosService;
    private readonly IQdrantSyncService _qdrantSyncService;
    private readonly ILogger<AgendamentoService> _logger;

    public AgendamentoService(
        IAgendamentoRepository agendamentoRepository,
        IValidacaoAgendaService validacaoAgendaService,
        IValidacaoDadosService validacaoDadosService,
        IQdrantSyncService qdrantSyncService,
        ILogger<AgendamentoService> logger)
    {
        _agendamentoRepository = agendamentoRepository;
        _validacaoAgendaService = validacaoAgendaService;
        _validacaoDadosService = validacaoDadosService;
        _qdrantSyncService = qdrantSyncService;
        _logger = logger;
    }

    /// <summary>
    /// Cria um novo agendamento após validar horário comercial e duplicidade.
    /// </summary>
    /// <param name="agendamento">Dados do agendamento a ser criado.</param>
    /// <returns>Resultado da operação com o agendamento criado ou mensagem de erro.</returns>
    public async Task<AgendamentoResultado> CriarAgendamentoAsync(Agendamento agendamento)
    {
        // 1. Validar procedimento existe no banco
        var (procedimentoValido, erroProcedimento) = await _validacaoDadosService.ValidarProcedimentoAsync(agendamento.Procedimento);
        if (!procedimentoValido)
        {
            return new AgendamentoResultado
            {
                Sucesso = false,
                MensagemErro = erroProcedimento
            };
        }

        // 2. Validar unidade existe e está ativa
        var (unidadeValida, erroUnidade) = await _validacaoDadosService.ValidarUnidadeAsync(agendamento.Unidade);
        if (!unidadeValida)
        {
            return new AgendamentoResultado
            {
                Sucesso = false,
                MensagemErro = erroUnidade
            };
        }

        // 3. Validar horário comercial
        var validacaoHorario = _validacaoAgendaService.ValidarHorarioComercial(agendamento.DataHora);
        if (!validacaoHorario.Valido)
        {
            return new AgendamentoResultado
            {
                Sucesso = false,
                MensagemErro = validacaoHorario.MensagemErro
            };
        }

        // Validar duplicidade (considera nome OU email + data/hora + unidade)
        var existeDuplicado = await _validacaoAgendaService.ValidarDuplicidadeAsync(
            agendamento.NomePaciente,
            agendamento.Email,
            agendamento.DataHora,
            agendamento.Unidade);

        if (existeDuplicado)
        {
            var mensagemDuplicidade = string.IsNullOrWhiteSpace(agendamento.Email)
                ? $"Já existe um agendamento para {agendamento.NomePaciente} no mesmo horário e unidade."
                : $"Já existe um agendamento para {agendamento.NomePaciente} (email: {agendamento.Email}) no mesmo horário e unidade.";
            
            return new AgendamentoResultado
            {
                Sucesso = false,
                MensagemErro = mensagemDuplicidade
            };
        }

        // Criar agendamento
        agendamento.CriadoEm = DateTime.UtcNow;
        agendamento.Status = StatusAgendamento.Pendente;
        
        var agendamentoCriado = await _agendamentoRepository.CriarAsync(agendamento);

        // Sincronizar com Qdrant para RAG (não-bloqueante)
        _ = Task.Run(async () =>
        {
            try
            {
                await _qdrantSyncService.SyncAppointmentAsync(agendamentoCriado);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao sincronizar agendamento {Id} com Qdrant (não-crítico)", agendamentoCriado.Id);
            }
        });

        return new AgendamentoResultado
        {
            Sucesso = true,
            Agendamento = agendamentoCriado
        };
    }

    /// <summary>
    /// Consulta a disponibilidade de slots para uma unidade em uma data específica.
    /// </summary>
    /// <param name="unidade">Nome da unidade.</param>
    /// <param name="data">Data para consultar disponibilidade.</param>
    /// <returns>Lista de slots disponíveis.</returns>
    public async Task<List<SlotDisponibilidade>> ConsultarDisponibilidadeAsync(string unidade, DateTime data)
    {
        return _validacaoAgendaService.GerarSlotsDisponiveis(unidade, data);
    }
}

