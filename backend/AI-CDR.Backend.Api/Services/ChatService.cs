using AI_CDR.Backend.DTOs;

namespace AI_CDR.Backend.Services;

public class ChatService : IChatService
{
    private readonly OrchestratorClientService _orchestratorClient;

    public ChatService(OrchestratorClientService orchestratorClient)
    {
        _orchestratorClient = orchestratorClient;
    }

    public async Task<ChatResponseDto> ProcessarMensagemAsync(ChatRequestDto request)
    {
        var sessionId = request.SessionId ?? Guid.NewGuid().ToString();

        var orchestratorResponse = await _orchestratorClient.ProcessarMensagemAsync(
            sessionId,
            request.Message);

        if (orchestratorResponse == null)
        {
            return new ChatResponseDto
            {
                SessionId = sessionId,
                Response = "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente."
            };
        }

        return new ChatResponseDto
        {
            SessionId = sessionId,
            Response = orchestratorResponse.Response
        };
    }
}

