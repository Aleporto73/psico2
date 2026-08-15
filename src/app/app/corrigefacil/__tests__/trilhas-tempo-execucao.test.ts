// =====================================================================
// TRILHAS_PRE · os tempos das Partes A e B como REGISTRO DESCRITIVO.
//
// A planilha controladora anota o tempo em segundos das duas partes. São
// dois números que o profissional transcreve e relê depois — não entram
// em nenhuma das quatro medidas normativas do instrumento.
//
// O que este arquivo trava:
//
//   A. os dois campos existem no TRILHAS_PRE, e são opcionais
//   B. o que foi digitado vai para `subject_meta`, e só para lá
//   C. o histórico/detalhe relê o que foi gravado
//   D. o documento/PDF imprime os dois, com a nota junto
//   E. o prompt do Relatório Pró recebe os dois, com a nota junto
//   F. o gráfico NÃO conhece tempo
//   G. as quatro medidas normativas não se movem
//   H. instrumento fora do TRILHAS_PRE não ganha campo nenhum
//
// Nada aqui pontua. Tempo não recebe pontuação-padrão, classificação,
// percentil, faixa, cor nem leitura de rápido/lento — e é isso que a
// maioria destas asserções está protegendo.
//
// Os testes de RENDER são feitos sobre a FONTE, e não sobre o DOM: o
// vitest deste repositório roda em `node` e não monta componente. É o
// mesmo recurso de snap26-documento-e-ia.test.ts. O que eles provam é o
// acoplamento — que documento e detalhe leem do módulo compartilhado —,
// não o pixel.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatarTempo,
  lerTempos,
  NOTA_TEMPOS,
  segundosDoCampo,
  TEMPOS_POR_INSTRUMENTO,
  temposDoInstrumento,
  temposParaTexto,
  TITULO_TEMPOS,
} from '@/lib/corrigefacil/tempos-execucao';
import {
  identificacaoInicial,
  montarPedidoAvaliacao,
  podeSalvar,
  validarIdentificacao,
} from '../avaliar/[code]/save-model';
import { montarModelo } from '../avaliar/[code]/form-model';
import { estadoInicial } from '../avaliar/[code]/form-state';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';

const TRILHAS = 'TRILHAS_PRE';

/** O GOLDEN do enunciado: Parte A = 35s, Parte B = 55s. */
const A = 35;
const B = 55;
const META_GOLDEN = { tempo_parte_a_segundos: A, tempo_parte_b_segundos: B };

function detalhe(code: string): InstrumentoDetalhe {
  return {
    code,
    name: code,
    entry_mode: 'escore_bruto',
    score_type: 'pontuacao_padrao',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [
      { code: 'TOTAL', name: 'Total', kind: 'primaria', bruto_min: 0, bruto_max: 40 },
    ],
    itens: [],
    opcoes_resposta: [],
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
  } as unknown as InstrumentoDetalhe;
}

function identificado(tempos: Record<string, string>) {
  return {
    ...identificacaoInicial(),
    nome: 'Ana Beatriz Costa',
    idadeAnos: '5',
    tempos,
  };
}

function fonte(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), 'src', ...caminho), 'utf8');
}

// ── A · os dois campos existem ───────────────────────────────────────
describe('A · o TRILHAS_PRE declara os dois tempos', () => {
  it('Parte A e Parte B, nessa ordem, com as chaves do subject_meta', () => {
    const campos = temposDoInstrumento(TRILHAS);
    expect(campos).not.toBeNull();
    expect(campos!.map((c) => c.chave)).toEqual([
      'tempo_parte_a_segundos',
      'tempo_parte_b_segundos',
    ]);
    expect(campos!.map((c) => c.rotulo)).toEqual(['Parte A', 'Parte B']);
    expect(campos![0].label).toBe('Tempo Parte A (segundos)');
    expect(campos![1].label).toBe('Tempo Parte B (segundos)');
  });

  it('os campos são OPCIONAIS: sem tempo o salvamento continua liberado', () => {
    const modelo = montarModelo(detalhe(TRILHAS));
    const semTempo = identificado({});
    expect(validarIdentificacao(semTempo, modelo.exigeDataNascimento)).toEqual([]);
    expect(podeSalvar(semTempo, modelo.exigeDataNascimento, false, false)).toBe(true);
  });

  it('o formulário desenha os campos a partir do módulo, e diz a nota antes', () => {
    const src = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    expect(src).toContain('temposDoInstrumento');
    expect(src).toContain('NOTA_TEMPOS');
    expect(src).toContain('(opcional)');
  });
});

// ── B · persistência em subject_meta ─────────────────────────────────
describe('B · o que foi digitado vai para o subject_meta', () => {
  const modelo = montarModelo(detalhe(TRILHAS));

  it('GOLDEN 35/55 grava as duas chaves como número', () => {
    const pedido = montarPedidoAvaliacao(
      modelo,
      estadoInicial(),
      identificado({ tempo_parte_a_segundos: '35', tempo_parte_b_segundos: '55' }),
    );
    expect(pedido.subject_meta).toMatchObject(META_GOLDEN);
    expect(typeof pedido.subject_meta!.tempo_parte_a_segundos).toBe('number');
  });

  it('campo vazio NÃO vira chave — "não informado" não é zero', () => {
    const pedido = montarPedidoAvaliacao(
      modelo,
      estadoInicial(),
      identificado({ tempo_parte_a_segundos: '35', tempo_parte_b_segundos: '' }),
    );
    expect(pedido.subject_meta).toHaveProperty('tempo_parte_a_segundos', 35);
    expect(pedido.subject_meta).not.toHaveProperty('tempo_parte_b_segundos');
  });

  it('zero segundo é valor legítimo e é gravado', () => {
    const pedido = montarPedidoAvaliacao(
      modelo,
      estadoInicial(),
      identificado({ tempo_parte_a_segundos: '0' }),
    );
    expect(pedido.subject_meta).toHaveProperty('tempo_parte_a_segundos', 0);
  });

  it('lixo e negativo não são gravados', () => {
    expect(segundosDoCampo('abc')).toBeNull();
    expect(segundosDoCampo('-1')).toBeNull();
    expect(segundosDoCampo('')).toBeNull();
    const pedido = montarPedidoAvaliacao(
      modelo,
      estadoInicial(),
      identificado({ tempo_parte_a_segundos: '-5', tempo_parte_b_segundos: 'abc' }),
    );
    expect(pedido.subject_meta).not.toHaveProperty('tempo_parte_a_segundos');
    expect(pedido.subject_meta).not.toHaveProperty('tempo_parte_b_segundos');
  });

  it('o tempo NÃO vai para respostas nem para brutos: não é resposta de item', () => {
    const pedido = montarPedidoAvaliacao(
      modelo,
      estadoInicial(),
      identificado({ tempo_parte_a_segundos: '35', tempo_parte_b_segundos: '55' }),
    );
    const respostas = JSON.stringify(pedido.respostas ?? {});
    const brutos = JSON.stringify(pedido.brutos ?? {});
    for (const alvo of ['35', '55', 'tempo_parte']) {
      expect(respostas).not.toContain(alvo);
      expect(brutos).not.toContain(alvo);
    }
  });
});

// ── C · histórico/detalhe ────────────────────────────────────────────
describe('C · o histórico relê o que foi gravado', () => {
  it('GOLDEN 35/55 volta com os rótulos da apresentação', () => {
    expect(lerTempos(TRILHAS, META_GOLDEN)).toEqual([
      { rotulo: 'Parte A', segundos: A },
      { rotulo: 'Parte B', segundos: B },
    ]);
  });

  it('a linha apresentada é exatamente a do enunciado', () => {
    const linhas = lerTempos(TRILHAS, META_GOLDEN).map(formatarTempo);
    expect(linhas).toEqual(['Parte A: 35 segundos', 'Parte B: 55 segundos']);
  });

  it('tempo ausente não vira linha, e não inventa valor', () => {
    expect(lerTempos(TRILHAS, { tempo_parte_a_segundos: A })).toEqual([
      { rotulo: 'Parte A', segundos: A },
    ]);
    // avaliação salva ANTES de o campo existir: nenhuma chave, nenhuma linha
    expect(lerTempos(TRILHAS, {})).toEqual([]);
    expect(lerTempos(TRILHAS, null)).toEqual([]);
    expect(lerTempos(TRILHAS, { respondent_name: 'Mãe' })).toEqual([]);
  });

  it('o detalhe consome o módulo compartilhado, não uma segunda leitura', () => {
    const comp = fonte('app', 'app', 'corrigefacil', 'TemposDeExecucao.tsx');
    expect(comp).toContain('lerTempos');
    expect(comp).toContain('NOTA_TEMPOS');
    const det = fonte(
      'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'DetalheClient.tsx',
    );
    expect(det).toContain('<TemposDeExecucao');
  });
});

// ── D · documento/PDF ────────────────────────────────────────────────
describe('D · o documento imprime os dois tempos', () => {
  const doc = fonte(
    'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios', '[reportId]',
    'RelatorioDocumentClient.tsx',
  );

  it('renderiza o bloco a partir do mesmo módulo', () => {
    expect(doc).toContain('tempos-execucao');
    expect(doc).toContain('<TemposDoDocumento');
    expect(doc).toContain('lerTempos');
  });

  it('a nota sai impressa junto: o PDF circula sem o contexto da tela', () => {
    expect(doc).toContain('NOTA_TEMPOS');
  });

  it('o tempo fica FORA da tabela de resultados', () => {
    // a tabela do documento é montada por `document-model`; nenhuma chave de
    // tempo pode aparecer ali, senão uma linha de tempo seria lida como
    // resultado, com colunas de escore e classificação ao lado
    const modeloDoc = fonte('lib', 'report', 'document-model.ts');
    expect(modeloDoc).not.toContain('tempo_parte');
    expect(modeloDoc).not.toContain('tempos-execucao');
  });
});

// ── E · Relatório Pró ────────────────────────────────────────────────
describe('E · o prompt recebe os tempos e a trava de leitura', () => {
  it('GOLDEN 35/55 aparece no texto, com título e nota', () => {
    const texto = temposParaTexto(TRILHAS, META_GOLDEN);
    expect(texto).not.toBeNull();
    expect(texto).toContain('Parte A: 35 segundos');
    expect(texto).toContain('Parte B: 55 segundos');
    expect(texto).toContain(TITULO_TEMPOS.toUpperCase());
    expect(texto).toContain(NOTA_TEMPOS);
  });

  it('sem tempo gravado o prompt não muda um caractere', () => {
    expect(temposParaTexto(TRILHAS, {})).toBeNull();
    expect(temposParaTexto(TRILHAS, null)).toBeNull();
  });

  it('o gerador injeta o bloco e proíbe inferir ritmo', () => {
    const gen = fonte('lib', 'corrigefacil', 'report-generator.ts');
    expect(gen).toContain('temposParaTexto');
    expect(gen).toContain('temposText');
    expect(gen).toMatch(/não é resultado normativo/);
    expect(gen).toMatch(/não infira ritmo/);
  });
});

// ── F · gráfico ──────────────────────────────────────────────────────
describe('F · o gráfico não conhece tempo', () => {
  it('nada da configuração ou do modelo do gráfico menciona tempo', () => {
    for (const arq of ['graph-config.ts', 'graph-model.ts']) {
      const src = fonte('app', 'app', 'corrigefacil', 'graphs', arq);
      expect(src).not.toContain('tempo_parte');
      expect(src).not.toContain('tempos-execucao');
      expect(src).not.toContain('TemposDeExecucao');
    }
  });

  it('o TRILHAS_PRE continua declarado no graph-config', () => {
    const src = fonte('app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(src).toContain('TRILHAS_PRE');
  });
});

// ── G · as quatro medidas normativas ─────────────────────────────────
describe('G · nenhuma medida normativa se move', () => {
  it('o tempo não carrega escore, classificação, percentil, faixa nem cor', () => {
    for (const t of lerTempos(TRILHAS, META_GOLDEN)) {
      expect(Object.keys(t).sort()).toEqual(['rotulo', 'segundos']);
    }
  });

  it('gravar tempo não altera respostas, brutos nem norm_selector', () => {
    const modelo = montarModelo(detalhe(TRILHAS));
    const estado = estadoInicial();
    const semTempo = montarPedidoAvaliacao(modelo, estado, identificado({}));
    const comTempo = montarPedidoAvaliacao(
      modelo,
      estado,
      identificado({ tempo_parte_a_segundos: '35', tempo_parte_b_segundos: '55' }),
    );
    expect(comTempo.respostas).toEqual(semTempo.respostas);
    expect(comTempo.brutos).toEqual(semTempo.brutos);
    expect(comTempo.norm_selector).toEqual(semTempo.norm_selector);
    expect(comTempo.instrument_code).toEqual(semTempo.instrument_code);
  });

  it('o módulo de tempo não conhece norma, percentil nem classificação', () => {
    const src = fonte('lib', 'corrigefacil', 'tempos-execucao.ts');
    expect(src).not.toContain('classification');
    expect(src).not.toContain('percentile');
    // módulo PURO: sem import nenhum, então não alcança api, norma ou gráfico
    expect(src).not.toMatch(/^import /m);
  });
});

// ── H · os outros instrumentos ───────────────────────────────────────
describe('H · instrumento fora do TRILHAS_PRE não ganha nada', () => {
  it('o mapa é fechado: só um código listado', () => {
    expect(Object.keys(TEMPOS_POR_INSTRUMENTO)).toEqual([TRILHAS]);
  });

  it('outro instrumento não declara campo de tempo', () => {
    for (const code of ['PHQ-9', 'SNAP-IV-26', 'BAYLEY-III', 'CONFIAS', 'DCDQ']) {
      expect(temposDoInstrumento(code)).toBeNull();
      expect(lerTempos(code, META_GOLDEN)).toEqual([]);
      expect(temposParaTexto(code, META_GOLDEN)).toBeNull();
    }
    expect(temposDoInstrumento(undefined)).toBeNull();
  });

  it('outro instrumento NÃO grava tempo, mesmo com o campo preenchido', () => {
    const modelo = montarModelo(detalhe('PHQ-9'));
    const pedido = montarPedidoAvaliacao(
      modelo,
      estadoInicial(),
      identificado({ tempo_parte_a_segundos: '35', tempo_parte_b_segundos: '55' }),
    );
    expect(pedido.subject_meta).not.toHaveProperty('tempo_parte_a_segundos');
    expect(pedido.subject_meta).not.toHaveProperty('tempo_parte_b_segundos');
  });
});
