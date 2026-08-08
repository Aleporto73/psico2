// =====================================================================
// O registro é a tradução de G0 para código. Estes testes existem para
// que uma edição distraída nele quebre AQUI, e não numa tela mostrando
// uma escala que o contrato mandou excluir.
// =====================================================================

import { describe, expect, it } from 'vitest';
import {
  basisDaMetrica,
  CODIGOS_DOS_21,
  configDoInstrumento,
  REGISTRO_GRAFICOS,
  type ConfigGrafico,
} from '../graph-config';

/** Os 21 do catálogo comercial, escritos à mão de propósito: se o
 *  registro ganhar ou perder um instrumento, é aqui que aparece. */
const OS_21 = [
  'BAYLEY-III', 'BPA-2', 'C-TRF_1.5-5', 'CES-D', 'CHECK-DIS', 'CONFIAS',
  'DASS-21', 'DCDQ', 'EPQ-J', 'ERA-A', 'ERA-F', 'ETPC', 'PHQ-9',
  'QA-ADULTO', 'SCARED-C', 'SDQ-POR', 'SNAP-IV-18', 'SNAP-IV-26', 'TDF',
  'TRACO-ANSIEDADE', 'TRILHAS_PRE',
];

function cfg(code: string): ConfigGrafico {
  const e = configDoInstrumento(code);
  if (!e || e.status !== 'aprovado') {
    throw new Error(`${code} deveria estar aprovado`);
  }
  return e.config;
}

function escalasDe(code: string): string[] {
  return cfg(code).blocos.flatMap((b) => b.escalas ?? []);
}

function excluidasDe(code: string): string[] {
  return (cfg(code).excluidas ?? []).map((x) => x.escala);
}

describe('cobertura', () => {
  it('1 · cobre exatamente os 21 códigos', () => {
    expect([...CODIGOS_DOS_21].sort()).toEqual([...OS_21].sort());
  });

  it('2 · os 20 aprovados têm família, métrica e ao menos um bloco', () => {
    const aprovados = OS_21.filter((c) => c !== 'DCDQ');
    expect(aprovados).toHaveLength(20);
    for (const code of aprovados) {
      const c = cfg(code);
      expect(c.familia, code).toBeTruthy();
      expect(c.metrica, code).toBeTruthy();
      expect(c.blocos.length, code).toBeGreaterThan(0);
    }
  });

  it('3 · DCDQ continua pendente e sem configuração de gráfico', () => {
    const e = configDoInstrumento('DCDQ');
    expect(e?.status).toBe('pendente');
    expect(JSON.stringify(e)).not.toContain('familia');
  });
});

describe('escalas incluídas e excluídas', () => {
  it('4 · BAYLEY-III traz só os 5 domínios', () => {
    expect(escalasDe('BAYLEY-III')).toEqual([
      'DOM_Cognitivo', 'DOM_Linguagem', 'DOM_Motora',
      'DOM_Socioemocional', 'DOM_Adaptativo',
    ]);
    // nenhum subteste: eles saem em escalonada, outra métrica
    for (const sub of ['Cog', 'CR', 'CE', 'MF', 'MG', 'SE', 'VC', 'AC']) {
      expect(escalasDe('BAYLEY-III')).not.toContain(sub);
    }
  });

  it('5 · BPA-2 traz AA/AC/AD e deixa AG fora', () => {
    expect(escalasDe('BPA-2')).toEqual(['AA', 'AC', 'AD']);
    expect(excluidasDe('BPA-2')).toContain('AG');
  });

  it('6 · C-TRF tem DOIS blocos, com as réguas separadas', () => {
    const c = cfg('C-TRF_1.5-5');
    expect(c.blocos).toHaveLength(2);
    expect(c.blocos[0].escalas).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI']);
    expect(c.blocos[1].escalas).toEqual(['INT', 'EXT', 'TOT']);
  });

  it('7 · CONFIAS traz Sílaba/Fonema e deixa Total fora', () => {
    expect(escalasDe('CONFIAS')).toEqual(['Sílaba', 'Fonema']);
    expect(excluidasDe('CONFIAS')).toContain('Total');
    // e lê z, o que é o filtro que mantém percentual_acerto fora
    expect(cfg('CONFIAS').metrica).toBe('z');
  });

  it('8 · EPQ-J traz P/E/N e deixa S fora', () => {
    expect(escalasDe('EPQ-J')).toEqual(['P', 'E', 'N']);
    expect(excluidasDe('EPQ-J')).toContain('S');
  });

  it('9 · ERA-A e ERA-F excluem o Escore Geral', () => {
    for (const code of ['ERA-A', 'ERA-F']) {
      // a inclusão é por exclusão: entram os fatores do catálogo
      expect(cfg(code).blocos[0].excetoEscalas, code).toEqual(['Escore Geral']);
      expect(excluidasDe(code), code).toContain('Escore Geral');
    }
  });

  it('11 · SDQ-POR traz SÓ o TOTAL; PRO fica fora e por quê', () => {
    expect(escalasDe('SDQ-POR')).toEqual(['TOTAL']);
    for (const s of ['EMO', 'CON', 'HIP', 'PAR', 'PRO']) {
      expect(excluidasDe('SDQ-POR')).toContain(s);
    }
    const pro = (cfg('SDQ-POR').excluidas ?? []).find((x) => x.escala === 'PRO');
    expect(pro?.motivo).toMatch(/OPOSTA/);
    // direção do instrumento reconhece que ela varia entre escalas
    expect(cfg('SDQ-POR').direcao).toBe('especifica_por_escala');
  });
});

describe('réguas independentes', () => {
  it('10 · ETPC lê classification e não vira magnitude', () => {
    const c = cfg('ETPC');
    expect(c.metrica).toBe('classification');
    expect(c.familia).toBe('categorical_profile');
    // sem eixo numérico: nada de 25/50/75 como tamanho
    expect(c.range).toBeUndefined();
    expect(c.blocos[0].rangePorEscala).toBeUndefined();
    expect(JSON.stringify(c)).not.toMatch(/\b(25|50|75)\b/);
    // traço de personalidade não tem polo bom
    expect(c.direcao).toBe('nao_avaliativa');
    expect(c.tom).toBe('neutro');
  });

  it('12 · SNAP-IV preserva escalas e réguas independentes', () => {
    expect(escalasDe('SNAP-IV-18')).toEqual(['DESATENCAO', 'HIPERATIVIDADE']);
    expect(escalasDe('SNAP-IV-26')).toEqual([
      'DESATENCAO', 'HIPERATIVIDADE', 'TOD',
    ]);
    const r26 = cfg('SNAP-IV-26').blocos[0].rangePorEscala!;
    // TOD tem teto próprio: comparar magnitude entre as três seria falso
    expect(r26.TOD.max).toBe(8);
    expect(r26.DESATENCAO.max).toBe(9);
    // e não existe um range único do instrumento
    expect(cfg('SNAP-IV-26').range).toBeUndefined();
  });

  it('12b · DASS-21 e SCARED-C usam régua por escala', () => {
    expect(cfg('DASS-21').blocos[0].rangePorEscala).toBeDefined();
    const sc = cfg('SCARED-C').blocos[0].rangePorEscala!;
    expect(sc.PANICO.max).toBe(26);
    expect(sc.ESCOLAR.max).toBe(8);
    expect(cfg('SCARED-C').range).toBeUndefined();
  });

  it('13 · CHECK-DIS fica marcado como direção invertida', () => {
    const c = cfg('CHECK-DIS');
    // o nome do valor é o de "favorável para cima"; o que prova a
    // inversão é ele estar num instrumento cujas faixas falam de risco
    expect(c.direcao).toBe('ascendente_favoravel');
    expect(c.range).toEqual({ min: 39, max: 195 });
    expect(c.nota).toMatch(/MENOR risco/);
  });
});

describe('domínio visual', () => {
  it('percentil é 0..100 e não depende de norma', () => {
    for (const code of ['BPA-2', 'EPQ-J', 'ERA-A', 'ERA-F']) {
      expect(cfg(code).range, code).toEqual({ min: 0, max: 100 });
      expect(cfg(code).metrica, code).toBe('percentile');
    }
  });

  it('CONFIAS declara z -3..+3 COM excedente', () => {
    expect(cfg('CONFIAS').range).toEqual({ min: -3, max: 3, overflow: true });
  });

  it('BAYLEY declara 40..160 na composta', () => {
    expect(cfg('BAYLEY-III').range).toEqual({ min: 40, max: 160 });
  });

  it('sem domínio declarado, o range fica AUSENTE em vez de inventado', () => {
    // são os casos que G0/G1A não fecharam: pontuação padrão e escore T
    for (const code of ['TDF', 'TRILHAS_PRE', 'C-TRF_1.5-5']) {
      expect(cfg(code).range, code).toBeUndefined();
      expect(cfg(code).blocos.some((b) => b.rangePorEscala), code).toBe(false);
    }
  });
});

describe('vocabulário', () => {
  it('a métrica é sempre nome de campo de ResultadoEscala', () => {
    const validas = new Set(['score', 'percentile', 'z', 'classification']);
    for (const code of OS_21) {
      const e = REGISTRO_GRAFICOS[code];
      if (e.status !== 'aprovado') continue;
      expect(validas.has(e.config.metrica), code).toBe(true);
      // 'percentil' é vocabulário do acervo e não pode virar métrica
      expect(e.config.metrica as string, code).not.toBe('percentil');
    }
  });

  it('basisDaMetrica faz a ponte para o nome do acervo', () => {
    expect(basisDaMetrica('percentile')).toBe('percentil');
    expect(basisDaMetrica('score')).toBe('score');
    expect(basisDaMetrica('z')).toBe('z');
    expect(basisDaMetrica('classification')).toBeNull();
  });

  it('17 · nenhum corte do DCDQ mora no registro', () => {
    const texto = JSON.stringify(REGISTRO_GRAFICOS);
    expect(texto).not.toMatch(/\b47\b/);
    expect(texto).not.toMatch(/\b56\b/);
    expect(texto).not.toMatch(/\b58\b/);
  });

  it('18 · o registro não conhece visual_context', () => {
    expect(JSON.stringify(REGISTRO_GRAFICOS)).not.toContain('visual_context');
  });
});
