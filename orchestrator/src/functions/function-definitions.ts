/**
 * Definições das funções disponíveis para function calling
 */

export const FUNCTION_DEFINITIONS = [
  {
    name: 'consultar_disponibilidade',
    description: 'Consulta os horários disponíveis para uma unidade em uma data específica. Use esta função SEMPRE antes de sugerir horários ao usuário.',
    parameters: {
      type: 'object',
      properties: {
        unidade: {
          type: 'string',
          description: 'Nome da unidade (obrigatório)',
        },
        data: {
          type: 'string',
          description: 'Data no formato YYYY-MM-DD (obrigatório)',
        },
      },
      required: ['unidade', 'data'],
    },
  },
  {
    name: 'criar_agendamento',
    description: 'Cria um novo agendamento após validar todas as regras. Use esta função APENAS após confirmar todos os dados com o usuário e validar duplicidade.',
    parameters: {
      type: 'object',
      properties: {
        nomePaciente: {
          type: 'string',
          description: 'Nome completo do paciente (obrigatório)',
        },
        procedimento: {
          type: 'string',
          description: 'Nome do procedimento (obrigatório, deve ser validado com listar_procedimentos)',
        },
        unidade: {
          type: 'string',
          description: 'Nome da unidade (obrigatório, deve ser validado com listar_unidades)',
        },
        dataHora: {
          type: 'string',
          description: 'Data e horário no formato ISO 8601 (obrigatório)',
        },
        sessionId: {
          type: 'string',
          description: 'ID da sessão atual',
        },
        email: {
          type: 'string',
          description: 'Email do paciente (opcional)',
        },
      },
      required: ['nomePaciente', 'procedimento', 'unidade', 'dataHora'],
    },
  },
  {
    name: 'validar_duplicidade',
    description: 'Valida se já existe um agendamento duplicado (mesmo nome OU email + mesma data/hora + mesma unidade). Use SEMPRE antes de criar agendamento.',
    parameters: {
      type: 'object',
      properties: {
        nomePaciente: {
          type: 'string',
          description: 'Nome do paciente',
        },
        email: {
          type: 'string',
          description: 'Email do paciente (opcional)',
        },
        dataHora: {
          type: 'string',
          description: 'Data e horário no formato ISO 8601',
        },
        unidade: {
          type: 'string',
          description: 'Nome da unidade',
        },
      },
      required: ['nomePaciente', 'dataHora', 'unidade'],
    },
  },
  {
    name: 'listar_unidades',
    description: 'Lista todas as unidades disponíveis. Use esta função para validar nomes de unidades mencionados pelo usuário e apresentar opções.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'listar_procedimentos',
    description: 'Lista todos os procedimentos disponíveis. Use esta função para validar nomes de procedimentos mencionados pelo usuário e apresentar opções.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'validar_procedimento',
    description: 'Valida se um procedimento específico existe e está disponível. Use SEMPRE que o usuário mencionar um procedimento para garantir que ele existe.',
    parameters: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome do procedimento a validar',
        },
      },
      required: ['nome'],
    },
  },
  {
    name: 'validar_unidade',
    description: 'Valida se uma unidade específica existe e está ativa. Use SEMPRE que o usuário mencionar uma unidade para garantir que ela está disponível.',
    parameters: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome da unidade a validar',
        },
      },
      required: ['nome'],
    },
  },
];


