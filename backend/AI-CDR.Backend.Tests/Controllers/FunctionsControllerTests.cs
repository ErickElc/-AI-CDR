using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using AI_CDR.Backend.Controllers;
using AI_CDR.Backend.DTOs;
using AI_CDR.Backend.Services;
using AI_CDR.Backend.Models;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Tests.Controllers;

/// <summary>
/// Testes unitários para o FunctionsController.
/// Verifica os endpoints de function calling para o orquestrador de IA.
/// </summary>
public class FunctionsControllerTests
{
    private readonly Mock<IAgendamentoService> _agendamentoServiceMock;
    private readonly Mock<IUnidadeRepository> _unidadeRepositoryMock;
    private readonly Mock<IProcedimentoRepository> _procedimentoRepositoryMock;
    private readonly Mock<IValidacaoAgendaService> _validacaoAgendaServiceMock;
    private readonly FunctionsController _controller;

    public FunctionsControllerTests()
    {
        _agendamentoServiceMock = new Mock<IAgendamentoService>();
        _unidadeRepositoryMock = new Mock<IUnidadeRepository>();
        _procedimentoRepositoryMock = new Mock<IProcedimentoRepository>();
        _validacaoAgendaServiceMock = new Mock<IValidacaoAgendaService>();

        _controller = new FunctionsController(
            _agendamentoServiceMock.Object,
            _unidadeRepositoryMock.Object,
            _procedimentoRepositoryMock.Object,
            _validacaoAgendaServiceMock.Object);
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
    public async Task ConsultarDisponibilidade_DeveRetornarOkComSlots()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var dto = new ConsultarDisponibilidadeDto
        {
            Unidade = "Centro",
            Data = proximaSegunda.Date
        };

        var slotsEsperados = new List<SlotDisponibilidade>
        {
            new SlotDisponibilidade { DataHora = proximaSegunda.Date.AddHours(8), Unidade = "Centro", Disponivel = true },
            new SlotDisponibilidade { DataHora = proximaSegunda.Date.AddHours(8).AddMinutes(30), Unidade = "Centro", Disponivel = true }
        };

        _agendamentoServiceMock
            .Setup(s => s.ConsultarDisponibilidadeAsync(dto.Unidade, dto.Data))
            .ReturnsAsync(slotsEsperados);

        // Act
        var result = await _controller.ConsultarDisponibilidade(dto);

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task CriarAgendamento_DeveRetornarOkQuandoSucesso()
    {
        // Arrange
        var dto = new CriarAgendamentoDto
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximaSegunda(),
            SessionId = "session-123",
            Email = "joao.silva@example.com"
        };

        var agendamento = new Agendamento
        {
            Id = "test-id",
            NomePaciente = dto.NomePaciente,
            Procedimento = dto.Procedimento,
            Unidade = dto.Unidade,
            DataHora = dto.DataHora,
            Status = StatusAgendamento.Pendente
        };

        var resultado = new AgendamentoResultado
        {
            Sucesso = true,
            Agendamento = agendamento
        };

        _agendamentoServiceMock
            .Setup(s => s.CriarAgendamentoAsync(It.IsAny<Agendamento>()))
            .ReturnsAsync(resultado);

        // Act
        var result = await _controller.CriarAgendamento(dto);

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task CriarAgendamento_DeveRetornarOkComErroQuandoFalha()
    {
        // Arrange
        var dto = new CriarAgendamentoDto
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximoSabado(), // Próximo sábado
            SessionId = "session-123"
        };

        var resultado = new AgendamentoResultado
        {
            Sucesso = false,
            MensagemErro = "Não atendemos aos sábados"
        };

        _agendamentoServiceMock
            .Setup(s => s.CriarAgendamentoAsync(It.IsAny<Agendamento>()))
            .ReturnsAsync(resultado);

        // Act
        var result = await _controller.CriarAgendamento(dto);

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.ErrorMessage.Should().Contain("sábados");
    }

    [Fact]
    public async Task ValidarDuplicidade_DeveRetornarOkComResultado()
    {
        // Arrange
        var dto = new ValidarDuplicidadeDto
        {
            NomePaciente = "João Silva",
            Email = "joao.silva@example.com",
            DataHora = ProximaSegunda(),
            Unidade = "Centro"
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarDuplicidadeAsync(dto.NomePaciente, dto.Email, dto.DataHora, dto.Unidade))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.ValidarDuplicidade(dto);

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ValidarDuplicidade_DeveRetornarOkQuandoNaoExisteDuplicado()
    {
        // Arrange
        var dto = new ValidarDuplicidadeDto
        {
            NomePaciente = "Maria Santos",
            Email = "maria.santos@example.com",
            DataHora = ProximaSegunda(),
            Unidade = "Centro"
        };

        _validacaoAgendaServiceMock
            .Setup(s => s.ValidarDuplicidadeAsync(dto.NomePaciente, dto.Email, dto.DataHora, dto.Unidade))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.ValidarDuplicidade(dto);

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task CriarAgendamento_DeveIncluirEmailNoAgendamento()
    {
        // Arrange
        var dto = new CriarAgendamentoDto
        {
            NomePaciente = "João Silva",
            Procedimento = "Consulta Geral",
            Unidade = "Centro",
            DataHora = ProximaSegunda(),
            SessionId = "session-123",
            Email = "joao.silva@example.com"
        };

        Agendamento? agendamentoCapturado = null;
        _agendamentoServiceMock
            .Setup(s => s.CriarAgendamentoAsync(It.IsAny<Agendamento>()))
            .Callback<Agendamento>(a => agendamentoCapturado = a)
            .ReturnsAsync(new AgendamentoResultado
            {
                Sucesso = true,
                Agendamento = new Agendamento
                {
                    Id = "test-id",
                    NomePaciente = dto.NomePaciente,
                    Email = dto.Email,
                    Procedimento = dto.Procedimento,
                    Unidade = dto.Unidade,
                    DataHora = dto.DataHora
                }
            });

        // Act
        var result = await _controller.CriarAgendamento(dto);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        agendamentoCapturado.Should().NotBeNull();
        agendamentoCapturado!.Email.Should().Be(dto.Email);
    }

    [Fact]
    public async Task ListarUnidades_DeveRetornarOkComLista()
    {
        // Arrange
        var unidades = new List<Unidade>
        {
            new Unidade { Id = "1", Nome = "Centro", Endereco = "Rua Principal, 123", Ativa = true },
            new Unidade { Id = "2", Nome = "Zona Sul", Endereco = "Av. Beira Mar, 456", Ativa = true }
        };

        _unidadeRepositoryMock
            .Setup(r => r.ObterTodasAsync())
            .ReturnsAsync(unidades);

        // Act
        var result = await _controller.ListarUnidades();

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task ListarProcedimentos_DeveRetornarOkComLista()
    {
        // Arrange
        var procedimentos = new List<Procedimento>
        {
            new Procedimento { Id = "1", Nome = "Consulta Geral", DuracaoMinutos = 30 },
            new Procedimento { Id = "2", Nome = "Dermatologia", DuracaoMinutos = 30 }
        };

        _procedimentoRepositoryMock
            .Setup(r => r.ObterTodosAsync())
            .ReturnsAsync(procedimentos);

        // Act
        var result = await _controller.ListarProcedimentos();

        // Assert
        result.Should().BeOfType<ActionResult<FunctionCallResponseDto>>();
        var okResult = result.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as FunctionCallResponseDto;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data.Should().NotBeNull();
    }
}

