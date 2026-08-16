// =====================================================================
// CONFIAS · a apresentação: itens agrupados, resultado, histórico,
// documento e prompt.
//
// O que este arquivo trava:
//
//   B. AGRUPAMENTO · os 70 itens em 16 blocos, na ordem do catálogo, com
//      "code — name" no título, cada item uma vez só e "Item N" no lugar
//      do enunciado ausente. E os outros instrumentos sem uma mudança.
//   C. RESULTADO IMEDIATO · o bloco sai de `derived`, e some sem ele.
//   D. HISTÓRICO · lê `AvaliacaoDetalhe.derived`, o snapshot CONGELADO,
//      e não reconstrói nada a partir de resposta ou catálogo.
//   E. RELATÓRIO PRÓ · o bloco entra no texto do modelo; sem snapshot ele
//      não existe, e o prompt dos outros 20 não muda um caractere.
//   F. DOCUMENTO · nível e perfil impressos a partir de `avaliacao.derived`,
//      fora da narrativa da IA e fora da tabela de escalas.
//
// Como o Vitest daqui roda em `node`, sem DOM, a fiação dos `.tsx` é
// conferida no FONTE — mesma técnica de snap26-documento-e-ia.test.ts. O
// que é lógica mora em módulo puro e é exercitado de verdade.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import {
  APRESENTACAO_AGRUPADA,
  gruposDeItens,
  montarModelo,
} from '../avaliar/[code]/form-model';
import {
  buildCorrigeFacilSystemPrompt,
  formatClosedResults,
} from '@/lib/corrigefacil/report-generator';

const fonte = (...caminho: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...caminho), 'utf8');

// ---------------------------------------------------------------------
// o catálogo do CONFIAS, como GET /catalogo/CONFIAS o devolve
// ---------------------------------------------------------------------

/** As 16 tarefas, com os itens de cada uma. É o que a Edge publica em
 *  `item_groups`, na ordem de `ig.ordinal`. */
const TAREFAS: [string, string, number, number][] = [
  ['S1', 'Síntese silábica', 1, 4],
  ['S2', 'Segmentação silábica', 5, 8],
  ['S3', 'Identificação de sílaba inicial', 9, 12],
  ['S4', 'Identificação de rima', 13, 16],
  ['S5', 'Produção de palavra com a sílaba dada', 17, 20],
  ['S6', 'Identificação de sílaba medial', 21, 24],
  ['S7', 'Produção de rima', 25, 28],
  ['S8', 'Exclusão silábica', 29, 36],
  ['S9', 'Transposição silábica', 37, 40],
  ['F1', 'Produção de palavra que inicia com o som dado', 41, 44],
  ['F2', 'Identificação de fonema inicial', 45, 48],
  ['F3', 'Identificação de fonema final', 49, 52],
  ['F4', 'Exclusão fonêmica', 53, 58],
  ['F5', 'Síntese fonêmica', 59, 62],
  ['F6', 'Segmentação fonêmica', 63, 66],
  ['F7', 'Transposição fonêmica', 67, 70],
];

const faixa = (de: number, ate: number) =>
  Array.from({ length: ate - de + 1 }, (_, i) => de + i);

function catalogoConfias(): InstrumentoDetalhe {
  return {
    code: 'CONFIAS',
    name: 'Consciência Fonológica — Instrumento de Avaliação Sequencial',
    entry_mode: 'itens',
    score_type: 'escore_z',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [],
    // o CONFIAS não licenciou os enunciados: `texto` é null nos 70
    itens: faixa(1, 70).map((numero) => ({ numero, texto: null })),
    opcoes_resposta: [
      { label: 'Erro', value: 0 },
      { label: 'Acerto', value: 1 },
    ],
    dimensoes: [
      {
        code: 'hipotese',
        label: 'Hipótese de escrita',
        manual: true,
        opcoes: ['Pré-silábica', 'Silábica', 'Silábico-alfabética', 'Alfabética'],
      },
    ],
    arvore: {},
    faixas_classificacao: [],
    item_groups: TAREFAS.map(([code, name, de, ate]) => ({
      code,
      name,
      itens: faixa(de, ate),
    })),
  };
}

/** Um instrumento sem grupos, para provar que nada muda para ele. */
function catalogoSemGrupos(code: string, enunciados: boolean): InstrumentoDetalhe {
  return {
    code,
    name: `Instrumento ${code}`,
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [],
    itens: faixa(1, 5).map((numero) => ({
      numero,
      texto: enunciados ? `Enunciado do item ${numero}` : null,
    })),
    opcoes_resposta: [
      { label: 'Não', value: 0 },
      { label: 'Sim', value: 1 },
    ],
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
  };
}

// =====================================================================
// B · AGRUPAMENTO
// =====================================================================

describe('CONFIAS: os 70 itens em 16 tarefas', () => {
  const modelo = montarModelo(catalogoConfias());
  const grupos = gruposDeItens(modelo.itens);

  it('liga a apresentação agrupada', () => {
    expect(modelo.itensAgrupados).toBe(true);
  });

  it('são 16 grupos, na ordem S1..S9 / F1..F7 do catálogo', () => {
    expect(grupos).toHaveLength(16);
    expect(grupos.map((g) => g.code)).toEqual(TAREFAS.map(([code]) => code));
  });

  it('o título usa code + name, como no caderno de aplicação', () => {
    expect(grupos[0].code).toBe('S1');
    expect(grupos[0].nome).toBe('Síntese silábica');
    expect(grupos[15].code).toBe('F7');
    expect(grupos[15].nome).toBe('Transposição fonêmica');
    // e o modelo preserva os dois no item, que é de onde o título sai
    expect(modelo.itens[0].grupo).toEqual({
      code: 'S1',
      name: 'Síntese silábica',
    });
  });

  it('os 70 itens aparecem exatamente UMA vez, com o número real', () => {
    const numeros = grupos.flatMap((g) => g.itens.map((i) => i.numero));
    expect(numeros).toHaveLength(70);
    expect(new Set(numeros).size).toBe(70);
    expect([...numeros].sort((a, b) => a - b)).toEqual(faixa(1, 70));
    // e cada tarefa fica com os itens DELA
    for (const [code, , de, ate] of TAREFAS) {
      const g = grupos.find((x) => x.code === code)!;
      expect(g.itens.map((i) => i.numero)).toEqual(faixa(de, ate));
    }
  });

  it('item sem enunciado se apresenta como "Item N"', () => {
    // o texto já é o rótulo; o aviso é que não se repete 70 vezes
    expect(modelo.itens[0].texto).toBe('Item 1');
    expect(modelo.itens[69].texto).toBe('Item 70');
    expect(modelo.itens.every((i) => i.semEnunciado)).toBe(true);
  });

  it('as alternativas continuam sendo as do catálogo', () => {
    for (const item of modelo.itens) {
      expect(item.opcoes).toEqual([
        { label: 'Erro', value: 0 },
        { label: 'Acerto', value: 1 },
      ]);
    }
  });

  it('nenhum mapa manual de S1..F7 existe no código', () => {
    const modeloFonte = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'form-model.ts');
    const tela = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    // 'S1'..'F7' como literal seria um segundo catálogo, e ele divergiria
    for (const [code] of TAREFAS) {
      expect(modeloFonte).not.toContain(`'${code}'`);
      expect(tela).not.toContain(`'${code}'`);
    }
  });
});

describe('os outros instrumentos não mudam', () => {
  it('instrumento sem grupos não liga a apresentação agrupada', () => {
    for (const code of ['PHQ-9', 'SDQ-POR', 'CES-D', 'BPA-2']) {
      const modelo = montarModelo(catalogoSemGrupos(code, true));
      expect(modelo.itensAgrupados).toBe(false);
      expect(gruposDeItens(modelo.itens)).toEqual([]);
      expect(modelo.itens.every((i) => i.grupo === null)).toBe(true);
    }
  });

  it('instrumento SEM enunciado e sem grupos mantém o aviso de hoje', () => {
    // C-TRF, ERA-F, EPQ-J, ETPC: continuam na lista corrida, e ali o aviso
    // "sem enunciado neste instrumento" é o comportamento atual
    const modelo = montarModelo(catalogoSemGrupos('C-TRF_1.5-5', false));
    expect(modelo.itensAgrupados).toBe(false);
    expect(modelo.itens.every((i) => i.semEnunciado)).toBe(true);
    const tela = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    expect(tela).toContain('sem enunciado neste instrumento');
    // e o aviso é ligado por prop, não removido
    expect(tela).toContain('avisarSemEnunciado');
    expect(tela).toContain('avisarSemEnunciado = true');
  });

  it('o mapa de apresentação agrupada é FECHADO, e só tem o CONFIAS', () => {
    expect([...APRESENTACAO_AGRUPADA]).toEqual(['CONFIAS']);
  });

  it('instrumento listado que chegue sem item_groups cai na lista corrida', () => {
    // fail-safe: ligar o agrupamento sem grupo nenhum desenharia zero
    // bloco e sumiria com os itens
    const semGrupos = { ...catalogoConfias(), item_groups: [] };
    expect(montarModelo(semGrupos).itensAgrupados).toBe(false);
  });
});

// =====================================================================
// C · RESULTADO IMEDIATO
// =====================================================================

describe('resultado imediato: o bloco sai de `derived`', () => {
  const tela = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');

  it('renderiza a partir da resposta do servidor', () => {
    expect(tela).toContain('<ConfiasDerivado derivado={derivadoConfias(resposta)} />');
  });

  it('vem depois dos cards normativos', () => {
    expect(tela.indexOf('<ConfiasDerivado')).toBeGreaterThan(
      tela.indexOf('metricasDaEscala(detalhe.code, escala'),
    );
  });

  it('não passa resposta item a item para o componente', () => {
    const componente = fonte('app', 'app', 'corrigefacil', 'ConfiasDerivado.tsx');
    expect(componente).not.toContain('respostas');
    expect(componente).not.toContain('estado');
    // o componente recebe UMA prop, e ela é o derivado
    expect(componente).toContain('derivado');
  });

  it('sem `derived` o componente devolve null sozinho', () => {
    const componente = fonte('app', 'app', 'corrigefacil', 'ConfiasDerivado.tsx');
    expect(componente).toContain('if (!derivado) return null;');
  });
});

// =====================================================================
// D · HISTÓRICO
// =====================================================================

describe('histórico: só o snapshot congelado', () => {
  const detalheTela = fonte(
    'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'DetalheClient.tsx',
  );

  it('usa `AvaliacaoDetalhe.derived`, pelo mesmo leitor', () => {
    expect(detalheTela).toContain('<ConfiasDerivado derivado={derivadoConfias(d)} />');
  });

  it('é o MESMO componente da tela de correção', () => {
    const tela = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    for (const arquivo of [detalheTela, tela]) {
      expect(arquivo).toContain("import { ConfiasDerivado } from");
      expect(arquivo).toContain(
        "import { derivadoConfias } from '@/lib/corrigefacil/confias-derivado';",
      );
    }
  });

  it('não reconstrói perfil a partir de resposta nem busca catálogo', () => {
    expect(detalheTela).not.toContain('buscarInstrumento');
    expect(detalheTela).not.toContain('montarModelo');
    expect(detalheTela).not.toContain('item_groups');
    // a única chamada de rede continua sendo a da avaliação
    expect(detalheTela.match(/buscar[A-Z]\w+\(/g)).toEqual(['buscarAvaliacao(']);
  });

  it('avaliação antiga, sem snapshot, continua renderizando', () => {
    // `derivadoConfias` devolve null e o componente some; o resto da tela
    // não depende dele — nenhuma leitura obrigatória de `derived`
    expect(detalheTela).not.toContain('d.derived!');
    expect(detalheTela).not.toContain('d.derived.confias');
  });
});

// =====================================================================
// E · RELATÓRIO PRÓ · o prompt
// =====================================================================

describe('Relatório Pró: o snapshot entra no prompt', () => {
  const motor = fonte('lib', 'corrigefacil', 'report-generator.ts');

  it('lê o snapshot do subject_meta, sem query nova', () => {
    expect(motor).toContain('derivadoParaTexto(derivadoDoMeta(subjectMeta))');
    // `subject_meta` já vinha no SELECT: nenhuma consulta foi acrescentada
    expect(motor.match(/\.from\('assessments'\)/g)).toHaveLength(1);
  });

  it('o bloco entra nos RESULTADOS FECHADOS', () => {
    expect(motor).toContain('DADOS DERIVADOS CONGELADOS DO CONFIAS');
    expect(motor).toContain('${resultsText}${derivadoText}');
  });

  it('a regra do system prompt cobre os três "não recalcule"', () => {
    const comDerivado = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true);
    expect(comDerivado).toContain('DADOS DERIVADOS CONGELADOS');
    expect(comDerivado).toContain('Não recalcule o percentual de nenhuma habilidade');
    expect(comDerivado).toContain('não recalcule a classificação de nenhuma habilidade');
    expect(comDerivado).toContain('não recalcule o nível equivalente');
  });

  it('a regra separa nível equivalente de hipótese normativa', () => {
    const comDerivado = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true);
    expect(comDerivado).toContain(
      '"Nível equivalente (escore sílaba)" NÃO é a hipótese de escrita',
    );
    expect(comDerivado).toContain('não trate a diferença entre os dois como inconsistência');
  });

  it('a regra libera descrever o perfil e proíbe inventar habilidade', () => {
    const comDerivado = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true);
    expect(comDerivado).toContain('O Perfil por Habilidade PODE ser usado');
    expect(comDerivado).toContain(
      'Não nomeie habilidade que não esteja nas linhas recebidas',
    );
  });

  it('instrumento SEM snapshot mantém o prompt byte a byte', () => {
    const semDerivado = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(semDerivado).toBe(buildCorrigeFacilSystemPrompt('technical', 'AVISO', false));
    expect(semDerivado).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(semDerivado).not.toContain('Perfil por Habilidade');
    expect(semDerivado).not.toContain('Nível equivalente');
    // e para todos os quatro destinos
    for (const destino of ['family', 'school', 'technical', 'internal'] as const) {
      expect(buildCorrigeFacilSystemPrompt(destino, 'AVISO')).not.toContain(
        'DADOS DERIVADOS',
      );
    }
  });

  it('os RESULTADOS FECHADOS por escala continuam iguais', () => {
    // o bloco novo é ADITIVO: `formatClosedResults` não mudou
    const texto = formatClosedResults(
      [
        {
          raw: 31, score: null, percentile: null, z_score: '-0.17',
          classification: 'Desempenho compatível com o esperado',
          ci95: null, available: true, message: null, flags: [],
          scales: { code: 'Sílaba', name: 'Sílaba' },
        },
      ],
      'CONFIAS',
    );
    expect(texto).toContain('Sílaba');
    expect(texto).toContain('- bruto: 31');
    expect(texto).toContain('- z: -0.17');
    expect(texto).not.toContain('Perfil por Habilidade');
  });
});

// =====================================================================
// F · DOCUMENTO PROFISSIONAL
// =====================================================================

describe('documento: imprime os dados fechados, não a narrativa', () => {
  const doc = fonte(
    'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
    '[reportId]', 'RelatorioDocumentClient.tsx',
  );

  it('os dados vêm de `avaliacao.derived`', () => {
    expect(doc).toContain('<ConfiasDoDocumento avaliacao={avaliacao} />');
    expect(doc).toContain('const derivado = derivadoConfias(avaliacao);');
  });

  it('imprime nível equivalente e perfil por habilidade', () => {
    expect(doc).toContain('TITULO_NIVEL');
    expect(doc).toContain('TITULO_PERFIL');
    expect(doc).toContain('NOTA_NIVEL');
    expect(doc).toContain('blocosDoPerfil(derivado)');
  });

  it('vem ANTES da narrativa da IA', () => {
    expect(doc.indexOf('<ConfiasDoDocumento')).toBeLessThan(
      doc.indexOf('<ReactMarkdown'),
    );
  });

  it('vem depois da tabela de resultados e não dentro dela', () => {
    const tabela = doc.indexOf('montarLinhas(avaliacao.resultados');
    const bloco = doc.indexOf('<ConfiasDoDocumento');
    expect(bloco).toBeGreaterThan(tabela);
    // as 16 tarefas NÃO entram na tabela de Sílaba/Fonema/Total
    const corpoDaTabela = doc.slice(doc.indexOf('<tbody'), doc.indexOf('</tbody>'));
    expect(corpoDaTabela).not.toContain('ConfiasDoDocumento');
    expect(corpoDaTabela).not.toContain('perfil_habilidades');
    expect(corpoDaTabela).not.toContain('blocosDoPerfil');
  });

  it('não depende da narrativa: o bloco é impresso pelo documento', () => {
    const componente = doc.slice(doc.indexOf('function ConfiasDoDocumento'));
    const fim = componente.indexOf('\n/**');
    const corpo = fim > 0 ? componente.slice(0, fim) : componente;
    expect(corpo).not.toContain('output_text');
    expect(corpo).not.toContain('narrativa');
    expect(corpo).not.toContain('rascunho');
  });

  it('lê do mesmo módulo que a tela e o histórico', () => {
    expect(doc).toContain("} from '@/lib/corrigefacil/confias-derivado';");
  });

  it('sem snapshot não imprime seção nenhuma', () => {
    expect(doc).toContain('if (!derivado) return null;');
  });
});

// =====================================================================
// GRÁFICOS · nenhuma tarefa virou escala
// =====================================================================

describe('os gráficos não mudam', () => {
  it('nenhum arquivo de gráfico conhece o derivado', () => {
    for (const arquivo of ['ResultGraph.tsx', 'graph-model.ts', 'graph-config.ts']) {
      const g = fonte('app', 'app', 'corrigefacil', 'graphs', arquivo);
      expect(g).not.toContain('derived');
      expect(g).not.toContain('perfil_habilidades');
      expect(g).not.toContain('nivel_equivalente');
      expect(g).not.toContain('confias-derivado');
    }
  });
});
