using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProcedimentosController : ControllerBase
{
    private readonly IProcedimentoRepository _repository;
    private readonly ILogger<ProcedimentosController> _logger;

    public ProcedimentosController(
        IProcedimentoRepository repository,
        ILogger<ProcedimentosController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Lista todos os procedimentos disponíveis
    /// </summary>
    /// <returns>Lista de procedimentos</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ListarTodos()
    {
        try
        {
            var procedimentos = await _repository.ObterTodosAsync();
            
            var response = procedimentos.Select(p => new
            {
                id = p.Id,
                nome = p.Nome,
                duracaoMinutos = p.DuracaoMinutos
            }).OrderBy(p => p.nome);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao listar procedimentos");
            return StatusCode(500, new { error = "Erro ao buscar procedimentos" });
        }
    }

    /// <summary>
    /// Valida se um procedimento existe pelo nome
    /// </summary>
    /// <param name="nome">Nome do procedimento a validar</param>
    /// <returns>Objeto indicando se o procedimento existe</returns>
    [HttpGet("validar/{nome}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ValidarProcedimento(string nome)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(nome))
            {
                return BadRequest(new { error = "Nome do procedimento não pode ser vazio" });
            }

            var procedimento = await _repository.ObterPorNomeAsync(nome);
            
            if (procedimento != null)
            {
                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        existe = true,
                        procedimento = new
                        {
                            id = procedimento.Id,
                            nome = procedimento.Nome,
                            duracaoMinutos = procedimento.DuracaoMinutos
                        }
                    },
                    errorMessage = (string?)null
                });
            }

            return Ok(new
            {
                success = true,
                data = new { existe = false },
                errorMessage = (string?)null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao validar procedimento: {Nome}", nome);
            return StatusCode(500, new
            {
                success = false,
                data = (object?)null,
                errorMessage = "Erro ao validar procedimento"
            });
        }
    }
}
