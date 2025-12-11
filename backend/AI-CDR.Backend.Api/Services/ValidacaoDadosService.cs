using AI_CDR.Backend.Repositories;

namespace AI_CDR.Backend.Services;

public class ValidacaoDadosService : IValidacaoDadosService
{
    private readonly IProcedimentoRepository _procedimentoRepository;
    private readonly IUnidadeRepository _unidadeRepository;

    public ValidacaoDadosService(
        IProcedimentoRepository procedimentoRepository,
        IUnidadeRepository unidadeRepository)
    {
        _procedimentoRepository = procedimentoRepository;
        _unidadeRepository = unidadeRepository;
    }

    public async Task<(bool valido, string erro)> ValidarProcedimentoAsync(string nomeProcedimento)
    {
        if (string.IsNullOrWhiteSpace(nomeProcedimento))
        {
            return (false, "Nome do procedimento não pode ser vazio");
        }

        var procedimento = await _procedimentoRepository.ObterPorNomeAsync(nomeProcedimento);
        if (procedimento == null)
        {
            return (false, $"Procedimento '{nomeProcedimento}' não encontrado. Verifique os procedimentos disponíveis.");
        }

        return (true, string.Empty);
    }

    public async Task<(bool valido, string erro)> ValidarUnidadeAsync(string nomeUnidade)
    {
        if (string.IsNullOrWhiteSpace(nomeUnidade))
        {
            return (false, "Nome da unidade não pode ser vazio");
        }

        var unidade = await _unidadeRepository.ObterPorNomeAsync(nomeUnidade);
        if (unidade == null)
        {
            return (false, $"Unidade '{nomeUnidade}' não encontrada. Verifique as unidades disponíveis.");
        }

        if (!unidade.Ativa)
        {
            return (false, $"Unidade '{nomeUnidade}' está temporariamente indisponível.");
        }

        return (true, string.Empty);
    }
}
