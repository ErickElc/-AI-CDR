using MongoDB.Driver;
using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Infrastructure;

public class MongoDbContext : IMongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(string connectionString, string databaseName)
    {
        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);
    }

    public IMongoCollection<Agendamento> Agendamentos => 
        _database.GetCollection<Agendamento>("agendamentos");

    public IMongoCollection<Unidade> Unidades => 
        _database.GetCollection<Unidade>("unidades");

    public IMongoCollection<Procedimento> Procedimentos => 
        _database.GetCollection<Procedimento>("procedimentos");
}

