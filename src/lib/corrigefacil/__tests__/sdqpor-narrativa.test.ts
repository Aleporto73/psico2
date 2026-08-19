// =====================================================================
// SDQ-POR · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-7
//
// Sétimo piloto da mesma arquitetura. Mesma família estrutural do BPA-2 e
// da DASS-21: sem snapshot, sem REGRA_SDQ_POR — as sete escalas (EMO,
// CON, HIP, PAR, PRO, IMPACTO e o composto TOTAL) chegam pelos resultados
// por escala de sempre. Reusa `instrumentCode` — mais um
// `const comSdqPor` local, nenhuma mudança de assinatura.
//
// A ASSIMETRIA QUE IMPORTA: só DUAS das sete escalas têm classificação.
// `data/sdq_por.json`, no CorrigeFacil, tem `classification_bands` no
// nível raiz (as quatro faixas do TOTAL) e dentro da escala IMPACTO (as
// quatro faixas dela) — em NENHUM outro lugar. `graph-config.ts` confirma
// isso já em produção: as quatro escalas de dificuldade saem do gráfico
// do TOTAL com o motivo "subescala sem faixa publicada", e PRO sai com
// "direção OPOSTA (competência preservada, não dificuldade)" — as duas
// frases vieram de lá, não foram inferidas aqui.
//
// O GATE DO IMPACTO é servidor, confirmado em `engine/calc.py::GATES`: a
// pergunta de porta fecha a escala em zero, abre para a soma de três
// itens, ou — faltando a porta ou algum dos três — tira a escala do
// resultado inteiramente. O Relatório Pró recebe RESULTADO por escala,
// nunca resposta item a item.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'SDQ-POR'`. Com
//      qualquer outro valor o prompt dos outros instrumentos é BYTE A
//      BYTE o que era, e o sha256 dos quatro destinos é o MESMO já usado
//      nos seis pilotos anteriores.
//
//   2. camadas — TOTAL (composto de EMO+CON+HIP+PAR) e IMPACTO (camada
//      separada, gate-dependente) são as ÚNICAS com classificação; as
//      outras cinco nunca ganham uma inventada.
//
//   3. fronteira — PRO nunca vira "quinta dificuldade" nem fator
//      protetivo comprovado; TOTAL × IMPACTO divergentes não é
//      contradição; nenhum item individual (gate, duração, peso) é
//      inferido, porque nenhum chega ao prompt.
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

const MARCA_PERFIL = 'COMO LER O SDQ-POR — PERFIL INTERPRETATIVO:';

const P = prompt('SDQ-POR');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('SDQ-POR narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="SDQ-POR", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('SDQ-POR', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa do SDQ-POR', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'BAYLEY-III', 'sdq-por', 'SDQ', 'SDQ-POR-PAIS',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos seis pilotos anteriores recebe o mapa do SDQ-POR', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    const soSnap18 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-18');
    const soSnap26 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-26');
    const soBayley = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BAYLEY-III');
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26, soBayley]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('SDQ');
    }
  });

  it('5 · o SDQ-POR sozinho não menciona os outros sete pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'BAYLEY', 'SCARED']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_SDQ_POR: nenhuma das sete escalas é snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_SDQ/);
    expect(GERADOR).not.toContain('REGRA_SDQ_POR :');
    expect(GERADOR).not.toContain('REGRA_SDQ_POR +');
  });

  it('7 · reusa `instrumentCode`: nenhum comSdqPor na assinatura', () => {
    expect(GERADOR).not.toMatch(/comSdqPor\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comSdqPor = instrumentCode === CODIGO_SDQ_POR;',
    );
    expect(GERADOR).toContain(
      "${comSdqPor ? PERFIL_INTERPRETATIVO_SDQ_POR : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como os demais pilotos sem família de variantes', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_SDQ_POR = `');
  });

  it('9 · a chamada real já alimenta o SDQ-POR: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('SDQ-POR', destino).match(/^## /gm) ?? []).length, destino)
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

describe('SDQ-POR narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · O TOTAL É COMPOSTO
// =====================================================================

describe('SDQ-POR narrativa · o Total é composto, não sexta medida', () => {
  it('13 · o Total é declarado composto das quatro escalas de dificuldade', () => {
    expect(P).toContain('O TOTAL É COMPOSTO, NÃO É UMA SEXTA MEDIDA');
    expect(P).toContain(
      'já chega calculado a partir de quatro escalas — Dificuldades Emocionais, Dificuldades de Conduta, Hiperatividade e Problemas com Pares',
    );
  });

  it('14 · Pró-Social e Impacto ficam fora do Total, explicitamente', () => {
    expect(P).toContain('Pró-Social não entra no Total, e o Escore de Impacto também não');
  });

  it('15 · proíbe somar, tratar como quinta dificuldade e recalcular', () => {
    expect(P).toContain('NÃO some as quatro escalas para conferir o Total');
    expect(P).toContain('não o trate como uma quinta dificuldade');
    expect(P).toContain('não o recalcule');
    expect(P).toContain('a soma pertence ao servidor');
  });
});

// =====================================================================
// 4 · CLASSIFICAÇÃO — SÓ TOTAL E IMPACTO
// =====================================================================

describe('SDQ-POR narrativa · só duas das sete escalas têm classificação', () => {
  it('16 · declara explicitamente quais escalas não têm classificação', () => {
    expect(P).toContain('CLASSIFICAÇÃO: SÓ O TOTAL E O IMPACTO TÊM');
    expect(P).toContain(
      'Dificuldades Emocionais, Dificuldades de Conduta, Hiperatividade, Problemas com Pares e Pró-Social chegam SEM classificação',
    );
    expect(P).toContain('o servidor não publica faixa normativa para nenhuma delas nesta implementação');
  });

  it('17 · proíbe as cinco classificações inventadas', () => {
    for (const proibida of [
      '"Emocional alto"',
      '"Conduta elevada"',
      '"Hiperatividade moderada"',
      '"Problemas com Pares muito altos"',
      '"Pró-Social baixo"',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('18 · permite diferença numérica sem virar classificação', () => {
    expect(P).toContain('É permitido descrever DIFERENÇA NUMÉRICA entre as quatro escalas de dificuldade');
    expect(P).toContain(
      'entre as quatro escalas que compõem o Total, a pontuação de Dificuldades Emocionais foi numericamente maior',
    );
    expect(P).toContain('isso NÃO é classificação, e não deve soar como uma');
  });

  it('19 · formatClosedResults confirma: só Total e Impacto carregam classificação', () => {
    const linha = (code: string, name: string, score: number, classification: string | null) => ({
      raw: null, score, percentile: null, z_score: null,
      classification, ci95: null, available: true,
      message: null, flags: [],
      scales: { code, name, ordinal: 0 },
    });
    const dados = [
      linha('EMO', 'Dificuldades Emocionais', 6, null),
      linha('TOTAL', 'Total de Dificuldades', 20, 'Muito Alto'),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).toContain('classificação: Muito Alto');
    const blocoEmo = texto.slice(0, texto.indexOf('Total de Dificuldades'));
    expect(blocoEmo).not.toContain('- classificação:');
  });
});

// =====================================================================
// 5 · PRÓ-SOCIAL — DIREÇÃO OPOSTA
// =====================================================================

describe('SDQ-POR narrativa · Pró-Social tem direção oposta', () => {
  it('20 · declarada competência preservada, fora do Total', () => {
    expect(P).toContain('PRÓ-SOCIAL TEM DIREÇÃO ESTRUTURALMENTE OPOSTA às quatro escalas de dificuldade');
    expect(P).toContain('ela mede competência preservada, não dificuldade');
    expect(P).toContain('por isso fica fora do Total');
  });

  it('21 · proíbe ler como quinta dificuldade ou transtorno social', () => {
    expect(P).toContain('NÃO a leia como "quinta dificuldade"');
    expect(P).toContain('não trate pontuação de Pró-Social mais alta como mais problema nem mais baixa como transtorno social');
  });

  it('22 · proíbe fator protetivo comprovado e compensação', () => {
    expect(P).toContain('não a apresente como fator protetivo comprovado');
    expect(P).toContain('nem como algo que "compensa" um Total elevado');
    expect(P).toContain('nunca como compensação ou proteção');
  });

  it('23 · o contraste vira coexistência descrita, não mecanismo', () => {
    expect(P).toContain('descreva a coexistência das duas medidas — nunca o mecanismo entre elas');
  });
});

// =====================================================================
// 6 · IMPACTO — CAMADA SEPARADA
// =====================================================================

describe('SDQ-POR narrativa · Impacto é camada separada, sem reconstrução de origem', () => {
  it('24 · declarado camada separada, ausente quando o protocolo não o produziu', () => {
    expect(P).toContain('O ESCORE DE IMPACTO É CAMADA SEPARADA');
    expect(P).toContain('não é componente do Total, não é uma quinta escala de dificuldade e não é diagnóstico');
    expect(P).toContain('Ele só existe no resultado quando o protocolo o produziu; sem ele, não há linha de Impacto para comentar');
  });

  it('25 · os quatro rótulos reais são reproduzidos exatamente', () => {
    for (const rotulo of ['"Sem Impacto"', '"Impacto Leve"', '"Impacto Moderado"', '"Impacto Grave"']) {
      expect(P, rotulo).toContain(rotulo);
    }
    expect(P).toContain('sem gradação própria');
  });

  it('26 · proíbe reconstruir a origem e presumir a resposta da porta', () => {
    expect(P).toContain('NÃO reconstrua a origem desse resultado');
    expect(P).toContain('o Impacto vem de uma pergunta de porta que este relatório não recebe');
    expect(P).toContain('"Sem Impacto" NÃO autoriza escrever que "o respondente informou que não há dificuldade"');
    expect(P).toContain('nem qualquer frase que presuma a resposta daquela pergunta');
  });

  it('27 · oferece a formulação segura', () => {
    expect(P).toContain('A única afirmação segura é "o Escore de Impacto foi classificado como Sem Impacto"');
    expect(P).toContain('ou equivalente ancorado no protocolo — não a origem dela');
  });
});

// =====================================================================
// 7 · TOTAL × IMPACTO PODEM DIVERGIR
// =====================================================================

describe('SDQ-POR narrativa · Total e Impacto divergentes não é contradição', () => {
  it('28 · declara a divergência legítima, nos dois sentidos', () => {
    expect(P).toContain('TOTAL E IMPACTO PODEM DIVERGIR, E ISSO NÃO É CONTRADIÇÃO');
    expect(P).toContain('Um Total Muito Alto ao lado de um Impacto Sem Impacto — ou o inverso — são configurações legítimas');
  });

  it('29 · proíbe chamar de erro, contradição, inconsistência ou falha', () => {
    expect(P).toContain('NÃO escreva que isso é erro, contradição, inconsistência ou falha de preenchimento');
    expect(P).toContain('não explique a causa da diferença');
    expect(P).toContain('descreva que as duas medidas apresentaram configurações diferentes, e pare aí');
  });

  it('30 · proíbe "desproporcional" quando Total baixo e Impacto alto', () => {
    expect(P).toContain(
      'um Total menos elevado ao lado de um Impacto mais elevado não autoriza concluir que "o impacto é desproporcional"',
    );
    expect(P).toContain('sem julgar uma pela ótica da outra');
  });
});

// =====================================================================
// 8 · ITENS INDIVIDUAIS NÃO CHEGAM AO PROMPT
// =====================================================================

describe('SDQ-POR narrativa · nenhum item individual chega ao modelo', () => {
  it('31 · declara que só resultados por escala chegam, nunca item a item', () => {
    expect(P).toContain('ITENS INDIVIDUAIS NÃO CHEGAM A VOCÊ');
    expect(P).toContain('Você recebe os resultados por escala — nunca as respostas item a item do SDQ-POR');
  });

  it('32 · proíbe inferir a porta, a duração e o peso — sem citar número de item', () => {
    expect(P).toContain(
      'você NÃO recebe a resposta que abre a Seção de Impacto, a duração das dificuldades nem o peso que elas representam',
    );
    expect(P).toContain('não infira nenhuma delas, e não presuma o que qualquer uma diz');
    // o prompt não nomeia os itens por número: 26/27/31 nunca precisam
    // ser conhecidos pelo modelo
    expect(P).not.toMatch(/item\s*26/i);
    expect(P).not.toMatch(/item\s*27/i);
    expect(P).not.toMatch(/item\s*31/i);
  });

  it('33 · proíbe as três áreas específicas de impacto inferidas do agregado', () => {
    expect(P).toContain('Não escreva "impacto nas amizades", "impacto escolar" nem "impacto no aprendizado"');
    expect(P).toContain('o número não diz qual pergunta específica produziu os pontos');
  });

  it('34 · confirmação estrutural: o gerador não abre query de respostas', () => {
    // "assessment_responses" pode aparecer em PROSA documentando a
    // AUSÊNCIA da query (é o que o comentário de auditoria acima de
    // `PERFIL_INTERPRETATIVO_SDQ_POR` faz) — o que não pode existir é a
    // CHAMADA: `.from('assessment_responses')` ou equivalente
    expect(GERADOR).not.toMatch(/\.from\(['"]assessment_responses['"]\)/);
    expect(GERADOR).not.toMatch(/\.from\(['"]respostas['"]\)/);
  });
});

// =====================================================================
// 9 · OS SEIS PASSOS DE RACIOCÍNIO
// =====================================================================

describe('SDQ-POR narrativa · os seis passos', () => {
  it('35 · total, dificuldades, pró-social, impacto, contrastes, mensagem', () => {
    for (const passo of [
      '1. TOTAL',
      '2. CONFIGURAÇÃO DAS QUATRO DIFICULDADES',
      '3. PRÓ-SOCIAL',
      '4. IMPACTO',
      '5. CONTRASTES',
      '6. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. TOTAL'),
      P.indexOf('2. CONFIGURAÇÃO DAS QUATRO DIFICULDADES'),
      P.indexOf('3. PRÓ-SOCIAL'),
      P.indexOf('4. IMPACTO'),
      P.indexOf('5. CONTRASTES'),
      P.indexOf('6. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('36 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('37 · o passo 4 proíbe reconstruir a origem do Impacto', () => {
    expect(P).toContain('Nunca reconstrua a origem dele');
  });
});

// =====================================================================
// 10 · AS CINCO SEÇÕES
// =====================================================================

describe('SDQ-POR narrativa · o que muda em cada seção', () => {
  it('38 · a síntese responde configuração, prioriza Total/dificuldades/Impacto/PRO', () => {
    expect(P).toContain('qual é a configuração principal deste SDQ-POR?');
    expect(P).toContain('não liste cada escala como tabela em prosa');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('39 · a análise integra o Total e separa PRO/Impacto, sem causa nem prognóstico', () => {
    expect(P).toContain('integre o Total como síntese composta delas');
    expect(P).toContain('separe Pró-Social e Impacto como dimensões fora do Total');
    expect(P).toContain('NÃO explique causa, não diagnostique, não infira prognóstico');
    expect(P).toContain('não explique nenhuma discrepância entre as camadas');
  });

  it('40 · o contexto proíbe as sete conversões automáticas em diagnóstico', () => {
    expect(P).toContain('Não transforme automaticamente Hiperatividade numericamente elevada em TDAH');
    expect(P).toContain('Conduta numericamente elevada em transtorno de conduta');
    expect(P).toContain('Dificuldades Emocionais numericamente elevadas em transtorno emocional');
    expect(P).toContain('Problemas com Pares numericamente elevados em problema social clínico');
    expect(P).toContain('Pró-Social numericamente reduzida em déficit social');
    expect(P).toContain('Total Muito Alto em psicopatologia global');
    expect(P).toContain('Impacto Grave em incapacidade funcional geral');
  });

  it('41 · as recomendações passam pelo teste da causa e não têm piso', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração do SDQ-POR?');
    expect(P).toContain('Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
    expect(P).toContain('Não fabrique encaminhamento, terapia, medicação, adaptação escolar nem protocolo diagnóstico');
  });

  it('42 · as considerações finais fecham sem repetir escalas nem diagnosticar', () => {
    expect(P).toContain('feche a mensagem central');
    expect(P).toContain('Não repita todas as escalas, não crie diagnóstico');
    expect(P).toContain('não escreva um segundo aviso');
  });
});

// =====================================================================
// 11 · TRAVAS FINAIS, MESMO NOS EXTREMOS
// =====================================================================

describe('SDQ-POR narrativa · nenhum extremo autoriza diagnóstico', () => {
  it('43 · proíbe os sete transtornos, mesmo com Total Muito Alto ou Impacto Grave', () => {
    expect(P).toContain(
      'O QUE NUNCA SE FAZ COM O SDQ-POR, mesmo com o Total em Muito Alto ou o Impacto em Grave',
    );
    for (const transtorno of [
      'TDAH', 'transtorno de conduta', 'transtorno emocional',
      'transtorno de ansiedade', 'transtorno depressivo', 'TEA',
      'transtorno opositor',
    ]) {
      expect(P, transtorno).toContain(transtorno);
    }
  });

  it('44 · proíbe "psicopatologia global", "déficit global" e "problema comportamental global"', () => {
    expect(P).toContain('"psicopatologia global"');
    expect(P).toContain('"déficit global"');
    expect(P).toContain('"problema comportamental global"');
  });

  it('45 · proíbe Total como diagnóstico, PRO como fator protetivo, Impacto como prova de prejuízo', () => {
    expect(P).toContain('Não trate o Total como diagnóstico global, a Pró-Social como fator protetivo comprovado nem o Impacto como prova de prejuízo específico em amizade ou escola');
  });

  it('46 · manda ancorar no protocolo, não na criança', () => {
    for (const ancora of ['no SDQ-POR', 'neste protocolo', 'nesta escala']) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('47 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain(
      'não alongue o texto, não percorra as sete escalas como tabela em prosa, e não acrescente cautela nova',
    );
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
  });

  it('48 · não abre exceção à REGRA CENTRAL', () => {
    expect(P).toContain('nada aqui autoriza recalcular, reclassificar, somar escalas ou concluir diagnóstico');
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
  });
});

// =====================================================================
// 12 · NENHUM CORTE NUMÉRICO ENTROU NO MAPA
// =====================================================================

describe('SDQ-POR narrativa · nenhum ponto de corte entrou no mapa', () => {
  it('49 · nenhum número de corte do Total ou do Impacto aparece no prompt', () => {
    // cortes reais do controlador: Total 11/12/15/16/18/19; Impacto 0/1/2/3
    // — o prompt não deve conter frases do tipo "corte em N" nem "N pontos"
    expect(P).not.toMatch(/corte\s+(de\s+)?\d/i);
    expect(P).not.toMatch(/\bpontos?\s*[<>=]/i);
  });
});

// =====================================================================
// 13 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('SDQ-POR narrativa · a origem comercial não entra no conteúdo', () => {
  it('50 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_SDQ_POR');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 14 · ESCOPO — nada fora do prompt mudou
// =====================================================================

describe('SDQ-POR narrativa · nada fora do prompt mudou', () => {
  it('51 · os seis pilotos anteriores continuam intocados', () => {
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
  });

  it('52 · nenhum módulo derivado dos outros pilotos ganhou SDQ', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('SDQ');
    }
  });

  it('53 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'sdqpor-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'sdq-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('54 · graph-config.ts, fonte da confirmação de PRO e das faixas, não foi tocado', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain("'SDQ-POR'");
    expect(graphConfig).toContain('subescala sem faixa publicada');
    expect(graphConfig).toContain('direção OPOSTA');
    // e o gerador não duplica essa lógica de gráfico
    expect(GERADOR).not.toContain('score_band');
  });
});

// =====================================================================
// 15 · OS NOVE CENÁRIOS PEDIDOS
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados do SDQ-POR usam (não há bloco derivado). Nenhum
// destes valores está no prompt de produção: o teste 63 prova isso linha
// a linha.
// =====================================================================

type LinhaSdq = {
  code: 'EMO' | 'CON' | 'HIP' | 'PAR' | 'PRO' | 'TOTAL' | 'IMPACTO';
  name: string;
  score: number;
  classification: string | null;
};

const NOMES = {
  EMO: 'Dificuldades Emocionais',
  CON: 'Dificuldades de Conduta',
  HIP: 'Hiperatividade',
  PAR: 'Problemas com Pares',
  PRO: 'Pró-Social',
  TOTAL: 'Total de Dificuldades',
  IMPACTO: 'Escore de Impacto',
};

function linha(l: LinhaSdq, ordinal: number) {
  return {
    raw: null, score: l.score, percentile: null, z_score: null,
    classification: l.classification, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

describe('SDQ-POR narrativa · os nove cenários', () => {
  it('55 · A · Total Próximo da Média, componentes sem classificação', () => {
    const dados = [
      linha({ code: 'EMO', name: NOMES.EMO, score: 2, classification: null }, 0),
      linha({ code: 'CON', name: NOMES.CON, score: 2, classification: null }, 1),
      linha({ code: 'HIP', name: NOMES.HIP, score: 3, classification: null }, 2),
      linha({ code: 'PAR', name: NOMES.PAR, score: 1, classification: null }, 3),
      linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 8, classification: 'Próximo da Média' }, 4),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).toContain('classificação: Próximo da Média');
    expect(texto.match(/- classificação:/g)?.length).toBe(1);
    expect(P).toContain('SEM classificação');
  });

  it('56 · B · Total Muito Alto, sem virar diagnóstico', () => {
    const dados = [
      linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 22, classification: 'Muito Alto' }, 0),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).toContain('classificação: Muito Alto');
    expect(P).toContain('mesmo com o Total em Muito Alto ou o Impacto em Grave');
    expect(P).toContain('Não trate o Total como diagnóstico global');
  });

  it('57 · C · componentes heterogêneos — diferença numérica sem rótulo inventado', () => {
    const dados = [
      linha({ code: 'EMO', name: NOMES.EMO, score: 8, classification: null }, 0),
      linha({ code: 'CON', name: NOMES.CON, score: 1, classification: null }, 1),
      linha({ code: 'HIP', name: NOMES.HIP, score: 2, classification: null }, 2),
      linha({ code: 'PAR', name: NOMES.PAR, score: 2, classification: null }, 3),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).not.toMatch(/classificação/);
    expect(P).toContain('É permitido descrever DIFERENÇA NUMÉRICA entre as quatro escalas de dificuldade');
    expect(P).toContain('"Emocional alto"');
  });

  it('58 · D · Total elevado + Impacto Sem Impacto — não é contradição', () => {
    const dados = [
      linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 20, classification: 'Muito Alto' }, 0),
      linha({ code: 'IMPACTO', name: NOMES.IMPACTO, score: 0, classification: 'Sem Impacto' }, 1),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).toContain('classificação: Muito Alto');
    expect(texto).toContain('classificação: Sem Impacto');
    expect(P).toContain('NÃO escreva que isso é erro, contradição, inconsistência ou falha de preenchimento');
    expect(P).not.toMatch(/item\s*26/i);
  });

  it('59 · E · Impacto Grave — sem inferir área específica nem urgência', () => {
    const dados = [
      linha({ code: 'IMPACTO', name: NOMES.IMPACTO, score: 5, classification: 'Impacto Grave' }, 0),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).toContain('classificação: Impacto Grave');
    expect(P).toContain('Não escreva "impacto nas amizades", "impacto escolar" nem "impacto no aprendizado"');
    expect(P).toContain('nem o Impacto como prova de prejuízo específico em amizade ou escola');
  });

  it('60 · F · Pró-Social numericamente alto + Total elevado — coexistência, não compensação', () => {
    const dados = [
      linha({ code: 'PRO', name: NOMES.PRO, score: 9, classification: null }, 0),
      linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 20, classification: 'Muito Alto' }, 1),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).not.toContain('Pró-Social\n- classificação');
    expect(P).toContain('não a apresente como fator protetivo comprovado');
    expect(P).toContain('nem como algo que "compensa" um Total elevado');
    expect(P).toContain('descreva a coexistência das duas medidas');
  });

  it('61 · G · Impacto ausente — nenhum resultado inventado', () => {
    const dados = [
      linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 10, classification: 'Próximo da Média' }, 0),
    ];
    const texto = formatClosedResults(dados, 'SDQ-POR');
    expect(texto).not.toContain('IMPACTO');
    expect(texto).not.toContain('Impacto');
    expect(P).toContain('sem ele, não há linha de Impacto para comentar');
  });

  it('62 · H · o Total não contém PRO nem IMPACTO — prova estrutural', () => {
    expect(P).toContain(
      'já chega calculado a partir de quatro escalas — Dificuldades Emocionais, Dificuldades de Conduta, Hiperatividade e Problemas com Pares —, e SÓ dessas quatro',
    );
    expect(P).toContain('Pró-Social não entra no Total, e o Escore de Impacto também não');
  });

  it('63 · nenhum bloco de resultado de cenário está hardcoded no prompt de produção', () => {
    const cenarios: [string, ReturnType<typeof linha>[]][] = [
      ['A', [
        linha({ code: 'EMO', name: NOMES.EMO, score: 2, classification: null }, 0),
        linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 8, classification: 'Próximo da Média' }, 1),
      ]],
      ['D', [
        linha({ code: 'TOTAL', name: NOMES.TOTAL, score: 20, classification: 'Muito Alto' }, 0),
        linha({ code: 'IMPACTO', name: NOMES.IMPACTO, score: 0, classification: 'Sem Impacto' }, 1),
      ]],
    ];
    for (const [nome, dados] of cenarios) {
      const texto = formatClosedResults(dados, 'SDQ-POR');
      const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
      for (const bloco of blocos) {
        expect(P, `${nome}: ${bloco}`).not.toContain(bloco);
      }
    }
  });
});
