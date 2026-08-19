// =====================================================================
// ERA-F · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-11
//
// Décimo primeiro piloto da mesma arquitetura. Mesma família estrutural
// do ERA-A: sem snapshot, sem REGRA_ERAF — os quatro fatores e o Escore
// Geral chegam pelos resultados por escala de sempre. Reusa
// `instrumentCode` — mais um `const comEraf` local, nenhuma mudança de
// assinatura.
//
// ERA-A E ERA-F COMPARTILHAM O LOADER, NÃO OS FATORES. Este arquivo NÃO
// testa uma cópia do mapa do ERA-A: os quatro fatores do ERA-F são
// Camuflagem: Compensação e Assimilação, Autopercepção de Gênero,
// Camuflagem: Mascaramento e Sensibilidade Sensorial — só o último é
// homônimo do ERA-A, e mesmo esse é escala de outro instrumento, com
// itens e norma próprios. A ativação é exclusivamente por
// `instrumentCode === 'ERA-F'`, nunca pelo nome de um fator.
//
// A TRAVA MAIS FORTE: Autopercepção de Gênero é dimensão do instrumento,
// e nada no resultado fechado autoriza qualquer afirmação sobre
// identidade de gênero, orientação sexual ou disforia — em nenhuma
// direção.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'ERA-F'`. Com
//      qualquer outro valor o prompt dos outros instrumentos é BYTE A
//      BYTE o que era, e o sha256 dos quatro destinos é o MESMO já
//      usado nos dez pilotos anteriores.
//
//   2. isolamento estrutural — Sensibilidade Sensorial do ERA-F nunca
//      ativa o mapa do ERA-A e vice-versa; a trava é `instrumentCode`,
//      nunca nome de escala.
//
//   3. identidade — Autopercepção de Gênero nunca vira afirmação sobre
//      identidade, orientação ou disforia, alta ou baixa.
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

const MARCA_PERFIL = 'COMO LER O ERA-F — PERFIL INTERPRETATIVO:';
const MARCA_ERAA = 'COMO LER O ERA-A — PERFIL INTERPRETATIVO:';

const P = prompt('ERA-F');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('ERA-F narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="ERA-F", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('ERA-F', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do ERA-F, inclusive ERA-A', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'SDQ-POR', 'C-TRF_1.5-5', 'EPQ-J', 'ERA-A', 'era-f', 'ERA',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos dez pilotos anteriores recebe o mapa do ERA-F', () => {
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
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley, soSdqPor, soCtrf, soEpqj, soEraa]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('ERA-F');
    }
  });

  it('5 · o ERA-F sozinho não menciona os outros dez pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED', 'SDQ-POR', 'C-TRF', 'EPQ-J']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_ERAF: nem os fatores nem o Escore Geral são snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_ERAF/);
    expect(GERADOR).not.toContain('REGRA_ERAF :');
    expect(GERADOR).not.toContain('REGRA_ERAF +');
  });

  it('7 · reusa `instrumentCode`: nenhum comEraf na assinatura', () => {
    expect(GERADOR).not.toMatch(/comEraf\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comEraf = instrumentCode === CODIGO_ERAF;',
    );
    expect(GERADOR).toContain(
      "${comEraf ? PERFIL_INTERPRETATIVO_ERAF : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como os demais pilotos sem família de variantes', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_ERAF = `');
    expect(GERADOR).toContain("const CODIGO_ERAF = 'ERA-F';");
  });

  it('9 · a chamada real já alimenta o ERA-F: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('ERA-F', destino).match(/^## /gm) ?? []).length, destino)
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

describe('ERA-F narrativa · o prompt dos outros instrumentos não mudou', () => {
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

  it('13 · o ERA-A (sha próprio, verificado no piloto anterior) continua intacto', () => {
    const soEraa = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-A');
    expect(soEraa).toContain(MARCA_ERAA);
    expect(soEraa).not.toContain(MARCA_PERFIL);
    expect(soEraa).not.toContain('ERA-F');
  });
});

// =====================================================================
// 3 · DUAS CAMADAS
// =====================================================================

describe('ERA-F narrativa · duas camadas, Escore Geral não apaga configuração', () => {
  it('14 · declara os quatro fatores reais do ERA-F como Camada 1', () => {
    expect(P).toContain('CAMADA 1 — quatro fatores específicos: Camuflagem: Compensação e Assimilação, Autopercepção de Gênero, Camuflagem: Mascaramento e Sensibilidade Sensorial');
  });

  it('15 · declara o Escore Geral como Camada 2, sem apagar a configuração interna', () => {
    expect(P).toContain('CAMADA 2 — Escore Geral, que integra os quatro fatores mas NÃO apaga a configuração interna');
  });
});

// =====================================================================
// 4 · ESCORE GERAL — COMPOSTO, NUNCA RECALCULADO
// =====================================================================

describe('ERA-F narrativa · Escore Geral composto dos 4 fatores, nunca recalculado', () => {
  it('16 · declara a composição e proíbe a IA de conferir a soma', () => {
    expect(P).toContain('O ESCORE GERAL É COMPOSTO DOS QUATRO FATORES, E AINDA ASSIM NÃO É RECALCULADO POR VOCÊ');
    expect(P).toContain('conferir essa soma não é sua tarefa');
    expect(P).toContain('NÃO some os quatro fatores para checar o servidor, não reconstrua o Escore Geral e não o corrija');
  });

  it('17 · formatClosedResults confirma: nenhum valor é somado — os valores são os recebidos', () => {
    const linha = (code: string, name: string, score: number, classification: string) => ({
      raw: null, score, percentile: score, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('CA', 'Camuflagem: Compensação e Assimilação', 40, 'Baixa presença de sintomas'),
      linha('AG', 'Autopercepção de Gênero', 35, 'Baixa presença de sintomas'),
      linha('CM', 'Camuflagem: Mascaramento', 45, 'Baixa presença de sintomas'),
      linha('SS', 'Sensibilidade Sensorial', 30, 'Baixa presença de sintomas'),
      linha('GERAL', 'Escore Geral', 50, 'Baixa presença de sintomas'),
    ];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('escore: 50');
    expect(texto).not.toContain('escore: 150');
  });
});

// =====================================================================
// 5 · CLASSIFICAÇÃO — SEM CORTE, SEM AUTISMO
// =====================================================================

describe('ERA-F narrativa · classificação fechada, sem corte, sem diagnóstico', () => {
  it('18 · declara só duas categorias, sem reaplicar corte', () => {
    expect(P).toContain('Existem só DUAS categorias no ERA-F — Baixa presença de sintomas e Alta presença de sintomas');
    expect(P).toContain('a IA não reaplica o corte que as separa, não compara percentil com ele e não substitui o rótulo recebido por outro');
  });

  it('19 · bloqueia as nove conversões de "Alta presença de sintomas"', () => {
    expect(P).toContain('"ALTA PRESENÇA DE SINTOMAS" NÃO É DIAGNÓSTICO E NÃO GANHA "DE AUTISMO"');
    for (const proibida of [
      'TEA', 'autismo', 'transtorno do espectro autista', 'risco de TEA',
      'provável TEA', 'diagnóstico', 'gravidade clínica', 'severidade global',
      'quadro clínico',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('20 · bloqueia as seis leituras de "Baixa presença de sintomas" como ausência', () => {
    expect(P).toContain('"BAIXA PRESENÇA DE SINTOMAS" TAMBÉM NÃO É AUSÊNCIA');
    for (const proibida of [
      'ausência de sintomas', 'ausência de dificuldade', 'sem risco',
      'TEA descartado', 'funcionamento típico', 'normalidade',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('21 · nenhum corte numérico do controlador aparece no mapa', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ERAF = `');
    const fim = GERADOR.indexOf('`;', inicio);
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/\b59\b/);
    expect(bloco).not.toMatch(/\b60\b/);
    expect(bloco).not.toMatch(/corte\s+(de\s+)?\d/i);
    expect(bloco).not.toMatch(/percentil\s*[<>=]\s*\d/i);
  });
});

// =====================================================================
// 6 · CAMUFLAGEM — DOIS FATORES, NÃO UM
// =====================================================================

describe('ERA-F narrativa · Camuflagem: Compensação e Assimilação', () => {
  it('22 · nome de dimensão, não lista de comportamentos', () => {
    expect(P).toContain('CAMUFLAGEM: COMPENSAÇÃO E ASSIMILAÇÃO É O NOME DE UMA DIMENSÃO, não uma lista de comportamentos');
  });

  it('23 · bloqueia as nove inferências comportamentais específicas', () => {
    expect(P).toContain('ensaia respostas sociais, imita outras pessoas, força contato visual, copia gestos, cria scripts, esconde características, muda personalidade, tenta "parecer neurotípica" ou compensa dificuldades sociais específicas');
  });

  it('24 · oferece a formulação segura', () => {
    expect(P).toContain('Prefira "no fator Camuflagem: Compensação e Assimilação do ERA-F..."');
  });
});

describe('ERA-F narrativa · Camuflagem: Mascaramento', () => {
  it('25 · bloqueia as oito inferências, sem contexto escrito', () => {
    expect(P).toContain('CAMUFLAGEM: MASCARAMENTO É OUTRO FATOR, com a mesma trava');
    expect(P).toContain('ocultação consciente, supressão de estereotipias, controle de expressão facial, imitação social, exaustão por mascaramento, burnout, sofrimento psicológico ou estratégia consciente');
  });
});

describe('ERA-F narrativa · os dois fatores de Camuflagem não se fundem', () => {
  it('26 · declara explicitamente que não são um só, e que não há composto declarado', () => {
    expect(P).toContain('OS DOIS FATORES DE CAMUFLAGEM NÃO SÃO UM SÓ');
    expect(P).toContain('o controlador não declara esse composto');
  });

  it('27 · permite comparar percentis, proíbe somar/média/índice novo', () => {
    expect(P).toContain('É permitido comparar os dois percentis fechados e dizer que um ficou relativamente mais elevado que o outro');
    expect(P).toContain('não é permitido somar os dois, criar média entre eles ou inventar um índice novo');
  });
});

// =====================================================================
// 7 · AUTOPERCEPÇÃO DE GÊNERO — TRAVA MÁXIMA
// =====================================================================

describe('ERA-F narrativa · Autopercepção de Gênero nunca vira leitura identitária', () => {
  it('28 · declara o tratamento mais cuidadoso do mapa', () => {
    expect(P).toContain('AUTOPERCEPÇÃO DE GÊNERO EXIGE O TRATAMENTO MAIS CUIDADOSO DESTE MAPA');
  });

  it('29 · bloqueia as dez conversões, em NENHUMA direção', () => {
    expect(P).toContain('em NENHUMA direção');
    for (const proibida of [
      'identidade de gênero', 'sexo', 'transgeneridade', 'cisgeneridade',
      'não-binariedade', 'orientação sexual', 'disforia de gênero',
      'incongruência de gênero', 'questionamento de identidade',
      'diagnóstico relacionado a gênero',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('30 · bloqueia as quatro formulações diretas proibidas', () => {
    expect(P).toContain('"a pessoa se identifica como..."');
    expect(P).toContain('"há indício de disforia..."');
    expect(P).toContain('"há conflito com seu gênero..."');
    expect(P).toContain('"o resultado sugere identidade..."');
  });

  it('31 · classificação alta não é patologia; baixa não é "identidade típica"', () => {
    expect(P).toContain('Classificação alta NÃO é problema, patologia ou maior sofrimento');
    expect(P).toContain('classificação baixa NÃO é "identidade de gênero típica" nem "ausência de conflito"');
  });

  it('32 · manda ancorar estritamente, sem ir além', () => {
    expect(P).toContain('Ancore estritamente com "no fator Autopercepção de Gênero do ERA-F..."');
    expect(P).toContain('e não vá além disso em hipótese alguma');
  });
});

// =====================================================================
// 8 · SENSIBILIDADE SENSORIAL — ISOLADA DO ERA-A
// =====================================================================

describe('ERA-F narrativa · Sensibilidade Sensorial do ERA-F não é a do ERA-A', () => {
  it('33 · declara explicitamente a não-equivalência entre os dois instrumentos, sem nomear o outro código', () => {
    expect(P).toContain('ESTE FATOR TEM NOME HOMÔNIMO DE UMA ESCALA DE OUTRO INSTRUMENTO DO CATÁLOGO');
    expect(P).toContain('os itens e a norma são diferentes, e os dois resultados nunca devem ser comparados ou tratados como equivalentes');
    // isolamento: o texto ensina a não comparar, mas não nomeia o ERA-A
    // por código — a trava de ativação é instrumentCode, não o nome
    expect(P).not.toContain('ERA-A');
  });

  it('34 · bloqueia as sete inferências sensoriais específicas', () => {
    expect(P).toContain('hipersensibilidade auditiva, luz, texturas, cheiros, seletividade alimentar, aversão tátil ou sobrecarga sensorial');
  });
});

// =====================================================================
// 9 · ITENS PLACEHOLDER
// =====================================================================

describe('ERA-F narrativa · itens sem enunciado, nenhuma leitura item a item', () => {
  it('35 · declara a ausência de enunciado dos 34 itens', () => {
    expect(P).toContain('OS 34 ITENS NÃO TÊM ENUNCIADO PUBLICADO NESTE PRODUTO');
    expect(P).toContain('trabalhe somente com fatores, Escore Geral, percentil, classificação e contexto escrito pelo profissional');
  });

  it('36 · confirmação estrutural: o gerador não abre query de respostas', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
    expect(GERADOR).not.toMatch(/\.from\(['"]respostas['"]\)/);
  });
});

// =====================================================================
// 10 · PERCENTIL É DADO FECHADO
// =====================================================================

describe('ERA-F narrativa · percentil fechado, sem CDF, sem interpolação', () => {
  it('37 · proíbe interpolar, CDF, distribuição normal e reconstruir tabela', () => {
    expect(P).toContain('Não interpole, não use CDF nem distribuição normal, não reconstrua a tabela normativa e não estime percentil');
  });

  it('38 · nomeia a regra do MAIOR percentil sem convidar a "corrigir"', () => {
    expect(P).toContain('o servidor já resolveu pelo MAIOR percentil');
  });

  it('39 · percentil nunca vira porcentagem de sintomas, camuflagem, sensibilidade ou identidade', () => {
    expect(P).toContain('nunca vira porcentagem de sintomas, de camuflagem, de sensibilidade ou de qualquer leitura sobre identidade');
    expect(P).toContain('"90% de camuflagem" e "80% de sintomas" são exatamente o tipo de formulação proibida');
  });
});

// =====================================================================
// 11 · NORMA ÚNICA
// =====================================================================

describe('ERA-F narrativa · norma única, "F" não é seletor de sexo/gênero', () => {
  it('40 · declara norma única e que o "F" do código não é seletor normativo', () => {
    expect(P).toContain('A NORMA DO ERA-F É ÚNICA — não há seleção de sexo, gênero, idade, escolaridade ou grupo normativo nesta arquitetura');
    expect(P).toContain('o "F" do código não é seletor normativo de sexo ou gênero: é parte do nome do instrumento');
  });

  it('41 · estrutural: nenhuma query nova de dimensão/seleção normativa foi aberta', () => {
    const inicioFuncao = GERADOR.indexOf('export async function generateCorrigeFacilReport');
    const corpo = GERADOR.slice(inicioFuncao);
    expect(corpo).not.toMatch(/norm_selector/);
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_dimensions['"]\)/);
  });
});

// =====================================================================
// 12 · OS OITO PASSOS DE RACIOCÍNIO
// =====================================================================

describe('ERA-F narrativa · os oito passos', () => {
  it('42 · geral, fatores, separar camuflagem, gênero, sensorial, contraste, integrar, mensagem', () => {
    for (const passo of [
      '1. LER o Escore Geral',
      '2. LER os quatro fatores',
      '3. SEPARAR os dois fatores de Camuflagem',
      '4. OBSERVAR Autopercepção de Gênero',
      '5. OBSERVAR Sensibilidade Sensorial, sem compará-la à escala homônima',
      '6. IDENTIFICAR convergência, contraste ou fator destoante',
      '7. INTEGRAR essa leitura ao Escore Geral',
      '8. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. LER o Escore Geral'),
      P.indexOf('2. LER os quatro fatores'),
      P.indexOf('3. SEPARAR os dois fatores de Camuflagem'),
      P.indexOf('4. OBSERVAR Autopercepção de Gênero'),
      P.indexOf('5. OBSERVAR Sensibilidade Sensorial'),
      P.indexOf('6. IDENTIFICAR convergência, contraste ou fator destoante'),
      P.indexOf('7. INTEGRAR essa leitura ao Escore Geral'),
      P.indexOf('8. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('43 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('44 · o passo 4 já proíbe extrapolar para identidade/orientação/disforia', () => {
    expect(P).toContain('sem extrapolar para identidade, orientação ou disforia');
  });
});

// =====================================================================
// 13 · AS CINCO SEÇÕES
// =====================================================================

describe('ERA-F narrativa · o que muda em cada seção', () => {
  it('45 · a síntese responde configuração, permite destacar Camuflagem divergente sem causa', () => {
    expect(P).toContain('qual é a configuração principal deste ERA-F?');
    expect(P).toContain('Se os dois fatores de Camuflagem divergirem, isso pode ser a informação central');
    expect(P).toContain('mas não explique por que divergiram');
  });

  it('46 · a análise articula os quatro fatores e o geral, sem inferências não sustentadas', () => {
    expect(P).toContain('articule os dois fatores de Camuflagem, Autopercepção de Gênero, Sensibilidade Sensorial e o Escore Geral');
    expect(P).toContain('NÃO transforme isso em diagnóstico, etiologia, identidade, comportamento concreto, prejuízo funcional, TEA, burnout, disforia, sofrimento ou prognóstico');
  });

  it('47 · o contexto proíbe as seis conversões automáticas no destino Escola', () => {
    expect(P).toContain('No destino Escola em especial, não derive automaticamente isolamento, problema social, dificuldade de adaptação, problema sensorial, problema de comportamento ou rendimento escolar');
  });

  it('48 · as recomendações passam pelo teste da causa e proíbem dez encaminhamentos automáticos', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do ERA-F?');
    expect(P).toContain('NÃO recomende automaticamente avaliação para TEA, psiquiatria, neurologia, psicoterapia, terapia ocupacional, fonoaudiologia, avaliação de identidade de gênero, tratamento, intervenção sensorial ou adaptação escolar');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
  });

  it('49 · a recomendação sobre Autopercepção de Gênero é só dimensão, sem inferência identitária', () => {
    expect(P).toContain('considerar Autopercepção de Gênero apenas como dimensão deste protocolo e confrontá-la com contexto já fornecido, sem inferência identitária');
  });

  it('50 · as considerações finais fecham sem repetir fatores nem recomendações', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL sem repetir os quatro fatores nem as recomendações');
  });
});

// =====================================================================
// 14 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('ERA-F narrativa · nenhum extremo autoriza diagnóstico ou leitura identitária', () => {
  it('51 · proíbe TEA/autismo e leitura identitária mesmo com Alta presença de sintomas', () => {
    expect(P).toContain('O QUE NUNCA SE FAZ COM O ERA-F, mesmo com Escore Geral ou qualquer fator em Alta presença de sintomas');
    expect(P).toContain('Não trate Autopercepção de Gênero como afirmação sobre identidade, orientação sexual ou disforia, em nenhuma direção');
  });

  it('52 · proíbe fundir Camuflagem, somar fatores e reaplicar corte', () => {
    expect(P).toContain('Não funda os dois fatores de Camuflagem num índice novo, não some os quatro fatores para verificar o Escore Geral e não reaplique o corte que separa as duas classificações');
  });

  it('53 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['no ERA-F', 'neste protocolo', 'no fator [nome] do ERA-F']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('54 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('55 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain('Ele não abre nenhuma exceção à REGRA CENTRAL');
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
  });

  it('56 · nenhum número de corte (59/60) aparece em nenhum destino com o mapa ativo', () => {
    for (const destino of DESTINOS) {
      const texto = prompt('ERA-F', destino);
      expect(texto, destino).not.toMatch(/\b59\b/);
      expect(texto, destino).not.toMatch(/\b60\b/);
    }
  });
});

// =====================================================================
// 15 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('ERA-F narrativa · a origem comercial não entra no conteúdo', () => {
  it('57 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ERAF');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 16 · ISOLAMENTO — nada fora do prompt mudou
// =====================================================================

describe('ERA-F narrativa · isolamento contra os dez pilotos anteriores e o ERA-A', () => {
  it('58 · os dez pilotos anteriores continuam intocados', () => {
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
    expect(soEraa).toContain(MARCA_ERAA);
    for (const p of [soFdt, soConfias, soBpa2, soDass21, soSnap, soBayley, soSdqPor, soCtrf, soEpqj, soEraa]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
  });

  it('59 · nenhum módulo derivado dos outros pilotos ganhou ERA-F', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'phq9-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('ERA-F');
    }
  });

  it('60 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'eraf-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'era-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('61 · graph-config.ts, fonte do aviso ERA-A×ERA-F, não foi tocado', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain("'ERA-F'");
    expect(graphConfig).toContain('nunca comparar um com o outro');
  });
});

// =====================================================================
// 17 · OS VINTE E DOIS CENÁRIOS PEDIDOS (A–V)
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do ERA-F usam (não há bloco derivado). Nenhum
// destes valores está no prompt de produção.
// =====================================================================

type LinhaEraf = {
  code: string;
  name: string;
  score: number;
  classification: 'Baixa presença de sintomas' | 'Alta presença de sintomas';
};

const NOMES = {
  CA: 'Camuflagem: Compensação e Assimilação',
  AG: 'Autopercepção de Gênero',
  CM: 'Camuflagem: Mascaramento',
  SS: 'Sensibilidade Sensorial',
  GERAL: 'Escore Geral',
};

function linha(l: LinhaEraf, ordinal: number) {
  return {
    raw: null, score: l.score, percentile: l.score, z_score: null,
    classification: l.classification, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('ERA-F narrativa · os cenários A a V', () => {
  it('A · quatro fatores em Baixa presença → síntese curta, sem ausência', () => {
    const dados = [
      linha({ code: 'CA', name: NOMES.CA, score: 30, classification: 'Baixa presença de sintomas' }, 0),
      linha({ code: 'AG', name: NOMES.AG, score: 25, classification: 'Baixa presença de sintomas' }, 1),
      linha({ code: 'CM', name: NOMES.CM, score: 35, classification: 'Baixa presença de sintomas' }, 2),
      linha({ code: 'SS', name: NOMES.SS, score: 20, classification: 'Baixa presença de sintomas' }, 3),
    ];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto.match(/classificação: Baixa presença de sintomas/g)?.length).toBe(4);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('"BAIXA PRESENÇA DE SINTOMAS" TAMBÉM NÃO É AUSÊNCIA');
  });

  it('B · quatro fatores em Alta presença → sem inferir TEA/autismo', () => {
    const dados = [
      linha({ code: 'CA', name: NOMES.CA, score: 95, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'AG', name: NOMES.AG, score: 90, classification: 'Alta presença de sintomas' }, 1),
      linha({ code: 'CM', name: NOMES.CM, score: 92, classification: 'Alta presença de sintomas' }, 2),
      linha({ code: 'SS', name: NOMES.SS, score: 88, classification: 'Alta presença de sintomas' }, 3),
    ];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto.match(/classificação: Alta presença de sintomas/g)?.length).toBe(4);
    expect(P).toContain('não infira TEA, autismo ou qualquer diagnóstico');
  });

  it('C · Compensação/Assimilação alta → sem estratégias específicas inventadas', () => {
    const dados = [linha({ code: 'CA', name: NOMES.CA, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('ensaia respostas sociais, imita outras pessoas, força contato visual');
  });

  it('D · Mascaramento alto → sem ocultação, supressão, exaustão ou burnout', () => {
    const dados = [linha({ code: 'CM', name: NOMES.CM, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('ocultação consciente, supressão de estereotipias, controle de expressão facial, imitação social, exaustão por mascaramento, burnout');
  });

  it('E · os dois fatores de Camuflagem divergentes → contraste permitido, sem índice inventado', () => {
    const dados = [
      linha({ code: 'CA', name: NOMES.CA, score: 90, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'CM', name: NOMES.CM, score: 25, classification: 'Baixa presença de sintomas' }, 1),
    ];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(texto).toContain('classificação: Baixa presença de sintomas');
    expect(P).toContain('É permitido comparar os dois percentis fechados e dizer que um ficou relativamente mais elevado que o outro');
    expect(P).toContain('não é permitido somar os dois, criar média entre eles ou inventar um índice novo');
  });

  it('F · Autopercepção de Gênero alta → sem identidade, transgeneridade ou disforia', () => {
    const dados = [linha({ code: 'AG', name: NOMES.AG, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('Classificação alta NÃO é problema, patologia ou maior sofrimento');
    expect(P).toContain('transgeneridade');
    expect(P).toContain('disforia de gênero');
  });

  it('G · Autopercepção de Gênero baixa → sem cisgeneridade, "identidade típica" ou ausência de conflito', () => {
    const dados = [linha({ code: 'AG', name: NOMES.AG, score: 10, classification: 'Baixa presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Baixa presença de sintomas');
    expect(P).toContain('classificação baixa NÃO é "identidade de gênero típica" nem "ausência de conflito"');
    expect(P).toContain('cisgeneridade');
  });

  it('H · Sensibilidade Sensorial alta → sem modalidade sensorial específica inventada', () => {
    const dados = [linha({ code: 'SS', name: NOMES.SS, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('hipersensibilidade auditiva, luz, texturas, cheiros, seletividade alimentar, aversão tátil ou sobrecarga sensorial');
  });

  it('I · perfil heterogêneo → destaca contraste real', () => {
    const dados = [
      linha({ code: 'CM', name: NOMES.CM, score: 95, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'SS', name: NOMES.SS, score: 20, classification: 'Baixa presença de sintomas' }, 1),
    ];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(texto).toContain('classificação: Baixa presença de sintomas');
    expect(P).toContain('heterogeneidade');
  });

  it('J · Escore Geral alto → não apaga heterogeneidade', () => {
    const dados = [
      linha({ code: 'GERAL', name: NOMES.GERAL, score: 95, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'AG', name: NOMES.AG, score: 30, classification: 'Baixa presença de sintomas' }, 1),
    ];
    const texto = formatClosedResults(dados, 'ERA-F');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('NÃO apaga a configuração interna');
  });

  it('K · Escore Geral composto dos 4 fatores → não recalculado', () => {
    expect(P).toContain('O ESCORE GERAL É COMPOSTO DOS QUATRO FATORES, E AINDA ASSIM NÃO É RECALCULADO POR VOCÊ');
  });

  it('L · percentil preservado, sem recálculo', () => {
    expect(P).toContain('Não interpole, não use CDF nem distribuição normal, não reconstrua a tabela normativa e não estime percentil');
  });

  it('M · percentil não vira porcentagem de sintomas ou traço', () => {
    expect(P).toContain('"90% de camuflagem" e "80% de sintomas" são exatamente o tipo de formulação proibida');
  });

  it('N · classificação preservada, cutoff não reaplicado', () => {
    expect(P).toContain('a IA não reaplica o corte que as separa');
  });

  it('O · "Alta presença de sintomas" nunca vira "de autismo"', () => {
    expect(P).toContain('O controlador não autoriza acrescentar "de autismo" ao rótulo');
  });

  it('P · itens placeholder → nenhuma leitura item a item', () => {
    expect(P).toContain('OS 34 ITENS NÃO TÊM ENUNCIADO PUBLICADO NESTE PRODUTO');
  });

  it('Q · nenhuma query nova', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
  });

  it('R · norma única → nenhum selector inventado', () => {
    expect(P).toContain('não há seleção de sexo, gênero, idade, escolaridade ou grupo normativo nesta arquitetura');
  });

  it('S · Sensibilidade Sensorial do ERA-F não ativa o perfil do ERA-A', () => {
    // o único jeito de ativar QUALQUER perfil é instrumentCode — passar
    // "Sensibilidade Sensorial" no lugar do código não ativa nada
    const p = prompt('Sensibilidade Sensorial');
    expect(p).not.toContain(MARCA_PERFIL);
    expect(p).not.toContain(MARCA_ERAA);
  });

  it('T · Sensibilidade Sensorial do ERA-A não ativa o perfil do ERA-F', () => {
    const soEraa = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-A');
    expect(soEraa).toContain(MARCA_ERAA);
    expect(soEraa).not.toContain(MARCA_PERFIL);
  });

  it('U · ERA-A e ERA-F ficam isolados por instrumentCode exato', () => {
    const soEraa = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-A');
    const soEraf = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'ERA-F');
    expect(soEraa).not.toBe(soEraf);
    expect(soEraa).not.toContain('ERA-F');
    expect(soEraf).not.toContain('ERA-A');
  });

  it('V · isolamento contra FDT, CONFIAS, BPA-2, DASS-21, SNAP-IV, Bayley-III, SDQ-POR, C-TRF, EPQ-J, ERA-A e PHQ-9', () => {
    for (const alheio of ['CONFIAS', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SDQ-POR', 'C-TRF', 'EPQ-J', 'ERA-A']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toMatch(/\bFDT\b/);
    expect(P).not.toMatch(/\bPHQ-9\b/);
  });

  it('62 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['B', [
        linha({ code: 'AG', name: NOMES.AG, score: 95, classification: 'Alta presença de sintomas' }, 0),
      ]],
      ['E', [
        linha({ code: 'CA', name: NOMES.CA, score: 90, classification: 'Alta presença de sintomas' }, 0),
        linha({ code: 'CM', name: NOMES.CM, score: 25, classification: 'Baixa presença de sintomas' }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'ERA-F');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
