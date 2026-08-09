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

  it('nada essencial depende só de background-color', () => {
    // faixas: a divisória e o destaque da faixa atual existem como borda
    expect(parts).toContain('print:border-pp-ink');
    expect(parts).toMatch(/seg\.atual[\s\S]{0,120}print:border-2 print:border-pp-ink/);

    // barras dos perfis: o preenchimento é fundo, então ganha contorno
    for (const nome of ['StandardizedProfileChart.tsx', 'DomainProfileChart.tsx']) {
      const texto = readFileSync(join(DIR, nome), 'utf8');
      expect(texto, nome).toMatch(/bg-pp-ink\/70[^"]*print:border print:border-pp-ink/);
    }

    // ETPC: a categoria atual é fundo lilás na tela, moldura no papel
    const cat = readFileSync(join(DIR, 'CategoricalProfileChart.tsx'), 'utf8');
    expect(cat).toMatch(/bg-pp-block-lilac[^']*print:border-2 print:border-pp-ink/);
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
    // grid de colunas iguais: no flex-wrap cada chip media pelo próprio
    // texto, e a régua parecia irregular sem que os dados fossem
    expect(parts).toContain('grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]');
    expect(parts, 'a legenda voltou ao flex-wrap').not.toContain(
      '<ul className="flex flex-wrap gap-2">',
    );
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

describe('20 · o resultado textual continua na tela', () => {
  const tela = readFileSync(TELA, 'utf8');

  it('o card textual por escala não foi removido', () => {
    // as EXPRESSÕES de valor, não os rótulos: é o que prova que o dado
    // chega à tela, e não muda quando o layout muda
    expect(tela).toContain('{r.score}');
    expect(tela).toContain('{r.percentile}');
    expect(tela).toContain('{r.z}');
    expect(tela).toContain('{r.ci95}');
    expect(tela).toContain('{r.classification}');
    expect(tela).toContain('{r.raw}');
    expect(tela).toContain("{r.message ?? 'Resultado indisponível.'}");
    expect(tela).toContain('{r.flags.join');
    // e os rótulos continuam nomeando cada número
    for (const rotulo of ['escore', 'percentil', 'classificação']) {
      expect(tela, rotulo).toContain(rotulo);
    }
  });

  it('o gráfico entra ENTRE o resultado e o salvamento', () => {
    const iResultado = tela.indexOf('{r.flags.length > 0');
    const iGrafico = tela.indexOf('<ResultGraph');
    const iSalvar = tela.indexOf('Salvar esta avaliação');
    expect(iResultado).toBeGreaterThan(-1);
    expect(iGrafico).toBeGreaterThan(iResultado);
    expect(iSalvar).toBeGreaterThan(iGrafico);
  });

  it('a tela do histórico não foi tocada pelo gráfico', () => {
    const hist = join(process.cwd(), 'src/app/app/corrigefacil/avaliacoes');
    const arquivos = readdirSync(hist, { recursive: true }) as string[];
    for (const f of arquivos) {
      if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
      const texto = readFileSync(join(hist, f), 'utf8');
      expect(texto, f).not.toContain('ResultGraph');
    }
  });
});
