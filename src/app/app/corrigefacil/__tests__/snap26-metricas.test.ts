// =====================================================================
// SNAP-IV-26 · as DUAS métricas na tela.
//
// O instrumento registra intensidade em quatro níveis (0 a 3) e classifica
// por contagem de sintomas presentes. São duas medidas, com dois tetos
// diferentes, e "bruto 12" ao lado de "escore 4" não diz qual é qual.
//
// O que este arquivo trava:
//
//   1. o SNAP-IV-26 nomeia as duas e mostra o teto de cada uma
//   2. os outros 20 continuam com "bruto" e "escore", sem teto
//   3. a nota de método aparece, uma vez, e só nele
//   4. o gráfico continua plotando `score` — só a palavra muda
//
// Nada aqui pontua. `raw` e `score` chegam prontos do servidor.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  METRICAS_POR_INSTRUMENTO,
  metodoDeCorrecao,
  metricasDaEscala,
  metricasDoInstrumento,
  rotuloDeEscoreNoGrafico,
} from '@/lib/corrigefacil/metricas-instrumento';

const SNAP = 'SNAP-IV-26';

describe('as duas métricas do SNAP-IV-26', () => {
  it('nomeia bruto e escore, cada um com o SEU teto', () => {
    // o golden da planilha aprovada: mesma contagem nas três, brutos
    // diferentes
    const des = metricasDaEscala(SNAP, 'DESATENCAO', 12, 4);
    expect(des.bruto).toEqual({ rotulo: 'Pontuação bruta', texto: '12 / 27' });
    expect(des.escore).toEqual({ rotulo: 'Sintomas presentes', texto: '4 / 9' });

    const hip = metricasDaEscala(SNAP, 'HIPERATIVIDADE', 13, 4);
    expect(hip.bruto?.texto).toBe('13 / 27');
    expect(hip.escore?.texto).toBe('4 / 9');

    // o TOD tem 8 itens: os DOIS tetos são menores
    const tod = metricasDaEscala(SNAP, 'TOD', 12, 4);
    expect(tod.bruto?.texto).toBe('12 / 24');
    expect(tod.escore?.texto).toBe('4 / 8');
  });

  it('os tetos são os do instrumento: itens × 3 e um por item', () => {
    // espelha data/snap_iv.json no CorrigeFacil. 9, 9 e 8 itens.
    expect(METRICAS_POR_INSTRUMENTO[SNAP].tetos).toEqual({
      DESATENCAO: { raw: 27, score: 9 },
      HIPERATIVIDADE: { raw: 27, score: 9 },
      TOD: { raw: 24, score: 8 },
    });
  });

  it('bruto e escore NÃO são o mesmo número nem a mesma régua', () => {
    // é a leitura que a correção existe para tornar possível: 12 de 27 de
    // intensidade, 4 de 9 sintomas
    const m = metricasDaEscala(SNAP, 'DESATENCAO', 12, 4);
    expect(m.bruto?.texto).not.toBe(m.escore?.texto);
    expect(m.bruto?.rotulo).not.toBe(m.escore?.rotulo);
  });

  it('escala fora do mapa de tetos sai sem teto, não com teto errado', () => {
    const m = metricasDaEscala(SNAP, 'ESCALA-NOVA', 5, 2);
    expect(m.bruto).toEqual({ rotulo: 'Pontuação bruta', texto: '5' });
    expect(m.escore).toEqual({ rotulo: 'Sintomas presentes', texto: '2' });
  });

  it('valor ausente não vira zero nem texto vazio', () => {
    expect(metricasDaEscala(SNAP, 'TOD', null, 4).bruto).toBeNull();
    expect(metricasDaEscala(SNAP, 'TOD', 12, null).escore).toBeNull();
  });
});

describe('os outros instrumentos não mudam', () => {
  it('as DUAS versões do SNAP têm métrica própria, e só elas', () => {
    // o 18 entrou na rodada seguinte. A versão anterior deste teste
    // afirmava que ele estava FORA — estava, naquela rodada; congelar isso
    // faria o teste brigar com a decisão seguinte em vez de protegê-la.
    expect(Object.keys(METRICAS_POR_INSTRUMENTO).sort()).toEqual([
      'SNAP-IV-18',
      'SNAP-IV-26',
    ]);
  });

  it('a Média por item é SÓ do 18: o 26 não ganhou média', () => {
    expect(metricasDoInstrumento('SNAP-IV-18')?.media).toEqual({
      rotulo: 'Média por item',
      divisor: 9,
      teto: 3,
      casas: 2,
    });
    expect(metricasDoInstrumento(SNAP)?.media).toBeUndefined();
    // e nenhuma escala do 26 devolve média
    for (const escala of ['DESATENCAO', 'HIPERATIVIDADE', 'TOD']) {
      expect(metricasDaEscala(SNAP, escala, 12, 4).media, escala).toBeNull();
    }
  });

  it('sem métrica própria, sai exatamente o que saía antes', () => {
    for (const code of ['PHQ-9', 'SDQ-POR', 'DASS-21', 'CES-D']) {
      const m = metricasDaEscala(code, 'TOTAL', 12, 4);
      expect(m.bruto, code).toEqual({ rotulo: 'bruto', texto: '12' });
      expect(m.escore, code).toEqual({ rotulo: 'escore', texto: '4' });
      expect(m.media, code).toBeNull();
    }
    // e instrumento nenhum informado também não quebra
    expect(metricasDaEscala(undefined, 'TOTAL', 1, 1).bruto?.rotulo).toBe('bruto');
    expect(metricasDaEscala(undefined, 'TOTAL', 1, 1).media).toBeNull();
  });
});

describe('a nota de método', () => {
  const metodo = metodoDeCorrecao(SNAP)!;

  it('existe nas duas versões do SNAP, e não nos outros', () => {
    expect(metodo).not.toBeNull();
    expect(metodo.titulo).toBe('Método de correção');
    // o 18 ganhou o dele na rodada seguinte, com texto próprio
    expect(metodoDeCorrecao('SNAP-IV-18')?.titulo).toBe('Método de correção');
    for (const code of ['PHQ-9', 'SDQ-POR', 'DASS-21']) {
      expect(metodoDeCorrecao(code), code).toBeNull();
    }
  });

  it('o texto do 26 NÃO mudou: ele não fala de Média por item', () => {
    // o 26 está fechado. A média segue citada nele só como método
    // existente na literatura, e não como número exibido.
    expect(metodo.texto).toContain('média por dimensão');
    expect(metodo.texto).not.toContain('Média por item');
    expect(metodo.texto).not.toContain('dividida pelos');
  });

  it('diz a fonte, as duas métricas e qual delas interpreta o limiar', () => {
    expect(metodo.texto).toContain('Mattos et al. (2006)');
    expect(metodo.texto).toContain('Pontuação bruta');
    expect(metodo.texto).toContain('Sintomas presentes');
    expect(metodo.texto).toContain('contagem de sintomas');
    expect(metodo.texto).toContain('média por dimensão');
  });

  it('é curta: sem DOI, sem link, sem bibliografia', () => {
    expect(metodo.texto).not.toContain('DOI');
    expect(metodo.texto).not.toContain('http');
    expect(metodo.texto.length).toBeLessThan(500);
  });

  it('aparece UMA vez em cada tela, fora dos cards e do gráfico', () => {
    const dir = join(__dirname, '..');
    const avaliar = readFileSync(
      join(dir, 'avaliar', '[code]', 'AvaliarClient.tsx'),
      'utf8',
    );
    const detalhe = readFileSync(
      join(dir, 'avaliacoes', '[id]', 'DetalheClient.tsx'),
      'utf8',
    );

    for (const [nome, tela] of [['avaliar', avaliar], ['detalhe', detalhe]] as const) {
      const ocorrencias = tela.split('<MetodoDeCorrecao').length - 1;
      expect(ocorrencias, nome).toBe(1);
    }

    // na tela de correção vem DEPOIS do gráfico: é nota de método, não
    // resultado nem classificação
    expect(avaliar.indexOf('<MetodoDeCorrecao')).toBeGreaterThan(
      avaliar.indexOf('<ResultGraph'),
    );
    // e não está dentro do card de escala
    expect(avaliar.indexOf('<MetodoDeCorrecao')).toBeGreaterThan(
      avaliar.indexOf('{r.flags.join'),
    );
  });
});

describe('o gráfico', () => {
  it('continua plotando score — só a palavra muda', () => {
    const grafico = readFileSync(
      join(__dirname, '..', 'graphs', 'graph-config.ts'),
      'utf8',
    );
    // o bloco do SNAP-IV-26 continua em `metrica: 'score'` com os mesmos
    // ranges de CONTAGEM
    const bloco = grafico.slice(
      grafico.indexOf("'SNAP-IV-26'"),
      grafico.indexOf("'SNAP-IV-26'") + 900,
    );
    expect(bloco).toContain("metrica: 'score'");
    expect(bloco).toContain('DESATENCAO: { min: 0, max: 9 }');
    expect(bloco).toContain('HIPERATIVIDADE: { min: 0, max: 9 }');
    expect(bloco).toContain('TOD: { min: 0, max: 8 }');
    // e NÃO virou 0..27: o eixo é o da contagem
    expect(bloco).not.toContain('max: 27');
    expect(bloco).not.toContain('max: 24');
  });

  it('a legenda das duas versões diz sintomas, não escore', () => {
    expect(rotuloDeEscoreNoGrafico(SNAP, 'escore')).toBe('sintomas presentes');
    // o 18 passou a dizer o mesmo ao entrar no mapa, e isso é desejado: o
    // gráfico dele já plotava a contagem
    expect(rotuloDeEscoreNoGrafico('SNAP-IV-18', 'escore')).toBe(
      'sintomas presentes',
    );
    // e nos outros o padrão passa intacto
    expect(rotuloDeEscoreNoGrafico('PHQ-9', 'escore')).toBe('escore');
    expect(rotuloDeEscoreNoGrafico(undefined, 'percentil')).toBe('percentil');
  });
});
