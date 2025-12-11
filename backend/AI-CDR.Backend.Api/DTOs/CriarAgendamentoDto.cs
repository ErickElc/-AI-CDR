using System.ComponentModel.DataAnnotations;

namespace AI_CDR.Backend.DTOs;

public class CriarAgendamentoDto
{
    [Required(ErrorMessage = "Nome do paciente é obrigatório")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Nome deve ter entre 3 e 200 caracteres")]
    public string NomePaciente { get; set; } = string.Empty;

    [Required(ErrorMessage = "Procedimento é obrigatório")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Procedimento deve ter entre 3 e 100 caracteres")]
    public string Procedimento { get; set; } = string.Empty;

    [Required(ErrorMessage = "Unidade é obrigatória")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Unidade deve ter entre 3 e 100 caracteres")]
    public string Unidade { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data e hora são obrigatórios")]
    public DateTime DataHora { get; set; }

    public string? SessionId { get; set; }

    [EmailAddress(ErrorMessage = "Email inválido")]
    public string? Email { get; set; }
}
