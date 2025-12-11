using Xunit;
using FluentAssertions;
using AI_CDR.Backend.Repositories;
using AI_CDR.Backend.Models;
using AI_CDR.Backend.Infrastructure;

namespace AI_CDR.Backend.Tests.Repositories;

/// <summary>
/// Testes de integração para UnidadeRepository com MongoDB real.
/// </summary>
public class UnidadeRepositoryIntegrationTests : IClassFixture<MongoDbFixture>
{
    private readonly UnidadeRepository _repository;
    private readonly MongoDbFixture _fixture;

    public UnidadeRepositoryIntegrationTests(MongoDbFixture fixture)
    {
        _fixture = fixture;
        _repository = new UnidadeRepository(_fixture.Context);
    }

    [Fact]
    public async Task ObterTodasAsync_DeveRetornarApenasUnidadesAtivas()
    {
        // Arrange - Criar unidades manualmente no MongoDB
        var unidadesCollection = _fixture.Context.Unidades;
        
        var unidadeAtiva1 = new Unidade
        {
            Nome = "Unidade Ativa 1",
            Endereco = "Rua Teste 1",
            Ativa = true
        };

        var unidadeAtiva2 = new Unidade
        {
            Nome = "Unidade Ativa 2",
            Endereco = "Rua Teste 2",
            Ativa = true
        };

        var unidadeInativa = new Unidade
        {
            Nome = "Unidade Inativa",
            Endereco = "Rua Teste 3",
            Ativa = false
        };

        await unidadesCollection.InsertOneAsync(unidadeAtiva1);
        await unidadesCollection.InsertOneAsync(unidadeAtiva2);
        await unidadesCollection.InsertOneAsync(unidadeInativa);

        // Act
        var resultado = await _repository.ObterTodasAsync();

        // Assert
        resultado.Should().NotBeEmpty();
        resultado.Should().OnlyContain(u => u.Ativa == true);
        resultado.Should().Contain(u => u.Nome == "Unidade Ativa 1");
        resultado.Should().Contain(u => u.Nome == "Unidade Ativa 2");
        resultado.Should().NotContain(u => u.Nome == "Unidade Inativa");
    }

    [Fact]
    public async Task ObterPorIdAsync_DeveRetornarUnidadeExistente()
    {
        // Arrange
        var unidadesCollection = _fixture.Context.Unidades;
        var unidade = new Unidade
        {
            Nome = "Unidade Por ID",
            Endereco = "Rua Teste ID",
            Ativa = true
        };
        await unidadesCollection.InsertOneAsync(unidade);

        // Act
        var resultado = await _repository.ObterPorIdAsync(unidade.Id!);

        // Assert
        resultado.Should().NotBeNull();
        resultado!.Nome.Should().Be("Unidade Por ID");
        resultado.Endereco.Should().Be("Rua Teste ID");
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
    public async Task ObterPorNomeAsync_DeveRetornarUnidadeAtivaPorNome()
    {
        // Arrange
        var unidadesCollection = _fixture.Context.Unidades;
        var unidade = new Unidade
        {
            Nome = "Unidade Por Nome",
            Endereco = "Rua Teste Nome",
            Ativa = true
        };
        await unidadesCollection.InsertOneAsync(unidade);

        // Act
        var resultado = await _repository.ObterPorNomeAsync("Unidade Por Nome");

        // Assert
        resultado.Should().NotBeNull();
        resultado!.Nome.Should().Be("Unidade Por Nome");
        resultado.Ativa.Should().BeTrue();
    }

    [Fact]
    public async Task ObterPorNomeAsync_DeveRetornarNullQuandoUnidadeInativa()
    {
        // Arrange
        var unidadesCollection = _fixture.Context.Unidades;
        var unidade = new Unidade
        {
            Nome = "Unidade Inativa Nome",
            Endereco = "Rua Teste",
            Ativa = false
        };
        await unidadesCollection.InsertOneAsync(unidade);

        // Act
        var resultado = await _repository.ObterPorNomeAsync("Unidade Inativa Nome");

        // Assert
        resultado.Should().BeNull();
    }

    [Fact]
    public async Task ObterPorNomeAsync_DeveRetornarNullQuandoNaoExiste()
    {
        // Act
        var resultado = await _repository.ObterPorNomeAsync("Unidade Inexistente");

        // Assert
        resultado.Should().BeNull();
    }
}

