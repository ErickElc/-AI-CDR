using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UnidadesController : ControllerBase
{
    private readonly IUnidadeRepository _repository;
    private readonly ILogger<UnidadesController> _logger;

    public UnidadesController(
        IUnidadeRepository repository,
        ILogger<UnidadesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Lista todas as unidades disponíveis
    /// </summary>
    /// <returns>Lista de unidades</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ListarTodos()
    {
        try
        {
            var unidades = await _repository.ObterTodasAsync();
            
            var response = unidades
                .Where(u => u.Ativa)
                .Select(u => new
                {
                    id = u.Id,
                    nome = u.Nome,
                    endereco = u.Endereco,
                    ativa = u.Ativa
                })
                .OrderBy(u => u.nome);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao listar unidades");
            return StatusCode(500, new { error = "Erro ao buscar unidades" });
        }
    }

    /// <summary>
    /// Valida se uma unidade existe pelo nome
    /// </summary>
    /// <param name="nome">Nome da unidade a validar</param>
    /// <returns>Objeto indicando se a unidade existe e está ativa</returns>
    [HttpGet("validar/{nome}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ValidarUnidade(string nome)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(nome))
            {
                return BadRequest(new { error = "Nome da unidade não pode ser vazio" });
            }

            var unidade = await _repository.ObterPorNomeAsync(nome);
            
            if (unidade != null && unidade.Ativa)
            {
                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        existe = true,
                        unidade = new
                        {
                            id = unidade.Id,
                            nome = unidade.Nome,
                            endereco = unidade.Endereco,
                            ativa = unidade.Ativa
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
            _logger.LogError(ex, "Erro ao validar unidade: {Nome}", nome);
            return StatusCode(500, new
            {
                success = false,
                data = (object?)null,
                errorMessage = "Erro ao validar unidade"
            });
        }
    }
}
