using Xunit;
using FluentAssertions;
using AI_CDR.Backend.Services;
using AI_CDR.Backend.Models;
using Moq;
using AI_CDR.Backend.Repositories;
using Microsoft.Extensions.Logging;

namespace AI_CDR.Backend.Tests.Services;

/// <summary>
/// Testes unitários para o AgendamentoService.
/// Verifica a lógica de criação de agendamentos, validações e consulta de disponibilidade.
/// </summary>
public class AgendamentoServiceTests
{
    private readonly Mock<IAgendamentoRepository> _agendamentoRepositoryMock;
    private readonly Mock<IValidacaoAgendaService> _validacaoAgendaServiceMock;
    private readonly Mock<IValidacaoDadosService> _validacaoDadosServiceMock;
    private readonly Mock<IQdrantSyncService> _qdrantSyncServiceMock;
    private readonly Mock<ILogger<AgendamentoService>> _loggerMock;
    private readonly AgendamentoService _service;

    public AgendamentoServiceTests()
    {
        _agendamentoRepositoryMock = new Mock<IAgendamentoRepository>();
        _validacaoAgendaServiceMock = new Mock<IValidacaoAgendaService>();
        _validacaoDadosServiceMock = new Mock<IValidacaoDadosService>();
        _qdrantSyncServiceMock = new Mock<IQdrantSyncService>();
        _loggerMock = new Mock<ILogger<AgendamentoService>>();
        _service = new AgendamentoService(
            _agendamentoRepositoryMock.Object,
            _validacaoAgendaServiceMock.Object,
            _validacaoDadosServiceMock.Object,
            _qdrantSyncServiceMock.Object,
            _loggerMock.Object);
    }

    /// <summary>
    /// Retorna a próxima segunda-feira a partir de hoje.
    /// </summary>
    private DateTime ProximaSegunda()
    {
        var hoje = DateTime.UtcNow;
        var diasParaSegunda = ((int)DayOfWeek.Monday - (int)hoje.DayOfWeek + 7) % 7;
        if (diasParaSegunda == 0) diasParaSegunda = 7;
        return hoje.AddDays(diasParaSegunda).Date.AddHours(10);
    }

    /// <summary>
    /// Retorna o próximo sábado a partir de hoje.
    /// </summary>
    private DateTime ProximoSabado()
    {
        var hoje = DateTime.UtcNow;
        var diasParaSabado = ((int)DayOfWeek.Saturday - (int)hoje.DayOfWeek + 7) % 7;
        if (diasParaSabado == 0) diasParaSabado = 7;
        return hoje.AddDays(diasParaSabado).Date.AddHours(10);
    }

    [Fact]
    public async Task CriarAgendamento_DeveCriarQuandoValido()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximaSegunda(), // Próxima segunda 10:00
            Email = "joao.silva@example.com",
            Status = StatusAgendamento.Pendente
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarHorarioComercial(agendamento.DataHora))
            .Returns(new ValidacaoResultado { Valido = true });

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarDuplicidadeAsync(agendamento.NomePaciente, agendamento.Email, agendamento.DataHora, agendamento.Unidade))
            .ReturnsAsync(false);

        _agendamentoRepositoryMock
            .Setup(r => r.CriarAsync(It.IsAny<Agendamento>()))
            .ReturnsAsync(agendamento);

        // Act
        var resultado = await _service.CriarAgendamentoAsync(agendamento);

        // Assert
        resultado.Sucesso.Should().BeTrue();
        resultado.Agendamento.Should().NotBeNull();
        resultado.Agendamento!.Email.Should().Be(agendamento.Email);
        resultado.Agendamento.Status.Should().Be(StatusAgendamento.Pendente);
        resultado.Agendamento.CriadoEm.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        _agendamentoRepositoryMock.Verify(r => r.CriarAsync(It.IsAny<Agendamento>()), Times.Once);
    }

    [Fact]
    public async Task CriarAgendamento_DeveRejeitarQuandoHorarioInvalido()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximoSabado(), // Próximo sábado
            Status = StatusAgendamento.Pendente
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarHorarioComercial(agendamento.DataHora))
            .Returns(new ValidacaoResultado 
            { 
                Valido = false, 
                MensagemErro = "Não atendemos aos sábados" 
            });

        _validacaoDadosServiceMock
            .Setup(s => s.ValidarProcedimentoAsync(agendamento.Procedimento))
            .ReturnsAsync((true, string.Empty));

        _validacaoDadosServiceMock
            .Setup(s => s.ValidarUnidadeAsync(agendamento.Unidade))
            .ReturnsAsync((true, string.Empty));

        // Act
        var resultado = await _service.CriarAgendamentoAsync(agendamento);

        // Assert
        resultado.Sucesso.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("sábados");
        _agendamentoRepositoryMock.Verify(r => r.CriarAsync(It.IsAny<Agendamento>()), Times.Never);
    }

    [Fact]
    public async Task CriarAgendamento_DeveRejeitarQuandoDuplicado()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximaSegunda(), // Próxima segunda 10:00
            Status = StatusAgendamento.Pendente
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarHorarioComercial(agendamento.DataHora))
            .Returns(new ValidacaoResultado { Valido = true });

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarDuplicidadeAsync(agendamento.NomePaciente, agendamento.Email, agendamento.DataHora, agendamento.Unidade))
            .ReturnsAsync(true);

        // Act
        var resultado = await _service.CriarAgendamentoAsync(agendamento);

        // Assert
        resultado.Sucesso.Should().BeFalse();
        resultado.MensagemErro.ToLower().Should().Contain("já existe");
        _agendamentoRepositoryMock.Verify(r => r.CriarAsync(It.IsAny<Agendamento>()), Times.Never);
    }

    [Fact]
    public async Task CriarAgendamento_DeveCriarQuandoValidoSemEmail()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "Maria Santos",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximaSegunda(),
            Email = null, // Sem email
            Status = StatusAgendamento.Pendente
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarHorarioComercial(agendamento.DataHora))
            .Returns(new ValidacaoResultado { Valido = true });

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarDuplicidadeAsync(agendamento.NomePaciente, agendamento.Email, agendamento.DataHora, agendamento.Unidade))
            .ReturnsAsync(false);

        _agendamentoRepositoryMock
            .Setup(r => r.CriarAsync(It.IsAny<Agendamento>()))
            .ReturnsAsync(agendamento);

        // Act
        var resultado = await _service.CriarAgendamentoAsync(agendamento);

        // Assert
        resultado.Sucesso.Should().BeTrue();
        resultado.Agendamento.Should().NotBeNull();
        resultado.Agendamento!.Email.Should().BeNull();
        _agendamentoRepositoryMock.Verify(r => r.CriarAsync(It.IsAny<Agendamento>()), Times.Once);
    }

    [Fact]
    public async Task CriarAgendamento_DeveRejeitarQuandoDuplicadoPorEmail()
    {
        // Arrange
        var agendamento = new Agendamento
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximaSegunda(),
            Email = "joao.silva@example.com",
            Status = StatusAgendamento.Pendente
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarHorarioComercial(agendamento.DataHora))
            .Returns(new ValidacaoResultado { Valido = true });

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarDuplicidadeAsync(agendamento.NomePaciente, agendamento.Email, agendamento.DataHora, agendamento.Unidade))
            .ReturnsAsync(true);

        // Act
        var resultado = await _service.CriarAgendamentoAsync(agendamento);

        // Assert
        resultado.Sucesso.Should().BeFalse();
        resultado.MensagemErro.ToLower().Should().Contain("já existe");
        resultado.MensagemErro.Should().Contain(agendamento.Email);
        _agendamentoRepositoryMock.Verify(r => r.CriarAsync(It.IsAny<Agendamento>()), Times.Never);
    }

    [Fact]
    public async Task ConsultarDisponibilidade_DeveRetornarSlotsDisponiveis()
    {
        // Arrange
        var unidade = "Centro";
        var proximaSegunda = ProximaSegunda();
        var data = proximaSegunda.Date; // Próxima segunda-feira
        var slotsEsperados = new List<SlotDisponibilidade>
        {
            new SlotDisponibilidade { DataHora = proximaSegunda.Date.AddHours(8), Unidade = unidade, Disponivel = true },
            new SlotDisponibilidade { DataHora = proximaSegunda.Date.AddHours(8).AddMinutes(30), Unidade = unidade, Disponivel = true }
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.GerarSlotsDisponiveis(unidade, data))
            .Returns(slotsEsperados);

        // Act
        var slots = await _service.ConsultarDisponibilidadeAsync(unidade, data);

        // Assert
        slots.Should().NotBeEmpty();
        slots.Count.Should().BeGreaterThan(0);
    }
}

