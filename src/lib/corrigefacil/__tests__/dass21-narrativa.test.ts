// =====================================================================
// DASS-21 · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-4
//
// Quarto piloto da mesma arquitetura, e segundo (depois do BPA-2) a
// reusar `instrumentCode` em vez de abrir um `comDass21` na assinatura de
// `buildCorrigeFacilSystemPrompt` — a prova de que o mecanismo generaliza
// sem crescer a assinatura da função a cada instrumento novo.
//
// MESMA FAMÍLIA ESTRUTURAL DO BPA-2: a DASS-21 também não tem snapshot.
// Depressão, Ansiedade e Estresse chegam com bruto, percentil (quando
// houver) e classificação já na tabela de resultados de sempre. Não há
// REGRA_DASS21 pelo mesmo motivo que não há REGRA_BPA2: nada a congelar.
//
// A DIFERENÇA SEMÂNTICA QUE IMPORTA: a DASS-21 não soma. O controlador
// registra isso como correção deliberada — "não há escore total: as três
// escalas são independentes e a planilha não soma uma na outra" — e é
// exatamente o tipo de ausência que convida o modelo a inventar
// "resultado geral" a partir de três números lado a lado. No FDT essa
// trava só nasceu depois de um relatório real produzir "resultado global
// do FDT"; aqui ela entra no primeiro commit, e este arquivo prova que
// entrou.
//
// AS DUAS TRAVAS QUE ESTE ARQUIVO GUARDA, iguais às dos três pilotos
// anteriores:
//
//   1. escopo — o mapa só existe quando `instrumentCode === 'DASS-21'`.
//      Com qualquer outro valor o prompt dos outros instrumentos é BYTE
//      A BYTE o que era, e o sha256 dos quatro destinos é o MESMO já
//      usado nos três pilotos anteriores.
//
//   2. fronteira — o mapa não abre exceção à REGRA CENTRAL, e a ausência
//      de escore total é tratada como fato do instrumento, não como
//      lacuna a preencher.
//
// Nenhum teste daqui chama a OpenAI.
// =====================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCorrigeFacilSystemPrompt,
  formatClosedResults,
} from '@/lib/corrigefacil/report-generator';

function leia(...partes: string[]): string {
  return readFileSync(join(process.cwd(), ...partes), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const GERADOR = leia('src', 'lib', 'corrigefacil', 'report-generator.ts');

const DESTINOS = ['family', 'school', 'technical', 'internal'] as const;
type Destino = (typeof DESTINOS)[number];

/** O prompt da DASS-21 e o prompt de quem não é DASS-21. Os três outros
 *  sinalizadores ficam em false: o que se mede aqui é o efeito do
 *  `instrumentCode` sozinho. */
const prompt = (codigo: string, destino: Destino = 'technical'): string =>
  buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, false, codigo);

const MARCA_PERFIL = 'COMO LER A DASS-21 — PERFIL INTERPRETATIVO:';

const P = prompt('DASS-21');

// =====================================================================
// 1 · ESCOPO — o mapa entra só com o código certo
// =====================================================================

describe('DASS-21 narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="DASS-21", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('DASS-21', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa da DASS-21', () => {
    for (const codigo of ['', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'dass-21', 'DASS21']) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · FDT, CONFIAS, PHQ-9 e BPA-2 sozinhos não recebem o mapa da DASS-21', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    for (const p of [soFdt, soConfias, soPhq9, soBpa2]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('DASS-21');
    }
  });

  it('5 · a DASS-21 sozinha não menciona FDT, CONFIAS, PHQ-9 nem BPA-2', () => {
    expect(P).not.toContain('FDT');
    expect(P).not.toContain('CONFIAS');
    expect(P).not.toContain('PHQ-9');
    expect(P).not.toContain('BPA-2');
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
  });

  it('6 · não existe REGRA_DASS21: a DASS-21 não tem snapshot para congelar', () => {
    // mesma ressalva do BPA-2: a ausência é documentada em PROSA no
    // comentário do bloco (que por isso contém a string) — o que não
    // pode existir é a DECLARAÇÃO
    expect(GERADOR).not.toMatch(/const REGRA_DASS-?21/);
    expect(GERADOR).not.toContain('REGRA_DASS21 :');
    expect(GERADOR).not.toContain('REGRA_DASS21 +');
  });

  it('7 · reusa o MESMO parâmetro `instrumentCode`, sem crescer a assinatura', () => {
    // nenhum quarto/quinto parâmetro booleano nomeado comDass21
    expect(GERADOR).not.toMatch(/comDass21\s*=\s*false,/);
    // e o local const compara o MESMO parâmetro que o BPA-2 já usa
    expect(GERADOR).toContain(
      'const comDass21 = instrumentCode === CODIGO_DASS21;',
    );
    expect(GERADOR).toContain(
      "${comBpa2 ? PERFIL_INTERPRETATIVO_BPA2 : ''}${comDass21 ? PERFIL_INTERPRETATIVO_DASS21 : ''}",
    );
    // só existe UMA declaração de `instrumentCode =` na assinatura inteira
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · a chamada real já alimenta os dois: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    // um único argumento de código, reaproveitado pelos dois comX locais
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('9 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('DASS-21', destino).match(/^## /gm) ?? []).length, destino)
        .toBe(5);
    }
  });
});

// =====================================================================
// 2 · O PROMPT DOS OUTROS INSTRUMENTOS — sha256, não confiança
//
// Os quatro sha são os MESMOS já usados nos três arquivos anteriores: se
// qualquer regra global tivesse mudado em qualquer uma das quatro fases,
// um deles já teria denunciado.
// =====================================================================

const SHA_SEM_DERIVADO: Record<Destino, string> = {
  family:
    'ba98ab412b19525a91281ed20182dd658479871388529358e6e354f704ece144',
  school:
    '5def67016c76f8dd3a3adf63419e65dc35e333d8310026f10faa9d6fd6bfc1f5',
  technical:
    '212acbbffa6b61fc69380a2c1eeda5b14c0878203ebeeb3c58abf85eaff1e3ba',
  internal:
    'b72f06329f11b957eccb3fd18e88eb4b7a78f576c53b36764f9001069f9a9e79',
};

describe('DASS-21 narrativa · o prompt dos outros instrumentos não mudou', () => {
  it('10 · os quatro destinos batem byte a byte com o baseline', () => {
    for (const destino of DESTINOS) {
      const sha = createHash('sha256')
        .update(buildCorrigeFacilSystemPrompt(destino, 'AVISO'), 'utf8')
        .digest('hex');
      expect(sha, destino).toBe(SHA_SEM_DERIVADO[destino]);
    }
  });

  it('11 · chamar sem instrumentCode é o mesmo que chamá-lo vazio', () => {
    for (const destino of DESTINOS) {
      expect(buildCorrigeFacilSystemPrompt(destino, 'AVISO'), destino).toBe(
        buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, false, ''),
      );
    }
  });
});

// =====================================================================
// 3 · NÃO HÁ ESCORE TOTAL — a trava central deste piloto
// =====================================================================

describe('DASS-21 narrativa · não existe escore total', () => {
  it('12 · o prompt declara a ausência de escore total como fato do instrumento', () => {
    expect(P).toContain('A DASS-21 NÃO TEM ESCORE TOTAL');
    expect(P).toContain(
      'Depressão, Ansiedade e Estresse são escalas INDEPENDENTES: o instrumento não soma uma na outra',
    );
    expect(P).toContain('não produz gravidade global');
    expect(P).toContain('não produz classificação geral');
    expect(P).toContain('não produz índice composto das três');
  });

  it('13 · proíbe as cinco formulações que sugerem soma ou classificação única', () => {
    for (const proibida of [
      '"resultado global da DASS-21"',
      '"gravidade global"',
      '"escore total da DASS-21"',
      '"perfil geral severo"',
      '"quadro geral moderado"',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
    expect(P).toContain(
      'a regra é SEMÂNTICA: qualquer formulação que leve o leitor a esperar um número único da DASS-21 tem o mesmo defeito',
    );
  });

  it('14 · oferece as alternativas semânticas corretas', () => {
    for (const alternativa of [
      'o conjunto dos resultados',
      'a configuração das três dimensões',
      'o perfil observado nas escalas',
      'a distribuição entre as dimensões',
    ]) {
      expect(P, alternativa).toContain(alternativa);
    }
  });

  it('15 · o mapa proíbe somar as escalas nas mesmas palavras que proíbe recalcular', () => {
    expect(P).toContain(
      'nada aqui autoriza recalcular, reclassificar, somar escalas ou concluir sobre a pessoa',
    );
  });
});

// =====================================================================
// 4 · O MAPA SEMÂNTICO — as três escalas
// =====================================================================

describe('DASS-21 narrativa · o mapa semântico', () => {
  it('16 · Depressão, Ansiedade e Estresse são nomeadas como dimensões separadas', () => {
    expect(P).toContain(
      'Depressão, Ansiedade e Estresse são dimensões SEPARADAS dentro da DASS-21',
    );
    expect(P).toContain('cada uma com sua própria classificação');
    expect(P).toContain('O rótulo pertence À ESCALA, não à pessoa');
  });

  it('17 · proíbe converter escala em diagnóstico', () => {
    expect(P).toContain('NÃO escreva "tem depressão"');
    expect(P).toContain('"apresenta transtorno de ansiedade"');
    expect(P).toContain('"está severamente estressado"');
    expect(P).toContain('"quadro depressivo"');
    expect(P).toContain('nem "transtorno ansioso"');
  });

  it('18 · oferece as formulações corretas por escala', () => {
    expect(P).toContain(
      'na escala de Depressão da DASS-21, o resultado foi classificado como',
    );
    expect(P).toContain(
      'neste protocolo, a dimensão de Ansiedade apresentou classificação',
    );
  });

  it('19 · "Severo" e "Extremamente severo" não viram conclusão automática', () => {
    expect(P).toContain(
      '"Severo" e "Extremamente severo" são classificação da dimensão NESTE instrumento',
    );
    expect(P).toContain(
      'não significam automaticamente transtorno severo, quadro grave, risco, urgência ou incapacidade funcional',
    );
    expect(P).toContain('o rótulo recebido deve ser preservado exatamente como veio, sem gradação própria');
  });

  it('20 · o mapa se declara vocabulário, não característica da pessoa', () => {
    expect(P).toContain(
      'O QUE CADA ESCALA REPRESENTA (vocabulário do instrumento, não característica da pessoa)',
    );
  });
});

// =====================================================================
// 5 · OS CINCO PASSOS DE RACIOCÍNIO
// =====================================================================

describe('DASS-21 narrativa · os cinco passos', () => {
  it('21 · distribuição, convergência, divergência, destaque, mensagem', () => {
    for (const passo of [
      '1. DISTRIBUIÇÃO',
      '2. CONVERGÊNCIA',
      '3. DIVERGÊNCIA',
      '4. DIMENSÃO DE DESTAQUE',
      '5. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. DISTRIBUIÇÃO'),
      P.indexOf('2. CONVERGÊNCIA'),
      P.indexOf('3. DIVERGÊNCIA'),
      P.indexOf('4. DIMENSÃO DE DESTAQUE'),
      P.indexOf('5. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('22 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('23 · divergência autoriza nomear, proíbe causalidade entre dimensões', () => {
    expect(P).toContain('existe contraste real?');
    expect(P).toContain(
      'as três dimensões apresentam distribuição heterogênea, com maior elevação relativa numa delas',
    );
    expect(P).toContain('só quando os dados sustentarem');
    expect(P).toContain('NÃO diga que uma dimensão está causando outra');
    expect(P).toContain('nem escreva qualquer explicação causal entre elas');
  });

  it('24 · dimensão de destaque é ancorada no instrumento, não na pessoa', () => {
    expect(P).toContain('ela pode ser destacada, sempre ancorada em "no instrumento", "nesta escala" ou "neste protocolo"');
    expect(P).toContain('Não a transforme em característica global da pessoa');
  });

  it('25 · a mensagem central exige sustentação real nos dados', () => {
    expect(P).toContain('escolha UMA configuração para organizar Síntese e Análise');
    expect(P).toContain('Só o que os dados realmente mostrarem');
  });
});

// =====================================================================
// 6 · AS CINCO SEÇÕES
// =====================================================================

describe('DASS-21 narrativa · o que muda em cada seção', () => {
  it('26 · a síntese responde configuração, dispensa pontuação exata repetida', () => {
    expect(P).toContain('qual é a configuração principal desta DASS-21?');
    expect(P).toContain(
      'não "Depressão = X, Ansiedade = Y, Estresse = Z" como tabela em prosa',
    );
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain(
      'As pontuações exatas não precisam ser repetidas quando a tabela já as apresenta',
    );
  });

  it('27 · a análise relaciona as três dimensões, sem causa nem diagnóstico', () => {
    expect(P).toContain('relacione as três dimensões entre si');
    expect(P).toContain('NÃO é permitido explicar causa, inferir diagnóstico, inferir duração, inferir etiologia');
    expect(P).toContain('inferir funcionamento cotidiano, inferir risco, inferir prejuízo escolar ou profissional');
    expect(P).toContain('nem afirmar transtorno');
  });

  it('28 · o contexto considera as três separadamente quando heterogêneo', () => {
    expect(P).toContain('pode orientar que as três dimensões sejam consideradas SEPARADAMENTE');
    expect(P).toContain('perfil homogêneo não inventa diferença');
    expect(P).toContain('O destino ajusta a LINGUAGEM, nunca a interpretação psicométrica');
    expect(P).toContain(
      'Não prescreva psicoterapia, psiquiatria, medicação, afastamento, intervenção escolar ou protocolo clínico',
    );
  });

  it('29 · as recomendações passam pelo teste da causa e não têm piso', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração da DASS-21?');
    expect(P).toContain(
      'Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra',
    );
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
    expect(P).toContain('uma recomendação específica pode ser suficiente');
    expect(P).toContain('Não fabrique conduta clínica');
  });

  it('30 · as considerações finais fecham a mensagem central, sem escore novo', () => {
    expect(P).toContain('Nas Considerações finais, feche a MENSAGEM CENTRAL');
    expect(P).toContain('Não crie escore global, não crie diagnóstico');
    expect(P).toContain('não resuma as três linhas de novo');
  });
});

// =====================================================================
// 7 · O QUE O MAPA PROÍBE, MESMO NOS EXTREMOS
// =====================================================================

describe('DASS-21 narrativa · o que o mapa proíbe', () => {
  it('31 · proíbe inferir diagnóstico clínico a partir de qualquer classificação', () => {
    expect(P).toContain(
      'O QUE NUNCA SE FAZ COM AS ESCALAS DA DASS-21, mesmo com classificação extrema:',
    );
    expect(P).toContain(
      'Não infira depressão clínica, transtorno de ansiedade ou transtorno relacionado ao estresse',
    );
  });

  it('32 · proíbe risco, urgência, funcionamento cotidiano e causalidade entre dimensões', () => {
    expect(P).toContain('Não infira risco, urgência, funcionamento cotidiano nem causalidade entre as dimensões');
    expect(P).toContain('"Extremamente severo" não vira conclusão de urgência');
    expect(P).toContain('uma classificação elevada numa escala não explica a de outra');
  });

  it('33 · proíbe leitura item a item e não inventa regra de item', () => {
    expect(P).toContain('A DASS-21 tem 21 itens');
    expect(P).toContain('não crie leitura item a item');
    expect(P).toContain('não destaque conteúdo de item específico');
    expect(P).toContain('não invente regra de item para a DASS-21');
    expect(P).toContain('este instrumento não tem nenhuma nesta arquitetura');
    // e nenhum instrumento vizinho é citado como comparação
    expect(P).not.toContain('item 9');
  });

  it('34 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['na DASS-21', 'neste protocolo', 'nesta escala']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('35 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain(
      'não alongue o texto, não escreva Depressão, Ansiedade e Estresse como tabela em prosa e não acrescente cautela nova',
    );
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('36 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain(
      'nada aqui autoriza recalcular, reclassificar, somar escalas ou concluir sobre a pessoa',
    );
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
    expect(P).toContain('Não determine pontos de corte');
  });
});

// =====================================================================
// 8 · NENHUM CORTE NUMÉRICO ENTROU NO MAPA
// =====================================================================

describe('DASS-21 narrativa · nenhum ponto de corte entrou no mapa', () => {
  it('37 · nenhum número de corte aparece no prompt', () => {
    expect(P).not.toMatch(/\d+\s*(a|-|–)\s*\d+\s*pontos/i);
    expect(P).not.toContain('ponto de corte');
  });

  it('38 · nenhuma comparação de bruto com corte é sugerida', () => {
    expect(P).not.toMatch(/pontuação\s*(>=|<=|>|<)\s*\d/i);
  });
});

// =====================================================================
// 9 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('DASS-21 narrativa · a origem comercial não entra no conteúdo', () => {
  it('39 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_DASS21');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 10 · ESCOPO — nada fora do prompt mudou, e os três pilotos anteriores seguem de pé
// =====================================================================

describe('DASS-21 narrativa · nada fora do prompt mudou', () => {
  it('40 · FDT, CONFIAS e BPA-2 continuam intocados', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    expect(soFdt).toContain('COMO LER O FDT — PERFIL INTERPRETATIVO:');
    expect(soFdt).toContain('DADOS DERIVADOS CONGELADOS DO FDT:');
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    expect(soConfias).toContain('COMO LER O CONFIAS — PERFIL INTERPRETATIVO:');
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    expect(soBpa2).toContain('COMO LER O BPA-2 — PERFIL INTERPRETATIVO:');
    expect(soBpa2).toContain('O BRUTO PODE SER NEGATIVO');
  });

  it('41 · nenhum módulo derivado dos outros pilotos ganhou DASS-21', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('DASS-21');
      expect(fonte, arquivo.join('/')).not.toContain('DASS21');
    }
  });

  it('42 · nenhum arquivo de item/peso/cálculo da DASS-21 existe no psico2', () => {
    // este piloto é só o prompt: não deveria ter nascido nenhum módulo
    // "dass21-derivado.ts" nem equivalente
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'dass21-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'dass-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });
});

// =====================================================================
// 11 · OS CINCO CENÁRIOS PEDIDOS
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados da DASS-21 usam — não há bloco derivado a simular.
// Nenhum destes valores está no prompt de produção: o teste 47 prova
// isso linha a linha.
// =====================================================================

type LinhaDass21 = {
  code: 'DEPRESSAO' | 'ANSIEDADE' | 'ESTRESSE';
  name: string;
  ordinal: number;
  raw: number;
  classification: string;
};

function linha(l: LinhaDass21) {
  return {
    raw: l.raw,
    score: null,
    percentile: null,
    z_score: null,
    classification: l.classification,
    ci95: null,
    available: true,
    message: null,
    flags: [],
    scales: { code: l.code, name: l.name, ordinal: l.ordinal },
  };
}

const ESCALAS = {
  DEPRESSAO: 'Depressão',
  ANSIEDADE: 'Ansiedade',
  ESTRESSE: 'Estresse',
};

function protocolo(
  classificacoes: Record<'DEPRESSAO' | 'ANSIEDADE' | 'ESTRESSE', string>,
) {
  const ordinais = { DEPRESSAO: 0, ANSIEDADE: 1, ESTRESSE: 2 } as const;
  return (['DEPRESSAO', 'ANSIEDADE', 'ESTRESSE'] as const).map((code) =>
    linha({
      code,
      name: ESCALAS[code],
      ordinal: ordinais[code],
      raw: 10,
      classification: classificacoes[code],
    }),
  );
}

const CENARIOS = {
  /** A — homogêneo normal */
  homogeneoNormal: protocolo({
    DEPRESSAO: 'Normal', ANSIEDADE: 'Normal', ESTRESSE: 'Normal',
  }),
  /** B — homogêneo elevado (as três em Severo) */
  homogeneoElevado: protocolo({
    DEPRESSAO: 'Severo', ANSIEDADE: 'Severo', ESTRESSE: 'Severo',
  }),
  /** C — heterogêneo, com Estresse mais elevado */
  heterogeneo: protocolo({
    DEPRESSAO: 'Normal', ANSIEDADE: 'Moderado', ESTRESSE: 'Severo',
  }),
  /** D — uma dimensão destoante (Estresse extremamente severo) */
  umaDestoante: protocolo({
    DEPRESSAO: 'Normal', ANSIEDADE: 'Normal', ESTRESSE: 'Extremamente severo',
  }),
} as const;

describe('DASS-21 narrativa · os cinco cenários', () => {
  it('43 · A homogêneo normal · síntese curta autorizada, sem contraste forçado', () => {
    const texto = formatClosedResults(CENARIOS.homogeneoNormal, 'DASS-21');
    expect(texto.match(/Normal/g)?.length).toBeGreaterThanOrEqual(3);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('homogênea');
    // e nada no mapa força um contraste que os dados não têm
    expect(P).toContain('só quando os dados sustentarem');
  });

  it('44 · B homogêneo elevado · concentração reconhecida, sem gravidade global nem diagnóstico', () => {
    const texto = formatClosedResults(CENARIOS.homogeneoElevado, 'DASS-21');
    expect(texto.match(/Severo/g)?.length).toBe(3);
    // o vocabulário para reconhecer concentração existe
    expect(P).toContain('concentração nas faixas superiores');
    // "gravidade global" continua proibida mesmo com as três no mesmo patamar
    expect(P).toContain('"gravidade global"');
    expect(P).toContain('Não infira depressão clínica, transtorno de ansiedade ou transtorno relacionado ao estresse');
  });

  it('45 · C heterogêneo · distribuição heterogênea nomeável, sem causalidade', () => {
    const texto = formatClosedResults(CENARIOS.heterogeneo, 'DASS-21');
    expect(texto).toContain('classificação: Normal');
    expect(texto).toContain('classificação: Moderado');
    expect(texto).toContain('classificação: Severo');
    expect(P).toContain(
      'as três dimensões apresentam distribuição heterogênea, com maior elevação relativa numa delas',
    );
    expect(P).toContain('NÃO diga que uma dimensão está causando outra');
  });

  it('46 · D uma dimensão destoante · Estresse pode ser destacado, sem urgência nem transtorno', () => {
    const texto = formatClosedResults(CENARIOS.umaDestoante, 'DASS-21');
    expect(texto).toContain('classificação: Extremamente severo');
    expect(P).toContain('se uma escala realmente destoar das outras duas, ela pode ser destacada');
    expect(P).toContain('"Extremamente severo" não vira conclusão de urgência');
    expect(P).toContain('Não infira risco, urgência, funcionamento cotidiano nem causalidade entre as dimensões');
  });

  it('47 · E sem escore total · o prompt proíbe soma, resultado global e classificação geral', () => {
    // fixture real das três escalas — qualquer uma das quatro serve como
    // "a" fixture desde que exercite formatClosedResults de verdade
    const texto = formatClosedResults(CENARIOS.heterogeneo, 'DASS-21');
    expect(texto.split('\n\n')).toHaveLength(3); // três blocos, um por escala — nenhum total
    expect(texto).not.toMatch(/total/i);
    expect(P).toContain('A DASS-21 NÃO TEM ESCORE TOTAL');
    expect(P).toContain('"resultado global da DASS-21"');
    expect(P).toContain('"escore total da DASS-21"');
    expect(P).toContain('não produz classificação geral');
  });

  it('48 · nenhuma classificação de cenário está hardcoded como bloco no prompt de produção', () => {
    for (const [nome, cenario] of Object.entries(CENARIOS)) {
      const texto = formatClosedResults(cenario, 'DASS-21');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
