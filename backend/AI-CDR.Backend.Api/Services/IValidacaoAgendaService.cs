using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Services;

public interface IValidacaoAgendaService
{
    ValidacaoResultado ValidarHorarioComercial(DateTime dataHora);
    List<SlotDisponibilidade> GerarSlotsDisponiveis(string unidade, DateTime data);
    Task<bool> ValidarDuplicidadeAsync(string nomePaciente, string? email, DateTime dataHora, string unidade);
}

