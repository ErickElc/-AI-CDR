using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AI_CDR.Backend.Models;

public class Procedimento
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("nome")]
    public string Nome { get; set; } = string.Empty;

    [BsonElement("duracaoMinutos")]
    public int DuracaoMinutos { get; set; }
}


