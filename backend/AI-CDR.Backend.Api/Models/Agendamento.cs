using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AI_CDR.Backend.Models;

public class Agendamento
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("nomePaciente")]
    public string NomePaciente { get; set; } = string.Empty;

    [BsonElement("procedimento")]
    public string Procedimento { get; set; } = string.Empty;

    [BsonElement("unidade")]
    public string Unidade { get; set; } = string.Empty;

    [BsonElement("dataHora")]
    public DateTime DataHora { get; set; }

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public StatusAgendamento Status { get; set; } = StatusAgendamento.Pendente;

    [BsonElement("criadoEm")]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    [BsonElement("sessionId")]
    public string? SessionId { get; set; }

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("googleCalendarEventId")]
    public string? GoogleCalendarEventId { get; set; }
}

public enum StatusAgendamento
{
    Pendente,
    Confirmado,
    Cancelado
}

