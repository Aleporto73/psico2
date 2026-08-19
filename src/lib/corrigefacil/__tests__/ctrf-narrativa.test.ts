// =====================================================================
// C-TRF 1½-5 · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-8
//
// Oitavo piloto da mesma arquitetura. Mesma família estrutural do BPA-2,
// da DASS-21, do SNAP-IV, da Bayley-III e do SDQ-POR: sem snapshot, sem
// REGRA_CTRF — as nove escalas (I a VI, INT, EXT, TOT) chegam pelos
// resultados por escala de sempre. Reusa `instrumentCode` — mais um
// `const comCtrf` local, nenhuma mudança de assinatura.
//
// A HIERARQUIA QUE ESTE ARQUIVO GUARDA: `data/ctrf_1.5-5.json`, no
// CorrigeFacil, declara seis escalas `type: "syndrome"` (I a VI) e três
// `type: "broadband"` — INT (composed_of I+II+III+IV), EXT (composed_of
// V+VI) e TOT (composed_of "ALL_ITEMS"). TOT NÃO é INT+EXT: há itens do
// controlador fora das seis síndromes (`items[].scale: null`) que só
// entram no Total.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'C-TRF_1.5-5'`.
//      Com qualquer outro valor o prompt dos outros instrumentos é BYTE A
//      BYTE o que era, e o sha256 dos quatro destinos é o MESMO já usado
//      nos sete pilotos anteriores.
//
//   2. composição — TOT nunca é reconstruído como INT+EXT; nomes de
//      escala nunca viram diagnóstico; T e classificação são dados
//      fechados, sem corte reproduzido no mapa.
//
//   3. informante — Professor/Cuidador é a fonte ancorada; nenhuma
//      comparação entre respondentes é inventada.
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

const MARCA_PERFIL = 'COMO LER O C-TRF 1½-5 — PERFIL INTERPRETATIVO:';

const P = prompt('C-TRF_1.5-5');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('C-TRF narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="C-TRF_1.5-5", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('C-TRF_1.5-5', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do C-TRF', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'SDQ-POR', 'c-trf_1.5-5', 'C-TRF', 'C-TRF_6-18',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos sete pilotos anteriores recebe o mapa do C-TRF', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    const soSnap18 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-18');
    const soSnap26 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-26');
    const soBayley = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BAYLEY-III');
    const soSdqPor = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SDQ-POR');
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley, soSdqPor]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('C-TRF');
    }
  });

  it('5 · o C-TRF sozinho não menciona os outros oito pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED', 'SDQ-POR']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_CTRF: nenhuma das nove escalas é snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_CTRF/);
    expect(GERADOR).not.toContain('REGRA_CTRF :');
    expect(GERADOR).not.toContain('REGRA_CTRF +');
  });

  it('7 · reusa `instrumentCode`: nenhum comCtrf na assinatura', () => {
    expect(GERADOR).not.toMatch(/comCtrf\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comCtrf = instrumentCode === CODIGO_CTRF;',
    );
    expect(GERADOR).toContain(
      "${comCtrf ? PERFIL_INTERPRETATIVO_CTRF : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como os demais pilotos sem família de variantes', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_CTRF = `');
    expect(GERADOR).toContain("const CODIGO_CTRF = 'C-TRF_1.5-5';");
  });

  it('9 · a chamada real já alimenta o C-TRF: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('C-TRF_1.5-5', destino).match(/^## /gm) ?? []).length, destino)
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

describe('C-TRF narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · HIERARQUIA — TRÊS CAMADAS
// =====================================================================

describe('C-TRF narrativa · três camadas, não nove medidas soltas', () => {
  it('13 · declara as seis escalas específicas como Camada 1', () => {
    expect(P).toContain('CAMADA 1 — seis escalas específicas (síndromes)');
    expect(P).toContain(
      'Reatividade Emocional, Ansiedade/Depressão, Queixas Somáticas, Isolamento, Problemas de Atenção e Comportamento Agressivo',
    );
  });

  it('14 · declara Internalização e Externalização como Camada 2, com composição', () => {
    expect(P).toContain('CAMADA 2 — dois eixos amplos');
    expect(P).toContain(
      'Internalização agrega Reatividade Emocional, Ansiedade/Depressão, Queixas Somáticas e Isolamento',
    );
    expect(P).toContain('Externalização agrega Problemas de Atenção e Comportamento Agressivo');
    expect(P).toContain('não uma sétima e oitava síndrome independentes');
  });

  it('15 · declara o Total como Camada 3, sobre TODOS os itens', () => {
    expect(P).toContain('CAMADA 3 — Total de Problemas, calculado sobre TODOS os itens do protocolo');
    expect(P).toContain('não só sobre os que compõem as seis síndromes');
  });
});

// =====================================================================
// 4 · COMPOSIÇÃO — REGRA CRÍTICA: TOTAL NÃO É INT+EXT
// =====================================================================

describe('C-TRF narrativa · o Total nunca é reconstruído como INT+EXT', () => {
  it('16 · proíbe tratar e reconstruir o Total como Internalização mais Externalização', () => {
    expect(P).toContain('NÃO trate o Total como Internalização mais Externalização');
    expect(P).toContain('NÃO tente conferir, somar ou reconstruir essa soma');
  });

  it('17 · explica por que a soma não fecha: itens fora das seis síndromes', () => {
    expect(P).toContain(
      'há itens do instrumento fora das seis escalas de síndrome que só entram no Total',
    );
    expect(P).toContain('a soma de INT com EXT não fecha o valor real dele');
  });

  it('18 · manda usar somente o Total fechado recebido', () => {
    expect(P).toContain('Use somente o Total fechado que veio na tabela de resultados');
  });

  it('19 · formatClosedResults confirma: nada aqui soma nada — os valores são os recebidos', () => {
    const linha = (code: string, name: string, score: number, classification: string) => ({
      raw: null, score, percentile: null, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('INT', 'Internalização', 62, 'Não clínico'),
      linha('EXT', 'Externalização', 58, 'Não clínico'),
      linha('TOT', 'Total de Problemas', 90, 'Clínico'),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('escore: 62');
    expect(texto).toContain('escore: 58');
    expect(texto).toContain('escore: 90');
    // o motor não soma nada: 62 + 58 = 120, e 90 continua sendo 90 no texto
    expect(texto).not.toContain('escore: 120');
  });
});

// =====================================================================
// 5 · T-SCORE E CLASSIFICAÇÃO SÃO DADOS FECHADOS
// =====================================================================

describe('C-TRF narrativa · T e classificação preservados, sem corte reproduzido', () => {
  it('20 · proíbe recalcular T, aplicar corte, reclassificar e converter em percentil', () => {
    expect(P).toContain('Não recalcule T a partir do bruto, não aplique corte, não reclassifique');
    expect(P).toContain('não verifique se a classificação "bate" com o T');
    expect(P).toContain('não converta T em percentil, não estime percentil, não use distribuição normal');
    expect(P).toContain('não trate T como diagnóstico');
  });

  it('21 · nenhum corte numérico do controlador aparece no mapa', () => {
    // cortes reais do controlador: syndrome 65/70, broadband 60/64 — não
    // podem aparecer como número solto de corte no texto do mapa
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_CTRF = `');
    const fim = GERADOR.indexOf('`;', inicio);
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/\b65\b/);
    expect(bloco).not.toMatch(/\b70\b/);
    expect(bloco).not.toMatch(/\b60\b/);
    expect(bloco).not.toMatch(/\b64\b/);
    expect(bloco).not.toMatch(/corte\s+(de\s+)?\d/i);
  });

  it('22 · declara réguas diferentes entre síndrome e banda larga, sem expor onde o corte fica', () => {
    expect(P).toContain('As nove escalas usam réguas diferentes entre síndromes e bandas largas');
    expect(P).toContain('você não precisa e não deve saber onde o corte fica');
  });
});

// =====================================================================
// 6 · NOMES DE ESCALA NÃO SÃO DIAGNÓSTICO
// =====================================================================

describe('C-TRF narrativa · nenhuma escala vira diagnóstico', () => {
  it('23 · bloqueia as nove conversões, mesmo com classificação Clínica', () => {
    expect(P).toContain('NOMES DE ESCALA NÃO SÃO DIAGNÓSTICO, mesmo com classificação clínica');
    for (const par of [
      'Ansiedade/Depressão não é diagnóstico de ansiedade nem de depressão',
      'Problemas de Atenção não é TDAH',
      'Comportamento Agressivo não é transtorno de conduta nem TOD',
      'Isolamento não é TEA nem transtorno social',
      'Queixas Somáticas não é transtorno somático',
      'Reatividade Emocional não é transtorno emocional',
      'Internalização não é transtorno internalizante',
      'Externalização não é transtorno externalizante',
      'Total de Problemas não é psicopatologia global, gravidade clínica global nem diagnóstico global',
    ]) {
      expect(P, par).toContain(par);
    }
  });

  it('24 · a proibição vale em qualquer destino, mesmo diante de classificação Clínica', () => {
    expect(P).toContain('Nenhuma dessas conversões é permitida em nenhum destino, mesmo diante de classificação Clínica');
  });
});

// =====================================================================
// 7 · DESCRIÇÕES CONCEITUAIS NÃO VIRAM FATO SOBRE A CRIANÇA
// =====================================================================

describe('C-TRF narrativa · descrição conceitual não é manifestação provada', () => {
  it('25 · declara que a descrição conceitual não prova manifestação específica', () => {
    expect(P).toContain('Uma descrição conceitual NÃO é prova de manifestação específica');
    expect(P).toContain(
      'a criança apresenta impulsividade, agitação e baixa persistência',
    );
    expect(P).toContain('se esses comportamentos não vieram nos resultados ou no contexto escrito pelo profissional');
  });

  it('26 · reforça que a escala é dimensão avaliada, não prova de cada manifestação', () => {
    expect(P).toContain('A escala é uma dimensão avaliada, e o nome da dimensão não prova cada manifestação da sua descrição conceitual');
  });
});

// =====================================================================
// 8 · INFORMANTE — PROFESSOR/CUIDADOR, SEM COMPARAÇÃO INVENTADA
// =====================================================================

describe('C-TRF narrativa · informante ancorado, sem comparação entre respondentes', () => {
  it('27 · ancora a leitura na fonte do protocolo', () => {
    expect(P).toContain('o C-TRF é respondido por Professor/Cuidador');
    expect(P).toContain('no protocolo respondido pelo professor/cuidador');
    expect(P).toContain('em vez de escrever automaticamente "a criança é..."');
  });

  it('28 · proíbe inventar comparação entre informantes', () => {
    expect(P).toContain('Você recebe um único respondente por avaliação');
    expect(P).toContain('não invente comparação, concordância ou discrepância entre informantes que não foram fornecidos');
  });

  it('29 · o sistema hoje registra um único respondente por avaliação de C-TRF — confirmado no teste de idade manual', () => {
    const idadeManual = leia(
      'src', 'app', 'app', 'corrigefacil', '__tests__', 'ctrf-idade-manual.test.ts',
    );
    expect(idadeManual).toContain('um respondente só: nada de respondent_2 nem de comparação');
  });
});

// =====================================================================
// 9 · CONTRASTES — DESCRITOS, NUNCA EXPLICADOS
// =====================================================================

describe('C-TRF narrativa · contrastes descritos, nunca explicados por causa', () => {
  it('30 · permite descrever contraste real entre eixos e dentro de eixo', () => {
    expect(P).toContain('CONTRASTES ENTRE ESCALAS PODEM SER DESCRITOS quando os dados realmente sustentarem');
    expect(P).toContain('Internalização mais elevada que Externalização, uma escala específica destoando das demais dentro do mesmo eixo');
  });

  it('31 · oferece a formulação segura e proíbe explicar a causa', () => {
    expect(P).toContain(
      'na configuração observada, os resultados do eixo de Internalização apresentaram maior elevação',
    );
    expect(P).toContain('não explique a causa do contraste');
  });

  it('32 · evita rótulo de categoria clínica não fornecida', () => {
    expect(P).toContain('Evite rótulos que soem categoria clínica não fornecida pelo sistema, como "predomínio internalizante"');
  });
});

// =====================================================================
// 10 · TOTAL ELEVADO NÃO APAGA A HETEROGENEIDADE
// =====================================================================

describe('C-TRF narrativa · Total elevado não apaga a configuração das escalas específicas', () => {
  it('33 · declara que Total elevado pode coexistir com perfil heterogêneo', () => {
    expect(P).toContain('um Total elevado pode coexistir com perfil interno heterogêneo');
    expect(P).toContain('o Total não substitui a leitura das camadas 1 e 2');
  });

  it('34 · proíbe as cinco expressões de "índice global"', () => {
    for (const proibida of [
      '"índice global de psicopatologia"',
      '"gravidade global"',
      '"nível geral de transtorno"',
      '"quadro global"',
      '"comprometimento global"',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });
});

// =====================================================================
// 11 · OS SEIS PASSOS DE RACIOCÍNIO
// =====================================================================

describe('C-TRF narrativa · os seis passos', () => {
  it('35 · total, eixos, escalas específicas, contrastes, acréscimo do total, mensagem', () => {
    for (const passo of [
      '1. TOTAL DE PROBLEMAS',
      '2. INTERNALIZAÇÃO E EXTERNALIZAÇÃO',
      '3. AS SEIS ESCALAS ESPECÍFICAS',
      '4. CONTRASTES REAIS',
      '5. O QUE O TOTAL ACRESCENTA',
      '6. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. TOTAL DE PROBLEMAS'),
      P.indexOf('2. INTERNALIZAÇÃO E EXTERNALIZAÇÃO'),
      P.indexOf('3. AS SEIS ESCALAS ESPECÍFICAS'),
      P.indexOf('4. CONTRASTES REAIS'),
      P.indexOf('5. O QUE O TOTAL ACRESCENTA'),
      P.indexOf('6. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('36 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('37 · o passo 5 proíbe repetir os outros resultados só para preencher', () => {
    expect(P).toContain('Não repita os outros resultados só para preencher a seção');
  });
});

// =====================================================================
// 12 · AS CINCO SEÇÕES
// =====================================================================

describe('C-TRF narrativa · o que muda em cada seção', () => {
  it('38 · a síntese responde configuração, prioriza Total/eixos/contraste', () => {
    expect(P).toContain('qual é a configuração principal deste C-TRF?');
    expect(P).toContain('não enumere as nove escalas em sequência mecânica');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('39 · a análise integra as camadas sem relação causal', () => {
    expect(P).toContain('SEM dizer que as escalas específicas "causam" os eixos ou o Total');
    expect(P).toContain('são camadas de agregação, não relação causal');
    expect(P).toContain('Não recite todas as seis escalas se estiverem homogêneas');
  });

  it('40 · o contexto trata os quatro destinos como narrativos e proíbe as seis inferências automáticas', () => {
    expect(P).toContain('trate Família, Escola, Equipe técnica e Registro interno como destinos NARRATIVOS');
    expect(P).toContain('eles mudam a voz, nunca a psicometria');
    expect(P).toContain('prejuízo escolar, prejuízo familiar, dificuldade de aprendizagem, problema de relacionamento, incapacidade funcional ou necessidade de tratamento');
  });

  it('41 · as recomendações passam pelo teste da causa e proíbem oito encaminhamentos automáticos', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do C-TRF?');
    expect(P).toContain(
      'NÃO recomende automaticamente psicoterapia, psiquiatria, neurologia, medicação, adaptação escolar, avaliação diagnóstica, tratamento ou encaminhamento',
    );
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
  });

  it('42 · as considerações finais fecham sem repetir escalas nem recomendações', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL sem repetir as nove escalas nem as recomendações');
  });
});

// =====================================================================
// 13 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('C-TRF narrativa · nenhum extremo autoriza diagnóstico', () => {
  it('43 · proíbe os oito transtornos mesmo com classificação Clínica em qualquer escala', () => {
    expect(P).toContain(
      'O QUE NUNCA SE FAZ COM O C-TRF, mesmo com classificação Clínica em qualquer escala',
    );
    for (const transtorno of [
      'ansiedade', 'depressão', 'TDAH', 'transtorno de conduta', 'TOD',
      'TEA', 'transtorno social', 'transtorno somático', 'transtorno emocional',
    ]) {
      expect(P, transtorno).toContain(transtorno);
    }
  });

  it('44 · proíbe Internalização/Externalização como transtorno e Total como diagnóstico global', () => {
    expect(P).toContain('Não trate Internalização como transtorno internalizante, Externalização como transtorno externalizante');
    expect(P).toContain('nem o Total como psicopatologia, gravidade ou diagnóstico global');
  });

  it('45 · repete a proibição de recalcular T, aplicar corte e reconstruir o Total', () => {
    expect(P).toContain('Não recalcule T, não aplique corte, não converta T em percentil e não reconstrua o Total a partir de Internalização e Externalização');
  });

  it('46 · manda ancorar no protocolo e na fonte informante, não na criança', () => {
    for (const ancora of ['no C-TRF', 'neste protocolo', 'nos resultados deste C-TRF respondido pelo professor/cuidador']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('47 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain(
      'não alongue o texto, não percorra as nove escalas como tabela em prosa, e não acrescente cautela nova',
    );
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('48 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain('Ele não abre nenhuma exceção à REGRA CENTRAL');
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
  });
});

// =====================================================================
// 14 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('C-TRF narrativa · a origem comercial não entra no conteúdo', () => {
  it('49 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_CTRF');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 15 · ISOLAMENTO — nada fora do prompt mudou, e nada dos outros oito
//      pilotos foi tocado
// =====================================================================

describe('C-TRF narrativa · isolamento contra os oito pilotos anteriores', () => {
  it('50 · os oito pilotos anteriores continuam intocados', () => {
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
    for (const p of [soFdt, soConfias, soBpa2, soDass21, soSnap, soBayley, soSdqPor]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
  });

  it('51 · nenhum módulo derivado dos outros pilotos ganhou C-TRF', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'phq9-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('C-TRF');
    }
  });

  it('52 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'ctrf-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'ctrf.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('53 · graph-config.ts, fonte dos dois blocos e do range 29..100, não foi tocado por este PR', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain("'C-TRF_1.5-5'");
    expect(graphConfig).toContain('Síndromes');
    expect(graphConfig).toContain('Bandas largas');
    // e o gerador não duplica essa lógica de gráfico
    expect(GERADOR).not.toContain('standardized_profile');
  });
});

// =====================================================================
// 16 · OS DOZE CENÁRIOS PEDIDOS (A–L)
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do C-TRF usam (não há bloco derivado). Nenhum destes
// valores está no prompt de produção.
// =====================================================================

type LinhaCtrf = {
  code: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'INT' | 'EXT' | 'TOT';
  name: string;
  score: number;
  classification: string | null;
};

const NOMES = {
  I: 'Reatividade Emocional',
  II: 'Ansiedade/Depressão',
  III: 'Queixas Somáticas',
  IV: 'Isolamento',
  V: 'Problemas de Atenção',
  VI: 'Comportamento Agressivo',
  INT: 'Internalização',
  EXT: 'Externalização',
  TOT: 'Total de Problemas',
};

function linha(l: LinhaCtrf, ordinal: number) {
  return {
    raw: null, score: l.score, percentile: null, z_score: null,
    classification: l.classification, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('C-TRF narrativa · os cenários A a L', () => {
  it('A · perfil homogêneo sem elevações relevantes → síntese curta, sem lista das nove', () => {
    const dados = [
      linha({ code: 'I', name: NOMES.I, score: 52, classification: 'Não clínico' }, 0),
      linha({ code: 'II', name: NOMES.II, score: 50, classification: 'Não clínico' }, 1),
      linha({ code: 'TOT', name: NOMES.TOT, score: 45, classification: 'Não clínico' }, 2),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('classificação: Não clínico');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('não enumere as nove escalas em sequência mecânica');
  });

  it('B · Internalização mais elevada que Externalização → contraste descritivo, sem diagnóstico internalizante', () => {
    const dados = [
      linha({ code: 'INT', name: NOMES.INT, score: 78, classification: 'Clínico' }, 0),
      linha({ code: 'EXT', name: NOMES.EXT, score: 52, classification: 'Não clínico' }, 1),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('classificação: Clínico');
    expect(P).toContain('Internalização mais elevada que Externalização');
    expect(P).toContain('Internalização não é transtorno internalizante');
  });

  it('C · Externalização mais elevada → sem TDAH/TOD/transtorno de conduta', () => {
    const dados = [
      linha({ code: 'EXT', name: NOMES.EXT, score: 80, classification: 'Clínico' }, 0),
      linha({ code: 'INT', name: NOMES.INT, score: 50, classification: 'Não clínico' }, 1),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('classificação: Clínico');
    expect(P).toContain('Problemas de Atenção não é TDAH');
    expect(P).toContain('Comportamento Agressivo não é transtorno de conduta nem TOD');
  });

  it('D · uma escala específica elevada dentro de Internalização → pode destacar, sem virar diagnóstico', () => {
    const dados = [
      linha({ code: 'IV', name: NOMES.IV, score: 74, classification: 'Clínico' }, 0),
      linha({ code: 'I', name: NOMES.I, score: 51, classification: 'Não clínico' }, 1),
      linha({ code: 'II', name: NOMES.II, score: 50, classification: 'Não clínico' }, 2),
      linha({ code: 'III', name: NOMES.III, score: 50, classification: 'Não clínico' }, 3),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('classificação: Clínico');
    expect(P).toContain('uma escala específica destoando das demais dentro do mesmo eixo');
    expect(P).toContain('Isolamento não é TEA nem transtorno social');
  });

  it('E · uma escala específica elevada dentro de Externalização → mesma trava', () => {
    const dados = [
      linha({ code: 'VI', name: NOMES.VI, score: 82, classification: 'Clínico' }, 0),
      linha({ code: 'V', name: NOMES.V, score: 50, classification: 'Não clínico' }, 1),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('classificação: Clínico');
    expect(P).toContain('Comportamento Agressivo não é transtorno de conduta nem TOD');
  });

  it('F · Total elevado com componentes heterogêneos → Total não apaga heterogeneidade', () => {
    const dados = [
      linha({ code: 'I', name: NOMES.I, score: 80, classification: 'Clínico' }, 0),
      linha({ code: 'II', name: NOMES.II, score: 50, classification: 'Não clínico' }, 1),
      linha({ code: 'TOT', name: NOMES.TOT, score: 90, classification: 'Clínico' }, 2),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    expect(texto).toContain('classificação: Clínico');
    expect(P).toContain('um Total elevado pode coexistir com perfil interno heterogêneo');
    expect(P).toContain('o Total não substitui a leitura das camadas 1 e 2');
  });

  it('G · o Total não deve ser reconstruído como INT + EXT', () => {
    const dados = [
      linha({ code: 'INT', name: NOMES.INT, score: 60, classification: 'Não clínico' }, 0),
      linha({ code: 'EXT', name: NOMES.EXT, score: 55, classification: 'Não clínico' }, 1),
      linha({ code: 'TOT', name: NOMES.TOT, score: 130, classification: 'Clínico' }, 2),
    ];
    const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
    // 60 + 55 = 115, mas o Total real recebido é 130 — a diferença é
    // exatamente o que prova que a soma não fecha
    expect(texto).toContain('escore: 130');
    expect(texto).not.toContain('escore: 115');
    expect(P).toContain('NÃO tente conferir, somar ou reconstruir essa soma');
  });

  it('H · T-score recebido é preservado, sem recálculo, sem percentil, sem CDF', () => {
    expect(P).toContain('Não recalcule T a partir do bruto');
    expect(P).toContain('não converta T em percentil, não estime percentil, não use distribuição normal');
  });

  it('I · classificação recebida é preservada, sem reaplicar corte', () => {
    expect(P).toContain('não aplique corte, não reclassifique');
    expect(P).toContain('não verifique se a classificação "bate" com o T');
  });

  it('J · nomes das escalas não viram lista de sintomas específicos não observados', () => {
    expect(P).toContain('a criança apresenta impulsividade, agitação e baixa persistência');
    expect(P).toContain('se esses comportamentos não vieram nos resultados ou no contexto escrito pelo profissional');
  });

  it('K · fonte Professor/Cuidador preservada, sem virar verdade automática fora do protocolo', () => {
    expect(P).toContain('em vez de escrever automaticamente "a criança é..."');
  });

  it('L · isolamento contra FDT, CONFIAS, BPA-2, DASS-21, SNAP-IV, BAYLEY-III, SDQ-POR e PHQ-9', () => {
    for (const alheio of ['CONFIAS', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SDQ-POR']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toMatch(/\bFDT\b/);
    expect(P).not.toMatch(/\bPHQ-9\b/);
  });

  it('54 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['B', [
        linha({ code: 'INT', name: NOMES.INT, score: 78, classification: 'Clínico' }, 0),
        linha({ code: 'EXT', name: NOMES.EXT, score: 52, classification: 'Não clínico' }, 1),
      ]],
      ['F', [
        linha({ code: 'I', name: NOMES.I, score: 80, classification: 'Clínico' }, 0),
        linha({ code: 'TOT', name: NOMES.TOT, score: 90, classification: 'Clínico' }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'C-TRF_1.5-5');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
