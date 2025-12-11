using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.Models;
using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Controllers;

/// <summary>
/// Controller for system utilities and helper endpoints
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    private readonly IAgendamentoRepository _agendamentoRepository;

    public SystemController(IAgendamentoRepository agendamentoRepository)
    {
        _agendamentoRepository = agendamentoRepository;
    }
    /// <summary>
    /// Returns current server date and time in UTC and local timezone
    /// Used by orchestrator to get accurate current date for date calculations
    /// </summary>
    /// <returns>Current date and time information</returns>
    [HttpGet("current-datetime")]
    [ProducesResponseType(typeof(CurrentDateTimeDto), StatusCodes.Status200OK)]
    public ActionResult<CurrentDateTimeDto> GetCurrentDateTime()
    {
        var now = DateTime.UtcNow;
        var localNow = DateTime.Now;
        
        return Ok(new CurrentDateTimeDto
        {
            UtcDateTime = now,
            LocalDateTime = localNow,
            UtcIso = now.ToString("o"),
            LocalIso = localNow.ToString("o"),
            Date = localNow.ToString("yyyy-MM-DD"),
            DayOfWeek = localNow.ToString("dddd", new System.Globalization.CultureInfo("pt-BR")),
            DayOfWeekShort = localNow.ToString("ddd", new System.Globalization.CultureInfo("pt-BR")),
            FormattedDate = localNow.ToString("dd/MM/yyyy"),
            FormattedTime = localNow.ToString("HH:mm:ss")
        });
    }

    /// <summary>
    /// Populates database with test appointments for testing purposes
    /// </summary>
    /// <param name="days">Number of days ahead to generate appointments (default: 30)</param>
    /// <param name="fillRate">Percentage of slots to fill (0.0 to 1.0, default: 0.7)</param>
    /// <param name="clearExisting">Whether to clear existing appointments before seeding (default: false)</param>
    /// <returns>Summary of seeded data</returns>
    [HttpPost("seed-appointments")]
    [ProducesResponseType(typeof(SeedAppointmentsResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeedAppointmentsResponseDto>> SeedAppointments(
        [FromQuery] int days = 30,
        [FromQuery] double fillRate = 0.7,
        [FromQuery] bool clearExisting = false)
    {
        try
        {
            var random = new Random();
            
            // Data realista
            var procedimentos = new[]
            {
                "Consulta Geral",
                "Dermatologia",
                "Limpeza de Pele",
                "Peeling Químico",
                "Preenchimento Facial",
                "Botox",
                "Tratamento de Acne",
                "Remoção de Verrugas"
            };

            var unidades = new[] { "Centro", "Zona Sul", "Zona Norte", "Zona Leste" };

            var nomes = new[]
            {
                "Ana Silva", "João Santos", "Maria Oliveira", "Pedro Souza",
                "Carla Costa", "Lucas Pereira", "Julia Rodrigues", "Rafael Almeida",
                "Beatriz Nascimento", "Gabriel Fernandes", "Fernanda Lima"
            };

            var appointments = new List<Agendamento>();
            var startDate = DateTime.Today;

            for (int day = 0; day < days; day++)
            {
                var date = startDate.AddDays(day);
                
                // Pular finais de semana
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                    continue;

                foreach (var unidade in unidades)
                {
                    // Gerar slots de 08:00 às 18:00 (30 em 30 min)
                    for (int hour = 8; hour < 18; hour++)
                    {
                        for (int minute = 0; minute < 60; minute += 30)
                        {
                            // Pular horário de almoço (12:00-14:00)
                            if (hour >= 12 && hour < 14) continue;

                            // Decidir se este slot será preenchido baseado no fillRate
                            if (random.NextDouble() > fillRate) continue;

                            var appointmentTime = new DateTime(
                                date.Year, date.Month, date.Day,
                                hour, minute, 0,
                                DateTimeKind.Local
                            );

                            var nome = nomes[random.Next(nomes.Length)];
                            var appointment = new Agendamento
                            {
                                NomePaciente = nome,
                                Email = $"{nome.Split(' ')[0].ToLower()}{random.Next(100, 999)}@example.com",
                                Procedimento = procedimentos[random.Next(procedimentos.Length)],
                                Unidade = unidade,
                                DataHora = appointmentTime,
                                Status = StatusAgendamento.Confirmado,
                                CriadoEm = DateTime.UtcNow
                            };

                            appointments.Add(appointment);
                        }
                    }
                }
            }

            // Limpar agendamentos existentes se solicitado
            if (clearExisting)
            {
                await _agendamentoRepository.DeleteManyAsync(a => true);
            }

            // Inserir em batch
            if (appointments.Count > 0)
            {
                await _agendamentoRepository.CreateManyAsync(appointments);
            }

            var response = new SeedAppointmentsResponseDto
            {
                Message = "Agendamentos populados com sucesso!",
                TotalCreated = appointments.Count,
                ByUnit = unidades.ToDictionary(
                    u => u,
                    u => appointments.Count(a => a.Unidade == u)
                ),
                FillRate = fillRate,
                DaysGenerated = days,
                ClearedExisting = clearExisting
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class CurrentDateTimeDto
{
    public DateTime UtcDateTime { get; set; }
    public DateTime LocalDateTime { get; set; }
    public string UtcIso { get; set; } = string.Empty;
    public string LocalIso { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty; // YYYY-MM-DD
    public string DayOfWeek { get; set; } = string.Empty; // "segunda-feira"
    public string DayOfWeekShort { get; set; } = string.Empty; // "seg"
    public string FormattedDate { get; set; } = string.Empty; // DD/MM/YYYY
    public string FormattedTime { get; set; } = string.Empty; // HH:mm:ss
}

public class SeedAppointmentsResponseDto
{
    public string Message { get; set; } = string.Empty;
    public int TotalCreated { get; set; }
    public Dictionary<string, int> ByUnit { get; set; } = new();
    public double FillRate { get; set; }
    public int DaysGenerated { get; set; }
    public bool ClearedExisting { get; set; }
}
