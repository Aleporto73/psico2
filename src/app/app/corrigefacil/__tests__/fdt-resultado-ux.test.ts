// =====================================================================
// FDT · A UX DO RESULTADO NA TELA · Fase 1.
//
// Duas coisas entraram: as QUATRO COLUNAS ESTÁVEIS dos dados técnicos e os
// DOIS DESENHOS que releem cada bloco. Este arquivo guarda as duas, e
// guarda sobretudo o que elas NÃO podem virar.
//
// A TRAVA CENTRAL, e é a razão de o Perfil executivo ter o desenho que
// tem: O FDT NÃO TEM PERCENTIL PONTUAL. `assessment_results.percentile`
// sai nulo nas dez medidas — o carregador do FDT grava os pontos
// empíricos em `norm_entries.extra` e nunca escreve a coluna `percentile`
// —, e a fórmula de interpolação da fonte está registrada como
// `used_in_runtime: false` porque discorda da régua de classificação nas
// fronteiras.
//
// Logo o Perfil executivo é ORDINAL: cinco degraus, que são as cinco
// classificações que o servidor nomeou. Não é percentil, não tem eixo de
// 0 a 100 e não nasce do z.
//
// POR QUE O z NÃO POSICIONA NADA, apesar de existir e de ser do servidor:
// ele vem de média e desvio, e a classificação vem dos pontos empíricos da
// faixa etária. São duas réguas sobre o mesmo bruto, e elas se cruzam — na
// faixa de 13 a 15 anos uma Inibição "Média superior" tem z MAIOR que uma
// Leitura "Muito superior". Barra por z desenharia a segunda menor que a
// primeira, contradizendo o rótulo ao lado dela.
//
// COMO SE TESTA SEM DOM: o Vitest deste repositório roda em `node`. O que
// é modelo — ordem, posição, comprimento, ausência — é função pura e se
// testa direto; o que é desenho se verifica por varredura do JSX.
// =====================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DerivadoFdt, ResultadoEscala } from '@/lib/corrigefacil/api';
import {
  blocosFdt,
  COLUNAS_FDT,
  colunasDaLinhaFdt,
  degrauDaClassificacao,
  errosPorTarefaFdt,
  fracaoDoTick,
  MEDIDAS_ERRO,
  MEDIDAS_TEMPO,
  NOTA_PERFIL,
  ORDEM_CLASSIFICACAO_TEMPO,
  perfilExecutivoFdt,
  SEM_VALOR,
  TITULO_ERRO,
  TITULO_TEMPO,
  TOM_NEUTRO,
  tomDaClassificacao,
} from '@/lib/corrigefacil/fdt-derivado';

function leia(...partes: string[]): string {
  // LF sempre: o repositório é editado no Windows e clonado no Linux, e um
  // teste que dependa do CRLF passaria numa máquina e falharia na outra.
  return readFileSync(join(process.cwd(), ...partes), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const COMPONENTE = leia('src', 'app', 'app', 'corrigefacil', 'FdtDerivado.tsx');
const GRAFICOS = leia('src', 'app', 'app', 'corrigefacil', 'FdtGraficos.tsx');
const MODELO = leia('src', 'lib', 'corrigefacil', 'fdt-derivado.ts');
const AVALIAR = leia(
  'src', 'app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx',
);
const DETALHE = leia(
  'src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'DetalheClient.tsx',
);
const DOCUMENTO = leia(
  'src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
  '[reportId]', 'RelatorioDocumentClient.tsx',
);
const GRAPH_CONFIG = leia(
  'src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts',
);

/** As fontes NOVAS e a que elas alimentam. As varreduras de "o cliente não
 *  calcula" valem para as três. */
const FONTES = [MODELO, COMPONENTE, GRAFICOS];

/** O código sem comentários: as travas são sobre o que EXECUTA, e a
 *  documentação deste produto cita nomes de propósito. */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

// ── fixtures · uma avaliação como a Edge devolve ────────────────────────

function res(raw: number | null, z: number | null = null): ResultadoEscala {
  return {
    raw,
    score: null,
    // O FDT NÃO TEM PERCENTIL. É assim que ele chega do servidor, e é por
    // isso que o gráfico não pode ser de percentil.
    percentile: null,
    z,
    classification: null,
    available: true,
    message: null,
    flags: [],
  };
}

const DERIVADO: DerivadoFdt = {
  medidas: {
    T_LEITURA: { bruto: 16, faixa_percentilica: '> P95', classificacao: 'Muito superior' },
    T_CONTAGEM: { bruto: 28, faixa_percentilica: 'P25 a P75', classificacao: 'Média' },
    T_ESCOLHA: { bruto: 60, faixa_percentilica: 'P5 a P25', classificacao: 'Média inferior' },
    T_ALTERNANCIA: { bruto: 90, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
    INIBICAO: { bruto: 10, faixa_percentilica: 'P75 a P95', classificacao: 'Média superior' },
    FLEXIBILIDADE: { bruto: 32, faixa_percentilica: 'P25 a P75', classificacao: 'Média' },
    E_LEITURA: { bruto: 1, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
    E_CONTAGEM: { bruto: 2, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
    E_ESCOLHA: { bruto: 3, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
    E_ALTERNANCIA: { bruto: 1, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
  },
  derivadas: { INIBICAO: true, FLEXIBILIDADE: true },
};

const RESULTADOS: Record<string, ResultadoEscala> = {
  T_LEITURA: res(16, 1.404),
  T_CONTAGEM: res(28, 0.27),
  T_ESCOLHA: res(60, -1.09),
  T_ALTERNANCIA: res(90, -2.17),
  INIBICAO: res(10, 1.533),
  FLEXIBILIDADE: res(32, 0.12),
  // E_LEITURA sem z é o caso REAL: onde a norma tem DP zero — e é o que
  // acontece com a Leitura em várias faixas etárias — não há z nenhum.
  E_LEITURA: res(1, null),
  E_CONTAGEM: res(2, -3.6),
  E_ESCOLHA: res(3, -2.1),
  E_ALTERNANCIA: res(1, -1.2),
};

const BLOCOS = blocosFdt('FDT', DERIVADO, RESULTADOS)!;
const TEMPO = BLOCOS.find((b) => b.titulo === TITULO_TEMPO)!;
const ERROS = BLOCOS.find((b) => b.titulo === TITULO_ERRO)!;

// =====================================================================
// 18 · ALINHAMENTO — as quatro colunas não saem do lugar
// =====================================================================

describe('18 · FDT · quatro colunas estáveis', () => {
  it('1 · o bloco de tempo tem a ordem fixa nas seis medidas', () => {
    expect(TEMPO.linhas).toHaveLength(6);
    for (const linha of TEMPO.linhas) {
      expect(colunasDaLinhaFdt(linha).map((c) => c.rotulo)).toEqual([
        'bruto',
        'z',
        'faixa percentílica',
        'classificação',
      ]);
    }
  });

  it('2 · o bloco de erros tem EXATAMENTE a mesma ordem', () => {
    expect(ERROS.linhas).toHaveLength(4);
    for (const linha of ERROS.linhas) {
      expect(colunasDaLinhaFdt(linha).map((c) => c.rotulo)).toEqual([
        ...COLUNAS_FDT,
      ]);
    }
  });

  it('3 · E_LEITURA sem z mostra o travessão e NÃO cria z zero', () => {
    const leitura = ERROS.linhas.find((l) => l.code === 'E_LEITURA')!;
    const colunas = colunasDaLinhaFdt(leitura);

    expect(colunas[1]).toEqual({ rotulo: 'z', texto: SEM_VALOR, ausente: true });
    // o buraco não virou número em nenhuma das formas tentadoras
    for (const inventado of ['0', '0,00', '0.00', 'n/c']) {
      expect(colunas[1].texto).not.toBe(inventado);
    }
    // e o DADO continua null: o travessão é tinta, não conteúdo
    expect(leitura.z).toBeNull();
    // o resto da linha continua sendo o que o servidor mandou
    expect(colunas[0].texto).toBe('1');
    expect(colunas[3].texto).toBe('Deficitário');
  });

  it('4 · a linha seguinte não desloca a classificação', () => {
    // é a regressão que originou o item: sem z, a faixa subia para a
    // posição do z e a classificação para a posição da faixa
    const comZ = colunasDaLinhaFdt(ERROS.linhas[1]);
    const semZ = colunasDaLinhaFdt(ERROS.linhas[0]);

    expect(semZ.map((c) => c.rotulo)).toEqual(comZ.map((c) => c.rotulo));
    // a classificação é o índice 3 nas DUAS, e nas dez medidas
    for (const bloco of BLOCOS) {
      for (const linha of bloco.linhas) {
        const colunas = colunasDaLinhaFdt(linha);
        expect(colunas).toHaveLength(4);
        expect(colunas[3].rotulo).toBe('classificação');
      }
    }
  });

  it('5 · o mobile quebra em vez de espremer, e nada estoura a largura', () => {
    // no celular são duas colunas para os números e largura inteira para
    // os dois textos longos; `minmax(0, …)` é o que impede a coluna de
    // crescer além do contêiner e criar rolagem horizontal
    expect(COMPONENTE).toContain('grid-cols-2');
    expect(COMPONENTE).toContain('col-span-2 sm:col-span-1');
    expect(COMPONENTE).toContain('minmax(0,1fr)');
    expect(COMPONENTE).toContain('minmax(0,13rem)');
    expect(COMPONENTE).toContain('break-words');
    expect(COMPONENTE).toContain('min-w-0');

    for (const fonte of [COMPONENTE, GRAFICOS]) {
      // largura rígida em pixel é exatamente o que quebra o rótulo longo
      expect(fonte).not.toMatch(/w-\[\d+px\]/);
      // e nada corta ou empurra o texto para fora
      expect(fonte).not.toContain('whitespace-nowrap');
      expect(fonte).not.toContain('overflow-x');
    }
    // os cinco rótulos do eixo cabem quebrando dentro da própria célula
    expect(GRAFICOS).toContain('grid-cols-5');
    expect(GRAFICOS).toContain('break-words');
  });

  it('6 · `ResultadoMetricas` genérico não mudou, byte a byte', () => {
    // Os outros 20 instrumentos NÃO são alvo desta fase. O FDT ganhou
    // apresentação própria justamente para não mexer aqui.
    //
    // Se este teste falhar depois de uma mudança DELIBERADA no bloco
    // genérico, recalcule o sha256 do arquivo (com quebras LF) e troque a
    // constante — a falha existe para a mudança ser consciente, não para
    // impedi-la para sempre.
    const atual = createHash('sha256')
      .update(leia('src', 'app', 'app', 'corrigefacil', 'ResultadoMetricas.tsx'))
      .digest('hex');
    expect(atual).toBe(
      'd555ad603ef315d0abb912660e674ab5d2b5560cc3243b9f26be285f446d159a',
    );
  });
});

// =====================================================================
// 19 · PERFIL EXECUTIVO — ordinal, e nada além disso
// =====================================================================

describe('19 · FDT · Perfil executivo', () => {
  const perfil = perfilExecutivoFdt(BLOCOS)!;

  it('7 · a ordem é a do controlador, e não a do resultado', () => {
    expect(perfil.map((m) => m.nome)).toEqual([
      'Leitura',
      'Contagem',
      'Escolha',
      'Alternância',
      'Inibição',
      'Flexibilidade',
    ]);
    // e é a mesma ordem do mapa de medidas, não uma segunda lista
    expect(perfil.map((m) => m.code)).toEqual(MEDIDAS_TEMPO.map(([c]) => c));
  });

  it('a régua tem CINCO degraus, do menor para o maior', () => {
    expect([...ORDEM_CLASSIFICACAO_TEMPO]).toEqual([
      'Deficitário',
      'Média inferior',
      'Média',
      'Média superior',
      'Muito superior',
    ]);
    // a posição sai da classificação do servidor, e de mais nada
    expect(degrauDaClassificacao('Deficitário')).toBe(0);
    expect(degrauDaClassificacao('Muito superior')).toBe(4);
    const leitura = perfil.find((m) => m.code === 'T_LEITURA')!;
    expect(leitura.degrau).toBe(4);
    expect(leitura.classificacao).toBe('Muito superior');
  });

  it('duas medidas na mesma classificação ocupam a MESMA posição', () => {
    // Contagem e Flexibilidade saíram as duas "Média". Diferenciá-las
    // exigiria uma precisão que o dado não tem.
    const contagem = perfil.find((m) => m.code === 'T_CONTAGEM')!;
    const flex = perfil.find((m) => m.code === 'FLEXIBILIDADE')!;
    expect(contagem.classificacao).toBe(flex.classificacao);
    expect(contagem.degrau).toBe(flex.degrau);
  });

  it('8 · não se calcula percentil no browser', () => {
    for (const fonte of FONTES) {
      const codigo = semComentarios(fonte);
      // nenhuma aproximação normal, em nenhuma das formas conhecidas
      expect(codigo).not.toMatch(/\berf\b/i);
      expect(codigo).not.toMatch(/normal(cdf|_cdf|Cdf)/i);
      expect(codigo).not.toMatch(/\bcdf\b/i);
      expect(codigo).not.toMatch(/Math\.(exp|log|sqrt|pow)\b/);
      // e nenhum campo de percentil é lido para desenhar
      expect(codigo).not.toContain('.percentile');
      expect(codigo).not.toContain('percentil_interpolado');
    }
  });

  it('9 · o `source_only` da controladora não é lido no runtime', () => {
    for (const fonte of FONTES) {
      expect(fonte).not.toContain('source_only');
      expect(fonte).not.toContain('percentile_interpolation');
      expect(fonte).not.toContain('used_in_runtime');
    }
  });

  it('10 · nenhum ponto de corte é reconstruído no cliente', () => {
    for (const fonte of FONTES) {
      const codigo = semComentarios(fonte);
      expect(codigo).not.toMatch(/\bP(95|75|50|25|5)\b/);
    }
    // os cortes são norma e moram no banco: nem o tipo os transporta
    expect(leia('src', 'lib', 'corrigefacil', 'api.ts')).not.toContain(
      'P95',
    );
  });

  it('11 · não existe meio de faixa inventado', () => {
    for (const fonte of FONTES) {
      const codigo = semComentarios(fonte);
      expect(codigo).not.toMatch(/\bmidpoint\b|\bmeio_?da_?faixa\b/i);
      // a marca do "97/95/75/25/3" da interpolação antiga
      expect(codigo).not.toMatch(/\b(97|3)\s*[,)]\s*$/m);
    }
    // a posição é índice inteiro numa lista de cinco, e nada mais
    for (const m of perfilExecutivoFdt(BLOCOS)!) {
      if (m.degrau === null) continue;
      expect(Number.isInteger(m.degrau)).toBe(true);
      expect(m.degrau).toBeGreaterThanOrEqual(0);
      expect(m.degrau).toBeLessThan(ORDEM_CLASSIFICACAO_TEMPO.length);
    }
  });

  it('12 · a posição não é reclassificada a partir do z', () => {
    // A PROVA: o mesmo z, com classificações diferentes, dá degraus
    // diferentes; e classificações iguais com z diferente dão o mesmo
    // degrau. Quem manda é o rótulo do servidor.
    expect(degrauDaClassificacao('Média')).toBe(2);
    expect(degrauDaClassificacao('Muito superior')).toBe(4);

    // o contraexemplo real da faixa 13–15: a Inibição "Média superior" tem
    // z MAIOR que a Leitura "Muito superior", e mesmo assim fica ABAIXO
    const inib = perfil.find((m) => m.code === 'INIBICAO')!;
    const leitura = perfil.find((m) => m.code === 'T_LEITURA')!;
    expect(RESULTADOS.INIBICAO.z!).toBeGreaterThan(RESULTADOS.T_LEITURA.z!);
    expect(inib.degrau!).toBeLessThan(leitura.degrau!);

    // e nenhuma fonte deriva posição de z
    for (const fonte of FONTES) {
      const codigo = semComentarios(fonte);
      expect(codigo).not.toMatch(/\bmean\b|\bmedia\b|\bsd\b|\bdp\b/i);
      expect(codigo).not.toMatch(/z\s*[*/+]/);
      expect(codigo).not.toMatch(/\.z\b[^)]*\*/);
    }
    // o desenho do perfil não toca no campo z
    expect(semComentarios(GRAFICOS)).not.toMatch(/\bz\b/);
  });

  it('13 · medida sem classificação não vira barra zero', () => {
    const semClasse = blocosFdt(
      'FDT',
      {
        ...DERIVADO,
        medidas: {
          ...DERIVADO.medidas,
          T_ESCOLHA: { bruto: 60, faixa_percentilica: null, classificacao: null },
        },
      },
      RESULTADOS,
    );
    const escolha = perfilExecutivoFdt(semClasse)!.find(
      (m) => m.code === 'T_ESCOLHA',
    )!;
    // null, e não 0 — degrau 0 é "Deficitário", que é um RESULTADO
    expect(escolha.degrau).toBeNull();
    expect(escolha.degrau).not.toBe(0);
    // rótulo desconhecido tampouco recebe posição
    expect(degrauDaClassificacao('Categoria que não existe')).toBeNull();
    expect(degrauDaClassificacao(null)).toBeNull();
    expect(degrauDaClassificacao('')).toBeNull();
    // e o desenho diz a ausência por escrito, em vez de desenhar barra
    expect(GRAFICOS).toContain('não recebe barra');
    expect(GRAFICOS).toContain('m.degrau === null');
  });

  it('o eixo é de PALAVRAS: não existe 0–25–50–75–100 na tela', () => {
    // só a parte do Perfil executivo: o gráfico de erros logo abaixo usa
    // `fracao * 100` para virar largura em CSS, que é geometria e não eixo
    const perfilJsx = semComentarios(
      GRAFICOS.slice(0, GRAFICOS.indexOf('export function ErrosPorTarefaFdt')),
    );
    // nenhuma âncora percentílica vira número na tela
    expect(perfilJsx).not.toMatch(/\b(25|50|75|100)\b/);
    // o eixo é a própria lista de classificações
    expect(perfilJsx).toContain('ORDEM_CLASSIFICACAO_TEMPO.map');
    // e a palavra percentil não nomeia esta posição em lugar nenhum
    expect(semComentarios(GRAFICOS)).not.toMatch(/percentil/i);
  });

  it('sem nenhuma classificação, não há cartão nenhum', () => {
    const nenhuma = blocosFdt(
      'FDT',
      {
        medidas: Object.fromEntries(
          MEDIDAS_TEMPO.map(([c]) => [
            c,
            { bruto: 1, faixa_percentilica: null, classificacao: null },
          ]),
        ),
        derivadas: { INIBICAO: true, FLEXIBILIDADE: true },
      },
      RESULTADOS,
    );
    expect(perfilExecutivoFdt(nenhuma)).toBeNull();
    expect(perfilExecutivoFdt(null)).toBeNull();
  });
});

// =====================================================================
// 19 · ERROS POR TAREFA — a contagem, que é dado do servidor
// =====================================================================

describe('19 · FDT · Erros por tarefa', () => {
  const grafico = errosPorTarefaFdt(BLOCOS)!;

  it('14 · a ordem é a do controlador', () => {
    expect(grafico.barras.map((b) => b.nome)).toEqual([
      'Leitura',
      'Contagem',
      'Escolha',
      'Alternância',
    ]);
    expect(grafico.barras.map((b) => b.code)).toEqual(
      MEDIDAS_ERRO.map(([c]) => c),
    );
  });

  it('17 · a barra usa o bruto, não o z', () => {
    // o topo do eixo é a maior CONTAGEM presente — 3, do E_ESCOLHA
    expect(grafico.topo).toBe(3);
    const escolha = grafico.barras.find((b) => b.code === 'E_ESCOLHA')!;
    expect(escolha.bruto).toBe(3);
    expect(escolha.fracao).toBe(1);
    // se fosse z, o E_CONTAGEM (z −3,6, o mais extremo) lideraria
    const contagem = grafico.barras.find((b) => b.code === 'E_CONTAGEM')!;
    expect(contagem.fracao!).toBeLessThan(escolha.fracao!);
  });

  it('16 · 1 < 2 < 3 em comprimento, no mesmo resultado', () => {
    const de = (code: string) =>
      grafico.barras.find((b) => b.code === code)!.fracao!;
    expect(de('E_LEITURA')).toBeLessThan(de('E_CONTAGEM'));
    expect(de('E_CONTAGEM')).toBeLessThan(de('E_ESCOLHA'));
    // e a proporção é a da contagem: 1, 2 e 3 sobre o topo 3
    expect(de('E_LEITURA')).toBeCloseTo(1 / 3, 10);
    expect(de('E_CONTAGEM')).toBeCloseTo(2 / 3, 10);
    // contagens iguais dão comprimentos iguais
    expect(de('E_ALTERNANCIA')).toBe(de('E_LEITURA'));
  });

  it('15 · contagem zero é barra de comprimento zero E valor real 0', () => {
    const zerado = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        {
          ...DERIVADO,
          medidas: {
            ...DERIVADO.medidas,
            E_LEITURA: { bruto: 0, faixa_percentilica: '≥ P25', classificacao: 'Média' },
          },
        },
        { ...RESULTADOS, E_LEITURA: res(0, null) },
      ),
    )!;
    const leitura = zerado.barras.find((b) => b.code === 'E_LEITURA')!;

    expect(leitura.fracao).toBe(0);
    // aqui zero é DADO, não ausência: o número continua sendo mostrado
    expect(leitura.bruto).toBe(0);
    expect(leitura.bruto).not.toBeNull();
    // e ausência de verdade é outra coisa: não recebe barra
    const semBruto = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        { ...DERIVADO, medidas: { ...DERIVADO.medidas } },
        { ...RESULTADOS, E_LEITURA: { ...res(null, null), available: false, message: 'Sem norma.' } },
      ),
    )!;
    const ausente = semBruto.barras.find((b) => b.code === 'E_LEITURA')!;
    expect(ausente.fracao).toBeNull();
  });

  it('o eixo começa em zero, com marcas inteiras', () => {
    expect(grafico.ticks[0]).toBe(0);
    expect(grafico.ticks[grafico.ticks.length - 1]).toBe(grafico.topo);
    for (const t of grafico.ticks) expect(Number.isInteger(t)).toBe(true);

    // protocolo sem nenhum erro não divide por zero nem some com o eixo
    const todosZero = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        {
          medidas: Object.fromEntries(
            MEDIDAS_ERRO.map(([c]) => [
              c,
              { bruto: 0, faixa_percentilica: '≥ P25', classificacao: 'Média' },
            ]),
          ),
          derivadas: {},
        },
        Object.fromEntries(MEDIDAS_ERRO.map(([c]) => [c, res(0, null)])),
      ),
    )!;
    expect(todosZero.topo).toBe(1);
    expect(todosZero.barras.every((b) => b.fracao === 0)).toBe(true);
    expect(todosZero.barras.every((b) => b.bruto === 0)).toBe(true);
  });

  it('a marca do eixo cai na fração dela — topo 7 põe o 4 em 57,14%, não em 50%', () => {
    // A REGRESSÃO: as marcas eram distribuídas em espaços iguais, o que
    // supõe que elas são equidistantes. Com topo ímpar elas não são.
    const topo = 7;
    const eixo = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        {
          medidas: {
            E_LEITURA: { bruto: 7, faixa_percentilica: null, classificacao: 'Deficitário' },
            E_CONTAGEM: { bruto: 4, faixa_percentilica: null, classificacao: 'Média inferior' },
          },
          derivadas: {},
        },
        { E_LEITURA: res(7, null), E_CONTAGEM: res(4, null) },
      ),
    )!;
    expect(eixo.topo).toBe(topo);
    expect(eixo.ticks).toEqual([0, 4, 7]);

    // a marca do meio NÃO fica na metade
    expect(fracaoDoTick(4, topo)).not.toBe(0.5);
    expect(fracaoDoTick(4, topo)).toBeCloseTo(0.5714285714, 9);
    expect(fracaoDoTick(0, topo)).toBe(0);
    expect(fracaoDoTick(7, topo)).toBe(1);

    // E O PONTO: a marca cai exatamente onde a barra daquele valor
    // termina. Uma régua cuja marca não marca a barra é pior que nenhuma.
    const barra4 = eixo.barras.find((b) => b.code === 'E_CONTAGEM')!;
    expect(barra4.fracao).toBe(fracaoDoTick(4, topo));
    const barra7 = eixo.barras.find((b) => b.code === 'E_LEITURA')!;
    expect(barra7.fracao).toBe(fracaoDoTick(7, topo));

    // o desenho usa a função, e não mais espaços iguais
    expect(GRAFICOS).toContain('fracaoDoTick(t, dados.topo)');
    expect(GRAFICOS).not.toContain('justify-between text-[11px]');
  });

  it('a marca e a barra concordam em todo topo, par ou ímpar', () => {
    // o erro só aparecia com topo ímpar acima de seis, o que o tornava
    // fácil de não notar: em topo 8 espaço igual e fração coincidem
    for (const topo of [1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 25]) {
      const eixo = errosPorTarefaFdt(
        blocosFdt(
          'FDT',
          {
            medidas: {
              E_LEITURA: { bruto: topo, faixa_percentilica: null, classificacao: 'Média' },
            },
            derivadas: {},
          },
          { E_LEITURA: res(topo, null) },
        ),
      )!;
      expect(eixo.topo).toBe(topo);
      for (const t of eixo.ticks) {
        const f = fracaoDoTick(t, topo);
        expect(f).toBeCloseTo(t / topo, 12);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
    // topo inválido não devolve Infinity para dentro do estilo
    expect(fracaoDoTick(3, 0)).toBe(0);
    expect(fracaoDoTick(3, Number.NaN)).toBe(0);
  });

  it('18 · a classificação vem do servidor e não é recalculada', () => {
    for (const b of grafico.barras) {
      expect(b.classificacao).toBe(
        DERIVADO.medidas[b.code].classificacao,
      );
    }
    // o tom sai do MAPA, pela classificação — nunca de um hex escolhido
    // dentro do componente nem de uma paleta paralela
    expect(GRAFICOS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(GRAFICOS).not.toMatch(/\b(rgb|hsl|oklch)\(/);
    expect(GRAFICOS).not.toMatch(/text-red|bg-red|bg-amber|bg-green|bg-yellow/);
    expect(GRAFICOS).toContain('tomDaClassificacao(b.classificacao)');
  });
});

// =====================================================================
// O TOM PASTEL — a cor entrou para a faixa ativa ser identificada de
// relance. Ela ACOMPANHA a classificação; não mede, não posiciona e não
// encurta nada.
// =====================================================================

describe('cor por classificação · o mesmo mapa nos dois gráficos', () => {
  it('cada uma das cinco classificações tem seu tom, e são distintos', () => {
    const tons = ORDEM_CLASSIFICACAO_TEMPO.map((c) => tomDaClassificacao(c)!);
    expect(tons.every((t) => t !== null)).toBe(true);
    // cinco fundos diferentes: dois degraus com o mesmo pastel não seriam
    // distinguíveis, que é justamente o que este polimento veio resolver
    expect(new Set(tons.map((t) => t.fundo)).size).toBe(5);
  });

  it('o tom vem de TOKEN do produto, nunca de hex solto', () => {
    for (const c of ORDEM_CLASSIFICACAO_TEMPO) {
      const tom = tomDaClassificacao(c)!;
      expect(tom.fundo).toMatch(/^bg-pp-/);
      expect(tom.borda).toMatch(/^border-pp-/);
    }
    // e os tokens existem mesmo em globals.css
    const globals = leia('src', 'app', 'globals.css');
    for (const c of ORDEM_CLASSIFICACAO_TEMPO) {
      const nome = tomDaClassificacao(c)!.fundo.replace('bg-', '--color-');
      expect(globals).toContain(nome);
    }
    // nenhum token global foi criado ou alterado para isto
    expect(globals).not.toContain('fdt');
    expect(globals).not.toContain('FDT');
  });

  it('rótulo desconhecido NÃO ganha cor inventada', () => {
    expect(tomDaClassificacao('Categoria que não existe')).toBeNull();
    expect(tomDaClassificacao(null)).toBeNull();
    expect(tomDaClassificacao(undefined)).toBeNull();
    expect(tomDaClassificacao('')).toBeNull();
    // quem desenha cai no neutro, que também é token
    expect(TOM_NEUTRO.fundo).toMatch(/^bg-pp-/);
  });

  it('Perfil · a faixa ativa recebe o tom da classificação', () => {
    // o componente pinta o degrau aceso com o tom da medida...
    expect(GRAFICOS).toContain('tomDaClassificacao(m.classificacao)');
    expect(GRAFICOS).toContain('`${tom.fundo} ${tom.contorno} outline-2');
    // ...e os inativos continuam neutros e IGUAIS entre si
    expect(GRAFICOS).toContain(": 'bg-pp-ink/[0.05]'");
    // o alternado antigo saiu: ele criava um segundo padrão competindo
    // com a única coisa que a cor precisa dizer
    expect(GRAFICOS).not.toContain('bg-pp-ink/[0.04]');
    expect(GRAFICOS).not.toContain('bg-pp-ink/[0.09]');
  });

  it('Perfil · o degrau aceso não fica MAIOR que os outros quatro', () => {
    // `border-2` num filho `flex-1` entra na base do flex e engorda a
    // caixa em ~3px. Num gráfico ordinal o degrau ativo não é maior — é o
    // ativo —, então o realce é `outline`, que não participa do layout.
    const regua = GRAFICOS.slice(
      GRAFICOS.indexOf('function Regua'),
      GRAFICOS.indexOf('export function PerfilExecutivoFdt'),
    );
    expect(regua).toContain('outline-2');
    expect(regua).toContain('-outline-offset-2');
    expect(regua).not.toMatch(/border-2/);
    // a divisória é a MESMA nos cinco degraus, e é ela que os iguala —
    // inclusive no último, que a mantém transparente em vez de removê-la
    expect(regua).toContain(
      "'flex-1 border-r border-pp-ink/15 last:border-r-transparent'",
    );
    expect(regua).not.toContain('last:border-r-0');
  });

  it('Perfil · a POSIÇÃO ordinal não mudou com a cor', () => {
    // o mesmo resultado do bloco 19, conferido depois do polimento
    const perfil = perfilExecutivoFdt(BLOCOS)!;
    expect(perfil.map((m) => m.degrau)).toEqual([4, 2, 1, 0, 3, 2]);
    // e a posição continua saindo da classificação, não do tom
    expect(perfil.map((m) => m.degrau)).toEqual(
      perfil.map((m) => degrauDaClassificacao(m.classificacao)),
    );
  });

  it('Erros · raw igual dá comprimento igual, mesmo com classificação diferente', () => {
    // O CASO DE ACEITE: quatro tarefas com 2 erros cada, classificadas
    // diferente porque a régua dos erros muda a cada faixa etária.
    const classes = ['Deficitário', 'Média inferior', 'Média', 'Média'];
    const caso = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        {
          medidas: Object.fromEntries(
            MEDIDAS_ERRO.map(([c], i) => [
              c,
              { bruto: 2, faixa_percentilica: null, classificacao: classes[i] },
            ]),
          ),
          derivadas: {},
        },
        Object.fromEntries(MEDIDAS_ERRO.map(([c]) => [c, res(2, null)])),
      ),
    )!;

    // COMPRIMENTO: os quatro idênticos, porque os quatro brutos são 2
    expect(caso.barras.map((b) => b.bruto)).toEqual([2, 2, 2, 2]);
    expect(new Set(caso.barras.map((b) => b.fracao)).size).toBe(1);
    expect(caso.barras.every((b) => b.fracao === 1)).toBe(true);

    // COR: três tons distintos, porque são três classificações distintas
    const tons = caso.barras.map(
      (b) => (tomDaClassificacao(b.classificacao) ?? TOM_NEUTRO).fundo,
    );
    expect(new Set(tons).size).toBe(3);
    // e as duas "Média" saem com o MESMO tom
    expect(tons[2]).toBe(tons[3]);
    // a primeira e a segunda, com tons diferentes
    expect(tons[0]).not.toBe(tons[1]);
  });

  it('Erros · a cor nunca altera o comprimento', () => {
    // mesma contagem, classificações trocadas: a fração não se mexe
    const comClasse = (classificacao: string | null) =>
      errosPorTarefaFdt(
        blocosFdt(
          'FDT',
          {
            medidas: {
              E_LEITURA: { bruto: 3, faixa_percentilica: null, classificacao },
              E_CONTAGEM: { bruto: 1, faixa_percentilica: null, classificacao },
            },
            derivadas: {},
          },
          { E_LEITURA: res(3, null), E_CONTAGEM: res(1, null) },
        ),
      )!.barras.map((b) => b.fracao);

    const base = comClasse('Deficitário');
    for (const outra of ['Média', 'Média inferior', 'Muito superior', null]) {
      expect(comClasse(outra)).toEqual(base);
    }
    // e o comprimento continua sendo a razão da contagem
    expect(base).toEqual([1, 1 / 3]);

    // o modelo não conhece cor: `BarraErro` não carrega classe nenhuma
    const uma = errosPorTarefaFdt(BLOCOS)!.barras[0];
    expect(Object.keys(uma).sort()).toEqual(
      ['bruto', 'classificacao', 'code', 'fracao', 'nome'].sort(),
    );
  });

  it('Perfil · as pontas da régua acompanham a curva do trilho', () => {
    const regua = GRAFICOS.slice(
      GRAFICOS.indexOf('function Regua'),
      GRAFICOS.indexOf('export function PerfilExecutivoFdt'),
    );
    // o contorno é retângulo e cruzava a curva nas duas extremidades —
    // Deficitário à esquerda, Muito superior à direita. `outline` segue o
    // `border-radius` do elemento, então as pontas o recebem.
    expect(regua).toContain('first:rounded-l-pill last:rounded-r-pill');
    // e o trilho continua sendo quem define a forma externa
    expect(regua).toContain('rounded-pill overflow-hidden');
    // raio NÃO ocupa espaço: nada de padding ou margem nas pontas, que
    // desigualariam os cinco degraus
    expect(regua).not.toMatch(/first:(p|m)[xlr]?-/);
    expect(regua).not.toMatch(/last:(p|m)[xlr]?-/);
  });

  it('Erros · contagem zero não desenha barra, e o valor 0 continua', () => {
    // largura zero não bastava: a barra tem borda, e borda de largura zero
    // ainda pinta uma lasca de ~2px que se lia como "quase um erro"
    expect(GRAFICOS).toContain('{b.fracao > 0 && (');

    // e o MODELO não mudou: fração 0 e bruto 0 continuam existindo, porque
    // no bloco de erros não errar é resultado, não ausência
    const zerado = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        {
          medidas: {
            E_LEITURA: { bruto: 0, faixa_percentilica: null, classificacao: 'Média' },
            E_CONTAGEM: { bruto: 2, faixa_percentilica: null, classificacao: 'Média' },
          },
          derivadas: {},
        },
        { E_LEITURA: res(0, null), E_CONTAGEM: res(2, null) },
      ),
    )!;
    const leitura = zerado.barras.find((b) => b.code === 'E_LEITURA')!;
    expect(leitura.fracao).toBe(0);
    expect(leitura.bruto).toBe(0);
    // ausência continua sendo outra coisa, e diz outra coisa
    expect(leitura.fracao).not.toBeNull();
    expect(GRAFICOS).toContain('sem contagem — não recebe barra');
  });

  it('a nota do Perfil é curta e não promete percentil', () => {
    expect(NOTA_PERFIL).toBe(
      'As cores indicam a faixa de classificação de cada medida.',
    );
    expect(NOTA_PERFIL).not.toMatch(/percentil/i);
    expect(NOTA_PERFIL.length).toBeLessThan(80);
  });

  it('a cor não é a única portadora: a classificação continua escrita', () => {
    // quem não distingue os tons lê o resultado inteiro do mesmo jeito
    expect(GRAFICOS).toContain('{m.classificacao}');
    expect(GRAFICOS).toContain('{b.classificacao}');
    // e o leitor de tela recebe a classificação nas duas descrições
    expect(GRAFICOS).toContain('${m.nome}: ${m.classificacao}');
    expect(GRAFICOS).toContain('${b.classificacao}');
  });
});

// =====================================================================
// 20 · ESCOPO — o que esta fase não podia tocar
// =====================================================================

describe('20 · FDT · o escopo da Fase 1', () => {
  it('19 e 20 · os dois fluxos continuam usando FdtDerivado', () => {
    expect(AVALIAR).toContain('<FdtDerivado');
    expect(DETALHE).toContain('<FdtDerivado');
  });

  it('21 · resultado recém-corrigido e avaliação salva têm a MESMA tela', () => {
    // a apresentação inteira — colunas e os dois desenhos — mora dentro de
    // FdtDerivado, então os dois fluxos recebem as duas coisas por
    // construção. Nenhum dos dois monta gráfico por conta própria.
    expect(COMPONENTE).toContain('<PerfilExecutivoFdt');
    expect(COMPONENTE).toContain('<ErrosPorTarefaFdt');
    for (const fonte of [AVALIAR, DETALHE]) {
      expect(fonte).not.toContain('PerfilExecutivoFdt');
      expect(fonte).not.toContain('ErrosPorTarefaFdt');
      expect(fonte).not.toContain('colunasDaLinhaFdt');
    }
  });

  it('a ordem da página é dados, desenho, dados, desenho', () => {
    const tempo = COMPONENTE.indexOf('TITULO_TEMPO && perfil');
    const erro = COMPONENTE.indexOf('TITULO_ERRO && erros');
    expect(tempo).toBeGreaterThan(-1);
    expect(erro).toBeGreaterThan(tempo);
    // cada gráfico é irmão do bloco que ele relê, dentro do mesmo map
    expect(COMPONENTE).toContain('blocos.map(');
  });

  it('22 e 23 · o relatório e a ilha de gráficos não souberam desta fase', () => {
    for (const nome of [
      'FdtGraficos',
      'PerfilExecutivoFdt',
      'ErrosPorTarefaFdt',
      'colunasDaLinhaFdt',
      'perfilExecutivoFdt',
      'errosPorTarefaFdt',
    ]) {
      expect(DOCUMENTO).not.toContain(nome);
    }
    const ilha = leia(
      'src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
      '[reportId]', 'ReportGraphIsland.tsx',
    );
    expect(ilha).not.toContain('Fdt');
    expect(ilha).not.toContain('FDT');
  });

  it('24 · o FDT não foi registrado no sistema genérico de gráficos', () => {
    // registrar aqui colocaria os dois cartões dentro do documento e do
    // PDF no mesmo commit — e o relatório é a Fase 2
    expect(GRAPH_CONFIG).not.toContain("'FDT'");
    expect(GRAPH_CONFIG).not.toContain('"FDT"');
    // e o desenho novo não é consumido pelo ResultGraph
    const resultGraph = leia(
      'src', 'app', 'app', 'corrigefacil', 'graphs', 'ResultGraph.tsx',
    );
    expect(resultGraph).not.toContain('Fdt');
  });

  it('25 · nada de OpenAI, prompt ou gerador de relatório mudou de dono', () => {
    // sobre o que EXECUTA: `fdtParaTexto` já existia e já servia ao
    // Relatório Pró, e os comentários dele citam o prompt de propósito.
    // O que não pode existir é chamada, chave ou modelo aqui.
    for (const fonte of FONTES) {
      expect(semComentarios(fonte)).not.toMatch(
        /openai|gpt-|ai_reports|prompt/i,
      );
    }
    // e o gerador do relatório continua sem saber destes nomes
    const gerador = leia('src', 'lib', 'corrigefacil', 'report-generator.ts');
    for (const nome of ['perfilExecutivoFdt', 'errosPorTarefaFdt', 'colunasDaLinhaFdt']) {
      expect(gerador).not.toContain(nome);
    }
  });

  it('26 a 28 · nenhuma migration, nenhum SQL, nenhuma Edge', () => {
    for (const fonte of FONTES) {
      expect(fonte).not.toMatch(/\bmigration\b/i);
      expect(fonte).not.toMatch(/\b(insert|update|delete)\s+(into|from)\b/i);
      expect(fonte).not.toContain('supabase.from(');
      expect(fonte).not.toContain('functions/v1');
    }
  });

  it('29 · o checkout, a demo grátis e o Relatório Pró não foram tocados', () => {
    for (const fonte of FONTES) {
      expect(fonte).not.toMatch(/checkout|is_free_demo|relatorio_pro/i);
    }
  });
});
