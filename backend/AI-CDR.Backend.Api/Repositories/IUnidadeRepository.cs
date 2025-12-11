using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Repositories;

public interface IUnidadeRepository
{
    Task<List<Unidade>> ObterTodasAsync();
    Task<Unidade?> ObterPorIdAsync(string id);
    Task<Unidade?> ObterPorNomeAsync(string nome);
}


