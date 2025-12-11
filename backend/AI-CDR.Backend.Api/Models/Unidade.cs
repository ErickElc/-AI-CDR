using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AI_CDR.Backend.Models;

public class Unidade
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("nome")]
    public string Nome { get; set; } = string.Empty;

    [BsonElement("endereco")]
    public string Endereco { get; set; } = string.Empty;

    [BsonElement("ativa")]
    public bool Ativa { get; set; } = true;
}


