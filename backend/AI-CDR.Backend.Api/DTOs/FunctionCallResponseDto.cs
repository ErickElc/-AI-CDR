namespace AI_CDR.Backend.DTOs;

public class FunctionCallResponseDto
{
    public bool Success { get; set; }
    public object? Data { get; set; }
    public string? ErrorMessage { get; set; }
}


