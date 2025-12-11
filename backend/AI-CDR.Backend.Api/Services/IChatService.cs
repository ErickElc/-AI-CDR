using AI_CDR.Backend.DTOs;

namespace AI_CDR.Backend.Services;

public interface IChatService
{
    Task<ChatResponseDto> ProcessarMensagemAsync(ChatRequestDto request);
}


