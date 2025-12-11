using Xunit;
using FluentAssertions;
using AI_CDR.Backend.Repositories;
using AI_CDR.Backend.Models;
using AI_CDR.Backend.Infrastructure;
using MongoDB.Driver;

namespace AI_CDR.Backend.Tests.Repositories;

/// <summary>
/// Testes de integração para AgendamentoRepository com MongoDB real.
/// Requer MongoDB rodando (via Docker ou local).
/// </summary>
public class AgendamentoRepositoryIntegrationTests : IClassFixture<MongoDbFixture>
{
    private readonly AgendamentoRepository _repository;
    private readonly MongoDbFixture _fixture;

    public AgendamentoRepositoryIntegrationTests(MongoDbFixture fixture)
    {
        _fixture = fixture;
        _repository = new AgendamentoRepository(_fixture.Context);
    }

    [Fact]
    public async Task CriarAsync_DeveCriarAgendamentoNoMongoDB()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = DateTime.UtcNow.AddDays(1).Date.AddHours(10),
            Email = "joao.silva@example.com",
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        // Act
        var resultado = await _repository.CriarAsync(agendamento);

        // Assert
        resultado.Should().NotBeNull();
        resultado.Id.Should().NotBeNullOrEmpty();
        resultado.NomePaciente.Should().Be(agendamento.NomePaciente);

        // Verificar se foi salvo no MongoDB
        var agendamentoSalvo = await _repository.ObterPorIdAsync(resultado.Id!);
        agendamentoSalvo.Should().NotBeNull();
        agendamentoSalvo!.NomePaciente.Should().Be("João Silva");
    }

    [Fact]
    public async Task ObterPorIdAsync_DeveRetornarAgendamentoExistente()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "Maria Santos",
            Procedimento = "Dermatologia",
            Unidade = "Zona Sul",
            DataHora = DateTime.UtcNow.AddDays(2).Date.AddHours(14),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };
        var criado = await _repository.CriarAsync(agendamento);

        // Act
        var resultado = await _repository.ObterPorIdAsync(criado.Id!);

        // Assert
        resultado.Should().NotBeNull();
        resultado!.NomePaciente.Should().Be("Maria Santos");
        resultado.Procedimento.Should().Be("Dermatologia");
        resultado.Unidade.Should().Be("Zona Sul");
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
    public async Task ObterPorUnidadeEDataAsync_DeveRetornarApenasAgendamentosDaUnidadeEData()
    {
        // Arrange
        var data = DateTime.UtcNow.AddDays(3).Date;
        var unidade = "Centro";

        var agendamento1 = new Agendamento
        {
            NomePaciente = "Paciente 1",
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = data.AddHours(10),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        var agendamento2 = new Agendamento
        {
            NomePaciente = "Paciente 2",
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = data.AddHours(11),
            Status = StatusAgendamento.Confirmado,
            CriadoEm = DateTime.UtcNow
        };

        // Agendamento de outra unidade (não deve aparecer)
        var agendamento3 = new Agendamento
        {
            NomePaciente = "Paciente 3",
            Procedimento = "Consulta Geral",
            Unidade = "Zona Sul",
            DataHora = data.AddHours(10),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        // Agendamento de outro dia (não deve aparecer)
        var agendamento4 = new Agendamento
        {
            NomePaciente = "Paciente 4",
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = data.AddDays(1).AddHours(10),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamento1);
        await _repository.CriarAsync(agendamento2);
        await _repository.CriarAsync(agendamento3);
        await _repository.CriarAsync(agendamento4);

        // Act
        var resultado = await _repository.ObterPorUnidadeEDataAsync(unidade, data);

        // Assert
        resultado.Should().HaveCount(2);
        resultado.Should().OnlyContain(a => a.Unidade == unidade);
        resultado.Should().OnlyContain(a => a.DataHora.Date == data);
        resultado.Should().Contain(a => a.NomePaciente == "Paciente 1");
        resultado.Should().Contain(a => a.NomePaciente == "Paciente 2");
    }

    [Fact]
    public async Task ObterPorUnidadeEDataAsync_DeveExcluirAgendamentosCancelados()
    {
        // Arrange
        var data = DateTime.UtcNow.AddDays(4).Date;
        var unidade = "Centro";

        var agendamentoAtivo = new Agendamento
        {
            NomePaciente = "Paciente Ativo",
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = data.AddHours(10),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        var agendamentoCancelado = new Agendamento
        {
            NomePaciente = "Paciente Cancelado",
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = data.AddHours(11),
            Status = StatusAgendamento.Cancelado,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamentoAtivo);
        await _repository.CriarAsync(agendamentoCancelado);

        // Act
        var resultado = await _repository.ObterPorUnidadeEDataAsync(unidade, data);

        // Assert
        resultado.Should().HaveCount(1);
        resultado.Should().OnlyContain(a => a.Status != StatusAgendamento.Cancelado);
        resultado.Should().Contain(a => a.NomePaciente == "Paciente Ativo");
    }

    [Fact]
    public async Task ExisteDuplicadoAsync_DeveRetornarTrueQuandoMesmoNomeEDataHoraEUnidade()
    {
        // Arrange
        var nome = "João Duplicado";
        var dataHora = DateTime.UtcNow.AddDays(5).Date.AddHours(10);
        var unidade = "Centro";

        var agendamento1 = new Agendamento
        {
            NomePaciente = nome,
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = dataHora,
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamento1);

        // Act
        var existeDuplicado = await _repository.ExisteDuplicadoAsync(nome, null, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeTrue();
    }

    [Fact]
    public async Task ExisteDuplicadoAsync_DeveRetornarTrueQuandoMesmoEmailEDataHoraEUnidade()
    {
        // Arrange
        var nome = "João Email";
        var email = "joao.email@example.com";
        var dataHora = DateTime.UtcNow.AddDays(6).Date.AddHours(10);
        var unidade = "Centro";

        var agendamento1 = new Agendamento
        {
            NomePaciente = nome,
            Email = email,
            Procedimento = "Dermatologia",
            Unidade = unidade,
            DataHora = dataHora,
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamento1);

        // Act - Tentar criar com mesmo email mas nome diferente
        var existeDuplicado = await _repository.ExisteDuplicadoAsync("Nome Diferente", email, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeTrue();
    }

    [Fact]
    public async Task ExisteDuplicadoAsync_DeveRetornarFalseQuandoNaoExisteDuplicado()
    {
        // Arrange
        var nome = "João Único";
        var dataHora = DateTime.UtcNow.AddDays(7).Date.AddHours(10);
        var unidade = "Centro";

        // Act
        var existeDuplicado = await _repository.ExisteDuplicadoAsync(nome, null, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeFalse();
    }

    [Fact]
    public async Task ExisteDuplicadoAsync_DeveRetornarFalseQuandoMesmoNomeMasDataDiferente()
    {
        // Arrange
        var nome = "João Data Diferente";
        var dataHora1 = DateTime.UtcNow.AddDays(8).Date.AddHours(10);
        var dataHora2 = DateTime.UtcNow.AddDays(8).Date.AddHours(11);
        var unidade = "Centro";

        var agendamento1 = new Agendamento
        {
            NomePaciente = nome,
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = dataHora1,
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamento1);

        // Act
        var existeDuplicado = await _repository.ExisteDuplicadoAsync(nome, null, dataHora2, unidade);

        // Assert
        existeDuplicado.Should().BeFalse();
    }

    [Fact]
    public async Task ExisteDuplicadoAsync_DeveRetornarFalseQuandoMesmoNomeMasUnidadeDiferente()
    {
        // Arrange
        var nome = "João Unidade Diferente";
        var dataHora = DateTime.UtcNow.AddDays(9).Date.AddHours(10);
        var unidade1 = "Centro";
        var unidade2 = "Zona Sul";

        var agendamento1 = new Agendamento
        {
            NomePaciente = nome,
            Procedimento = "Consulta Geral",
            Unidade = unidade1,
            DataHora = dataHora,
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamento1);

        // Act
        var existeDuplicado = await _repository.ExisteDuplicadoAsync(nome, null, dataHora, unidade2);

        // Assert
        existeDuplicado.Should().BeFalse();
    }

    [Fact]
    public async Task ExisteDuplicadoAsync_DeveRetornarFalseQuandoAgendamentoCancelado()
    {
        // Arrange
        var nome = "João Cancelado";
        var dataHora = DateTime.UtcNow.AddDays(10).Date.AddHours(10);
        var unidade = "Centro";

        var agendamentoCancelado = new Agendamento
        {
            NomePaciente = nome,
            Procedimento = "Consulta Geral",
            Unidade = unidade,
            DataHora = dataHora,
            Status = StatusAgendamento.Cancelado,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamentoCancelado);

        // Act
        var existeDuplicado = await _repository.ExisteDuplicadoAsync(nome, null, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeFalse();
    }

    [Fact]
    public async Task AtualizarAsync_DeveAtualizarAgendamentoExistente()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "João Original",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = DateTime.UtcNow.AddDays(11).Date.AddHours(10),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };
        var criado = await _repository.CriarAsync(agendamento);

        // Act
        criado.Status = StatusAgendamento.Confirmado;
        criado.NomePaciente = "João Atualizado";
        var atualizado = await _repository.AtualizarAsync(criado);

        // Assert
        atualizado.Status.Should().Be(StatusAgendamento.Confirmado);
        atualizado.NomePaciente.Should().Be("João Atualizado");

        // Verificar se foi atualizado no MongoDB
        var verificado = await _repository.ObterPorIdAsync(criado.Id!);
        verificado.Should().NotBeNull();
        verificado!.Status.Should().Be(StatusAgendamento.Confirmado);
        verificado.NomePaciente.Should().Be("João Atualizado");
    }

    [Fact]
    public async Task ObterTodosAsync_DeveRetornarTodosOsAgendamentos()
    {
        // Arrange
        var agendamento1 = new Agendamento
        {
            NomePaciente = "Paciente Todos 1",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = DateTime.UtcNow.AddDays(12).Date.AddHours(10),
            Status = StatusAgendamento.Pendente,
            CriadoEm = DateTime.UtcNow
        };

        var agendamento2 = new Agendamento
        {
            NomePaciente = "Paciente Todos 2",
            Procedimento = "Dermatologia",
            Unidade = "Zona Sul",
            DataHora = DateTime.UtcNow.AddDays(13).Date.AddHours(14),
            Status = StatusAgendamento.Confirmado,
            CriadoEm = DateTime.UtcNow
        };

        await _repository.CriarAsync(agendamento1);
        await _repository.CriarAsync(agendamento2);

        // Act
        var resultado = await _repository.ObterTodosAsync();

        // Assert
        resultado.Should().NotBeEmpty();
        resultado.Should().Contain(a => a.NomePaciente == "Paciente Todos 1");
        resultado.Should().Contain(a => a.NomePaciente == "Paciente Todos 2");
    }
}

/// <summary>
/// Fixture para configurar MongoDB para testes de integração.
/// </summary>
public class MongoDbFixture : IDisposable
{
    public IMongoDbContext Context { get; private set; }

    public MongoDbFixture()
    {
        // Usar connection string de teste ou variável de ambiente
        var connectionString = Environment.GetEnvironmentVariable("MONGODB_TEST_CONNECTION")
            ?? "mongodb://localhost:27017";
        var databaseName = $"ai-cdr-test-{Guid.NewGuid()}"; // Database único para cada execução

        Context = new MongoDbContext(connectionString, databaseName);
    }

    public void Dispose()
    {
        // Limpar database de teste após os testes
        try
        {
            var database = Context.Agendamentos.Database;
            database.Client.DropDatabase(database.DatabaseNamespace.DatabaseName);
        }
        catch
        {
            // Ignorar erros na limpeza
        }
    }
}

