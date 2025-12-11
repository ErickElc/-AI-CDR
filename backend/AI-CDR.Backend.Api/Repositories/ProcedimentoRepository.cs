using MongoDB.Driver;
using AI_CDR.Backend.Infrastructure;
using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Repositories;

public class ProcedimentoRepository : IProcedimentoRepository
{
    private readonly IMongoCollection<Procedimento> _collection;

    public ProcedimentoRepository(IMongoDbContext context)
    {
        _collection = context.Procedimentos;
    }

    public async Task<List<Procedimento>> ObterTodosAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public async Task<Procedimento?> ObterPorIdAsync(string id)
    {
        return await _collection.Find(p => p.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Procedimento?> ObterPorNomeAsync(string nome)
    {
        return await _collection.Find(p => p.Nome == nome).FirstOrDefaultAsync();
    }
}

