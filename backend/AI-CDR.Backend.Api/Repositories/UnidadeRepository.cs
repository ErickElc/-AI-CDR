using MongoDB.Driver;
using AI_CDR.Backend.Infrastructure;
using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Repositories;

public class UnidadeRepository : IUnidadeRepository
{
    private readonly IMongoCollection<Unidade> _collection;

    public UnidadeRepository(IMongoDbContext context)
    {
        _collection = context.Unidades;
    }

    public async Task<List<Unidade>> ObterTodasAsync()
    {
        return await _collection.Find(u => u.Ativa).ToListAsync();
    }

    public async Task<Unidade?> ObterPorIdAsync(string id)
    {
        return await _collection.Find(u => u.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Unidade?> ObterPorNomeAsync(string nome)
    {
        return await _collection.Find(u => u.Nome == nome && u.Ativa).FirstOrDefaultAsync();
    }
}

