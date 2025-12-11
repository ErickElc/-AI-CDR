using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Services;

public interface IAgendamentoService
{
    Task<AgendamentoResultado> CriarAgendamentoAsync(Agendamento agendamento);
    Task<List<SlotDisponibilidade>> ConsultarDisponibilidadeAsync(string unidade, DateTime data);
}


