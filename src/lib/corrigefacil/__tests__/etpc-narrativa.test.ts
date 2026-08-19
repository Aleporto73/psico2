// =====================================================================
// ETPC · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-12
//
// Décimo segundo piloto da mesma arquitetura. Sem snapshot, sem
// REGRA_ETPC — os quatro fatores chegam pelos resultados por escala de
// sempre. Reusa `instrumentCode` — mais um `const comEtpc` local,
// nenhuma mudança de assinatura.
//
// `engine/loader.py::load_etpc` chama o próprio instrumento de "stress
// test": item em dois fatores, 15 grupos normativos e quartil.
//
// A ARMADILHA DESTE PILOTO É O CAMPO `score`. Com `score_type:
// "quartil"`, `L.norm_entries` grava 25, 50 ou 75 na coluna `score` — o
// MARCADOR do quartil que casou, não um escore real nem percentil (a
// coluna `percentile` fica `None`). `graph-config.ts` já documenta isso
// na entrada `ETPC`: "usa a CLASSIFICAÇÃO, não o número: 25/50/75 são
// marcadores de quartil". `metricas-instrumento.ts` não tem entrada
// para ETPC, então `formatClosedResults` imprime "escore: 25/50/75" pelo
// caminho genérico — SEM alterar essa infraestrutura, o mapa ensina o
// modelo a não dar significado novo a esse número.
//
// NÃO EXISTE TOTAL: o controlador não declara `composed_of`, e as
// quatro escalas (Psicoticismo, Extroversão, Neuroticismo,
// Sociabilidade) são todas primárias, sem hierarquia entre elas.
//
// ITEM EM DOIS FATORES: itens 3, 14 e 26 pontuam em Psicoticismo E
// Extroversão; item 28 pontua em Psicoticismo E Sociabilidade. Os
// fatores não são partições do protocolo.
//
// 15 GRUPOS NORMATIVOS, seleção manual — região, sexo, idade ou
// combinações. Mesma trava do EPQ-J: a IA não escolhe, não compara, não
// infere pelo sexo/idade/região.
//
// ISOLAMENTO SEMÂNTICO: Psicoticismo, Extroversão e Neuroticismo são
// homônimos de fatores de outro instrumento do catálogo, mas Sociabilidade
// NÃO é escala de validade (diferente da Sinceridade do outro
// instrumento). Ativação exclusivamente por `instrumentCode === 'ETPC'`,
// e o texto do mapa não cita o outro código — mesma decisão do ERA-F
// para a Sensibilidade Sensorial homônima do ERA-A.
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
const METRICAS = leia('src', 'lib', 'corrigefacil', 'metricas-instrumento.ts');

const DESTINOS = ['family', 'school', 'technical', 'internal'] as const;
type Destino = (typeof DESTINOS)[number];

const prompt = (codigo: string, destino: Destino = 'technical'): string =>
  buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, false, codigo);

const MARCA_PERFIL = 'COMO LER O ETPC — PERFIL INTERPRETATIVO:';

const P = prompt('ETPC');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('ETPC narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="ETPC", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('ETPC', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do ETPC, inclusive EPQ-J', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'SDQ-POR', 'C-TRF_1.5-5', 'EPQ-J', 'ERA-A', 'ERA-F',
      'etpc', 'Psicoticismo',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos onze pilotos anteriores recebe o mapa do ETPC', () => {
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
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley, soSdqPor, soCtrf, soEpqj, soEraa, soEraf]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('ETPC');
    }
  });

  it('5 · o ETPC sozinho não menciona os outros onze pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED', 'SDQ-POR', 'C-TRF', 'EPQ-J', 'ERA-A', 'ERA-F']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_ETPC: nenhum dos quatro fatores é snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_ETPC/);
    expect(GERADOR).not.toContain('REGRA_ETPC :');
    expect(GERADOR).not.toContain('REGRA_ETPC +');
  });

  it('7 · reusa `instrumentCode`: nenhum comEtpc na assinatura', () => {
    expect(GERADOR).not.toMatch(/comEtpc\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comEtpc = instrumentCode === CODIGO_ETPC;',
    );
    expect(GERADOR).toContain(
      "${comEtpc ? PERFIL_INTERPRETATIVO_ETPC : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como os demais pilotos sem família de variantes', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_ETPC = `');
    expect(GERADOR).toContain("const CODIGO_ETPC = 'ETPC';");
  });

  it('9 · a chamada real já alimenta o ETPC: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('ETPC', destino).match(/^## /gm) ?? []).length, destino)
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

describe('ETPC narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · NÃO EXISTE TOTAL
// =====================================================================

describe('ETPC narrativa · não existe Total, nenhuma soma de fatores', () => {
  it('13 · declara explicitamente a ausência de Total', () => {
    expect(P).toContain('NÃO EXISTE TOTAL NO ETPC');
    expect(P).toContain('Não há índice global, composto nem soma dos quatro fatores');
  });

  it('14 · proíbe somar, criar média e inventar índice geral', () => {
    expect(P).toContain('NÃO some Psicoticismo, Extroversão, Neuroticismo e Sociabilidade, não crie média entre eles');
    expect(P).toContain('não invente um "perfil global" ou "índice geral de personalidade"');
  });

  it('15 · declara leitura configuracional sem eixo superior', () => {
    expect(P).toContain('A leitura é CONFIGURACIONAL entre os quatro, sem eixo superior');
  });
});

// =====================================================================
// 4 · O NÚMERO NÃO É ESCORE NEM PERCENTIL
// =====================================================================

describe('ETPC narrativa · o marcador de quartil não é escore nem percentil', () => {
  it('16 · declara que o número é marcador interno do quartil', () => {
    expect(P).toContain('O NÚMERO QUE ACOMPANHA CADA FATOR NÃO É ESCORE NEM PERCENTIL');
    expect(P).toContain('é o MARCADOR interno do quartil que a classificação ocupou (25 para Inferior, 50 para Médio, 75 para Superior)');
  });

  it('17 · proíbe ler como quantidade ou posição percentílica, e proíbe a comparação "três vezes mais"', () => {
    expect(P).toContain('NÃO trate esse número como quantidade, como posição percentílica ou como grandeza comparável entre fatores');
    expect(P).toContain('"escore 75" não significa "três vezes mais" que "escore 25"');
  });

  it('18 · manda usar a classificação, nunca o número, como guia', () => {
    expect(P).toContain('A informação que importa é a CLASSIFICAÇÃO — Inferior, Médio ou Superior — e é ela que orienta a leitura, nunca o número ao lado');
  });

  it('19 · estrutural: metricas-instrumento.ts não tem entrada para ETPC — o número chega puro por formatClosedResults', () => {
    expect(METRICAS).not.toMatch(/ETPC/);
  });

  it('20 · formatClosedResults confirma o formato real: escore 25/50/75, sem linha de percentil', () => {
    const linha = (code: string, name: string, raw: number, score: number, classification: string) => ({
      raw, score, percentile: null, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('Psicoticismo', 'Psicoticismo', 2, 50, 'Médio'),
      linha('Superior', 'Sociabilidade', 4, 75, 'Superior'),
    ];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('escore: 50');
    expect(texto).toContain('escore: 75');
    expect(texto).toContain('classificação: Médio');
    expect(texto).toContain('classificação: Superior');
    expect(texto).not.toMatch(/percentil:/);
  });
});

// =====================================================================
// 5 · CLASSIFICAÇÃO — FECHADA, SEM RÉGUA CLÍNICA UNIVERSAL
// =====================================================================

describe('ETPC narrativa · classificação fechada, direção não é régua clínica', () => {
  it('21 · declara classificação fechada, sem reaplicar corte nem verificar se bate', () => {
    expect(P).toContain('CLASSIFICAÇÃO É DADO FECHADO');
    expect(P).toContain('Não reaplique corte, não recalcule a partir do bruto, não reconstrua intervalo e não verifique se a classificação "bate" com o número que a acompanha');
  });

  it('22 · declara que Inferior/Superior não são veredito clínico', () => {
    expect(P).toContain('"INFERIOR" E "SUPERIOR" SÃO POSIÇÃO NORMATIVA, NÃO VEREDITO CLÍNICO');
    expect(P).toContain('Inferior não significa automaticamente ruim, déficit, problema ou baixo funcionamento');
    expect(P).toContain('Superior não significa automaticamente bom, saudável, melhor funcionamento ou proteção');
  });

  it('23 · nenhum corte numérico (Q25/Q50/Q75) do controlador aparece no mapa', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ETPC = `');
    const fim = GERADOR.indexOf('`;', inicio);
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/Q25|Q50|Q75/);
    expect(bloco).not.toMatch(/corte\s+(de\s+)?\d/i);
  });
});

// =====================================================================
// 6 · PSICOTICISMO / NEUROTICISMO / EXTROVERSÃO / SOCIABILIDADE
// =====================================================================

describe('ETPC narrativa · Psicoticismo nunca vira diagnóstico', () => {
  it('24 · bloqueia as dez conversões, mesmo com classificação Superior', () => {
    expect(P).toContain('PSICOTICISMO É O NOME DO FATOR, não um veredito clínico');
    for (const proibida of [
      'psicose', 'transtorno psicótico', 'esquizofrenia', 'delírio',
      'alucinação', 'perda de contato com a realidade', 'risco de psicose',
      'quadro psicótico', 'traço psicótico clínico', 'diagnóstico',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('25 · oferece a formulação segura', () => {
    expect(P).toContain('Prefira "no fator Psicoticismo do ETPC..."');
  });
});

describe('ETPC narrativa · Neuroticismo nunca vira diagnóstico', () => {
  it('26 · bloqueia as seis conversões', () => {
    expect(P).toContain('NEUROTICISMO É NOME DA DIMENSÃO');
    for (const proibida of [
      'neurose', 'transtorno de ansiedade', 'depressão',
      'instabilidade emocional clínica', 'transtorno emocional', 'psicopatologia',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });
});

describe('ETPC narrativa · Extroversão sem polo automaticamente bom ou ruim', () => {
  it('27 · declara que Superior não é automaticamente melhor', () => {
    expect(P).toContain('EXTROVERSÃO SUPERIOR NÃO É AUTOMATICAMENTE MELHOR, nem Inferior é automaticamente pior');
  });

  it('28 · proíbe as quatro inferências de cada lado', () => {
    expect(P).toContain('não converta Superior em melhor sociabilidade, melhor adaptação, melhor competência social ou bom funcionamento');
    expect(P).toContain('nem Inferior em isolamento, timidez clínica, déficit social ou prejuízo de interação');
  });
});

describe('ETPC narrativa · Sociabilidade é fator primário, não escala de validade', () => {
  it('29 · declara explicitamente que não é validade nem controle de resposta', () => {
    expect(P).toContain('SOCIABILIDADE É FATOR PRIMÁRIO DO ETPC, NÃO ESCALA DE VALIDADE');
    expect(P).toContain('Não a trate como controle de resposta nem como indicador de consistência do protocolo');
  });

  it('30 · proíbe as sete inferências sem contexto', () => {
    expect(P).toContain('não infira número de amigos, qualidade das amizades, habilidade social, popularidade, isolamento, funcionamento escolar ou competência social real');
  });
});

// =====================================================================
// 7 · ITENS EM DOIS FATORES E ITENS REVERSE
// =====================================================================

describe('ETPC narrativa · itens compartilhados entre fatores', () => {
  it('31 · declara que os fatores não são blocos independentes de resposta', () => {
    expect(P).toContain('ITENS PODEM PONTUAR EM DOIS FATORES AO MESMO TEMPO');
    expect(P).toContain('os quatro fatores não são blocos independentes de resposta, e isso é propriedade do CÁLCULO, já resolvida pelo servidor');
  });

  it('32 · proíbe reconstruir independência, corrigir dupla participação e dividir ponto', () => {
    expect(P).toContain('NÃO tente reconstruir independência entre fatores, não corrija dupla participação de item, não divida ponto entre fatores');
    expect(P).toContain('não trate diferença entre dois fatores como se cada um viesse de um grupo totalmente separado de respostas');
  });

  it('33 · proíbe inverter resposta, reconstruir bruto e mencionar item invertido', () => {
    expect(P).toContain('Itens invertidos (reverse) também pertencem só ao cálculo: não inverta resposta, não reconstrua bruto e não mencione qual item foi invertido');
  });

  it('34 · confirmação estrutural no controlador: itens 3, 14, 26 (P+E) e 28 (P+Sociabilidade) são compartilhados', () => {
    const etpcJson = leia('..', 'CorrigeFacil', 'data', 'etpc.json');
    const d = JSON.parse(etpcJson);
    const compartilhados = d.items.filter((i: { factors: string[] }) => i.factors.length > 1);
    expect(compartilhados.map((i: { number: number }) => i.number).sort((a: number, b: number) => a - b)).toEqual([3, 14, 26, 28]);
    for (const i of compartilhados.slice(0, 3)) {
      expect(i.factors).toContain('Psicoticismo');
      expect(i.factors).toContain('Extroversão');
    }
    const item28 = compartilhados.find((i: { number: number }) => i.number === 28);
    expect(item28.factors).toEqual(expect.arrayContaining(['Psicoticismo', 'Sociabilidade']));
  });

  it('35 · confirmação estrutural: existem itens reverse no controlador', () => {
    const etpcJson = leia('..', 'CorrigeFacil', 'data', 'etpc.json');
    const d = JSON.parse(etpcJson);
    const reverse = d.items.filter((i: { reverse: boolean }) => i.reverse);
    expect(reverse.length).toBeGreaterThan(0);
  });
});

describe('ETPC narrativa · nenhuma leitura item a item', () => {
  it('36 · declara que só resultados por fator chegam', () => {
    expect(P).toContain('VOCÊ RECEBE RESULTADOS POR FATOR, NUNCA RESPOSTAS ITEM A ITEM');
  });

  it('37 · confirmação estrutural: o gerador não abre query de respostas', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
    expect(GERADOR).not.toMatch(/\.from\(['"]respostas['"]\)/);
  });
});

// =====================================================================
// 8 · GRUPO NORMATIVO — 15 GRUPOS, SELEÇÃO MANUAL
// =====================================================================

describe('ETPC narrativa · grupo normativo é escolha manual, já feita', () => {
  it('38 · declara escolha manual entre 15 grupos, com região/sexo/idade', () => {
    expect(P).toContain('O GRUPO NORMATIVO É ESCOLHA MANUAL, JÁ FEITA ANTES DESTE RELATÓRIO — entre 15 grupos possíveis, alguns definidos por região, sexo, idade ou combinações dessas dimensões');
  });

  it('39 · proíbe escolher, trocar, comparar e testar grupos alternativos', () => {
    expect(P).toContain('Você não escolhe grupo, não troca grupo, não compara o resultado contra os outros grupos possíveis, não testa qual grupo produziria classificação diferente');
  });

  it('40 · proíbe inferir grupo por sexo, gênero, idade, região, endereço ou nome', () => {
    expect(P).toContain('não infere grupo a partir de sexo, gênero, idade, região, endereço ou nome');
  });

  it('41 · manda trabalhar só com o grupo já selecionado', () => {
    expect(P).toContain('Existe UM grupo já selecionado para este protocolo; trabalhe só com o resultado que ele produziu');
  });

  it('42 · estrutural: generateCorrigeFacilReport não lê norm_selector nem grupo normativo hoje', () => {
    const inicioFuncao = GERADOR.indexOf('export async function generateCorrigeFacilReport');
    const corpo = GERADOR.slice(inicioFuncao);
    expect(corpo).not.toMatch(/norm_selector/);
    expect(corpo).not.toMatch(/grupo_normativo/);
  });

  it('43 · nenhuma query nova de dimensão/grupo foi aberta neste piloto', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_dimensions['"]\)/);
  });

  it('44 · confirmação estrutural: o controlador tem exatamente 15 grupos, com região/sexo/idade', () => {
    const etpcJson = leia('..', 'CorrigeFacil', 'data', 'etpc.json');
    const d = JSON.parse(etpcJson);
    const grupos = Object.keys(d.norm_groups);
    expect(grupos).toHaveLength(15);
    expect(grupos).toContain('Centro-Oeste Feminino');
    expect(grupos).toContain('5 anos');
    expect(grupos).toContain('Amostra Geral');
  });
});

// =====================================================================
// 9 · OS SEIS PASSOS DE RACIOCÍNIO
// =====================================================================

describe('ETPC narrativa · os seis passos', () => {
  it('45 · classificação, configuração, convergência, destoante, itens duplos, mensagem', () => {
    for (const passo of [
      '1. IDENTIFICAR a classificação fechada',
      '2. OBSERVAR a configuração conjunta',
      '3. IDENTIFICAR convergência ou contraste',
      '4. VERIFICAR se algum fator realmente destoa',
      '5. LEMBRAR que alguns itens alimentam dois fatores',
      '6. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. IDENTIFICAR a classificação fechada'),
      P.indexOf('2. OBSERVAR a configuração conjunta'),
      P.indexOf('3. IDENTIFICAR convergência ou contraste'),
      P.indexOf('4. VERIFICAR se algum fator realmente destoa'),
      P.indexOf('5. LEMBRAR que alguns itens alimentam dois fatores'),
      P.indexOf('6. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('46 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('47 · o passo 5 explica que a diferença entre fatores não é subtração limpa', () => {
    expect(P).toContain('a diferença entre dois deles não é uma subtração limpa de blocos separados');
  });
});

// =====================================================================
// 10 · AS CINCO SEÇÕES
// =====================================================================

describe('ETPC narrativa · o que muda em cada seção', () => {
  it('48 · a síntese responde configuração e proíbe cinco "perfis" inventados', () => {
    expect(P).toContain('qual é a configuração principal deste ETPC?');
    expect(P).toContain('"perfil psicótico", "perfil neurótico", "perfil antissocial", "perfil saudável" ou "personalidade patológica"');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('49 · a análise articula os quatro fatores sem inferências não sustentadas', () => {
    expect(P).toContain('NÃO infira diagnóstico, transtorno de personalidade, psicose, ansiedade, depressão, funcionamento social real, causalidade ou prognóstico sem dado externo fornecido');
  });

  it('50 · o contexto proíbe as oito conversões automáticas no destino Escola', () => {
    expect(P).toContain('No destino Escola em especial, não derive automaticamente sociabilidade escolar, amizades, participação, isolamento, comportamento, rendimento, adaptação ou problema emocional');
  });

  it('51 · as recomendações passam pelo teste da causa e proíbem seis encaminhamentos automáticos', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do ETPC?');
    expect(P).toContain('NÃO recomende automaticamente psicoterapia, psiquiatria, neurologia, medicação, avaliação diagnóstica, intervenção escolar ou treino de habilidades sociais');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
  });

  it('52 · as considerações finais fecham sem repetir fatores nem recomendações', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL sem repetir os quatro fatores nem as recomendações');
  });
});

// =====================================================================
// 11 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('ETPC narrativa · nenhum extremo autoriza diagnóstico', () => {
  it('53 · proíbe as cinco conversões mesmo com classificação Superior em qualquer fator', () => {
    expect(P).toContain('O QUE NUNCA SE FAZ COM O ETPC, mesmo com classificação Superior em qualquer fator');
    expect(P).toContain('não infira psicose, transtorno de personalidade, neurose, ansiedade ou depressão a partir do NOME de um fator');
  });

  it('54 · repete a proibição sobre Sociabilidade como validade', () => {
    expect(P).toContain('Não trate Sociabilidade como escala de validade nem como controle de resposta');
  });

  it('55 · repete a proibição de somar fatores, inventar Total e reconstruir independência', () => {
    expect(P).toContain('Não some os quatro fatores, não invente Total nem índice geral de personalidade, não reconstrua independência entre fatores que compartilham item e não escolha ou compare grupo normativo');
  });

  it('56 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['no ETPC', 'neste protocolo', 'no fator [nome] do ETPC']) {
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
// 12 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('ETPC narrativa · a origem comercial não entra no conteúdo', () => {
  it('59 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ETPC');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 13 · ISOLAMENTO — nada fora do prompt mudou
// =====================================================================

describe('ETPC narrativa · isolamento contra os onze pilotos anteriores', () => {
  it('60 · os onze pilotos anteriores continuam intocados', () => {
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
    for (const p of [soFdt, soConfias, soBpa2, soDass21, soSnap, soBayley, soSdqPor, soCtrf, soEpqj, soEraa, soEraf]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
  });

  it('61 · nomes homônimos (Psicoticismo, Extroversão, Neuroticismo) não ativam o mapa de outro instrumento', () => {
    // "Psicoticismo" sozinho, como instrumentCode, não ativa NADA — a
    // trava é o código do instrumento, nunca o nome de uma escala
    for (const nome of ['Psicoticismo', 'Extroversão', 'Neuroticismo']) {
      const p = prompt(nome);
      expect(p, nome).not.toContain(MARCA_PERFIL);
      expect(p, nome).not.toContain('COMO LER O EPQ-J — PERFIL INTERPRETATIVO:');
    }
  });

  it('62 · o mapa do ETPC não nomeia o outro instrumento por código', () => {
    expect(P).not.toContain('EPQ-J');
  });

  it('63 · nenhum módulo derivado dos outros pilotos ganhou ETPC', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'phq9-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('ETPC');
    }
  });

  it('64 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'etpc-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('65 · graph-config.ts, fonte da confirmação "25/50/75 são marcadores de quartil", não foi tocado', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain('ETPC:');
    expect(graphConfig).toContain('marcadores de');
    expect(graphConfig).toContain("metrica: 'classification'");
  });
});

// =====================================================================
// 14 · OS VINTE E QUATRO CENÁRIOS PEDIDOS (A–X)
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do ETPC usam (não há bloco derivado). Nenhum destes
// valores está no prompt de produção.
// =====================================================================

type LinhaEtpc = {
  code: string;
  name: string;
  raw: number;
  score: number;
  classification: 'Inferior' | 'Médio' | 'Superior';
};

const NOMES = {
  P: 'Psicoticismo',
  E: 'Extroversão',
  N: 'Neuroticismo',
  S: 'Sociabilidade',
};

function linha(l: LinhaEtpc, ordinal: number) {
  return {
    raw: l.raw, score: l.score, percentile: null, z_score: null,
    classification: l.classification, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('ETPC narrativa · os cenários A a X', () => {
  it('A · quatro fatores em faixa Médio → síntese curta', () => {
    const dados = [
      linha({ code: 'P', name: NOMES.P, raw: 2, score: 50, classification: 'Médio' }, 0),
      linha({ code: 'E', name: NOMES.E, raw: 4, score: 50, classification: 'Médio' }, 1),
      linha({ code: 'N', name: NOMES.N, raw: 4, score: 50, classification: 'Médio' }, 2),
      linha({ code: 'S', name: NOMES.S, raw: 1, score: 50, classification: 'Médio' }, 3),
    ];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto.match(/classificação: Médio/g)?.length).toBe(4);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('B · Psicoticismo Superior → sem psicose/transtorno psicótico', () => {
    const dados = [linha({ code: 'P', name: NOMES.P, raw: 6, score: 75, classification: 'Superior' }, 0)];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Superior');
    expect(P).toContain('Classificação Superior NÃO significa psicose, transtorno psicótico, esquizofrenia');
  });

  it('C · Neuroticismo Superior → sem neurose/ansiedade/depressão', () => {
    const dados = [linha({ code: 'N', name: NOMES.N, raw: 7, score: 75, classification: 'Superior' }, 0)];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Superior');
    expect(P).toContain('Não converta em neurose, transtorno de ansiedade, depressão');
  });

  it('D · Extroversão Inferior → sem isolamento/timidez clínica', () => {
    const dados = [linha({ code: 'E', name: NOMES.E, raw: 0, score: 25, classification: 'Inferior' }, 0)];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Inferior');
    expect(P).toContain('nem Inferior em isolamento, timidez clínica, déficit social ou prejuízo de interação');
  });

  it('E · Extroversão Superior → sem funcionamento social superior automático', () => {
    const dados = [linha({ code: 'E', name: NOMES.E, raw: 8, score: 75, classification: 'Superior' }, 0)];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Superior');
    expect(P).toContain('não converta Superior em melhor sociabilidade, melhor adaptação, melhor competência social ou bom funcionamento');
  });

  it('F · Sociabilidade Inferior → sem ausência de amigos/prejuízo social', () => {
    const dados = [linha({ code: 'S', name: NOMES.S, raw: 0, score: 25, classification: 'Inferior' }, 0)];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Inferior');
    expect(P).toContain('não infira número de amigos, qualidade das amizades');
  });

  it('G · Sociabilidade Superior → sem competência social comprovada', () => {
    const dados = [linha({ code: 'S', name: NOMES.S, raw: 5, score: 75, classification: 'Superior' }, 0)];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Superior');
    expect(P).toContain('habilidade social, popularidade, isolamento, funcionamento escolar ou competência social real');
  });

  it('H · perfil heterogêneo → contraste permitido', () => {
    const dados = [
      linha({ code: 'P', name: NOMES.P, raw: 6, score: 75, classification: 'Superior' }, 0),
      linha({ code: 'S', name: NOMES.S, raw: 0, score: 25, classification: 'Inferior' }, 1),
    ];
    const texto = formatClosedResults(dados, 'ETPC');
    expect(texto).toContain('classificação: Superior');
    expect(texto).toContain('classificação: Inferior');
    expect(P).toContain('IDENTIFICAR convergência ou contraste');
  });

  it('I · não existe Total → nenhum composto inventado', () => {
    expect(P).toContain('NÃO EXISTE TOTAL NO ETPC');
  });

  it('J · itens compartilhados → nenhum fator tratado como conjunto independente', () => {
    expect(P).toContain('os quatro fatores não são blocos independentes de resposta');
  });

  it('K · item 3/14/26 compartilhado P+E → nenhuma correção/repartição/reconstrução', () => {
    expect(P).toContain('não corrija dupla participação de item, não divida ponto entre fatores');
  });

  it('L · item 28 compartilhado P+Sociabilidade → mesma trava', () => {
    // a trava do mapa é genérica para "dois fatores", cobrindo os quatro
    // itens (3, 14, 26 em P+E; 28 em P+Sociabilidade) igualmente
    expect(P).toContain('ITENS PODEM PONTUAR EM DOIS FATORES AO MESMO TEMPO');
  });

  it('M · itens reverse → nenhuma inversão pela IA', () => {
    expect(P).toContain('não inverta resposta, não reconstrua bruto e não mencione qual item foi invertido');
  });

  it('N · classificação Inferior/Médio/Superior preservada exatamente', () => {
    expect(P).toContain('Preserve exatamente Inferior, Médio ou Superior como vieram');
  });

  it('O · quartil não vira automaticamente percentil', () => {
    expect(P).toContain('NÃO trate esse número como quantidade, como posição percentílica');
  });

  it('P · nenhum Q25/Q50/Q75 chega ao perfil', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ETPC = `');
    const fim = GERADOR.indexOf('`;', inicio);
    expect(GERADOR.slice(inicio, fim)).not.toMatch(/Q25|Q50|Q75/);
  });

  it('Q · grupo normativo é manual → IA não escolhe', () => {
    expect(P).toContain('Você não escolhe grupo');
  });

  it('R · um dos 15 grupos já selecionado → IA não compara contra os demais', () => {
    expect(P).toContain('não compara o resultado contra os outros grupos possíveis, não testa qual grupo produziria classificação diferente');
  });

  it('S · grupo com sexo no nome → não inferir automaticamente pelo sexo cadastrado', () => {
    expect(P).toContain('não infere grupo a partir de sexo');
  });

  it('T · grupo com idade no nome → não inferir automaticamente pela idade', () => {
    expect(P).toContain('idade, região, endereço ou nome');
  });

  it('U · grupo regional → não inferir por endereço/região', () => {
    expect(P).toContain('região, endereço ou nome');
  });

  it('V · fatores homônimos com outro instrumento → ativação apenas pelo instrumentCode ETPC', () => {
    expect(prompt('Psicoticismo')).not.toContain(MARCA_PERFIL);
  });

  it('W · Sociabilidade NÃO é escala de validade', () => {
    expect(P).toContain('SOCIABILIDADE É FATOR PRIMÁRIO DO ETPC, NÃO ESCALA DE VALIDADE');
  });

  it('X · isolamento contra todos os onze perfis anteriores', () => {
    for (const alheio of ['CONFIAS', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SDQ-POR', 'C-TRF', 'EPQ-J', 'ERA-A', 'ERA-F']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toMatch(/\bFDT\b/);
    expect(P).not.toMatch(/\bPHQ-9\b/);
  });

  it('66 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['B', [linha({ code: 'P', name: NOMES.P, raw: 6, score: 75, classification: 'Superior' }, 0)]],
      ['H', [
        linha({ code: 'P', name: NOMES.P, raw: 6, score: 75, classification: 'Superior' }, 0),
        linha({ code: 'S', name: NOMES.S, raw: 0, score: 25, classification: 'Inferior' }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'ETPC');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
