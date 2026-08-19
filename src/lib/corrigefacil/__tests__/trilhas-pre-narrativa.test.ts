// =====================================================================
// TRILHAS_PRE · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-13
//
// Décimo terceiro piloto da mesma arquitetura. Sem snapshot, sem
// REGRA_TRILHAS_PRE — os quatro subtestes (A-SEQ, A-CON, B-SEQ, B-CON)
// chegam pelos resultados por escala de sempre. Reusa `instrumentCode`
// — mais um `const comTrilhasPre` local, nenhuma mudança de assinatura.
//
// SEM TOTAL, DECLARADO PELO PRÓPRIO CONTROLADOR: `trilhas.json ·
// instrument.notes` traz "Sem escore composto/total", e o loader não
// grava `scale_components` nenhum.
//
// BRUTO ≠ PONTUAÇÃO PADRÃO, TETOS DIFERENTES: raw_max é 5 (A-SEQ), 4
// (A-CON), 10 (B-SEQ) e 9 (B-CON) — um bruto igual em dois subtestes
// não é a mesma posição normativa.
//
// ZERO NÃO TEM NORMA: as tabelas começam no bruto 1; não existe linha
// normativa para zero.
//
// IDADE NORMATIVA: só 4, 5 e 6 anos têm tabela; a seleção é resolvida
// antes do relatório.
//
// SEM SEMÂNTICA APROVADA ALÉM DO NOME DO SUBTESTE: `graph-config.ts`
// plota os quatro sem atribuir nenhum construto cognitivo a nenhum —
// Parte B não é "flexibilidade cognitiva", Conexões não é "atenção",
// Sequências não é "planejamento", sem fonte explícita.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'TRILHAS_PRE'`.
//      Com qualquer outro valor o prompt dos outros instrumentos é BYTE
//      A BYTE o que era, e o sha256 dos quatro destinos é o MESMO já
//      usado nos doze pilotos anteriores.
//
//   2. réguas — bruto nunca é comparado entre subtestes; pontuação
//      padrão e classificação são os únicos dados comparáveis; zero
//      nunca vira classificação inventada.
//
//   3. semântica — nenhum subteste vira construto cognitivo sem fonte
//      explícita auditada.
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

const prompt = (codigo: string, destino: Destino = 'technical'): string =>
  buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, false, codigo);

const MARCA_PERFIL = 'COMO LER O TESTE DE TRILHAS PRÉ-ESCOLARES — PERFIL INTERPRETATIVO:';

const P = prompt('TRILHAS_PRE');

// =====================================================================
// 0 · CONTROLADOR REAL — CONTRATO ESTRUTURAL
// =====================================================================

const TRILHAS_JSON = (() => {
  const texto = leia('..', 'CorrigeFacil', 'data', 'trilhas.json');
  return JSON.parse(texto);
})();

describe('TRILHAS_PRE narrativa · contrato estrutural do controlador real', () => {
  it('0.1 · code, ages e subtestes batem com o esperado', () => {
    expect(TRILHAS_JSON.instrument.code).toBe('TRILHAS_PRE');
    expect(TRILHAS_JSON.instrument.ages).toEqual([4, 5, 6]);
    const codigos = TRILHAS_JSON.subtests.map((s: { code: string }) => s.code);
    expect(codigos).toEqual(['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON']);
  });

  it('0.2 · raw_min de todos é 1, raw_max diferem entre subtestes', () => {
    const porCodigo: Record<string, { raw_min: number; raw_max: number }> = {};
    for (const s of TRILHAS_JSON.subtests) porCodigo[s.code] = s;
    for (const code of ['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON']) {
      expect(porCodigo[code].raw_min, code).toBe(1);
    }
    expect(porCodigo['A-SEQ'].raw_max).toBe(5);
    expect(porCodigo['A-CON'].raw_max).toBe(4);
    expect(porCodigo['B-SEQ'].raw_max).toBe(10);
    expect(porCodigo['B-CON'].raw_max).toBe(9);
  });

  it('0.3 · notes contém "Sem escore composto/total" e a regra do zero', () => {
    const notes = TRILHAS_JSON.instrument.notes as string[];
    expect(notes.some((n) => n.includes('Sem escore composto/total'))).toBe(true);
    expect(notes.some((n) => n.includes('zero não é aceito'))).toBe(true);
  });

  it('0.4 · as tabelas normativas não têm entrada para bruto zero', () => {
    for (const code of ['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON']) {
      for (const idade of ['4', '5', '6']) {
        const tabela = TRILHAS_JSON.norms[code][idade];
        expect(Object.keys(tabela), `${code}/${idade}`).not.toContain('0');
      }
    }
  });

  it('0.5 · cinco classification_bands existem no controlador (não reproduzidas no prompt)', () => {
    const rotulos = TRILHAS_JSON.classification_bands.map((b: { label: string }) => b.label);
    expect(rotulos).toEqual(['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta']);
  });
});

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('TRILHAS_PRE narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="TRILHAS_PRE", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('TRILHAS_PRE', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · nenhum alias inventado ativa o mapa — só o código real', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'SDQ-POR', 'C-TRF_1.5-5', 'EPQ-J', 'ERA-A', 'ERA-F', 'ETPC',
      'TRILHAS', 'TRILHAS-PRE', 'TRILHAS_PRE_ESCOLAR', 'trilhas_pre',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos doze pilotos anteriores recebe o mapa do TRILHAS_PRE', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    const soSnap18 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-18');
    const soSnap26 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-26');
    const soBayley = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BAYLEY-III');
    const soSdqPor = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SDQ-POR');
    const soCtrf = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'C-TRF_1.5-5');
    const soEpqj = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'EPQ-J');
    const soEraa = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-A');
    const soEraf = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-F');
    const soEtpc = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ETPC');
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley, soSdqPor, soCtrf, soEpqj, soEraa, soEraf, soEtpc]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('TRILHAS_PRE');
    }
  });

  it('5 · o TRILHAS_PRE sozinho não menciona os outros doze pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED', 'SDQ-POR', 'C-TRF', 'EPQ-J', 'ERA-A', 'ERA-F', 'ETPC']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_TRILHAS_PRE: nenhum dos quatro subtestes é snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_TRILHAS_PRE/);
    expect(GERADOR).not.toContain('REGRA_TRILHAS_PRE :');
    expect(GERADOR).not.toContain('REGRA_TRILHAS_PRE +');
  });

  it('7 · reusa `instrumentCode`: nenhum comTrilhasPre na assinatura', () => {
    expect(GERADOR).not.toMatch(/comTrilhasPre\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comTrilhasPre = instrumentCode === CODIGO_TRILHAS_PRE;',
    );
    expect(GERADOR).toContain(
      "${comTrilhasPre ? PERFIL_INTERPRETATIVO_TRILHAS_PRE : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, com o código real do controlador', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_TRILHAS_PRE = `');
    expect(GERADOR).toContain("const CODIGO_TRILHAS_PRE = 'TRILHAS_PRE';");
  });

  it('9 · a chamada real já alimenta o TRILHAS_PRE: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('TRILHAS_PRE', destino).match(/^## /gm) ?? []).length, destino)
        .toBe(5);
    }
  });
});

// =====================================================================
// 2 · O PROMPT DOS OUTROS INSTRUMENTOS — sha256, não confiança
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

describe('TRILHAS_PRE narrativa · o prompt dos outros instrumentos não mudou', () => {
  it('11 · os quatro destinos batem byte a byte com o baseline', () => {
    for (const destino of DESTINOS) {
      const sha = createHash('sha256')
        .update(buildCorrigeFacilSystemPrompt(destino, 'AVISO'), 'utf8')
        .digest('hex');
      expect(sha, destino).toBe(SHA_SEM_DERIVADO[destino]);
    }
  });

  it('12 · chamar sem instrumentCode é o mesmo que chamá-lo vazio', () => {
    for (const destino of DESTINOS) {
      expect(buildCorrigeFacilSystemPrompt(destino, 'AVISO'), destino).toBe(
        buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, false, ''),
      );
    }
  });
});

// =====================================================================
// 3 · SEM TOTAL
// =====================================================================

describe('TRILHAS_PRE narrativa · sem Total, sem escore composto', () => {
  it('13 · declara explicitamente a ausência de Total', () => {
    expect(P).toContain('NÃO EXISTE TOTAL NESTE INSTRUMENTO');
    expect(P).toContain('O controlador declara "Sem escore composto/total"');
  });

  it('14 · proíbe somar A+A, B+B, os quatro, média e "geral"', () => {
    expect(P).toContain('não some A-SEQ com A-CON, não some B-SEQ com B-CON, não some os quatro subtestes, não tire média entre eles');
    expect(P).toContain('não invente "escore executivo geral" nem "desempenho geral no Trilhas"');
  });
});

// =====================================================================
// 4 · BRUTO ≠ PONTUAÇÃO PADRÃO
// =====================================================================

describe('TRILHAS_PRE narrativa · bruto e pontuação padrão são réguas diferentes', () => {
  it('15 · declara tetos diferentes e proíbe comparar bruto entre subtestes', () => {
    expect(P).toContain('BRUTO NÃO É PONTUAÇÃO PADRÃO, E OS TETOS SÃO DIFERENTES ENTRE SUBTESTES');
    expect(P).toContain('bruto 5 em A-SEQ não é a mesma posição que bruto 5 em B-SEQ');
    expect(P).toContain('NÃO compare bruto entre subtestes');
  });

  it('16 · formatClosedResults confirma: bruto e escore chegam separados, por subteste', () => {
    const linha = (code: string, name: string, raw: number, score: number, classification: string) => ({
      raw, score, percentile: null, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('A-SEQ', 'Parte A — Sequências', 5, 125, 'Alta'),
      linha('B-SEQ', 'Parte B — Sequências', 5, 78, 'Baixa'),
    ];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    // mesmo bruto (5), classificações opostas — a prova de que o bruto
    // sozinho não diz a posição normativa
    expect(texto).toContain('bruto: 5');
    expect(texto).toContain('classificação: Alta');
    expect(texto).toContain('classificação: Baixa');
  });
});

// =====================================================================
// 5 · PONTUAÇÃO PADRÃO — DADO FECHADO
// =====================================================================

describe('TRILHAS_PRE narrativa · pontuação padrão fechada, sem z/percentil/IC95', () => {
  it('17 · proíbe z, percentil, IC95, CDF e desvio-padrão sem fonte', () => {
    expect(P).toContain('Não calcule z, não estime percentil, não converta pontuação padrão em percentil, não crie IC95 e não use distribuição normal ou CDF');
    expect(P).toContain('Não escreva "está X desvios-padrão da média" sem fonte explícita nos dados recebidos');
  });
});

// =====================================================================
// 6 · CLASSIFICAÇÃO — FECHADA, SEM CORTE
// =====================================================================

describe('TRILHAS_PRE narrativa · classificação fechada, sem corte reproduzido', () => {
  it('18 · declara cinco categorias, sem reaplicar corte', () => {
    expect(P).toContain('Existem cinco categorias — Muito baixa, Baixa, Média, Alta e Muito alta');
    expect(P).toContain('a IA não reaplica o corte que as separa, não reclassifica a partir da pontuação padrão e não traz limite numérico nenhum para o texto');
  });

  it('19 · nenhum corte numérico do controlador aparece no mapa', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_TRILHAS_PRE = `');
    const fim = GERADOR.indexOf('`;', inicio);
    const bloco = GERADOR.slice(inicio, fim);
    // cortes reais do controlador: 69/84/114/129 (classification_bands)
    expect(bloco).not.toMatch(/\b69\b/);
    expect(bloco).not.toMatch(/\b84\b/);
    expect(bloco).not.toMatch(/\b114\b/);
    expect(bloco).not.toMatch(/\b129\b/);
    expect(bloco).not.toMatch(/\b100\b/); // score_mean também não entra
    expect(bloco).not.toMatch(/corte\s+(de\s+)?\d/i);
  });

  it('20 · declara que Baixa/Alta são posição normativa, não veredito clínico', () => {
    expect(P).toContain('"BAIXA" E "ALTA" SÃO POSIÇÃO NORMATIVA NAQUELE SUBTESTE, não veredito clínico');
  });

  it('21 · proíbe as cinco leituras de Muito baixa como patologia', () => {
    expect(P).toContain('Muito baixa NÃO significa automaticamente déficit, transtorno, comprometimento, lesão, disfunção executiva ou TDAH');
  });

  it('22 · proíbe as quatro leituras de Muito alta como excepcionalidade', () => {
    expect(P).toContain('Muito alta NÃO significa automaticamente superdotação, função executiva excepcional, ausência de dificuldade ou proteção clínica');
  });
});

// =====================================================================
// 7 · BRUTO ZERO — SEM NORMA
// =====================================================================

describe('TRILHAS_PRE narrativa · bruto zero não tem norma, e isso é limite', () => {
  it('23 · declara que zero é limite do resultado, não falha a preencher', () => {
    expect(P).toContain('BRUTO ZERO NÃO TEM NORMA, E ISSO É LIMITE DO RESULTADO, NÃO FALHA A PREENCHER');
    expect(P).toContain('As tabelas originais começam no bruto 1; zero não tem linha normativa');
  });

  it('24 · manda preservar indisponibilidade, sem estimar ou completar', () => {
    expect(P).toContain('PRESERVE isso exatamente: não interprete o bruto como se fosse escore válido');
    expect(P).toContain('não escreva "mesmo sem norma, o desempenho parece..."');
    expect(P).toContain('não estime classificação por proximidade e não complete a lacuna de nenhuma forma');
  });
});

// =====================================================================
// 8 · IDADE NORMATIVA
// =====================================================================

describe('TRILHAS_PRE narrativa · idade normativa já resolvida pelo sistema', () => {
  it('25 · declara as três idades e que a escolha já foi feita', () => {
    expect(P).toContain('A IDADE NORMATIVA JÁ FOI SELECIONADA ANTES DESTE RELATÓRIO — só existe tabela para 4, 5 e 6 anos');
  });

  it('26 · proíbe calcular, escolher, corrigir, arredondar, trocar, usar idade vizinha e extrapolar', () => {
    expect(P).toContain('Você não calcula idade, não escolhe idade normativa, não corrige, não arredonda, não troca de uma idade para outra, não usa norma de idade vizinha e não extrapola para idades fora da tabela');
  });

  it('27 · estrutural: generateCorrigeFacilReport não lê idade_normativa hoje', () => {
    const inicioFuncao = GERADOR.indexOf('export async function generateCorrigeFacilReport');
    const corpo = GERADOR.slice(inicioFuncao);
    expect(corpo).not.toMatch(/idade_normativa/);
    expect(corpo).not.toMatch(/norm_selector/);
  });

  it('28 · nenhuma query nova de dimensão/idade foi aberta neste piloto', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_dimensions['"]\)/);
  });
});

// =====================================================================
// 9 · SEMÂNTICA — SÓ OS NOMES DOS SUBTESTES
// =====================================================================

describe('TRILHAS_PRE narrativa · nenhum subteste vira construto cognitivo sem fonte', () => {
  it('29 · declara que os nomes são descritivos, não construtos prontos', () => {
    expect(P).toContain('OS NOMES DOS SUBTESTES SÃO DESCRITIVOS, NÃO CONSTRUTOS COGNITIVOS PRONTOS');
  });

  it('30 · proíbe as sete conversões cognitivas genéricas', () => {
    expect(P).toContain('não converta automaticamente nenhum subteste em atenção sustentada, atenção alternada, controle inibitório, flexibilidade cognitiva, velocidade de processamento, planejamento ou memória operacional');
  });

  it('31 · bloqueia especificamente Parte B, Conexões e Sequências', () => {
    expect(P).toContain('Parte B NÃO vira automaticamente "flexibilidade cognitiva"');
    expect(P).toContain('Conexões NÃO vira automaticamente "atenção"');
    expect(P).toContain('Sequências NÃO vira automaticamente "planejamento"');
  });

  it('32 · manda ancorar nos nomes exatos dos subtestes', () => {
    expect(P).toContain('Ancore-se nos nomes exatos dos subtestes — "Parte A — Sequências", "Parte A — Conexões", "Parte B — Sequências", "Parte B — Conexões"');
  });

  it('33 · estrutural: graph-config.ts não atribui construto cognitivo a nenhum subteste', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    const inicio = graphConfig.indexOf('TRILHAS_PRE:');
    const fim = graphConfig.indexOf('\n  },', inicio);
    const bloco = graphConfig.slice(inicio, fim);
    for (const proibido of ['flexibilidade', 'atenção', 'planejamento', 'executiv']) {
      expect(bloco.toLowerCase(), proibido).not.toContain(proibido);
    }
  });
});

// =====================================================================
// 10 · A×B E SEQ×CON — DESCRITIVO, NUNCA CALCULADO
// =====================================================================

describe('TRILHAS_PRE narrativa · comparações A×B e Seq×Con são descritivas', () => {
  it('34 · permite comparar A-SEQ×B-SEQ e A-CON×B-CON descritivamente', () => {
    expect(P).toContain('COMPARAÇÕES ENTRE A E B, E ENTRE SEQUÊNCIAS E CONEXÕES, SÃO DESCRITIVAS, NUNCA CALCULADAS');
    expect(P).toContain('É permitido comparar A-SEQ com B-SEQ, ou A-CON com B-CON, ou observar Sequências ao lado de Conexões');
  });

  it('35 · proíbe calcular B-A, criar índice de custo ou "efeito B"', () => {
    expect(P).toContain('NÃO calcule B-SEQ menos A-SEQ nem B-CON menos A-CON, não crie "índice de custo" nem "efeito B"');
  });

  it('36 · proíbe assumir sem fonte que B é mais complexo ou mede alternância', () => {
    expect(P).toContain('não assuma sem fonte explícita que B é "mais complexo", que B mede "alternância" ou que a diferença entre as duas partes significa flexibilidade');
  });

  it('37 · proíbe índice Seq-Con, percentual de perda, razão e explicação de processo', () => {
    expect(P).toContain('não crie índice Sequência, índice Conexão, diferença Seq-Con, percentual de perda ou razão entre eles');
    expect(P).toContain('não afirme qual processo cognitivo seria responsável por uma diferença observada');
  });
});

// =====================================================================
// 11 · DIFERENÇA DESCRITIVA, NUNCA ESTATÍSTICA
// =====================================================================

describe('TRILHAS_PRE narrativa · diferença é descritiva, nunca "significativa"', () => {
  it('38 · permite "maior"/"menor", proíbe "significativa" sem tabela de discrepância', () => {
    expect(P).toContain('DIFERENÇA ENTRE PONTUAÇÕES É DESCRITIVA, NUNCA ESTATÍSTICA');
    expect(P).toContain('"Maior" ou "menor" entre dois subtestes é permitido quando os dados sustentarem');
    expect(P).toContain('NÃO chame nenhuma diferença de "significativa", "clinicamente significativa" ou "estatisticamente significativa"');
    expect(P).toContain('isso exigiria uma tabela de discrepância normativa que não está disponível');
  });
});

// =====================================================================
// 12 · RESULTADOS PARCIAIS
// =====================================================================

describe('TRILHAS_PRE narrativa · resultado parcial é normal, ausente não é zero', () => {
  it('39 · declara resultado parcial como normal neste instrumento', () => {
    expect(P).toContain('RESULTADOS PARCIAIS SÃO NORMAIS NESTE INSTRUMENTO');
    expect(P).toContain('narre somente o que existe');
  });

  it('40 · proíbe tratar ausente como zero, Muito baixa, "não realizado" ou erro', () => {
    expect(P).toContain('NÃO trate um subteste ausente como zero, como Muito baixa, como "não realizado" ou como erro do participante');
    expect(P).toContain('a menos que o próprio resultado recebido diga isso');
  });

  it('41 · formatClosedResults confirma: só os disponíveis aparecem no texto', () => {
    const linha = (code: string, name: string, raw: number, score: number, classification: string) => ({
      raw, score, percentile: null, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [linha('A-SEQ', 'Parte A — Sequências', 4, 117, 'Alta')];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).not.toContain('B-SEQ');
    expect(texto).not.toContain('B-CON');
    expect(texto).not.toContain('A-CON');
  });
});

// =====================================================================
// 13 · OS OITO PASSOS DE RACIOCÍNIO
// =====================================================================

describe('TRILHAS_PRE narrativa · os oito passos', () => {
  it('42 · disponibilidade, leitura, parte A, parte B, seq×con, homogeneidade, destoante, mensagem', () => {
    for (const passo of [
      '1. VERIFICAR quais dos quatro resultados estão disponíveis',
      '2. LER pontuação padrão e classificação',
      '3. OBSERVAR a configuração das duas medidas da Parte A',
      '4. OBSERVAR a configuração das duas medidas da Parte B',
      '5. OBSERVAR Sequências e Conexões apenas de forma descritiva',
      '6. IDENTIFICAR homogeneidade ou contraste real',
      '7. VERIFICAR se algum subteste realmente destoa',
      '8. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. VERIFICAR quais dos quatro resultados estão disponíveis'),
      P.indexOf('2. LER pontuação padrão e classificação'),
      P.indexOf('3. OBSERVAR a configuração das duas medidas da Parte A'),
      P.indexOf('4. OBSERVAR a configuração das duas medidas da Parte B'),
      P.indexOf('5. OBSERVAR Sequências e Conexões apenas de forma descritiva'),
      P.indexOf('6. IDENTIFICAR homogeneidade ou contraste real'),
      P.indexOf('7. VERIFICAR se algum subteste realmente destoa'),
      P.indexOf('8. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('43 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });
});

// =====================================================================
// 14 · AS CINCO SEÇÕES
// =====================================================================

describe('TRILHAS_PRE narrativa · o que muda em cada seção', () => {
  it('44 · a síntese responde configuração, com resultado parcial como opção válida', () => {
    expect(P).toContain('qual é a configuração principal neste Teste de Trilhas Pré-Escolares?');
    expect(P).toContain('resultados parciais com interpretação limitada às medidas disponíveis');
    expect(P).toContain('sem criar um resultado global que não existe');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('45 · a análise proíbe as nove inferências sem sustentação', () => {
    expect(P).toContain('NÃO infira TDAH, disfunção executiva, transtorno neuropsicológico, déficit de atenção, déficit de flexibilidade, lesão cerebral, problema escolar, causalidade ou prognóstico');
  });

  it('46 · o contexto Escola proíbe as seis conversões automáticas', () => {
    expect(P).toContain('uma pontuação Baixa ou Muito baixa não autoriza afirmar dificuldade de aprendizagem, baixo rendimento, problema de atenção em sala, problema para seguir sequência, dificuldade de organização escolar ou problema de comportamento');
  });

  it('47 · as recomendações passam pelo teste da causa e proíbem oito encaminhamentos automáticos', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do Trilhas?');
    expect(P).toContain('NÃO recomende automaticamente neurologista, psiquiatra, psicoterapia, medicação, treino executivo, intervenção atencional, adaptação escolar ou avaliação de TDAH');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
  });

  it('48 · as considerações finais fecham sem repetir subtestes nem recomendações', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL sem repetir os quatro subtestes nem as recomendações');
  });
});

// =====================================================================
// 15 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('TRILHAS_PRE narrativa · nenhum extremo autoriza diagnóstico', () => {
  it('49 · proíbe as quatro conversões mesmo com Muito baixa ou Muito alta em qualquer subteste', () => {
    expect(P).toContain('O QUE NUNCA SE FAZ COM O TESTE DE TRILHAS PRÉ-ESCOLARES, mesmo com classificação Muito baixa ou Muito alta em qualquer subteste');
    expect(P).toContain('não infira TDAH, disfunção executiva, transtorno neuropsicológico ou lesão cerebral a partir do NOME de um subteste ou da classificação recebida');
  });

  it('50 · repete a proibição semântica dos três subtestes específicos', () => {
    expect(P).toContain('Não converta Parte B em flexibilidade cognitiva, Conexões em atenção ou Sequências em planejamento sem fonte explícita');
  });

  it('51 · repete a proibição de somar, inventar Total, calcular diferenças e "significativa"', () => {
    expect(P).toContain('Não some subtestes, não invente Total, não calcule diferença B menos A nem diferença entre Sequências e Conexões, e não chame diferença nenhuma de estatisticamente ou clinicamente significativa');
  });

  it('52 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['neste Teste de Trilhas Pré-Escolares', 'neste protocolo', 'no subteste [nome]']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('53 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('54 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain('Ele não abre nenhuma exceção à REGRA CENTRAL');
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
  });
});

// =====================================================================
// 16 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('TRILHAS_PRE narrativa · a origem comercial não entra no conteúdo', () => {
  it('55 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_TRILHAS_PRE');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 17 · ISOLAMENTO — nada fora do prompt mudou
// =====================================================================

describe('TRILHAS_PRE narrativa · isolamento contra os doze pilotos anteriores', () => {
  it('56 · os doze pilotos anteriores continuam intocados', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    expect(soFdt).toContain('COMO LER O FDT — PERFIL INTERPRETATIVO:');
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    expect(soConfias).toContain('COMO LER O CONFIAS — PERFIL INTERPRETATIVO:');
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    expect(soBpa2).toContain('COMO LER O BPA-2 — PERFIL INTERPRETATIVO:');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    expect(soDass21).toContain('COMO LER A DASS-21 — PERFIL INTERPRETATIVO:');
    const soSnap = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-26');
    expect(soSnap).toContain('COMO LER O SNAP-IV — PERFIL INTERPRETATIVO:');
    const soBayley = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BAYLEY-III');
    expect(soBayley).toContain('COMO LER A BAYLEY-III — PERFIL INTERPRETATIVO:');
    const soSdqPor = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SDQ-POR');
    expect(soSdqPor).toContain('COMO LER O SDQ-POR — PERFIL INTERPRETATIVO:');
    const soCtrf = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'C-TRF_1.5-5');
    expect(soCtrf).toContain('COMO LER O C-TRF 1½-5 — PERFIL INTERPRETATIVO:');
    const soEpqj = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'EPQ-J');
    expect(soEpqj).toContain('COMO LER O EPQ-J — PERFIL INTERPRETATIVO:');
    const soEraa = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-A');
    expect(soEraa).toContain('COMO LER O ERA-A — PERFIL INTERPRETATIVO:');
    const soEraf = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-F');
    expect(soEraf).toContain('COMO LER O ERA-F — PERFIL INTERPRETATIVO:');
    const soEtpc = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ETPC');
    expect(soEtpc).toContain('COMO LER O ETPC — PERFIL INTERPRETATIVO:');
    for (const p of [soFdt, soConfias, soBpa2, soDass21, soSnap, soBayley, soSdqPor, soCtrf, soEpqj, soEraa, soEraf, soEtpc]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
  });

  it('57 · nenhum módulo derivado dos outros pilotos ganhou TRILHAS_PRE', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'phq9-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('TRILHAS');
    }
  });

  it('58 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'trilhas-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'trilhas-pre-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('59 · graph-config.ts, fonte da janela visual sem semântica cognitiva, não foi tocado', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain('TRILHAS_PRE:');
    expect(graphConfig).toContain("blocos: [{ escalas: ['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON'] }]");
  });
});

// =====================================================================
// 18 · OS VINTE E NOVE CENÁRIOS PEDIDOS (A–AC)
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do TRILHAS_PRE usam (não há bloco derivado). Nenhum
// destes valores está no prompt de produção.
// =====================================================================

type LinhaTrilhas = {
  code: 'A-SEQ' | 'A-CON' | 'B-SEQ' | 'B-CON';
  name: string;
  raw: number | null;
  score: number | null;
  classification: string | null;
  available: boolean;
  message?: string;
};

const NOMES = {
  ASEQ: 'Parte A — Sequências',
  ACON: 'Parte A — Conexões',
  BSEQ: 'Parte B — Sequências',
  BCON: 'Parte B — Conexões',
};

function linha(l: LinhaTrilhas, ordinal: number) {
  return {
    raw: l.raw, score: l.score, percentile: null, z_score: null,
    classification: l.classification, ci95: null, available: l.available,
    message: l.message ?? null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('TRILHAS_PRE narrativa · os cenários A a AC', () => {
  it('A · quatro subtestes em Média → síntese curta', () => {
    const dados = [
      linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 3, score: 95, classification: 'Média', available: true }, 0),
      linha({ code: 'A-CON', name: NOMES.ACON, raw: 3, score: 98, classification: 'Média', available: true }, 1),
      linha({ code: 'B-SEQ', name: NOMES.BSEQ, raw: 5, score: 100, classification: 'Média', available: true }, 2),
      linha({ code: 'B-CON', name: NOMES.BCON, raw: 5, score: 97, classification: 'Média', available: true }, 3),
    ];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto.match(/classificação: Média/g)?.length).toBe(4);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('B · A-SEQ Muito baixa isoladamente → sem déficit executivo/TDAH', () => {
    const dados = [linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 1, score: 60, classification: 'Muito baixa', available: true }, 0)];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('classificação: Muito baixa');
    expect(P).toContain('não infira TDAH, disfunção executiva, transtorno neuropsicológico ou lesão cerebral');
  });

  it('C · A-CON Baixa → sem déficit de atenção', () => {
    const dados = [linha({ code: 'A-CON', name: NOMES.ACON, raw: 1, score: 78, classification: 'Baixa', available: true }, 0)];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('classificação: Baixa');
    expect(P).toContain('Conexões NÃO vira automaticamente "atenção"');
  });

  it('D · B-SEQ Baixa → sem flexibilidade cognitiva reduzida', () => {
    const dados = [linha({ code: 'B-SEQ', name: NOMES.BSEQ, raw: 2, score: 80, classification: 'Baixa', available: true }, 0)];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('classificação: Baixa');
    expect(P).toContain('Parte B NÃO vira automaticamente "flexibilidade cognitiva"');
  });

  it('E · B-CON Baixa → sem diagnóstico ou prejuízo funcional', () => {
    const dados = [linha({ code: 'B-CON', name: NOMES.BCON, raw: 2, score: 79, classification: 'Baixa', available: true }, 0)];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('classificação: Baixa');
    expect(P).toContain('não infira TDAH, disfunção executiva, transtorno neuropsicológico');
  });

  it('F · um subteste Muito alta → sem superdotação ou função excepcional', () => {
    const dados = [linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 5, score: 135, classification: 'Muito alta', available: true }, 0)];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('classificação: Muito alta');
    expect(P).toContain('Muito alta NÃO significa automaticamente superdotação, função executiva excepcional');
  });

  it('G · perfil heterogêneo → contraste descritivo permitido', () => {
    const dados = [
      linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 5, score: 125, classification: 'Alta', available: true }, 0),
      linha({ code: 'B-CON', name: NOMES.BCON, raw: 1, score: 74, classification: 'Muito baixa', available: true }, 1),
    ];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('classificação: Alta');
    expect(texto).toContain('classificação: Muito baixa');
    expect(P).toContain('IDENTIFICAR homogeneidade ou contraste real');
  });

  it('H · A e B divergentes → sem índice B-A', () => {
    expect(P).toContain('NÃO calcule B-SEQ menos A-SEQ nem B-CON menos A-CON');
  });

  it('I · SEQ e CON divergentes → sem índice Seq-Con', () => {
    expect(P).toContain('não crie índice Sequência, índice Conexão, diferença Seq-Con, percentual de perda ou razão entre eles');
  });

  it('J · sem Total → nenhum escore global inventado', () => {
    expect(P).toContain('NÃO EXISTE TOTAL NESTE INSTRUMENTO');
  });

  it('K · raw e score tratados como réguas diferentes', () => {
    expect(P).toContain('use a pontuação padrão e a classificação, que já vieram convertidas e são comparáveis entre os quatro');
  });

  it('L · raw 5 em subtestes com tetos diferentes → não comparar brutos diretamente', () => {
    // A-SEQ teto 5 (bruto 5 = máximo); B-SEQ teto 10 (bruto 5 = meio) —
    // a mesma prova estrutural do teste 16
    const dados = [
      linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 5, score: 125, classification: 'Alta', available: true }, 0),
      linha({ code: 'B-SEQ', name: NOMES.BSEQ, raw: 5, score: 78, classification: 'Baixa', available: true }, 1),
    ];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto.match(/bruto: 5/g)?.length).toBe(2);
    expect(texto).toContain('classificação: Alta');
    expect(texto).toContain('classificação: Baixa');
  });

  it('M · pontuação padrão recebida preservada', () => {
    expect(P).toContain('A PONTUAÇÃO PADRÃO É DADO FECHADO. Preserve exatamente o número recebido');
  });

  it('N · não calcular z-score', () => {
    expect(P).toContain('Não calcule z');
  });

  it('O · não calcular percentil', () => {
    expect(P).toContain('não estime percentil, não converta pontuação padrão em percentil');
  });

  it('P · não criar IC95', () => {
    expect(P).toContain('não crie IC95');
  });

  it('Q · classificação recebida preservada', () => {
    expect(P).toContain('CLASSIFICAÇÃO É DADO FECHADO');
  });

  it('R · cutoffs não entram no perfil', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_TRILHAS_PRE = `');
    const fim = GERADOR.indexOf('`;', inicio);
    expect(GERADOR.slice(inicio, fim)).not.toMatch(/\b69\b|\b84\b|\b114\b|\b129\b/);
  });

  it('S · bruto zero → nenhuma norma/classificação inventada', () => {
    expect(P).toContain('BRUTO ZERO NÃO TEM NORMA');
  });

  it('T · available=false → não interpretar como Muito baixa', () => {
    const dados = [
      linha({
        code: 'A-CON', name: NOMES.ACON, raw: 0, score: null,
        classification: null, available: false,
        message: 'não há norma publicada para este bruto neste subteste',
      }, 0),
    ];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).toContain('disponível: não');
    expect(texto).not.toContain('classificação: Muito baixa');
    expect(P).toContain('não estime classificação por proximidade e não complete a lacuna de nenhuma forma');
  });

  it('U · idade normativa 4 → não trocar por 5/6', () => {
    expect(P).toContain('não troca de uma idade para outra');
  });

  it('V · idade normativa 6 → não extrapolar para 7', () => {
    expect(P).toContain('não extrapola para idades fora da tabela');
  });

  it('W · idade fora da norma → não usar idade vizinha', () => {
    expect(P).toContain('não usa norma de idade vizinha');
  });

  it('X · Parte B → não vira automaticamente flexibilidade cognitiva', () => {
    expect(P).toContain('Parte B NÃO vira automaticamente "flexibilidade cognitiva"');
  });

  it('Y · Sequências → não vira automaticamente planejamento', () => {
    expect(P).toContain('Sequências NÃO vira automaticamente "planejamento"');
  });

  it('Z · Conexões → não vira automaticamente atenção', () => {
    expect(P).toContain('Conexões NÃO vira automaticamente "atenção"');
  });

  it('AA · diferença entre scores → não chamada de significativa sem tabela de discrepância', () => {
    expect(P).toContain('NÃO chame nenhuma diferença de "significativa", "clinicamente significativa" ou "estatisticamente significativa"');
  });

  it('AB · resultado parcial → ausente não vira zero', () => {
    const dados = [linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 3, score: 95, classification: 'Média', available: true }, 0)];
    const texto = formatClosedResults(dados, 'TRILHAS_PRE');
    expect(texto).not.toContain('B-SEQ');
    expect(P).toContain('NÃO trate um subteste ausente como zero');
  });

  it('AC · isolamento contra todos os doze perfis anteriores', () => {
    for (const alheio of ['CONFIAS', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SDQ-POR', 'C-TRF', 'EPQ-J', 'ERA-A', 'ERA-F', 'ETPC']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toMatch(/\bFDT\b/);
    expect(P).not.toMatch(/\bPHQ-9\b/);
  });

  it('60 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['B', [linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 1, score: 60, classification: 'Muito baixa', available: true }, 0)]],
      ['G', [
        linha({ code: 'A-SEQ', name: NOMES.ASEQ, raw: 5, score: 125, classification: 'Alta', available: true }, 0),
        linha({ code: 'B-CON', name: NOMES.BCON, raw: 1, score: 74, classification: 'Muito baixa', available: true }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'TRILHAS_PRE');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
