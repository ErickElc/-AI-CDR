using Xunit;
using FluentAssertions;
using AI_CDR.Backend.Services;
using AI_CDR.Backend.Models;
using Moq;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Tests.Services;

/// <summary>
/// Testes unitários para o ValidacaoAgendaService.
/// Verifica validações de horário comercial, geração de slots e validação de duplicidade.
/// </summary>
public class ValidacaoAgendaServiceTests
{
    private readonly Mock<IAgendamentoRepository> _agendamentoRepositoryMock;
    private readonly ValidacaoAgendaService _service;

    public ValidacaoAgendaServiceTests()
    {
        _agendamentoRepositoryMock = new Mock<IAgendamentoRepository>();
        _service = new ValidacaoAgendaService(_agendamentoRepositoryMock.Object);
    }

    /// <summary>
    /// Retorna a próxima segunda-feira a partir de hoje.
    /// </summary>
    private DateTime ProximaSegunda()
    {
        var hoje = DateTime.UtcNow;
        var diasParaSegunda = ((int)DayOfWeek.Monday - (int)hoje.DayOfWeek + 7) % 7;
        if (diasParaSegunda == 0) diasParaSegunda = 7; // Se já é segunda, pega a próxima
        return hoje.AddDays(diasParaSegunda).Date.AddHours(10);
    }

    /// <summary>
    /// Retorna a próxima sexta-feira a partir de hoje.
    /// </summary>
    private DateTime ProximaSexta()
    {
        var hoje = DateTime.UtcNow;
        var diasParaSexta = ((int)DayOfWeek.Friday - (int)hoje.DayOfWeek + 7) % 7;
        if (diasParaSexta == 0) diasParaSexta = 7; // Se já é sexta, pega a próxima
        return hoje.AddDays(diasParaSexta).Date.AddHours(10);
    }

    /// <summary>
    /// Retorna o próximo sábado a partir de hoje.
    /// </summary>
    private DateTime ProximoSabado()
    {
        var hoje = DateTime.UtcNow;
        var diasParaSabado = ((int)DayOfWeek.Saturday - (int)hoje.DayOfWeek + 7) % 7;
        if (diasParaSabado == 0) diasParaSabado = 7; // Se já é sábado, pega o próximo
        return hoje.AddDays(diasParaSabado).Date.AddHours(10);
    }

    [Fact]
    public void ValidarHorarioComercial_DeveRejeitarSabado()
    {
        // Arrange
        var sabado = ProximoSabado();

        // Act
        var resultado = _service.ValidarHorarioComercial(sabado);

        // Assert
        resultado.Valido.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("sábado");
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarSegundaASexta()
    {
        // Arrange
        var segunda = ProximaSegunda();
        var sexta = ProximaSexta();

        // Act
        var resultadoSegunda = _service.ValidarHorarioComercial(segunda);
        var resultadoSexta = _service.ValidarHorarioComercial(sexta);

        // Assert
        resultadoSegunda.Valido.Should().BeTrue();
        resultadoSexta.Valido.Should().BeTrue();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveRejeitarHorarioAntesDas8h()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioAntes = proximaSegunda.Date.AddHours(7).AddMinutes(30); // 07:30

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioAntes);

        // Assert
        resultado.Valido.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("08:00");
    }

    [Fact]
    public void ValidarHorarioComercial_DeveRejeitarHorarioEntre12hE14h()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioAlmoco = proximaSegunda.Date.AddHours(13); // 13:00

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioAlmoco);

        // Assert
        resultado.Valido.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("almoço");
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarHorarioManha()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioManha = proximaSegunda.Date.AddHours(10); // 10:00

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioManha);

        // Assert
        resultado.Valido.Should().BeTrue();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarHorarioTarde()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioTarde = proximaSegunda.Date.AddHours(15); // 15:00

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioTarde);

        // Assert
        resultado.Valido.Should().BeTrue();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveRejeitarHorarioDepoisDas18h()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioDepois = proximaSegunda.Date.AddHours(18).AddMinutes(30); // 18:30

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioDepois);

        // Assert
        resultado.Valido.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("18:00");
    }

    [Fact]
    public void ValidarHorarioComercial_DeveRejeitarDataNoPassado()
    {
        // Arrange
        var dataPassado = DateTime.UtcNow.AddDays(-1); // Ontem

        // Act
        var resultado = _service.ValidarHorarioComercial(dataPassado);

        // Assert
        resultado.Valido.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("passado");
    }

    [Fact]
    public void GerarSlotsDisponiveis_DeveGerarSlotsDe30Em30Minutos()
    {
        // Arrange
        var data = ProximaSegunda().Date; // Próxima segunda-feira
        var unidade = "Centro";
        var agendamentosExistentes = new List<Agendamento>();

        _agendamentoRepositoryMock
            .Setup(r => r.ObterPorUnidadeEDataAsync(unidade, data))
            .ReturnsAsync(agendamentosExistentes);

        // Act
        var slots = _service.GerarSlotsDisponiveis(unidade, data);

        // Assert
        slots.Should().NotBeEmpty();
        slots.Count.Should().Be(16); // 8 slots manhã (08:00-12:00) + 8 slots tarde (14:00-18:00)
        
        // Verificar intervalo de 30 minutos (apenas slots consecutivos do mesmo período)
        // Manhã: 8 slots (08:00, 08:30, ..., 11:30)
        for (int i = 0; i < 7; i++)
        {
            var diferenca = slots[i + 1].DataHora - slots[i].DataHora;
            diferenca.TotalMinutes.Should().Be(30, $"Slots {i} e {i+1} devem ter 30 minutos de diferença");
        }
        
        // Tarde: 8 slots (14:00, 14:30, ..., 17:30)
        for (int i = 8; i < 15; i++)
        {
            var diferenca = slots[i + 1].DataHora - slots[i].DataHora;
            diferenca.TotalMinutes.Should().Be(30, $"Slots {i} e {i+1} devem ter 30 minutos de diferença");
        }
    }

    [Fact]
    public void GerarSlotsDisponiveis_DeveExcluirSlotsOcupados()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var data = proximaSegunda.Date; // Próxima segunda-feira
        var unidade = "Centro";
        var agendamentosExistentes = new List<Agendamento>
        {
            new Agendamento 
            { 
                DataHora = proximaSegunda.Date.AddHours(10), // 10:00
                Unidade = unidade,
                Status = StatusAgendamento.Confirmado
            }
        };

        _agendamentoRepositoryMock
            .Setup(r => r.ObterPorUnidadeEDataAsync(unidade, data))
            .ReturnsAsync(agendamentosExistentes);

        // Act
        var slots = _service.GerarSlotsDisponiveis(unidade, data);

        // Assert
        var slotOcupado = slots.FirstOrDefault(s => s.DataHora == proximaSegunda.Date.AddHours(10));
        slotOcupado.Should().NotBeNull();
        slotOcupado!.Disponivel.Should().BeFalse();
    }

    [Fact]
    public async Task ValidarDuplicidade_DeveRetornarTrueSeExisteDuplicado()
    {
        // Arrange
        var nome = "João Silva";
        var proximaSegunda = ProximaSegunda();
        var dataHora = proximaSegunda.Date.AddHours(10); // 10:00
        var unidade = "Centro";

        _agendamentoRepositoryMock
            .Setup(r => r.ExisteDuplicadoAsync(nome, null, dataHora, unidade))
            .ReturnsAsync(true);

        // Act
        var existeDuplicado = await _service.ValidarDuplicidadeAsync(nome, null, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeTrue();
    }

    [Fact]
    public async Task ValidarDuplicidade_DeveRetornarFalseSeNaoExisteDuplicado()
    {
        // Arrange
        var nome = "João Silva";
        var proximaSegunda = ProximaSegunda();
        var dataHora = proximaSegunda.Date.AddHours(10); // 10:00
        var unidade = "Centro";

        _agendamentoRepositoryMock
            .Setup(r => r.ExisteDuplicadoAsync(nome, null, dataHora, unidade))
            .ReturnsAsync(false);

        // Act
        var existeDuplicado = await _service.ValidarDuplicidadeAsync(nome, null, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeFalse();
    }

    [Fact]
    public async Task ValidarDuplicidade_DeveRetornarTrueSeExisteDuplicadoPorEmail()
    {
        // Arrange
        var nome = "João Silva";
        var email = "joao.silva@example.com";
        var proximaSegunda = ProximaSegunda();
        var dataHora = proximaSegunda.Date.AddHours(10); // 10:00
        var unidade = "Centro";

        _agendamentoRepositoryMock
            .Setup(r => r.ExisteDuplicadoAsync(nome, email, dataHora, unidade))
            .ReturnsAsync(true);

        // Act
        var existeDuplicado = await _service.ValidarDuplicidadeAsync(nome, email, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeTrue();
    }

    [Fact]
    public async Task ValidarDuplicidade_DeveRetornarFalseQuandoEmailDiferente()
    {
        // Arrange
        var nome = "João Silva";
        var email = "joao.silva@example.com";
        var proximaSegunda = ProximaSegunda();
        var dataHora = proximaSegunda.Date.AddHours(10); // 10:00
        var unidade = "Centro";

        _agendamentoRepositoryMock
            .Setup(r => r.ExisteDuplicadoAsync(nome, email, dataHora, unidade))
            .ReturnsAsync(false);

        // Act
        var existeDuplicado = await _service.ValidarDuplicidadeAsync(nome, email, dataHora, unidade);

        // Assert
        existeDuplicado.Should().BeFalse();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveRejeitarDomingo()
    {
        // Arrange
        var hoje = DateTime.UtcNow;
        var diasParaDomingo = ((int)DayOfWeek.Sunday - (int)hoje.DayOfWeek + 7) % 7;
        if (diasParaDomingo == 0) diasParaDomingo = 7;
        var domingo = hoje.AddDays(diasParaDomingo).Date.AddHours(10);

        // Act
        var resultado = _service.ValidarHorarioComercial(domingo);

        // Assert
        resultado.Valido.Should().BeFalse();
        resultado.MensagemErro.Should().Contain("domingo");
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarHorarioExatoInicioManha()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioInicio = proximaSegunda.Date.AddHours(8); // Exatamente 08:00

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioInicio);

        // Assert
        resultado.Valido.Should().BeTrue();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarHorarioExatoFimManha()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioFim = proximaSegunda.Date.AddHours(11).AddMinutes(59); // 11:59 (antes de 12:00)

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioFim);

        // Assert
        resultado.Valido.Should().BeTrue();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarHorarioExatoInicioTarde()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioInicio = proximaSegunda.Date.AddHours(14); // Exatamente 14:00

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioInicio);

        // Assert
        resultado.Valido.Should().BeTrue();
    }

    [Fact]
    public void ValidarHorarioComercial_DeveAceitarHorarioExatoFimTarde()
    {
        // Arrange
        var proximaSegunda = ProximaSegunda();
        var horarioFim = proximaSegunda.Date.AddHours(17).AddMinutes(59); // 17:59 (antes de 18:00)

        // Act
        var resultado = _service.ValidarHorarioComercial(horarioFim);

        // Assert
        resultado.Valido.Should().BeTrue();
    }
}

