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

const escala = (code: string, kind = 'primaria'): EscalaInstrumento => ({
  code, name: code, kind, description: null,
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

  it('CES-D escore 25 cai no mesmo ponto de sempre', () => {
    // a correção do marcador para impressão é de PINTURA, não de
    // geometria: esta fração é a que o `left` usa, e não pode mudar
    const c = cfg('CES-D');
    expect(c.range).toEqual({ min: 0, max: 60 });
    expect(posicao(25, c.range)).toBeCloseTo(25 / 60, 10);
    expect(posicao(25, c.range)).toBeCloseTo(0.4166666667, 9);
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
  it('ERA: entram os 4 fatores primários; o Escore Geral não', () => {
    for (const code of ['ERA-A', 'ERA-F']) {
      const catalogo = [
        escala('Fator 1'), escala('Fator 2'),
        escala('Fator 3'), escala('Fator 4'),
        escala('Escore Geral', 'composta'),
      ];
      const resultados = Object.fromEntries(
        catalogo.map((e) => [e.code, resultado({ percentile: 50 })]),
      );
      const m = montarModelo(cfg(code), resultados, [], catalogo);
      const codes = m.blocos[0].pontos.map((p) => p.escala);
      expect(codes, code).toHaveLength(4);
      expect(codes, code).not.toContain('Escore Geral');
    }
  });

  it('ERA é FAIL-CLOSED: escala nova de outro kind não entra sozinha', () => {
    // é a propriedade, não a contagem: uma escala futura acrescentada ao
    // catálogo NÃO pode aparecer no gráfico sem passar por G0
    const catalogo = [
      escala('Fator 1'), escala('Fator 2'),
      escala('Fator 3'), escala('Fator 4'),
      escala('Escore Geral', 'composta'),
      escala('Escala Nova de Validade', 'validade'),
      escala('Escala Nova Composta', 'composta'),
    ];
    const resultados = Object.fromEntries(
      catalogo.map((e) => [e.code, resultado({ percentile: 50 })]),
    );
    const m = montarModelo(cfg('ERA-A'), resultados, [], catalogo);
    const codes = m.blocos[0].pontos.map((p) => p.escala);

    expect(codes).toEqual(['Fator 1', 'Fator 2', 'Fator 3', 'Fator 4']);
    expect(codes).not.toContain('Escala Nova de Validade');
    expect(codes).not.toContain('Escala Nova Composta');
    expect(codes).not.toContain('Escore Geral');
  });

  it('bloco sem escalas nem kind declarado não inclui ninguém', () => {
    // a outra metade do fail-closed: omissão não é permissão
    const m = montarModelo(
      {
        familia: 'score_band', metrica: 'score',
        blocos: [{}], direcao: 'ascendente_favoravel', tom: 'neutro',
        range: { min: 0, max: 10 },
      },
      { QUALQUER: resultado({ score: 5 }) },
      [],
      [escala('QUALQUER')],
    );
    expect(m.blocos[0].pontos).toHaveLength(0);
  });

  it('SCARED-C: 5 small multiples e o TOTAL desenhando em 0..82', () => {
    const e = configDoInstrumento('SCARED-C');
    if (e?.status !== 'aprovado') throw new Error('SCARED-C');
    const subs = ['PANICO', 'GENERALIZADA', 'SEPARACAO', 'SOCIAL', 'ESCOLAR'];
    const catalogo = [...subs, 'TOTAL'].map((c) => escala(c));
    const resultados = Object.fromEntries(
      catalogo.map((x) => [x.code, resultado({ score: 5 })]),
    );

    const mSubs = montarModelo(e.config, resultados, [], catalogo);
    expect(mSubs.blocos[0].pontos.map((p) => p.escala)).toEqual(subs);
    expect(mSubs.bloqueio).toBeUndefined();

    const mTotal = montarModelo(e.complementos![0], resultados, [], catalogo);
    expect(mTotal.familia).toBe('score_band');
    expect(mTotal.blocos[0].pontos.map((p) => p.escala)).toEqual(['TOTAL']);
    // domínio declarado em G0: o TOTAL desenha, e o eixo é o do escore
    // bruto (score = raw por identidade), não a soma dos tetos das cinco
    expect(mTotal.bloqueio).toBeUndefined();
    expect(mTotal.blocos[0].range).toEqual({ min: 0, max: 82 });
    expect(mTotal.blocos[0].pontos[0].range).toEqual({ min: 0, max: 82 });
    // e um escore dentro do domínio não é excedente
    expect(mTotal.blocos[0].pontos[0].excedente).toBeNull();
  });

  it('EPQ-J: P/E/N no perfil, S só no complemento, e nada recalculado', () => {
    const e = configDoInstrumento('EPQ-J');
    if (e?.status !== 'aprovado') throw new Error('EPQ-J');

    // o nome vem do CATÁLOGO, não do registro visual: é ele que faz a
    // linha de S aparecer como "Sinceridade" ao lado do título do bloco
    const catalogo: EscalaInstrumento[] = [
      escala('P'), escala('E'), escala('N'),
      { ...escala('S', 'validade'), name: 'Sinceridade' },
    ];
    const resultados: Record<string, ResultadoEscala> = {
      P: resultado({ percentile: 40, classification: 'Média' }),
      E: resultado({ percentile: 75, classification: 'Média' }),
      N: resultado({ percentile: 90, classification: 'Alta' }),
      S: resultado({ percentile: 15, classification: 'Baixa' }),
    };

    // PRIMEIRO modelo · os três traços, e só eles
    const perfil = montarModelo(e.config, resultados, [], catalogo);
    expect(perfil.blocos).toHaveLength(1);
    expect(perfil.blocos[0].titulo).toBe('Perfil de traços');
    expect(perfil.blocos[0].pontos.map((p) => p.escala)).toEqual(['P', 'E', 'N']);
    expect(perfil.blocos[0].pontos.map((p) => p.escala)).not.toContain('S');
    expect(perfil.bloqueio).toBeUndefined();

    // SEGUNDO modelo · a Sinceridade sozinha, com título próprio
    const sinceridade = montarModelo(e.complementos![0], resultados, [], catalogo);
    expect(sinceridade.blocos).toHaveLength(1);
    expect(sinceridade.blocos[0].titulo).toBe('Escala de Sinceridade');
    expect(sinceridade.blocos[0].pontos.map((p) => p.escala)).toEqual(['S']);
    expect(sinceridade.bloqueio).toBeUndefined();

    // NADA é recalculado: percentil e classificação são os campos que o
    // servidor mandou, transportados inteiros
    const s = sinceridade.blocos[0].pontos[0];
    expect(s.nome).toBe('Sinceridade');
    expect(s.valor).toBe(15);
    expect(s.classificacao).toBe('Baixa');
    expect(s.disponivel).toBe(true);
    expect(s.excedente).toBeNull();

    // a régua percentílica é a mesma nos dois — separar não mudou o eixo
    expect(sinceridade.blocos[0].range).toEqual({ min: 0, max: 100 });
    expect(s.range).toEqual({ min: 0, max: 100 });
    expect(perfil.blocos[0].range).toEqual({ min: 0, max: 100 });

    for (const p of perfil.blocos[0].pontos) {
      expect(p.valor, p.escala).toBe(resultados[p.escala].percentile);
      expect(p.classificacao, p.escala).toBe(resultados[p.escala].classification);
    }

    // sem faixas no cliente (EPQ-J não tem classification_bands), nenhum
    // segmento é inventado em nenhum dos dois modelos
    expect(s.segmentos).toEqual([]);
    for (const p of perfil.blocos[0].pontos) {
      expect(p.segmentos, p.escala).toEqual([]);
    }
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
    const m = montarModelo(cfg('BAYLEY-III'), resultados, [], doms.map((c) => escala(c)));
    const adapt = m.blocos[0].pontos.find((p) => p.escala === 'DOM_Adaptativo');
    expect(adapt?.ci95).toBeNull();
    expect(m.blocos[0].pontos.filter((p) => p.ci95 !== null)).toHaveLength(4);
  });

  it('C-TRF: cada bloco recebe só as escalas dele', () => {
    const codes = ['I', 'II', 'III', 'IV', 'V', 'VI', 'INT', 'EXT', 'TOT'];
    const resultados = Object.fromEntries(
      codes.map((c) => [c, resultado({ score: 60 })]),
    );
    const m = montarModelo(cfg('C-TRF_1.5-5'), resultados, [], codes.map((c) => escala(c)));
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

  it('TDF: desenha em 40..160 e marca excedente sem truncar o valor', () => {
    const janela = { min: 40, max: 160, overflow: true };
    const catalogo = [escala('TOTAL')];

    // dentro da janela: sem excedente
    const dentro = montarModelo(
      cfg('TDF'), { TOTAL: resultado({ score: 100 }) }, [], catalogo,
    );
    expect(dentro.bloqueio).toBeUndefined();
    expect(dentro.blocos[0].range).toEqual(janela);
    expect(dentro.blocos[0].pontos[0].valor).toBe(100);
    expect(dentro.blocos[0].pontos[0].excedente).toBeNull();

    // abaixo e acima: o VALOR continua exato, só a posição encosta na borda
    const abaixo = montarModelo(
      cfg('TDF'), { TOTAL: resultado({ score: 30 }) }, [], catalogo,
    );
    expect(abaixo.blocos[0].pontos[0].excedente).toBe('abaixo');
    expect(abaixo.blocos[0].pontos[0].valor).toBe(30);

    const acima = montarModelo(
      cfg('TDF'), { TOTAL: resultado({ score: 170 }) }, [], catalogo,
    );
    expect(acima.blocos[0].pontos[0].excedente).toBe('acima');
    expect(acima.blocos[0].pontos[0].valor).toBe(170);

    // 229 é alcançável nas tabelas de conversão do TDF: continua inteiro
    const extremo = montarModelo(
      cfg('TDF'), { TOTAL: resultado({ score: 229 }) }, [], catalogo,
    );
    expect(extremo.blocos[0].pontos[0].valor).toBe(229);
    expect(extremo.blocos[0].pontos[0].excedente).toBe('acima');

    // a posição é presa à borda, mas isso é desenho — não toca o valor
    expect(posicao(229, janela)).toBe(1);
    expect(posicao(30, janela)).toBe(0);
  });

  it('TDF: idade sem norma continua sem ponto quantitativo', () => {
    // a janela NÃO cria valor onde o servidor disse que não há norma
    const m = montarModelo(
      cfg('TDF'),
      {
        TOTAL: resultado({
          score: 100,
          available: false,
          message: 'não há norma publicada para esta idade neste domínio',
        }),
      },
      [],
      [escala('TOTAL')],
    );
    const p = m.blocos[0].pontos[0];
    expect(p.disponivel).toBe(false);
    expect(p.valor).toBeNull();
    expect(p.excedente).toBeNull();
    expect(posicao(p.valor, p.range)).toBeNull();
  });

  it('TRILHAS_PRE: as quatro no MESMO eixo 40..160, com excedente', () => {
    const janela = { min: 40, max: 160, overflow: true };
    const codes = ['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON'];

    const m = montarModelo(
      cfg('TRILHAS_PRE'),
      {
        'A-SEQ': resultado({ score: 100 }),
        // 66 é o piso das tabelas (A-CON, idade 6, bruto 1): dentro da janela
        'A-CON': resultado({ score: 66 }),
        // 183 é o teto das tabelas (B-SEQ, idade 4, bruto 10): FORA dela
        'B-SEQ': resultado({ score: 183 }),
        'B-CON': resultado({ score: 125 }),
      },
      [],
      codes.map((c) => escala(c)),
    );

    expect(m.bloqueio).toBeUndefined();
    expect(m.blocos).toHaveLength(1);
    expect(m.blocos[0].pontos.map((p) => p.escala)).toEqual(codes);
    // UM eixo para as quatro
    expect(m.blocos[0].range).toEqual(janela);
    for (const p of m.blocos[0].pontos) {
      expect(p.range, p.escala).toEqual(janela);
    }

    const [aseq, acon, bseq, bcon] = m.blocos[0].pontos;

    expect(aseq.valor).toBe(100);
    expect(aseq.excedente).toBeNull();

    expect(acon.valor).toBe(66);
    expect(acon.excedente).toBeNull();

    // o valor NÃO vira 160
    expect(bseq.valor).toBe(183);
    expect(bseq.excedente).toBe('acima');
    expect(posicao(183, janela)).toBe(1);

    expect(bcon.valor).toBe(125);
    expect(bcon.excedente).toBeNull();
  });

  it('TRILHAS_PRE: escala sem norma não ganha barra inventada', () => {
    // bruto 0 e bruto acima do teto ficam sem linha de norma
    const m = montarModelo(
      cfg('TRILHAS_PRE'),
      {
        'A-SEQ': resultado({ score: 92 }),
        'A-CON': resultado({
          score: 98,
          available: false,
          message: 'não há norma publicada para esta idade neste domínio',
        }),
        'B-SEQ': resultado({ score: 108 }),
        'B-CON': resultado({ score: 94 }),
      },
      [],
      ['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON'].map((c) => escala(c)),
    );

    const acon = m.blocos[0].pontos.find((p) => p.escala === 'A-CON')!;
    expect(acon.disponivel).toBe(false);
    expect(acon.valor).toBeNull();
    expect(acon.excedente).toBeNull();
    expect(posicao(acon.valor, acon.range)).toBeNull();
    // e as outras três continuam desenhando normalmente
    expect(
      m.blocos[0].pontos.filter((p) => p.valor !== null).map((p) => p.escala),
    ).toEqual(['A-SEQ', 'B-SEQ', 'B-CON']);
  });

  it('C-TRF: os DOIS blocos no mesmo eixo 29..100', () => {
    const eixo = { min: 29, max: 100 };
    const c = cfg('C-TRF_1.5-5');
    const codes = c.blocos.flatMap((b) => b.escalas ?? []);

    const m = montarModelo(
      c,
      {
        // síndromes: piso 50 no acervo, e o corte clínico em 70
        I: resultado({ score: 50 }),
        II: resultado({ score: 70 }),
        III: resultado({ score: 65 }),
        IV: resultado({ score: 100 }),
        V: resultado({ score: 58 }),
        VI: resultado({ score: 82 }),
        // bandas largas: descem ABAIXO de 50 — é o que 50..100 quebraria
        INT: resultado({ score: 34 }),
        EXT: resultado({ score: 36 }),
        TOT: resultado({ score: 29 }),
      },
      [],
      codes.map((x) => escala(x)),
    );

    expect(m.bloqueio).toBeUndefined();
    expect(m.blocos).toHaveLength(2);
    expect(m.blocos[0].pontos.map((p) => p.escala)).toEqual([
      'I', 'II', 'III', 'IV', 'V', 'VI',
    ]);
    expect(m.blocos[1].pontos.map((p) => p.escala)).toEqual(['INT', 'EXT', 'TOT']);
    // mesmo eixo nos dois blocos
    expect(m.blocos[0].range).toEqual(eixo);
    expect(m.blocos[1].range).toEqual(eixo);

    // nenhum valor transformado, e nada excedente: as tabelas cabem no eixo
    const todos = [...m.blocos[0].pontos, ...m.blocos[1].pontos];
    expect(todos.map((p) => p.valor)).toEqual([
      50, 70, 65, 100, 58, 82, 34, 36, 29,
    ]);
    for (const p of todos) {
      expect(p.excedente, p.escala).toBeNull();
    }

    // as pontas do eixo são exatamente as pontas do acervo
    expect(posicao(29, eixo)).toBe(0);
    expect(posicao(100, eixo)).toBe(1);
    // e um piso em 50 teria empurrado INT/EXT/TOT para fora
    for (const fora of [34, 36, 29]) {
      expect(fora).toBeLessThan(50);
    }
  });

  it('C-TRF: escala sem norma não ganha barra inventada', () => {
    const c = cfg('C-TRF_1.5-5');
    const codes = c.blocos.flatMap((b) => b.escalas ?? []);
    const resultados = Object.fromEntries(
      codes.map((x) => [x, resultado({ score: 60 })]),
    );
    resultados.TOT = resultado({
      score: 60,
      available: false,
      message: 'não há norma publicada para esta idade neste domínio',
    });

    const m = montarModelo(c, resultados, [], codes.map((x) => escala(x)));
    const tot = m.blocos[1].pontos.find((p) => p.escala === 'TOT')!;
    expect(tot.disponivel).toBe(false);
    expect(tot.valor).toBeNull();
    expect(tot.excedente).toBeNull();
    expect(posicao(tot.valor, tot.range)).toBeNull();
    // INT e EXT continuam desenhando
    expect(
      m.blocos[1].pontos.filter((p) => p.valor !== null).map((p) => p.escala),
    ).toEqual(['INT', 'EXT']);
  });

  it('DCDQ: só posição em 15..75, sem nenhum segmento', () => {
    const eixo = { min: 15, max: 75 };
    // os DOIS rótulos possíveis são strings PRONTAS do servidor. O
    // frontend não sabe a que escore correspondem — e não pode saber.
    const ABAIXO =
      'Indicação ou suspeita de Transtorno de Desenvolvimento da Coordenação';
    const ACIMA =
      'Provavelmente não há Transtorno de Desenvolvimento da Coordenação';

    // DCDQ não tem classification_bands: faixas SEMPRE vazio
    const monta = (score: number, classification: string) =>
      montarModelo(
        cfg('DCDQ'),
        { TOTAL: resultado({ raw: score, score, classification }) },
        [],
        [escala('TOTAL')],
      );

    const piso = monta(15, ABAIXO);
    expect(piso.bloqueio).toBeUndefined();
    expect(piso.blocos[0].range).toEqual(eixo);
    expect(piso.blocos[0].pontos[0].valor).toBe(15);
    expect(posicao(15, eixo)).toBe(0);
    expect(piso.blocos[0].pontos[0].segmentos).toEqual([]);
    // a classificação atravessa intacta, sem ser recalculada
    expect(piso.blocos[0].pontos[0].classificacao).toBe(ABAIXO);

    const meio = monta(45, ABAIXO);
    expect(meio.blocos[0].pontos[0].valor).toBe(45);
    expect(posicao(45, eixo)).toBe(0.5);
    expect(meio.blocos[0].pontos[0].segmentos).toEqual([]);

    const teto = monta(75, ACIMA);
    expect(teto.blocos[0].pontos[0].valor).toBe(75);
    expect(posicao(75, eixo)).toBe(1);
    expect(teto.blocos[0].pontos[0].segmentos).toEqual([]);
    expect(teto.blocos[0].pontos[0].classificacao).toBe(ACIMA);

    // o mesmo escore com o OUTRO rótulo continua sendo o que o servidor
    // disse: é a prova de que o frontend não deriva classificação do
    // número. 56 tem rótulos opostos conforme a faixa etária, e o modelo
    // não tem como saber qual — nem tenta.
    expect(monta(56, ABAIXO).blocos[0].pontos[0].classificacao).toBe(ABAIXO);
    expect(monta(56, ACIMA).blocos[0].pontos[0].classificacao).toBe(ACIMA);
  });

  it('DCDQ: nenhum corte etário aparece no modelo', () => {
    const m = montarModelo(
      cfg('DCDQ'),
      { TOTAL: resultado({ raw: 50, score: 50, classification: 'qualquer' }) },
      [],
      [escala('TOTAL')],
    );
    const texto = JSON.stringify(m);
    // 47/56/58 não podem existir como fronteira em lugar nenhum
    for (const seg of m.blocos[0].pontos[0].segmentos) {
      expect([seg.de, seg.ate]).not.toContain(47);
      expect([seg.de, seg.ate]).not.toContain(56);
      expect([seg.de, seg.ate]).not.toContain(58);
    }
    expect(m.blocos[0].pontos[0].segmentos).toHaveLength(0);
    for (const corte of ['47', '56', '58']) {
      expect(texto, `corte ${corte} vazou para o modelo`).not.toContain(corte);
    }
  });

  it('DCDQ: sem norma não ganha marcador inventado', () => {
    const m = montarModelo(
      cfg('DCDQ'),
      {
        TOTAL: resultado({
          raw: 40,
          score: 40,
          available: false,
          message: 'não há norma publicada para esta idade neste domínio',
        }),
      },
      [],
      [escala('TOTAL')],
    );
    const p = m.blocos[0].pontos[0];
    expect(p.disponivel).toBe(false);
    expect(p.valor).toBeNull();
    expect(posicao(p.valor, p.range)).toBeNull();
    expect(p.segmentos).toEqual([]);
  });

  it('sem domínio declarado, o modelo bloqueia em vez de inventar eixo', () => {
    // Nenhum dos 21 exercita mais este caminho — os quatro que faltavam
    // ganharam eixo. A guarda fail-closed continua viva com config
    // sintética: é ela que impede um instrumento futuro de nascer
    // desenhando um eixo derivado dos dados.
    const semEixo: ConfigGrafico = {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
    };
    const m = montarModelo(
      semEixo, { TOTAL: resultado({ score: 100 }) }, [], [escala('TOTAL')],
    );
    expect(m.bloqueio).toBeTruthy();
    expect(m.blocos[0].range).toBeUndefined();
    // e o valor continua no modelo: bloquear o eixo não apaga o resultado
    expect(m.blocos[0].pontos[0].valor).toBe(100);
  });

  it('ETPC não bloqueia: a classificação basta, sem eixo', () => {
    const codes = ['Psicoticismo', 'Extroversão', 'Neuroticismo', 'Sociabilidade'];
    const resultados = Object.fromEntries(
      codes.map((c) => [c, resultado({ score: 75, classification: 'Quartil superior' })]),
    );
    const m = montarModelo(cfg('ETPC'), resultados, [], codes.map((c) => escala(c)));
    expect(m.bloqueio).toBeUndefined();
    // e o número do quartil não vira posição
    expect(m.blocos[0].pontos[0].valor).toBeNull();
  });
});
