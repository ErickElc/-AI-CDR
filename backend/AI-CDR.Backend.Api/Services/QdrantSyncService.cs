using System.Text;
using System.Text.Json;
using AI_CDR.Backend.Models;

namespace AI_CDR.Backend.Services;

public interface IQdrantSyncService
{
    Task SyncAppointmentAsync(Agendamento agendamento);
}

public class QdrantSyncService : IQdrantSyncService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<QdrantSyncService> _logger;
    private const string QdrantUrl = "http://qdrant:6333";
    private const string CollectionName = "appointments";

    public QdrantSyncService(HttpClient httpClient, ILogger<QdrantSyncService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task SyncAppointmentAsync(Agendamento agendamento)
    {
        try
        {
            // 1. Gerar embedding via OpenAI (simplificado - usa texto concatenado)
            var text = $"{agendamento.NomePaciente} {agendamento.Procedimento} {agendamento.Unidade}";
            var embedding = await GenerateEmbeddingAsync(text);

            if (embedding == null || embedding.Length == 0)
            {
                _logger.LogWarning("Falha ao gerar embedding para agendamento {Id}", agendamento.Id);
                return;
            }

            // 2. Criar ponto para Qdrant
            var point = new
            {
                id = agendamento.Id,
                vector = embedding,
                payload = new
                {
                    nomePaciente = agendamento.NomePaciente,
                    procedimento = agendamento.Procedimento,
                    unidade = agendamento.Unidade,
                    dataHora = agendamento.DataHora.ToString("O"),
                    sessionId = agendamento.SessionId,
                    timestamp = DateTime.UtcNow.ToString("O")
                }
            };

            // 3. Upsert no Qdrant
            var payload = new
            {
                points = new[] { point }
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PutAsync(
                $"{QdrantUrl}/collections/{CollectionName}/points",
                content
            );

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("✅ Agendamento sincronizado com Qdrant: {Nome}", agendamento.NomePaciente);
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("⚠️ Erro ao sincronizar com Qdrant: {Error}", error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao sincronizar agendamento {Id} com Qdrant", agendamento.Id);
            // Não propaga o erro - sync é opcional
        }
    }

    private async Task<float[]?> GenerateEmbeddingAsync(string text)
    {
        try
        {
            // Chama orchestrator para gerar embedding
            var payload = new { text };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(
                "http://orchestrator:3000/embed",
                content
            );

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Falha ao gerar embedding via orchestrator");
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<EmbeddingResponse>(responseJson);
            return result?.Embedding;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao gerar embedding");
            return null;
        }
    }

    private class EmbeddingResponse
    {
        public float[]? Embedding { get; set; }
    }
}
