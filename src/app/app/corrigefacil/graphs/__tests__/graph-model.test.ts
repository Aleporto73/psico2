// =====================================================================
// O modelo só transporta. Estes testes cobrem justamente os pontos onde
// transportar é fácil de confundir com interpretar: ausência virando
// zero, indisponível ganhando posição, faixa de outra escala vazando.
// =====================================================================

import { describe, expect, it } from 'vitest';
import type {
  EscalaInstrumento,
  FaixaClassificacao,
  ResultadoEscala,
} from '@/lib/corrigefacil/api';
import { configDoInstrumento, type ConfigGrafico } from '../graph-config';
import {
  AVISO_AMBIGUO,
  descreverSegmento,
  faixaEmFracao,
  faixasDaEscala,
  montarModelo,
  posicao,
  valorDaMetrica,
} from '../graph-model';

function resultado(p: Partial<ResultadoEscala> = {}): ResultadoEscala {
  return {
    raw: null, score: null, percentile: null, z: null,
    classification: null, available: true, message: null, flags: [],
    ...p,
  };
}

const escala = (code: string): EscalaInstrumento => ({
  code, name: code, kind: 'primaria', description: null,
  bruto_min: null, bruto_max: null,
});

function cfg(code: string): ConfigGrafico {
  const e = configDoInstrumento(code);
  if (!e || e.status !== 'aprovado') throw new Error(code);
  return e.config;
}

describe('leitura de campo', () => {
  it('14 · null nunca vira zero', () => {
    const r = resultado();
    expect(valorDaMetrica(r, 'score')).toBeNull();
    expect(valorDaMetrica(r, 'percentile')).toBeNull();
    expect(valorDaMetrica(r, 'z')).toBeNull();
    // e posição de null é null, não 0
    expect(posicao(null, { min: 0, max: 60 })).toBeNull();
  });

  it('classification não é lida como número', () => {
    expect(valorDaMetrica(resultado({ score: 75 }), 'classification')).toBeNull();
  });

  it('posição é regra de três simples, sem extrapolar o eixo', () => {
    const r = { min: 0, max: 60 };
    expect(posicao(0, r)).toBe(0);
    expect(posicao(30, r)).toBe(0.5);
    expect(posicao(60, r)).toBe(1);
    expect(posicao(90, r)).toBe(1); // preso na borda; o excedente é dito à parte
  });
});

describe('faixas', () => {
  const faixas: FaixaClassificacao[] = [
    { scale: 'I', basis: 'score', min: 65, max: 69, label: 'I limítrofe' },
    { scale: 'I', basis: 'score', min: 70, max: null, label: 'I clínica' },
    { scale: 'INT', basis: 'score', min: 60, max: 63, label: 'INT limítrofe' },
    { scale: null, basis: 'z', min: 1, max: null, label: 'z superior' },
    { scale: null, basis: 'percentual_acerto', min: 90, max: null, label: 'tarefa' },
  ];

  it('a faixa de uma escala não vaza para outra', () => {
    const doI = faixasDaEscala(faixas, 'I', 'score');
    expect(doI.map((f) => f.label)).toEqual(['I limítrofe', 'I clínica']);
    expect(doI.map((f) => f.label)).not.toContain('INT limítrofe');
  });

  it('faixa global vale só onde a escala não tem própria', () => {
    expect(faixasDaEscala(faixas, 'Sílaba', 'z').map((f) => f.label)).toEqual([
      'z superior',
    ]);
  });

  it('percentual_acerto fica fora de um gráfico de z', () => {
    const zs = faixasDaEscala(faixas, 'Sílaba', 'z');
    expect(zs.every((f) => f.basis === 'z')).toBe(true);
  });

  it('faixa aberta é descrita como aberta, sem número inventado', () => {
    expect(descreverSegmento({ de: 70, ate: null, rotulo: 'X', atual: false }))
      .toBe('X: 70 ou mais');
    expect(descreverSegmento({ de: null, ate: 64, rotulo: 'Y', atual: false }))
      .toBe('Y: até 64');
  });

  it('faixa aberta ancora na borda só para desenhar', () => {
    const f = faixaEmFracao(
      { de: 70, ate: null, rotulo: 'X', atual: false },
      { min: 0, max: 100 },
    );
    expect(f).toEqual({ inicio: 0.7, fim: 1 });
  });

  it('a faixa atual sai do RÓTULO que o servidor mandou', () => {
    const m = montarModelo(
      cfg('CES-D'),
      { TOTAL: resultado({ score: 20, classification: 'Indicativo' }) },
      [
        { scale: 'TOTAL', basis: 'score', min: 0, max: 15, label: 'Sem indício' },
        { scale: 'TOTAL', basis: 'score', min: 16, max: 60, label: 'Indicativo' },
      ],
      [escala('TOTAL')],
    );
    const segs = m.blocos[0].pontos[0].segmentos;
    expect(segs.find((s) => s.atual)?.rotulo).toBe('Indicativo');
    expect(segs.filter((s) => s.atual)).toHaveLength(1);
  });
});

describe('estados', () => {
  it('15 · available=false não produz ponto quantitativo', () => {
    const m = montarModelo(
      cfg('CES-D'),
      {
        TOTAL: resultado({
          available: false,
          score: 42, // veio no payload e mesmo assim não pode posicionar
          message: 'não há norma publicada para esta idade neste domínio',
        }),
      },
      [],
      [escala('TOTAL')],
    );
    const p = m.blocos[0].pontos[0];
    expect(p.disponivel).toBe(false);
    expect(p.valor).toBeNull();
    expect(p.mensagem).toMatch(/não há norma/);
  });

  it('16 · ambiguous vira aviso textual e não move o ponto', () => {
    const m = montarModelo(
      cfg('CES-D'),
      { TOTAL: resultado({ score: 20, flags: ['ambiguous'] }) },
      [],
      [escala('TOTAL')],
    );
    const p = m.blocos[0].pontos[0];
    expect(p.ambiguo).toBe(true);
    expect(p.valor).toBe(20); // posição inalterada
    expect(AVISO_AMBIGUO).toMatch(/menor escore/);
    expect(AVISO_AMBIGUO).not.toMatch(/revis(ão|ar) clínica/);
  });

  it('escala configurada e ausente do resultado é omitida', () => {
    const m = montarModelo(
      cfg('BPA-2'),
      { AA: resultado({ percentile: 55 }) },
      [],
      [escala('AA'), escala('AC'), escala('AD')],
    );
    expect(m.blocos[0].pontos.map((p) => p.escala)).toEqual(['AA']);
  });
});

describe('montagem por instrumento', () => {
  it('ERA: inclusão por exclusão pega os fatores do catálogo', () => {
    const catalogo = [
      escala('Comunicação Social'),
      escala('Interação Social'),
      escala('Sensibilidade Sensorial'),
      escala('Padrões Restritos e Repetitivos'),
      escala('Escore Geral'),
    ];
    const resultados = Object.fromEntries(
      catalogo.map((e) => [e.code, resultado({ percentile: 50 })]),
    );
    const m = montarModelo(cfg('ERA-A'), resultados, [], catalogo);
    const codes = m.blocos[0].pontos.map((p) => p.escala);
    expect(codes).toHaveLength(4);
    expect(codes).not.toContain('Escore Geral');
  });

  it('BAYLEY: IC95 só aparece onde veio', () => {
    const doms = [
      'DOM_Cognitivo', 'DOM_Linguagem', 'DOM_Motora',
      'DOM_Socioemocional', 'DOM_Adaptativo',
    ];
    const resultados = Object.fromEntries(
      doms.map((d) => [
        d,
        resultado({
          score: 100,
          // o Adaptativo não tem IC95 publicado em nenhuma linha
          ci95: d === 'DOM_Adaptativo' ? undefined : '95-105',
        }),
      ]),
    );
    const m = montarModelo(cfg('BAYLEY-III'), resultados, [], doms.map(escala));
    const adapt = m.blocos[0].pontos.find((p) => p.escala === 'DOM_Adaptativo');
    expect(adapt?.ci95).toBeNull();
    expect(m.blocos[0].pontos.filter((p) => p.ci95 !== null)).toHaveLength(4);
  });

  it('C-TRF: cada bloco recebe só as escalas dele', () => {
    const codes = ['I', 'II', 'III', 'IV', 'V', 'VI', 'INT', 'EXT', 'TOT'];
    const resultados = Object.fromEntries(
      codes.map((c) => [c, resultado({ score: 60 })]),
    );
    const m = montarModelo(cfg('C-TRF_1.5-5'), resultados, [], codes.map(escala));
    expect(m.blocos).toHaveLength(2);
    expect(m.blocos[0].pontos.map((p) => p.escala)).toEqual([
      'I', 'II', 'III', 'IV', 'V', 'VI',
    ]);
    expect(m.blocos[1].pontos.map((p) => p.escala)).toEqual(['INT', 'EXT', 'TOT']);
  });

  it('CONFIAS: valor fora de -3..+3 é marcado como excedente', () => {
    const m = montarModelo(
      cfg('CONFIAS'),
      { 'Sílaba': resultado({ z: -4.2 }), Fonema: resultado({ z: 0.5 }) },
      [],
      [escala('Sílaba'), escala('Fonema')],
    );
    const silaba = m.blocos[0].pontos[0];
    expect(silaba.excedente).toBe('abaixo');
    expect(silaba.valor).toBe(-4.2); // o valor NÃO é truncado no modelo
    expect(m.blocos[0].pontos[1].excedente).toBeNull();
  });

  it('sem domínio declarado, o modelo bloqueia em vez de inventar eixo', () => {
    for (const code of ['TDF', 'TRILHAS_PRE', 'C-TRF_1.5-5']) {
      const c = cfg(code);
      const codes = c.blocos.flatMap((b) => b.escalas ?? []);
      const resultados = Object.fromEntries(
        codes.map((x) => [x, resultado({ score: 100 })]),
      );
      const m = montarModelo(c, resultados, [], codes.map(escala));
      expect(m.bloqueio, code).toBeTruthy();
    }
  });

  it('ETPC não bloqueia: a classificação basta, sem eixo', () => {
    const codes = ['Psicoticismo', 'Extroversão', 'Neuroticismo', 'Sociabilidade'];
    const resultados = Object.fromEntries(
      codes.map((c) => [c, resultado({ score: 75, classification: 'Quartil superior' })]),
    );
    const m = montarModelo(cfg('ETPC'), resultados, [], codes.map(escala));
    expect(m.bloqueio).toBeUndefined();
    // e o número do quartil não vira posição
    expect(m.blocos[0].pontos[0].valor).toBeNull();
  });
});
