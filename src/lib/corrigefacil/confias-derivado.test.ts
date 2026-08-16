// =====================================================================
// CONFIAS · o contrato do derivado e a apresentação dele.
//
// A Edge `corrigir` (v8 em produção) devolve, só para o CONFIAS:
//
//   derived.confias.nivel_equivalente_silaba
//   derived.confias.perfil_habilidades[]   16 tarefas, S1..S9 / F1..F7
//
// O que este arquivo trava:
//
//   A. o CONTRATO: `derived` é aceito, e instrumento sem ele continua
//      válido — a chave é opcional em toda rota
//   B. o LEITOR: `derived.confias` (Edge) e `_corrigefacil.confias`
//      (banco, para o Relatório Pró) devolvem o MESMO objeto
//   C. a FORMATAÇÃO: fração vira porcentagem, com no máximo uma casa
//   D. NÃO EXISTE CÁLCULO aqui: nenhum corte, nenhuma comparação, nenhum
//      rótulo de faixa escrito no cliente
//   E. o TEXTO do prompt: nível, S1, F7, acertos/max, percentual e
//      classificação, e null quando não há snapshot
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  AvaliacaoCriada,
  AvaliacaoDetalhe,
  DerivadoConfias,
  HabilidadeConfias,
  RespostaCorrecao,
} from './api';
import {
  blocosDoPerfil,
  CHAVE_RESERVADA,
  derivadoConfias,
  derivadoDoMeta,
  derivadoParaTexto,
  formatarAcertos,
  formatarPercentual,
  linhasDoPerfil,
  NOTA_NIVEL,
  TITULO_FONEMICAS,
  TITULO_NIVEL,
  TITULO_PERFIL,
  TITULO_SILABICAS,
} from './confias-derivado';

const CONSOLIDADA = 'Consolidada';
const EM_DESENVOLVIMENTO = 'Em desenvolvimento';
const NAO_CONSOLIDADA = 'Ainda não consolidada';

function h(
  code: string,
  name: string,
  acertos: number,
  max: number,
  classificacao: string,
): HabilidadeConfias {
  return { code, name, acertos, max, percentual: acertos / max, classificacao };
}

/** Um snapshot como a Edge o devolve: as 16 tarefas, na ordem dela. */
const DERIVADO: DerivadoConfias = {
  nivel_equivalente_silaba: 'Silábico-alfabética',
  perfil_habilidades: [
    h('S1', 'Síntese silábica', 3, 4, CONSOLIDADA),
    h('S2', 'Segmentação silábica', 2, 4, EM_DESENVOLVIMENTO),
    h('S3', 'Identificação de sílaba inicial', 4, 4, CONSOLIDADA),
    h('S4', 'Identificação de rima', 1, 4, NAO_CONSOLIDADA),
    h('S5', 'Produção de palavra com a sílaba dada', 4, 4, CONSOLIDADA),
    h('S6', 'Identificação de sílaba medial', 3, 4, CONSOLIDADA),
    h('S7', 'Produção de rima', 2, 4, EM_DESENVOLVIMENTO),
    h('S8', 'Exclusão silábica', 5, 8, EM_DESENVOLVIMENTO),
    h('S9', 'Transposição silábica', 4, 4, CONSOLIDADA),
    h('F1', 'Produção de palavra que inicia com o som dado', 4, 4, CONSOLIDADA),
    h('F2', 'Identificação de fonema inicial', 3, 4, CONSOLIDADA),
    h('F3', 'Identificação de fonema final', 2, 4, EM_DESENVOLVIMENTO),
    h('F4', 'Exclusão fonêmica', 5, 6, CONSOLIDADA),
    h('F5', 'Síntese fonêmica', 4, 4, CONSOLIDADA),
    h('F6', 'Segmentação fonêmica', 1, 4, NAO_CONSOLIDADA),
    h('F7', 'Transposição fonêmica', 3, 4, CONSOLIDADA),
  ],
};

const fonte = (...caminho: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...caminho), 'utf8');

// =====================================================================
// A · CONTRATO
// =====================================================================

describe('contrato: `derived` é aceito, e a ausência dele continua válida', () => {
  it('POST /corrigir aceita `derived.confias`', () => {
    const resposta: RespostaCorrecao = {
      instrument: 'CONFIAS',
      norm_selector: { hipotese: 'Silábica' },
      resultados: {},
      derived: { confias: DERIVADO },
    };
    expect(resposta.derived?.confias?.perfil_habilidades).toHaveLength(16);
    expect(derivadoConfias(resposta)).toBe(DERIVADO);
  });

  it('POST /avaliacao aceita `derived.confias`', () => {
    const criada: AvaliacaoCriada = {
      assessment_id: 'av-1',
      instrument: 'CONFIAS',
      norm_selector: {},
      status: 'concluida',
      resultados: {},
      derived: { confias: DERIVADO },
    };
    expect(derivadoConfias(criada)?.nivel_equivalente_silaba).toBe(
      'Silábico-alfabética',
    );
  });

  it('GET /avaliacao/:id aceita `derived.confias`', () => {
    const detalhe: AvaliacaoDetalhe = {
      assessment_id: 'av-1',
      instrument: 'CONFIAS',
      status: 'concluida',
      norm_selector: {},
      subject_meta: {},
      subject_label: 'A. B.',
      created_at: '2026-08-16T11:00:00Z',
      completed_at: '2026-08-16T12:00:00Z',
      resultados: {},
      derived: { confias: DERIVADO },
    };
    expect(derivadoConfias(detalhe)).toBe(DERIVADO);
  });

  it('instrumento SEM `derived` continua um payload válido', () => {
    // é o caso dos outros 20: a Edge nem devolve a chave
    const semDerivado: RespostaCorrecao = {
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: {},
    };
    expect('derived' in semDerivado).toBe(false);
    expect(derivadoConfias(semDerivado)).toBeNull();
  });

  it('as três ausências possíveis viram null, e não bloco vazio', () => {
    expect(derivadoConfias(null)).toBeNull();
    expect(derivadoConfias(undefined)).toBeNull();
    // CONFIAS de protocolo incompleto: a Edge omite `derived`
    expect(derivadoConfias({ derived: {} })).toBeNull();
    // payload torto não vira perfil de zero linha
    expect(
      derivadoConfias({
        derived: { confias: { nivel_equivalente_silaba: 'X' } as DerivadoConfias },
      }),
    ).toBeNull();
  });
});

// =====================================================================
// B · O MESMO OBJETO, PELOS DOIS CAMINHOS
// =====================================================================

describe('o snapshot congelado é lido por `_corrigefacil` no Relatório Pró', () => {
  it('lê o derivado da chave reservada do subject_meta', () => {
    const meta = {
      escolaridade: '2º ano',
      norm_selector: { hipotese: 'Silábica' },
      [CHAVE_RESERVADA]: { confias: DERIVADO },
    };
    expect(derivadoDoMeta(meta)).toEqual(DERIVADO);
  });

  it('é o MESMO objeto que a Edge promove em `derived`', () => {
    const meta = { [CHAVE_RESERVADA]: { confias: DERIVADO } };
    const daEdge = derivadoConfias({ derived: { confias: DERIVADO } });
    expect(derivadoDoMeta(meta)).toEqual(daEdge);
  });

  it('meta sem a chave, vazio ou torto devolve null', () => {
    expect(derivadoDoMeta(null)).toBeNull();
    expect(derivadoDoMeta(undefined)).toBeNull();
    expect(derivadoDoMeta({})).toBeNull();
    expect(derivadoDoMeta({ escolaridade: '2º ano' })).toBeNull();
    expect(derivadoDoMeta({ [CHAVE_RESERVADA]: 'texto' })).toBeNull();
    expect(derivadoDoMeta({ [CHAVE_RESERVADA]: [1, 2] })).toBeNull();
  });
});

// =====================================================================
// C · FORMATAÇÃO
// =====================================================================

describe('percentual: fração do servidor -> porcentagem legível', () => {
  it('valor redondo não ganha casa decimal', () => {
    expect(formatarPercentual(1)).toBe('100%');
    expect(formatarPercentual(0.75)).toBe('75%');
    expect(formatarPercentual(0.5)).toBe('50%');
    expect(formatarPercentual(0.25)).toBe('25%');
    expect(formatarPercentual(0)).toBe('0%');
  });

  it('valor não inteiro usa no máximo UMA casa, com vírgula de pt-BR', () => {
    expect(formatarPercentual(5 / 6)).toBe('83,3%');
    expect(formatarPercentual(4 / 6)).toBe('66,7%');
    expect(formatarPercentual(2 / 6)).toBe('33,3%');
    expect(formatarPercentual(0.625)).toBe('62,5%');
    expect(formatarPercentual(0.375)).toBe('37,5%');
  });

  it('ausência não vira zero', () => {
    expect(formatarPercentual(null)).toBeNull();
    expect(formatarPercentual(Number.NaN)).toBeNull();
  });

  it('acertos saem como o caderno registra', () => {
    expect(formatarAcertos(DERIVADO.perfil_habilidades[0])).toBe('3/4');
    expect(formatarAcertos(DERIVADO.perfil_habilidades[7])).toBe('5/8');
  });
});

describe('as 16 linhas saem na ordem da Edge, com o código no título', () => {
  it('preserva ordem, código e nome', () => {
    const linhas = linhasDoPerfil(DERIVADO);
    expect(linhas).toHaveLength(16);
    expect(linhas.map((l) => l.code)).toEqual([
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7',
    ]);
    expect(linhas[0].titulo).toBe('S1 — Síntese silábica');
    expect(linhas[15].titulo).toBe('F7 — Transposição fonêmica');
  });

  it('a classificação vem do payload, sem tradução', () => {
    const linhas = linhasDoPerfil(DERIVADO);
    expect(linhas[0].classificacao).toBe(CONSOLIDADA);
    expect(linhas[1].classificacao).toBe(EM_DESENVOLVIMENTO);
    expect(linhas[3].classificacao).toBe(NAO_CONSOLIDADA);
    // um rótulo que o produto não conhece atravessa intacto: prova que a
    // tela não tem uma lista própria de faixas
    const inventado = linhasDoPerfil({
      nivel_equivalente_silaba: null,
      perfil_habilidades: [h('S1', 'X', 1, 4, 'FAIXA QUE O CLIENTE NÃO CONHECE')],
    });
    expect(inventado[0].classificacao).toBe('FAIXA QUE O CLIENTE NÃO CONHECE');
  });

  it('perfil incompleto não é completado', () => {
    const parcial: DerivadoConfias = {
      nivel_equivalente_silaba: 'Silábica',
      perfil_habilidades: DERIVADO.perfil_habilidades.slice(0, 3),
    };
    expect(linhasDoPerfil(parcial)).toHaveLength(3);
  });
});

describe('os dois blocos de leitura', () => {
  it('separa silábicas e fonêmicas sem mexer nos dados', () => {
    const blocos = blocosDoPerfil(DERIVADO);
    expect(blocos.map((b) => b.titulo)).toEqual([
      TITULO_SILABICAS,
      TITULO_FONEMICAS,
    ]);
    expect(blocos[0].linhas.map((l) => l.code)).toEqual([
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9',
    ]);
    expect(blocos[1].linhas.map((l) => l.code)).toEqual([
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7',
    ]);
    // nenhuma linha se perde na partição
    expect(blocos.flatMap((b) => b.linhas)).toHaveLength(16);
  });

  it('bloco vazio não vira título', () => {
    const soSilabicas: DerivadoConfias = {
      nivel_equivalente_silaba: null,
      perfil_habilidades: DERIVADO.perfil_habilidades.slice(0, 9),
    };
    expect(blocosDoPerfil(soSilabicas).map((b) => b.titulo)).toEqual([
      TITULO_SILABICAS,
    ]);
  });
});

// =====================================================================
// D · NÃO EXISTE CÁLCULO NO CLIENTE
// =====================================================================

describe('o cliente não classifica e não conhece corte', () => {
  /** O módulo SEM comentários.
   *
   *  A varredura é sobre CÓDIGO. Os comentários do módulo citam os cortes
   *  e os rótulos de propósito — é ali que está escrito por que eles NÃO
   *  são reconstruídos no cliente —, e uma busca no arquivo cru puniria
   *  justamente a documentação da regra que ela quer proteger. */
  const CODIGO = fonte('lib', 'corrigefacil', 'confias-derivado.ts')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('a varredura enxerga o código, e não só os comentários', () => {
    // guarda da própria guarda: se o stripper zerasse o arquivo, os três
    // testes abaixo passariam sem provar nada
    expect(CODIGO).toContain('export function formatarPercentual');
    expect(CODIGO).toContain('export function linhasDoPerfil');
  });

  it('nenhum corte de faixa aparece no código', () => {
    // 0,75 e 0,50 são os pisos de `task_bands` e vivem no servidor.
    // Reconstruí-los aqui criaria uma segunda régua, que um dia
    // discordaria da primeira sem ninguém notar.
    expect(CODIGO).not.toMatch(/0\.75/);
    expect(CODIGO).not.toMatch(/0\.5\b/);
  });

  it('nenhum rótulo de faixa é escrito no código', () => {
    for (const rotulo of [CONSOLIDADA, EM_DESENVOLVIMENTO, NAO_CONSOLIDADA]) {
      expect(CODIGO).not.toContain(rotulo);
    }
  });

  it('nenhum rótulo de nível equivalente é escrito no código', () => {
    for (const nivel of [
      'Pré-silábica',
      'Silábica',
      'Silábico-alfabética',
      'Alfabética',
    ]) {
      expect(CODIGO).not.toContain(nivel);
    }
  });

  it('não há comparação de percentual em lugar nenhum do código', () => {
    // classificar é comparar. Nenhum `>=`, `<=`, `>` ou `<` sobre
    // percentual pode existir aqui: a faixa já veio decidida.
    expect(CODIGO).not.toMatch(/percentual\s*[<>]=?/);
    expect(CODIGO).not.toMatch(/[<>]=?\s*.*percentual/);
  });

  it('a nota separa nível equivalente de hipótese de escrita', () => {
    expect(NOTA_NIVEL).toContain('Não substitui a hipótese de escrita');
  });
});

// =====================================================================
// E · O TEXTO QUE VAI AO MODELO
// =====================================================================

describe('derivadoParaTexto: o bloco do Relatório Pró', () => {
  const texto = derivadoParaTexto(DERIVADO)!;

  it('traz o nível equivalente com o rótulo público', () => {
    expect(texto).toContain(`${TITULO_NIVEL}: Silábico-alfabética`);
  });

  it('carrega junto a separação em relação à hipótese', () => {
    expect(texto).toContain(NOTA_NIVEL);
  });

  it('traz as 16 habilidades, de S1 a F7', () => {
    expect(texto).toContain(TITULO_PERFIL);
    for (const linha of linhasDoPerfil(DERIVADO)) {
      expect(texto).toContain(linha.titulo);
    }
  });

  it('cada linha leva acertos/max, percentual e classificação JUNTOS', () => {
    expect(texto).toContain('S1 — Síntese silábica: 3/4 · 75% · Consolidada');
    expect(texto).toContain(
      'S8 — Exclusão silábica: 5/8 · 62,5% · Em desenvolvimento',
    );
    expect(texto).toContain(
      'F7 — Transposição fonêmica: 3/4 · 75% · Consolidada',
    );
    expect(texto).toContain(
      'F6 — Segmentação fonêmica: 1/4 · 25% · Ainda não consolidada',
    );
  });

  it('sem snapshot não existe bloco', () => {
    expect(derivadoParaTexto(null)).toBeNull();
  });

  it('snapshot só com nível não inventa perfil, e vice-versa', () => {
    const soNivel = derivadoParaTexto({
      nivel_equivalente_silaba: 'Alfabética',
      perfil_habilidades: [],
    });
    expect(soNivel).toContain(TITULO_NIVEL);
    expect(soNivel).not.toContain(TITULO_PERFIL);

    const soPerfil = derivadoParaTexto({
      nivel_equivalente_silaba: null,
      perfil_habilidades: [h('S1', 'Síntese silábica', 4, 4, CONSOLIDADA)],
    });
    expect(soPerfil).not.toContain(TITULO_NIVEL);
    expect(soPerfil).toContain(TITULO_PERFIL);
  });
});
