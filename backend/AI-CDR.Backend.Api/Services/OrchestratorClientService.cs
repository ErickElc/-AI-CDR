using System.Text;
using System.Text.Json;
using AI_CDR.Backend.DTOs;

namespace AI_CDR.Backend.Services;

public class OrchestratorRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Dictionary<string, object>? Context { get; set; }
}

public class OrchestratorResponse
{
    public string Response { get; set; } = string.Empty;
    public Dictionary<string, object>? Slots { get; set; }
    public List<FunctionCallRequest>? FunctionCalls { get; set; }
    public bool NeedsHuman { get; set; }
}

public class FunctionCallRequest
{
    public string FunctionName { get; set; } = string.Empty;
    public Dictionary<string, object> Parameters { get; set; } = new();
}

public class OrchestratorClientService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OrchestratorClientService> _logger;
    private readonly string _baseUrl;

    public OrchestratorClientService(HttpClient httpClient, IConfiguration configuration, ILogger<OrchestratorClientService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = configuration["Orchestrator:BaseUrl"] ?? "http://localhost:3000";
    }

    public async Task<OrchestratorResponse?> ProcessarMensagemAsync(string sessionId, string message, Dictionary<string, object>? context = null)
    {
        try
        {
            var request = new OrchestratorRequest
            {
                SessionId = sessionId,
                Message = message,
                Context = context
            };

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Chamando orquestrador: {Url} com sessionId: {SessionId}", $"{_baseUrl}/orchestrator/chat", sessionId);
            
            var response = await _httpClient.PostAsync($"{_baseUrl}/orchestrator/chat", content);
            
            var responseContent = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Resposta do orquestrador - Status: {StatusCode}, Content: {Content}", 
                response.StatusCode, responseContent);
            
            response.EnsureSuccessStatusCode();

            var orchestratorResponse = JsonSerializer.Deserialize<OrchestratorResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return orchestratorResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Erro HTTP ao chamar orquestrador: {Message}", ex.Message);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Erro ao desserializar resposta do orquestrador: {Message}", ex.Message);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao chamar orquestrador");
            return null;
        }
    }
}

