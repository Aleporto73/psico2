// =====================================================================
// EPQ-J · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-9
//
// Nono piloto da mesma arquitetura. Mesma família estrutural do BPA-2, da
// DASS-21, do SNAP-IV, da Bayley-III, do SDQ-POR e do C-TRF: sem
// snapshot, sem REGRA_EPQJ — os quatro fatores (P, E, N, S) chegam pelos
// resultados por escala de sempre. Reusa `instrumentCode` — mais um
// `const comEpqj` local, nenhuma mudança de assinatura.
//
// A ASSIMETRIA QUE IMPORTA: `engine/loader.py::load_epqj`, no
// CorrigeFacil, grava P/E/N com `kind: "primaria"` e S com `kind:
// "validade"` — a única diferença estrutural entre os quatro fatores.
// `graph-config.ts` já reflete isso em produção: P/E/N formam o "Perfil
// de traços" e S sai como complemento separado, "Escala de Sinceridade".
// O EPQ-J não tem Total: nenhum `composed_of` existe no controlador.
//
// O GRUPO NORMATIVO é `manual_deliberada` — `L.dimensions([{code:
// "grupo", manual: True}])` no loader — e `generateCorrigeFacilReport`
// não lê `norm_selector` nem campo de grupo hoje. Este piloto NÃO abre
// query nova para buscá-lo: o mapa só impede o modelo de inferir o grupo
// a partir de sexo/gênero/nome/pronome.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'EPQ-J'`. Com
//      qualquer outro valor o prompt dos outros instrumentos é BYTE A
//      BYTE o que era, e o sha256 dos quatro destinos é o MESMO já usado
//      nos oito pilotos anteriores.
//
//   2. estrutura — sem Total, sem soma de fatores, S nunca é quarto
//      traço, percentil nunca é recalculado ou lido como porcentagem de
//      sintoma, grupo normativo nunca é inferido nem reconstruído.
//
//   3. isolamento — nenhum dos outros oito pilotos ganha uma linha do
//      EPQ-J, e o EPQ-J não menciona nenhum deles.
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

const MARCA_PERFIL = 'COMO LER O EPQ-J — PERFIL INTERPRETATIVO:';

const P = prompt('EPQ-J');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('EPQ-J narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="EPQ-J", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('EPQ-J', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do EPQ-J', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'SDQ-POR', 'C-TRF_1.5-5', 'epq-j', 'EPQ', 'EPQ-A',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos oito pilotos anteriores recebe o mapa do EPQ-J', () => {
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
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley, soSdqPor, soCtrf]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('EPQ-J');
    }
  });

  it('5 · o EPQ-J sozinho não menciona os outros nove pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED', 'SDQ-POR', 'C-TRF']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_EPQJ: nenhum dos quatro fatores é snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_EPQJ/);
    expect(GERADOR).not.toContain('REGRA_EPQJ :');
    expect(GERADOR).not.toContain('REGRA_EPQJ +');
  });

  it('7 · reusa `instrumentCode`: nenhum comEpqj na assinatura', () => {
    expect(GERADOR).not.toMatch(/comEpqj\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comEpqj = instrumentCode === CODIGO_EPQJ;',
    );
    expect(GERADOR).toContain(
      "${comEpqj ? PERFIL_INTERPRETATIVO_EPQJ : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como os demais pilotos sem família de variantes', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_EPQJ = `');
    expect(GERADOR).toContain("const CODIGO_EPQJ = 'EPQ-J';");
  });

  it('9 · a chamada real já alimenta o EPQ-J: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('EPQ-J', destino).match(/^## /gm) ?? []).length, destino)
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

describe('EPQ-J narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · DUAS CAMADAS — P/E/N PRIMÁRIO, S VALIDADE
// =====================================================================

describe('EPQ-J narrativa · duas camadas, S não é quarto traço', () => {
  it('13 · declara P, E, N como perfil primário', () => {
    expect(P).toContain('CAMADA 1 — perfil primário: Psicoticismo (P), Extroversão (E) e Neuroticismo (N)');
  });

  it('14 · declara S como validade, explicitamente não equivalente a P/E/N', () => {
    expect(P).toContain('CAMADA 2 — validade: Sinceridade (S)');
    expect(P).toContain('NÃO é um quarto traço de personalidade equivalente a P/E/N');
    expect(P).toContain('S não deve dominar a Síntese nem aparecer misturada a P/E/N como se fosse a mesma espécie de medida');
  });
});

// =====================================================================
// 4 · NÃO EXISTE TOTAL
// =====================================================================

describe('EPQ-J narrativa · não existe Total, nenhuma soma de fatores', () => {
  it('15 · declara explicitamente a ausência de Total', () => {
    expect(P).toContain('NÃO EXISTE TOTAL NO EPQ-J');
    expect(P).toContain('Não há índice global, escore composto nem "perfil geral" calculado a partir de P, E, N e S');
  });

  it('16 · proíbe somar fatores e inventar compensação matemática', () => {
    expect(P).toContain('NÃO some os fatores, não crie um "escore global de personalidade"');
    expect(P).toContain('não diga que um fator "compensa" outro matematicamente');
  });

  it('17 · declara a leitura como configuracional, não redutível a um número', () => {
    expect(P).toContain('A leitura é CONFIGURACIONAL');
    expect(P).toContain('não redutível a um número único');
  });

  it('18 · formatClosedResults confirma: nenhum valor é somado — os quatro ficam como vieram', () => {
    const linha = (code: string, name: string, score: number, classification: string) => ({
      raw: null, score, percentile: score, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('P', 'Psicoticismo', 30, 'MEDIO'),
      linha('E', 'Extroversão', 50, 'MEDIO'),
      linha('N', 'Neuroticismo', 40, 'MEDIO'),
      linha('S', 'Sinceridade', 60, 'MEDIO'),
    ];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('escore: 30');
    expect(texto).toContain('escore: 50');
    expect(texto).toContain('escore: 40');
    expect(texto).toContain('escore: 60');
    // 30+50+40+60 = 180 — esse número não deve aparecer em lugar nenhum
    expect(texto).not.toContain('180');
  });
});

// =====================================================================
// 5 · PERCENTIL E CLASSIFICAÇÃO SÃO DADOS FECHADOS
// =====================================================================

describe('EPQ-J narrativa · percentil fechado, sem recálculo, sem interpolação', () => {
  it('19 · proíbe calcular, escolher, interpolar, distribuição normal e CDF', () => {
    expect(P).toContain('Não calcule percentil a partir do bruto, não escolha outro percentil');
    expect(P).toContain('não use interpolação, distribuição normal ou CDF');
  });

  it('20 · nomeia a regra do MAIOR percentil sem convidar a "corrigir"', () => {
    expect(P).toContain('não tente "corrigir" ou reconstruir o VLOOKUP da fonte');
    expect(P).toContain('a regra já aplicada pelo servidor fica com o MAIOR percentil');
    expect(P).toContain('isso não é inconsistência a resolver');
  });

  it('21 · percentil não é porcentagem do traço, em nenhum fator', () => {
    expect(P).toContain('Percentil é POSIÇÃO NORMATIVA, não porcentagem do traço');
    expect(P).toContain('percentil 90 não vira "90% de Neuroticismo"');
    expect(P).toContain('percentil 80 vira "80% psicótico"');
    expect(P).toContain('percentil 10 vira "10% extrovertido"');
  });

  it('22 · nenhum corte numérico do controlador aparece no mapa', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_EPQJ = `');
    const fim = GERADOR.indexOf('`;', inicio);
    const bloco = GERADOR.slice(inicio, fim);
    // cortes de percentil da fonte: 5/10/20/30/40/50/60/70/80/90/99 —
    // nenhum pode aparecer como corte numérico solto no mapa
    expect(bloco).not.toMatch(/corte\s+(de\s+)?\d/i);
    expect(bloco).not.toMatch(/percentil\s*[<>=]\s*\d/i);
  });
});

// =====================================================================
// 6 · CLASSIFICAÇÃO NÃO É GRAVIDADE UNIFORME
// =====================================================================

describe('EPQ-J narrativa · classificação é posição normativa, não gravidade', () => {
  it('23 · declara que as palavras indicam posição, não patologia', () => {
    expect(P).toContain('CLASSIFICAÇÃO NÃO É GRAVIDADE UNIFORME');
    expect(P).toContain('não são automaticamente gravidade, risco, patologia, comprometimento, funcionamento ruim ou funcionamento bom');
  });

  it('24 · a direção clínica não é uniforme entre os fatores — exemplo da Extroversão', () => {
    expect(P).toContain('A direção clínica NÃO é uniforme entre os quatro fatores');
    expect(P).toContain('Extroversão Muito Alta não significa "quadro grave"');
    expect(P).toContain('Extroversão Muito Baixa não significa déficit ou isolamento patológico');
  });
});

// =====================================================================
// 7 · PSICOTICISMO — TRAVA FORTE
// =====================================================================

describe('EPQ-J narrativa · Psicoticismo nunca vira diagnóstico', () => {
  it('25 · bloqueia as oito conversões, mesmo com classificação ALTO/MUITO ALTO', () => {
    expect(P).toContain('PSICOTICISMO É O NOME DA DIMENSÃO, não um veredito clínico');
    for (const proibida of [
      'psicose', 'transtorno psicótico', 'esquizofrenia', 'delírio',
      'alucinação', 'perda de contato com a realidade', 'risco de psicose',
      'traços psicóticos clínicos', 'diagnóstico psicótico',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('26 · oferece a formulação segura', () => {
    expect(P).toContain('Prefira "no fator Psicoticismo do EPQ-J..."');
  });
});

// =====================================================================
// 8 · NEUROTICISMO
// =====================================================================

describe('EPQ-J narrativa · Neuroticismo nunca vira diagnóstico', () => {
  it('27 · bloqueia as sete conversões, mesmo com classificação ALTO/MUITO ALTO', () => {
    expect(P).toContain('NEUROTICISMO É O NOME DA DIMENSÃO');
    for (const proibida of [
      'neurose', 'transtorno neurótico', 'transtorno de ansiedade',
      'depressão', 'instabilidade emocional clínica', 'transtorno emocional',
      'psicopatologia',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });
});

// =====================================================================
// 9 · EXTROVERSÃO
// =====================================================================

describe('EPQ-J narrativa · Extroversão não tem polo automaticamente bom ou ruim', () => {
  it('28 · declara que alta não é automaticamente melhor nem baixa pior', () => {
    expect(P).toContain('EXTROVERSÃO É DIMENSÃO, NÃO VEREDITO DE FUNCIONAMENTO');
    expect(P).toContain('ALTA não é automaticamente melhor; BAIXA não é automaticamente pior');
  });

  it('29 · proíbe as sete inferências sem contexto', () => {
    expect(P).toContain('não infira habilidade social, competência social, isolamento, timidez clínica, sociabilidade cotidiana, qualidade das relações, desempenho escolar ou prejuízo social');
  });
});

// =====================================================================
// 10 · SINCERIDADE — VALIDADE, NÃO JULGAMENTO MORAL
// =====================================================================

describe('EPQ-J narrativa · Sinceridade é validade, sem acusação e sem invalidação automática', () => {
  it('30 · declara S como escala de validade, não traço, sem julgamento moral', () => {
    expect(P).toContain('SINCERIDADE (S) É ESCALA DE VALIDADE, NÃO TRAÇO PRINCIPAL E NÃO JULGAMENTO MORAL');
  });

  it('31 · proíbe as seis frases de acusação/invalidação', () => {
    for (const proibida of [
      '"o respondente mentiu"',
      '"não foi sincero"',
      '"respondeu de maneira falsa"',
      '"tentou manipular o teste"',
      '"o protocolo é inválido"',
      '"o resultado deve ser descartado"',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('32 · declara que não há regra de invalidação no controlador, e o mapa não cria uma', () => {
    expect(P).toContain('O controlador não traz nenhuma regra de invalidação automática, e o mapa não cria uma');
    expect(P).toContain('S alta não invalida o protocolo, S baixa não o "confirma válido" nem confirma que o respondente foi "totalmente sincero"');
  });

  it('33 · oferece a formulação segura', () => {
    expect(P).toContain('a formulação segura é considerar S separadamente, como parte da leitura de consistência do protocolo');
    expect(P).toContain('sem transformá-la em julgamento sobre a pessoa nem em critério de descarte dos demais resultados');
  });
});

// =====================================================================
// 11 · GRUPO NORMATIVO — MANUAL, FORA DO ALCANCE DA IA
// =====================================================================

describe('EPQ-J narrativa · grupo normativo é decisão já tomada', () => {
  it('34 · declara a escolha manual e deliberada, sem uso automático do sexo', () => {
    expect(P).toContain('GRUPO NORMATIVO É DECISÃO JÁ TOMADA, FORA DO SEU ALCANCE');
    expect(P).toContain('A escolha entre Feminino, Masculino e Grupo Geral é manual e deliberada');
    expect(P).toContain('não usa o sexo informado automaticamente');
  });

  it('35 · proíbe escolher, trocar, conferir contra sexo e sugerir erro', () => {
    expect(P).toContain('Você não escolhe grupo normativo, não troca grupo, não confere o grupo contra o sexo informado em qualquer outro lugar do protocolo e não sugere que o grupo esteja errado');
  });

  it('36 · proíbe inferir de sexo, gênero, nome ou pronome', () => {
    expect(P).toContain('NÃO infira o grupo normativo a partir de sexo, gênero, nome ou pronome');
  });

  it('37 · trata o grupo, se chegar, como contexto já resolvido — nunca a verificar', () => {
    expect(P).toContain('trate-a apenas como contexto normativo já resolvido — nunca como algo a verificar ou recalcular');
  });

  it('38 · estrutural: generateCorrigeFacilReport não lê norm_selector nem grupo normativo hoje', () => {
    const inicioFuncao = GERADOR.indexOf('export async function generateCorrigeFacilReport');
    expect(inicioFuncao).toBeGreaterThan(-1);
    const corpo = GERADOR.slice(inicioFuncao);
    expect(corpo).not.toMatch(/norm_selector/);
    expect(corpo).not.toMatch(/grupo_normativo/);
  });

  it('39 · nenhuma query nova de dimensão/grupo foi aberta neste piloto', () => {
    // a única tabela de resultados consultada continua assessment_results;
    // nenhuma tabela de dimensão/grupo normativo é lida pelo gerador
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_dimensions['"]\)/);
    expect(GERADOR).not.toMatch(/\.from\(['"]norm_selector['"]\)/);
  });
});

// =====================================================================
// 12 · ITENS E INVERSÕES PERTENCEM AO CÁLCULO
// =====================================================================

describe('EPQ-J narrativa · itens e inversões nunca chegam ao relatório', () => {
  it('40 · declara que reverse pertence ao cálculo, não ao relatório', () => {
    expect(P).toContain('ITENS E INVERSÕES PERTENCEM AO CÁLCULO, NÃO AO RELATÓRIO');
    expect(P).toContain('Não mencione quais itens são invertidos (reverse), não tente inverter resposta alguma, não recalcule bruto e não reconstrua fator a partir de item');
  });

  it('41 · declara que só resultados por fator chegam, nunca item a item', () => {
    expect(P).toContain('Você recebe resultados por fator, já calculados — nunca respostas item a item do EPQ-J');
  });

  it('42 · confirmação estrutural: o gerador não abre query de respostas', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
    expect(GERADOR).not.toMatch(/\.from\(['"]respostas['"]\)/);
  });
});

// =====================================================================
// 13 · CONTRASTES ENTRE P/E/N — DESCRITOS, NUNCA CAUSAIS
// =====================================================================

describe('EPQ-J narrativa · contrastes descritos, nunca causais', () => {
  it('43 · permite descrever contraste real entre os três fatores', () => {
    expect(P).toContain('CONTRASTES ENTRE P, E E N PODEM SER DESCRITOS quando os dados realmente sustentarem');
  });

  it('44 · proíbe as três formulações causais', () => {
    expect(P).toContain('NÃO transforme contraste em causalidade');
    expect(P).toContain('"o Neuroticismo elevado causa..."');
    expect(P).toContain('"o Psicoticismo explica..."');
    expect(P).toContain('"a baixa Extroversão leva a..."');
  });
});

// =====================================================================
// 14 · OS SEIS PASSOS DE RACIOCÍNIO
// =====================================================================

describe('EPQ-J narrativa · os seis passos', () => {
  it('45 · ler P/E/N, configuração, S separada, S acrescenta, contrastes, mensagem', () => {
    for (const passo of [
      '1. LER P, E E N',
      '2. CONFIGURAÇÃO ENTRE OS TRÊS',
      '3. OBSERVAR S SEPARADAMENTE',
      '4. VERIFICAR SE S ACRESCENTA',
      '5. IDENTIFICAR CONTRASTES REAIS',
      '6. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. LER P, E E N'),
      P.indexOf('2. CONFIGURAÇÃO ENTRE OS TRÊS'),
      P.indexOf('3. OBSERVAR S SEPARADAMENTE'),
      P.indexOf('4. VERIFICAR SE S ACRESCENTA'),
      P.indexOf('5. IDENTIFICAR CONTRASTES REAIS'),
      P.indexOf('6. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('46 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('47 · o passo 4 proíbe invalidar o protocolo automaticamente', () => {
    expect(P).toContain('sem invalidá-lo automaticamente');
  });
});

// =====================================================================
// 15 · AS CINCO SEÇÕES
// =====================================================================

describe('EPQ-J narrativa · o que muda em cada seção', () => {
  it('48 · a síntese responde configuração, sem tabela em prosa', () => {
    expect(P).toContain('qual é a configuração principal deste EPQ-J?');
    expect(P).toContain('não como P = ..., E = ..., N = ... em sequência mecânica');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('49 · a análise articula P/E/N e trata S como validade separada', () => {
    expect(P).toContain('trate S como validade separada — nunca como quarto traço');
    expect(P).toContain('sem diagnóstico, causalidade, prognóstico ou descrição de sintomas não fornecidos');
  });

  it('50 · o contexto proíbe converter fatores em funcionamento escolar sem dado', () => {
    expect(P).toContain('No destino Escola em especial, não derive automaticamente comportamento escolar, rendimento, relações sociais, disciplina, adaptação ou atenção a partir de P, E, N ou S');
  });

  it('51 · as recomendações passam pelo teste da causa e proíbem sete encaminhamentos automáticos', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do EPQ-J?');
    expect(P).toContain('NÃO recomende automaticamente psicoterapia, psiquiatria, neurologia, medicação, avaliação diagnóstica, intervenção escolar ou tratamento');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
  });

  it('52 · as considerações finais fecham sem repetir fatores nem recomendações', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL sem repetir os quatro fatores nem as recomendações');
  });
});

// =====================================================================
// 16 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('EPQ-J narrativa · nenhum extremo autoriza diagnóstico ou acusação', () => {
  it('53 · proíbe as conversões clínicas mesmo com MUITO ALTO em qualquer fator', () => {
    expect(P).toContain('O QUE NUNCA SE FAZ COM O EPQ-J, mesmo com classificação MUITO ALTO em qualquer fator');
    for (const proibida of [
      'psicose', 'transtorno psicótico', 'esquizofrenia', 'neurose',
      'transtorno de ansiedade', 'depressão', 'transtorno emocional',
      'isolamento clínico', 'déficit social',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('54 · proíbe tratar Sinceridade como acusação ou critério de invalidação', () => {
    expect(P).toContain('Não trate Sinceridade como acusação de mentira nem como critério para invalidar o protocolo');
  });

  it('55 · proíbe somar fatores, inventar Total e substituir grupo normativo', () => {
    expect(P).toContain('Não some P, E, N ou S, não invente Total nem índice global de personalidade');
    expect(P).toContain('não infira nem substitua o grupo normativo por sexo, gênero, nome ou pronome');
  });

  it('56 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['no EPQ-J', 'neste protocolo', 'no fator [nome] do EPQ-J']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('57 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('58 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain('Ele não abre nenhuma exceção à REGRA CENTRAL');
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
  });
});

// =====================================================================
// 17 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('EPQ-J narrativa · a origem comercial não entra no conteúdo', () => {
  it('59 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_EPQJ');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 18 · ISOLAMENTO — nada fora do prompt mudou
// =====================================================================

describe('EPQ-J narrativa · isolamento contra os nove pilotos anteriores', () => {
  it('60 · os nove pilotos anteriores continuam intocados', () => {
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
    for (const p of [soFdt, soConfias, soBpa2, soDass21, soSnap, soBayley, soSdqPor, soCtrf]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
  });

  it('61 · nenhum módulo derivado dos outros pilotos ganhou EPQ-J', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'phq9-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('EPQ');
    }
  });

  it('62 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'epqj-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'epq-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('63 · graph-config.ts, fonte da separação P/E/N × S, não foi tocado por este PR', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain("'EPQ-J'");
    expect(graphConfig).toContain('Perfil de traços');
    expect(graphConfig).toContain('Escala de Sinceridade');
    // e o gerador não duplica a lógica de gráfico
    expect(GERADOR).not.toContain('nao_avaliativa');
  });
});

// =====================================================================
// 19 · OS DEZESSEIS CENÁRIOS PEDIDOS (A–P)
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do EPQ-J usam (não há bloco derivado). Nenhum destes
// valores está no prompt de produção.
// =====================================================================

type LinhaEpqj = {
  code: 'P' | 'E' | 'N' | 'S';
  name: string;
  score: number;
  classification: string;
};

const NOMES = {
  P: 'Psicoticismo',
  E: 'Extroversão',
  N: 'Neuroticismo',
  S: 'Sinceridade',
};

function linha(l: LinhaEpqj, ordinal: number) {
  return {
    raw: null, score: l.score, percentile: l.score, z_score: null,
    classification: l.classification, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('EPQ-J narrativa · os cenários A a P', () => {
  it('A · P/E/N em faixas médias, perfil homogêneo → síntese curta, S separada', () => {
    const dados = [
      linha({ code: 'P', name: NOMES.P, score: 50, classification: 'MEDIO' }, 0),
      linha({ code: 'E', name: NOMES.E, score: 50, classification: 'MEDIO' }, 1),
      linha({ code: 'N', name: NOMES.N, score: 50, classification: 'MEDIO' }, 2),
    ];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MEDIO');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('Sinceridade entra separadamente, e só quando for relevante para a leitura');
  });

  it('B · P muito alto → preserva rótulo, sem psicose/transtorno psicótico/esquizofrenia', () => {
    const dados = [linha({ code: 'P', name: NOMES.P, score: 99, classification: 'MUITO ALTO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO ALTO');
    expect(P).toContain('não converta em psicose, transtorno psicótico, esquizofrenia');
  });

  it('C · N muito alto → sem neurose, ansiedade, depressão ou transtorno emocional', () => {
    const dados = [linha({ code: 'N', name: NOMES.N, score: 99, classification: 'MUITO ALTO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO ALTO');
    expect(P).toContain('não converta em neurose, transtorno neurótico, transtorno de ansiedade, depressão');
  });

  it('D · E muito baixo → sem isolamento, déficit social ou prejuízo funcional', () => {
    const dados = [linha({ code: 'E', name: NOMES.E, score: 5, classification: 'MUITO BAIXO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO BAIXO');
    expect(P).toContain('não infira habilidade social, competência social, isolamento, timidez clínica');
    expect(P).toContain('prejuízo social');
  });

  it('E · E muito alto → não é automaticamente protetivo ou melhor funcionamento', () => {
    const dados = [linha({ code: 'E', name: NOMES.E, score: 99, classification: 'MUITO ALTO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO ALTO');
    expect(P).toContain('ALTA não é automaticamente melhor');
  });

  it('F · S alta/muito alta → sem acusação de mentira, sem invalidar automaticamente', () => {
    const dados = [linha({ code: 'S', name: NOMES.S, score: 99, classification: 'MUITO ALTO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO ALTO');
    expect(P).toContain('"o respondente mentiu"');
    expect(P).toContain('S alta não invalida o protocolo');
  });

  it('G · S baixa/muito baixa → não declara "protocolo plenamente válido" nem "totalmente sincero"', () => {
    const dados = [linha({ code: 'S', name: NOMES.S, score: 5, classification: 'MUITO BAIXO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO BAIXO');
    expect(P).toContain('S baixa não o "confirma válido" nem confirma que o respondente foi "totalmente sincero"');
  });

  it('H · P/E/N contrastantes → contraste descritivo permitido, sem causalidade', () => {
    const dados = [
      linha({ code: 'P', name: NOMES.P, score: 99, classification: 'MUITO ALTO' }, 0),
      linha({ code: 'E', name: NOMES.E, score: 10, classification: 'MUITO BAIXO' }, 1),
      linha({ code: 'N', name: NOMES.N, score: 50, classification: 'MEDIO' }, 2),
    ];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('classificação: MUITO ALTO');
    expect(texto).toContain('classificação: MUITO BAIXO');
    expect(P).toContain('CONTRASTES ENTRE P, E E N PODEM SER DESCRITOS');
    expect(P).toContain('NÃO transforme contraste em causalidade');
  });

  it('I · percentil 90 → nunca vira "90% do traço"', () => {
    const dados = [linha({ code: 'N', name: NOMES.N, score: 90, classification: 'ALTO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('percentil: 90');
    expect(P).toContain('percentil 90 não vira "90% de Neuroticismo"');
  });

  it('J · bruto duplicado na tabela normativa → resultado fechado usado, sem recalcular', () => {
    // caso real do controlador: Psicoticismo feminino, bruto 1 aparece em
    // percentil 10 E 20 — o loader já resolveu para o MAIOR (20)
    const dados = [linha({ code: 'P', name: NOMES.P, score: 20, classification: 'BAIXO' }, 0)];
    const texto = formatClosedResults(dados, 'EPQ-J');
    expect(texto).toContain('percentil: 20');
    expect(P).toContain('a regra já aplicada pelo servidor fica com o MAIOR percentil');
  });

  it('K · grupo normativo é manual → não infere Feminino/Masculino pelo sexo', () => {
    expect(P).toContain('NÃO infira o grupo normativo a partir de sexo, gênero, nome ou pronome');
  });

  it('L · Grupo Geral → não é tratado como erro nem substituído por grupo de sexo', () => {
    expect(P).toContain('não sugere que o grupo esteja errado');
    expect(P).not.toMatch(/Grupo Geral[^.]*errado/i);
  });

  it('M · itens reverse → nenhuma reconstrução item a item', () => {
    expect(P).toContain('Não mencione quais itens são invertidos (reverse), não tente inverter resposta alguma');
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
  });

  it('N · nenhuma soma P+E+N → nenhum índice global inventado', () => {
    expect(P).toContain('não invente Total nem índice global de personalidade');
  });

  it('O · S permanece fora do conjunto dos três traços na hierarquia do prompt', () => {
    const posP = P.indexOf('CAMADA 1 — perfil primário');
    const posS = P.indexOf('CAMADA 2 — validade');
    expect(posP).toBeGreaterThan(-1);
    expect(posS).toBeGreaterThan(posP);
  });

  it('P · isolamento: EPQ-J recebe seu perfil; os outros nove não recebem nenhuma linha dele', () => {
    for (const alheio of ['CONFIAS', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SDQ-POR', 'C-TRF']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toMatch(/\bFDT\b/);
    expect(P).not.toMatch(/\bPHQ-9\b/);

    const soCtrf = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'C-TRF_1.5-5');
    expect(soCtrf).not.toContain('EPQ-J');
  });

  it('64 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['B', [linha({ code: 'P', name: NOMES.P, score: 99, classification: 'MUITO ALTO' }, 0)]],
      ['H', [
        linha({ code: 'P', name: NOMES.P, score: 99, classification: 'MUITO ALTO' }, 0),
        linha({ code: 'E', name: NOMES.E, score: 10, classification: 'MUITO BAIXO' }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'EPQ-J');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
