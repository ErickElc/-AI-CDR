using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using AI_CDR.Backend.Controllers;
using AI_CDR.Backend.DTOs;
using AI_CDR.Backend.Services;

namespace AI_CDR.Backend.Tests.Controllers;

/// <summary>
/// Testes unitários para o ChatController.
/// Verifica o processamento de mensagens e validações de entrada.
/// </summary>
public class ChatControllerTests
{
    private readonly Mock<IChatService> _chatServiceMock;
    private readonly ChatController _controller;

    public ChatControllerTests()
    {
        _chatServiceMock = new Mock<IChatService>();
        _controller = new ChatController(_chatServiceMock.Object);
    }

    [Fact]
    public async Task ProcessarMensagem_DeveRetornarOkQuandoMensagemValida()
    {
        // Arrange
        var request = new ChatRequestDto
        {
            Message = "Olá, quero agendar uma consulta",
            SessionId = "test-session-123"
        };

        var expectedResponse = new ChatResponseDto
        {
            Response = "Olá! Como posso ajudar você?",
            SessionId = "test-session-123"
        };

        _chatServiceMock
            .Setup(s => s.ProcessarMensagemAsync(It.IsAny<ChatRequestDto>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.ProcessarMensagem(request);

        // Assert
        result.Should().BeOfType<ActionResult<ChatResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.Value.Should().BeEquivalentTo(expectedResponse);
        _chatServiceMock.Verify(s => s.ProcessarMensagemAsync(It.IsAny<ChatRequestDto>()), Times.Once);
    }

    [Fact]
    public async Task ProcessarMensagem_DeveRetornarBadRequestQuandoMensagemVazia()
    {
        // Arrange
        var request = new ChatRequestDto
        {
            Message = "",
            SessionId = "test-session-123"
        };

        // Act
        var result = await _controller.ProcessarMensagem(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        var badRequest = result.Result as BadRequestObjectResult;
        badRequest.Should().NotBeNull();
        _chatServiceMock.Verify(s => s.ProcessarMensagemAsync(It.IsAny<ChatRequestDto>()), Times.Never);
    }

    [Fact]
    public async Task ProcessarMensagem_DeveRetornarBadRequestQuandoMensagemNula()
    {
        // Arrange
        var request = new ChatRequestDto
        {
            Message = null!,
            SessionId = "test-session-123"
        };

        // Act
        var result = await _controller.ProcessarMensagem(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _chatServiceMock.Verify(s => s.ProcessarMensagemAsync(It.IsAny<ChatRequestDto>()), Times.Never);
    }

    [Fact]
    public async Task ProcessarMensagem_DeveRetornarBadRequestQuandoMensagemApenasEspacos()
    {
        // Arrange
        var request = new ChatRequestDto
        {
            Message = "   ",
            SessionId = "test-session-123"
        };

        // Act
        var result = await _controller.ProcessarMensagem(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _chatServiceMock.Verify(s => s.ProcessarMensagemAsync(It.IsAny<ChatRequestDto>()), Times.Never);
    }

    [Fact]
    public async Task ProcessarMensagem_DeveGerarSessionIdQuandoNaoFornecido()
    {
        // Arrange
        var request = new ChatRequestDto
        {
            Message = "Olá",
            SessionId = null
        };

        var expectedResponse = new ChatResponseDto
        {
            Response = "Olá! Como posso ajudar?",
            SessionId = "generated-session-id"
        };

        _chatServiceMock
            .Setup(s => s.ProcessarMensagemAsync(It.IsAny<ChatRequestDto>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.ProcessarMensagem(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _chatServiceMock.Verify(s => s.ProcessarMensagemAsync(It.Is<ChatRequestDto>(r => r.SessionId == null)), Times.Once);
    }
}

