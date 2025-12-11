using Microsoft.AspNetCore.Mvc;
using AI_CDR.Backend.Infrastructure;
using MongoDB.Driver;
using MongoDB.Bson;

namespace AI_CDR.Backend.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly IMongoDbContext _mongoContext;

    public HealthController(IMongoDbContext mongoContext)
    {
        _mongoContext = mongoContext;
    }

    [HttpGet]
    public IActionResult Get()
    {
        try
        {
            // Verificar conexão com MongoDB usando ping
            var database = _mongoContext.Agendamentos.Database;
            var command = new BsonDocument("ping", 1);
            database.RunCommand<BsonDocument>(command);
            
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                services = new
                {
                    mongodb = "connected"
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new
            {
                status = "unhealthy",
                timestamp = DateTime.UtcNow,
                error = ex.Message
            });
        }
    }
}

