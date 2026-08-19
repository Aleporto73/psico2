// =====================================================================
// ERA-A · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-10
//
// Décimo piloto da mesma arquitetura. Mesma família estrutural do
// BPA-2, da DASS-21, do SNAP-IV, da Bayley-III, do SDQ-POR, do C-TRF e
// do EPQ-J: sem snapshot, sem REGRA_ERAA — os quatro fatores e o Escore
// Geral chegam pelos resultados por escala de sempre. Reusa
// `instrumentCode` — mais um `const comEraa` local, nenhuma mudança de
// assinatura.
//
// A DIFERENÇA PARA O C-TRF E O SDQ-POR: `engine/loader.py::_load_era`
// grava o Escore Geral com `kind: "composta"` e componentes = OS QUATRO
// fatores — a soma bate de verdade (ao contrário do Total do C-TRF, que
// tem itens fora das seis síndromes, e do Total do SDQ-POR, que soma só
// quatro das sete escalas). Mesmo assim a trava é IGUAL: a IA não soma
// para conferir, porque conferir o servidor não é a tarefa dela.
//
// A TRAVA MAIS FORTE: "Alta presença de sintomas" é rótulo do
// INSTRUMENTO — o controlador nunca escreve "de autismo" junto, e o
// mapa proíbe a IA de montar essa frase.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'ERA-A'`. Com
//      qualquer outro valor o prompt dos outros instrumentos é BYTE A
//      BYTE o que era, e o sha256 dos quatro destinos é o MESMO já
//      usado nos nove pilotos anteriores.
//
//   2. composição — o Escore Geral nunca é somado/reconstruído pela IA,
//      mesmo sabendo que a soma bateria; nomes de fator nunca viram
//      fato da vida real; itens sem enunciado nunca são interpretados.
//
//   3. isolamento — nenhum dos outros nove pilotos ganha uma linha do
//      ERA-A, e o ERA-A não menciona nenhum deles (nem o ERA-F, cujo
//      fator "Sensibilidade Sensorial" é homônimo mas normativamente
//      distinto).
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

const MARCA_PERFIL = 'COMO LER O ERA-A — PERFIL INTERPRETATIVO:';

const P = prompt('ERA-A');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('ERA-A narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="ERA-A", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('ERA-A', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do ERA-A, inclusive ERA-F', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'SDQ-POR', 'C-TRF_1.5-5', 'EPQ-J', 'ERA-F', 'era-a', 'ERA',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos nove pilotos anteriores recebe o mapa do ERA-A', () => {
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
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley, soSdqPor, soCtrf, soEpqj]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('ERA-A');
    }
  });

  it('5 · o ERA-A sozinho não menciona os outros nove pilotos nem o ERA-F', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED', 'SDQ-POR', 'C-TRF', 'EPQ-J', 'ERA-F']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_ERAA: nem os fatores nem o Escore Geral são snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_ERAA/);
    expect(GERADOR).not.toContain('REGRA_ERAA :');
    expect(GERADOR).not.toContain('REGRA_ERAA +');
  });

  it('7 · reusa `instrumentCode`: nenhum comEraa na assinatura', () => {
    expect(GERADOR).not.toMatch(/comEraa\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comEraa = instrumentCode === CODIGO_ERAA;',
    );
    expect(GERADOR).toContain(
      "${comEraa ? PERFIL_INTERPRETATIVO_ERAA : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como os demais pilotos sem família de variantes', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_ERAA = `');
    expect(GERADOR).toContain("const CODIGO_ERAA = 'ERA-A';");
  });

  it('9 · a chamada real já alimenta o ERA-A: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('ERA-A', destino).match(/^## /gm) ?? []).length, destino)
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

describe('ERA-A narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · DUAS CAMADAS
// =====================================================================

describe('ERA-A narrativa · duas camadas, Escore Geral não apaga configuração', () => {
  it('13 · declara os quatro fatores como Camada 1', () => {
    expect(P).toContain('CAMADA 1 — quatro fatores específicos: Comunicação Social, Interação Social, Sensibilidade Sensorial e Padrões Restritos e Repetitivos');
  });

  it('14 · declara o Escore Geral como Camada 2, sem apagar a configuração interna', () => {
    expect(P).toContain('CAMADA 2 — Escore Geral, que integra os quatro fatores mas NÃO apaga a configuração interna');
    expect(P).toContain('Perfil geral alto pode coexistir com fatores heterogêneos');
    expect(P).toContain('perfil geral baixo também não obriga todos os fatores à mesma configuração');
  });
});

// =====================================================================
// 4 · ESCORE GERAL — COMPOSTO, NUNCA RECALCULADO
// =====================================================================

describe('ERA-A narrativa · Escore Geral é composto dos 4 fatores, e nunca recalculado', () => {
  it('15 · declara a composição e proíbe a IA de conferir a soma', () => {
    expect(P).toContain('O ESCORE GERAL É COMPOSTO DOS QUATRO FATORES, E AINDA ASSIM NÃO É RECALCULADO POR VOCÊ');
    expect(P).toContain('conferir essa soma não é sua tarefa');
    expect(P).toContain('NÃO some os quatro fatores para checar o servidor, não reconstrua o Escore Geral e não o corrija');
  });

  it('16 · manda usar somente o Escore Geral fechado recebido', () => {
    expect(P).toContain('use somente o Escore Geral fechado que veio na tabela de resultados');
  });

  it('17 · proíbe dizer que o Escore Geral "confirma" os fatores', () => {
    expect(P).toContain('Não afirme que o Escore Geral "confirma" os fatores');
    expect(P).toContain('é apenas outra camada do mesmo resultado');
  });

  it('18 · formatClosedResults confirma: nada aqui soma nada — os valores são os recebidos', () => {
    const linha = (code: string, name: string, score: number, classification: string) => ({
      raw: null, score, percentile: score, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('CS', 'Comunicação Social', 40, 'Baixa presença de sintomas'),
      linha('IS', 'Interação Social', 35, 'Baixa presença de sintomas'),
      linha('SS', 'Sensibilidade Sensorial', 45, 'Baixa presença de sintomas'),
      linha('PRR', 'Padrões Restritos e Repetitivos', 30, 'Baixa presença de sintomas'),
      linha('GERAL', 'Escore Geral', 50, 'Baixa presença de sintomas'),
    ];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('escore: 50');
    // 40+35+45+30 = 150, e o Escore Geral recebido (50) é outra métrica
    // (percentil, não soma de brutos) — o motor não faz essa conta
    expect(texto).not.toContain('escore: 150');
  });
});

// =====================================================================
// 5 · PERCENTIL É DADO FECHADO
// =====================================================================

describe('ERA-A narrativa · percentil fechado, sem CDF, sem interpolação', () => {
  it('19 · proíbe interpolar, CDF, distribuição normal e reconstruir tabela', () => {
    expect(P).toContain('Não interpole, não use CDF nem distribuição normal, não reconstrua a tabela normativa e não estime percentil');
  });

  it('20 · nomeia a regra do MAIOR percentil sem convidar a "corrigir"', () => {
    expect(P).toContain('o servidor já resolveu pelo MAIOR percentil');
    expect(P).toContain('isso não é inconsistência a expor nem a "corrigir" no texto');
  });

  it('21 · percentil não é porcentagem de sintomas', () => {
    expect(P).toContain('Percentil é POSIÇÃO NORMATIVA: percentil 90 não vira "90% de sintomas", em nenhum fator');
  });

  it('22 · nenhum corte numérico do controlador aparece no mapa', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ERAA = `');
    const fim = GERADOR.indexOf('`;', inicio);
    const bloco = GERADOR.slice(inicio, fim);
    // corte real do controlador: percentil <= 59 -> Baixa; >= 60 -> Alta
    expect(bloco).not.toMatch(/\b59\b/);
    expect(bloco).not.toMatch(/\b60\b/);
    expect(bloco).not.toMatch(/corte\s+(de\s+)?\d/i);
    expect(bloco).not.toMatch(/percentil\s*[<>=]\s*\d/i);
  });
});

// =====================================================================
// 6 · CLASSIFICAÇÃO É DADO FECHADO
// =====================================================================

describe('ERA-A narrativa · classificação fechada, sem reaplicar corte', () => {
  it('23 · declara só duas categorias, sem reaplicar corte nem substituir rótulo', () => {
    expect(P).toContain('Existem só DUAS categorias no ERA-A — Baixa presença de sintomas e Alta presença de sintomas');
    expect(P).toContain('a IA não reaplica o corte que as separa nem substitui o rótulo recebido por outro');
  });
});

// =====================================================================
// 7 · "ALTA PRESENÇA DE SINTOMAS" NÃO É DIAGNÓSTICO
// =====================================================================

describe('ERA-A narrativa · Alta presença de sintomas nunca vira diagnóstico', () => {
  it('24 · declara que é classificação do instrumento, não do avaliado', () => {
    expect(P).toContain('"ALTA PRESENÇA DE SINTOMAS" NÃO É DIAGNÓSTICO E NÃO GANHA "DE AUTISMO"');
    expect(P).toContain('É classificação DO INSTRUMENTO, não do avaliado');
  });

  it('25 · bloqueia as dez conversões, mesmo com vários fatores em Alta presença', () => {
    for (const proibida of [
      'TEA', 'autismo', 'transtorno do espectro autista', 'risco de autismo',
      'indicativo de TEA', 'provável TEA', 'quadro autístico',
      'sintomas autísticos clínicos', 'diagnóstico', 'gravidade clínica',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('26 · proíbe explicitamente acrescentar "de autismo" ao rótulo', () => {
    expect(P).toContain('O controlador não autoriza acrescentar "de autismo" ao rótulo');
    expect(P).toContain('"Alta presença de sintomas de autismo" é uma expressão que você NÃO PODE criar');
  });

  it('27 · oferece a formulação segura', () => {
    expect(P).toContain('Prefira "no fator Comunicação Social do ERA-A, a classificação recebida foi Alta presença de sintomas"');
  });
});

// =====================================================================
// 8 · "BAIXA PRESENÇA DE SINTOMAS" NÃO É AUSÊNCIA
// =====================================================================

describe('ERA-A narrativa · Baixa presença de sintomas não é ausência', () => {
  it('28 · proíbe as seis leituras de ausência/normalidade', () => {
    expect(P).toContain('"BAIXA PRESENÇA DE SINTOMAS" TAMBÉM NÃO É AUSÊNCIA');
    for (const proibida of [
      'ausência de sintomas', 'ausência de dificuldades', 'desenvolvimento típico',
      'TEA descartado', 'sem risco', 'funcionamento normal',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });
});

// =====================================================================
// 9 · NOMES DE FATOR NÃO VIRAM FATO DA VIDA REAL
// =====================================================================

describe('ERA-A narrativa · nomes de fator não provam comportamento real', () => {
  it('29 · Comunicação Social elevada não autoriza as quatro inferências', () => {
    expect(P).toContain('Comunicação Social elevada não autoriza "dificuldade para se comunicar", "dificuldade de linguagem", "não compreende comunicação" ou "não mantém conversa"');
  });

  it('30 · Interação Social elevada não autoriza as quatro inferências', () => {
    expect(P).toContain('Interação Social elevada não autoriza "não interage", "evita pessoas", "não tem amigos" ou "tem prejuízo social"');
  });

  it('31 · Sensibilidade Sensorial elevada não autoriza inventar manifestações sensoriais', () => {
    expect(P).toContain('Sensibilidade Sensorial elevada não autoriza inventar hipersensibilidade auditiva, seletividade alimentar, aversão tátil ou reação a luz, ruído ou textura');
  });

  it('32 · Padrões Restritos e Repetitivos elevado não autoriza inventar manifestações comportamentais', () => {
    expect(P).toContain('Padrões Restritos e Repetitivos elevado não autoriza inventar estereotipia, rigidez, ecolalia, interesses restritos, movimentos repetitivos ou rotinas rígidas');
  });

  it('33 · fecha com o princípio geral: nome do fator não prova cada manifestação', () => {
    expect(P).toContain('O nome do fator é uma dimensão avaliada — ele não prova cada comportamento possível associado a ela');
  });
});

// =====================================================================
// 10 · ITENS SEM ENUNCIADO — NENHUMA LEITURA ITEM A ITEM
// =====================================================================

describe('ERA-A narrativa · itens sem enunciado, nenhuma leitura item a item', () => {
  it('34 · declara a ausência de enunciado e o que isso implica', () => {
    expect(P).toContain('OS 75 ITENS NÃO TÊM ENUNCIADO PUBLICADO NESTE PRODUTO');
    expect(P).toContain('trabalhe somente com fatores, Escore Geral, percentil, classificação e contexto escrito pelo profissional');
  });

  it('35 · proíbe interpretar item, inventar conteúdo e criar exemplo comportamental', () => {
    expect(P).toContain('Não interprete item algum, não invente conteúdo de item, não crie exemplo comportamental baseado em suposto conteúdo dos itens');
  });

  it('36 · confirmação estrutural: o gerador não abre query de respostas', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
    expect(GERADOR).not.toMatch(/\.from\(['"]respostas['"]\)/);
  });
});

// =====================================================================
// 11 · NORMA ÚNICA — NENHUM SELECTOR INVENTADO
// =====================================================================

describe('ERA-A narrativa · norma única, nenhum selector inventado', () => {
  it('37 · declara norma única, sem seleção de sexo/idade/escolaridade/grupo', () => {
    expect(P).toContain('A NORMA DO ERA-A É ÚNICA — não há seleção de sexo, idade, escolaridade ou grupo normativo nesta arquitetura');
    expect(P).toContain('Não invente comparação normativa por grupo nem sugira que existe seleção normativa a considerar');
  });

  it('38 · estrutural: nenhuma query nova de dimensão/seleção normativa foi aberta', () => {
    const inicioFuncao = GERADOR.indexOf('export async function generateCorrigeFacilReport');
    const corpo = GERADOR.slice(inicioFuncao);
    expect(corpo).not.toMatch(/norm_selector/);
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_dimensions['"]\)/);
  });
});

// =====================================================================
// 12 · CONTRASTES ENTRE FATORES
// =====================================================================

describe('ERA-A narrativa · contrastes descritos, nunca causais nem concretizados', () => {
  it('39 · permite descrever contraste real, com exemplo âncora', () => {
    expect(P).toContain('CONTRASTES ENTRE FATORES PODEM SER DESCRITOS quando os dados realmente sustentarem');
    expect(P).toContain('maior elevação relativa em Sensibilidade Sensorial quando comparada aos demais fatores');
  });

  it('40 · proíbe explicar causa e transformar em comportamento não observado', () => {
    expect(P).toContain('Não explique a causa do contraste e não o transforme em comportamento concreto que não foi observado');
  });
});

// =====================================================================
// 13 · OS SETE PASSOS DE RACIOCÍNIO
// =====================================================================

describe('ERA-A narrativa · os sete passos', () => {
  it('41 · geral, fatores, contagem alta/baixa, homogeneidade, destoante, integração, mensagem', () => {
    for (const passo of [
      '1. LER o Escore Geral',
      '2. LER os quatro fatores',
      '3. IDENTIFICAR quantos fatores estão em Alta e quantos em Baixa',
      '4. IDENTIFICAR homogeneidade ou contraste',
      '5. VERIFICAR se existe fator destoante',
      '6. INTEGRAR a leitura específica dos fatores com o Escore Geral',
      '7. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. LER o Escore Geral'),
      P.indexOf('2. LER os quatro fatores'),
      P.indexOf('3. IDENTIFICAR quantos fatores estão em Alta e quantos em Baixa'),
      P.indexOf('4. IDENTIFICAR homogeneidade ou contraste'),
      P.indexOf('5. VERIFICAR se existe fator destoante'),
      P.indexOf('6. INTEGRAR a leitura específica dos fatores com o Escore Geral'),
      P.indexOf('7. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('42 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('43 · o passo 6 proíbe um apagar o outro', () => {
    expect(P).toContain('sem deixar um apagar o outro');
  });
});

// =====================================================================
// 14 · AS CINCO SEÇÕES
// =====================================================================

describe('ERA-A narrativa · o que muda em cada seção', () => {
  it('44 · a síntese responde configuração, com exemplos ancorados e sem diagnóstico', () => {
    expect(P).toContain('qual é a configuração principal deste ERA-A?');
    expect(P).toContain('perfil predominantemente em baixa presença sem contraste relevante');
    expect(P).toContain('ancorado em "neste ERA-A" ou "nos resultados deste protocolo", sem diagnóstico');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('45 · a análise articula fatores e Escore Geral, sem inferências não sustentadas', () => {
    expect(P).toContain('articule os quatro fatores com o Escore Geral');
    expect(P).toContain('NÃO infira TEA, diagnóstico, causalidade, funcionamento cotidiano, prognóstico, prejuízo escolar, prejuízo social ou necessidade terapêutica sem outras fontes');
  });

  it('46 · o contexto proíbe as cinco conversões automáticas no destino Escola', () => {
    expect(P).toContain('No destino Escola em especial, não transforme o resultado em problema de interação escolar, problema de aprendizagem, problema de comportamento, dificuldade em sala ou necessidade de adaptação sem dado escrito correspondente');
  });

  it('47 · as recomendações passam pelo teste da causa e proíbem dez encaminhamentos automáticos', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do ERA-A?');
    expect(P).toContain('NÃO recomende automaticamente avaliação para TEA, neurologista, psiquiatra, psicoterapia, fonoaudiologia, terapia ocupacional, ABA, medicação, adaptação escolar ou intervenção sensorial');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
  });

  it('48 · as considerações finais fecham sem repetir fatores nem recomendações', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL sem repetir os quatro fatores nem as recomendações');
  });
});

// =====================================================================
// 15 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('ERA-A narrativa · nenhum extremo autoriza diagnóstico', () => {
  it('49 · proíbe TEA/autismo mesmo com Escore Geral ou qualquer fator em Alta presença', () => {
    expect(P).toContain('O QUE NUNCA SE FAZ COM O ERA-A, mesmo com Escore Geral ou qualquer fator em Alta presença de sintomas');
    expect(P).toContain('não infira TEA, autismo, transtorno do espectro autista ou qualquer diagnóstico a partir do NOME de um fator ou da classificação recebida');
  });

  it('50 · proíbe as seis expressões de gravidade global para o Escore Geral', () => {
    for (const proibida of [
      'gravidade global', 'índice de autismo', 'índice de TEA',
      'probabilidade de TEA', 'grau de autismo', 'severidade',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
    expect(P).toContain('comprometimento global');
  });

  it('51 · repete a proibição de somar fatores e reaplicar corte', () => {
    expect(P).toContain('Não some os quatro fatores para verificar o Escore Geral e não reaplique o corte que separa as duas classificações');
  });

  it('52 · manda ancorar no protocolo, não na pessoa', () => {
    for (const ancora of ['no ERA-A', 'neste protocolo', 'no fator [nome] do ERA-A']) {
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

  it('55 · nenhum número de corte (59/60) aparece em nenhum destino com o mapa ativo', () => {
    for (const destino of DESTINOS) {
      const texto = prompt('ERA-A', destino);
      expect(texto, destino).not.toMatch(/\b59\b/);
      expect(texto, destino).not.toMatch(/\b60\b/);
    }
  });
});

// =====================================================================
// 16 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('ERA-A narrativa · a origem comercial não entra no conteúdo', () => {
  it('56 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_ERAA');
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

describe('ERA-A narrativa · isolamento contra os nove pilotos anteriores e o ERA-F', () => {
  it('57 · os nove pilotos anteriores continuam intocados', () => {
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
    for (const p of [soFdt, soConfias, soBpa2, soDass21, soSnap, soBayley, soSdqPor, soCtrf, soEpqj]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
  });

  it('58 · o ERA-F (código diferente) não recebe o mapa do ERA-A, mesmo compartilhando "Sensibilidade Sensorial"', () => {
    const soEraf = prompt('ERA-F');
    expect(soEraf).not.toContain(MARCA_PERFIL);
    expect(soEraf).not.toContain('ERA-A');
  });

  it('59 · nenhum módulo derivado dos outros pilotos ganhou ERA-A', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'phq9-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('ERA-A');
    }
  });

  it('60 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'eraa-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'era-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('61 · graph-config.ts, fonte da exclusão do Escore Geral e do aviso ERA-A×ERA-F, não foi tocado', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain("'ERA-A'");
    expect(graphConfig).toContain('composta dos quatro fatores');
    expect(graphConfig).toContain('nunca comparar um com o outro');
  });
});

// =====================================================================
// 18 · OS DEZOITO CENÁRIOS PEDIDOS (A–R)
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do ERA-A usam (não há bloco derivado). Nenhum
// destes valores está no prompt de produção.
// =====================================================================

type LinhaEraa = {
  code: string;
  name: string;
  score: number;
  classification: 'Baixa presença de sintomas' | 'Alta presença de sintomas';
};

const NOMES = {
  CS: 'Comunicação Social',
  IS: 'Interação Social',
  SS: 'Sensibilidade Sensorial',
  PRR: 'Padrões Restritos e Repetitivos',
  GERAL: 'Escore Geral',
};

function linha(l: LinhaEraa, ordinal: number) {
  return {
    raw: null, score: l.score, percentile: l.score, z_score: null,
    classification: l.classification, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('ERA-A narrativa · os cenários A a R', () => {
  it('A · todos os fatores em Baixa presença → síntese curta, sem "ausência de sintomas"', () => {
    const dados = [
      linha({ code: 'CS', name: NOMES.CS, score: 30, classification: 'Baixa presença de sintomas' }, 0),
      linha({ code: 'IS', name: NOMES.IS, score: 25, classification: 'Baixa presença de sintomas' }, 1),
      linha({ code: 'SS', name: NOMES.SS, score: 35, classification: 'Baixa presença de sintomas' }, 2),
      linha({ code: 'PRR', name: NOMES.PRR, score: 20, classification: 'Baixa presença de sintomas' }, 3),
    ];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto.match(/classificação: Baixa presença de sintomas/g)?.length).toBe(4);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('"BAIXA PRESENÇA DE SINTOMAS" TAMBÉM NÃO É AUSÊNCIA');
  });

  it('B · todos os fatores em Alta presença → sem inferir TEA/autismo', () => {
    const dados = [
      linha({ code: 'CS', name: NOMES.CS, score: 95, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'IS', name: NOMES.IS, score: 90, classification: 'Alta presença de sintomas' }, 1),
      linha({ code: 'SS', name: NOMES.SS, score: 92, classification: 'Alta presença de sintomas' }, 2),
      linha({ code: 'PRR', name: NOMES.PRR, score: 88, classification: 'Alta presença de sintomas' }, 3),
    ];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto.match(/classificação: Alta presença de sintomas/g)?.length).toBe(4);
    expect(P).toContain('mesmo com Escore Geral ou qualquer fator em Alta presença de sintomas');
    expect(P).toContain('não infira TEA, autismo, transtorno do espectro autista');
  });

  it('C · Comunicação Social alta isoladamente → sem dificuldade de linguagem/comunicação cotidiana', () => {
    const dados = [linha({ code: 'CS', name: NOMES.CS, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('Comunicação Social elevada não autoriza "dificuldade para se comunicar", "dificuldade de linguagem"');
  });

  it('D · Interação Social alta → sem isolamento/prejuízo social', () => {
    const dados = [linha({ code: 'IS', name: NOMES.IS, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('Interação Social elevada não autoriza "não interage", "evita pessoas", "não tem amigos" ou "tem prejuízo social"');
  });

  it('E · Sensibilidade Sensorial alta → sem som/luz/textura/alimentação inventados', () => {
    const dados = [linha({ code: 'SS', name: NOMES.SS, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('hipersensibilidade auditiva, seletividade alimentar, aversão tátil ou reação a luz, ruído ou textura');
  });

  it('F · Padrões Restritos e Repetitivos alto → sem estereotipia/rigidez/ecolalia', () => {
    const dados = [linha({ code: 'PRR', name: NOMES.PRR, score: 95, classification: 'Alta presença de sintomas' }, 0)];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('estereotipia, rigidez, ecolalia, interesses restritos, movimentos repetitivos ou rotinas rígidas');
  });

  it('G · perfil heterogêneo → contraste descritivo permitido', () => {
    const dados = [
      linha({ code: 'SS', name: NOMES.SS, score: 95, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'CS', name: NOMES.CS, score: 30, classification: 'Baixa presença de sintomas' }, 1),
    ];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(texto).toContain('classificação: Baixa presença de sintomas');
    expect(P).toContain('maior elevação relativa em Sensibilidade Sensorial quando comparada aos demais fatores');
  });

  it('H · Escore Geral alto com fatores heterogêneos → geral não apaga configuração específica', () => {
    const dados = [
      linha({ code: 'GERAL', name: NOMES.GERAL, score: 95, classification: 'Alta presença de sintomas' }, 0),
      linha({ code: 'CS', name: NOMES.CS, score: 30, classification: 'Baixa presença de sintomas' }, 1),
    ];
    const texto = formatClosedResults(dados, 'ERA-A');
    expect(texto).toContain('classificação: Alta presença de sintomas');
    expect(P).toContain('NÃO apaga a configuração interna');
  });

  it('I · Escore Geral é composto dos 4 fatores → IA não soma/recalcula', () => {
    expect(P).toContain('O ESCORE GERAL É COMPOSTO DOS QUATRO FATORES, E AINDA ASSIM NÃO É RECALCULADO POR VOCÊ');
    expect(P).toContain('NÃO some os quatro fatores para checar o servidor');
  });

  it('J · percentil recebido preservado, sem CDF/interpolação/reconstrução', () => {
    expect(P).toContain('Não interpole, não use CDF nem distribuição normal, não reconstrua a tabela normativa e não estime percentil');
  });

  it('K · percentil não vira porcentagem de sintomas', () => {
    expect(P).toContain('percentil 90 não vira "90% de sintomas"');
  });

  it('L · classificação recebida preservada, sem reaplicar o corte', () => {
    expect(P).toContain('a IA não reaplica o corte que as separa nem substitui o rótulo recebido por outro');
  });

  it('M · "Alta presença de sintomas" nunca vira "Alta presença de sintomas de autismo"', () => {
    expect(P).toContain('"Alta presença de sintomas de autismo" é uma expressão que você NÃO PODE criar');
  });

  it('N · "Baixa presença de sintomas" nunca vira "sem sintomas", "sem risco" ou "TEA descartado"', () => {
    expect(P).toContain('sem risco');
    expect(P).toContain('TEA descartado');
  });

  it('O · itens têm placeholders → nenhuma leitura item a item', () => {
    expect(P).toContain('OS 75 ITENS NÃO TÊM ENUNCIADO PUBLICADO NESTE PRODUTO');
  });

  it('P · nenhuma query nova de respostas', () => {
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
  });

  it('Q · norma única → nenhum selector de sexo/idade/grupo inventado', () => {
    expect(P).toContain('não há seleção de sexo, idade, escolaridade ou grupo normativo nesta arquitetura');
  });

  it('R · isolamento contra FDT, CONFIAS, BPA-2, DASS-21, SNAP-IV, Bayley-III, SDQ-POR, C-TRF, EPQ-J e PHQ-9', () => {
    for (const alheio of ['CONFIAS', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SDQ-POR', 'C-TRF', 'EPQ-J']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toMatch(/\bFDT\b/);
    expect(P).not.toMatch(/\bPHQ-9\b/);
  });

  it('62 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['B', [
        linha({ code: 'CS', name: NOMES.CS, score: 95, classification: 'Alta presença de sintomas' }, 0),
      ]],
      ['G', [
        linha({ code: 'SS', name: NOMES.SS, score: 95, classification: 'Alta presença de sintomas' }, 0),
        linha({ code: 'CS', name: NOMES.CS, score: 30, classification: 'Baixa presença de sintomas' }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'ERA-A');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
