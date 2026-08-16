// =====================================================================
// CONFIAS · a idade mínima do instrumento: 4 anos.
//
// A fonte indica o CONFIAS a partir dos 4 anos. O formulário genérico
// pedia idade inteira de 0 a 130, e aceitava calado aplicar o instrumento
// a uma criança de 3 — sem norma que a cubra e sem nada na tela dizendo.
//
// A regra passou a morar em `IDADE_MANUAL`, o MESMO mapa fechado do C-TRF,
// que campo, validação, mensagem e persistência já leem. Mecanismo
// nenhum foi criado: só entrou uma linha no mapa.
//
// O QUE MUDA, e só isto: o PISO. Não há teto declarado para o CONFIAS,
// então o teto genérico (130) fica, e o decimal continua recusado — a
// idade dele é em anos completos, como na regra padrão. É a diferença em
// relação ao C-TRF, que mudou piso, teto e decimal de uma vez.
//
// A DISTINÇÃO QUE ESTE ARQUIVO GUARDA: aqui a idade é APLICABILIDADE DO
// INSTRUMENTO, não norma. A norma do CONFIAS é a HIPÓTESE DE ESCRITA,
// escolhida pelo profissional, e continua sendo: a idade não vira dimensão
// normativa, não entra no `norm_selector`, não aparece em FAIXA_PELA_IDADE
// e não encosta em z, perfil por habilidade nem nível equivalente.
// =====================================================================

import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
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

const HIPOTESES = [
  'Pré-silábica',
  'Silábica',
  'Silábico-alfabética',
  'Alfabética',
];

/** O CONFIAS como o catálogo o entrega: entrada por item, alternativas
 *  Erro/Acerto, norma pela hipótese de escrita e SEM data de nascimento —
 *  é por isso que o campo de idade manual aparece. Dois itens bastam: a
 *  identificação não olha para o protocolo. */
function detalheConfias(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  return {
    code: 'CONFIAS',
    name: 'Consciência Fonológica — Instrumento de Avaliação Sequencial',
    entry_mode: 'itens',
    score_type: 'escore_z',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [],
    itens: [
      { numero: 1, texto: null },
      { numero: 2, texto: null },
    ],
    opcoes_resposta: [
      { label: 'Erro', value: 0 },
      { label: 'Acerto', value: 1 },
    ],
    dimensoes: [
      {
        code: 'hipotese',
        label: 'Hipótese de escrita',
        manual: true,
        opcoes: HIPOTESES,
      },
    ],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

/** Um instrumento qualquer, para provar o contrário de cada exigência. */
function detalheGenerico(): InstrumentoDetalhe {
  return detalheConfias({ code: 'PHQ-9', name: 'PHQ-9', dimensoes: [] });
}

const CONFIAS = montarModelo(detalheConfias());
const OUTRO = montarModelo(detalheGenerico());

const identificado = {
  ...identificacaoInicial(),
  nome: 'Ana Beatriz Costa',
  respondente: 'Professora',
};

const com = (idadeAnos: string) => ({ ...identificado, idadeAnos });

const preenchido = { ...estadoInicial(), respostas: { 1: 1, 2: 0 } };

// =====================================================================
// A · a regra declarada
// =====================================================================

describe('A · o CONFIAS declara 4 a 130, sem decimal', () => {
  it('a linha do mapa é exatamente esta', () => {
    expect(IDADE_MANUAL.CONFIAS).toEqual({ min: 4, max: 130, decimal: false });
  });

  it('e chega ao modelo pela mesma leitura de sempre', () => {
    expect(idadeManualDe('CONFIAS')).toEqual({ min: 4, max: 130, decimal: false });
    expect(CONFIAS.idadeManual).toEqual({ min: 4, max: 130, decimal: false });
    expect(CONFIAS.idadeManual.min).toBe(4);
    expect(CONFIAS.idadeManual.max).toBe(130);
    expect(CONFIAS.idadeManual.decimal).toBe(false);
  });

  it('só o PISO muda em relação à regra genérica', () => {
    expect(CONFIAS.idadeManual.max).toBe(IDADE_MANUAL_PADRAO.max);
    expect(CONFIAS.idadeManual.decimal).toBe(IDADE_MANUAL_PADRAO.decimal);
    expect(CONFIAS.idadeManual.min).not.toBe(IDADE_MANUAL_PADRAO.min);
  });

  it('nenhum mecanismo novo foi criado', () => {
    // a regra é a mesma função e o mesmo mapa que o C-TRF já usava
    expect(idadeManualDe('CONFIAS')).toBe(IDADE_MANUAL.CONFIAS);
  });
});

// =====================================================================
// B · a validação real do formulário
// =====================================================================

describe('B · 3 anos bloqueia, 4 anos aceita', () => {
  it('3 anos é recusado — e o botão de salvar não habilita', () => {
    expect(validarIdentificacao(com('3'), CONFIAS)).toEqual(['idade_invalida']);
    expect(podeSalvar(com('3'), CONFIAS, false, false)).toBe(false);
    expect(idadeManualValida('3', CONFIAS.idadeManual)).toBeNull();
  });

  it('4 anos é aceito', () => {
    expect(validarIdentificacao(com('4'), CONFIAS)).toEqual([]);
    expect(podeSalvar(com('4'), CONFIAS, false, false)).toBe(true);
    expect(idadeManualValida('4', CONFIAS.idadeManual)).toBe(4);
  });

  it('a fronteira é fechada em 4 e aberta abaixo dele', () => {
    expect(idadeManualValida('4', CONFIAS.idadeManual)).toBe(4);
    expect(idadeManualValida('3', CONFIAS.idadeManual)).toBeNull();
    // 3,9 é recusado por DUAS razões: fração e fora da faixa. As duas
    // valem, e o resultado é o mesmo.
    expect(idadeManualValida('3.9', CONFIAS.idadeManual)).toBeNull();
    expect(validarIdentificacao(com('3.9'), CONFIAS)).toEqual(['idade_invalida']);
  });

  it('abaixo de 4 tudo é recusado', () => {
    for (const idade of ['0', '1', '2', '3', '3.99', '-1']) {
      expect(validarIdentificacao(com(idade), CONFIAS)).toEqual(['idade_invalida']);
      expect(podeSalvar(com(idade), CONFIAS, false, false)).toBe(false);
    }
  });

  it('de 4 até o teto, tudo é aceito', () => {
    for (const idade of ['4', '5', '7', '12', '60', '130']) {
      expect(validarIdentificacao(com(idade), CONFIAS)).toEqual([]);
      expect(podeSalvar(com(idade), CONFIAS, false, false)).toBe(true);
    }
    expect(validarIdentificacao(com('131'), CONFIAS)).toEqual(['idade_invalida']);
  });

  it('idade fracionada continua recusada — decimal: false', () => {
    for (const idade of ['4.5', '5.5', '7.25', '3.9']) {
      expect(idadeManualValida(idade, CONFIAS.idadeManual)).toBeNull();
      expect(validarIdentificacao(com(idade), CONFIAS)).toEqual(['idade_invalida']);
    }
  });

  it('vazio é vazio, e não idade zero', () => {
    for (const vazio of ['', '   ']) {
      expect(validarIdentificacao(com(vazio), CONFIAS)).toEqual(['idade_vazia']);
      expect(podeSalvar(com(vazio), CONFIAS, false, false)).toBe(false);
    }
  });

  it('lixo continua sendo lixo', () => {
    for (const idade of ['NaN', 'Infinity', 'abc', '4a']) {
      expect(validarIdentificacao(com(idade), CONFIAS)).toEqual(['idade_invalida']);
    }
  });

  it('campo e mensagem continuam falando em anos completos', () => {
    // sem decimal, o texto do C-TRF ("de 1,5 a 5") não vaza para cá
    expect(textoDoCampoIdade(CONFIAS.idadeManual)).toBe('Anos completos.');
    expect(textoErroIdentificacao('idade_invalida', CONFIAS.idadeManual)).toBe(
      'Informe uma idade válida em anos completos.',
    );
  });
});

// =====================================================================
// C · nada mais mudou
// =====================================================================

describe('C · o C-TRF e o genérico continuam como estavam', () => {
  it('C-TRF continua 1,5 a 5, com decimal', () => {
    expect(IDADE_MANUAL['C-TRF_1.5-5']).toEqual({ min: 1.5, max: 5, decimal: true });
    expect(idadeManualDe('C-TRF_1.5-5')).toEqual({ min: 1.5, max: 5, decimal: true });
    const CTRF = montarModelo(
      detalheConfias({ code: 'C-TRF_1.5-5', name: 'C-TRF 1.5-5' }),
    );
    expect(validarIdentificacao(com('1.5'), CTRF)).toEqual([]);
    expect(validarIdentificacao(com('5'), CTRF)).toEqual([]);
    expect(validarIdentificacao(com('8'), CTRF)).toEqual(['idade_invalida']);
  });

  it('instrumento genérico continua 0 a 130, inteiro', () => {
    expect(idadeManualDe('PHQ-9')).toEqual(IDADE_MANUAL_PADRAO);
    expect(OUTRO.idadeManual).toEqual({ min: 0, max: 130, decimal: false });
    // o 3 que o CONFIAS recusa continua valendo fora dele
    for (const idade of ['0', '3', '8', '130']) {
      expect(validarIdentificacao(com(idade), OUTRO)).toEqual([]);
    }
    expect(validarIdentificacao(com('131'), OUTRO)).toEqual(['idade_invalida']);
    for (const code of ['BPA-2', 'SDQ-POR', 'CES-D', 'TRILHAS_PRE', 'DCDQ']) {
      expect(idadeManualDe(code)).toEqual(IDADE_MANUAL_PADRAO);
    }
  });

  it('o piso 4 não vazou para instrumento nenhum', () => {
    for (const code of ['PHQ-9', 'BPA-2', 'SDQ-POR', 'CES-D', 'C-TRF_1.5-5']) {
      expect(idadeManualDe(code).min).not.toBe(4);
    }
  });
});

// =====================================================================
// D · isto é aplicabilidade, não norma
// =====================================================================

describe('D · a norma do CONFIAS continua sendo a hipótese de escrita', () => {
  const comHipotese = {
    ...preenchido,
    selector: escolherDimensao(CONFIAS, {}, 0, 'Silábica'),
  };

  it('o corpo leva a hipótese e mais nada', () => {
    expect(montarPedido(CONFIAS, comHipotese, '7').norm_selector).toEqual({
      hipotese: 'Silábica',
    });
  });

  it('nenhuma chave de idade entra no selector, em idade válida nenhuma', () => {
    for (const idade of ['4', '7', '12', '130']) {
      const pedido = montarPedido(CONFIAS, comHipotese, idade);
      expect(pedido.norm_selector).toEqual({ hipotese: 'Silábica' });
      expect(JSON.stringify(pedido.norm_selector)).not.toContain(idade);
    }
  });

  it('o CONFIAS não está em FAIXA_PELA_IDADE — o mapa da norma é outro', () => {
    expect(FAIXA_PELA_IDADE.CONFIAS).toBeUndefined();
    expect(Object.keys(FAIXA_PELA_IDADE)).toEqual(['BPA-2']);
  });

  it('as quatro hipóteses continuam escolhíveis', () => {
    expect(CONFIAS.dimensoes).toHaveLength(1);
    expect(CONFIAS.dimensoes[0].code).toBe('hipotese');
    expect(CONFIAS.dimensoes[0].opcoes).toEqual(HIPOTESES);
  });
});

// =====================================================================
// E · persistência
// =====================================================================

describe('E · a idade informada é gravada como foi informada', () => {
  it('7 anos vira { years: 7 }', () => {
    const pedido = montarPedidoAvaliacao(CONFIAS, preenchido, com('7'));
    expect(pedido.subject_meta).toEqual({
      respondent_name: 'Professora',
      age_at_evaluation: { years: 7 },
    });
  });

  it('4 anos, a fronteira, também é gravado', () => {
    const meta = montarPedidoAvaliacao(CONFIAS, preenchido, com('4'))
      .subject_meta as { age_at_evaluation: { years: number } };
    expect(meta.age_at_evaluation).toEqual({ years: 4 });
  });

  it('idade recusada não é gravada pela metade', () => {
    for (const idade of ['3', '3.9', '', 'abc']) {
      const pedido = montarPedidoAvaliacao(CONFIAS, preenchido, com(idade));
      expect(pedido.subject_meta).not.toHaveProperty('age_at_evaluation');
    }
  });
});
