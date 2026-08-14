// =====================================================================
// SNAP-IV-18 · as TRÊS medidas na apresentação.
//
// O backend devolve duas: `raw` (soma 0-3) e `score` (contagem de sintomas
// presentes). A terceira — Média por item — é DERIVAÇÃO DE APRESENTAÇÃO:
//
//     media = raw / 9
//
// Ela não vem da Edge, não está em assessment_results, não é norma, não é
// escala e não participa da classificação. É a mesma intensidade que já
// está em `raw`, lida na régua de 0 a 3 por item.
//
// O que este arquivo trava:
//
//   1. as três medidas, com o teto de cada régua
//   2. a média deriva SÓ de raw — sem raw não há média, e score não a gera
//   3. o formato: duas casas e vírgula decimal
//   4. a derivação acontece UMA vez, na infraestrutura compartilhada
//   5. tela, histórico, documento e prompt consomem a MESMA saída
//   6. o SNAP-IV-26 não ganhou média, e o gráfico do 18 não mudou
//
// Nada aqui pontua. `raw` e `score` chegam prontos do servidor.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  METRICAS_POR_INSTRUMENTO,
  formatarMedia,
  metodoDeCorrecao,
  metricasDaEscala,
  metricasDoInstrumento,
  orientacaoParaIA,
  rotuloDeEscoreNoGrafico,
  rotulosDasColunas,
} from '@/lib/corrigefacil/metricas-instrumento';
import { montarLinhas, colunasVisiveis } from '@/lib/report/document-model';
import { formatClosedResults } from '@/lib/corrigefacil/report-generator';
import type { ResultadoEscala } from '@/lib/corrigefacil/api';

const SNAP18 = 'SNAP-IV-18';
const ABAIXO = 'Não atinge o limiar de sintomas deste domínio';
const ACIMA = 'Atinge o limiar de sintomas deste domínio';

function resultado(over: Partial<ResultadoEscala> = {}): ResultadoEscala {
  return {
    raw: null,
    score: null,
    percentile: null,
    z: null,
    classification: null,
    available: true,
    message: null,
    flags: [],
    ...over,
  } as ResultadoEscala;
}

/** O golden aprovado: o exemplo preenchido da aba do SNAP-IV-18. */
const GOLDEN: Record<string, ResultadoEscala> = {
  DESATENCAO: resultado({ raw: 15, score: 4, classification: ABAIXO }),
  HIPERATIVIDADE: resultado({ raw: 26, score: 9, classification: ACIMA }),
};

function linhaDoBanco(code: string, raw: number, score: number) {
  return {
    raw,
    score,
    percentile: null,
    z_score: null,
    classification: null,
    ci95: null,
    available: true,
    message: null,
    flags: [],
    scales: { code, name: code, kind: 'domain' },
  };
}

// ---------------------------------------------------------------------
// GOLDEN
// ---------------------------------------------------------------------

describe('golden SNAP-IV-18', () => {
  it('Desatenção: 15 / 27 · 1,67 / 3 · 4 / 9', () => {
    const m = metricasDaEscala(SNAP18, 'DESATENCAO', 15, 4);
    expect(m.bruto).toEqual({ rotulo: 'Pontuação bruta', texto: '15 / 27' });
    expect(m.media).toEqual({ rotulo: 'Média por item', texto: '1,67 / 3' });
    expect(m.escore).toEqual({ rotulo: 'Sintomas presentes', texto: '4 / 9' });
  });

  it('Hiperatividade: 26 / 27 · 2,89 / 3 · 9 / 9', () => {
    const m = metricasDaEscala(SNAP18, 'HIPERATIVIDADE', 26, 9);
    expect(m.bruto?.texto).toBe('26 / 27');
    expect(m.media?.texto).toBe('2,89 / 3');
    expect(m.escore?.texto).toBe('9 / 9');
  });

  it('as três são medidas DIFERENTES, com réguas diferentes', () => {
    const m = metricasDaEscala(SNAP18, 'DESATENCAO', 15, 4);
    const textos = [m.bruto?.texto, m.media?.texto, m.escore?.texto];
    expect(new Set(textos).size).toBe(3);
    const rotulos = [m.bruto?.rotulo, m.media?.rotulo, m.escore?.rotulo];
    expect(new Set(rotulos).size).toBe(3);
  });
});

// ---------------------------------------------------------------------
// a média: de onde vem, e de onde NÃO vem
// ---------------------------------------------------------------------

describe('a Média por item', () => {
  it('é declarada uma vez, com divisor 9 e teto 3', () => {
    expect(METRICAS_POR_INSTRUMENTO[SNAP18].media).toEqual({
      rotulo: 'Média por item',
      divisor: 9,
      teto: 3,
      casas: 2,
    });
  });

  it('os tetos das outras duas continuam 27 e 9 nas duas escalas', () => {
    expect(METRICAS_POR_INSTRUMENTO[SNAP18].tetos).toEqual({
      DESATENCAO: { raw: 27, score: 9 },
      HIPERATIVIDADE: { raw: 27, score: 9 },
    });
  });

  it('duas casas, vírgula decimal, teto 3', () => {
    const media = METRICAS_POR_INSTRUMENTO[SNAP18].media!;
    expect(formatarMedia(15, media)).toBe('1,67 / 3');
    expect(formatarMedia(26, media)).toBe('2,89 / 3');
    // as pontas: zero e o teto saem com as duas casas, sem encurtar
    expect(formatarMedia(0, media)).toBe('0,00 / 3');
    expect(formatarMedia(27, media)).toBe('3,00 / 3');
    // e nada de ponto decimal
    expect(formatarMedia(15, media)).not.toContain('.');
  });

  it('deriva SÓ de raw: sem raw não há média', () => {
    expect(metricasDaEscala(SNAP18, 'DESATENCAO', null, 4).media).toBeNull();
    // e o escore continua saindo normalmente — a ausência é só da média
    expect(metricasDaEscala(SNAP18, 'DESATENCAO', null, 4).escore?.texto)
      .toBe('4 / 9');
  });

  it('NÃO deriva de score: mudar a contagem não move a média', () => {
    const a = metricasDaEscala(SNAP18, 'DESATENCAO', 15, 4);
    const b = metricasDaEscala(SNAP18, 'DESATENCAO', 15, 9);
    expect(b.media?.texto).toBe(a.media?.texto);
    expect(b.media?.texto).toBe('1,67 / 3');
    // e o inverso: mudar o bruto move a média e não move a contagem
    const c = metricasDaEscala(SNAP18, 'DESATENCAO', 26, 4);
    expect(c.media?.texto).toBe('2,89 / 3');
    expect(c.escore?.texto).toBe(a.escore?.texto);
  });

  it('a divisão acontece UMA vez, na infraestrutura compartilhada', () => {
    // `raw / 9` espalhado pelos componentes garantiria que um deles
    // envelhecesse sozinho. Nenhum consumidor divide.
    const raiz = process.cwd();
    const consumidores = [
      'src/app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx',
      'src/app/app/corrigefacil/avaliacoes/[id]/DetalheClient.tsx',
      'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]/RelatorioDocumentClient.tsx',
      'src/lib/corrigefacil/report-generator.ts',
      'src/lib/report/document-model.ts',
    ];
    for (const rel of consumidores) {
      const texto = readFileSync(join(raiz, rel), 'utf8');
      // nenhum consumidor divide o bruto, por nome nem por número
      expect(texto, rel).not.toMatch(/\braw\s*\//);
      expect(texto, rel).not.toMatch(/\.raw\b[^)\n]*\/\s*\d/);
      expect(texto, rel).not.toContain('divisor');
    }
    // e o módulo central divide exatamente uma vez
    const central = readFileSync(
      join(raiz, 'src/lib/corrigefacil/metricas-instrumento.ts'),
      'utf8',
    );
    expect(central.match(/raw \/ media\.divisor/g)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------
// as superfícies
// ---------------------------------------------------------------------

describe('as superfícies consomem a mesma derivação', () => {
  it('documento: coluna de média só no 18, com os valores do golden', () => {
    const linhas = montarLinhas(GOLDEN, SNAP18);
    const por = Object.fromEntries(linhas.map((l) => [l.escala, l]));

    expect(por.DESATENCAO.brutoTexto).toBe('15 / 27');
    expect(por.DESATENCAO.mediaTexto).toBe('1,67 / 3');
    expect(por.DESATENCAO.escoreTexto).toBe('4 / 9');

    expect(por.HIPERATIVIDADE.brutoTexto).toBe('26 / 27');
    expect(por.HIPERATIVIDADE.mediaTexto).toBe('2,89 / 3');
    expect(por.HIPERATIVIDADE.escoreTexto).toBe('9 / 9');

    expect(colunasVisiveis(linhas).media).toBe(true);
    expect(rotulosDasColunas(SNAP18).media).toBe('Média por item');
  });

  it('documento: o 26 e os outros NÃO ganham a coluna', () => {
    for (const code of ['SNAP-IV-26', 'PHQ-9', undefined]) {
      const linhas = montarLinhas(
        { TOTAL: resultado({ raw: 12, score: 4 }) },
        code,
      );
      expect(linhas[0].mediaTexto, String(code)).toBeNull();
      expect(colunasVisiveis(linhas).media, String(code)).toBe(false);
      expect(rotulosDasColunas(code).media, String(code)).toBeNull();
    }
  });

  it('documento: escala indisponível não ganha média nem número', () => {
    const linhas = montarLinhas(
      { DESATENCAO: resultado({ available: false, message: 'sem norma' }) },
      SNAP18,
    );
    expect(linhas[0].mediaTexto).toBeNull();
    expect(linhas[0].brutoTexto).toBeNull();
  });

  it('documento: o colSpan conta a coluna de média', () => {
    const doc = readFileSync(
      join(
        process.cwd(),
        'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]/RelatorioDocumentClient.tsx',
      ),
      'utf8',
    );
    expect(doc).toContain('Number(colunas.media)');
    expect(doc).toContain('{cabecalhos.media}');
    expect(doc).toContain('<Celula valor={l.mediaTexto} />');
  });

  it('Relatório Pró: as três medidas chegam ao modelo', () => {
    const texto = formatClosedResults(
      [linhaDoBanco('DESATENCAO', 15, 4), linhaDoBanco('HIPERATIVIDADE', 26, 9)],
      SNAP18,
    );
    expect(texto).toContain('- pontuação bruta: 15 / 27');
    expect(texto).toContain('- média por item: 1,67 / 3');
    expect(texto).toContain('- sintomas presentes: 4 / 9');
    expect(texto).toContain('- pontuação bruta: 26 / 27');
    expect(texto).toContain('- média por item: 2,89 / 3');
    expect(texto).toContain('- sintomas presentes: 9 / 9');
    // e nunca os rótulos genéricos
    expect(texto).not.toContain('- bruto:');
    expect(texto).not.toContain('- escore:');
  });

  it('Relatório Pró: resultado indisponível NÃO leva média ao modelo', () => {
    // A derivação funciona a partir de `raw` sozinho. Uma linha marcada
    // indisponível que tenha trazido um número junto renderia "média por
    // item: 1,67 / 3" com cara de resultado, ao lado de "disponível: não" —
    // e o modelo teria um quantitativo para narrar onde não há resultado.
    // O documento já suprime os quantitativos nesse caso; o prompt tem de
    // dizer a mesma coisa.
    const texto = formatClosedResults(
      [
        {
          ...linhaDoBanco('DESATENCAO', 15, 4),
          available: false,
          message: 'resultado indisponível',
        },
      ],
      SNAP18,
    );
    expect(texto).toContain('- disponível: não');
    expect(texto).toContain('- mensagem: resultado indisponível');
    expect(texto).not.toContain('média por item');
    expect(texto).not.toContain('1,67 / 3');
  });

  it('Relatório Pró: o 26 continua sem linha de média', () => {
    const texto = formatClosedResults(
      [linhaDoBanco('DESATENCAO', 12, 4)],
      'SNAP-IV-26',
    );
    expect(texto).toContain('- pontuação bruta: 12 / 27');
    expect(texto).toContain('- sintomas presentes: 4 / 9');
    expect(texto).not.toContain('média por item');
  });

  it('Relatório Pró: a orientação diz que só a contagem interpreta', () => {
    const o = orientacaoParaIA(SNAP18)!;
    expect(o).toContain('contagem de Sintomas presentes');
    expect(o).toContain('não a Pontuação bruta nem a Média por item');
    expect(o).toContain('não participa da classificação');

    // e o system prompt global continua sem regra de instrumento
    const motor = readFileSync(
      join(process.cwd(), 'src/lib/corrigefacil/report-generator.ts'),
      'utf8',
    );
    const system = motor.slice(
      motor.indexOf('export function buildCorrigeFacilSystemPrompt'),
      motor.indexOf('export function professionalText'),
    );
    expect(system).not.toContain('SNAP');
    expect(system).not.toContain('Média por item');
    // as travas de dado fechado continuam
    expect(motor).toContain('Não recalcule escores');
    expect(motor).toContain('Não determine pontos de corte');
  });

  it('tela de correção e histórico mostram as três, pela mesma função', () => {
    const raiz = process.cwd();
    const avaliar = readFileSync(
      join(raiz, 'src/app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx'),
      'utf8',
    );
    const detalhe = readFileSync(
      join(raiz, 'src/app/app/corrigefacil/avaliacoes/[id]/DetalheClient.tsx'),
      'utf8',
    );
    for (const [nome, tela] of [['avaliar', avaliar], ['detalhe', detalhe]] as const) {
      expect(tela, nome).toContain('metricasDaEscala(');
      expect(tela, nome).toContain('met.bruto');
      expect(tela, nome).toContain('met.media');
      expect(tela, nome).toContain('met.escore');
    }
  });
});

// ---------------------------------------------------------------------
// método de correção
// ---------------------------------------------------------------------

describe('o método de correção do 18', () => {
  const metodo = metodoDeCorrecao(SNAP18)!;

  it('tem texto próprio, com as três medidas', () => {
    expect(metodo.titulo).toBe('Método de correção');
    expect(metodo.texto).toContain('Mattos et al. (2006)');
    expect(metodo.texto).toContain('Pontuação bruta');
    expect(metodo.texto).toContain('Média por item');
    expect(metodo.texto).toContain('Sintomas presentes');
    expect(metodo.texto).toContain('não participa da classificação');
  });

  it('é curto: sem DOI, sem link, sem bibliografia', () => {
    expect(metodo.texto).not.toContain('DOI');
    expect(metodo.texto).not.toContain('http');
    expect(metodo.texto.length).toBeLessThan(600);
  });

  it('é diferente do texto do 26, que está fechado', () => {
    expect(metodo.texto).not.toBe(metodoDeCorrecao('SNAP-IV-26')!.texto);
  });
});

// ---------------------------------------------------------------------
// o gráfico do 18 NÃO mudou
// ---------------------------------------------------------------------

describe('o gráfico do 18', () => {
  it('continua em score, com os ranges de contagem 0-9', () => {
    const config = readFileSync(
      join(process.cwd(), 'src/app/app/corrigefacil/graphs/graph-config.ts'),
      'utf8',
    );
    const i = config.indexOf("'SNAP-IV-18'");
    const bloco = config.slice(i, i + 700);
    expect(bloco).toContain("metrica: 'score'");
    expect(bloco).toContain('DESATENCAO: { min: 0, max: 9 }');
    expect(bloco).toContain('HIPERATIVIDADE: { min: 0, max: 9 }');
    // nem o bruto nem a média entraram no eixo
    expect(bloco).not.toContain('max: 27');
    expect(bloco).not.toContain('max: 3 }');
  });

  it('a legenda passou a dizer sintomas presentes', () => {
    expect(rotuloDeEscoreNoGrafico(SNAP18, 'escore')).toBe('sintomas presentes');
  });
});

// ---------------------------------------------------------------------
// o 26 está fechado
// ---------------------------------------------------------------------

describe('SNAP-IV-26 sem regressão', () => {
  it('o golden dele continua igual, e sem média', () => {
    const casos: [string, number, number, string][] = [
      ['DESATENCAO', 12, 4, '12 / 27'],
      ['HIPERATIVIDADE', 13, 4, '13 / 27'],
      ['TOD', 12, 4, '12 / 24'],
    ];
    for (const [escala, raw, score, brutoEsperado] of casos) {
      const m = metricasDaEscala('SNAP-IV-26', escala, raw, score);
      expect(m.bruto?.texto, escala).toBe(brutoEsperado);
      expect(m.media, escala).toBeNull();
    }
    expect(metricasDaEscala('SNAP-IV-26', 'TOD', 12, 4).escore?.texto)
      .toBe('4 / 8');
    expect(metricasDoInstrumento('SNAP-IV-26')?.media).toBeUndefined();
  });
});
