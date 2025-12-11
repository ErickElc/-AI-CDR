namespace AI_CDR.Backend.Models;

public class SlotDisponibilidade
{
    public DateTime DataHora { get; set; }
    public string Unidade { get; set; } = string.Empty;
    public bool Disponivel { get; set; }
}


