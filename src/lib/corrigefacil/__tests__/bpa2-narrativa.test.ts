// =====================================================================
// BPA-2 · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-3
//
// Terceiro piloto da arquitetura validada no FDT (2B-1) e no CONFIAS
// (2B-2), com uma diferença estrutural que este arquivo existe para
// provar: o BPA-2 NÃO TEM SNAPSHOT.
//
// CONFIAS, PHQ-9 e FDT precisam de um bloco "DADOS DERIVADOS CONGELADOS"
// porque cada um carrega alguma leitura que só existe fora da tabela de
// resultados por escala. O BPA-2 não — AA, AC, AD e AG chegam com bruto,
// percentil e classificação já na tabela de resultados de sempre, pelo
// mesmo caminho que qualquer outro instrumento usa (é o que
// bpa2-faixa-e-percentil.test.ts já prova para o "< 1"). Não há nada para
// congelar, e por isso não há REGRA_BPA2 — só o mapa de como ler as
// quatro medidas juntas.
//
// O QUE MUDA NA ARQUITETURA: em vez de um quarto booleano `comBpa2`, o
// gerador ganha um parâmetro `instrumentCode`, comparado contra o código
// do instrumento. É o mecanismo que o próximo instrumento sem snapshot
// reaproveita — sem abrir posição nova na assinatura da função.
//
// AS DUAS TRAVAS QUE ESTE ARQUIVO GUARDA, iguais às dos dois pilotos
// anteriores:
//
//   1. escopo — o mapa só existe quando `instrumentCode === 'BPA-2'`. Com
//      qualquer outro valor (inclusive vazio, o padrão) o prompt dos
//      outros instrumentos é BYTE A BYTE o que era, e o sha256 dos quatro
//      destinos é o MESMO já usado nos dois pilotos anteriores.
//
//   2. fronteira — o mapa não abre exceção à REGRA CENTRAL. AG composta
//      não vira tarefa independente, bruto negativo não vira erro, e
//      nenhuma classificação vira traço global — nem nos extremos.
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

/** O prompt do BPA-2 e o prompt de quem não é BPA-2. Os três outros
 *  sinalizadores ficam em false: o que se mede aqui é o efeito do
 *  `instrumentCode` sozinho. */
const prompt = (codigo: string, destino: Destino = 'technical'): string =>
  buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, false, codigo);

const MARCA_PERFIL = 'COMO LER O BPA-2 — PERFIL INTERPRETATIVO:';

const P = prompt('BPA-2');

// =====================================================================
// 1 · ESCOPO — o mapa entra só com o código certo
// =====================================================================

describe('BPA-2 narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="BPA-2", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('BPA-2', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do BPA-2', () => {
    for (const codigo of ['', 'FDT', 'CONFIAS', 'PHQ-9', 'CES-D', 'bpa-2', 'BPA2']) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · FDT, CONFIAS e PHQ-9 sozinhos não recebem o mapa do BPA-2', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    for (const p of [soFdt, soConfias, soPhq9]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('BPA-2');
    }
  });

  it('5 · o BPA-2 sozinho não menciona FDT, CONFIAS nem PHQ-9', () => {
    expect(P).not.toContain('FDT');
    expect(P).not.toContain('CONFIAS');
    expect(P).not.toContain('PHQ-9');
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
  });

  it('6 · não existe REGRA_BPA2: o BPA-2 não tem snapshot para congelar', () => {
    // a ausência é intencional e documentada em prosa no bloco (daí o
    // gerador CONTER a string no comentário) — o que não pode existir é a
    // DECLARAÇÃO: nenhum `const REGRA_BPA2` nem entrada na interpolação
    expect(GERADOR).not.toMatch(/const REGRA_BPA-?2/);
    expect(GERADOR).not.toContain('REGRA_BPA2 :');
    expect(GERADOR).not.toContain('REGRA_BPA2 +');
  });

  it('7 · o mecanismo é um parâmetro, não um booleano por instrumento', () => {
    expect(GERADOR).toContain("instrumentCode = ''");
    expect(GERADOR).toContain("const comBpa2 = instrumentCode === CODIGO_BPA2;");
    expect(GERADOR).toContain(
      "${comBpa2 ? PERFIL_INTERPRETATIVO_BPA2 : ''}",
    );
    // nenhum quarto parâmetro booleano nomeado comBpa2 na ASSINATURA
    expect(GERADOR).not.toMatch(/comBpa2\s*=\s*false,/);
  });

  it('8 · a chamada real passa `instrument.code`', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    // na última posição, depois dos três sinalizadores existentes
    expect(chamada.indexOf('fdt !== null,')).toBeLessThan(
      chamada.indexOf('instrument.code,'),
    );
  });

  it('9 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('BPA-2', destino).match(/^## /gm) ?? []).length, destino)
        .toBe(5);
    }
  });
});

// =====================================================================
// 2 · O PROMPT DOS OUTROS INSTRUMENTOS — sha256, não confiança
//
// Os quatro sha são os MESMOS já usados em fdt-narrativa.test.ts e em
// confias-narrativa.test.ts: se qualquer regra global tivesse mudado em
// qualquer uma das três fases, um dos três arquivos já teria denunciado.
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

describe('BPA-2 narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · O MAPA SEMÂNTICO — AA, AC, AD e AG
// =====================================================================

describe('BPA-2 narrativa · o mapa semântico', () => {
  it('12 · AA, AC e AD são nomeadas como medidas específicas e independentes', () => {
    expect(P).toContain(
      'AA (Atenção Alternada), AC (Atenção Concentrada) e AD (Atenção Dividida) são três medidas ESPECÍFICAS e independentes entre si',
    );
  });

  it('13 · a conversão em traço da pessoa está proibida nas três', () => {
    expect(P).toContain('NÃO escreva "possui boa atenção alternada"');
    expect(P).toContain('"tem déficit de atenção concentrada"');
    expect(P).toContain('nem "não consegue dividir a atenção" como traço da pessoa');
  });

  it('14 · AG é declarada resultado composto, não quarta tarefa', () => {
    expect(P).toContain(
      'AG (Atenção Geral) é RESULTADO COMPOSTO, calculado pelo servidor a partir de AA, AC e AD',
    );
    expect(P).toContain('não é uma quarta tarefa independente');
    expect(P).toContain('não deve ser tratada como equivalente às três anteriores');
  });

  it('15 · AG não pode ser recalculada, conferida ou explicada causalmente', () => {
    expect(P).toContain('Não a recalcule');
    expect(P).toContain('não some os brutos de novo para conferir');
    expect(P).toContain('não derive percentil ou classificação dela a partir das outras três');
    expect(P).toContain(
      'não a explique como se fosse uma função cognitiva própria, diferente das três que a compõem',
    );
  });

  it('16 · AG pode ser síntese do conjunto, sem virar conclusão sobre a pessoa', () => {
    expect(P).toContain('AG pode ser usada como MEDIDA DE SÍNTESE do conjunto');
    expect(P).toContain('quando destoar de alguma das três, descreva a configuração');
    expect(P).toContain('nunca explique a causa da diferença');
    expect(P).toContain('Não escreva "a atenção geral está preservada" como conclusão sobre a pessoa');
  });

  it('17 · o mapa se declara vocabulário, não característica da pessoa', () => {
    expect(P).toContain(
      'O QUE CADA MEDIDA REPRESENTA (vocabulário do instrumento, não característica da pessoa)',
    );
  });
});

// =====================================================================
// 4 · O BRUTO NEGATIVO
// =====================================================================

describe('BPA-2 narrativa · o bruto negativo é resultado válido', () => {
  it('18 · o prompt declara o bruto negativo válido, não erro', () => {
    expect(P).toContain('O BRUTO PODE SER NEGATIVO');
    expect(P).toContain('um bruto negativo é RESULTADO VÁLIDO, não erro de digitação nem falha de sistema');
  });

  it('19 · proíbe corrigir, rejeitar, recalcular ou reinterpretar', () => {
    expect(P).toContain('Não corrija para zero');
    expect(P).toContain('não trate como bug');
    expect(P).toContain('não diga que o resultado é impossível');
    expect(P).toContain('não substitua nem reinterprete o valor');
    expect(P).toContain('use apenas o percentil e a classificação que já vieram prontos, exatamente como vieram');
  });

  it('20 · formatClosedResults entrega o bruto negativo intacto ao modelo', () => {
    const linha = {
      raw: -8,
      score: null,
      percentile: 34,
      z_score: null,
      classification: 'Médio inferior',
      ci95: null,
      available: true,
      message: null,
      flags: [],
      scales: { code: 'AD', name: 'Atenção Dividida', ordinal: 2 },
    };
    const texto = formatClosedResults([linha], 'BPA-2');
    expect(texto).toContain('-8');
    expect(texto).toContain('Médio inferior');
    expect(texto).not.toContain('- bruto: 0');
  });
});

// =====================================================================
// 5 · OS CINCO PASSOS DE RACIOCÍNIO
// =====================================================================

describe('BPA-2 narrativa · os cinco passos', () => {
  it('21 · distribuição, contraste, atenção geral, convergência, mensagem', () => {
    for (const passo of [
      '1. DISTRIBUIÇÃO',
      '2. CONTRASTE ENTRE MODALIDADES',
      '3. ATENÇÃO GERAL',
      '4. CONVERGÊNCIA',
      '5. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. DISTRIBUIÇÃO'),
      P.indexOf('2. CONTRASTE ENTRE MODALIDADES'),
      P.indexOf('3. ATENÇÃO GERAL'),
      P.indexOf('4. CONVERGÊNCIA'),
      P.indexOf('5. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('22 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('23 · contraste entre modalidades exige relevância real, sem causa', () => {
    expect(P).toContain('existe diferença realmente relevante entre AA, AC e AD?');
    expect(P).toContain('só quando os dados sustentarem');
    expect(P).toContain('Não explique por quê');
  });

  it('24 · o passo de AG lembra que ela é composta, não independente', () => {
    expect(P).toContain(
      'Lembre-se de que ela é composta e pode funcionar como síntese do conjunto; não é tarefa independente',
    );
  });

  it('25 · a mensagem central exige sustentação real nos dados', () => {
    expect(P).toContain('escolha UMA leitura central para organizar Síntese e Análise');
    expect(P).toContain('Só o que os dados realmente sustentarem');
  });
});

// =====================================================================
// 6 · AS CINCO SEÇÕES
// =====================================================================

describe('BPA-2 narrativa · o que muda em cada seção', () => {
  it('26 · a síntese responde configuração, e o percentil exato é opcional', () => {
    expect(P).toContain('qual é a configuração principal deste BPA-2?');
    expect(P).toContain('não AA, AC, AD e AG como tabela em prosa');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain(
      'O percentil exato não precisa aparecer se a classificação e a configuração já comunicarem o ponto',
    );
  });

  it('27 · a análise relaciona as três e integra AG como composta', () => {
    expect(P).toContain('relacione AA, AC e AD entre si e depois integre AG como medida composta');
    expect(P).toContain('não como quarta condição');
    expect(P).toContain('NÃO é permitido explicar causa, inferir estratégia, inferir esforço');
    expect(P).toContain('inferir desatenção cotidiana, inferir funcionamento escolar');
    expect(P).toContain('transformar classificação em traço da pessoa');
  });

  it('28 · o contexto usa a configuração, e o destino muda só a linguagem', () => {
    expect(P).toContain(
      'Perfil heterogêneo pode justificar orientar que o resultado não seja resumido somente pela AG',
    );
    expect(P).toContain('perfil homogêneo não precisa de contraste ou preocupação inventada');
    expect(P).toContain('ajusta a LINGUAGEM, nunca a interpretação psicométrica');
    expect(P).toContain(
      'Não prescreva adaptação escolar, treino atencional, intervenção ou encaminhamento só a partir do BPA-2',
    );
  });

  it('29 · as recomendações passam pelo teste da causa e não têm piso', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do BPA-2?');
    expect(P).toContain(
      'Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra',
    );
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
    expect(P).toContain('uma recomendação específica pode ser suficiente');
    expect(P).toContain('Não fabrique intervenção');
  });

  it('30 · as considerações finais fecham a mensagem central', () => {
    expect(P).toContain('Nas Considerações finais, feche a MENSAGEM CENTRAL');
    expect(P).toContain('Não repita os quatro resultados');
    expect(P).toContain('não repita todos os percentis');
  });
});

// =====================================================================
// 7 · O QUE O MAPA PROÍBE, MESMO NOS EXTREMOS
// =====================================================================

describe('BPA-2 narrativa · o que o mapa proíbe', () => {
  it('31 · classificação inferior não vira déficit, superior não vira traço', () => {
    expect(P).toContain(
      'O QUE NUNCA SE FAZ COM O PERFIL DO BPA-2, mesmo com classificação extrema:',
    );
    expect(P).toContain(
      'Classificação inferior — "Muito inferior" ou "Inferior" — não vira "déficit de atenção" como conclusão sobre a pessoa',
    );
    expect(P).toContain(
      'Classificação superior — "Superior" ou "Muito superior" — não vira "atenção preservada" nem "atenção excelente" como característica geral',
    );
  });

  it('32 · proíbe inferir TDAH, transtorno, funcionamento cotidiano e escolar', () => {
    expect(P).toContain(
      'Não infira TDAH, transtorno, funcionamento cotidiano ou desempenho escolar a partir de nenhuma classificação — de AA, AC, AD ou AG',
    );
  });

  it('33 · proíbe explicar a causa de qualquer contraste', () => {
    expect(P).toContain('Não explique a causa de nenhum contraste entre as medidas');
  });

  it('34 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['no BPA-2', 'neste protocolo', 'nas medidas avaliadas']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('35 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain(
      'não alongue o texto, não percorra AA, AC, AD e AG como tabela em prosa e não acrescente cautela nova',
    );
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('36 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain(
      'nada aqui autoriza recalcular, reclassificar, reselecionar norma ou concluir sobre a pessoa',
    );
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
    expect(P).toContain('não reconstrua tabelas normativas');
  });
});

// =====================================================================
// 8 · NENHUMA NORMA VAZOU
//
// Os pontos de corte do percentil (1, 10, 20, 25...), as faixas etárias
// ("6-8", "15-17", "18-20"...) e os grupos geográficos não chegam ao
// browser — são a tabela normativa. O mapa não os reconstrói.
// =====================================================================

describe('BPA-2 narrativa · nenhuma norma entrou no mapa', () => {
  it('37 · nenhuma faixa etária do controlador aparece no prompt', () => {
    for (const faixa of [
      '6-8', '9-10', '15-17', '18-20', '21-30', '31-40', '41-50', '51-60',
      '61-70', '71-80', '81+',
    ]) {
      expect(P, faixa).not.toContain(faixa);
    }
  });

  it('38 · nenhum grupo normativo ou base de conversão é nomeado', () => {
    for (const termo of ['Brasil', 'Amostra total', 'faixa etária', 'escolaridade']) {
      expect(P, termo).not.toContain(termo);
    }
  });

  it('39 · nenhum ponto de corte do percentil aparece isolado como número de norma', () => {
    // os cortes reais do controlador (1, 10, 20, 25, 30, 40, 60, 70, 75,
    // 80, 90, 99) não são mencionados como pontos de corte — o prompt só
    // fala de classificação recebida, nunca de percentil comparado a corte
    expect(P).not.toMatch(/percentil\s*(>=|<=|>|<)\s*\d/i);
    expect(P).not.toContain('ponto de corte');
  });
});

// =====================================================================
// 9 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('BPA-2 narrativa · a origem comercial não entra no conteúdo', () => {
  it('40 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_BPA2');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 10 · ESCOPO — nada fora do prompt mudou
// =====================================================================

describe('BPA-2 narrativa · nada fora do prompt mudou', () => {
  it('41 · REGRA_FDT, PERFIL_INTERPRETATIVO_FDT, REGRA_DERIVADOS e ' +
    'PERFIL_INTERPRETATIVO_CONFIAS continuam intocados', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    expect(soFdt).toContain('COMO LER O FDT — PERFIL INTERPRETATIVO:');
    expect(soFdt).toContain('DADOS DERIVADOS CONGELADOS DO FDT:');
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    expect(soConfias).toContain('COMO LER O CONFIAS — PERFIL INTERPRETATIVO:');
    expect(soConfias).toContain('DADOS DERIVADOS CONGELADOS:');
  });

  it('42 · o BPA-2 continua fora dos módulos derivados dos outros pilotos', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('BPA-2');
      expect(fonte, arquivo.join('/')).not.toContain('BPA2');
    }
  });

  it('43 · nenhum arquivo de apresentação do BPA-2 ganhou lógica de narrativa', () => {
    const teste = leia(
      'src', 'app', 'app', 'corrigefacil', '__tests__', 'bpa2-faixa-e-percentil.test.ts',
    );
    for (const nome of ['PERFIL_INTERPRETATIVO', 'buildCorrigeFacilSystemPrompt', 'openai']) {
      expect(teste.toLowerCase(), nome).not.toContain(nome.toLowerCase());
    }
  });
});

// =====================================================================
// 11 · OS CINCO CENÁRIOS PEDIDOS
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do BPA-2 usam — não há bloco derivado a simular.
// Nenhum destes valores está no prompt de produção: o teste 49 prova
// isso linha a linha.
// =====================================================================

type LinhaBpa2 = {
  code: string;
  name: string;
  ordinal: number;
  raw: number;
  percentile: number | null;
  classification: string;
};

function linha(l: LinhaBpa2) {
  return {
    raw: l.raw,
    score: null,
    percentile: l.percentile,
    z_score: null,
    classification: l.classification,
    ci95: null,
    available: true,
    message: null,
    flags: [],
    scales: { code: l.code, name: l.name, ordinal: l.ordinal },
  };
}

const MEDIDAS = {
  AA: 'Atenção Alternada',
  AC: 'Atenção Concentrada',
  AD: 'Atenção Dividida',
  AG: 'Atenção Geral',
};

function protocolo(
  classificacoes: Record<'AA' | 'AC' | 'AD' | 'AG', string>,
  brutos: Partial<Record<'AA' | 'AC' | 'AD' | 'AG', number>> = {},
) {
  const ordinais = { AA: 0, AC: 1, AD: 2, AG: 3 } as const;
  return (['AA', 'AC', 'AD', 'AG'] as const).map((code) =>
    linha({
      code,
      name: MEDIDAS[code],
      ordinal: ordinais[code],
      raw: brutos[code] ?? 40,
      percentile: 50,
      classification: classificacoes[code],
    }),
  );
}

const CENARIOS = {
  /** A — homogêneo médio */
  homogeneoMedio: protocolo({ AA: 'Médio', AC: 'Médio', AD: 'Médio', AG: 'Médio' }),
  /** B — heterogêneo entre as três modalidades */
  heterogeneo: protocolo({ AA: 'Superior', AC: 'Médio', AD: 'Inferior', AG: 'Médio' }),
  /** C — uma medida destoante (AD) */
  umaDestoante: protocolo({ AA: 'Médio', AC: 'Médio', AD: 'Muito inferior', AG: 'Médio inferior' }),
  /** D — todas nas faixas superiores */
  todasSuperiores: protocolo({ AA: 'Superior', AC: 'Muito superior', AD: 'Superior', AG: 'Superior' }),
  /** E — bruto negativo numa medida, percentil/classificação válidos */
  brutoNegativo: protocolo(
    { AA: 'Médio', AC: 'Médio', AD: 'Médio inferior', AG: 'Médio' },
    { AD: -8 },
  ),
} as const;

describe('BPA-2 narrativa · os cinco cenários', () => {
  it('44 · A homogêneo médio · síntese curta autorizada, sem contraste', () => {
    const texto = formatClosedResults(CENARIOS.homogeneoMedio, 'BPA-2');
    expect(texto.match(/Médio/g)?.length).toBeGreaterThanOrEqual(4);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('homogeneidade');
  });

  it('45 · B heterogêneo · contraste pode ser nomeado, AG não apaga a diferença', () => {
    const texto = formatClosedResults(CENARIOS.heterogeneo, 'BPA-2');
    expect(texto).toContain('classificação: Superior');
    expect(texto).toContain('classificação: Inferior');
    expect(P).toContain('CONTRASTE ENTRE MODALIDADES');
    expect(P).toContain(
      'as medidas específicas apresentaram distribuição heterogênea, com classificação mais elevada em uma e inferior em outra',
    );
    // AG não substitui a leitura das três nem apaga a heterogeneidade
    expect(P).toContain('não deve ser tratada como equivalente às três anteriores');
  });

  it('46 · C uma medida destoante · AD pode ser destacada, sem virar déficit global', () => {
    const texto = formatClosedResults(CENARIOS.umaDestoante, 'BPA-2');
    expect(texto).toContain('classificação: Muito inferior');
    expect(P).toContain('quando destoar de alguma das três, descreva a configuração');
    expect(P).toContain(
      'não vira "déficit de atenção" como conclusão sobre a pessoa',
    );
    // e a AG não deve absorver a leitura da medida destoante
    expect(P).toContain(
      'Perfil heterogêneo pode justificar orientar que o resultado não seja resumido somente pela AG',
    );
  });

  it('47 · D todas superiores · reconhece concentração, sem traço global', () => {
    const texto = formatClosedResults(CENARIOS.todasSuperiores, 'BPA-2');
    expect(texto).toContain('classificação: Muito superior');
    // o vocabulário para reconhecer concentração numa região existe
    expect(P).toContain('predomínio numa região classificatória');
    // e a conversão em traço global segue proibida, mesmo no extremo alto
    expect(P).toContain(
      'não vira "atenção preservada" nem "atenção excelente" como característica geral',
    );
  });

  it('48 · E bruto negativo · não corrigido, não rejeitado, classificação usada', () => {
    const texto = formatClosedResults(CENARIOS.brutoNegativo, 'BPA-2');
    expect(texto).toContain('-8');
    expect(texto).toContain('classificação: Médio inferior');
    expect(P).toContain('um bruto negativo é RESULTADO VÁLIDO');
    expect(P).toContain('Não corrija para zero');
  });

  it('49 · nenhuma classificação de cenário está hardcoded no prompt de produção', () => {
    // as classificações em si (rótulos do controlador) aparecem no prompt
    // só como EXEMPLO dentro das proibições ("Muito inferior", "Inferior",
    // "Superior", "Muito superior"); o que não pode aparecer é a
    // combinação COMPLETA linha a linha de nenhum cenário, como se o
    // prompt tivesse memorizado um caso
    for (const [nome, cenario] of Object.entries(CENARIOS)) {
      const texto = formatClosedResults(cenario, 'BPA-2');
      const linhasDeResultado = texto
        .split('\n\n')
        .map((bloco) => bloco.replace(/\n/g, ' | '));
      for (const linhaCompleta of linhasDeResultado) {
        expect(P, `${nome}: ${linhaCompleta}`).not.toContain(linhaCompleta);
      }
    }
  });
});
