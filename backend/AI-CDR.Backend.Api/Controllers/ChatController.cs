using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.DTOs;
using AI_CDR.Backend.Services;

namespace AI_CDR.Backend.Controllers;

/// <summary>
/// Controller responsável por processar mensagens do chat.
/// Atua como intermediário entre o frontend e o orquestrador de IA.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    /// <summary>
    /// Inicializa uma nova instância do ChatController.
    /// </summary>
    /// <param name="chatService">Serviço de processamento de mensagens.</param>
    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    /// <summary>
    /// Processa uma mensagem do usuário e retorna a resposta do agente de IA.
    /// </summary>
    /// <param name="request">Dados da mensagem incluindo texto e sessionId (opcional).</param>
    /// <returns>Resposta do agente de IA com sessionId.</returns>
    /// <response code="200">Mensagem processada com sucesso.</response>
    /// <response code="400">Mensagem vazia ou inválida.</response>
    [HttpPost("message")]
    [ProducesResponseType(typeof(ChatResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChatResponseDto>> ProcessarMensagem([FromBody] ChatRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "Mensagem não pode ser vazia" });
        }

        var response = await _chatService.ProcessarMensagemAsync(request);
        return Ok(response);
    }
}

