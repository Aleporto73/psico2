// =====================================================================
// FDT · Teste dos Cinco Dígitos, do lado da tela.
//
// O FDT digita OITO valores — quatro tempos em segundos e quatro contagens
// de erro — e recebe DEZ resultados. Os dois que sobram, Inibição e
// Flexibilidade, são subtrações feitas no SERVIDOR e nunca são pedidas ao
// profissional.
//
// A TRAVA QUE ESTE ARQUIVO GUARDA é a de sempre, e aqui ela tem quatro
// nomes concretos: o cliente não subtrai, não divide por DP, não compara
// bruto com P95/P75/P25/P5 e não escolhe faixa etária. Há varredura de
// código no fim do arquivo provando cada uma — não é promessa de comentário.
//
// A CLASSIFICAÇÃO DO FDT NÃO VEM NO CARD, e isso não é esquecimento: os
// cortes mudam a cada faixa etária, e a tabela de faixas do servidor não
// tem norm_set_id. Ela sai em `derived.fdt`, e é de lá que a tela a lê —
// junto com o `z`, que continua vindo do resultado normativo.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  AvaliacaoDetalhe,
  DerivadoFdt,
  InstrumentoDetalhe,
  ResultadoEscala,
} from '@/lib/corrigefacil/api';
import {
  blocosFdt,
  CODIGO_FDT,
  derivadasAusentes,
  derivadoFdt,
  derivadoFdtDoMeta,
  ehFdt,
  fdtParaTexto,
  MEDIDAS_ERRO,
  MEDIDAS_TEMPO,
} from '@/lib/corrigefacil/fdt-derivado';
import {
  brutoValido,
  entradaBrutaDe,
  ESCALAS_CALCULADAS,
  escalaCalculada,
  FAIXA_PELA_IDADE,
  idadeManualDe,
  IDADE_MANUAL_PADRAO,
  montarModelo,
} from '../avaliar/[code]/form-model';
import {
  estadoInicial,
  montarPedido,
  pendencias,
  podeEnviar,
  selectorDoEnvio,
  textoPendencia,
} from '../avaliar/[code]/form-state';
import {
  identificacaoInicial,
  validarIdentificacao,
} from '../avaliar/[code]/save-model';

// ---------------------------------------------------------------------
// o instrumento como o catálogo o entrega
// ---------------------------------------------------------------------

const TEMPOS = ['T_LEITURA', 'T_CONTAGEM', 'T_ESCOLHA', 'T_ALTERNANCIA'];
const ERROS = ['E_LEITURA', 'E_CONTAGEM', 'E_ESCOLHA', 'E_ALTERNANCIA'];
const CALCULADAS = ['INIBICAO', 'FLEXIBILIDADE'];

/** O FDT como a Edge o publica: dez escalas `primaria`, entrada por bruto,
 *  e a dimensão de idade SEM opções — ela não é escolhida numa lista. */
function detalheFdt(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  const escala = (code: string, name: string) => ({
    code,
    name,
    kind: 'primaria',
    description: null,
    bruto_min: CALCULADAS.includes(code) ? -100000 : 0,
    bruto_max: null,
  });
  return {
    code: CODIGO_FDT,
    name: 'Teste dos Cinco Dígitos',
    entry_mode: 'bruto',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [
      escala('T_LEITURA', 'Leitura'),
      escala('T_CONTAGEM', 'Contagem'),
      escala('T_ESCOLHA', 'Escolha'),
      escala('T_ALTERNANCIA', 'Alternância'),
      escala('INIBICAO', 'Inibição'),
      escala('FLEXIBILIDADE', 'Flexibilidade'),
      escala('E_LEITURA', 'Erros — Leitura'),
      escala('E_CONTAGEM', 'Erros — Contagem'),
      escala('E_ESCOLHA', 'Erros — Escolha'),
      escala('E_ALTERNANCIA', 'Erros — Alternância'),
    ],
    itens: [],
    opcoes_resposta: [],
    dimensoes: [{ code: 'idade', label: 'Idade (anos)', manual: false, opcoes: [] }],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

const modelo = () => montarModelo(detalheFdt());

/** Um protocolo completo: os OITO digitados. */
function protocolo(): Record<string, number> {
  return {
    T_LEITURA: 35,
    T_CONTAGEM: 51,
    T_ESCOLHA: 79,
    T_ALTERNANCIA: 94,
    E_LEITURA: 0,
    E_CONTAGEM: 0,
    E_ESCOLHA: 2,
    E_ALTERNANCIA: 3,
  };
}

function estadoCom(brutos: Record<string, number>) {
  return { ...estadoInicial(), brutos };
}

/** O resultado normativo como a Edge o devolve: bruto e z, e a
 *  classificação NULA — ela vive no derivado. */
function resultado(raw: number, z: number | null): ResultadoEscala {
  return {
    raw,
    score: null,
    percentile: null,
    z,
    classification: null,
    available: true,
    message: null,
    flags: [],
  };
}

const RESULTADOS: Record<string, ResultadoEscala> = {
  T_LEITURA: resultado(35, 0.04),
  T_CONTAGEM: resultado(51, 0),
  T_ESCOLHA: resultado(79, 0.02),
  T_ALTERNANCIA: resultado(94, -0.01),
  INIBICAO: resultado(44, 0),
  FLEXIBILIDADE: resultado(59, -0.03),
  E_LEITURA: resultado(0, 0),
  E_CONTAGEM: resultado(0, 0.42),
  E_ESCOLHA: resultado(2, 0.23),
  E_ALTERNANCIA: resultado(3, 0.19),
};

/** O derivado como a Edge o devolve. Sem `z` e sem percentil interpolado. */
const DERIVADO: DerivadoFdt = {
  medidas: Object.fromEntries(
    [...MEDIDAS_TEMPO, ...MEDIDAS_ERRO].map(([code]) => [
      code,
      {
        bruto: RESULTADOS[code].raw as number,
        faixa_percentilica: ERROS.includes(code) ? '≥ P25' : 'P25 a P75',
        classificacao: 'Média',
      },
    ]),
  ),
  derivadas: { INIBICAO: true, FLEXIBILIDADE: true },
};

// =====================================================================
// 1 a 4 · o formulário reconhece o FDT e pede OITO campos
// =====================================================================

describe('FDT · o formulário', () => {
  it('1 · é reconhecido pelo form-model, sem bloqueio', () => {
    const m = modelo();
    expect(m.code).toBe('FDT');
    expect(m.nome).toBe('Teste dos Cinco Dígitos');
    expect(m.entryMode).toBe('bruto');
    expect(m.bloqueio).toBeNull();
  });

  it('2 · mostra OITO campos, não dez', () => {
    const codes = modelo().escalas.map((e) => e.code);
    expect(codes).toHaveLength(8);
    expect(codes).toEqual([...TEMPOS, ...ERROS]);
  });

  it('3 · não mostra INIBICAO como campo', () => {
    expect(modelo().escalas.map((e) => e.code)).not.toContain('INIBICAO');
    expect(escalaCalculada('FDT', 'INIBICAO')).toBe(true);
  });

  it('4 · não mostra FLEXIBILIDADE como campo', () => {
    expect(modelo().escalas.map((e) => e.code)).not.toContain('FLEXIBILIDADE');
    expect(escalaCalculada('FDT', 'FLEXIBILIDADE')).toBe(true);
  });

  it('as duas calculadas também não viajam no corpo do envio', () => {
    // nem quando alguém as põe no estado: `montarPedido` percorre
    // `modelo.escalas`, e elas não estão lá
    const estado = estadoCom({ ...protocolo(), INIBICAO: 999, FLEXIBILIDADE: 999 });
    const pedido = montarPedido(modelo(), estado, '7');
    expect(Object.keys(pedido.brutos ?? {})).toEqual([...TEMPOS, ...ERROS]);
  });

  it('o mapa das calculadas é fechado: só o FDT está nele', () => {
    expect(Object.keys(ESCALAS_CALCULADAS)).toEqual(['FDT']);
    expect(escalaCalculada('TRILHAS', 'INIBICAO')).toBe(false);
  });
});

// =====================================================================
// 5 a 8 · a régua de cada campo
// =====================================================================

describe('FDT · o que cada campo aceita', () => {
  it('5 · tempos aceitam decimal', () => {
    for (const code of TEMPOS) {
      const regra = entradaBrutaDe('FDT', code);
      expect(regra?.decimal).toBe(true);
      expect(regra?.unidade).toBe('segundos');
      expect(brutoValido(28.4, regra)).toBe(true);
    }
    const estado = estadoCom({ ...protocolo(), T_LEITURA: 28.4 });
    expect(pendencias(modelo(), estado)).toEqual([]);
    expect(montarPedido(modelo(), estado, '7').brutos?.T_LEITURA).toBe(28.4);
  });

  it('6 · tempo zero ou negativo é recusado — como UX, não como norma', () => {
    const regra = entradaBrutaDe('FDT', 'T_LEITURA');
    expect(brutoValido(0, regra)).toBe(false);
    expect(brutoValido(-3, regra)).toBe(false);

    const estado = estadoCom({ ...protocolo(), T_LEITURA: 0 });
    const lista = pendencias(modelo(), estado);
    expect(lista).toEqual([{ tipo: 'escalas_invalidas', faltam: ['T_LEITURA'] }]);
    expect(textoPendencia(lista)).toBe('corrija: T_LEITURA');
    expect(podeEnviar(modelo(), estado, false)).toBe(false);
    // e o valor recusado NÃO é enviado: quem valida de verdade é o
    // servidor, e mandar 0 para ele receber 422 seria pior UX, não melhor
    expect(montarPedido(modelo(), estado, '7').brutos).not.toHaveProperty(
      'T_LEITURA',
    );
  });

  it('7 · erros aceitam inteiro maior ou igual a zero', () => {
    for (const code of ERROS) {
      const regra = entradaBrutaDe('FDT', code);
      expect(regra?.decimal).toBe(false);
      expect(brutoValido(0, regra)).toBe(true);
      expect(brutoValido(7, regra)).toBe(true);
      expect(brutoValido(-1, regra)).toBe(false);
    }
    // zero em todos os erros é protocolo COMPLETO: não errar é o normal
    expect(pendencias(modelo(), estadoCom(protocolo()))).toEqual([]);
  });

  it('8 · erro decimal é recusado', () => {
    expect(brutoValido(1.5, entradaBrutaDe('FDT', 'E_ESCOLHA'))).toBe(false);
    const estado = estadoCom({ ...protocolo(), E_ESCOLHA: 1.5 });
    expect(pendencias(modelo(), estado)).toEqual([
      { tipo: 'escalas_invalidas', faltam: ['E_ESCOLHA'] },
    ]);
    expect(podeEnviar(modelo(), estado, false)).toBe(false);
  });

  it('a régua não vazou para os outros instrumentos', () => {
    expect(entradaBrutaDe('TRILHAS', 'TOTAL')).toBeNull();
    // sem régua declarada, qualquer número finito passa, como sempre passou
    expect(brutoValido(-5, null)).toBe(true);
    expect(brutoValido(1.5, null)).toBe(true);
  });
});

// =====================================================================
// 9 e 10 · idade
// =====================================================================

describe('FDT · a idade', () => {
  it('9 · a idade é exigida antes de salvar', () => {
    const m = modelo();
    expect(m.exigeDataNascimento).toBe(false);
    const semIdade = { ...identificacaoInicial(), nome: 'A. B.' };
    expect(validarIdentificacao(semIdade, m)).toContain('idade_vazia');
    const comIdade = { ...semIdade, idadeAnos: '7' };
    expect(validarIdentificacao(comIdade, m)).toEqual([]);
  });

  it('9b · a idade em anos vai CRUA no norm_selector, como número', () => {
    const selector = selectorDoEnvio(modelo(), estadoInicial(), '30');
    expect(selector).toEqual({ idade: 30 });
    const pedido = montarPedido(modelo(), estadoCom(protocolo()), '30');
    expect(pedido.norm_selector).toEqual({ idade: 30 });
  });

  it('10 · não existe seletor de faixa etária na tela', () => {
    // a dimensão `idade` chega SEM opções, e dimensão sem opção não é
    // escolhida pelo profissional — nenhuma faixa aparece
    expect(modelo().dimensoes).toEqual([]);
    expect(pendencias(modelo(), estadoCom(protocolo()))).toEqual([]);
    // e nenhuma das nove faixas é nomeada no cliente
    const regra = FAIXA_PELA_IDADE.FDT;
    expect(regra).toEqual({ dimensao: 'idade', quando: null, chave: 'idade' });
  });

  it('idade fora de 6..92 é ENVIADA: quem diz que não há norma é o servidor', () => {
    // a tela não tem a tabela de faixas e não escolhe faixa vizinha
    expect(idadeManualDe('FDT')).toEqual(IDADE_MANUAL_PADRAO);
    expect(selectorDoEnvio(modelo(), estadoInicial(), '5')).toEqual({ idade: 5 });
    expect(selectorDoEnvio(modelo(), estadoInicial(), '93')).toEqual({ idade: 93 });
  });

  it('a indisponibilidade que aparece é a MENSAGEM do servidor', () => {
    const semNorma: ResultadoEscala = {
      ...resultado(35, null),
      available: false,
      message: 'não há norma publicada para esta idade neste domínio',
    };
    const blocos = blocosFdt('FDT', null, { T_LEITURA: semNorma });
    expect(blocos?.[0].linhas[0].indisponivel).toBe(
      'não há norma publicada para esta idade neste domínio',
    );
    expect(blocos?.[0].linhas[0].classificacao).toBeNull();
  });
});

// =====================================================================
// 11 · o derivado é só apresentado
// =====================================================================

describe('FDT · derived.fdt', () => {
  it('11 · é lido da resposta e do snapshot congelado, sem recálculo', () => {
    expect(derivadoFdt({ derived: { fdt: DERIVADO } })).toBe(DERIVADO);
    expect(derivadoFdt({ derived: {} })).toBeNull();
    expect(derivadoFdt(null)).toBeNull();
    // o caminho do Relatório Pró: a MESMA chave reservada do CONFIAS e do
    // PHQ-9, lida de `subject_meta`
    expect(derivadoFdtDoMeta({ _corrigefacil: { fdt: DERIVADO } })).toBe(DERIVADO);
    expect(derivadoFdtDoMeta({})).toBeNull();
  });

  it('11b · a classificação exibida é EXATAMENTE a que veio', () => {
    const proprio: DerivadoFdt = {
      medidas: {
        T_LEITURA: {
          bruto: 35,
          faixa_percentilica: 'P75 a P95',
          classificacao: 'Média superior',
        },
      },
      derivadas: { INIBICAO: true, FLEXIBILIDADE: true },
    };
    const linha = blocosFdt('FDT', proprio, RESULTADOS)?.[0].linhas[0];
    expect(linha?.faixa).toBe('P75 a P95');
    expect(linha?.classificacao).toBe('Média superior');
    // e o z continua sendo o do resultado normativo, não uma segunda conta
    expect(linha?.z).toBe(RESULTADOS.T_LEITURA.z);
  });

  it('devolve null fora do FDT — os outros 20 não ganham bloco', () => {
    expect(ehFdt('PHQ-9')).toBe(false);
    expect(blocosFdt('PHQ-9', DERIVADO, RESULTADOS)).toBeNull();
    expect(blocosFdt(null, DERIVADO, RESULTADOS)).toBeNull();
  });
});

// =====================================================================
// 17 · as dez medidas, em dois blocos
// =====================================================================

describe('FDT · a apresentação do resultado', () => {
  it('17 · apresenta as DEZ medidas recebidas, em tempo e erros', () => {
    const blocos = blocosFdt('FDT', DERIVADO, RESULTADOS);
    expect(blocos).toHaveLength(2);
    expect(blocos?.[0].linhas.map((l) => l.code)).toEqual(
      MEDIDAS_TEMPO.map(([c]) => c),
    );
    expect(blocos?.[1].linhas.map((l) => l.code)).toEqual(
      MEDIDAS_ERRO.map(([c]) => c),
    );
    const total = (blocos ?? []).reduce((n, b) => n + b.linhas.length, 0);
    expect(total).toBe(10);
  });

  it('Inibição e Flexibilidade aparecem como RESULTADO, com bruto e z', () => {
    const tempo = blocosFdt('FDT', DERIVADO, RESULTADOS)?.[0];
    const inibicao = tempo?.linhas.find((l) => l.code === 'INIBICAO');
    expect(inibicao?.nome).toBe('Inibição');
    expect(inibicao?.bruto).toBe(44);
    expect(inibicao?.z).toBe(0);
    expect(inibicao?.classificacao).toBe('Média');
  });

  it('componente que faltou deixa a ausência LEGÍVEL', () => {
    const semLeitura: DerivadoFdt = {
      medidas: { T_ESCOLHA: DERIVADO.medidas.T_ESCOLHA },
      derivadas: { INIBICAO: false, FLEXIBILIDADE: false },
    };
    expect(derivadasAusentes(semLeitura)).toEqual(['Inibição', 'Flexibilidade']);
    const blocos = blocosFdt('FDT', semLeitura, { T_ESCOLHA: RESULTADOS.T_ESCOLHA });
    expect(blocos?.[0].linhas.map((l) => l.code)).toEqual(['T_ESCOLHA']);
  });

  it('16 · nenhuma linha carrega percentil interpolado', () => {
    const blocos = blocosFdt('FDT', DERIVADO, RESULTADOS) ?? [];
    for (const bloco of blocos) {
      for (const linha of bloco.linhas) {
        expect(Object.keys(linha).sort((a, b) => a.localeCompare(b))).toEqual([
          'bruto',
          'classificacao',
          'code',
          'faixa',
          'indisponivel',
          'nome',
          'z',
        ]);
      }
    }
  });
});

// =====================================================================
// 18 · histórico e documento leem o congelado
// =====================================================================

describe('FDT · histórico e documento', () => {
  it('18 · o histórico usa o snapshot congelado, não um recálculo', () => {
    const gravada = {
      instrument: 'FDT',
      resultados: RESULTADOS,
      derived: { fdt: DERIVADO },
    } as unknown as AvaliacaoDetalhe;
    const blocos = blocosFdt(gravada.instrument, derivadoFdt(gravada), gravada.resultados);
    // as MESMAS faixas e as MESMAS classificações do resultado imediato
    const imediato = blocosFdt('FDT', DERIVADO, RESULTADOS);
    expect(blocos).toEqual(imediato);
  });

  it('o texto do Relatório Pró é transcrição, sem tabela normativa', () => {
    const texto = fdtParaTexto(DERIVADO) ?? '';
    expect(texto).toContain('Leitura: 35');
    expect(texto).toContain('Média');
    // o RÓTULO da faixa ("P25 a P75") é resultado e vai junto — foi o
    // servidor que o escolheu. O que não pode ir é a TABELA: média, DP e o
    // valor em segundos de cada ponto percentílico. Nenhum deles chega ao
    // cliente, e por isso nenhum pode aparecer aqui.
    expect(texto).not.toMatch(/desvio|DP|média normativa/i);
    // e o texto é feito SÓ do que veio no derivado: todo número impresso é
    // um bruto que o servidor mandou
    const numeros = (texto.match(/\d+(?:[.,]\d+)?/g) ?? []).map(Number);
    const brutos = Object.values(DERIVADO.medidas).map((m) => m.bruto);
    for (const n of numeros) {
      if (n === 25 || n === 75) continue; // fazem parte do rótulo da faixa
      expect(brutos).toContain(n);
    }
    expect(fdtParaTexto(null)).toBeNull();
  });
});

// =====================================================================
// 12 a 15 · o que o cliente NÃO faz — varredura de código
// =====================================================================

function leia(...partes: string[]): string {
  return readFileSync(join(process.cwd(), ...partes), 'utf8');
}

const FONTES_FDT = [
  leia('src', 'lib', 'corrigefacil', 'fdt-derivado.ts'),
  leia('src', 'app', 'app', 'corrigefacil', 'FdtDerivado.tsx'),
];

describe('FDT · o cliente não calcula', () => {
  it('12 e 13 · não existe fórmula de Inibição nem de Flexibilidade', () => {
    for (const fonte of FONTES_FDT) {
      const codigo = semComentarios(fonte);
      // nenhuma subtração entre medidas: a conta é do servidor
      expect(codigo).not.toMatch(/T_ESCOLHA\s*-\s*T_LEITURA/);
      expect(codigo).not.toMatch(/T_ALTERNANCIA\s*-\s*T_LEITURA/);
      expect(codigo).not.toMatch(/bruto\s*-\s*\w*bruto/i);
    }
  });

  it('14 · não existe cálculo de z', () => {
    for (const fonte of FONTES_FDT) {
      const codigo = semComentarios(fonte);
      expect(codigo).not.toMatch(/\bmean\b|\bmedia\b|\bsd\b|\bdp\b/i);
      expect(codigo).not.toMatch(/\/\s*(sd|dp)\b/i);
    }
  });

  it('15 · nenhum corte P95/P75/P50/P25/P5 no cliente', () => {
    for (const fonte of FONTES_FDT) {
      const codigo = semComentarios(fonte);
      expect(codigo).not.toMatch(/\bP(95|75|50|25|5)\b/);
    }
  });

  it('16b · a palavra percentil_interpolado não existe no cliente', () => {
    for (const fonte of FONTES_FDT) {
      expect(fonte).not.toContain('percentil_interpolado');
    }
    // nem no contrato: o campo não existe no tipo
    expect(leia('src', 'lib', 'corrigefacil', 'api.ts')).not.toContain(
      'percentil_interpolado',
    );
  });

  it('os rótulos são só rótulos: nenhum número normativo no mapa', () => {
    const rotulos = [...MEDIDAS_TEMPO, ...MEDIDAS_ERRO].map(([, n]) => n);
    for (const r of rotulos) expect(r).not.toMatch(/\d/);
  });
});

/** O código sem comentários: as travas são sobre o que EXECUTA, e a
 *  documentação deste produto cita nomes de propósito. */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

// =====================================================================
// 19 e 20 · o que NÃO podia ser mexido
// =====================================================================

describe('FDT · o que continua como estava', () => {
  it('19 · o FDT antigo da biblioteca continua desativado e intocado', () => {
    // O produto `fdt` de public.products foi desativado no PR #96 e NÃO é
    // este instrumento. Nada nesta entrega o menciona, o reativa ou o
    // restaura — o FDT desta tarefa é instrumento do CorrigeFácil, e vive
    // no catálogo da Edge, não na tabela de produtos da biblioteca.
    for (const fonte of FONTES_FDT) {
      expect(fonte).not.toContain('public.products');
      expect(fonte).not.toContain('45c48fe4-6913-44e9-87f3-a786e40ef295');
      expect(fonte).not.toMatch(/from\(['"]products['"]\)/);
    }
  });

  it('20 · o TDF não é reintroduzido em lugar nenhum', () => {
    for (const fonte of FONTES_FDT) {
      expect(fonte).not.toMatch(/\bTDF\b/);
    }
    expect(ehFdt('TDF')).toBe(false);
    expect(escalaCalculada('TDF', 'INIBICAO')).toBe(false);
  });

  it('os outros instrumentos desenham exatamente os mesmos campos', () => {
    // um instrumento de bruto que não está em nenhum dos mapas novos
    const outro = montarModelo(
      detalheFdt({
        code: 'TRILHAS',
        name: 'Trilhas Pré-Escolares',
        dimensoes: [],
      }),
    );
    // as dez escalas continuam sendo campo para ele: só o FDT perde duas
    expect(outro.escalas).toHaveLength(10);
    expect(outro.escalas.every((e) => e.entrada === null)).toBe(true);
    expect(selectorDoEnvio(outro, estadoInicial(), '30')).toEqual({});
  });
});
