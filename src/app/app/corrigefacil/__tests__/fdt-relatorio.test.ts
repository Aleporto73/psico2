// =====================================================================
// FDT · O RESULTADO DENTRO DO RELATÓRIO PROFISSIONAL · Fase 2A.
//
// O QUE MUDOU: o documento imprimia as dez medidas como linha corrida —
// "Leitura — bruto 45 · z -4,17 · < P5 · Deficitário". Correto, e com cara
// de saída de banco. Agora imprime quadro, gráfico, quadro, gráfico, na
// mesma ordem e com a mesma linguagem da tela aprovada.
//
// A DECISÃO ARQUITETURAL QUE ESTE ARQUIVO GUARDA: o documento usa OS
// MESMOS componentes da tela, por importação direta, na variante compacta.
// Não há segunda implementação do gráfico, e o FDT continua FORA de
// `graph-config` — registrar lá faria o `ResultGraph` genérico desenhar o
// FDT com a régua dos outros, a que pede um contínuo que ele não tem.
//
// A TRAVA DA FASE: a NARRATIVA não é assunto aqui. `output_text`, prompts,
// OpenAI e o gerador continuam byte a byte — o relatório já gerado tem de
// abrir com o texto de antes e os resultados novos, sem regenerar nada.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DerivadoFdt, ResultadoEscala } from '@/lib/corrigefacil/api';
import {
  blocosFdt,
  COLUNAS_FDT,
  colunasDaLinhaFdt,
  errosPorTarefaFdt,
  fracaoDoTick,
  MEDIDAS_ERRO,
  MEDIDAS_TEMPO,
  NOTA_DERIVADAS,
  NOTA_ERROS,
  ORDEM_CLASSIFICACAO_TEMPO,
  perfilExecutivoFdt,
  SEM_VALOR,
  TITULO_ERRO,
  TITULO_TEMPO,
  tomDaClassificacao,
} from '@/lib/corrigefacil/fdt-derivado';

function leia(...partes: string[]): string {
  return readFileSync(join(process.cwd(), ...partes), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const DOCUMENTO = leia(
  'src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
  '[reportId]', 'RelatorioDocumentClient.tsx',
);
const ILHA = leia(
  'src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
  '[reportId]', 'ReportGraphIsland.tsx',
);
const GRAFICOS = leia('src', 'app', 'app', 'corrigefacil', 'FdtGraficos.tsx');
const GERADOR = leia('src', 'lib', 'corrigefacil', 'report-generator.ts');
const CSS = leia('src', 'app', 'globals.css');

/** O bloco do FDT dentro do documento, para as varreduras não pegarem
 *  markup dos outros instrumentos. */
const BLOCO_FDT = DOCUMENTO.slice(
  DOCUMENTO.indexOf('function FdtDoDocumento('),
  DOCUMENTO.indexOf('function Phq9DoDocumento('),
);

/** O código sem comentários: as travas são sobre o que EXECUTA, e a
 *  documentação deste produto cita nomes de propósito — o comentário do
 *  quadro novo transcreve a linha corrida antiga, "< P5" incluso, para
 *  registrar o que foi substituído. */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');
}

// ── o caso real do item 21 · ESCOLA, 14 anos ───────────────────────────

function res(
  raw: number | null,
  z: number | null = null,
  p: Partial<ResultadoEscala> = {},
): ResultadoEscala {
  return {
    raw, score: null, percentile: null, z, classification: null,
    available: true, message: null, flags: [], ...p,
  };
}

const DERIVADO: DerivadoFdt = {
  medidas: {
    T_LEITURA: { bruto: 45, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
    T_CONTAGEM: { bruto: 38, faixa_percentilica: 'P5 a P25', classificacao: 'Média inferior' },
    T_ESCOLHA: { bruto: 22, faixa_percentilica: '> P95', classificacao: 'Muito superior' },
    T_ALTERNANCIA: { bruto: 34, faixa_percentilica: '> P95', classificacao: 'Muito superior' },
    INIBICAO: { bruto: -23, faixa_percentilica: '> P95', classificacao: 'Muito superior' },
    FLEXIBILIDADE: { bruto: -11, faixa_percentilica: '> P95', classificacao: 'Muito superior' },
    E_LEITURA: { bruto: 2, faixa_percentilica: '< P5', classificacao: 'Deficitário' },
    E_CONTAGEM: { bruto: 1, faixa_percentilica: 'P5 a P25', classificacao: 'Média inferior' },
    E_ESCOLHA: { bruto: 2, faixa_percentilica: '≥ P25', classificacao: 'Média' },
    E_ALTERNANCIA: { bruto: 3, faixa_percentilica: '≥ P25', classificacao: 'Média' },
  },
  derivadas: { INIBICAO: true, FLEXIBILIDADE: true },
};

const RESULTADOS: Record<string, ResultadoEscala> = {
  T_LEITURA: res(45, -4.17),
  T_CONTAGEM: res(38, -1.1),
  T_ESCOLHA: res(22, 2.13),
  T_ALTERNANCIA: res(34, 1.51),
  INIBICAO: res(-23, 5.2),
  FLEXIBILIDADE: res(-11, 3.57),
  // sem z, exatamente como voltou da Edge nesse protocolo
  E_LEITURA: res(2, null),
  E_CONTAGEM: res(1, -1.6),
  E_ESCOLHA: res(2, -0.17),
  E_ALTERNANCIA: res(3, -0.52),
};

const BLOCOS = blocosFdt('FDT', DERIVADO, RESULTADOS)!;
const TEMPO = BLOCOS.find((b) => b.titulo === TITULO_TEMPO)!;
const ERROS = BLOCOS.find((b) => b.titulo === TITULO_ERRO)!;

// =====================================================================
// 17 · RESULTADOS — quadro, não linha corrida
// =====================================================================

describe('17 · FDT no documento · os quadros', () => {
  it('1 · a linha corrida antiga não existe mais', () => {
    // era isto: `Leitura — bruto 45 · z -4,17 · < P5 · Deficitário`
    expect(BLOCO_FDT).not.toContain('— bruto ${');
    expect(BLOCO_FDT).not.toContain('· z ${');
    expect(BLOCO_FDT).not.toMatch(/`\s*·\s*\$\{linha\./);
    // e o bloco virou tabela, que é o que herda as garantias de impressão
    expect(BLOCO_FDT).toContain('<table');
    expect(BLOCO_FDT).toContain('<thead>');
  });

  it('2 · a ordem do tempo é a do controlador', () => {
    expect(TEMPO.linhas.map((l) => l.nome)).toEqual([
      'Leitura',
      'Contagem',
      'Escolha',
      'Alternância',
      'Inibição',
      'Flexibilidade',
    ]);
    expect(TEMPO.linhas.map((l) => l.code)).toEqual(
      MEDIDAS_TEMPO.map(([c]) => c),
    );
  });

  it('3 · as colunas são Medida, Bruto, Z, Faixa percentílica, Classificação', () => {
    // o cabeçalho SAI do contrato, e não de uma segunda lista escrita à
    // mão no documento — assim ele não pode divergir da tela
    expect(BLOCO_FDT).toContain('COLUNAS_FDT.map');
    expect(BLOCO_FDT).toMatch(/<th[^>]*>\s*Medida\s*<\/th>/);
    expect([...COLUNAS_FDT]).toEqual([
      'bruto',
      'z',
      'faixa percentílica',
      'classificação',
    ]);
    // e as células saem da MESMA função da tela
    expect(BLOCO_FDT).toContain('colunasDaLinhaFdt(linha)');
    for (const linha of [...TEMPO.linhas, ...ERROS.linhas]) {
      expect(colunasDaLinhaFdt(linha).map((c) => c.rotulo)).toEqual([
        ...COLUNAS_FDT,
      ]);
    }
  });

  it('4 · z ausente vira travessão na APRESENTAÇÃO, e o dado segue null', () => {
    const leitura = ERROS.linhas.find((l) => l.code === 'E_LEITURA')!;
    const colunas = colunasDaLinhaFdt(leitura);
    expect(colunas[1]).toEqual({ rotulo: 'z', texto: SEM_VALOR, ausente: true });
    for (const inventado of ['0', '0,00', '0.00', 'n/c']) {
      expect(colunas[1].texto).not.toBe(inventado);
    }
    // o DADO continua null: o travessão é tinta
    expect(leitura.z).toBeNull();
    expect(RESULTADOS.E_LEITURA.z).toBeNull();
  });

  it('5 · a ordem dos erros é a do controlador', () => {
    expect(ERROS.linhas.map((l) => l.nome)).toEqual([
      'Leitura',
      'Contagem',
      'Escolha',
      'Alternância',
    ]);
    expect(ERROS.linhas.map((l) => l.code)).toEqual(
      MEDIDAS_ERRO.map(([c]) => c),
    );
  });

  it('6 · as notas dos dois blocos continuam impressas', () => {
    expect(TEMPO.nota).toBe(NOTA_DERIVADAS);
    expect(ERROS.nota).toBe(NOTA_ERROS);
    // e saem como NOTA do bloco, em tipo pequeno, não como linha de
    // resultado misturada às medidas
    expect(BLOCO_FDT).toContain('{bloco.nota}');
    expect(BLOCO_FDT).toContain('text-[11px] text-pp-ink-soft leading-relaxed');
    // a ausência das derivadas continua legível
    expect(BLOCO_FDT).toContain('Não calculadas por falta de componente');
  });

  it('a ordem da página é quadro, gráfico, quadro, gráfico', () => {
    const qTempo = BLOCO_FDT.indexOf('TITULO_TEMPO && perfil');
    const qErro = BLOCO_FDT.indexOf('TITULO_ERRO && errosPorTarefa');
    expect(qTempo).toBeGreaterThan(-1);
    expect(qErro).toBeGreaterThan(qTempo);
    // cada gráfico é irmão do quadro que ele relê, dentro do mesmo map
    expect(BLOCO_FDT).toContain('blocos.map(');
    expect(BLOCO_FDT).toContain('<QuadroFdt bloco={bloco} />');
  });

  it('a medida indisponível não recebe número nenhum', () => {
    const semNorma = blocosFdt(
      'FDT',
      DERIVADO,
      {
        ...RESULTADOS,
        T_ESCOLHA: { ...res(null), available: false, message: 'Sem norma.' },
      },
    )!.find((b) => b.titulo === TITULO_TEMPO)!;
    const escolha = semNorma.linhas.find((l) => l.code === 'T_ESCOLHA')!;
    expect(escolha.indisponivel).toBe('Sem norma.');
    // a mensagem atravessa as quatro colunas em vez de deixar fantasmas
    expect(BLOCO_FDT).toContain('colSpan={COLUNAS_FDT.length}');
  });
});

// =====================================================================
// 18 · PERFIL EXECUTIVO NO DOCUMENTO
// =====================================================================

describe('18 · FDT no documento · Perfil executivo', () => {
  const perfil = perfilExecutivoFdt(BLOCOS)!;

  it('7 · o documento renderiza o Perfil executivo', () => {
    expect(BLOCO_FDT).toContain('<PerfilExecutivoFdt');
    expect(BLOCO_FDT).toContain('medidas={perfil}');
    expect(BLOCO_FDT).toContain('variante="documento"');
  });

  it('8 · usa as seis medidas, na ordem do controlador', () => {
    expect(perfil.map((m) => m.nome)).toEqual([
      'Leitura',
      'Contagem',
      'Escolha',
      'Alternância',
      'Inibição',
      'Flexibilidade',
    ]);
  });

  it('9 · a posição vem da classificação congelada do servidor', () => {
    for (const m of perfil) {
      expect(m.classificacao).toBe(DERIVADO.medidas[m.code].classificacao);
      expect(m.degrau).toBe(
        ORDEM_CLASSIFICACAO_TEMPO.indexOf(m.classificacao!),
      );
    }
    expect(perfil.map((m) => m.degrau)).toEqual([0, 1, 4, 4, 4, 4]);
  });

  it('10 a 13 · nem percentil, nem z, nem source_only, nem midpoint', () => {
    // o campo `percentile` do FDT é NULO — é a razão de a régua ser
    // ordinal —, e nada no caminho do documento o lê
    for (const r of Object.values(RESULTADOS)) expect(r.percentile).toBeNull();
    for (const bruta of [GRAFICOS, BLOCO_FDT]) {
      const fonte = semComentarios(bruta);
      expect(fonte).not.toContain('.percentile');
      expect(fonte).not.toContain('source_only');
      expect(fonte).not.toContain('percentile_interpolation');
      expect(fonte).not.toMatch(/\bmidpoint\b/i);
      expect(fonte).not.toMatch(/\berf\b|\bcdf\b/i);
      // nenhum ponto de corte reconstruído no cliente
      expect(fonte).not.toMatch(/\bP(95|75|50|25|5)\b/);
    }
    // 11 · a posição não usa z: o z do documento é COLUNA, nunca geometria
    expect(BLOCO_FDT).not.toMatch(/degrau[^\n]*\.z\b/);
    expect(BLOCO_FDT).not.toMatch(/left:[^\n]*\.z\b/);
  });

  it('14 · mesma classificação = mesma posição', () => {
    // Escolha, Alternância, Inibição e Flexibilidade saíram todas
    // "Muito superior" neste protocolo
    const superiores = perfil.filter((m) => m.classificacao === 'Muito superior');
    expect(superiores).toHaveLength(4);
    expect(new Set(superiores.map((m) => m.degrau)).size).toBe(1);
  });

  it('15 · as cores são as mesmas da Fase 1', () => {
    // o mapa é UM só, e o documento não define paleta própria
    expect(tomDaClassificacao('Deficitário')!.fundo).toBe('bg-pp-block-coral');
    expect(tomDaClassificacao('Média inferior')!.fundo).toBe('bg-pp-block-cream');
    expect(tomDaClassificacao('Média')!.fundo).toBe('bg-pp-block-lilac');
    expect(tomDaClassificacao('Média superior')!.fundo).toBe('bg-pp-block-mint');
    expect(tomDaClassificacao('Muito superior')!.fundo).toBe('bg-pp-block-lime');
    // nenhum hex nem paleta paralela no documento nem no gráfico
    for (const fonte of [GRAFICOS, BLOCO_FDT]) {
      expect(fonte).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(fonte).not.toMatch(/\b(rgb|hsl|oklch)\(/);
      expect(fonte).not.toMatch(/bg-red|bg-amber|bg-green|bg-yellow/);
    }
    // e a classificação da TABELA usa o mesmo mapa dos gráficos
    expect(BLOCO_FDT).toContain('tomDaClassificacao(coluna.texto)');
  });

  it('16 · as pontas da régua mantêm o arredondamento nas duas variantes', () => {
    // é markup ÚNICO: a variante muda densidade, não geometria
    expect(GRAFICOS).toContain('first:rounded-l-pill last:rounded-r-pill');
    expect(GRAFICOS).toContain('rounded-pill overflow-hidden');
    expect(GRAFICOS).toContain('outline-2 -outline-offset-2');
    // uma implementação só do degrau: uma ocorrência do bloco de classes
    expect(
      GRAFICOS.split('first:rounded-l-pill last:rounded-r-pill').length - 1,
    ).toBe(1);
  });
});

// =====================================================================
// 19 · ERROS POR TAREFA NO DOCUMENTO
// =====================================================================

describe('19 · FDT no documento · Erros por tarefa', () => {
  const grafico = errosPorTarefaFdt(BLOCOS)!;

  it('17 · o documento renderiza Erros por tarefa', () => {
    expect(BLOCO_FDT).toContain('<ErrosPorTarefaFdt');
    expect(BLOCO_FDT).toContain('dados={errosPorTarefa}');
  });

  it('18 e 19 · comprimento pelo raw, cor pela classificação', () => {
    expect(grafico.topo).toBe(3);
    for (const b of grafico.barras) {
      expect(b.bruto).toBe(DERIVADO.medidas[b.code].bruto);
      expect(b.fracao).toBeCloseTo(b.bruto! / grafico.topo, 12);
      expect(b.classificacao).toBe(DERIVADO.medidas[b.code].classificacao);
    }
    expect(GRAFICOS).toContain('tomDaClassificacao(b.classificacao)');
  });

  it('20 · raw igual com classificação diferente: mesmo tamanho, cor diferente', () => {
    // Leitura e Escolha valem 2 os dois, e classificam diferente
    const leitura = grafico.barras.find((b) => b.code === 'E_LEITURA')!;
    const escolha = grafico.barras.find((b) => b.code === 'E_ESCOLHA')!;
    expect(leitura.bruto).toBe(escolha.bruto);
    expect(leitura.fracao).toBe(escolha.fracao);
    expect(leitura.classificacao).not.toBe(escolha.classificacao);
    expect(tomDaClassificacao(leitura.classificacao)!.fundo).not.toBe(
      tomDaClassificacao(escolha.classificacao)!.fundo,
    );
  });

  it('21 · raw zero fica sem preenchimento, com o 0 visível', () => {
    const zerado = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        {
          medidas: {
            E_LEITURA: { bruto: 0, faixa_percentilica: '≥ P25', classificacao: 'Média' },
            E_CONTAGEM: { bruto: 2, faixa_percentilica: '≥ P25', classificacao: 'Média' },
          },
          derivadas: {},
        },
        { E_LEITURA: res(0, null), E_CONTAGEM: res(2, null) },
      ),
    )!;
    const leitura = zerado.barras.find((b) => b.code === 'E_LEITURA')!;
    expect(leitura.fracao).toBe(0);
    expect(leitura.bruto).toBe(0);
    // o preenchimento só é desenhado acima de zero, e o valor sai sempre
    expect(GRAFICOS).toContain('{b.fracao > 0 && (');
    expect(GRAFICOS).toContain('{b.bruto}');
  });

  it('22 · topo 7 põe a marca 4 em 4/7, não em 50%', () => {
    expect(fracaoDoTick(4, 7)).not.toBe(0.5);
    expect(fracaoDoTick(4, 7)).toBeCloseTo(4 / 7, 12);
    expect(GRAFICOS).toContain('fracaoDoTick(t, dados.topo)');
    // e o eixo do documento é o MESMO componente: a correção vale nos dois
    expect(GRAFICOS.split('fracaoDoTick(t, dados.topo)').length - 1).toBe(1);
  });

  it('23 · ausência de verdade não recebe barra', () => {
    const semBruto = errosPorTarefaFdt(
      blocosFdt(
        'FDT',
        DERIVADO,
        {
          ...RESULTADOS,
          E_LEITURA: { ...res(null), available: false, message: 'Sem norma.' },
        },
      ),
    )!;
    const ausente = semBruto.barras.find((b) => b.code === 'E_LEITURA')!;
    expect(ausente.fracao).toBeNull();
    expect(GRAFICOS).toContain('sem contagem — não recebe barra');
  });
});

// =====================================================================
// 20 · ESCOPO — a narrativa e o resto do produto
// =====================================================================

describe('20 · FDT no documento · o escopo da Fase 2A', () => {
  it('24 e 25 · a narrativa é renderizada como veio, e nenhum prompt mudou', () => {
    // `output_text` continua sendo lido e impresso, nunca reescrito aqui
    expect(DOCUMENTO).toContain('output_text');
    // o bloco do FDT não toca em nada de narrativa
    for (const nome of [
      'output_text',
      'parseNarrativa',
      'serializarNarrativa',
      'ai_reports',
      'prompt',
    ]) {
      expect(BLOCO_FDT).not.toContain(nome);
    }
  });

  it('26 · nenhum arquivo de OpenAI entra neste caminho', () => {
    for (const fonte of [GRAFICOS, BLOCO_FDT]) {
      expect(fonte).not.toMatch(/openai|gpt-|ai_reports/i);
    }
    // o gerador não conhece os nomes novos: quem compõe é o documento
    for (const nome of ['PerfilExecutivoFdt', 'ErrosPorTarefaFdt', 'variante']) {
      expect(GERADOR).not.toContain(nome);
    }
  });

  it('27 · a ilha continua servindo os outros instrumentos', () => {
    // ela carrega o catálogo, devolve o nome ao cabeçalho e chama o
    // ResultGraph — as três coisas intactas
    expect(ILHA).toContain('buscarInstrumento(');
    expect(ILHA).toContain('onNomeDoInstrumento?.(d.name)');
    expect(ILHA).toContain('faixasDivergemDoResultado');
    expect(ILHA).toContain('<ResultGraph');
    expect(DOCUMENTO).toContain('<ReportGraphIsland');
    expect(DOCUMENTO).toContain('onNomeDoInstrumento={setNomeInstrumento}');
  });

  it('28 · o FDT continua FORA de graph-config', () => {
    const config = leia(
      'src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts',
    );
    expect(config).not.toContain("'FDT'");
    expect(config).not.toContain('"FDT"');
    // então o ResultGraph genérico devolve null para o FDT, e o gráfico
    // não aparece duas vezes no documento
    const resultGraph = leia(
      'src', 'app', 'app', 'corrigefacil', 'graphs', 'ResultGraph.tsx',
    );
    expect(resultGraph).toContain("entrada?.status !== 'aprovado'");
    expect(resultGraph).not.toContain('Fdt');
  });

  it('29 · os outros instrumentos mantêm a tabela genérica', () => {
    expect(DOCUMENTO).toContain('{colunas.classificacao &&');
    expect(DOCUMENTO).toContain('{colunas.percentil &&');
    expect(DOCUMENTO).toContain('Esta avaliação não possui resultados registrados.');
    // e o quadro do FDT é o ramo do FDT, não o dos outros
    expect(DOCUMENTO).toContain('ehFdt(avaliacao.instrument)');
  });

  it('30 · a apresentação não depende de billing_origin', () => {
    // um free_demo e um subscription usam o MESMO compositor: não existe
    // ramo visual por origem comercial
    expect(BLOCO_FDT).not.toContain('billing_origin');
    expect(BLOCO_FDT).not.toContain('free_demo');
    expect(BLOCO_FDT).not.toContain('subscription');
    expect(GRAFICOS).not.toContain('billing_origin');
    // e o documento não escolhe layout por origem em lugar nenhum
    expect(DOCUMENTO).not.toMatch(/billing_origin\s*===\s*['"]free_demo['"]\s*\?/);
  });

  it('31 · abrir relatório antigo não gera nada: o documento só LÊ', () => {
    // a composição é determinística e roda a cada abertura sobre o que já
    // está gravado — é o que faz esta melhoria valer para os relatórios já
    // existentes sem consumir cota
    expect(BLOCO_FDT).toContain('derivadoFdt(avaliacao)');
    expect(BLOCO_FDT).toContain('avaliacao.resultados');
    // nenhuma escrita, nenhuma geração, nenhuma chamada de rede aqui
    for (const proibido of ['insert', 'update(', 'gerarRelatorio', 'fetch(']) {
      expect(BLOCO_FDT).not.toContain(proibido);
    }
  });

  it('32 e 33 · nenhuma migration, nenhum SQL, nenhuma Edge', () => {
    for (const fonte of [GRAFICOS, BLOCO_FDT]) {
      expect(fonte).not.toMatch(/\bmigration\b/i);
      expect(fonte).not.toMatch(/\b(insert|update|delete)\s+(into|from)\b/i);
      expect(fonte).not.toContain('functions/v1');
      expect(fonte).not.toContain('supabase.from(');
    }
  });

  it('a nota do Perfil nunca abre uma página sozinha', () => {
    // no PDF ela caiu no topo da folha seguinte, longe da legenda que
    // explica. Legenda e nota viraram UMA unidade protegida.
    const perfil = GRAFICOS.slice(
      GRAFICOS.indexOf('export function PerfilExecutivoFdt'),
      GRAFICOS.indexOf('export function ErrosPorTarefaFdt'),
    );
    const grupo = perfil.indexOf('space-y-3 print:break-inside-avoid');
    const legenda = perfil.indexOf('<ul');
    const nota = perfil.indexOf('{NOTA_PERFIL}');
    expect(grupo).toBeGreaterThan(-1);
    // o contêiner protegido ABRE antes da legenda, e a nota vem dentro dele
    expect(grupo).toBeLessThan(legenda);
    expect(legenda).toBeLessThan(nota);

    // e a proteção é do PAR, não do Perfil inteiro: segurar as seis réguas
    // empurraria o gráfico todo e deixaria buraco na folha anterior
    expect(perfil).not.toMatch(/<Cartao[^>]*break-inside-avoid/);
    const reguas = perfil.indexOf('<Regua m={m}');
    expect(reguas).toBeGreaterThan(-1);
    expect(reguas).toBeLessThan(grupo);
  });

  it('a cor impressa é reforço, nunca o único portador', () => {
    // `pp-tinta` marca o que precisa sobreviver a "graficos de fundo"
    // desligado — e cada um desses elementos tem borda ou contorno em tinta
    // fechada, com a classificação escrita ao lado
    expect(CSS).toContain('.pp-tinta');
    expect(CSS).toMatch(/print-color-adjust:\s*exact/);
    expect(CSS).toMatch(/-webkit-print-color-adjust:\s*exact/);
    // escopado ao documento: não vaza para o resto do app
    expect(CSS).toMatch(/body\.pp-print-document \.pp-doc \.pp-tinta/);

    // os três lugares que carregam cor de classificação
    expect(GRAFICOS).toContain('print:outline-pp-ink pp-tinta');
    expect(GRAFICOS.split("'pp-tinta'").length - 1).toBe(2);
    expect(BLOCO_FDT).toContain("'pp-tinta'");
    // o fallback continua: borda/contorno em tinta em todos eles
    expect(GRAFICOS).toContain('print:outline-pp-ink');
    expect(GRAFICOS).toContain('print:border-pp-ink');
    expect(BLOCO_FDT).toContain('print:border-pp-ink');
  });

  it('a narrativa não parte parágrafo, e o título não fica órfão', () => {
    // parágrafo protegido, com degradação por orphans/widows quando ele for
    // maior que a folha
    expect(CSS).toMatch(/\.pp-doc p \{\s*\n?\s*break-inside: avoid/);
    expect(CSS).toMatch(/orphans:\s*2/);
    expect(CSS).toMatch(/widows:\s*2/);
    // título anda junto com o que anuncia
    expect(CSS).toMatch(/break-after:\s*avoid/);
    // item de lista inteiro
    expect(CSS).toMatch(/\.pp-doc li,/);
    // o gancho de espaçamento existe e é do container, não do texto
    expect(DOCUMENTO).toContain("'pp-narrativa'");
    expect(CSS).toContain('.pp-narrativa');
  });

  it('a compactação é de espaço, e só no papel', () => {
    // nenhuma fonte encolheu: o que cedeu foi o respiro entre blocos
    const print = CSS.slice(CSS.indexOf('@media print {'));
    expect(print).toMatch(/\.pp-doc > \* \+ \* \{\s*\n?\s*margin-top:/);
    expect(print).not.toMatch(/font-size:\s*(\d|\.)+(px|pt)/);
    // e vive DENTRO do @media print: a tela não muda
    const antesDoPrint = CSS.slice(0, CSS.indexOf('@media print {'));
    expect(antesDoPrint).not.toContain('pp-tinta');
    expect(antesDoPrint).not.toContain('pp-narrativa');
  });

  it('a tela não regrediu: ela continua na variante dela', () => {
    const tela = leia('src', 'app', 'app', 'corrigefacil', 'FdtDerivado.tsx');
    expect(tela).toContain('<PerfilExecutivoFdt medidas={perfil} />');
    expect(tela).toContain('<ErrosPorTarefaFdt dados={erros} />');
    // sem `variante`, o padrão é a tela — o documento é que pede a outra
    expect(tela).not.toContain('variante');
    expect(GRAFICOS).toContain("variante = 'tela'");
  });
});
