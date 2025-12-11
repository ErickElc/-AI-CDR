using MongoDB.Driver;
using AI_CDR.Backend.Infrastructure;
using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Repositories;

public class AgendamentoRepository : IAgendamentoRepository
{
    private readonly IMongoCollection<Agendamento> _collection;

    public AgendamentoRepository(IMongoDbContext context)
    {
        _collection = context.Agendamentos;
    }

    public async Task<Agendamento?> ObterPorIdAsync(string id)
    {
        return await _collection.Find(a => a.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Agendamento> CriarAsync(Agendamento agendamento)
    {
        await _collection.InsertOneAsync(agendamento);
        return agendamento;
    }

    public async Task<Agendamento> AtualizarAsync(Agendamento agendamento)
    {
        await _collection.ReplaceOneAsync(a => a.Id == agendamento.Id, agendamento);
        return agendamento;
    }

    public async Task<List<Agendamento>> ObterPorUnidadeEDataAsync(string unidade, DateTime data)
    {
        var inicioDia = data.Date;
        var fimDia = inicioDia.AddDays(1);
        
        return await _collection
            .Find(a => a.Unidade == unidade && 
                      a.DataHora >= inicioDia && 
                      a.DataHora < fimDia &&
                      a.Status != StatusAgendamento.Cancelado)
            .ToListAsync();
    }

    public async Task<bool> ExisteDuplicadoAsync(string nomePaciente, string? email, DateTime dataHora, string unidade)
    {
        // Construir filtro de duplicidade: mesmo nome OU (mesmo email, se fornecido) + mesma data/hora + mesma unidade
        var filtrosDuplicidade = new List<FilterDefinition<Agendamento>>
        {
            Builders<Agendamento>.Filter.Eq(a => a.NomePaciente, nomePaciente)
        };

        // Se email fornecido, também verificar por email
        if (!string.IsNullOrWhiteSpace(email))
        {
            filtrosDuplicidade.Add(
                Builders<Agendamento>.Filter.And(
                    Builders<Agendamento>.Filter.Ne(a => a.Email, null),
                    Builders<Agendamento>.Filter.Eq(a => a.Email, email)
                )
            );
        }

        var filtro = Builders<Agendamento>.Filter.And(
            Builders<Agendamento>.Filter.Or(filtrosDuplicidade),
            Builders<Agendamento>.Filter.Eq(a => a.DataHora, dataHora),
            Builders<Agendamento>.Filter.Eq(a => a.Unidade, unidade),
            Builders<Agendamento>.Filter.Ne(a => a.Status, StatusAgendamento.Cancelado)
        );

        var agendamento = await _collection.Find(filtro).FirstOrDefaultAsync();
        return agendamento != null;
    }

    public async Task<List<Agendamento>> ObterTodosAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public async Task CreateManyAsync(IEnumerable<Agendamento> agendamentos)
    {
        await _collection.InsertManyAsync(agendamentos);
    }

    public async Task<long> DeleteManyAsync(System.Linq.Expressions.Expression<System.Func<Agendamento, bool>> filter)
    {
        var result = await _collection.DeleteManyAsync(filter);
        return result.DeletedCount;
    }
}

