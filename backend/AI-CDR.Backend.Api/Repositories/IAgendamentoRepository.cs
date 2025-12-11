using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Repositories;

public interface IAgendamentoRepository
{
    Task<Agendamento?> ObterPorIdAsync(string id);
    Task<Agendamento> CriarAsync(Agendamento agendamento);
    Task<Agendamento> AtualizarAsync(Agendamento agendamento);
    Task<List<Agendamento>> ObterPorUnidadeEDataAsync(string unidade, DateTime data);
    Task<bool> ExisteDuplicadoAsync(string nomePaciente, string? email, DateTime dataHora, string unidade);
    Task<List<Agendamento>> ObterTodosAsync();
    
    // Métodos para seed de dados de teste
    Task CreateManyAsync(IEnumerable<Agendamento> agendamentos);
    Task<long> DeleteManyAsync(System.Linq.Expressions.Expression<System.Func<Agendamento, bool>> filter);
}

