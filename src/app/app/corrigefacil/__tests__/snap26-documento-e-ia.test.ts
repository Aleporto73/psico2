// =====================================================================
// SNAP-IV-26 · o DOCUMENTO/PDF e o prompt do Relatório Pró.
//
// As telas já separavam as duas medidas. Faltavam os dois destinos que
// saem da tela: o documento profissional, que vira PDF, e o texto que o
// gerador manda ao modelo. Nos dois, "Bruto 12" e "Escore 4" mantinham
// exatamente a ambiguidade que esta correção existe para eliminar.
//
// O que este arquivo trava:
//
//   A. documento SNAP-IV-26: cabeçalhos e valores com o teto de cada régua
//   B. documento de outro instrumento: "Bruto" e "Escore", como sempre
//   C. Método de correção: uma vez no documento, e só nele
//   D. prompt do Relatório Pró: rótulos próprios e a orientação semântica
//   E. gráfico: continua em `score`
//
// Nada aqui pontua. Todos os números vêm de `assessment_results`.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { montarLinhas, rotulosDasColunas } from '@/lib/report/document-model';
import { formatClosedResults } from '@/lib/corrigefacil/report-generator';
import { orientacaoParaIA } from '@/lib/corrigefacil/metricas-instrumento';
import type { ResultadoEscala } from '@/lib/corrigefacil/api';

const SNAP = 'SNAP-IV-26';

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

/** O protocolo do exemplo validado na planilha controladora aprovada. */
const GOLDEN: Record<string, ResultadoEscala> = {
  DESATENCAO: resultado({
    raw: 12,
    score: 4,
    classification: 'Não atinge o limiar de sintomas deste domínio',
  }),
  HIPERATIVIDADE: resultado({
    raw: 13,
    score: 4,
    classification: 'Não atinge o limiar de sintomas deste domínio',
  }),
  TOD: resultado({
    raw: 12,
    score: 4,
    classification: 'Atinge o limiar de sintomas deste domínio',
  }),
};

/** Uma linha como o gerador do Relatório Pró a recebe do banco. */
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

const DOC = readFileSync(
  join(
    process.cwd(),
    'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]/RelatorioDocumentClient.tsx',
  ),
  'utf8',
);

// ---------------------------------------------------------------------
// A · o documento do SNAP-IV-26
// ---------------------------------------------------------------------

describe('A · documento SNAP-IV-26', () => {
  it('os cabeçalhos nomeiam as duas medidas', () => {
    expect(rotulosDasColunas(SNAP)).toEqual({
      bruto: 'Pontuação bruta',
      escore: 'Sintomas presentes',
    });
  });

  it('cada valor sai com o teto da régua DELE', () => {
    const linhas = montarLinhas(GOLDEN, SNAP);
    const por = Object.fromEntries(linhas.map((l) => [l.escala, l]));

    expect(por.DESATENCAO.brutoTexto).toBe('12 / 27');
    expect(por.DESATENCAO.escoreTexto).toBe('4 / 9');

    expect(por.HIPERATIVIDADE.brutoTexto).toBe('13 / 27');
    expect(por.HIPERATIVIDADE.escoreTexto).toBe('4 / 9');

    // o TOD tem 8 itens: os DOIS tetos são menores
    expect(por.TOD.brutoTexto).toBe('12 / 24');
    expect(por.TOD.escoreTexto).toBe('4 / 8');
  });

  it('os números crus continuam intactos ao lado do texto', () => {
    // o texto é APRESENTAÇÃO; o número persistido segue disponível e não
    // foi tocado
    const linhas = montarLinhas(GOLDEN, SNAP);
    expect(linhas.map((l) => l.bruto)).toEqual([12, 13, 12]);
    expect(linhas.map((l) => l.escore)).toEqual([4, 4, 4]);
  });

  it('escala indisponível não ganha número nem teto', () => {
    const linhas = montarLinhas(
      { TOD: resultado({ available: false, message: 'sem norma' }) },
      SNAP,
    );
    expect(linhas[0].brutoTexto).toBeNull();
    expect(linhas[0].escoreTexto).toBeNull();
  });

  it('a tabela imprime o TEXTO, não o número solto', () => {
    expect(DOC).toContain('<Celula valor={l.brutoTexto} />');
    expect(DOC).toContain('<Celula valor={l.escoreTexto} />');
    expect(DOC).toContain('{cabecalhos.bruto}');
    expect(DOC).toContain('{cabecalhos.escore}');
  });
});

// ---------------------------------------------------------------------
// B · o documento dos outros instrumentos
// ---------------------------------------------------------------------

describe('B · documento dos outros instrumentos', () => {
  it('continua "Bruto" e "Escore"', () => {
    for (const code of ['PHQ-9', 'SDQ-POR', 'SNAP-IV-18', 'DASS-21', undefined]) {
      expect(rotulosDasColunas(code), String(code)).toEqual({
        bruto: 'Bruto',
        escore: 'Escore',
      });
    }
  });

  it('e o valor sai sem teto, exatamente como saía', () => {
    const linhas = montarLinhas(
      { TOTAL: resultado({ raw: 12, score: 4 }) },
      'PHQ-9',
    );
    expect(linhas[0].brutoTexto).toBe('12');
    expect(linhas[0].escoreTexto).toBe('4');
  });
});

// ---------------------------------------------------------------------
// C · o método de correção no documento
// ---------------------------------------------------------------------

describe('C · método de correção no documento', () => {
  it('aparece UMA vez', () => {
    expect(DOC.split('<MetodoDoDocumento').length - 1).toBe(1);
  });

  it('fica FORA da tabela e antes da narrativa', () => {
    const iTabela = DOC.indexOf('</table>');
    const iMetodo = DOC.indexOf('<MetodoDoDocumento');
    const iNarrativa = DOC.indexOf('parseNarrativa');
    expect(iMetodo).toBeGreaterThan(iTabela);
    expect(iMetodo).toBeLessThan(DOC.lastIndexOf('function MetodoDoDocumento'));
    expect(iNarrativa).toBeGreaterThan(-1);
  });

  it('usa o MESMO texto das telas, sem uma segunda cópia', () => {
    // o componente do documento só dá estilo; o texto vem do módulo
    expect(DOC).toContain(
      "import { metodoDeCorrecao } from '@/lib/corrigefacil/metricas-instrumento'",
    );
    // e o texto NÃO está escrito à mão dentro do documento
    expect(DOC).not.toContain('Mattos et al.');
  });

  it('não renderiza nada nos outros instrumentos', () => {
    // a guarda é a própria função: sem método declarado, devolve null e o
    // componente sai cedo
    expect(DOC).toContain('if (!metodo) return null;');
  });
});

// ---------------------------------------------------------------------
// D · o prompt do Relatório Pró
// ---------------------------------------------------------------------

describe('D · prompt do Relatório Pró', () => {
  const texto = formatClosedResults(
    [
      linhaDoBanco('DESATENCAO', 12, 4),
      linhaDoBanco('HIPERATIVIDADE', 13, 4),
      linhaDoBanco('TOD', 12, 4),
    ],
    SNAP,
  );

  it('usa "pontuação bruta" e "sintomas presentes", com os tetos', () => {
    expect(texto).toContain('- pontuação bruta: 12 / 27');
    expect(texto).toContain('- sintomas presentes: 4 / 9');
    expect(texto).toContain('- pontuação bruta: 13 / 27');
    expect(texto).toContain('- pontuação bruta: 12 / 24');
    expect(texto).toContain('- sintomas presentes: 4 / 8');
  });

  it('não manda mais os rótulos genéricos para o SNAP-IV-26', () => {
    expect(texto).not.toContain('- bruto:');
    expect(texto).not.toContain('- escore:');
  });

  it('informa QUAL das duas interpreta o limiar', () => {
    expect(orientacaoParaIA(SNAP)).toBe(
      'A interpretação do limiar utiliza a contagem de Sintomas presentes, ' +
        'não a Pontuação bruta.',
    );
  });

  it('a orientação entra no userText, e não no system prompt geral', () => {
    const motor = readFileSync(
      join(process.cwd(), 'src/lib/corrigefacil/report-generator.ts'),
      'utf8',
    );
    const userText = motor.slice(
      motor.indexOf('const userText = `'),
      motor.indexOf('Preserve integralmente os dados fechados acima.'),
    );
    expect(userText).toContain('${orientacaoText}');
    // o system prompt é o mesmo para todos os instrumentos
    const system = motor.slice(
      motor.indexOf('export function buildCorrigeFacilSystemPrompt'),
      motor.indexOf('export function professionalText'),
    );
    expect(system).not.toContain('SNAP');
    expect(system).not.toContain('Sintomas presentes');
  });

  it('é orientação, não autorização: as travas continuam', () => {
    const motor = readFileSync(
      join(process.cwd(), 'src/lib/corrigefacil/report-generator.ts'),
      'utf8',
    );
    expect(motor).toContain('Trate-os como dados fechados');
    expect(motor).toContain('Não recalcule escores');
    expect(motor).toContain('Não determine pontos de corte');
    // e o texto injetado diz explicitamente para não recalcular
    expect(motor).toContain('não recalcule nada');
  });

  it('os outros instrumentos NÃO recebem rótulo especial nem orientação', () => {
    for (const code of ['PHQ-9', 'SDQ-POR', 'SNAP-IV-18', undefined]) {
      expect(orientacaoParaIA(code), String(code)).toBeNull();
      const t = formatClosedResults([linhaDoBanco('TOTAL', 12, 4)], code);
      expect(t, String(code)).toContain('- bruto: 12');
      expect(t, String(code)).toContain('- escore: 4');
      expect(t, String(code)).not.toContain('pontuação bruta');
      expect(t, String(code)).not.toContain('sintomas presentes');
    }
  });
});

// ---------------------------------------------------------------------
// E · o gráfico
// ---------------------------------------------------------------------

describe('E · o gráfico não mudou', () => {
  it('continua em `score`, com os ranges de contagem', () => {
    const config = readFileSync(
      join(process.cwd(), 'src/app/app/corrigefacil/graphs/graph-config.ts'),
      'utf8',
    );
    const i = config.indexOf("'SNAP-IV-26'");
    const bloco = config.slice(i, i + 900);
    expect(bloco).toContain("metrica: 'score'");
    expect(bloco).toContain('DESATENCAO: { min: 0, max: 9 }');
    expect(bloco).toContain('HIPERATIVIDADE: { min: 0, max: 9 }');
    expect(bloco).toContain('TOD: { min: 0, max: 8 }');
    // o bruto NÃO entrou no eixo
    expect(bloco).not.toContain('max: 27');
    expect(bloco).not.toContain('max: 24');
  });
});
