// =====================================================================
// A APRESENTAÇÃO DOS RESULTADOS · rótulos em cima, valores embaixo, e a
// CLASSIFICAÇÃO como última coluna do mesmo bloco.
//
// O QUE ESTE ARQUIVO GUARDA é uma decisão de leitura, não um estilo: a
// classificação é a leitura do número que está ao lado dela. Enquanto ela
// morava num bloco próprio, abaixo das métricas e com rótulo próprio, ela
// se lia como um segundo resultado — e para saber o que "31" queria dizer
// o olho tinha de descer.
//
// COMO SE TESTA SEM DOM: o Vitest deste repositório roda em `node`, e a
// suíte só inclui `.ts`. Então o que se verifica aqui é o CONTRATO —
// `celulasDoResultado` e `celulasDaLinhaFdt` decidem quais colunas
// existem, e são funções puras — mais varredura de código nos três
// componentes, para provar que eles usam esse contrato em vez de montar
// colunas por conta própria.
//
// NADA AQUI TESTA CLASSE DO TAILWIND INTEIRA. Classe completa quebra na
// primeira troca de espaçamento sem que nada de verdade tenha mudado. O
// que se afirma é estrutura: a classificação está DENTRO do mesmo
// contêiner das métricas, e não num irmão abaixo dele.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResultadoEscala } from '@/lib/corrigefacil/api';
import { celulasDoResultado } from '@/lib/corrigefacil/resultado-celulas';
import {
  COLUNAS_FDT,
  colunasDaLinhaFdt,
  type LinhaFdt,
} from '@/lib/corrigefacil/fdt-derivado';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const avaliar = source('src/app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx');
const detalhe = source('src/app/app/corrigefacil/avaliacoes/[id]/DetalheClient.tsx');
const fdt = source('src/app/app/corrigefacil/FdtDerivado.tsx');
const grid = source('src/app/app/corrigefacil/ResultadoMetricas.tsx');

/** Um resultado disponível com só o que o caso precisa. */
function resultado(p: Partial<ResultadoEscala> = {}): ResultadoEscala {
  return {
    raw: null,
    score: null,
    percentile: null,
    z: null,
    classification: null,
    ci95: null,
    available: true,
    message: null,
    flags: [],
    ...p,
  } as ResultadoEscala;
}

function linhaFdt(p: Partial<LinhaFdt> = {}): LinhaFdt {
  return {
    code: 'T_LEITURA',
    nome: 'Leitura',
    bruto: null,
    z: null,
    faixa: null,
    classificacao: null,
    indisponivel: null,
    ...p,
  };
}

const rotulos = (c: { rotulo: string }[]) => c.map((x) => x.rotulo);

// ── 1 e 2 · a classificação entra no bloco das métricas ─────────────────

describe('a classificação é a última coluna, não um bloco abaixo', () => {
  it('o grid desenha métricas e classificação no MESMO contêiner', () => {
    // a classificação aparece DEPOIS do map das métricas e ANTES de o
    // contêiner fechar: é irmã das colunas, não do bloco inteiro
    const abre = grid.indexOf('<div className="flex flex-wrap');
    const mapMetricas = grid.indexOf('metricas.map', abre);
    const pilula = grid.indexOf('rounded-pill', mapMetricas);
    const fecha = grid.lastIndexOf('</div>');

    expect(abre).toBeGreaterThan(-1);
    expect(mapMetricas).toBeGreaterThan(abre);
    expect(pilula).toBeGreaterThan(mapMetricas);
    expect(pilula).toBeLessThan(fecha);
  });

  it('os dois renderers comuns passaram a usar o mesmo bloco', () => {
    for (const src of [avaliar, detalhe]) {
      expect(src).toContain('<ResultadoMetricas');
      expect(src).toContain('classificacao={');
    }
  });

  it('o FDT mantém a decisão com desenho próprio: classificação é COLUNA', () => {
    // O FDT saiu de `ResultadoMetricas` — e a razão é a oposta da que
    // criou este arquivo. Lá a decisão é "classificação junto das
    // métricas", e ela CONTINUA valendo: a classificação é a última das
    // quatro colunas, dentro do mesmo grid.
    //
    // O que mudou é a omissão. `ResultadoMetricas` não desenha coluna sem
    // valor, e isso é certo para os 20 comuns; no FDT, com dez medidas
    // lidas uma embaixo da outra, faltar o z fazia a classificação subir
    // para a posição da faixa e a coluna trocar de lugar entre as linhas.
    expect(fdt).not.toContain('<ResultadoMetricas');
    expect(fdt).toContain('colunasDaLinhaFdt(linha)');
    // e a classificação é a ÚLTIMA das quatro, não um bloco abaixo delas
    expect(COLUNAS_FDT[COLUNAS_FDT.length - 1]).toBe('classificação');
  });

  it('nenhum renderer mantém a classificação em bloco vertical próprio', () => {
    // o desenho antigo era um `<p>` com o rótulo "classificação" dentro do
    // próprio componente, seguido da pílula. Agora esse rótulo existe em UM
    // lugar só — o grid —, e é lá que ele fica ao lado das métricas.
    //
    // O QUE SE PROCURA é o rótulo COMO NÓ DE TEXTO do JSX: uma linha cujo
    // conteúdo é só a palavra. A palavra em comentário é outra coisa — os
    // três arquivos explicam por que o FDT classifica fora do card, e
    // proibir o assunto no texto tornaria o teste refém da redação.
    const rotuloSolto = /^\s*classificação\s*$/m;
    for (const src of [avaliar, detalhe, fdt]) {
      expect(src).not.toMatch(rotuloSolto);
    }
    expect(grid).toMatch(rotuloSolto);
  });

  it('a classificação só chega à tela pelo bloco compartilhado', () => {
    // UMA aparição em cada renderer, e ela é a passagem do valor ao grid.
    // Uma segunda seria a pílula desenhada à parte de novo.
    //
    // `rounded-pill` NÃO serve de prova aqui: é o mesmo token dos botões e
    // dos campos de texto da tela inteira, e proibi-lo diria mais sobre os
    // botões do que sobre o resultado.
    const passagens = (src: string, expr: string) =>
      src.split(`classificacao={${expr}}`).length - 1;

    expect(passagens(avaliar, 'celulas.classificacao')).toBe(1);
    expect(avaliar).not.toContain('{r.classification}');

    expect(passagens(detalhe, 'celulas.classificacao')).toBe(1);
    expect(detalhe).not.toContain('{r.classification}');

    // no FDT a passagem é a linha inteira, UMA vez: as quatro colunas —
    // classificação inclusive — saem todas de `colunasDaLinhaFdt`, e o
    // componente não lê `linha.classificacao` por fora dela
    expect(fdt.split('colunasDaLinhaFdt(linha)').length - 1).toBe(1);
    expect(fdt).not.toContain('{linha.classificacao}');
  });

  it('o grid quebra em vez de espremer, e a pílula não estoura o card', () => {
    // responsividade é contrato aqui: "Abaixo do ponto de corte para
    // rastreamento" não cabe numa coluna de números
    expect(grid).toContain('flex-wrap');
    expect(grid).toContain('break-words');
    expect(grid).toContain('max-w-full');
    // largura rígida em pixel quebraria exatamente os rótulos longos
    expect(grid).not.toMatch(/w-\[\d+px\]/);
  });
});

// ── 3 a 6 · o conjunto de colunas de cada instrumento ───────────────────

describe('cada instrumento mostra as colunas que ele tem', () => {
  it('CES-D · escore e classificação, lado a lado', () => {
    const { metricas, classificacao } = celulasDoResultado(
      'CES-D',
      'TOTAL',
      resultado({
        raw: 14,
        score: 14,
        classification: 'Abaixo do ponto de corte para rastreamento',
      }),
    );
    expect(rotulos(metricas)).toEqual(['escore']);
    expect(metricas[0].texto).toBe('14');
    expect(classificacao).toBe('Abaixo do ponto de corte para rastreamento');
  });

  it('DASS-21 · o mesmo desenho em cada um dos três domínios', () => {
    for (const dominio of ['DEPRESSAO', 'ANSIEDADE', 'ESTRESSE']) {
      const { metricas, classificacao } = celulasDoResultado(
        'DASS-21',
        dominio,
        resultado({ raw: 24, score: 24, classification: 'Severo' }),
      );
      expect(rotulos(metricas)).toEqual(['escore']);
      expect(classificacao).toBe('Severo');
    }
  });

  it('BPA-2 · escore, percentil, z e classificação continuam os quatro', () => {
    const { metricas, classificacao } = celulasDoResultado(
      'BPA-2',
      'AC',
      resultado({
        raw: 31,
        score: 31,
        percentile: 29,
        z: -0.54,
        classification: 'Média inferior',
      }),
    );
    expect(rotulos(metricas)).toEqual(['escore', 'percentil', 'z']);
    // z na mesma régua pt-BR dos outros números do produto — ver
    // format-metric-number. '-0.54' era o bug: ponto, não vírgula.
    expect(metricas.map((c) => c.texto)).toEqual(['31', '29', '-0,54']);
    expect(classificacao).toBe('Média inferior');
  });

  it('BPA-2 · o "< 1" da primeira faixa continua sendo coluna de percentil', () => {
    // a regra é de `textoDePercentil` e não muda aqui: o que se guarda é
    // que ela CHEGA à coluna, em vez de o percentil sumir
    const { metricas } = celulasDoResultado(
      'BPA-2',
      'AC',
      resultado({ score: 3, percentile: null, classification: 'Muito inferior' }),
    );
    expect(metricas.find((c) => c.rotulo === 'percentil')?.texto).toBe('< 1');
  });

  it('SNAP-IV · os nomes próprios das métricas são preservados', () => {
    const { metricas } = celulasDoResultado(
      'SNAP-IV-18',
      'DESATENCAO',
      resultado({ raw: 15, score: 4, classification: 'Sugestivo' }),
    );
    // nem "escore" genérico, nem "ESCORE" forçado: os nomes são os DELE
    expect(rotulos(metricas)).toEqual(['Média por item', 'Sintomas presentes']);
    expect(metricas[0].texto).toBe('1,67 / 3');
  });

  it('o IC95% fica colado no escore, e não vira coluna própria', () => {
    const { metricas } = celulasDoResultado(
      'BAYLEY-III',
      'COG',
      resultado({ raw: 50, score: 100, ci95: '94–106' }),
    );
    expect(rotulos(metricas)).toEqual(['escore']);
    expect(metricas[0].complemento).toBe('94–106');
  });
});

// ── 7 · ausência não vira coluna vazia ──────────────────────────────────

describe('o que não existe não ocupa coluna', () => {
  it('classificação ausente não cria coluna', () => {
    for (const ausente of [null, '', '   ']) {
      const { classificacao } = celulasDoResultado(
        'CES-D',
        'TOTAL',
        resultado({ score: 14, classification: ausente }),
      );
      expect(classificacao).toBeNull();
    }
  });

  it('métrica ausente não cria coluna', () => {
    const { metricas } = celulasDoResultado(
      'CES-D',
      'TOTAL',
      resultado({ score: 14, percentile: null, z: null }),
    );
    expect(rotulos(metricas)).toEqual(['escore']);
  });

  it('resultado indisponível não traz coluna nenhuma', () => {
    // nem o número que por acaso tenha vindo junto
    const { metricas, classificacao } = celulasDoResultado(
      'CES-D',
      'TOTAL',
      resultado({ score: 14, z: 1.2, available: false }),
    );
    expect(metricas).toEqual([]);
    expect(classificacao).toBeNull();
  });

  it('o grid não desenha nada quando não há coluna nem classificação', () => {
    expect(grid).toContain('if (metricas.length === 0 && !classe) return null;');
  });
});

// ── 8 · FDT ─────────────────────────────────────────────────────────────

describe('FDT · bruto, z, faixa e classificação no mesmo bloco', () => {
  it('as quatro colunas do FDT saem juntas e na ordem', () => {
    const linha = linhaFdt({
      bruto: 23,
      z: 0.14,
      faixa: 'P25–P75',
      classificacao: 'Média',
    });
    expect(rotulos(colunasDaLinhaFdt(linha))).toEqual([
      'bruto',
      'z',
      'faixa percentílica',
      'classificação',
    ]);
    // o z sai formatado pela MESMA função que o PDF usa
    expect(colunasDaLinhaFdt(linha)[1].texto).toBe('0,14');
    // e a classificação é a quarta coluna, no mesmo bloco
    expect(colunasDaLinhaFdt(linha)[3].texto).toBe('Média');
  });

  it('o FDT continua com renderer próprio, e não virou instrumento comum', () => {
    // o bloco do FDT é o dele: títulos, notas, medidas indisponíveis e a
    // lista de derivadas ausentes seguem em `blocosFdt`
    expect(fdt).toContain('blocosFdt(');
    expect(fdt).toContain('derivadasAusentes(');
    expect(fdt).toContain('linha.indisponivel');
    // e ele NÃO passou a usar o conjunto de colunas dos comuns
    expect(fdt).not.toContain('celulasDoResultado');
    expect(avaliar).toContain('ehFdt(');
    expect(detalhe).toContain('ehFdt(');
  });

  it('z não finito vira travessão — nunca rótulo com nada embaixo', () => {
    // o filtro é o TEXTO formatado, não o número: `zFormatado` devolve null
    // fora do finito. A coluna CONTINUA existindo, para as de baixo não
    // subirem de posição, mas o que se escreve nela é a ausência.
    for (const z of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const colunas = colunasDaLinhaFdt(linhaFdt({ bruto: 9, z }));
      expect(rotulos(colunas)).toEqual([...COLUNAS_FDT]);
      expect(colunas[1]).toEqual({ rotulo: 'z', texto: '—', ausente: true });
      // e o buraco não virou número
      expect(colunas[1].texto).not.toBe('0,00');
    }
  });

  it('medida sem nada mantém as quatro colunas, todas em travessão', () => {
    const colunas = colunasDaLinhaFdt(linhaFdt());
    expect(rotulos(colunas)).toEqual([...COLUNAS_FDT]);
    expect(colunas.every((c) => c.ausente && c.texto === '—')).toBe(true);
  });
});

// ── 9 · histórico e correção falam o mesmo desenho ──────────────────────

describe('a avaliação salva parece o resultado recém-corrigido', () => {
  it('os dois montam as colunas pela MESMA função', () => {
    expect(avaliar).toContain('celulasDoResultado(detalhe.code, escala, r)');
    expect(detalhe).toContain('celulasDoResultado(d.instrument, escala, r)');
  });

  it('nenhum dos dois monta coluna por conta própria', () => {
    for (const src of [avaliar, detalhe]) {
      // a linha corrida antiga do histórico e o bloco solto da correção
      expect(src).not.toMatch(/rotulo: 'percentil'/);
      expect(src).not.toMatch(/rotulo: 'z'/);
      expect(src).not.toContain('>percentil ');
    }
  });

  it('o bruto do cabeçalho do card continua onde estava', () => {
    // ele não entra na linha de métricas: já está no topo do card, e
    // repeti-lo seria o mesmo número duas vezes
    for (const src of [avaliar, detalhe]) {
      expect(src).toContain('metricasDaEscala(');
      expect(src).toContain('met.bruto');
    }
    const { metricas } = celulasDoResultado(
      'CES-D',
      'TOTAL',
      resultado({ raw: 14, score: 14 }),
    );
    expect(rotulos(metricas)).not.toContain('bruto');
  });
});

// ── 10 · o que ficou de fora, e continua de fora ────────────────────────

describe('os derivados próprios não entram nesta padronização', () => {
  it('CONFIAS e PHQ-9 seguem com a UX deles', () => {
    const confias = source('src/app/app/corrigefacil/ConfiasDerivado.tsx');
    const phq9 = source('src/app/app/corrigefacil/Phq9Derivado.tsx');
    for (const src of [confias, phq9]) {
      expect(src).not.toContain('ResultadoMetricas');
      expect(src).not.toContain('celulasDoResultado');
    }
  });

  it('os blocos auxiliares não foram tocados', () => {
    for (const arquivo of [
      'RespostasAuxiliares.tsx',
      'TemposDeExecucao.tsx',
      'MetodoDeCorrecao.tsx',
      'CorrigeFacilReportPanel.tsx',
    ]) {
      expect(source(`src/app/app/corrigefacil/${arquivo}`)).not.toContain(
        'ResultadoMetricas',
      );
    }
  });

  it('a apresentação não calcula, não classifica e não conhece instrumento', () => {
    // a trava de sempre: o grid recebe células prontas. Não importa regra
    // clínica nenhuma, não recebe código de instrumento e não formata
    // número — se um dia precisar de qualquer um dos três, a decisão
    // voltou para a camada errada.
    expect(grid).not.toContain('metricas-instrumento');
    expect(grid).not.toContain('metricasDaEscala');
    expect(grid).not.toContain('textoDePercentil');
    expect(grid).not.toMatch(/\bcode[?]?:/);
    expect(grid).not.toContain('toFixed');
    // e o módulo de colunas só REÚNE o que as regras centrais já decidiram
    const celulas = source('src/lib/corrigefacil/resultado-celulas.ts');
    expect(celulas).toContain('metricasDaEscala');
    expect(celulas).toContain('textoDePercentil');
    expect(celulas).not.toContain('toFixed');
    expect(celulas).not.toContain('classification_bands');
  });
});
