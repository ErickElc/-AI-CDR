using AI_CDR.Backend.Infrastructure;
using AI_CDR.Backend.Repositories;
using AI_CDR.Backend.Services;
using AI_CDR.Backend.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://frontend:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "AI-CDR Backend API",
        Version = "v1",
        Description = "API backend para o sistema de agente de IA SDR para clínicas digitais. " +
                      "Fornece validações de negócio, gerenciamento de agendamentos e integração com orquestrador de IA.",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "AI-CDR Team"
        }
    });
    
    // Incluir comentários XML na documentação
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

// MongoDB Configuration
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDB") 
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__MongoDB")
    ?? "mongodb://localhost:27017";
var mongoDatabaseName = builder.Configuration["MongoDB:DatabaseName"] 
    ?? Environment.GetEnvironmentVariable("MongoDB__DatabaseName")
    ?? "ai-cdr";

builder.Services.AddSingleton<IMongoDbContext>(sp => 
    new MongoDbContext(mongoConnectionString, mongoDatabaseName));

// Register repositories
builder.Services.AddScoped<IAgendamentoRepository, AgendamentoRepository>();
builder.Services.AddScoped<IUnidadeRepository, UnidadeRepository>();
builder.Services.AddScoped<IProcedimentoRepository, ProcedimentoRepository>();

// Register HttpClient for OrchestratorClientService
builder.Services.AddHttpClient<OrchestratorClientService>();

// Register HttpClient for QdrantSyncService
builder.Services.AddHttpClient<IQdrantSyncService, QdrantSyncService>();

// Register services
builder.Services.AddScoped<IValidacaoAgendaService, ValidacaoAgendaService>();
builder.Services.AddScoped<IValidacaoDadosService, ValidacaoDadosService>();
builder.Services.AddScoped<IAgendamentoService, AgendamentoService>();
builder.Services.AddScoped<IChatService, ChatService>();

// Register DbSeeder
builder.Services.AddScoped<DbSeeder>();

var app = builder.Build();

// 🌱 Seed database on startup
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
    await seeder.SeedAsync();
}

// Configure the HTTP request pipeline.
// Habilitar Swagger em Development e Docker para facilitar testes
if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Docker")
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();

