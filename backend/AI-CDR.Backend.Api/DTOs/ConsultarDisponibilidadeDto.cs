using System.ComponentModel.DataAnnotations;

namespace AI_CDR.Backend.DTOs;

public class ConsultarDisponibilidadeDto
{
    [Required(ErrorMessage = "Unidade é obrigatória")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Unidade deve ter entre 3 e 100 caracteres")]
    public string Unidade { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data é obrigatória")]
    public DateTime Data { get; set; }
}

