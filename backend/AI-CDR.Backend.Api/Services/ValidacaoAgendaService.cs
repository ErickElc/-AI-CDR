using AI_CDR.Backend.Models;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Services;

/// <summary>
/// Representa o resultado de uma validação de agenda.
/// </summary>
public class ValidacaoResultado
{
    /// <summary>
    /// Indica se a validação foi bem-sucedida.
    /// </summary>
    public bool Valido { get; set; }
    
    /// <summary>
    /// Mensagem de erro caso a validação tenha falhado.
    /// </summary>
    public string MensagemErro { get; set; } = string.Empty;
}

/// <summary>
/// Serviço responsável por validar regras de negócio relacionadas à agenda.
/// Implementa validações de horário comercial, geração de slots e verificação de duplicidade.
/// </summary>
public class ValidacaoAgendaService : IValidacaoAgendaService
{
    private readonly IAgendamentoRepository _agendamentoRepository;

    public ValidacaoAgendaService(IAgendamentoRepository agendamentoRepository)
    {
        _agendamentoRepository = agendamentoRepository;
    }

    /// <summary>
    /// Valida se o horário informado está dentro do horário comercial.
    /// Horário comercial: Segunda a Sexta, 08:00-12:00 e 14:00-18:00.
    /// </summary>
    /// <param name="dataHora">Data e hora a serem validadas.</param>
    /// <returns>Resultado da validação com mensagem de erro caso inválido.</returns>
    public ValidacaoResultado ValidarHorarioComercial(DateTime dataHora)
    {
        // Validar se a data não é no passado
        // Compara considerando apenas a data e hora, sem segundos/milissegundos
        var agora = DateTime.UtcNow;
        var dataHoraUtc = dataHora.Kind == DateTimeKind.Utc 
            ? dataHora 
            : dataHora.ToUniversalTime();
        
        if (dataHoraUtc < agora)
        {
            return new ValidacaoResultado
            {
                Valido = false,
                MensagemErro = "Não é possível agendar para uma data/hora no passado."
            };
        }

        // Validar se é sábado
        if (dataHora.DayOfWeek == DayOfWeek.Saturday)
        {
            return new ValidacaoResultado
            {
                Valido = false,
                MensagemErro = "Não atendemos aos sábados. Horário comercial: Segunda a Sexta, 08:00-12:00 e 14:00-18:00"
            };
        }

        // Validar se é domingo
        if (dataHora.DayOfWeek == DayOfWeek.Sunday)
        {
            return new ValidacaoResultado
            {
                Valido = false,
                MensagemErro = "Não atendemos aos domingos. Horário comercial: Segunda a Sexta, 08:00-12:00 e 14:00-18:00"
            };
        }

        var hora = dataHora.TimeOfDay;

        // Validar horário da manhã (08:00 - 12:00)
        var inicioManha = new TimeSpan(8, 0, 0);
        var fimManha = new TimeSpan(12, 0, 0);

        // Validar horário da tarde (14:00 - 18:00)
        var inicioTarde = new TimeSpan(14, 0, 0);
        var fimTarde = new TimeSpan(18, 0, 0);

        // Verificar se está no horário da manhã
        if (hora >= inicioManha && hora < fimManha)
        {
            return new ValidacaoResultado { Valido = true };
        }

        // Verificar se está no horário da tarde
        if (hora >= inicioTarde && hora < fimTarde)
        {
            return new ValidacaoResultado { Valido = true };
        }

        // Horário fora do comercial
        if (hora < inicioManha)
        {
            return new ValidacaoResultado
            {
                Valido = false,
                MensagemErro = $"Horário antes das 08:00. Horário comercial: Segunda a Sexta, 08:00-12:00 e 14:00-18:00"
            };
        }

        if (hora >= fimManha && hora < inicioTarde)
        {
            return new ValidacaoResultado
            {
                Valido = false,
                MensagemErro = $"Horário no período de almoço (12:00-14:00). Horário comercial: Segunda a Sexta, 08:00-12:00 e 14:00-18:00"
            };
        }

        return new ValidacaoResultado
        {
            Valido = false,
            MensagemErro = $"Horário após as 18:00. Horário comercial: Segunda a Sexta, 08:00-12:00 e 14:00-18:00"
        };
    }

    /// <summary>
    /// Gera todos os slots disponíveis para uma unidade em uma data específica.
    /// Slots são gerados de 30 em 30 minutos dentro do horário comercial.
    /// </summary>
    /// <param name="unidade">Nome da unidade.</param>
    /// <param name="data">Data para gerar os slots.</param>
    /// <returns>Lista de slots disponíveis (manhã: 08:00-12:00, tarde: 14:00-18:00).</returns>
    public List<SlotDisponibilidade> GerarSlotsDisponiveis(string unidade, DateTime data)
    {
        var slots = new List<SlotDisponibilidade>();

        // Gerar slots da manhã (08:00 - 12:00) - intervalos de 30 minutos
        var inicioManha = data.Date.AddHours(8);
        var fimManha = data.Date.AddHours(12);

        for (var hora = inicioManha; hora < fimManha; hora = hora.AddMinutes(30))
        {
            slots.Add(new SlotDisponibilidade
            {
                DataHora = hora,
                Unidade = unidade,
                Disponivel = true
            });
        }

        // Gerar slots da tarde (14:00 - 18:00) - intervalos de 30 minutos
        var inicioTarde = data.Date.AddHours(14);
        var fimTarde = data.Date.AddHours(18);

        for (var hora = inicioTarde; hora < fimTarde; hora = hora.AddMinutes(30))
        {
            slots.Add(new SlotDisponibilidade
            {
                DataHora = hora,
                Unidade = unidade,
                Disponivel = true
            });
        }

        // Marcar slots ocupados
        var agendamentos = _agendamentoRepository.ObterPorUnidadeEDataAsync(unidade, data).Result;
        var horariosOcupados = agendamentos
            .Where(a => a.Status != StatusAgendamento.Cancelado)
            .Select(a => a.DataHora)
            .ToHashSet();

        foreach (var slot in slots)
        {
            if (horariosOcupados.Contains(slot.DataHora))
            {
                slot.Disponivel = false;
            }
        }

        // 🚫 FILTRO: Remover slots com menos de 5 horas de antecedência
        // Evita que usuários agendem em horários muito próximos
        var minimoAntecedencia = DateTime.UtcNow.AddHours(5);
        slots = slots.Where(s => s.DataHora >= minimoAntecedencia).ToList();

        return slots;
    }

    /// <summary>
    /// Valida se já existe um agendamento duplicado.
    /// Considera duplicado se: mesmo nome OU (mesmo email, se fornecido) + mesma data/hora + mesma unidade.
    /// </summary>
    /// <param name="nomePaciente">Nome do paciente.</param>
    /// <param name="email">Email do paciente (opcional, mas ajuda a evitar duplicidades).</param>
    /// <param name="dataHora">Data e hora do agendamento.</param>
    /// <param name="unidade">Unidade do agendamento.</param>
    /// <returns>True se existe duplicado, False caso contrário.</returns>
    public async Task<bool> ValidarDuplicidadeAsync(string nomePaciente, string? email, DateTime dataHora, string unidade)
    {
        return await _agendamentoRepository.ExisteDuplicadoAsync(nomePaciente, email, dataHora, unidade);
    }
}

