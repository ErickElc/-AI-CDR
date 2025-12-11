using Xunit;
using FluentAssertions;
using AI_CDR.Backend.Repositories;
using AI_CDR.Backend.Models;
using AI_CDR.Backend.Infrastructure;

namespace AI_CDR.Backend.Tests.Repositories;

/// <summary>
/// Testes de integração para ProcedimentoRepository com MongoDB real.
/// </summary>
public class ProcedimentoRepositoryIntegrationTests : IClassFixture<MongoDbFixture>
{
    private readonly ProcedimentoRepository _repository;
    private readonly MongoDbFixture _fixture;

    public ProcedimentoRepositoryIntegrationTests(MongoDbFixture fixture)
    {
        _fixture = fixture;
        _repository = new ProcedimentoRepository(_fixture.Context);
    }

    [Fact]
    public async Task ObterTodosAsync_DeveRetornarTodosOsProcedimentos()
    {
        // Arrange - Criar procedimentos manualmente no MongoDB
        var procedimentosCollection = _fixture.Context.Procedimentos;
        
        var procedimento1 = new Procedimento
        {
            Nome = "Consulta Geral",
            DuracaoMinutos = 30
        };

        var procedimento2 = new Procedimento
        {
            Nome = "Dermatologia",
            DuracaoMinutos = 30
        };

        var procedimento3 = new Procedimento
        {
            Nome = "Limpeza de Pele",
            DuracaoMinutos = 60
        };

        await procedimentosCollection.InsertOneAsync(procedimento1);
        await procedimentosCollection.InsertOneAsync(procedimento2);
        await procedimentosCollection.InsertOneAsync(procedimento3);

        // Act
        var resultado = await _repository.ObterTodosAsync();

        // Assert
        resultado.Should().NotBeEmpty();
        resultado.Should().HaveCountGreaterOrEqualTo(3);
        resultado.Should().Contain(p => p.Nome == "Consulta Geral");
        resultado.Should().Contain(p => p.Nome == "Dermatologia");
        resultado.Should().Contain(p => p.Nome == "Limpeza de Pele");
    }

    [Fact]
    public async Task ObterPorIdAsync_DeveRetornarProcedimentoExistente()
    {
        // Arrange
        var procedimentosCollection = _fixture.Context.Procedimentos;
        var procedimento = new Procedimento
        {
            Nome = "Procedimento Por ID",
            DuracaoMinutos = 45
        };
        await procedimentosCollection.InsertOneAsync(procedimento);

        // Act
        var resultado = await _repository.ObterPorIdAsync(procedimento.Id!);

        // Assert
        resultado.Should().NotBeNull();
        resultado!.Nome.Should().Be("Procedimento Por ID");
        resultado.DuracaoMinutos.Should().Be(45);
    }

    [Fact]
    public async Task ObterPorIdAsync_DeveRetornarNullQuandoNaoExiste()
    {
        // Act
        var resultado = await _repository.ObterPorIdAsync("507f1f77bcf86cd799439011");

        // Assert
        resultado.Should().BeNull();
    }

    [Fact]
    public async Task ObterPorNomeAsync_DeveRetornarProcedimentoPorNome()
    {
        // Arrange
        var procedimentosCollection = _fixture.Context.Procedimentos;
        var procedimento = new Procedimento
        {
            Nome = "Procedimento Por Nome",
            DuracaoMinutos = 30
        };
        await procedimentosCollection.InsertOneAsync(procedimento);

        // Act
        var resultado = await _repository.ObterPorNomeAsync("Procedimento Por Nome");

        // Assert
        resultado.Should().NotBeNull();
        resultado!.Nome.Should().Be("Procedimento Por Nome");
        resultado.DuracaoMinutos.Should().Be(30);
    }

    [Fact]
    public async Task ObterPorNomeAsync_DeveRetornarNullQuandoNaoExiste()
    {
        // Act
        var resultado = await _repository.ObterPorNomeAsync("Procedimento Inexistente");

        // Assert
        resultado.Should().BeNull();
    }
}

