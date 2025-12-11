using MongoDB.Driver;
using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Infrastructure;

public interface IMongoDbContext
{
    IMongoCollection<Agendamento> Agendamentos { get; }
    IMongoCollection<Unidade> Unidades { get; }
    IMongoCollection<Procedimento> Procedimentos { get; }
}


