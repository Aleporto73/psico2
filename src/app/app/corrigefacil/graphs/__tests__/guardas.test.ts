// =====================================================================
// Guardas estruturais. Não testam comportamento: testam o que o módulo
// de gráficos TEM PERMISSÃO de conter.
//
// O gráfico é uma releitura do que já está na tela. No dia em que ele
// precisar buscar alguma coisa para desenhar, deixou de ser releitura —
// e é isso que estes testes travam.
// =====================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'src/app/app/corrigefacil/graphs');
const TELA = join(
  process.cwd(),
  'src/app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx',
);

function fontes(): { nome: string; texto: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => ({ nome: f, texto: readFileSync(join(DIR, f), 'utf8') }));
}

describe('19 · o módulo de gráficos não fala com a rede', () => {
  it('nenhum fetch, XHR ou cliente Supabase', () => {
    for (const { nome, texto } of fontes()) {
      expect(texto, nome).not.toMatch(/\bfetch\s*\(/);
      expect(texto, nome).not.toMatch(/XMLHttpRequest/);
      expect(texto, nome).not.toMatch(/createClient|supabase/i);
    }
  });

  it('de api.ts só importa TIPO, nunca função de chamada', () => {
    for (const { nome, texto } of fontes()) {
      const importaApi = /from '@\/lib\/corrigefacil\/api'/.test(texto);
      if (!importaApi) continue;
      // `import type { ... }` é transporte de tipo e some na compilação;
      // um import de valor traria buscarInstrumento/corrigirInstrumento
      expect(texto, nome).toMatch(/import type \{[^}]*\} from '@\/lib\/corrigefacil\/api'/);
      for (const fn of [
        'buscarInstrumento', 'corrigirInstrumento', 'salvarAvaliacao',
        'buscarAvaliacao', 'resolverNormaData',
      ]) {
        expect(texto, `${nome} importa ${fn}`).not.toContain(fn);
      }
    }
  });

  it('nenhum useEffect: não há carregamento próprio', () => {
    for (const { nome, texto } of fontes()) {
      expect(texto, nome).not.toMatch(/useEffect/);
    }
  });
});

describe('17/18 · o que não pode ter voltado', () => {
  it('nenhum cutoff do DCDQ hardcoded', () => {
    for (const { nome, texto } of fontes()) {
      // ignora comentários de referência a seções e números de contrato
      const codigo = texto
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
        .join('\n');
      expect(codigo, nome).not.toMatch(/\b47\b/);
      expect(codigo, nome).not.toMatch(/\b56\b/);
      expect(codigo, nome).not.toMatch(/\b58\b/);
    }
  });

  it('nenhuma menção a visual_context ou snapshot normativo', () => {
    for (const { nome, texto } of fontes()) {
      expect(texto, nome).not.toContain('visual_context');
      expect(texto, nome).not.toContain('VisualContext');
    }
  });
});

describe('o gráfico sobrevive à impressão', () => {
  const GRAFICOS = [
    'ScoreBandChart.tsx', 'StandardizedProfileChart.tsx',
    'DomainProfileChart.tsx', 'CategoricalProfileChart.tsx',
  ];
  const parts = readFileSync(join(DIR, 'parts.tsx'), 'utf8');

  it('o marcador é BORDA e mora num lugar só', () => {
    // borda é pintada mesmo com "background graphics" desligado; o fundo
    // não, e era assim que o marcador sumia do PDF
    expect(parts).toContain('border-l-[3px] border-pp-ink');
    // e a geometria continua saindo do mesmo cálculo
    expect(parts).toContain('calc(${pos * 100}% - 1.5px)');
  });

  it('os quatro usam o marcador central, sem recriar o seu', () => {
    for (const nome of GRAFICOS) {
      const texto = readFileSync(join(DIR, nome), 'utf8');
      expect(texto, nome).toContain('<MarcadorResultado pos={pos} />');
      expect(texto, `${nome}: marcador voltou a depender de fundo`)
        .not.toMatch(/w-\[3px\][^"]*bg-pp-ink/);
      expect(texto, `${nome}: marcador duplicado`)
        .not.toContain('border-l-[3px]');
    }
  });

  /** O corpo de uma função exportada de parts.tsx. As asserções sobre
   *  impressão precisam ser POR PEÇA: a régua e a legenda usam ambas
   *  `seg.atual`, e uma regex solta no arquivo inteiro passava a valer
   *  pela peça errada. */
  function trecho(fonte: string, nome: string): string {
    const i = fonte.indexOf(`export function ${nome}`);
    expect(i, `${nome} não encontrada`).toBeGreaterThan(-1);
    const resto = fonte.slice(i + 1);
    const fim = resto.indexOf('\nexport function ');
    return fim === -1 ? resto : resto.slice(0, fim);
  }

  it('nada essencial depende só de background-color', () => {
    // barras dos perfis: o preenchimento é fundo, então ganha contorno
    for (const nome of ['StandardizedProfileChart.tsx', 'DomainProfileChart.tsx']) {
      const texto = readFileSync(join(DIR, nome), 'utf8');
      expect(texto, nome).toMatch(/bg-pp-ink\/70[^"]*print:border print:border-pp-ink/);
    }

    // ETPC: a categoria atual é fundo lilás na tela, moldura no papel
    const cat = readFileSync(join(DIR, 'CategoricalProfileChart.tsx'), 'utf8');
    expect(cat).toMatch(/bg-pp-block-lilac[^']*print:border-2 print:border-pp-ink/);
  });

  it('no papel, o marcador é a única linha forte da régua', () => {
    const regua = trecho(parts, 'FaixasDaRegua');
    const marcador = trecho(parts, 'MarcadorResultado');
    const legenda = trecho(parts, 'LegendaFaixas');

    // 1 · divisória entre faixas: existe, mas DISCRETA no papel
    expect(regua).toContain('print:border-pp-ink/30');

    // 2 · a faixa atual NÃO ganha moldura dentro da barra — era a quarta
    // linha competindo com o marcador
    expect(regua, 'voltou a caixa dentro da barra').not.toContain('print:border-2');
    expect(regua, 'divisória voltou a tinta cheia').not.toMatch(
      /print:border-pp-ink(?![\w/-])/,
    );

    // 3 · o marcador é o traço forte, em tinta cheia
    expect(marcador).toContain('border-l-[3px] border-pp-ink');

    // 4 · e quem comunica a faixa atingida é o CHIP, com borda forte
    expect(legenda).toContain('print:border-2 print:border-pp-ink');
  });

  it('a legenda também sobrevive ao papel', () => {
    // ESTE teste nasceu de um furo real: as variantes `print:` tinham
    // sido aplicadas à régua e NÃO aos chips da legenda, porque o script
    // que as escreveu abortou no meio e ninguém reconferiu. No papel a
    // faixa atual da legenda ficava com fundo lilás (não pintado) e borda
    // lilás (quase branca) — indistinguível das outras.
    expect(parts).toMatch(
      /seg\.atual[\s\S]{0,200}bg-pp-block-lilac border-pp-block-lilac print:border-2 print:border-pp-ink/,
    );
    expect(parts).toMatch(/border-pp-hairline print:border-pp-ink\/40/);
  });

  it('os chips da legenda têm todos a mesma largura e altura', () => {
    const legenda = trecho(parts, 'LegendaFaixas');

    // grid de colunas iguais: no flex-wrap cada chip media pelo próprio
    // texto, e a régua parecia irregular sem que os dados fossem
    expect(legenda).toMatch(/grid-cols-\[repeat\(auto-fit,minmax\([\d.]+rem,1fr\)\)\]/);
    expect(legenda, 'a legenda voltou ao flex-wrap').not.toContain('flex flex-wrap');

    // o PISO da coluna é o que decide quantas cabem por linha. Acima de
    // 6rem as cinco faixas do DASS-21 deixam de caber numa linha só no
    // cartão de largura inteira — por isso o teto é aqui, e não no olho.
    const piso = /minmax\(([\d.]+)rem,1fr\)/.exec(legenda);
    expect(piso, 'piso da coluna não encontrado').not.toBeNull();
    expect(Number(piso![1]), 'piso alto demais para 5 faixas').toBeLessThanOrEqual(6);

    // no papel a caixa é mais estreita: piso menor ainda
    const noPapel = /print:grid-cols-\[repeat\(auto-fit,minmax\(([\d.]+)rem,1fr\)\)\]/
      .exec(legenda);
    expect(noPapel, 'sem piso próprio para impressão').not.toBeNull();
    expect(Number(noPapel![1])).toBeLessThanOrEqual(5);
  });

  it('o conteúdo do chip é centralizado nos dois eixos', () => {
    const legenda = trecho(parts, 'LegendaFaixas');
    expect(legenda).toContain('items-center');
    expect(legenda).toContain('justify-center');
    expect(legenda).toContain('text-center');
    // e o rótulo longo quebra DENTRO da caixa, sem estourar
    expect(legenda).toContain('break-words');
  });

  it('cartões e réguas não são partidos entre páginas', () => {
    for (const nome of GRAFICOS) {
      const texto = readFileSync(join(DIR, nome), 'utf8');
      expect(texto, nome).toContain('print:break-inside-avoid');
    }
  });

  it('um cartão por linha nos small multiples', () => {
    // duas colunas dentro da coluna de leitura davam ~340px por cartão, e
    // a legenda do DASS-21 não cabia numa linha
    const cat = readFileSync(join(DIR, 'CategoricalProfileChart.tsx'), 'utf8');
    expect(cat, 'voltaram as duas colunas').not.toContain('sm:grid-cols-2');
  });

  it('nenhuma classe print: altera a tela', () => {
    // `print:` só entra em @media print — a garantia é ela nunca aparecer
    // sem o prefixo numa classe que valha para os dois meios
    for (const nome of [...GRAFICOS, 'parts.tsx']) {
      const texto = readFileSync(join(DIR, nome), 'utf8');
      const soltas = texto.match(/(?<!print:)(?<![\w:-])border-pp-ink(?![\w/-])/g) ?? [];
      // as ocorrências legítimas sem prefixo são as do marcador central
      if (nome !== 'parts.tsx') {
        expect(soltas, `${nome}: cor de impressão vazou para a tela`).toHaveLength(0);
      }
    }
  });
});

describe('rótulo curto da legenda', () => {
  const parts = readFileSync(join(DIR, 'parts.tsx'), 'utf8');

  it('encurta por tabela EXATA, nunca por heurística', () => {
    // os três rótulos do CES-D, escritos por extenso: é correspondência
    // exata, então rótulo que não casar aparece inteiro
    expect(parts).toContain("'BAIXA probabilidade de depressão': 'BAIXA'");
    expect(parts).toContain("'Probabilidade MODERADA de depressão': 'MODERADA'");
    expect(parts).toContain("'ALTA probabilidade de depressão': 'ALTA'");

    // nada de cortar string, pegar maiúsculas ou dividir no espaço —
    // acertaria no CES-D e erraria calado em outro instrumento
    expect(parts).not.toMatch(/\.slice\(/);
    expect(parts).not.toMatch(/\.substring\(/);
    expect(parts).not.toMatch(/\.split\(/);
    expect(parts).not.toMatch(/toUpperCase\(/);
    expect(parts).not.toMatch(/\.match\(/);
  });

  it('o rótulo completo continua acessível', () => {
    // sr-only com o rótulo do servidor onde a tela mostra a forma curta
    expect(parts).toContain('className="sr-only">{seg.rotulo}');
    // e a descrição da régua continua montada a partir do rótulo inteiro
    const band = readFileSync(join(DIR, 'ScoreBandChart.tsx'), 'utf8');
    expect(band).toContain('descreverSegmento');
  });

  it('o encurtamento é escopado por instrumento', () => {
    // sem instrumento, ou instrumento fora da tabela, nada é encurtado
    expect(parts).toContain('if (!instrumento) return rotulo;');
    expect(parts).toContain('ROTULO_CURTO[instrumento]?.[rotulo] ?? rotulo');
  });
});

describe('excedente é dito, nunca truncado em silêncio', () => {
  it('os dois gráficos com eixo numérico marcam o excedente', () => {
    // `posicao()` prende o marcador na borda do eixo. Isso é desenho, e
    // só é honesto porque a marca de excedente aparece ao lado. Um
    // gráfico que recebe range mas não renderiza <Excedente> esconde
    // exatamente o caso extremo — foi o que aconteceu com o ScoreBand
    // até o TDF, primeiro instrumento de eixo ABERTO nessa família.
    for (const nome of ['ScoreBandChart.tsx', 'StandardizedProfileChart.tsx']) {
      const texto = readFileSync(join(DIR, nome), 'utf8');
      expect(texto, nome).toContain('p.excedente');
      expect(texto, nome).toContain('<Excedente');
    }
  });
});

describe('20 · o resultado textual continua na tela', () => {
  const tela = readFileSync(TELA, 'utf8');

  it('o card textual por escala não foi removido', () => {
    // as EXPRESSÕES de valor, não os rótulos: é o que prova que o dado
    // chega à tela, e não muda quando o layout muda.
    //
    // `raw` e `score` passam por `metricasDaEscala`, que só dá NOME às duas
    // e devolve o número — é lá que o SNAP-IV-26 vira "Pontuação bruta" e
    // "Sintomas presentes", e onde todos os outros continuam "bruto" e
    // "escore". A guarda segue o caminho do dado até a tela.
    expect(tela).toContain(
      'metricasDaEscala(detalhe.code, escala, r.raw, r.score)',
    );
    // o bruto continua nomeado e escrito no cabeçalho do card
    expect(tela).toContain('{met.bruto.rotulo}');
    expect(tela).toContain('{met.bruto.texto}');

    // As DEMAIS medidas viraram colunas de um bloco só, e quem as monta é
    // `celulasDoResultado`. O caminho do dado ganhou um passo — a guarda
    // segue por ele em vez de sumir: escore, percentil, z e IC95% saem de
    // lá, e é lá que `textoDePercentil` escreve o "< 1" da primeira faixa
    // do BPA-2.
    expect(tela).toContain('celulasDoResultado(detalhe.code, escala, r)');
    expect(tela).toContain('metricas={celulas.metricas}');
    expect(tela).toContain('classificacao={celulas.classificacao}');

    const celulas = readFileSync(
      join(process.cwd(), 'src/lib/corrigefacil/resultado-celulas.ts'),
      'utf8',
    );
    expect(celulas).toContain('textoDePercentil(code, r)');
    expect(celulas).toContain('met.escore.rotulo');
    expect(celulas).toContain('met.escore.texto');
    expect(celulas).toContain("celula('percentil', percentil)");
    // z passa pelo MESMO formatador de duas casas que o FDT já usa — não
    // pelo número cru (`String(r.z)` era o bug: dez casas decimais na tela)
    expect(celulas).toContain("import { zFormatado } from './fdt-derivado'");
    expect(celulas).toContain('const zTexto = zFormatado(r.z)');
    expect(celulas).toContain("celula('z', zTexto)");
    expect(celulas).toContain('r.ci95');
    expect(celulas).toContain('r.classification');

    // o que continua sendo desenhado pelo próprio card
    expect(tela).toContain("{r.message ?? 'Resultado indisponível.'}");
    expect(tela).toContain('{r.flags.join');
    // os nomes PADRÃO, que valem para os 20 instrumentos sem métrica
    // própria, moram no módulo — e continuam sendo os de sempre
    const metricas = readFileSync(
      join(process.cwd(), 'src/lib/corrigefacil/metricas-instrumento.ts'),
      'utf8',
    );
    expect(metricas).toContain("'bruto'");
    expect(metricas).toContain("'escore'");
  });

  it('o gráfico entra ENTRE o resultado e o salvamento', () => {
    const iResultado = tela.indexOf('{r.flags.length > 0');
    const iGrafico = tela.indexOf('<ResultGraph');
    const iSalvar = tela.indexOf('Salvar sem relatório');
    expect(iResultado).toBeGreaterThan(-1);
    expect(iGrafico).toBeGreaterThan(iResultado);
    expect(iSalvar).toBeGreaterThan(iGrafico);
  });

  // A LISTA e o DETALHE do histórico continuam sem gráfico, e o motivo é
  // psicométrico: ali o resultado é congelado e as faixas viriam do catálogo
  // de hoje, sem nada que prove que são as mesmas que classificaram aquele
  // escore. O DOCUMENTO do relatório é a exceção deliberada do Bloco 7C —
  // ele compõe o mesmo gráfico aprovado, mas só depois de provar coerência,
  // e desiste em silêncio quando não pode provar. Sem essa prova a exceção
  // viraria exatamente o furo que esta guarda existe para impedir, e é por
  // isso que a prova é verificada logo abaixo.
  it('a lista e o detalhe do histórico continuam sem gráfico', () => {
    const hist = join(process.cwd(), 'src/app/app/corrigefacil/avaliacoes');
    const arquivos = readdirSync(hist, { recursive: true }) as string[];
    for (const f of arquivos) {
      if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
      if (f.replace(/\\/g, '/').includes('/relatorios/')) continue;
      const texto = readFileSync(join(hist, f), 'utf8');
      expect(texto, f).not.toContain('ResultGraph');
    }
  });

  it('o documento só desenha o gráfico atrás da guarda de coerência', () => {
    const ilha = readFileSync(
      join(
        process.cwd(),
        'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]/ReportGraphIsland.tsx',
      ),
      'utf8',
    );

    const iGuarda = ilha.indexOf('faixasDivergemDoResultado(detalhe, resposta)');
    const iGrafico = ilha.indexOf('<ResultGraph');
    expect(iGuarda).toBeGreaterThan(-1);
    expect(iGrafico).toBeGreaterThan(iGuarda);
    expect(ilha).toMatch(/faixasDivergemDoResultado\([^)]*\)\)\s*return null;/);
  });
});
