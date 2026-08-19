// =====================================================================
// CONFIAS · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-2
//
// Segundo piloto da MESMA arquitetura validada no FDT (Fase 2B-1): um
// bloco de perfil interpretativo colado na trava que já fecha o dado, sob
// o MESMO sinalizador que já condicionava esse dado. Nenhuma trava técnica
// muda; nenhum sinalizador novo nasce.
//
// A FORMA DO PROBLEMA MUDA, A CAUSA NÃO. No FDT eram dez medidas em duas
// dimensões; no CONFIAS são DUAS escalas principais (Sílaba, Fonema, mais
// o Total) e DEZESSEIS tarefas em dois grupos (S1–S9, F1–F7). Sem mapa, o
// modelo trata as dezesseis como lista plana — recita ou generaliza. Com
// mapa, ele lê configuração: como os dois grupos se comparam, onde há
// contraste interno, o que o Nível equivalente acrescenta.
//
// AS DUAS TRAVAS QUE ESTE ARQUIVO GUARDA, iguais às do FDT:
//
//   1. escopo — o par só existe com `comDerivado` true. Com ele false o
//      prompt dos outros instrumentos é BYTE A BYTE o que era, e o sha256
//      dos quatro destinos é o MESMO já usado para provar isso no FDT —
//      nenhuma regra global mudou entre as duas fases.
//
//   2. fronteira — o mapa novo não afrouxa a REGRA_DERIVADOS. Tudo que
//      era proibido continua escrito e proibido, e as proibições que o
//      mapa CRIA (tarefa virar déficit, escala virar transtorno, nível
//      equivalente virar hipótese) são conferidas uma a uma.
//
// Nenhum teste daqui chama a OpenAI.
// =====================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DerivadoConfias, HabilidadeConfias } from '@/lib/corrigefacil/api';
import { buildCorrigeFacilSystemPrompt } from '@/lib/corrigefacil/report-generator';
import { derivadoParaTexto } from '@/lib/corrigefacil/confias-derivado';

function leia(...partes: string[]): string {
  return readFileSync(join(process.cwd(), ...partes), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const GERADOR = leia('src', 'lib', 'corrigefacil', 'report-generator.ts');

const DESTINOS = ['family', 'school', 'technical', 'internal'] as const;
type Destino = (typeof DESTINOS)[number];

/** O prompt do CONFIAS e o prompt de quem não é CONFIAS. Os outros dois
 *  sinalizadores ficam em false de propósito: o que se mede aqui é o
 *  efeito do CONFIAS sozinho. */
const prompt = (comDerivado: boolean, destino: Destino = 'technical'): string =>
  buildCorrigeFacilSystemPrompt(destino, 'AVISO', comDerivado, false, false);

const MARCA_PERFIL = 'COMO LER O CONFIAS — PERFIL INTERPRETATIVO:';
const MARCA_REGRA = 'DADOS DERIVADOS CONGELADOS:';

const P = prompt(true);

// =====================================================================
// 1 · ESCOPO — o par entra junto, e só com CONFIAS
// =====================================================================

describe('CONFIAS narrativa · escopo do perfil interpretativo', () => {
  it('1 · com CONFIAS, os quatro destinos recebem regra e perfil', () => {
    for (const destino of DESTINOS) {
      const p = prompt(true, destino);
      expect(p, destino).toContain(MARCA_REGRA);
      expect(p, destino).toContain(MARCA_PERFIL);
      // a trava vem ANTES do mapa: o que é proibido é lido primeiro
      expect(p.indexOf(MARCA_REGRA), destino).toBeLessThan(
        p.indexOf(MARCA_PERFIL),
      );
    }
  });

  it('2 · sem CONFIAS, nenhum destino recebe o perfil', () => {
    for (const destino of DESTINOS) {
      expect(prompt(false, destino), destino).not.toContain(MARCA_PERFIL);
      expect(prompt(false, destino), destino).not.toContain(MARCA_REGRA);
    }
  });

  it('3 · FDT e PHQ-9 sozinhos não recebem o perfil do CONFIAS', () => {
    const soFdt = buildCorrigeFacilSystemPrompt(
      'technical', 'AVISO', false, false, true,
    );
    const soPhq9 = buildCorrigeFacilSystemPrompt(
      'technical', 'AVISO', false, true, false,
    );
    expect(soFdt).toContain('DADOS DERIVADOS CONGELADOS DO FDT:');
    expect(soFdt).not.toContain(MARCA_PERFIL);
    expect(soFdt).not.toContain('CONFIAS');
    expect(soPhq9).toContain('DADOS DERIVADOS CONGELADOS DO PHQ-9:');
    expect(soPhq9).not.toContain(MARCA_PERFIL);
    expect(soPhq9).not.toContain('CONFIAS');
  });

  it('4 · o CONFIAS sozinho não menciona FDT nem PHQ-9', () => {
    // a mesma independência que já valia entre PHQ-9 e CONFIAS antes
    // desta fase (phq9-rastreamento.test.ts) continua valendo com o mapa
    expect(P).not.toContain('PHQ-9');
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS DO FDT');
  });

  it('5 · o par sai do MESMO sinalizador, não de dois', () => {
    // não existe comConfias: o mapa nasce preso ao mesmo comDerivado que
    // já condicionava REGRA_DERIVADOS, igual ao par REGRA_FDT/mapa do FDT
    expect(GERADOR).toContain(
      "${comDerivado ? REGRA_DERIVADOS + PERFIL_INTERPRETATIVO_CONFIAS : ''}",
    );
  });

  it('6 · o perfil não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt(true, destino).match(/^## /gm) ?? []).length, destino)
        .toBe(5);
    }
  });
});

// =====================================================================
// 2 · O PROMPT DOS OUTROS INSTRUMENTOS — sha256, não confiança
//
// Os quatro sha são os MESMOS já usados para provar o mesmo em
// fdt-narrativa.test.ts: se qualquer regra global tivesse mudado entre as
// duas fases, um dos dois arquivos já teria denunciado.
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

describe('CONFIAS narrativa · o prompt dos outros instrumentos não mudou', () => {
  it('7 · os quatro destinos batem byte a byte com o baseline', () => {
    for (const destino of DESTINOS) {
      const sha = createHash('sha256')
        .update(prompt(false, destino), 'utf8')
        .digest('hex');
      expect(sha, destino).toBe(SHA_SEM_DERIVADO[destino]);
    }
  });

  it('8 · chamar sem os sinalizadores é o mesmo que chamá-los false', () => {
    for (const destino of DESTINOS) {
      expect(buildCorrigeFacilSystemPrompt(destino, 'AVISO'), destino).toBe(
        prompt(false, destino),
      );
    }
  });
});

// =====================================================================
// 3 · A REGRA_DERIVADOS — nenhuma trava saiu
// =====================================================================

describe('CONFIAS narrativa · a REGRA_DERIVADOS continua inteira', () => {
  it('9 · os três "não recalcule" continuam escritos', () => {
    expect(P).toContain('Não recalcule o percentual de nenhuma habilidade');
    expect(P).toContain('não recalcule a classificação de nenhuma habilidade');
    expect(P).toContain('não recalcule o nível equivalente');
    expect(P).toContain(
      'Reproduza os rótulos exatamente como vieram, sem sinônimo e sem gradação própria',
    );
  });

  it('10 · nível equivalente segue separado da hipótese informada', () => {
    expect(P).toContain(
      'NÃO é a hipótese de escrita escolhida pelo profissional para a seleção normativa',
    );
    expect(P).toContain('não trate a diferença entre os dois como inconsistência');
  });

  it('11 · o perfil pode descrever, mas não pode inventar nem diagnosticar', () => {
    expect(P).toContain('O Perfil por Habilidade PODE ser usado');
    expect(P).toContain('Não nomeie habilidade que não esteja nas linhas recebidas');
    expect(P).toContain('não crie categoria de agrupamento que ninguém forneceu');
    expect(P).toContain('não converta o perfil em diagnóstico, causa ou prognóstico');
    // e o mapa novo não abre nenhuma porta: ele mesmo diz que não abre
    expect(P).toContain(
      'nada aqui autoriza recalcular, reclassificar, comparar percentual com corte ou concluir sobre a criança',
    );
  });

  it('12 · a REGRA CENTRAL continua cobrindo o CONFIAS', () => {
    expect(P).toContain('Não recalcule escores, percentis, z, IC95 ou classificações');
    expect(P).toContain('não reconstrua tabelas normativas');
  });
});

// =====================================================================
// 4 · O MAPA SEMÂNTICO — escalas principais, perfil, nível equivalente
// =====================================================================

describe('CONFIAS narrativa · o mapa semântico', () => {
  it('13 · Sílaba, Fonema e Total são nomeados como escalas principais', () => {
    expect(P).toContain(
      'Sílaba, Fonema e Total são as ESCALAS PRINCIPAIS',
    );
    expect(P).toContain(
      'Sílaba representa o desempenho agregado nas tarefas silábicas do instrumento',
    );
    expect(P).toContain('Fonema, o desempenho agregado nas tarefas fonêmicas');
    expect(P).toContain('Total, o resultado agregado do protocolo inteiro');
  });

  it('14 · a conversão em déficit e transtorno está proibida', () => {
    expect(P).toContain('NÃO converta Sílaba baixa em "déficit silábico"');
    expect(P).toContain('Fonema baixo em "déficit fonológico"');
    expect(P).toContain('nem Total baixo em "transtorno de aprendizagem"');
    expect(P).toContain('a classificação continua pertencendo ao CONFIAS, não à criança');
  });

  it('15 · o Perfil por Habilidade nomeia os dois grupos e as três classificações', () => {
    expect(P).toContain('as tarefas silábicas (S1 a S9) e fonêmicas (F1 a F7)');
    expect(P).toContain('Consolidada, Em desenvolvimento ou Ainda não consolidada');
    expect(P).toContain('concentração das classificações, heterogeneidade, contraste e agrupamento');
  });

  it('16 · tarefa classificada não vira funcionamento cotidiano', () => {
    expect(P).toContain(
      'NÃO transforme "Síntese fonêmica — Ainda não consolidada" em "a criança não consegue sintetizar fonemas no cotidiano"',
    );
    expect(P).toContain('nem em "há déficit fonêmico"');
    expect(P).toContain(
      'o que se pode dizer é que, nesta tarefa, o desempenho foi classificado como Ainda não consolidada',
    );
  });

  it('17 · o nível equivalente é leitura adicional, nunca a hipótese', () => {
    expect(P).toContain(
      'O NÍVEL EQUIVALENTE (escore sílaba), quando vier, é leitura ADICIONAL do escore de Sílaba',
    );
    expect(P).toContain('Nunca chame o nível de hipótese observada');
    expect(P).toContain('nunca diga que ele corrige a hipótese informada');
    expect(P).toContain('nunca trate divergência entre os dois como erro');
    expect(P).toContain('as duas informações têm natureza diferente');
  });

  it('18 · o mapa se declara vocabulário, não característica da criança', () => {
    expect(P).toContain(
      'O QUE CADA NÍVEL DE INFORMAÇÃO REPRESENTA (vocabulário do instrumento, não característica da criança)',
    );
  });
});

// =====================================================================
// 5 · OS SEIS PASSOS DE RACIOCÍNIO
// =====================================================================

describe('CONFIAS narrativa · os seis passos', () => {
  it('19 · escalas, distribuição, grupos, contrastes, nível, mensagem', () => {
    for (const passo of [
      '1. ESCALAS PRINCIPAIS',
      '2. DISTRIBUIÇÃO DAS HABILIDADES',
      '3. SILÁBICAS × FONÊMICAS',
      '4. CONTRASTES INTERNOS',
      '5. NÍVEL EQUIVALENTE',
      '6. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. ESCALAS PRINCIPAIS'),
      P.indexOf('2. DISTRIBUIÇÃO DAS HABILIDADES'),
      P.indexOf('3. SILÁBICAS × FONÊMICAS'),
      P.indexOf('4. CONTRASTES INTERNOS'),
      P.indexOf('5. NÍVEL EQUIVALENTE'),
      P.indexOf('6. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('20 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('21 · distribuição das habilidades não vira contagem mecânica', () => {
    expect(P).toContain('Não vire contagem mecânica no texto');
    expect(P).toContain('use para perceber o padrão, não para listar');
  });

  it('22 · silábico × fonêmico compara pela distribuição dentro do grupo, nunca por contagem bruta', () => {
    expect(P).toContain('os dois grupos têm números diferentes de tarefas');
    expect(P).toContain('a comparação entre eles NUNCA pode ser por contagem bruta');
    expect(P).toContain('Compare a DISTRIBUIÇÃO das classificações DENTRO de cada grupo');
    expect(P).toContain('Não explique por quê');
  });

  it('23 · contraste interno é particularidade, não diagnóstico', () => {
    expect(P).toContain('procure tarefa específica que destoe do restante do grupo dela');
    expect(P).toContain('pode ser destacada como particularidade do perfil');
    expect(P).toContain('Não a transforme em diagnóstico nem em causa');
  });

  it('24 · a mensagem central escolhe UMA configuração, sustentada pelos dados', () => {
    expect(P).toContain('escolha UMA configuração principal para organizar Síntese e Análise');
    expect(P).toContain('Só o que os dados realmente sustentarem');
  });
});

// =====================================================================
// 6 · AS CINCO SEÇÕES — o que muda em cada uma
// =====================================================================

describe('CONFIAS narrativa · o que muda em cada seção', () => {
  it('25 · a síntese responde configuração, e encurta no homogêneo', () => {
    expect(P).toContain('qual é a configuração principal deste CONFIAS?');
    expect(P).toContain('não as dezesseis tarefas em prosa');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('sem inventar diferença para produzir texto');
  });

  it('26 · a análise articula escalas, perfil, nível equivalente e limites', () => {
    expect(P).toContain('relacione as escalas principais com o Perfil por Habilidade');
    expect(P).toContain('integre o Nível equivalente quando existir');
    expect(P).toContain('diga o que o perfil permite afirmar NO ÂMBITO DO CONFIAS');
    expect(P).toContain('delimite a extrapolação');
    expect(P).toContain('Não recite as dezesseis tarefas');
  });

  it('27 · o contexto usa a mensagem central, sem prescrever intervenção', () => {
    expect(P).toContain(
      'Um perfil heterogêneo pode justificar orientar que o resultado não seja resumido só pelo Total',
    );
    expect(P).toContain('um perfil homogêneo não precisa de preocupação inventada');
    expect(P).toContain(
      'Não diga o que a escola ou a família devem trabalhar (rimas, fonemas, intervenção)',
    );
    expect(P).toContain('a menos que isso venha de contexto escrito pelo profissional');
  });

  it('28 · as recomendações passam pelo teste da causa e não têm piso', () => {
    expect(P).toContain('ele existe POR CAUSA deste perfil CONFIAS?');
    expect(P).toContain(
      'Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra',
    );
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
    expect(P).toContain('uma recomendação específica pode ser suficiente');
    expect(P).toContain('perfil homogêneo não pede uma segunda para completar');
  });

  it('29 · as considerações finais fecham a mensagem central', () => {
    expect(P).toContain('Nas Considerações finais, feche a MENSAGEM CENTRAL');
    expect(P).toContain('não repita as dezesseis habilidades');
    expect(P).toContain('não escreva um segundo aviso');
  });
});

// =====================================================================
// 7 · O QUE O MAPA PROÍBE
// =====================================================================

describe('CONFIAS narrativa · o que o mapa proíbe', () => {
  it('30 · proíbe inventar habilidade e agrupamento inexistente', () => {
    expect(P).toContain('Não crie habilidade que não esteja nas linhas recebidas');
    expect(P).toContain('não invente agrupamento que ninguém forneceu');
  });

  it('31 · proíbe converter classificação em diagnóstico, mesmo extrema', () => {
    expect(P).toContain(
      'O QUE NUNCA SE FAZ COM O PERFIL DO CONFIAS, mesmo com classificação extrema:',
    );
    expect(P).toContain('Não converta "Ainda não consolidada" em déficit');
    expect(P).toContain('nem qualquer classificação do CONFIAS em diagnóstico');
  });

  it('32 · proíbe inferir dislexia, transtorno, dificuldade escolar e prognóstico', () => {
    expect(P).toContain(
      'Não infira dislexia, transtorno de aprendizagem, dificuldade escolar ou prognóstico',
    );
    expect(P).toContain('a partir de nenhuma classificação — do perfil, das escalas principais ou do nível equivalente');
  });

  it('33 · proíbe "não sabe" fora do contexto da tarefa', () => {
    expect(P).toContain(
      'Não afirme que a criança "não sabe" determinada habilidade fora do contexto da tarefa avaliada',
    );
    expect(P).toContain(
      'a classificação descreve o desempenho NESTA tarefa, NESTE protocolo, não uma capacidade geral',
    );
  });

  it('34 · manda ancorar no protocolo, não na criança', () => {
    for (const ancora of [
      'neste protocolo',
      'no CONFIAS',
      'nas tarefas avaliadas',
      'no perfil observado',
    ]) {
      expect(P, ancora).toContain(ancora);
    }
  });

  it('35 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain(
      'não alongue o texto, não percorra as dezesseis tarefas e não acrescente cautela nova',
    );
    // e o teto global continua onde estava
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
    expect(P).toContain('Qualidade acima de tamanho');
  });
});

// =====================================================================
// 8 · NENHUM CORTE DO SERVIDOR VAZOU
//
// Os cortes de 0,75 e 0,50 que separam as três faixas do perfil (e os
// pontos min/max das faixas das escalas principais) não chegam ao
// browser — é a trava de confias-derivado.ts. O mapa novo não pode
// reconstruí-los.
// =====================================================================

describe('CONFIAS narrativa · nenhum corte normativo entrou no mapa', () => {
  it('36 · nenhum número de corte aparece no prompt', () => {
    for (const corte of ['0,75', '0.75', '75%', '0,5', '0.5', '50%']) {
      expect(P, corte).not.toContain(corte);
    }
  });

  it('37 · o mapa fala de classificação recebida, não de percentual comparado', () => {
    expect(P).not.toMatch(/percentual\s*(>=|<=|>|<|maior|menor)\s*(que|ou)/i);
  });
});

// =====================================================================
// 9 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('CONFIAS narrativa · a origem comercial não entra no conteúdo', () => {
  it('38 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_CONFIAS');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf('/** A regra do derivado do PHQ-9.');
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });

  it('39 · a chamada real continua passando `derivado !== null`', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('derivado !== null,');
    expect(chamada).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 10 · ESCOPO — nada fora do prompt mudou
// =====================================================================

describe('CONFIAS narrativa · nada fora do prompt mudou', () => {
  it('40 · o mapa mora só no gerador', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
      ['src', 'app', 'app', 'corrigefacil', 'FdtGraficos.tsx'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('PERFIL_INTERPRETATIVO');
      expect(fonte, arquivo.join('/')).not.toContain(MARCA_PERFIL);
    }
  });

  it('41 · o gerador continua sem tocar em apresentação do CONFIAS', () => {
    for (const nome of ['montarLinhaPerfil', 'blocosDoPerfil', 'linhasDoPerfil']) {
      expect(GERADOR, nome).not.toContain(nome);
    }
  });

  it('42 · a transcrição do derivado não mudou de forma', () => {
    // `derivadoParaTexto` é o que entrega o dado ao modelo; o mapa fala
    // SOBRE ele. Se essa forma mudasse, o mapa passaria a descrever outra
    // coisa sem que este arquivo notasse — daí a trava.
    const texto = derivadoParaTexto(CENARIOS.homogeneoConsolidado)!;
    expect(texto).toContain('Perfil por Habilidade:\n');
    expect(texto).toContain('S1 — ');
  });

  it('43 · REGRA_FDT e PERFIL_INTERPRETATIVO_FDT continuam intocados', () => {
    const soFdt = buildCorrigeFacilSystemPrompt(
      'technical', 'AVISO', false, false, true,
    );
    expect(soFdt).toContain('COMO LER O FDT — PERFIL INTERPRETATIVO:');
    expect(soFdt).toContain('DADOS DERIVADOS CONGELADOS DO FDT:');
  });
});

// =====================================================================
// 11 · OS QUATRO CENÁRIOS QUE O PROMPT PRECISA SABER TRATAR
//
// Fixtures CONCEITUAIS: o que importa é o padrão de classificação, não o
// número de acertos. Nenhum destes valores está no prompt de produção —
// o teste 48 prova isso linha a linha.
// =====================================================================

const SILABICAS = [
  ['S1', 'Síntese silábica'],
  ['S2', 'Segmentação silábica'],
  ['S3', 'Identificação de sílaba inicial'],
  ['S4', 'Identificação de rima'],
  ['S5', 'Produção de palavra com a sílaba dada'],
  ['S6', 'Identificação de sílaba medial'],
  ['S7', 'Produção de rima'],
  ['S8', 'Exclusão silábica'],
  ['S9', 'Transposição silábica'],
] as const;

const FONEMICAS = [
  ['F1', 'Produção de palavra que inicia com o som dado'],
  ['F2', 'Identificação de fonema inicial'],
  ['F3', 'Identificação de fonema final'],
  ['F4', 'Exclusão fonêmica'],
  ['F5', 'Síntese fonêmica'],
  ['F6', 'Segmentação fonêmica'],
  ['F7', 'Transposição fonêmica'],
] as const;

function derivadoDe(
  classifSilabicas: string[],
  classifFonemicas: string[],
  nivel: string | null = null,
): DerivadoConfias {
  const habilidades: HabilidadeConfias[] = [];
  SILABICAS.forEach(([code, name], i) => {
    const classificacao = classifSilabicas[i];
    if (!classificacao) return;
    habilidades.push({
      code, name, acertos: 3, max: 4,
      percentual: 0.75, classificacao,
    });
  });
  FONEMICAS.forEach(([code, name], i) => {
    const classificacao = classifFonemicas[i];
    if (!classificacao) return;
    habilidades.push({
      code, name, acertos: 2, max: 4,
      percentual: 0.5, classificacao,
    });
  });
  return { nivel_equivalente_silaba: nivel, perfil_habilidades: habilidades };
}

const CONSOLIDADA = 'Consolidada';
const EM_DESENVOLVIMENTO = 'Em desenvolvimento';
const AINDA_NAO = 'Ainda não consolidada';

const CENARIOS = {
  /** A — quase tudo consolidado, nos dois grupos */
  homogeneoConsolidado: derivadoDe(
    Array(9).fill(CONSOLIDADA),
    Array(7).fill(CONSOLIDADA),
  ),
  /** B — silábico majoritariamente consolidado, fonêmico majoritariamente
   *  em desenvolvimento/ainda não consolidado */
  silabicoMaisConsolidado: derivadoDe(
    [CONSOLIDADA, CONSOLIDADA, CONSOLIDADA, CONSOLIDADA, CONSOLIDADA,
      CONSOLIDADA, CONSOLIDADA, CONSOLIDADA, EM_DESENVOLVIMENTO],
    [EM_DESENVOLVIMENTO, EM_DESENVOLVIMENTO, AINDA_NAO, AINDA_NAO,
      EM_DESENVOLVIMENTO, AINDA_NAO, EM_DESENVOLVIMENTO],
  ),
  /** C — grupo fonêmico majoritariamente consolidado, com UMA tarefa
   *  destoante (Transposição fonêmica) */
  heterogeneoInterno: derivadoDe(
    Array(9).fill(CONSOLIDADA),
    [CONSOLIDADA, CONSOLIDADA, CONSOLIDADA, CONSOLIDADA, CONSOLIDADA,
      CONSOLIDADA, AINDA_NAO],
  ),
  /** D — nível equivalente diverge da hipótese informada (a hipótese em
   *  si não é dado do derivado; é o CONTEXTO de seleção normativa, que
   *  o teste 47 usa só como referência textual) */
  nivelDivergente: derivadoDe(
    Array(9).fill(CONSOLIDADA),
    Array(7).fill(CONSOLIDADA),
    'Alfabética',
  ),
} as const;

function classificacoesSilabicas(d: DerivadoConfias): string[] {
  return d.perfil_habilidades
    .filter((h) => h.code.startsWith('S'))
    .map((h) => h.classificacao ?? '');
}

function classificacoesFonemicas(d: DerivadoConfias): string[] {
  return d.perfil_habilidades
    .filter((h) => h.code.startsWith('F'))
    .map((h) => h.classificacao ?? '');
}

describe('CONFIAS narrativa · os quatro cenários', () => {
  it('44 · A homogêneo consolidado · as 16 tarefas chegam ao modelo', () => {
    const silabicas = classificacoesSilabicas(CENARIOS.homogeneoConsolidado);
    const fonemicas = classificacoesFonemicas(CENARIOS.homogeneoConsolidado);
    expect(new Set([...silabicas, ...fonemicas])).toEqual(new Set([CONSOLIDADA]));
    const texto = derivadoParaTexto(CENARIOS.homogeneoConsolidado)!;
    expect(texto).toContain('S1 — Síntese silábica: 3/4 · 75% · Consolidada');
    expect(texto).toContain(
      'F1 — Produção de palavra que inicia com o som dado: 2/4 · 50% · Consolidada',
    );
    // e o prompt manda a síntese ficar curta neste caso
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('45 · B silábico mais consolidado que fonêmico · reconhece pela distribuição, sem explicar', () => {
    const silabicas = classificacoesSilabicas(CENARIOS.silabicoMaisConsolidado);
    const fonemicas = classificacoesFonemicas(CENARIOS.silabicoMaisConsolidado);
    expect(silabicas.filter((c) => c === CONSOLIDADA)).toHaveLength(8);
    expect(fonemicas.filter((c) => c === CONSOLIDADA)).toHaveLength(0);
    // o passo 3 existe e autoriza nomear a diferença pela DISTRIBUIÇÃO
    // dentro de cada grupo, sem explicar causa
    expect(P).toContain('SILÁBICAS × FONÊMICAS');
    expect(P).toContain('Compare a DISTRIBUIÇÃO das classificações DENTRO de cada grupo');
    expect(P).toContain('Não explique por quê');
    // e a conversão em atraso ou transtorno continua barrada
    expect(P).toContain('Não infira dislexia, transtorno de aprendizagem, dificuldade escolar ou prognóstico');
  });

  it('45b · a contagem bruta de tarefas NUNCA é autorizada como comparador entre os grupos', () => {
    // o bug real: silábico tem nove tarefas e fonêmico tem sete, então
    // "5 consolidadas" no silábico e "4 consolidadas" no fonêmico não
    // representam a mesma concentração, mesmo 5 sendo o número maior —
    // o prompt precisa dizer isso, e nunca autorizar a leitura antiga
    expect(P).toContain('os dois grupos têm números diferentes de tarefas');
    expect(P).toContain(
      'a comparação entre eles NUNCA pode ser por contagem bruta',
    );
    expect(P).toContain(
      'dizer que um grupo tem "mais tarefas consolidadas" ou "mais tarefas em desenvolvimento" que o outro compara quantidades que não têm a mesma base',
    );
    expect(P).toContain('cria diferença artificial só pelo tamanho do grupo');
    // a redação antiga, que comparava por contagem bruta, não pode voltar
    expect(P).not.toContain('maior concentração de habilidades consolidadas num grupo, maior número de tarefas em desenvolvimento no outro');
    expect(P).not.toMatch(/maior número de tarefas/);
  });

  it('45c · quando o contraste entre grupos for o ponto central, o mapa prioriza Sílaba/Fonema fechadas — não a contagem do Perfil por Habilidade', () => {
    expect(P).toContain(
      'priorize as escalas fechadas Sílaba e Fonema: elas já chegam calculadas pelo servidor e são a base segura para esse contraste, não a contagem de tarefas do Perfil por Habilidade',
    );
  });

  it('45d · o mapa não expõe os denominadores 9/7 nem monta conta nova de percentual para o passo 3', () => {
    const inicio = GERADOR.indexOf('3. SILÁBICAS × FONÊMICAS');
    const fim = GERADOR.indexOf('\n4. CONTRASTES INTERNOS', inicio);
    const passo3 = GERADOR.slice(inicio, fim);
    // nove tarefas silábicas e sete fonêmicas são fato do controlador,
    // mas o passo do contraste entre grupos não deve entregá-los como
    // denominador para conta nova da IA — nem em dígito, nem em fração
    expect(passo3).not.toMatch(/\b9\b/);
    expect(passo3).not.toMatch(/\b7\b/);
    expect(passo3).not.toMatch(/\/\s*9\b/);
    expect(passo3).not.toMatch(/\/\s*7\b/);
    expect(passo3).not.toMatch(/percentual/i);
  });

  it('46 · C heterogêneo interno · destaca a tarefa destoante, sem generalizar', () => {
    const fonemicas = classificacoesFonemicas(CENARIOS.heterogeneoInterno);
    expect(fonemicas.filter((c) => c === CONSOLIDADA)).toHaveLength(6);
    expect(fonemicas.filter((c) => c === AINDA_NAO)).toHaveLength(1);
    const texto = derivadoParaTexto(CENARIOS.heterogeneoInterno)!;
    expect(texto).toContain('F7 — Transposição fonêmica: 2/4 · 50% · Ainda não consolidada');
    // o passo 4 existe exatamente para este padrão
    expect(P).toContain('CONTRASTES INTERNOS');
    expect(P).toContain('tarefa específica que destoe do restante do grupo dela');
    expect(P).toContain('Não a transforme em diagnóstico nem em causa');
  });

  it('47 · D nível equivalente diverge da hipótese · natureza diferente, não erro', () => {
    const texto = derivadoParaTexto(CENARIOS.nivelDivergente)!;
    expect(texto).toContain('Nível equivalente (escore sílaba): Alfabética');
    // o passo 5 e o mapa semântico cobrem exatamente essa divergência
    expect(P).toContain('5. NÍVEL EQUIVALENTE');
    expect(P).toContain('nunca trate divergência entre os dois como erro');
    expect(P).toContain('as duas informações têm natureza diferente');
    // e a REGRA_DERIVADOS, mais geral, já dizia o mesmo antes do mapa
    expect(P).toContain('não trate a diferença entre os dois como inconsistência');
  });

  it('48 · nenhum valor de cenário está no prompt de produção', () => {
    for (const [nome, cenario] of Object.entries(CENARIOS)) {
      for (const linha of derivadoParaTexto(cenario)!.split('\n')) {
        const limpa = linha.trim();
        if (limpa.includes(' · ')) {
          expect(P, `${nome} · ${limpa}`).not.toContain(limpa);
        }
      }
    }
  });
});
