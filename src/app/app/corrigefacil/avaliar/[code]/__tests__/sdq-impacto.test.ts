// =====================================================================
// SDQ-POR · a Seção de Impacto na TELA.
//
// A seção é o primeiro caso em que `secao` e `auxiliar` DEIXAM de andar
// juntos: o gate (26), a duração (27) e o peso sobre o professor (31) não
// pontuam; os itens 28, 29 e 30 pontuam na escala IMPACTO. Os seis são o
// mesmo bloco na tela, sob um cabeçalho só.
//
// E é o primeiro caso com PORTA. Do lado do formulário isso tem quatro
// consequências, e são as quatro que este arquivo trava:
//
//   1. antes de o gate ser respondido, 27-31 não aparecem
//   2. gate = Não  -> continuam fora, e 28-30 não seguram o envio
//   3. gate > 0    -> aparecem, e 28-30 passam a segurar o envio;
//                     27 e 31 continuam opcionais
//   4. o que a porta esconde não é ENVIADO
//
// Nada aqui calcula IMPACTO. Quem pontua, aplica a porta e classifica é o
// servidor — a regra desta tela existe para o botão Corrigir concordar com
// ele, e o espelho está em `GATE_POR_INSTRUMENTO`.
// =====================================================================

import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import {
  GATE_POR_INSTRUMENTO,
  estadoDoGate,
  itensVisiveis,
  montarModelo,
  secoesDeItens,
} from '../form-model';
import {
  estadoInicial,
  itensExigidos,
  montarPedido,
  pendencias,
  podeEnviar,
  progresso,
  type EstadoFormulario,
} from '../form-state';

const SECAO = 'Seção de Impacto do SDQ';

const TRES_PONTOS = [
  { label: 'Falso', value: 0 },
  { label: 'Mais ou Menos', value: 1 },
  { label: 'Verdadeiro', value: 2 },
];

const DIFICULDADE = [
  { label: 'Não', value: 0 },
  { label: 'Pequenas Dificuldades', value: 1 },
  { label: 'Dificuldades Definidas', value: 2 },
  { label: 'Dificuldades Graves', value: 3 },
];

const DURACAO = [
  { label: 'Menos de 1 Mês', value: 0 },
  { label: '1-5 Meses', value: 1 },
  { label: '6-12 Meses', value: 2 },
  { label: 'Mais de 1 Ano', value: 3 },
];

// A tela recebe só rótulo e valor. Os pontos (0/0/1/2) são chave de
// pontuação e não saem do servidor — é por isso que não estão aqui.
const IMPACTO = [
  { label: 'Nada', value: 0 },
  { label: 'Um Pouco', value: 1 },
  { label: 'Muito', value: 2 },
  { label: 'Mais que Muito', value: 3 },
];

/** O catálogo do SDQ-POR como a Edge o devolve: 25 itens na lista global,
 *  mais os seis da seção. Repare que 28, 29 e 30 saem SEM `auxiliar` —
 *  eles pontuam — e mesmo assim com `secao`. */
function sdq(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  return {
    code: 'SDQ-POR',
    name: 'SDQ-Por · Questionário de Capacidades e Dificuldades',
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [
      { code: 'EMO', name: 'Dificuldades Emocionais', kind: 'primaria', description: null, bruto_min: 0, bruto_max: 10 },
      { code: 'IMPACTO', name: 'Escore de Impacto', kind: 'primaria', description: null, bruto_min: 0, bruto_max: 6 },
      { code: 'TOTAL', name: 'Total de Dificuldades', kind: 'composta', description: null, bruto_min: 0, bruto_max: 40 },
    ],
    itens: [
      ...Array.from({ length: 25 }, (_, i) => ({
        numero: i + 1,
        texto: `Item ${i + 1}`,
      })),
      { numero: 26, texto: 'A criança tem alguma dificuldade?', opcoes: DIFICULDADE, auxiliar: true, secao: SECAO },
      { numero: 27, texto: 'Por quanto tempo essas dificuldades existem?', opcoes: DURACAO, auxiliar: true, secao: SECAO },
      { numero: 28, texto: 'Essas dificuldades incomodam ou aborrecem a criança?', opcoes: IMPACTO, secao: SECAO },
      { numero: 29, texto: 'Essas dificuldades interferem no dia a dia da criança? Amizades', opcoes: IMPACTO, secao: SECAO },
      { numero: 30, texto: 'Essas dificuldades interferem no dia a dia da criança? Aprendizado Escolar', opcoes: IMPACTO, secao: SECAO },
      { numero: 31, texto: 'Essas dificuldades são um peso para você ou para a classe como um todo?', opcoes: IMPACTO, auxiliar: true, secao: SECAO },
    ],
    opcoes_resposta: TRES_PONTOS,
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

const modelo = () => montarModelo(sdq());

/** Os 25 principais respondidos; a seção fica a cargo de cada teste. */
function comOsVinteECinco(extra: Record<number, number> = {}): EstadoFormulario {
  const respostas: Record<number, number> = {};
  for (let n = 1; n <= 25; n++) respostas[n] = 0;
  return { ...estadoInicial(), respostas: { ...respostas, ...extra } };
}

const numeros = (itens: { numero: number }[]) => itens.map((i) => i.numero);

// ---------------------------------------------------------------------

describe('a seção mistura item que pontua com item que não pontua', () => {
  it('28, 29 e 30 pertencem à seção E continuam pontuando', () => {
    const m = modelo();
    const naSecao = m.itens.filter((i) => i.secao === SECAO);
    expect(numeros(naSecao)).toEqual([26, 27, 28, 29, 30, 31]);

    for (const n of [28, 29, 30]) {
      const item = m.itens.find((i) => i.numero === n)!;
      expect(item.auxiliar, `o item ${n} pontua`).toBe(false);
      expect(item.secao, `o item ${n} está na seção`).toBe(SECAO);
    }
    for (const n of [26, 27, 31]) {
      expect(m.itens.find((i) => i.numero === n)!.auxiliar).toBe(true);
    }
  });

  it('o título aparece UMA vez, não uma por pergunta', () => {
    const m = montarModelo(sdq());
    const secoes = secoesDeItens(m.itens);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe(SECAO);
    expect(numeros(secoes[0].itens)).toEqual([26, 27, 28, 29, 30, 31]);
  });

  it('os 25 principais ficam na lista principal, sem seção', () => {
    const m = modelo();
    const semSecao = m.itens.filter((i) => !i.secao);
    expect(numeros(semSecao)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
});

describe('visibilidade pela porta', () => {
  it('antes de responder o gate: só o gate aparece da seção', () => {
    const m = modelo();
    const est = comOsVinteECinco();
    expect(estadoDoGate(m, est.respostas)).toBe('nao_respondido');

    const visiveis = numeros(itensVisiveis(m, est.respostas));
    expect(visiveis).toContain(26);
    for (const n of [27, 28, 29, 30, 31]) {
      expect(visiveis, `o item ${n} não pode aparecer ainda`).not.toContain(n);
    }
    // e a seção desenhada tem uma pergunta só
    expect(numeros(secoesDeItens(itensVisiveis(m, est.respostas))[0].itens))
      .toEqual([26]);
  });

  it('gate = Não: continua só o gate', () => {
    const m = modelo();
    const est = comOsVinteECinco({ 26: 0 });
    expect(estadoDoGate(m, est.respostas)).toBe('fechado');
    expect(numeros(itensVisiveis(m, est.respostas)).filter((n) => n > 25))
      .toEqual([26]);
  });

  it('gate > 0: aparecem 27 a 31', () => {
    for (const porta of [1, 2, 3]) {
      const m = modelo();
      const est = comOsVinteECinco({ 26: porta });
      expect(estadoDoGate(m, est.respostas)).toBe('aberto');
      expect(numeros(itensVisiveis(m, est.respostas)).filter((n) => n > 25))
        .toEqual([26, 27, 28, 29, 30, 31]);
    }
  });
});

describe('o botão Corrigir obedece à porta', () => {
  it('o gate é obrigatório mesmo sem pontuar', () => {
    const m = modelo();
    const est = comOsVinteECinco();
    expect(itensExigidos(m, est.respostas)).toContain(26);
    expect(pendencias(m, est)).toEqual([{ tipo: 'itens', faltam: [26] }]);
    expect(podeEnviar(m, est, false)).toBe(false);
  });

  it('gate = Não: fecha sem 28-30', () => {
    const m = modelo();
    const est = comOsVinteECinco({ 26: 0 });
    const exigidos = itensExigidos(m, est.respostas);
    for (const n of [28, 29, 30]) {
      expect(exigidos, `o item ${n} não pode ser exigido`).not.toContain(n);
    }
    expect(pendencias(m, est)).toEqual([]);
    expect(podeEnviar(m, est, false)).toBe(true);
  });

  it('gate > 0: 28, 29 e 30 seguram o envio, um a um', () => {
    const m = modelo();
    const cheio = comOsVinteECinco({ 26: 2, 28: 0, 29: 1, 30: 2 });
    expect(podeEnviar(m, cheio, false)).toBe(true);

    for (const ausente of [28, 29, 30]) {
      const respostas = { ...cheio.respostas };
      delete respostas[ausente];
      const est = { ...cheio, respostas };
      expect(pendencias(m, est)).toEqual([{ tipo: 'itens', faltam: [ausente] }]);
      expect(podeEnviar(m, est, false)).toBe(false);
    }
  });

  it('gate > 0: duração e peso continuam OPCIONAIS', () => {
    const m = modelo();
    const est = comOsVinteECinco({ 26: 3, 28: 3, 29: 3, 30: 3 });
    const exigidos = itensExigidos(m, est.respostas);
    expect(exigidos).not.toContain(27);
    expect(exigidos).not.toContain(31);
    expect(podeEnviar(m, est, false)).toBe(true);
  });

  it('o contador conta o que a porta exige agora', () => {
    const m = modelo();
    // fechada: 25 principais + o gate
    expect(progresso(m, comOsVinteECinco({ 26: 0 }))).toEqual({
      respondidos: 26,
      total: 26,
    });
    // aberta: entram as três parcelas, e é isso que passa a faltar
    expect(progresso(m, comOsVinteECinco({ 26: 1 }))).toEqual({
      respondidos: 26,
      total: 29,
    });
    expect(progresso(m, comOsVinteECinco({ 26: 1, 28: 0, 29: 0, 30: 0 }))).toEqual({
      respondidos: 29,
      total: 29,
    });
  });
});

describe('o que a porta esconde não é enviado', () => {
  it('gate = Não não manda 28-30, mesmo com resposta antiga no estado', () => {
    const m = modelo();
    // o profissional respondeu a seção inteira e depois voltou o gate para
    // "Não". O estado guarda o que ele digitou — reabrir a porta traz tudo
    // de volta — mas o protocolo enviado não pode dizer que a criança é
    // muito atrapalhada por uma dificuldade que ele acabou de negar.
    const est = comOsVinteECinco({ 26: 0, 27: 3, 28: 3, 29: 3, 30: 3, 31: 3 });
    const pedido = montarPedido(m, est);
    const enviados = Object.keys(pedido.respostas ?? {}).map(Number).sort((a, b) => a - b);

    expect(enviados).toContain(26);
    for (const n of [27, 28, 29, 30, 31]) {
      expect(enviados, `o item ${n} não podia ir`).not.toContain(n);
    }
    // e as respostas continuam no ESTADO, para reabrir a porta não custar
    // um retrabalho
    expect(est.respostas[28]).toBe(3);
  });

  it('gate > 0 manda a seção inteira, auxiliares inclusive', () => {
    const m = modelo();
    const est = comOsVinteECinco({ 26: 2, 27: 3, 28: 1, 29: 2, 30: 3, 31: 3 });
    const enviados = Object.keys(montarPedido(m, est).respostas ?? {}).map(Number);
    for (const n of [26, 27, 28, 29, 30, 31]) {
      expect(enviados, `o item ${n} tinha de ir`).toContain(n);
    }
    expect(enviados).toHaveLength(31);
  });
});

describe('o espelho do servidor', () => {
  it('a porta declarada é a mesma de engine/calc.py e da Edge', () => {
    expect(GATE_POR_INSTRUMENTO['SDQ-POR']).toEqual({
      item: 26,
      fechado: 0,
      dependentes: [27, 28, 29, 30, 31],
      exigidos: [28, 29, 30],
    });
  });

  it('nenhum outro instrumento ganhou porta', () => {
    expect(Object.keys(GATE_POR_INSTRUMENTO)).toEqual(['SDQ-POR']);
  });

  it('instrumento sem porta tem a lista inteira sempre visível', () => {
    const m = montarModelo(sdq({ code: 'OUTRO' }));
    expect(m.gate).toBeNull();
    expect(itensVisiveis(m, {})).toHaveLength(31);
    expect(estadoDoGate(m, {})).toBe('sem_gate');
  });
});
