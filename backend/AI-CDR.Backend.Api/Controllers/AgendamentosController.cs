using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.Services;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AgendamentosController : ControllerBase
{
    private readonly IAgendamentoRepository _repository;
    private readonly ILogger<AgendamentosController> _logger;

    public AgendamentosController(
        IAgendamentoRepository repository,
        ILogger<AgendamentosController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Lista todos os agendamentos
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListarTodos()
    {
        try
        {
            var agendamentos = await _repository.ObterTodosAsync();
            
            var response = agendamentos.Select(a => new
            {
                id = a.Id,
                nomePaciente = a.NomePaciente,
                procedimento = a.Procedimento,
                unidade = a.Unidade,
                dataHora = a.DataHora,
                status = a.Status
            }).OrderBy(a => a.dataHora);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao listar agendamentos");
            return StatusCode(500, new { error = "Erro ao buscar agendamentos" });
        }
    }
}
