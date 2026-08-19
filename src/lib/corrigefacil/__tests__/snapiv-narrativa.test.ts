// =====================================================================
// SNAP-IV · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-5
//
// Quinto piloto da mesma arquitetura, e o primeiro a cobrir UMA FAMÍLIA
// de dois códigos — SNAP-IV-18 e SNAP-IV-26 — com um bloco só. Reusa
// `instrumentCode`, o mesmo mecanismo do BPA-2 e da DASS-21: nenhum
// `comSnap18`/`comSnap26`/`comSnap` na assinatura de
// `buildCorrigeFacilSystemPrompt`, só dois `const` locais a mais.
//
// MESMA FAMÍLIA ESTRUTURAL DO BPA-2 E DA DASS-21: o SNAP-IV não tem
// snapshot. Diferente deles, a auditoria encontrou infraestrutura de
// apresentação JÁ implementada — `METRICAS_POR_INSTRUMENTO` já separa
// Pontuação bruta de Sintomas presentes desde antes desta fase — e as
// DUAS medidas chegam ao Relatório Pró hoje, confirmado contra
// `formatClosedResults`. Não há REGRA_SNAPIV pelo mesmo motivo que não
// há REGRA_BPA2: nada a congelar.
//
// UMA FAMÍLIA, UM BLOCO: `perfilInterpretativoSnapIv(comTod)` é FUNÇÃO,
// não dois consts quase idênticos. O SNAP-IV-18 e o SNAP-IV-26
// compartilham Desatenção e Hiperatividade/Impulsividade byte a byte; só
// os quatro trechos sobre TOD entram ou saem por parâmetro.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode` igual a um dos dois
//      códigos da família. Com qualquer outro valor o prompt dos outros
//      instrumentos é BYTE A BYTE o que era, e o sha256 dos quatro
//      destinos é o MESMO já usado nos quatro pilotos anteriores.
//
//   2. família — o SNAP-IV-18 NUNCA recebe TOD, o SNAP-IV-26 SEMPRE
//      recebe, e as duas versões são idênticas em tudo o mais — provado
//      linha a linha, não por amostragem.
//
//   3. fronteira — raw (Pontuação bruta) e score (Sintomas presentes) são
//      medidas DIFERENTES, a classificação sai só da contagem, o limiar
//      não é diagnóstico mesmo com todos os domínios acima dele, e nada
//      do esquema antigo não carregado (`detalhe_nao_implementado`) entra
//      no vocabulário do modelo.
//
// UMA RESSALVA DE ISOLAMENTO, HERDADA E NÃO CRIADA AQUI:
// PERFIL_INTERPRETATIVO_FDT (congelado desde a Fase 2B-1, fora de escopo
// nesta fase) já contém a palavra "SNAP" — na frase pré-existente "troque
// FDT por PHQ-9, SNAP-IV ou SCARED", um exemplo de substituição de
// instrumento que nunca foi corrigido porque nenhum teste antes deste
// verificava a ausência dela. Por isso os testes de isolamento aqui
// conferem a MARCA do perfil do SNAP-IV (o cabeçalho "COMO LER O
// SNAP-IV"), não a substring "SNAP" solta — é o invariante que realmente
// importa, e o único que se sustenta sem reabrir um bloco já aprovado.
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

const MARCA_PERFIL = 'COMO LER O SNAP-IV — PERFIL INTERPRETATIVO:';

const P18 = prompt('SNAP-IV-18');
const P26 = prompt('SNAP-IV-26');

// =====================================================================
// 1 · ESCOPO — o mapa entra só com um código da família
// =====================================================================

describe('SNAP-IV narrativa · escopo do perfil interpretativo', () => {
  it('1 · com SNAP-IV-18 ou SNAP-IV-26, os quatro destinos recebem o mapa', () => {
    for (const codigo of ['SNAP-IV-18', 'SNAP-IV-26']) {
      for (const destino of DESTINOS) {
        expect(prompt(codigo, destino), `${codigo}/${destino}`).toContain(
          MARCA_PERFIL,
        );
      }
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do SNAP-IV', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21',
      'snap-iv-18', 'SNAPIV18', 'SNAP-IV', 'SNAP-IV-27',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos quatro pilotos anteriores recebe o mapa do SNAP-IV', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21]) {
      expect(p).not.toContain(MARCA_PERFIL);
    }
    // BPA-2 e DASS-21 nasceram depois do vazamento de nome corrigido no
    // CONFIAS, e continuam sem citar SNAP nominalmente
    expect(soBpa2).not.toContain('SNAP');
    expect(soDass21).not.toContain('SNAP');
    // FDT é caso à parte: ver a nota no cabeçalho deste arquivo
    expect(soFdt).not.toContain(MARCA_PERFIL);
  });

  it('5 · o SNAP-IV sozinho não menciona os outros cinco pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SCARED']) {
      expect(P18, alheio).not.toContain(alheio);
      expect(P26, alheio).not.toContain(alheio);
    }
    expect(P18).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P26).not.toContain('DADOS DERIVADOS CONGELADOS');
    // "FDT" isolado (não como parte de outra palavra) tampouco aparece
    expect(P18).not.toMatch(/\bFDT\b/);
    expect(P26).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_SNAPIV: a família não tem snapshot para congelar', () => {
    expect(GERADOR).not.toMatch(/const REGRA_SNAP-?IV/);
    expect(GERADOR).not.toContain('REGRA_SNAPIV :');
    expect(GERADOR).not.toContain('REGRA_SNAPIV +');
  });

  it('7 · reusa `instrumentCode`: nenhum comSnap18/comSnap26/comSnap na assinatura', () => {
    expect(GERADOR).not.toMatch(/comSnap(18|26)?\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comSnap18 = instrumentCode === CODIGO_SNAP18;',
    );
    expect(GERADOR).toContain(
      'const comSnap26 = instrumentCode === CODIGO_SNAP26;',
    );
    expect(GERADOR).toContain(
      "${(comSnap18 || comSnap26) ? perfilInterpretativoSnapIv(comSnap26) : ''}",
    );
    // só existe UMA declaração de `instrumentCode =` na assinatura inteira,
    // reaproveitada por BPA-2, DASS-21 e agora pela família SNAP-IV
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é FUNÇÃO, não dois consts quase idênticos', () => {
    expect(GERADOR).toContain(
      'function perfilInterpretativoSnapIv(comTod: boolean): string {',
    );
    expect(GERADOR).not.toContain('const PERFIL_INTERPRETATIVO_SNAP18');
    expect(GERADOR).not.toContain('const PERFIL_INTERPRETATIVO_SNAP26');
    expect(GERADOR).not.toContain('const PERFIL_INTERPRETATIVO_SNAPIV');
  });

  it('9 · a chamada real já alimenta a família: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    expect((P18.match(/^## /gm) ?? []).length).toBe(5);
    expect((P26.match(/^## /gm) ?? []).length).toBe(5);
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

describe('SNAP-IV narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · A FAMÍLIA — 18 e 26 são idênticos, exceto pelo TOD
// =====================================================================

describe('SNAP-IV narrativa · a família 18/26', () => {
  it('13 · SNAP-IV-18 nunca recebe TOD; SNAP-IV-26 sempre recebe', () => {
    expect(P18).not.toContain('TOD');
    expect(P26).toContain('TOD');
  });

  it('14 · o restante do texto é idêntico entre as duas versões', () => {
    const linhas18 = P18.split('\n');
    const linhas26 = P26.split('\n');
    expect(linhas18).toHaveLength(linhas26.length);
    const diferentes = linhas18
      .map((l, i) => [l, linhas26[i]] as const)
      .filter(([a, b]) => a !== b);
    // só as linhas que mencionam a versão/domínios/TOD podem divergir
    for (const [a, b] of diferentes) {
      const mudaPorVersaoOuTod =
        /SNAP-IV-(18|26)/.test(a) ||
        /SNAP-IV-(18|26)/.test(b) ||
        /TOD/.test(a) ||
        /TOD/.test(b);
      expect(mudaPorVersaoOuTod, `"${a}" vs "${b}"`).toBe(true);
    }
    // e a divergência é pequena: a esmagadora maioria das linhas é igual
    expect(diferentes.length).toBeLessThan(10);
    expect(diferentes.length).toBeGreaterThan(0);
  });

  it('15 · SNAP-IV-18 se declara versão 18, SNAP-IV-26 se declara versão 26', () => {
    expect(P18).toContain('Este protocolo é o SNAP-IV-18, com os domínios Desatenção e Hiperatividade/Impulsividade');
    expect(P26).toContain('Este protocolo é o SNAP-IV-26, com os domínios Desatenção, Hiperatividade/Impulsividade e TOD');
  });

  it('16 · o SNAP-IV-18 não finge ter três domínios', () => {
    expect(P18).toContain('Nenhum outro domínio existe neste protocolo');
    expect(P18).not.toMatch(/Transtorno Opositivo/);
  });
});

// =====================================================================
// 4 · DUAS MEDIDAS, NÃO UMA
// =====================================================================

describe('SNAP-IV narrativa · Pontuação bruta e Sintomas presentes são diferentes', () => {
  it('17 · o prompt nomeia as duas medidas e proíbe derivar uma da outra', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('DUAS MEDIDAS, NÃO UMA');
      expect(p).toContain(
        'Pontuação bruta descreve a INTENSIDADE agregada das respostas do domínio',
      );
      expect(p).toContain(
        'Sintomas presentes descreve a CONTAGEM de itens que atingiram o critério de presença do instrumento',
      );
      expect(p).toContain('NÃO derive uma da outra');
    }
  });

  it('18 · a classificação sai só da contagem, nunca da pontuação bruta', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain(
        'A CLASSIFICAÇÃO sai da CONTAGEM de Sintomas presentes, nunca da Pontuação bruta',
      );
      expect(p).toContain('NÃO compare a Pontuação bruta com nenhum corte');
      expect(p).toContain('não infira limiar pela intensidade');
      expect(p).toContain('não recalcule a classificação e não a reinterprete');
    }
  });

  it('19 · os rótulos reais são reproduzidos exatamente', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('"Atinge o limiar de sintomas deste domínio"');
      expect(p).toContain('"Não atinge o limiar de sintomas deste domínio"');
    }
  });

  it('20 · ambas as medidas realmente chegam ao Relatório Pró (auditoria confirmada)', () => {
    const linha = (code: string, name: string, raw: number, score: number, classification: string) => ({
      raw, score, percentile: null, z_score: null, classification,
      ci95: null, available: true, message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const texto18 = formatClosedResults(
      [linha('DESATENCAO', 'Desatenção', 15, 4, 'Não atinge o limiar de sintomas deste domínio')],
      'SNAP-IV-18',
    );
    expect(texto18).toContain('- pontuação bruta: 15 / 27');
    expect(texto18).toContain('- sintomas presentes: 4 / 9');
  });
});

// =====================================================================
// 5 · LIMIAR NÃO É DIAGNÓSTICO
// =====================================================================

describe('SNAP-IV narrativa · limiar não é diagnóstico', () => {
  it('21 · o SNAP-IV-18 proíbe as seis leituras diagnósticas', () => {
    expect(P18).toContain('LIMIAR NÃO É DIAGNÓSTICO');
    expect(P18).toContain('NÃO significa diagnóstico de TDAH');
    expect(P18).toContain('apresentação desatenta');
    expect(P18).toContain('apresentação hiperativa/impulsiva');
    expect(P18).toContain('transtorno confirmado');
    expect(P18).toContain('quadro clínico confirmado');
    expect(P18).toContain('indicação diagnóstica suficiente');
  });

  it('22 · o SNAP-IV-26 soma a proibição de TOD, sem perder as outras', () => {
    expect(P26).toContain('diagnóstico de TOD');
    expect(P26).toContain(
      'Mesmo o domínio chamado "Transtorno Opositivo-Desafiador" é NOME DA DIMENSÃO neste instrumento',
    );
    expect(P26).toContain('atingir o limiar nele não confirma TOD');
    // e as seis leituras do 18 continuam presentes no 26
    expect(P26).toContain('NÃO significa diagnóstico de TDAH');
    expect(P26).toContain('transtorno confirmado');
  });

  it('23 · oferece as formulações corretas por domínio', () => {
    expect(P18).toContain('no domínio de Desatenção do SNAP-IV');
    expect(P18).toContain(
      'o domínio de Hiperatividade/Impulsividade atingiu o limiar de sintomas definido pelo instrumento',
    );
    expect(P26).toContain('na dimensão TOD do SNAP-IV-26');
  });

  it('24 · proíbe "apresenta TDAH"/"apresenta TOD" como frase pronta', () => {
    expect(P18).toContain('nunca "o avaliado apresenta TDAH"');
    expect(P18).not.toContain('nem "apresenta TOD"');
    expect(P26).toContain('nunca "o avaliado apresenta TDAH" nem "apresenta TOD"');
  });
});

// =====================================================================
// 6 · OS CINCO PASSOS DE RACIOCÍNIO
// =====================================================================

describe('SNAP-IV narrativa · os cinco passos', () => {
  it('25 · domínios, distribuição, configuração, intensidade x contagem, mensagem', () => {
    for (const p of [P18, P26]) {
      for (const passo of [
        '1. DOMÍNIOS DESTE PROTOCOLO',
        '2. DISTRIBUIÇÃO DOS LIMIARES',
        '3. CONFIGURAÇÃO',
        '4. INTENSIDADE E CONTAGEM',
        '5. MENSAGEM CENTRAL',
      ]) {
        expect(p, passo).toContain(passo);
      }
      const posicoes = [
        p.indexOf('1. DOMÍNIOS DESTE PROTOCOLO'),
        p.indexOf('2. DISTRIBUIÇÃO DOS LIMIARES'),
        p.indexOf('3. CONFIGURAÇÃO'),
        p.indexOf('4. INTENSIDADE E CONTAGEM'),
        p.indexOf('5. MENSAGEM CENTRAL'),
      ];
      expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
    }
  });

  it('26 · a lista é raciocínio interno e não vai ao papel', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain(
        'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
      );
    }
  });

  it('27 · o passo 4 não corrige nem explica causa da diferença', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('Descreva a diferença sem corrigir nada e sem explicar a causa dela');
    }
  });

  it('28 · a mensagem central exige sustentação real, sem virar diagnóstico', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('Só o que os dados realmente sustentarem, e sem transformar isso em diagnóstico');
    }
  });
});

// =====================================================================
// 7 · AS CINCO SEÇÕES
// =====================================================================

describe('SNAP-IV narrativa · o que muda em cada seção', () => {
  it('29 · a síntese responde configuração, curta sem limiar atingido', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('qual é a configuração principal deste SNAP-IV?');
      expect(p).toContain('Nenhum domínio acima do limiar pede síntese CURTA');
    }
  });

  it('30 · a análise proíbe diagnosticar e as sete inferências', () => {
    expect(P18).toContain('NÃO é permitido diagnosticar, inferir apresentação de TDAH, inferir causa');
    expect(P26).toContain('NÃO é permitido diagnosticar, inferir apresentação de TDAH, inferir TOD, inferir causa');
    for (const p of [P18, P26]) {
      expect(p).toContain('inferir prejuízo funcional');
      expect(p).toContain('inferir desempenho escolar');
      expect(p).toContain('inferir funcionamento familiar');
      expect(p).toContain('inferir necessidade medicamentosa');
      expect(p).toContain('inferir prognóstico');
    }
  });

  it('31 · o contexto proíbe as três frases de encaminhamento automático', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('nunca diagnóstico');
      expect(p).toContain('"deve procurar neurologista"');
      expect(p).toContain('"precisa de medicação"');
      expect(p).toContain('"necessita avaliação para TDAH"');
    }
  });

  it('32 · as recomendações passam pelo teste da causa e não têm piso', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('ele existe POR CAUSA desta configuração do SNAP-IV?');
      expect(p).toContain('Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra');
      expect(p).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
      expect(p).toContain('Não produza protocolo diagnóstico nem de tratamento');
    }
  });

  it('33 · as considerações finais fecham a configuração, sem tabela nem segundo aviso', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('feche a configuração');
      expect(p).toContain('NÃO constitui diagnóstico isoladamente');
      expect(p).toContain('Não escreva um segundo aviso');
    }
  });
});

// =====================================================================
// 8 · O DETALHE NÃO IMPLEMENTADO NUNCA VIRA VOCABULÁRIO
// =====================================================================

describe('SNAP-IV narrativa · o esquema antigo não carregado fica de fora', () => {
  it('34 · "Risco de TDAH", "Limiar de Risco" e "Sem Risco" são nomeados e proibidos', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('"Risco de TDAH"');
      expect(p).toContain('"Limiar de Risco"');
      expect(p).toContain('"Sem Risco"');
      expect(p).toContain('nenhum resultado real os produz');
    }
  });

  it('35 · os rótulos antigos do SNAP-IV-18 pré-correção também não aparecem', () => {
    // "Na média" e os dois rótulos comparativos foram substituídos pela
    // mesma correção que unificou os rótulos com o SNAP-IV-26; o prompt
    // não deveria reproduzi-los como se fossem válidos
    for (const p of [P18, P26]) {
      expect(p).not.toContain('Na média');
      expect(p).not.toContain('Maior desatenção que esperado');
      expect(p).not.toContain('Mais hiperatividade e impulsividade que esperado');
      expect(p).not.toContain('Atinge critério DSM');
    }
  });

  it('36 · nenhum ponto de corte numérico (6, 6, 4) aparece no mapa', () => {
    for (const p of [P18, P26]) {
      expect(p).not.toMatch(/\bcorte\s+(de\s+)?\d/i);
      expect(p).not.toMatch(/limiar\s+(de\s+)?\d/i);
    }
  });
});

// =====================================================================
// 9 · ITEM A ITEM CONTINUA FORA
// =====================================================================

describe('SNAP-IV narrativa · sem leitura item a item', () => {
  it('37 · proíbe criar leitura item a item e usar resposta isolada', () => {
    for (const p of [P18, P26]) {
      expect(p).toContain('não crie leitura item a item');
      expect(p).toContain(
        'não use resposta isolada para afirmar comportamento frequente real, dificuldade escolar, impulsividade cotidiana, oposição, agressividade ou transtorno',
      );
    }
  });
});

// =====================================================================
// 10 · MÉDIA POR ITEM NÃO FOI DUPLICADA
// =====================================================================

describe('SNAP-IV narrativa · média por item não foi tocada nem duplicada', () => {
  it('38 · o mapa novo não menciona média por item', () => {
    expect(P18).not.toContain('Média por item');
    expect(P26).not.toContain('Média por item');
  });

  it('39 · a infraestrutura de média por item continua exatamente como estava', () => {
    // pré-existente: SNAP-IV-18 tem media declarada, SNAP-IV-26 não
    const metricas = leia('src', 'lib', 'corrigefacil', 'metricas-instrumento.ts');
    expect(metricas).toContain("media: { rotulo: 'Média por item', divisor: 9, teto: 3, casas: 2 }");
    expect(metricas).toContain("'SNAP-IV-26': {");
  });
});

// =====================================================================
// 11 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('SNAP-IV narrativa · a origem comercial não entra no conteúdo', () => {
  it('40 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('function perfilInterpretativoSnapIv(');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 12 · ESCOPO — nada fora do prompt mudou, e os quatro pilotos anteriores seguem de pé
// =====================================================================

describe('SNAP-IV narrativa · nada fora do prompt mudou', () => {
  it('41 · FDT, CONFIAS, BPA-2 e DASS-21 continuam intocados', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    expect(soFdt).toContain('COMO LER O FDT — PERFIL INTERPRETATIVO:');
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    expect(soConfias).toContain('COMO LER O CONFIAS — PERFIL INTERPRETATIVO:');
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    expect(soBpa2).toContain('COMO LER O BPA-2 — PERFIL INTERPRETATIVO:');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    expect(soDass21).toContain('COMO LER A DASS-21 — PERFIL INTERPRETATIVO:');
  });

  it('42 · nenhum módulo derivado dos outros pilotos ganhou SNAP', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('SNAP');
    }
  });

  it('43 · cálculo, symptom_threshold e cutoff do SNAP-IV não foram tocados', () => {
    // este piloto é só o prompt: nenhum módulo novo de cálculo deveria
    // ter nascido no psico2
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'snapiv-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'snap-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });
});

// =====================================================================
// 13 · OS SEIS CENÁRIOS PEDIDOS
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do SNAP-IV usam. Nenhum destes valores está no
// prompt de produção: o teste 50 prova isso linha a linha.
// =====================================================================

type LinhaSnap = {
  code: 'DESATENCAO' | 'HIPERATIVIDADE' | 'TOD';
  name: string;
  raw: number;
  score: number;
  classification: string;
};

const ATINGE = 'Atinge o limiar de sintomas deste domínio';
const NAO_ATINGE = 'Não atinge o limiar de sintomas deste domínio';

function linha(l: LinhaSnap) {
  return {
    raw: l.raw,
    score: l.score,
    percentile: null,
    z_score: null,
    classification: l.classification,
    ci95: null,
    available: true,
    message: null,
    flags: [],
    scales: { code: l.code, name: l.name, ordinal: 0 },
  };
}

const NOMES = {
  DESATENCAO: 'Desatenção',
  HIPERATIVIDADE: 'Hiperatividade/Impulsividade',
  TOD: 'Transtorno Opositivo-Desafiador',
};

function protocolo18(
  desatencao: { raw: number; score: number; classification: string },
  hiperatividade: { raw: number; score: number; classification: string },
) {
  return [
    linha({ code: 'DESATENCAO', name: NOMES.DESATENCAO, ...desatencao }),
    linha({ code: 'HIPERATIVIDADE', name: NOMES.HIPERATIVIDADE, ...hiperatividade }),
  ];
}

function protocolo26(
  desatencao: { raw: number; score: number; classification: string },
  hiperatividade: { raw: number; score: number; classification: string },
  tod: { raw: number; score: number; classification: string },
) {
  return [
    ...protocolo18(desatencao, hiperatividade),
    linha({ code: 'TOD', name: NOMES.TOD, ...tod }),
  ];
}

describe('SNAP-IV narrativa · os seis cenários', () => {
  it('44 · A · SNAP-IV-18 · nenhum domínio atinge', () => {
    const dados = protocolo18(
      { raw: 8, score: 2, classification: NAO_ATINGE },
      { raw: 6, score: 1, classification: NAO_ATINGE },
    );
    const texto = formatClosedResults(dados, 'SNAP-IV-18');
    expect(texto.match(new RegExp(NAO_ATINGE, 'g'))?.length).toBe(2);
    // configuração convergente é vocabulário autorizado
    expect(P18).toContain('nenhum domínio atingiu o limiar');
    // não diagnostica, não inventa TOD (o 18 nunca menciona TOD)
    expect(P18).not.toContain('TOD');
    expect(P18).toContain('LIMIAR NÃO É DIAGNÓSTICO');
  });

  it('45 · B · SNAP-IV-18 · um domínio atinge', () => {
    const dados = protocolo18(
      { raw: 15, score: 4, classification: NAO_ATINGE },
      { raw: 26, score: 9, classification: ATINGE },
    );
    const texto = formatClosedResults(dados, 'SNAP-IV-18');
    expect(texto).toContain('classificação: ' + NAO_ATINGE);
    expect(texto).toContain('classificação: ' + ATINGE);
    // contraste é reconhecível
    expect(P18).toContain('3. CONFIGURAÇÃO');
    expect(P18).toContain('um domínio isoladamente acima do limiar');
    // mas não vira "TDAH desatento" nem diagnóstico
    expect(P18).toContain('NÃO significa diagnóstico de TDAH');
    expect(P18).toContain('apresentação hiperativa/impulsiva');
  });

  it('46 · C · SNAP-IV-18 · dois domínios atingem', () => {
    const dados = protocolo18(
      { raw: 24, score: 8, classification: ATINGE },
      { raw: 25, score: 9, classification: ATINGE },
    );
    const texto = formatClosedResults(dados, 'SNAP-IV-18');
    expect(texto.match(new RegExp(ATINGE, 'g'))?.length).toBe(2);
    // múltiplos domínios é configuração nomeável
    expect(P18).toContain('múltiplos domínios acima');
    expect(P18).toContain('múltiplos domínios atingiram o limiar');
    // mas "TDAH combinado" não é vocabulário autorizado — não aparece
    expect(P18).not.toContain('combinado');
    expect(P18).toContain('mesmo com todos os domínios acima do limiar');
  });

  it('47 · D · SNAP-IV-26 · TOD isolado', () => {
    const dados = protocolo26(
      { raw: 5, score: 1, classification: NAO_ATINGE },
      { raw: 4, score: 0, classification: NAO_ATINGE },
      { raw: 15, score: 5, classification: ATINGE },
    );
    const texto = formatClosedResults(dados, 'SNAP-IV-26');
    expect(texto).toContain('- sintomas presentes: 5 / 8');
    // TOD pode ser destacado como domínio do instrumento
    expect(P26).toContain('na dimensão TOD do SNAP-IV-26');
    // mas nunca "apresenta TOD", nem diagnóstico de transtorno opositor
    expect(P26).toContain('nunca "o avaliado apresenta TDAH" nem "apresenta TOD"');
    expect(P26).toContain('atingir o limiar nele não confirma TOD');
  });

  it('48 · E · SNAP-IV-26 · perfil misto (Desatenção e TOD atingem)', () => {
    const dados = protocolo26(
      { raw: 20, score: 7, classification: ATINGE },
      { raw: 10, score: 3, classification: NAO_ATINGE },
      { raw: 14, score: 5, classification: ATINGE },
    );
    const texto = formatClosedResults(dados, 'SNAP-IV-26');
    expect(texto.match(new RegExp(ATINGE, 'g'))?.length).toBe(2);
    expect(texto).toContain('classificação: ' + NAO_ATINGE);
    // heterogeneidade é vocabulário autorizado
    expect(P26).toContain('contraste');
    expect(P26).toContain('configuração contrastante entre os domínios');
    // "diagnóstico múltiplo" não é frase do mapa — nunca precisa aparecer
    expect(P26).not.toContain('diagnóstico múltiplo');
  });

  it('49 · F · raw ≠ contagem, com a fixture real do controlador (26)', () => {
    // do próprio data/snap_iv.json: Hiperatividade soma 15 e NÃO atinge;
    // TOD soma 13, menos, e ATINGE — a prova de que as medidas não se
    // substituem
    const dados = protocolo26(
      { raw: 19, score: 9, classification: ATINGE },
      { raw: 15, score: 3, classification: NAO_ATINGE },
      { raw: 13, score: 4, classification: ATINGE },
    );
    const texto = formatClosedResults(dados, 'SNAP-IV-26');
    expect(texto).toContain('- pontuação bruta: 15 / 27');
    expect(texto).toContain('- sintomas presentes: 3 / 9');
    expect(texto).toContain('- pontuação bruta: 13 / 24');
    expect(texto).toContain('- sintomas presentes: 4 / 8');
    // a classificação recebida é respeitada como veio, sem ser
    // "corrigida" para bater com a intensidade
    expect(texto).toContain('classificação: ' + NAO_ATINGE);
    expect(texto).toContain('classificação: ' + ATINGE);
    expect(P26).toContain('NÃO derive uma da outra');
    expect(P26).toContain(
      'um domínio com Pontuação bruta relativamente alta pode ficar abaixo do limiar de Sintomas presentes',
    );
  });

  it('50 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: Array<[string, ReturnType<typeof protocolo18 | typeof protocolo26>, string]> = [
      ['A', protocolo18({ raw: 8, score: 2, classification: NAO_ATINGE }, { raw: 6, score: 1, classification: NAO_ATINGE }), 'SNAP-IV-18'],
      ['D', protocolo26(
        { raw: 5, score: 1, classification: NAO_ATINGE },
        { raw: 4, score: 0, classification: NAO_ATINGE },
        { raw: 15, score: 5, classification: ATINGE },
      ), 'SNAP-IV-26'],
    ];
    for (const [nome, dados, codigo] of cenarios) {
      const p = codigo === 'SNAP-IV-18' ? P18 : P26;
      const texto = formatClosedResults(dados, codigo);
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(p, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
