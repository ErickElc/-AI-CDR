using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.DTOs;
using AI_CDR.Backend.Services;
using AI_CDR.Backend.Models;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Controllers;

/// <summary>
/// Controller responsável pelos endpoints de function calling do orquestrador de IA.
/// Expõe funções que podem ser chamadas pelo agente de IA durante a conversa.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class FunctionsController : ControllerBase
{
    private readonly IAgendamentoService _agendamentoService;
    private readonly IUnidadeRepository _unidadeRepository;
    private readonly IProcedimentoRepository _procedimentoRepository;
    private readonly IValidacaoAgendaService _validacaoAgendaService;

    /// <summary>
    /// Inicializa uma nova instância do FunctionsController.
    /// </summary>
    /// <param name="agendamentoService">Serviço de gerenciamento de agendamentos.</param>
    /// <param name="unidadeRepository">Repositório de unidades.</param>
    /// <param name="procedimentoRepository">Repositório de procedimentos.</param>
    /// <param name="validacaoAgendaService">Serviço de validação de agenda.</param>
    public FunctionsController(
        IAgendamentoService agendamentoService,
        IUnidadeRepository unidadeRepository,
        IProcedimentoRepository procedimentoRepository,
        IValidacaoAgendaService validacaoAgendaService)
    {
        _agendamentoService = agendamentoService;
        _unidadeRepository = unidadeRepository;
        _procedimentoRepository = procedimentoRepository;
        _validacaoAgendaService = validacaoAgendaService;
    }

    /// <summary>
    /// Consulta os slots disponíveis para uma unidade em uma data específica.
    /// </summary>
    /// <param name="dto">Dados da consulta (unidade e data).</param>
    /// <returns>Lista de slots disponíveis.</returns>
    /// <response code="200">Consulta realizada com sucesso.</response>
    [HttpPost("consultar-disponibilidade")]
    [ProducesResponseType(typeof(FunctionCallResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FunctionCallResponseDto>> ConsultarDisponibilidade([FromBody] ConsultarDisponibilidadeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return Ok(new FunctionCallResponseDto
            {
                Success = false,
                ErrorMessage = string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage))
            });
        }

        var slots = await _agendamentoService.ConsultarDisponibilidadeAsync(dto.Unidade, dto.Data);
        
        return Ok(new FunctionCallResponseDto
        {
            Success = true,
            Data = slots.Select(s => new
            {
                dataHora = s.DataHora,
                unidade = s.Unidade,
                disponivel = s.Disponivel
            })
        });
    }

    /// <summary>
    /// Cria um novo agendamento após validar todas as regras de negócio.
    /// </summary>
    /// <param name="dto">Dados do agendamento a ser criado.</param>
    /// <returns>Agendamento criado ou mensagem de erro.</returns>
    /// <response code="200">Agendamento criado ou erro de validação retornado.</response>
    [HttpPost("criar-agendamento")]
    [ProducesResponseType(typeof(FunctionCallResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FunctionCallResponseDto>> CriarAgendamento([FromBody] CriarAgendamentoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return Ok(new FunctionCallResponseDto
            {
                Success = false,
                ErrorMessage = string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage))
            });
        }

        var agendamento = new Agendamento
        {
            NomePaciente = dto.NomePaciente,
            Procedimento = dto.Procedimento,
            Unidade = dto.Unidade,
            // Force timezone para UTC - evita problema de +3h
            DataHora = DateTime.SpecifyKind(dto.DataHora, DateTimeKind.Utc),
            SessionId = dto.SessionId,
            Email = dto.Email
        };

        var resultado = await _agendamentoService.CriarAgendamentoAsync(agendamento);

        if (!resultado.Sucesso)
        {
            return Ok(new FunctionCallResponseDto
            {
                Success = false,
                ErrorMessage = resultado.MensagemErro
            });
        }

        return Ok(new FunctionCallResponseDto
        {
            Success = true,
            Data = new
            {
                id = resultado.Agendamento?.Id,
                nomePaciente = resultado.Agendamento?.NomePaciente,
                procedimento = resultado.Agendamento?.Procedimento,
                unidade = resultado.Agendamento?.Unidade,
                dataHora = resultado.Agendamento?.DataHora,
                status = resultado.Agendamento?.Status.ToString(),
                email = resultado.Agendamento?.Email
            }
        });
    }

    /// <summary>
    /// Valida se já existe agendamento duplicado.
    /// Considera duplicado se: mesmo nome OU (mesmo email, se fornecido) + mesma data/hora + mesma unidade.
    /// </summary>
    /// <param name="dto">Dados para validação de duplicidade.</param>
    /// <returns>True se existe duplicado, False caso contrário.</returns>
    /// <response code="200">Validação realizada com sucesso.</response>
    [HttpPost("validar-duplicidade")]
    [ProducesResponseType(typeof(FunctionCallResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FunctionCallResponseDto>> ValidarDuplicidade([FromBody] ValidarDuplicidadeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return Ok(new FunctionCallResponseDto
            {
                Success = false,
                ErrorMessage = string.Join("; ", ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage))
            });
        }

        var existeDuplicado = await _validacaoAgendaService.ValidarDuplicidadeAsync(
            dto.NomePaciente,
            dto.Email,
            dto.DataHora,
            dto.Unidade);

        return Ok(new FunctionCallResponseDto
        {
            Success = true,
            Data = new { existeDuplicado }
        });
    }

    [HttpGet("unidades")]
    public async Task<ActionResult<FunctionCallResponseDto>> ListarUnidades()
    {
        var unidades = await _unidadeRepository.ObterTodasAsync();

        return Ok(new FunctionCallResponseDto
        {
            Success = true,
            Data = unidades.Select(u => new
            {
                id = u.Id,
                nome = u.Nome,
                endereco = u.Endereco
            })
        });
    }

    [HttpGet("procedimentos")]
    public async Task<ActionResult<FunctionCallResponseDto>> ListarProcedimentos()
    {
        var procedimentos = await _procedimentoRepository.ObterTodosAsync();

        return Ok(new FunctionCallResponseDto
        {
            Success = true,
            Data = procedimentos.Select(p => new
            {
                id = p.Id,
                nome = p.Nome,
                duracaoMinutos = p.DuracaoMinutos
            })
        });
    }
}

public class ValidarDuplicidadeDto
{
    public string NomePaciente { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateTime DataHora { get; set; }
    public string Unidade { get; set; } = string.Empty;
}

