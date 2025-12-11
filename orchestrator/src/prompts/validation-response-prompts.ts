/**
 * Prompts auxiliares para respostas baseadas em validações
 * Organizados por cenário/resultado de API
 */

export const VALIDATION_RESPONSE_PROMPTS = {
    /**
     * Procedimento inválido - lista procedimentos disponíveis
     */
    invalidProcedure: (procedimentos: any[]) => `
O procedimento solicitado NÃO está disponível.

**Procedimentos disponíveis:**
${procedimentos.map(p => `• ${p.nome} (${p.duracaoMinutos} minutos)`).join('\n')}

**Sua resposta DEVE:**
1. Informar que o procedimento solicitado não existe
2. Listar os procedimentos acima
3. Perguntar qual procedimento o usuário prefere

**NÃO invente procedimentos. Use APENAS os listados acima.**
`,

    /**
     * Unidade inválida - lista unidades disponíveis
     */
    invalidUnit: (unidades: any[]) => `
A unidade solicitada NÃO existe.

**Unidades disponíveis:**
${unidades.map(u => `• ${u.nome} - ${u.endereco}`).join('\n')}

**Sua resposta DEVE:**
1. Informar que a unidade solicitada não existe
2. Listar as unidades acima
3. Perguntar qual unidade o usuário prefere

**NÃO invente unidades. Use APENAS as listadas acima.**
`,

    /**
     * Horário indisponível - sugere mais próximo
     */
    unavailableTime: (horarioSolicitado: string, disponibilidade: any[]) => {
        const disponíveis = disponibilidade.filter(d => d.disponivel);
        const maisProximo = disponíveis[0]; // Assumindo que vem ordenado

        return `
O horário ${horarioSolicitado} NÃO está disponível.

**Horário mais próximo:** ${maisProximo.dataHora.split('T')[1].substring(0, 5)}

**Outros horários disponíveis:**
${disponíveis.slice(1, 4).map(d => {
            const hora = d.dataHora.split('T')[1].substring(0, 5);
            return `• ${hora}`;
        }).join('\n')}

**Sua resposta DEVE:**
1. Informar que ${horarioSolicitado} não está disponível
2. SUGERIR o horário mais próximo (${maisProximo.dataHora.split('T')[1].substring(0, 5)})
3. Perguntar: "Posso agendar para [horário_mais_próximo]?"
4. Opcionalmente listar 2-3 alternativas

**EXEMPLO:**
"O horário ${horarioSolicitado} não está disponível. O horário mais próximo é ${maisProximo.dataHora.split('T')[1].substring(0, 5)}.

Posso agendar para ${maisProximo.dataHora.split('T')[1].substring(0, 5)}? Ou temos também: [outros horários]"
`;
    },

    /**
     * Duplicidade detectada - sugere outro horário
     */
    duplicateAppointment: (disponibilidade: any[]) => {
        const disponíveis = disponibilidade.filter(d => d.disponivel).slice(0, 3);

        return `
DUPLICIDADE DETECTADA - já existe agendamento para este paciente neste horário/unidade.

**Horários alternativos disponíveis:**
${disponíveis.map(d => {
            const hora = d.dataHora.split('T')[1].substring(0, 5);
            return `• ${hora}`;
        }).join('\n')}

**Sua resposta DEVE:**
1. Informar que já existe agendamento
2. Sugerir o primeiro horário alternativo
3. Perguntar se pode agendar nesse horário

**EXEMPLO:**
"Você já tem um agendamento para este horário. O próximo horário disponível é ${disponíveis[0].dataHora.split('T')[1].substring(0, 5)}.

Posso agendar para ${disponíveis[0].dataHora.split('T')[1].substring(0, 5)}?"
`;
    },

    /**
     * Tudo válido - pedir confirmação
     */
    validDataConfirmation: (slots: any, disponibilidade: any[]) => {
        const horarioDisponivel = disponibilidade.find(d => {
            const hora = d.dataHora.split('T')[1].substring(0, 5);
            return hora === slots.horario && d.disponivel;
        });

        if (!horarioDisponivel) {
            // Horário específico indisponível - usar prompt de sugestão
            return VALIDATION_RESPONSE_PROMPTS.unavailableTime(slots.horario, disponibilidade);
        }

        return `
Todas as validações APROVADAS.

**Dados coletados:**
- Nome: ${slots.nome}
- Procedimento: ${slots.procedimento}
- Unidade: ${slots.unidade}
- Data: ${slots.data}
- Horário: ${slots.horario}

**Horário confirmado como DISPONÍVEL.**

**Sua resposta DEVE:**
1. Confirmar os dados formatados
2. Pedir confirmação final: "Posso confirmar?"

**EXEMPLO:**
"Perfeito! Confirme os dados:
• Nome: ${slots.nome}
• Procedimento: ${slots.procedimento}
• Unidade: ${slots.unidade}
• Data/Hora: [data formatada] às ${slots.horario}

Posso confirmar?"

**NÃO diga "vou verificar" - validação JÁ FOI FEITA.**
`;
    },

    /**
     * Lista opções (procedimentos, unidades, datas)
     */
    listOptions: (tipo: 'procedimentos' | 'unidades' | 'datas', dados: any[]) => {
        if (tipo === 'procedimentos') {
            return `
**Procedimentos disponíveis:**
${dados.map(p => `• ${p.nome} (${p.duracaoMinutos} min)`).join('\n')}

**Sua resposta DEVE:**
1. Listar os procedimentos acima
2. Perguntar qual o usuário deseja

**EXEMPLO:**
"Temos os seguintes procedimentos:
${dados.slice(0, 3).map(p => `• ${p.nome}`).join('\n')}

Qual procedimento você gostaria?"
`;
        }

        if (tipo === 'unidades') {
            return `
**Unidades disponíveis:**
${dados.map(u => `• ${u.nome} - ${u.endereco}`).join('\n')}

**Sua resposta DEVE:**
1. Listar as unidades acima
2. Perguntar qual o usuário prefere

**EXEMPLO:**
"Temos as seguintes unidades:
${dados.map(u => `• ${u.nome} - ${u.endereco}`).join('\n')}

Em qual você prefere agendar?"
`;
        }

        if (tipo === 'datas') {
            return `
**Horários disponíveis:**
${dados.slice(0, 8).map(d => {
                const hora = d.dataHora.split('T')[1].substring(0, 5);
                return `• ${hora}`;
            }).join('\n')}

**Sua resposta DEVE:**
1. Listar os horários disponíveis
2. Perguntar qual horário o usuário prefere

**EXEMPLO:**
"Horários disponíveis:
${dados.slice(0, 5).map(d => `• ${d.dataHora.split('T')[1].substring(0, 5)}`).join('\n')}

Qual horário prefere?"
`;
        }

        return '';
    },
};

export type ValidationScenario =
    | 'invalid_procedure'
    | 'invalid_unit'
    | 'unavailable_time'
    | 'duplicate_appointment'
    | 'valid_confirmation'
    | 'list_procedures'
    | 'list_units'
    | 'list_availability';
