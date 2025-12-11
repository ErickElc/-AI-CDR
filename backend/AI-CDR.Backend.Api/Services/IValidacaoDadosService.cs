namespace AI_CDR.Backend.Services;

public interface IValidacaoDadosService
{
    Task<(bool valido, string erro)> ValidarProcedimentoAsync(string nomeProcedimento);
    Task<(bool valido, string erro)> ValidarUnidadeAsync(string nomeUnidade);
}
