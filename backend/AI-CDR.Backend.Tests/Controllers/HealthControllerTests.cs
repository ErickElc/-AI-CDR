using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using AI_CDR.Backend.Controllers;
using AI_CDR.Backend.Infrastructure;
using MongoDB.Driver;
using MongoDB.Bson;

namespace AI_CDR.Backend.Tests.Controllers;

/// <summary>
/// Testes unitários para o HealthController.
/// Verifica o endpoint de health check e conectividade com MongoDB.
/// </summary>
public class HealthControllerTests
{
    private readonly Mock<IMongoDbContext> _mongoContextMock;
    private readonly HealthController _controller;

    public HealthControllerTests()
    {
        _mongoContextMock = new Mock<IMongoDbContext>();
        _controller = new HealthController(_mongoContextMock.Object);
    }

    [Fact]
    public void Get_DeveRetornarOkQuandoMongoDBConectado()
    {
        // Arrange
        var mockCollection = new Mock<IMongoCollection<AI_CDR.Backend.Models.Agendamento>>();
        var mockDatabase = new Mock<IMongoDatabase>();

        mockCollection.Setup(c => c.Database).Returns(mockDatabase.Object);
        
        _mongoContextMock.Setup(c => c.Agendamentos).Returns(mockCollection.Object);
        
        // Simular comando ping bem-sucedido
        var pingResult = new BsonDocument { { "ok", 1 } };
        mockDatabase.Setup(d => d.RunCommand<BsonDocument>(
            It.IsAny<Command<BsonDocument>>(),
            It.IsAny<ReadPreference>(),
            It.IsAny<CancellationToken>()))
            .Returns(pingResult);

        // Act
        var result = _controller.Get();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.StatusCode.Should().Be(200);
    }

    [Fact]
    public void Get_DeveRetornar503QuandoMongoDBDesconectado()
    {
        // Arrange
        var mockCollection = new Mock<IMongoCollection<AI_CDR.Backend.Models.Agendamento>>();
        var mockDatabase = new Mock<IMongoDatabase>();

        mockCollection.Setup(c => c.Database).Returns(mockDatabase.Object);
        
        _mongoContextMock.Setup(c => c.Agendamentos).Returns(mockCollection.Object);
        
        // Simular erro de conexão
        mockDatabase.Setup(d => d.RunCommand<BsonDocument>(
            It.IsAny<Command<BsonDocument>>(),
            It.IsAny<ReadPreference>(),
            It.IsAny<CancellationToken>()))
            .Throws(new Exception("Connection failed"));

        // Act
        var result = _controller.Get();

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var statusResult = result as ObjectResult;
        statusResult.Should().NotBeNull();
        statusResult!.StatusCode.Should().Be(503);
    }
}

