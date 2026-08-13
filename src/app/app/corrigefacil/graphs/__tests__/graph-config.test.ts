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

  it('2 · os 21 aprovados têm família, métrica e ao menos um bloco', () => {
    expect(OS_21).toHaveLength(21);
    for (const code of OS_21) {
      const c = cfg(code);
      expect(c.familia, code).toBeTruthy();
      expect(c.metrica, code).toBeTruthy();
      expect(c.blocos.length, code).toBeGreaterThan(0);
    }
  });

  it('3 · DCDQ é régua de POSIÇÃO: aprovado, e sem nenhum corte', () => {
    const e = configDoInstrumento('DCDQ');
    expect(e?.status).toBe('aprovado');

    const c = cfg('DCDQ');
    expect(c.familia).toBe('score_band');
    expect(c.metrica).toBe('score');
    expect(c.blocos).toHaveLength(1);
    expect(c.blocos[0].escalas).toEqual(['TOTAL']);
    // 15..75 é domínio REAL: score = bruto por identidade no loader
    expect(c.range).toEqual({ min: 15, max: 75 });
    // pontuação alta é o resultado favorável
    expect(c.direcao).toBe('ascendente_favoravel');
    // sem faixa recebida não há de onde tirar cor
    expect(c.tom).toBe('neutro');
    // nada de banda, régua por escala ou excedente
    expect(c.blocos[0].rangePorEscala).toBeUndefined();
    expect(c.range?.overflow).toBeUndefined();
    // e a nota diz ao profissional o que a régua NÃO mostra
    expect(c.nota).toMatch(/corte etário não é desenhado/i);

    // o corte etário NUNCA entra no cliente
    const texto = JSON.stringify(c);
    for (const corte of ['47', '56', '58']) {
      expect(texto, `corte ${corte} vazou para o registro`).not.toContain(corte);
    }
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

  it('8 · EPQ-J: o perfil principal é P/E/N, e S não entra nele', () => {
    const c = cfg('EPQ-J');

    // um bloco só, com os TRÊS traços e o título que os nomeia como tal
    expect(c.blocos).toHaveLength(1);
    expect(c.blocos[0].titulo).toBe('Perfil de traços');
    expect(escalasDe('EPQ-J')).toEqual(['P', 'E', 'N']);

    // o que este teste existe para impedir: S virar a quarta barra
    expect(escalasDe('EPQ-J')).not.toContain('S');
    expect(excluidasDe('EPQ-J')).toContain('S');

    // e o motivo tem de dizer O QUE ela é e ONDE ela aparece — sair do
    // perfil aqui não é sumir da tela
    const motivo = c.excluidas!.find((x) => x.escala === 'S')!.motivo;
    expect(motivo).toMatch(/Sinceridade/);
    expect(motivo).toMatch(/separadamente/i);
  });

  it('8b · EPQ-J: S é UM complemento separado, com título próprio', () => {
    const e = configDoInstrumento('EPQ-J');
    if (e?.status !== 'aprovado') throw new Error('EPQ-J deveria estar aprovado');

    // exatamente uma representação complementar: falha se alguém
    // remover a Sinceridade da tela, e falha se aparecer uma segunda
    expect(e.complementos, 'a Sinceridade sumiu da tela').toHaveLength(1);
    const s = e.complementos![0];

    expect(s.blocos).toHaveLength(1);
    expect(s.blocos[0].escalas).toEqual(['S']);
    expect(s.blocos[0].titulo).toBe('Escala de Sinceridade');

    // mesma família e mesma régua do perfil: o que muda é estar
    // SEPARADO, não a métrica
    expect(s.familia).toBe('standardized_profile');
    expect(s.metrica).toBe('percentile');
    expect(s.range).toEqual({ min: 0, max: 100 });

    // validade não recebe cor clínica nem polo bom (G0 §2.4)
    expect(s.direcao).toBe('nao_avaliativa');
    expect(s.tom).toBe('neutro');

    // o título nomeia a ESCALA, nunca um veredito sobre o protocolo
    expect(s.blocos[0].titulo).not.toMatch(/validade/i);

    // e nenhum traço vaza para o bloco de S
    for (const traco of ['P', 'E', 'N']) {
      expect(s.blocos[0].escalas, traco).not.toContain(traco);
    }
  });

  it('9 · ERA-A e ERA-F selecionam por kind (fail-closed)', () => {
    for (const code of ['ERA-A', 'ERA-F']) {
      // FAIL-CLOSED: só entra quem é do tipo aprovado. A versão anterior
      // dizia "todas menos o Escore Geral", e assim uma escala nova
      // entraria sozinha no gráfico sem passar por G0.
      expect(cfg(code).blocos[0].apenasKind, code).toEqual(['primaria']);
      expect(cfg(code).blocos[0].escalas, code).toBeUndefined();
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

  it('11b · SDQ-POR: o IMPACTO é complemento, com eixo PRÓPRIO', () => {
    const e = configDoInstrumento('SDQ-POR');
    if (e?.status !== 'aprovado') throw new Error('SDQ-POR deveria estar aprovado');

    // o gráfico do TOTAL não mudou: uma escala só, 0..40
    expect(e.config.blocos[0].escalas).toEqual(['TOTAL']);
    expect(e.config.range).toEqual({ min: 0, max: 40 });

    // e o IMPACTO entra AO LADO, não dentro. 0..6 e 0..40 no mesmo eixo
    // fariam um Impacto Grave (4 de 6) parecer irrelevante ao lado de um
    // Total 40 — são leituras diferentes, e cada uma com sua régua.
    expect(e.complementos, 'o IMPACTO sumiu do contrato').toHaveLength(1);
    const impacto = e.complementos![0];
    expect(impacto.familia).toBe('score_band');
    expect(impacto.metrica).toBe('score');
    expect(impacto.blocos[0].escalas).toEqual(['IMPACTO']);
    expect(impacto.blocos[0].titulo).toBe('Impacto');
    expect(impacto.range).toEqual({ min: 0, max: 6 });

    // ao contrário de PRO, aqui a direção é única e sinalizadora
    expect(impacto.direcao).toBe('ascendente_sinalizador');
    expect(impacto.tom).toBe('semantico_por_faixa');

    // IMPACTO é representação APROVADA: não pode estar em `excluidas`, e
    // não pode ter virado mais uma barra no eixo do TOTAL
    expect(excluidasDe('SDQ-POR')).not.toContain('IMPACTO');
    expect(escalasDe('SDQ-POR')).not.toContain('IMPACTO');
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

  it('12c · SCARED-C: as 5 subescalas E o band do TOTAL', () => {
    const e = configDoInstrumento('SCARED-C');
    if (e?.status !== 'aprovado') throw new Error('SCARED-C deveria estar aprovado');

    // as cinco entram como small multiples categóricos
    expect(e.config.familia).toBe('categorical_profile');
    expect(e.config.blocos[0].escalas).toEqual([
      'PANICO', 'GENERALIZADA', 'SEPARACAO', 'SOCIAL', 'ESCOLAR',
    ]);

    // o TOTAL é uma representação APROVADA: fica no registro como
    // ScoreBand, não em `excluidas`. Este teste falha se alguém
    // simplesmente removê-lo de novo.
    expect(e.complementos, 'TOTAL sumiu do contrato').toHaveLength(1);
    const total = e.complementos![0];
    expect(total.familia).toBe('score_band');
    expect(total.blocos[0].escalas).toEqual(['TOTAL']);

    // domínio DECLARADO em G0: 0..82. O que autoriza este range e não os
    // de TDF/TRILHAS/C-TRF é que aqui `score` É o bruto por identidade
    // explícita no loader, então raw_max está na métrica plotada. Não é
    // soma dos tetos das subescalas.
    expect(total.range, 'o TOTAL perdeu o domínio declarado em G0').toEqual({
      min: 0,
      max: 82,
    });
    // a régua é do bloco inteiro (uma escala só), não por escala
    expect(total.blocos[0].rangePorEscala).toBeUndefined();

    // TOTAL não pode estar listado como excluído
    expect(excluidasDe('SCARED-C')).not.toContain('TOTAL');
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

  it('TDF declara a janela 40..160 COM excedente', () => {
    // JANELA VISUAL, não domínio normativo: a pontuação padrão do TDF tem
    // extremos abertos ("<70" e "130+"), então `overflow` é obrigatório —
    // sem ele um escore de 229, que as tabelas produzem, ficaria preso na
    // borda sem que ninguém soubesse.
    expect(cfg('TDF').range).toEqual({ min: 40, max: 160, overflow: true });
    expect(cfg('TDF').familia).toBe('score_band');
    expect(cfg('TDF').metrica).toBe('score');
    expect(cfg('TDF').direcao).toBe('ascendente_favoravel');
  });

  it('TRILHAS_PRE declara 40..160 COM excedente, UMA janela para as quatro', () => {
    const c = cfg('TRILHAS_PRE');
    expect(c.range).toEqual({ min: 40, max: 160, overflow: true });
    // mesma janela do TDF: é uma convenção única de pontuação padrão
    expect(c.range).toEqual(cfg('TDF').range);
    // e NÃO por escala — régua separada destruiria a comparação que é o
    // motivo do gráfico existir
    expect(c.blocos).toHaveLength(1);
    expect(c.blocos[0].rangePorEscala).toBeUndefined();
    expect(c.blocos[0].escalas).toEqual(['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON']);
    expect(c.familia).toBe('standardized_profile');
    expect(c.metrica).toBe('score');
    expect(c.direcao).toBe('ascendente_favoravel');
    expect(c.tom).toBe('neutro');
  });

  it('C-TRF declara 29..100, um eixo para os DOIS blocos', () => {
    const c = cfg('C-TRF_1.5-5');
    // domínio das 9 tabelas deste acervo, NÃO domínio universal do ASEBA.
    // 50 é o piso das SÍNDROMES; as bandas largas descem a 34/36/29, e um
    // eixo em 50..100 jogaria resultados reais para fora do gráfico.
    expect(c.range).toEqual({ min: 29, max: 100 });
    // sem overflow: as tabelas são completas, todo T produzível cai dentro
    expect(c.range?.overflow).toBeUndefined();
    // o eixo é comum, mas os CORTES não: os blocos seguem separados
    expect(c.blocos).toHaveLength(2);
    expect(c.blocos[0].rangePorEscala).toBeUndefined();
    expect(c.blocos[1].rangePorEscala).toBeUndefined();
    expect(c.metrica).toBe('score');
    expect(c.direcao).toBe('ascendente_sinalizador');
    expect(c.tom).toBe('semantico_por_faixa');
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
