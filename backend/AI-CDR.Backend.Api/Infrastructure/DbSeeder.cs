using AI_CDR.Backend.Models;
using AI_CDR.Backend.Infrastructure;
using MongoDB.Driver;

namespace AI_CDR.Backend.Api.Infrastructure;

/// <summary>
/// Seeds initial data to MongoDB on application startup.
/// 
/// ⚠️ SINGLE SOURCE OF TRUTH STRATEGY:
/// - DbSeeder.cs is the ONLY place that populates MongoDB data
/// - init-mongo.js was removed from docker-compose.yml
/// - Procedimentos and Unidades are seeded only if they don't exist
/// - Agendamentos are ALWAYS deleted and recreated with fresh mocks on startup
/// - This ensures data consistency across FAQ (Qdrant), MongoDB, and LLM
/// </summary>
public class DbSeeder
{
    private readonly IMongoDbContext _context;
    private readonly ILogger<DbSeeder> _logger;

    public DbSeeder(
        IMongoDbContext context,
        ILogger<DbSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("🌱 Starting database seeding...");

            await SeedProcedimentosAsync();
            await SeedUnidadesAsync();
            await SeedAgendamentosAsync();

            _logger.LogInformation("✅ Database seeding completed successfully!");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error during database seeding");
            throw;
        }
    }

    private async Task SeedProcedimentosAsync()
    {
        var count = await _context.Procedimentos.CountDocumentsAsync(FilterDefinition<Procedimento>.Empty);
        if (count > 0)
        {
            _logger.LogInformation("⏭️  Procedimentos already exist ({Count} found), skipping seed", count);
            return;
        }

        var procedimentos = new List<Procedimento>
        {
            new() { Nome = "Consulta Geral", DuracaoMinutos = 30 },
            new() { Nome = "Dermatologia", DuracaoMinutos = 30 },
            new() { Nome = "Limpeza de Pele", DuracaoMinutos = 30 },
            new() { Nome = "Peeling Químico", DuracaoMinutos = 30 },
            new() { Nome = "Preenchimento Facial", DuracaoMinutos = 30 },
            new() { Nome = "Botox", DuracaoMinutos = 30 },
            new() { Nome = "Tratamento de Acne", DuracaoMinutos = 30 },
            new() { Nome = "Remoção de Verrugas", DuracaoMinutos = 30 }
        };

        await _context.Procedimentos.InsertManyAsync(procedimentos);
        _logger.LogInformation("✅ Seeded {Count} procedimentos", procedimentos.Count);
    }

    private async Task SeedUnidadesAsync()
    {
        var count = await _context.Unidades.CountDocumentsAsync(FilterDefinition<Unidade>.Empty);
        if (count > 0)
        {
            _logger.LogInformation("⏭️  Unidades already exist ({Count} found), skipping seed", count);
            return;
        }

        var unidades = new List<Unidade>
        {
            new() 
            { 
                Nome = "Centro", 
                Endereco = "Rua Principal, 123 - Centro",
                Ativa = true
            },
            new() 
            { 
                Nome = "Zona Sul", 
                Endereco = "Av. Beira Mar, 456 - Zona Sul",
                Ativa = true
            },
            new() 
            { 
                Nome = "Zona Norte", 
                Endereco = "Rua das Flores, 789 - Zona Norte",
                Ativa = true
            },
            new() 
            { 
                Nome = "Zona Leste", 
                Endereco = "Av. Paulista, 321 - Zona Leste",
                Ativa = true
            }
        };

        await _context.Unidades.InsertManyAsync(unidades);
        _logger.LogInformation("✅ Seeded {Count} unidades", unidades.Count);
    }

    private async Task SeedAgendamentosAsync()
    {
        // 🧹 SEMPRE limpar agendamentos existentes para criar mocks frescos
        var existingCount = await _context.Agendamentos.CountDocumentsAsync(FilterDefinition<Agendamento>.Empty);
        if (existingCount > 0)
        {
            await _context.Agendamentos.DeleteManyAsync(FilterDefinition<Agendamento>.Empty);
            _logger.LogInformation("🧹 Deleted {Count} existing agendamentos", existingCount);
        }

        var random = new Random();
        
        // Dados realistas
        var procedimentos = new[]
        {
            "Consulta Geral", "Dermatologia", "Limpeza de Pele", "Peeling Químico",
            "Preenchimento Facial", "Botox", "Tratamento de Acne", "Remoção de Verrugas"
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
        var days = 30;
        var fillRate = 0.4; // 40% dos slots preenchidos (deixa 60% de vagas)

        for (int day = 0; day < days; day++)
        {
            var date = startDate.AddDays(day);
            
            // ✅ Segunda a Sexta (pular sábado e domingo)
            if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                continue;

            foreach (var unidade in unidades)
            {
                // ✅ Horário de trabalho: 08:00 às 18:00 (intervalos de 30 min)
                for (int hour = 8; hour < 18; hour++)
                {
                    for (int minute = 0; minute < 60; minute += 30)
                    {
                        // ✅ Pular horário de almoço (12:00-13:00)
                        if (hour == 12) continue;

                        // Decidir se este slot será preenchido baseado no fillRate
                        if (random.NextDouble() > fillRate) continue;

                        var appointmentTime = new DateTime(
                            date.Year, date.Month, date.Day,
                            hour, minute, 0,
                            DateTimeKind.Utc
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

        // Inserir em batch
        if (appointments.Count > 0)
        {
            await _context.Agendamentos.InsertManyAsync(appointments);
            _logger.LogInformation("✅ Seeded {Count} agendamentos", appointments.Count);
        }
        else
        {
            _logger.LogWarning("⚠️  No agendamentos to seed");
        }
    }
}
