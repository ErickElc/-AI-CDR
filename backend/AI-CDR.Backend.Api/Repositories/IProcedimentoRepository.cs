using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Repositories;

public interface IProcedimentoRepository
{
    Task<List<Procedimento>> ObterTodosAsync();
    Task<Procedimento?> ObterPorIdAsync(string id);
    Task<Procedimento?> ObterPorNomeAsync(string nome);
}


