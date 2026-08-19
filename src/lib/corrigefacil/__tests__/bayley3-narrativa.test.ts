// =====================================================================
// BAYLEY-III · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-6
//
// Sexto piloto da mesma arquitetura, e o instrumento mais estruturalmente
// rico coberto até aqui: cinco domínios, dois deles com dois componentes,
// um com múltiplas subescalas, e DUAS réguas normativas por domínio
// (escalonada e composta) em vez de uma. Reusa `instrumentCode` — mais
// um `const comBayley3` local, nenhuma mudança de assinatura.
//
// A AUDITORIA ANTES DE ESCREVER MUDOU O QUE O BLOCO PODE AFIRMAR.
// `data/bayley3.json`, no CorrigeFacil, é controlador de NORMA e não tem
// UMA STRING DE NOME: dezesseis códigos de subteste/subescala, quatro
// tabelas de conversão cobrindo cinco domínios, sete `composite_bands`,
// e nenhum nome descritivo em lugar nenhum do arquivo — só código. Os
// nomes dos CINCO DOMÍNIOS vêm de `graph-config.ts`
// (`DOM_Cognitivo`/`DOM_Linguagem`/`DOM_Motora`/`DOM_Socioemocional`/
// `DOM_Adaptativo`, "os cinco domínios do Bayley, na métrica composta"),
// já escalas reais e aprovadas no gráfico. Os nomes dos QUATRO
// COMPONENTES (CR/CE de Linguagem, MF/MG de Motora) não foram
// confirmados como string exata de banco — o bloco os trata por CÓDIGO,
// e a glosa entre parênteses ("receptivo"/"expressivo",
// "fino"/"grosso") é vocabulário psicométrico do instrumento, não
// citação de campo. Nenhum teste aqui afirma o contrário.
//
// DUAS CAMADAS, NÃO UMA — confirmado na própria tabela de conversão do
// controlador: subteste/subescala só tem escore ESCALONADO (nunca
// percentil, nunca classificação); só o COMPOSTO do domínio tem
// percentil, IC (quando publicado — Adaptativo nunca tem) e cai nas
// sete faixas de classificação. É estrutura, não estilo.
//
// AS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o mapa só existe com `instrumentCode === 'BAYLEY-III'`.
//      Com qualquer outro valor o prompt dos outros instrumentos é BYTE
//      A BYTE o que era, e o sha256 dos quatro destinos é o MESMO já
//      usado nos cinco pilotos anteriores.
//
//   2. camadas — escalonado (subteste) e composto (domínio) nunca se
//      misturam, nem no vocabulário nem em comparação numérica direta.
//
//   3. fronteira — sem resultado global, sem idade equivalente, sem
//      recálculo de idade/prematuridade, sem diagnóstico em nenhuma
//      direção — mesmo com todos os domínios abaixo ou acima da média.
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

const MARCA_PERFIL = 'COMO LER A BAYLEY-III — PERFIL INTERPRETATIVO:';

const P = prompt('BAYLEY-III');

// =====================================================================
// 1 · ESCOPO
// =====================================================================

describe('Bayley-III narrativa · escopo do perfil interpretativo', () => {
  it('1 · com instrumentCode="BAYLEY-III", os quatro destinos recebem o mapa', () => {
    for (const destino of DESTINOS) {
      expect(prompt('BAYLEY-III', destino), destino).toContain(MARCA_PERFIL);
    }
  });

  it('2 · sem instrumentCode (o padrão), nenhum destino recebe o mapa', () => {
    for (const destino of DESTINOS) {
      const p = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(p, destino).not.toContain(MARCA_PERFIL);
    }
  });

  it('3 · qualquer outro código não ativa o mapa da Bayley-III', () => {
    for (const codigo of [
      '', 'FDT', 'CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP-IV-18',
      'bayley-iii', 'BAYLEY', 'BAYLEY-II', 'BAYLEY-IV',
    ]) {
      expect(prompt(codigo), codigo || '(vazio)').not.toContain(MARCA_PERFIL);
    }
  });

  it('4 · nenhum dos cinco pilotos anteriores recebe o mapa da Bayley-III', () => {
    const soFdt = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, true);
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false, false);
    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true, false);
    const soBpa2 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'BPA-2');
    const soDass21 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'DASS-21');
    const soSnap18 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-18');
    const soSnap26 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false, false, 'SNAP-IV-26');
    for (const p of [soFdt, soConfias, soPhq9, soBpa2, soDass21, soSnap18, soSnap26]) {
      expect(p).not.toContain(MARCA_PERFIL);
      expect(p).not.toContain('BAYLEY');
    }
  });

  it('5 · a Bayley-III sozinha não menciona os outros seis pilotos', () => {
    for (const alheio of ['CONFIAS', 'PHQ-9', 'BPA-2', 'DASS-21', 'SNAP', 'SCARED']) {
      expect(P, alheio).not.toContain(alheio);
    }
    expect(P).not.toContain('DADOS DERIVADOS CONGELADOS');
    expect(P).not.toMatch(/\bFDT\b/);
  });

  it('6 · não existe REGRA_BAYLEY3: nenhuma das duas camadas é snapshot', () => {
    expect(GERADOR).not.toMatch(/const REGRA_BAYLEY-?3/);
    expect(GERADOR).not.toContain('REGRA_BAYLEY3 :');
    expect(GERADOR).not.toContain('REGRA_BAYLEY3 +');
  });

  it('7 · reusa `instrumentCode`: nenhum comBayley3 na assinatura', () => {
    expect(GERADOR).not.toMatch(/comBayley3\s*=\s*false,/);
    expect(GERADOR).toContain(
      'const comBayley3 = instrumentCode === CODIGO_BAYLEY3;',
    );
    expect(GERADOR).toContain(
      "${comBayley3 ? PERFIL_INTERPRETATIVO_BAYLEY3 : ''}",
    );
    expect(GERADOR.match(/instrumentCode = ''/g)).toHaveLength(1);
  });

  it('8 · é um const, como BPA-2 e DASS-21 — a Bayley-III não é família', () => {
    expect(GERADOR).toContain('const PERFIL_INTERPRETATIVO_BAYLEY3 = `');
    expect(GERADOR).not.toContain('function perfilInterpretativoBayley');
  });

  it('9 · a chamada real já alimenta a Bayley-III: nenhuma mudança nova no call site', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('instrument.code,');
    expect((chamada.match(/instrument\.code/g) ?? []).length).toBe(1);
  });

  it('10 · o mapa não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt('BAYLEY-III', destino).match(/^## /gm) ?? []).length, destino)
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

describe('Bayley-III narrativa · o prompt dos outros instrumentos não mudou', () => {
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
// 3 · CAMADAS DIFERENTES — escalonado × composto
// =====================================================================

describe('Bayley-III narrativa · duas réguas, nunca uma vira a outra', () => {
  it('13 · escalonado é do subteste, composto é do domínio, e só o composto classifica', () => {
    expect(P).toContain('CAMADAS DIFERENTES, NUNCA UMA VIRA A OUTRA');
    expect(P).toContain(
      'ESCORE ESCALONADO é o resultado normativo de CADA SUBTESTE OU SUBESCALA',
    );
    expect(P).toContain('Ele NÃO vem com classificação nem com percentil');
    expect(P).toContain(
      'ESCORE COMPOSTO é o resultado normativo de CADA DOMÍNIO',
    );
    expect(P).toContain('É neste nível que existe CLASSIFICAÇÃO — não no subteste');
  });

  it('14 · proíbe converter, somar ou estimar entre as duas réguas', () => {
    expect(P).toContain('NÃO converta um escalonado em composto');
    expect(P).toContain('não some escalonados para reconstruir um composto');
    expect(P).toContain('não estime percentil, IC ou classificação para um subteste');
    expect(P).toContain('ele não tem essas três coisas');
  });

  it('15 · proíbe a comparação numérica direta entre as duas réguas', () => {
    expect(P).toContain(
      'NÃO compare o número de um subteste com o número de um composto como se fossem a mesma régua',
    );
    expect(P).toContain('"o subteste está abaixo do composto" mistura duas escalas diferentes');
  });

  it('16 · o IC é tratado como intervalo pronto, não matéria-prima de nova classificação', () => {
    expect(P).toContain('Não recalcule, não use o limite inferior nem o superior para criar uma segunda classificação');
    expect(P).toContain('não escolha "a classificação mais provável" dentro do intervalo');
  });

  it('17 · formatClosedResults entrega classificação só onde ela existir (composto)', () => {
    const composto = {
      raw: 12, score: 105, percentile: '63', z_score: null,
      classification: 'Média', ci95: '97-113', available: true,
      message: null, flags: [],
      scales: { code: 'DOM_Cognitivo', name: 'Cognitivo', ordinal: 0 },
    };
    const subteste = {
      raw: 34, score: 11, percentile: null, z_score: null,
      classification: null, ci95: null, available: true,
      message: null, flags: [],
      scales: { code: 'Cog', name: 'Cognitivo (subteste)', ordinal: 1 },
    };
    const texto = formatClosedResults([composto, subteste], 'BAYLEY-III');
    expect(texto).toContain('- percentil: 63');
    expect(texto).toContain('- classificação: Média');
    expect(texto).toContain('- IC95: 97-113');
    // o subteste não carrega nenhuma das três
    const blocoSubteste = texto.slice(texto.indexOf('Cognitivo (subteste)'));
    expect(blocoSubteste).not.toContain('- percentil:');
    expect(blocoSubteste).not.toContain('- classificação:');
    expect(blocoSubteste).not.toContain('- IC95:');
  });
});

// =====================================================================
// 4 · OS CINCO DOMÍNIOS
// =====================================================================

describe('Bayley-III narrativa · os cinco domínios', () => {
  it('18 · Cognitivo não vira QI nem deficiência intelectual', () => {
    expect(P).toContain('Cognitivo é composto por um subteste só');
    expect(P).toContain('Não o transforme em inteligência global, QI, deficiência intelectual');
    expect(P).toContain('capacidade intelectual geral nem prognóstico cognitivo');
  });

  it('19 · Linguagem integra CR e CE, comparáveis sem virar transtorno', () => {
    expect(P).toContain('Linguagem integra dois componentes, receptivo (CR) e expressivo (CE)');
    expect(P).toContain('é permitido comparar: distribuição semelhante, diferença entre os componentes');
    expect(P).toContain('NÃO conclua transtorno de linguagem, atraso de linguagem');
  });

  it('20 · Motora integra MF e MG, comparáveis sem virar atraso diagnosticado', () => {
    expect(P).toContain('Motora integra dois componentes, fino (MF) e grosso (MG)');
    expect(P).toContain('sem virar atraso motor diagnosticado, alteração neurológica');
    expect(P).toContain('nas tarefas/subtestes avaliados');
  });

  it('21 · Socioemocional não vira TEA nem vínculo', () => {
    expect(P).toContain('Socioemocional é composto por uma medida só');
    expect(P).toContain('não infira transtorno emocional, TEA, vínculo, regulação emocional global');
  });

  it('22 · Adaptativo pode ser heterogêneo sem virar incapacidade funcional', () => {
    expect(P).toContain('Adaptativo pode integrar múltiplas subescalas');
    expect(P).toContain('homogeneidade, heterogeneidade, subescala destoante ou agrupamento realmente visível');
    expect(P).toContain('não vira incapacidade funcional, dependência nem prejuízo adaptativo clínico');
  });

  it('23 · o mapa se declara vocabulário, não característica da criança', () => {
    const ocorrencias = P.split(
      'vocabulário do instrumento, não característica da criança',
    ).length - 1;
    expect(ocorrencias).toBe(2); // uma para camadas, uma para domínios
  });
});

// =====================================================================
// 5 · SEM RESULTADO GLOBAL
// =====================================================================

describe('Bayley-III narrativa · não existe resultado global', () => {
  it('24 · os cinco domínios são declarados compostos independentes', () => {
    expect(P).toContain('A BAYLEY-III NÃO TEM RESULTADO GLOBAL');
    expect(P).toContain('Os cinco domínios são compostos INDEPENDENTES');
    expect(P).toContain('não existe soma, média nem composto único dos cinco');
  });

  it('25 · proíbe as seis formulações que sugerem medida composta única', () => {
    for (const proibida of [
      '"escore global Bayley"',
      '"resultado global Bayley"',
      '"desenvolvimento global de X"',
      '"classificação global"',
      '"pontuação total"',
      '"índice geral"',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
    expect(P).toContain(
      'a regra é SEMÂNTICA: qualquer formulação que leve o leitor a esperar um número único da Bayley-III tem o mesmo defeito',
    );
  });

  it('26 · oferece as quatro alternativas semânticas', () => {
    for (const alternativa of [
      'o conjunto dos resultados',
      'o perfil entre os domínios',
      'a configuração observada',
      'a distribuição dos resultados',
    ]) {
      expect(P, alternativa).toContain(alternativa);
    }
  });
});

// =====================================================================
// 6 · SEM IDADE EQUIVALENTE
// =====================================================================

describe('Bayley-III narrativa · não existe idade de desenvolvimento', () => {
  it('27 · proíbe as cinco conversões em idade', () => {
    expect(P).toContain('A BAYLEY-III NÃO TEM IDADE EQUIVALENTE NESTA IMPLEMENTAÇÃO');
    expect(P).toContain('idade de desenvolvimento');
    expect(P).toContain('idade equivalente');
    expect(P).toContain('idade mental');
    expect(P).toContain('"funciona como uma criança de X meses"');
    expect(P).toContain('"está X meses atrasado"');
    expect(P).toContain('"tem atraso de X meses"');
  });

  it('28 · a exceção é só um campo explícito que o sistema não envia hoje', () => {
    expect(P).toContain(
      'a menos que um campo explícito com esse significado tenha sido entregue pelo sistema',
    );
    expect(P).toContain('Nenhum destes é derivável do que este bloco descreve');
  });
});

// =====================================================================
// 7 · IDADE E PREMATURIDADE
// =====================================================================

describe('Bayley-III narrativa · idade e prematuridade já foram resolvidas', () => {
  it('29 · idade corrigida pode ser mencionada como fato, nunca recalculada', () => {
    expect(P).toContain('IDADE E PREMATURIDADE JÁ FORAM RESOLVIDAS PELO SISTEMA');
    expect(P).toContain('já chega identificada como tal');
    expect(P).toContain('isso é dado factual do protocolo, e pode ser mencionado como tal');
  });

  it('30 · proíbe calcular, decidir correção, aplicar fórmula ou revisar faixa', () => {
    expect(P).toContain('NÃO calcule idade corrigida');
    expect(P).toContain('não decida se a prematuridade deveria ser corrigida');
    expect(P).toContain('não aplique semanas × dias');
    expect(P).toContain('não escolha nem revise faixa etária');
    expect(P).toContain('a seleção normativa é do sistema, não sua');
  });

  it('31 · a marcação "(idade corrigida)" já é infraestrutura genérica existente', () => {
    // não é algo que este bloco cria: format-age.ts já anexa o sufixo
    // para QUALQUER instrumento quando subject_meta sinaliza correção
    const formatAge = leia('src', 'lib', 'report', 'format-age.ts');
    expect(formatAge).toContain('idade corrigida');
    expect(formatAge).toContain('corrected');
  });
});

// =====================================================================
// 8 · OS SEIS PASSOS DE RACIOCÍNIO
// =====================================================================

describe('Bayley-III narrativa · os seis passos', () => {
  it('32 · mapear, distribuição, contrastes entre domínios, internos, subteste×composto, mensagem', () => {
    for (const passo of [
      '1. MAPEAR O QUE EXISTE',
      '2. DISTRIBUIÇÃO ENTRE DOMÍNIOS',
      '3. CONTRASTES ENTRE DOMÍNIOS',
      '4. CONTRASTES INTERNOS',
      '5. SUBTESTE × COMPOSTO',
      '6. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    const posicoes = [
      P.indexOf('1. MAPEAR O QUE EXISTE'),
      P.indexOf('2. DISTRIBUIÇÃO ENTRE DOMÍNIOS'),
      P.indexOf('3. CONTRASTES ENTRE DOMÍNIOS'),
      P.indexOf('4. CONTRASTES INTERNOS'),
      P.indexOf('5. SUBTESTE × COMPOSTO'),
      P.indexOf('6. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('33 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('34 · o passo 1 proíbe completar medida ausente', () => {
    expect(P).toContain('Não complete medida ausente');
  });

  it('35 · o passo 5 proíbe contar a mesma informação duas vezes', () => {
    expect(P).toContain('não interprete o composto como uma tarefa nova');
    expect(P).toContain('não conte a mesma informação duas vezes');
  });
});

// =====================================================================
// 9 · AS CINCO SEÇÕES
// =====================================================================

describe('Bayley-III narrativa · o que muda em cada seção', () => {
  it('36 · a síntese responde configuração e encurta no homogêneo', () => {
    expect(P).toContain('qual é a configuração principal desta Bayley-III?');
    expect(P).toContain('não percorra os cinco domínios e os subtestes como tabela em prosa');
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
  });

  it('37 · a análise diferencia subteste de composto o tempo todo', () => {
    expect(P).toContain('e diferencie subteste de composto o tempo todo');
    expect(P).toContain('NÃO explique causa, não diagnostique atraso, não infira TEA');
    expect(P).toContain('não crie idade equivalente');
  });

  it('38 · o contexto permite integração, proíbe prescrição automática', () => {
    expect(P).toContain('é permitido orientar integração com observação, história do desenvolvimento');
    expect(P).toContain('NÃO prescreva terapia, estimulação, intervenção, encaminhamento ou frequência terapêutica');
  });

  it('39 · as recomendações passam pelo teste da causa e não têm piso', () => {
    expect(P).toContain('ele existe POR CAUSA desta configuração da Bayley-III?');
    expect(P).toContain('Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra');
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
    expect(P).toContain('Não fabrique intervenção');
  });

  it('40 · as considerações finais não criam nível global nem idade de desenvolvimento', () => {
    expect(P).toContain('não crie um "nível global"');
    expect(P).toContain('não crie idade de desenvolvimento');
    expect(P).toContain('não escreva um segundo aviso');
  });
});

// =====================================================================
// 10 · TRAVAS DIAGNÓSTICAS — nas duas direções
// =====================================================================

describe('Bayley-III narrativa · nenhuma direção autoriza diagnóstico', () => {
  it('41 · resultados inferiores não autorizam as nove conclusões', () => {
    expect(P).toContain('RESULTADOS INFERIORES NÃO AUTORIZAM, mesmo com todos os domínios abaixo da média');
    for (const proibida of [
      'atraso global do desenvolvimento', 'atraso do desenvolvimento',
      'deficiência intelectual', 'TEA', 'transtorno de linguagem',
      'transtorno motor', 'transtorno do neurodesenvolvimento',
      'incapacidade adaptativa',
    ]) {
      expect(P, proibida).toContain(proibida);
    }
  });

  it('42 · resultados superiores não autorizam as três conclusões', () => {
    expect(P).toContain('RESULTADOS SUPERIORES NÃO AUTORIZAM, mesmo com todos os domínios acima da média');
    expect(P).toContain('desenvolvimento avançado global');
    expect(P).toContain('superdotação');
    expect(P).toContain('altas habilidades');
    expect(P).toContain('sem fonte específica adicional');
  });

  it('43 · a classificação é do instrumento, não diagnóstico em nenhuma direção', () => {
    expect(P).toContain('A classificação da Bayley-III é resultado do instrumento — não é diagnóstico, em nenhuma direção');
  });

  it('44 · manda ancorar no protocolo, não na criança', () => {
    for (const ancora of ['na Bayley-III', 'neste protocolo', 'neste domínio']) {
      expect(P, ancora).toContain(ancora);
    }
  });
});

// =====================================================================
// 11 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('Bayley-III narrativa · a origem comercial não entra no conteúdo', () => {
  it('45 · o mapa novo não conhece billing', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_BAYLEY3');
    expect(inicio).toBeGreaterThan(-1);
    const fim = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const bloco = GERADOR.slice(inicio, fim);
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 12 · ESCOPO — nada fora do prompt mudou
// =====================================================================

describe('Bayley-III narrativa · nada fora do prompt mudou', () => {
  it('46 · os cinco pilotos anteriores continuam intocados', () => {
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
  });

  it('47 · nenhum módulo derivado dos outros pilotos ganhou Bayley', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'confias-derivado.ts'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('BAYLEY');
    }
  });

  it('48 · nenhum módulo novo de cálculo nasceu no psico2', () => {
    const candidatos = [
      ['src', 'lib', 'corrigefacil', 'bayley3-derivado.ts'],
      ['src', 'lib', 'corrigefacil', 'bayley-derivado.ts'],
    ];
    for (const caminho of candidatos) {
      expect(() => leia(...caminho)).toThrow();
    }
  });

  it('49 · graph-config e o normativo do controlador não foram tocados', () => {
    const graphConfig = leia('src', 'app', 'app', 'corrigefacil', 'graphs', 'graph-config.ts');
    expect(graphConfig).toContain('DOM_Cognitivo');
    expect(graphConfig).toContain('DOM_Linguagem');
    expect(graphConfig).toContain('DOM_Motora');
    expect(graphConfig).toContain('DOM_Socioemocional');
    expect(graphConfig).toContain('DOM_Adaptativo');
    // e o gerador não duplica essa lógica de gráfico
    expect(GERADOR).not.toContain('domain_profile');
  });
});

// =====================================================================
// 13 · OS NOVE CENÁRIOS PEDIDOS
//
// Fixtures CONCEITUAIS via `formatClosedResults`, o mesmo caminho real
// que os resultados da Bayley-III usam (não há bloco derivado). Nenhum
// destes valores está no prompt de produção: o teste 58 prova isso linha
// a linha.
// =====================================================================

type LinhaComposto = {
  code: 'DOM_Cognitivo' | 'DOM_Linguagem' | 'DOM_Motora' | 'DOM_Socioemocional' | 'DOM_Adaptativo';
  name: string;
  composite: number;
  percentile: string;
  classification: string;
  ci95?: string;
};

type LinhaEscalonado = {
  code: 'Cog' | 'CR' | 'CE' | 'MF' | 'MG' | 'SE' | 'Com' | 'FA' | 'AD' | 'LZ' | 'Soc' | 'VC' | 'VD' | 'SS' | 'AC' | 'MO';
  name: string;
  scaled: number;
};

function composto(l: LinhaComposto, ordinal: number) {
  return {
    raw: null, score: l.composite, percentile: l.percentile, z_score: null,
    classification: l.classification, ci95: l.ci95 ?? null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

function escalonado(l: LinhaEscalonado, ordinal: number) {
  return {
    raw: null, score: l.scaled, percentile: null, z_score: null,
    classification: null, ci95: null, available: true,
    message: null, flags: [],
    scales: { code: l.code, name: l.name, ordinal },
  };
}

const DOMINIOS = {
  DOM_Cognitivo: 'Cognitivo',
  DOM_Linguagem: 'Linguagem',
  DOM_Motora: 'Motora',
  DOM_Socioemocional: 'Socioemocional',
  DOM_Adaptativo: 'Adaptativo',
};

describe('Bayley-III narrativa · os nove cenários', () => {
  it('50 · A · perfil homogêneo — cinco compostos na mesma região', () => {
    const dados = (Object.keys(DOMINIOS) as (keyof typeof DOMINIOS)[]).map((code, i) =>
      composto({ code, name: DOMINIOS[code], composite: 100, percentile: '50', classification: 'Média' }, i),
    );
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto.match(/classificação: Média/g)?.length).toBe(5);
    expect(P).toContain('Perfil homogêneo pede síntese CURTA');
    expect(P).toContain('A BAYLEY-III NÃO TEM RESULTADO GLOBAL');
  });

  it('51 · B · um domínio destoante — não vira atraso nem diagnóstico', () => {
    const dados = [
      composto({ code: 'DOM_Cognitivo', name: 'Cognitivo', composite: 100, percentile: '50', classification: 'Média' }, 0),
      composto({ code: 'DOM_Linguagem', name: 'Linguagem', composite: 98, percentile: '45', classification: 'Média' }, 1),
      composto({ code: 'DOM_Motora', name: 'Motora', composite: 75, percentile: '5', classification: 'Abaixo da média' }, 2),
      composto({ code: 'DOM_Socioemocional', name: 'Socioemocional', composite: 100, percentile: '50', classification: 'Média' }, 3),
      composto({ code: 'DOM_Adaptativo', name: 'Adaptativo', composite: 95, percentile: '37', classification: 'Média' }, 4),
    ];
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).toContain('classificação: Abaixo da média');
    expect(P).toContain('3. CONTRASTES ENTRE DOMÍNIOS');
    expect(P).toContain('existe domínio realmente destoante dos demais? Quando existir, pode ser nomeado. Não explique a causa');
    expect(P).toContain('atraso do desenvolvimento');
  });

  it('52 · C · Linguagem internamente contrastante (CR × CE)', () => {
    const dados = [
      escalonado({ code: 'CR', name: 'Comunicação Receptiva', scaled: 6 }, 0),
      escalonado({ code: 'CE', name: 'Comunicação Expressiva', scaled: 13 }, 1),
      composto({ code: 'DOM_Linguagem', name: 'Linguagem', composite: 100, percentile: '50', classification: 'Média' }, 2),
    ];
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).not.toContain('Comunicação Receptiva\n- classificação');
    expect(P).toContain('receptivo (CR) e expressivo (CE)');
    expect(P).toContain('diferença entre os componentes, um relativamente mais elevado ou mais baixo');
    expect(P).toContain('NÃO conclua transtorno de linguagem');
    // o composto não apaga a diferença: o passo 5 existe exatamente para isso
    expect(P).toContain('5. SUBTESTE × COMPOSTO');
    expect(P).toContain('Os componentes servem para mostrar a configuração INTERNA, não para duplicar o resultado do domínio');
  });

  it('53 · D · Motora internamente contrastante (MF × MG)', () => {
    const dados = [
      escalonado({ code: 'MF', name: 'Motor Fino', scaled: 14 }, 0),
      escalonado({ code: 'MG', name: 'Motor Grosso', scaled: 7 }, 1),
      composto({ code: 'DOM_Motora', name: 'Motora', composite: 100, percentile: '50', classification: 'Média' }, 2),
    ];
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).toContain('Motor Fino');
    expect(texto).toContain('Motor Grosso');
    expect(P).toContain('fino (MF) e grosso (MG)');
    expect(P).toContain('sem virar atraso motor diagnosticado, alteração neurológica, dificuldade funcional real ou etiologia motora');
  });

  it('54 · E · Adaptativo heterogêneo entre subescalas', () => {
    const dados = [
      escalonado({ code: 'Com', name: 'Comunicação (adaptativa)', scaled: 12 }, 0),
      escalonado({ code: 'MO', name: 'Motor (adaptativo)', scaled: 5 }, 1),
      composto({ code: 'DOM_Adaptativo', name: 'Adaptativo', composite: 88, percentile: '21', classification: 'Média baixa' }, 2),
    ];
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).toContain('classificação: Média baixa');
    expect(P).toContain('subescala destoante ou agrupamento realmente visível entre elas');
    expect(P).toContain('nunca um agrupamento que os dados não sustentem');
    expect(P).toContain('não vira incapacidade funcional, dependência nem prejuízo adaptativo clínico');
  });

  it('55 · F · idade/prematuridade — nenhum recálculo autorizado', () => {
    // fixture conceitual: resultados fechados normais; o que se testa é
    // que o prompt não instrui a IA a mexer em idade/faixa/prematuridade,
    // não que a fixture os contenha (isso é campo de subject_meta, fora
    // de formatClosedResults)
    const dados = [
      composto({ code: 'DOM_Cognitivo', name: 'Cognitivo', composite: 100, percentile: '50', classification: 'Média' }, 0),
    ];
    formatClosedResults(dados, 'BAYLEY-III'); // não deve lançar nem alterar nada
    expect(P).toContain('NÃO calcule idade corrigida');
    expect(P).toContain('não decida se a prematuridade deveria ser corrigida');
    expect(P).toContain('não aplique semanas × dias');
    expect(P).toContain('não escolha nem revise faixa etária');
  });

  it('56 · G · escalonado ≠ composto — réguas diferentes, não comparáveis cruas', () => {
    const dados = [
      escalonado({ code: 'Cog', name: 'Cognitivo (subteste)', scaled: 8 }, 0),
      composto({ code: 'DOM_Cognitivo', name: 'Cognitivo', composite: 95, percentile: '37', classification: 'Média' }, 1),
    ];
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).toContain('- escore: 8');
    expect(texto).toContain('- escore: 95');
    // o prompt proíbe explicitamente a comparação crua entre os dois "8" e "95"
    expect(P).toContain(
      'NÃO compare o número de um subteste com o número de um composto como se fossem a mesma régua',
    );
  });

  it('57 · H · sem idade equivalente, mesmo com domínio bem abaixo da média', () => {
    const dados = [
      composto({ code: 'DOM_Cognitivo', name: 'Cognitivo', composite: 70, percentile: '2', classification: 'Abaixo da média' }, 0),
    ];
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).toContain('classificação: Abaixo da média');
    for (const proibido of [
      'idade mental', 'idade de desenvolvimento', 'idade equivalente',
    ]) {
      expect(P, proibido).toContain(proibido); // nomeados para SEREM PROIBIDOS
    }
    expect(P).toContain('"tem atraso de X meses"');
  });

  it('58 · I · sem global inventado — nenhum "Total" nas linhas nem no prompt', () => {
    const dados = (Object.keys(DOMINIOS) as (keyof typeof DOMINIOS)[]).map((code, i) =>
      composto({ code, name: DOMINIOS[code], composite: 100 + i, percentile: '50', classification: 'Média' }, i),
    );
    const texto = formatClosedResults(dados, 'BAYLEY-III');
    expect(texto).not.toMatch(/total/i);
    expect(texto.split('\n\n')).toHaveLength(5); // cinco blocos, nenhum sexto "total"
    expect(P).toContain('"índice geral"');
    expect(P).toContain('"pontuação total"');
    // e nenhum bloco de resultado deste cenário está hardcoded no prompt
    // de produção, byte a byte
    const blocos = texto.split('\n\n').map((b) => b.replace(/\n/g, ' | '));
    for (const bloco of blocos) {
      expect(P, bloco).not.toContain(bloco);
    }
  });
});
