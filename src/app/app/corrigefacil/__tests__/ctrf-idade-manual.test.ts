// =====================================================================
// C-TRF 1.5-5 · a idade manual do instrumento, e só ela.
//
// O C-TRF vale de 1 ano e meio a 5 anos, e o formulário genérico pedia
// idade INTEIRA de 0 a 130. O resultado era errado nos dois sentidos:
//
//     1,5 ano   recusado, sendo a idade mínima do instrumento
//     8 anos    aceito, estando fora da faixa dele
//
// A regra passou a morar em `IDADE_MANUAL`, um mapa fechado por
// instrumento — o mesmo padrão de INSTRUCAO_DOS_ITENS, GATE_POR_INSTRUMENTO
// e FAIXA_PELA_IDADE. Campo, validação, mensagem e persistência leem dela.
//
// A DISTINÇÃO QUE ESTE ARQUIVO GUARDA: aqui a idade é IDENTIFICAÇÃO, não
// norma. A norma do C-TRF é por SEXO e continua sendo — a idade não vira
// dimensão normativa, não entra no `norm_selector` e não muda nada do lado
// da Edge. Quem resolve dimensão de norma pela idade é FAIXA_PELA_IDADE,
// que continua só com o BPA-2.
//
// E o que ele protege nos outros: o decimal NÃO vazou. Fora do mapa, idade
// continua inteira de 0 a 130, "anos completos" continua escrito, e
// `{ years: 5 }` continua saindo "5 anos" no documento.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import { formatAgeAtEvaluation } from '@/lib/report/format-age';
import { formatAgeAtEvaluation as doMotor } from '@/lib/corrigefacil/report-generator';
import {
  FAIXA_PELA_IDADE,
  IDADE_MANUAL,
  IDADE_MANUAL_PADRAO,
  idadeManualDe,
  montarModelo,
} from '../avaliar/[code]/form-model';
import {
  escolherDimensao,
  estadoInicial,
  montarPedido,
} from '../avaliar/[code]/form-state';
import {
  idadeManualValida,
  identificacaoInicial,
  montarPedidoAvaliacao,
  podeSalvar,
  textoDoCampoIdade,
  textoErroIdentificacao,
  validarIdentificacao,
} from '../avaliar/[code]/save-model';

// ---------------------------------------------------------------------
// o instrumento como o catálogo o entrega
// ---------------------------------------------------------------------

/** C-TRF: itens 0/1/2, sem enunciado licenciado, norma por SEXO. Dois
 *  itens bastam para o que se prova aqui — a identificação não olha para o
 *  protocolo. */
function detalheCtrf(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  return {
    code: 'C-TRF_1.5-5',
    name: 'C-TRF 1.5-5',
    entry_mode: 'itens',
    score_type: 'escore_t',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [],
    itens: [
      { numero: 1, texto: '' },
      { numero: 2, texto: '' },
    ],
    opcoes_resposta: [
      { label: 'Não é verdadeiro', value: 0 },
      { label: 'Às vezes verdadeiro', value: 1 },
      { label: 'Frequentemente verdadeiro', value: 2 },
    ],
    dimensoes: [{ code: 'sexo', label: 'Sexo', manual: true, opcoes: ['M', 'F'] }],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

/** Um instrumento qualquer sem data de nascimento, para provar o contrário
 *  de cada exigência do C-TRF. */
function detalheGenerico(): InstrumentoDetalhe {
  return detalheCtrf({ code: 'PHQ-9', name: 'PHQ-9', dimensoes: [] });
}

const CTRF = montarModelo(detalheCtrf());
const OUTRO = montarModelo(detalheGenerico());

const identificado = {
  ...identificacaoInicial(),
  nome: 'Ana Beatriz Costa',
  respondente: 'Professora',
};

const com = (idadeAnos: string) => ({ ...identificado, idadeAnos });

const preenchido = { ...estadoInicial(), respostas: { 1: 0, 2: 2 } };

const fonte = (...caminho: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...caminho), 'utf8');

// =====================================================================
// A · a regra mora num lugar só
// =====================================================================

describe('A · a exceção é um mapa fechado, não um if espalhado', () => {
  it('o C-TRF declara 1,5 a 5, com decimal', () => {
    expect(IDADE_MANUAL['C-TRF_1.5-5']).toEqual({ min: 1.5, max: 5, decimal: true });
    expect(idadeManualDe('C-TRF_1.5-5')).toEqual({ min: 1.5, max: 5, decimal: true });
    expect(CTRF.idadeManual).toEqual({ min: 1.5, max: 5, decimal: true });
  });

  it('o mapa é fechado; todo o resto recebe a regra de sempre', () => {
    // O CONFIAS entrou depois, com piso 4 e sem decimal — ver
    // confias-idade-minima.test.ts. A lista continua escrita à mão de
    // propósito: instrumento que ganhe faixa própria sem passar por aqui é
    // exatamente o que este teste existe para acusar.
    expect(Object.keys(IDADE_MANUAL).sort()).toEqual(['C-TRF_1.5-5', 'CONFIAS']);
    expect(IDADE_MANUAL_PADRAO).toEqual({ min: 0, max: 130, decimal: false });
    for (const code of ['PHQ-9', 'BPA-2', 'SDQ-POR', 'TRILHAS_PRE', 'DCDQ']) {
      expect(idadeManualDe(code)).toEqual(IDADE_MANUAL_PADRAO);
    }
    expect(OUTRO.idadeManual.decimal).toBe(false);
  });

  it('o C-TRF continua sendo a única exceção COM decimal', () => {
    // é o decimal que muda campo, máscara e mensagem de erro; o CONFIAS
    // não o ganhou, e nenhum instrumento pode ganhá-lo de carona
    const comDecimal = Object.entries(IDADE_MANUAL)
      .filter(([, regra]) => regra.decimal)
      .map(([code]) => code);
    expect(comDecimal).toEqual(['C-TRF_1.5-5']);
  });

  it('a tela lê a regra do modelo — não repete a faixa nem o código', () => {
    // um `if (code === 'C-TRF_1.5-5')` na tela é exatamente o que este
    // teste existe para impedir: campo, validação e mensagem têm de sair
    // do MESMO objeto, senão o campo aceita o que o botão recusa
    const src = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    expect(src).toContain('min={modelo.idadeManual.min}');
    expect(src).toContain('max={modelo.idadeManual.max}');
    expect(src).toContain("step={modelo.idadeManual.decimal ? 'any' : 1}");
    expect(src).toContain('textoDoCampoIdade(modelo.idadeManual)');
    // os limites e o texto do campo saem da regra, e não estão escritos lá
    expect(src).not.toContain('max={130}');
    expect(src).not.toContain('C-TRF');
    expect(src).not.toContain('Anos completos.</span>');
  });
});

// =====================================================================
// B · validação
// =====================================================================

describe('B · idade do C-TRF: de 1,5 a 5, com decimal', () => {
  it('válidos: 1.5, 1.6, 2, 2.5, 4.75 e 5', () => {
    for (const idade of ['1.5', '1.6', '2', '2.5', '4.75', '5']) {
      expect(validarIdentificacao(com(idade), CTRF)).toEqual([]);
      expect(podeSalvar(com(idade), CTRF, false, false)).toBe(true);
    }
  });

  it('inválidos: 1.49, 5.01, 8, NaN, Infinity e texto', () => {
    for (const idade of ['1.49', '5.01', '8', '0', '-1', 'NaN', 'Infinity', 'abc']) {
      expect(validarIdentificacao(com(idade), CTRF)).toEqual(['idade_invalida']);
      expect(podeSalvar(com(idade), CTRF, false, false)).toBe(false);
    }
  });

  it('vazio é vazio, e não idade zero', () => {
    for (const vazio of ['', '   ']) {
      expect(validarIdentificacao(com(vazio), CTRF)).toEqual(['idade_vazia']);
      expect(podeSalvar(com(vazio), CTRF, false, false)).toBe(false);
    }
  });

  it('a fronteira é fechada dos dois lados', () => {
    expect(idadeManualValida('1.5', CTRF.idadeManual)).toBe(1.5);
    expect(idadeManualValida('5', CTRF.idadeManual)).toBe(5);
    expect(idadeManualValida('1.4999', CTRF.idadeManual)).toBeNull();
    expect(idadeManualValida('5.0001', CTRF.idadeManual)).toBeNull();
  });

  it('a mensagem do C-TRF NÃO diz "anos completos"', () => {
    const msg = textoErroIdentificacao('idade_invalida', CTRF.idadeManual);
    expect(msg).not.toContain('completos');
    expect(msg).toContain('1,5');
    expect(textoDoCampoIdade(CTRF.idadeManual)).toBe('Idade em anos — de 1,5 a 5.');
  });
});

describe('B · nos outros instrumentos nada mudou', () => {
  it('decimal continua recusado fora do mapa', () => {
    for (const idade of ['2.5', '1.5', '8.5']) {
      expect(validarIdentificacao(com(idade), OUTRO)).toEqual(['idade_invalida']);
    }
  });

  it('inteiro de 0 a 130 continua valendo — inclusive o 8 que o C-TRF recusa', () => {
    for (const idade of ['0', '8', '130']) {
      expect(validarIdentificacao(com(idade), OUTRO)).toEqual([]);
    }
    expect(validarIdentificacao(com('131'), OUTRO)).toEqual(['idade_invalida']);
    expect(validarIdentificacao(com('8'), CTRF)).toEqual(['idade_invalida']);
  });

  it('o texto do campo e o do erro continuam falando em anos completos', () => {
    expect(textoDoCampoIdade(OUTRO.idadeManual)).toBe('Anos completos.');
    expect(textoErroIdentificacao('idade_invalida', OUTRO.idadeManual)).toBe(
      'Informe uma idade válida em anos completos.',
    );
  });
});

// =====================================================================
// C · norma — a idade não vira dimensão normativa
// =====================================================================

describe('C · a norma do C-TRF continua sendo o SEXO', () => {
  // o sexo escolhido pela função de verdade: é a única dimensão do
  // instrumento, e a idade não é dimensão nenhuma
  const comSexo = {
    ...preenchido,
    selector: escolherDimensao(CTRF, {}, 0, 'M'),
  };

  it('o corpo leva sexo e mais nada', () => {
    expect(montarPedido(CTRF, comSexo, '1.5').norm_selector).toEqual({ sexo: 'M' });
  });

  it('nenhuma chave de idade entra no selector, em nenhuma idade válida', () => {
    for (const idade of ['1.5', '2.75', '5']) {
      const pedido = montarPedido(CTRF, comSexo, idade);
      expect(pedido.norm_selector).toEqual({ sexo: 'M' });
      expect(JSON.stringify(pedido.norm_selector)).not.toContain(idade);
    }
  });

  it('o C-TRF não está em FAIXA_PELA_IDADE — o mapa da norma é outro', () => {
    expect(FAIXA_PELA_IDADE['C-TRF_1.5-5']).toBeUndefined();
    expect(Object.keys(FAIXA_PELA_IDADE)).toEqual(['BPA-2']);
  });
});

// =====================================================================
// D · persistência
// =====================================================================

describe('D · a idade informada é gravada como foi informada', () => {
  it('1,5 é gravado 1.5 — não 1, não 2', () => {
    const pedido = montarPedidoAvaliacao(CTRF, preenchido, com('1.5'));
    const meta = pedido.subject_meta as { age_at_evaluation: { years: number } };
    expect(meta.age_at_evaluation).toEqual({ years: 1.5 });
    expect(meta.age_at_evaluation.years).toBe(1.5);
  });

  it('2,75 também, e sem meses inventados', () => {
    expect(montarPedidoAvaliacao(CTRF, preenchido, com('2.75')).subject_meta).toEqual({
      respondent_name: 'Professora',
      age_at_evaluation: { years: 2.75 },
    });
  });

  it('idade recusada não é gravada pela metade', () => {
    for (const idade of ['8', '1.49', '', 'abc']) {
      const pedido = montarPedidoAvaliacao(CTRF, preenchido, com(idade));
      expect(pedido.subject_meta).not.toHaveProperty('age_at_evaluation');
    }
  });

  it('um respondente só: nada de respondent_2 nem de comparação', () => {
    const serial = JSON.stringify(montarPedidoAvaliacao(CTRF, preenchido, com('1.5')));
    for (const proibido of ['respondent_2', 'respondente_2', 'comparacao', 'informante_2']) {
      expect(serial).not.toContain(proibido);
    }
    expect(JSON.parse(serial).subject_meta.respondent_name).toBe('Professora');
  });
});

// =====================================================================
// E · formatação no documento e no Relatório Pró
// =====================================================================

describe('E · idade decimal aparece com vírgula, e a antiga não muda', () => {
  it('1.5 e 2.75 saem com vírgula', () => {
    expect(formatAgeAtEvaluation({ years: 1.5 })).toBe('1,5 anos');
    expect(formatAgeAtEvaluation({ years: 2.75 })).toBe('2,75 anos');
    expect(formatAgeAtEvaluation({ years: 4.75 })).toContain('4,75');
  });

  it('nada é arredondado, e nada é escondido', () => {
    expect(formatAgeAtEvaluation({ years: 1.5 })).not.toBe('1 ano');
    expect(formatAgeAtEvaluation({ years: 1.5 })).not.toBeNull();
  });

  it('as idades de sempre continuam idênticas', () => {
    expect(formatAgeAtEvaluation({ years: 1 })).toBe('1 ano');
    expect(formatAgeAtEvaluation({ years: 5 })).toBe('5 anos');
    expect(formatAgeAtEvaluation({ years: 2, months: 3 })).toBe('2 anos e 3 meses');
    expect(formatAgeAtEvaluation({ years: 1, months: 7, days: 12 })).toBe(
      '1 ano, 7 meses e 12 dias',
    );
    expect(formatAgeAtEvaluation({ years: 0, months: 0 })).toBe('0 anos e 0 meses');
  });

  it('lixo continua sendo lixo', () => {
    expect(formatAgeAtEvaluation({ years: Number.NaN })).toBeNull();
    expect(formatAgeAtEvaluation({ years: Number.POSITIVE_INFINITY })).toBeNull();
    expect(formatAgeAtEvaluation({ years: -1.5 })).toBeNull();
    expect(formatAgeAtEvaluation({ years: '1.5' })).toBeNull();
    // decimal COM meses é registro incoerente: duas precisões para o mesmo
    // fato, e escolher uma delas seria inventar
    expect(formatAgeAtEvaluation({ years: 1.5, months: 3 })).toBeNull();
  });

  it('documento e Relatório Pró leem o MESMO formatador', () => {
    const casos = [{ years: 1.5 }, { years: 2.75 }, { years: 5 }, { years: 2, months: 3 }];
    for (const caso of casos) {
      expect(doMotor(caso)).toBe(formatAgeAtEvaluation(caso));
    }
  });
});
