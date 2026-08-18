// =====================================================================
// FDT · A NARRATIVA DO RELATÓRIO PRÓ — Fase 2B-1
//
// A Fase 2A resolveu a APRESENTAÇÃO do FDT: quadros, gráficos, documento,
// impressão. Nada disso é assunto aqui, e nada disso muda: este arquivo
// vigia o PROMPT, e só o prompt.
//
// O QUE ESTAVA ERRADO. As travas do FDT são boas no que fazem — impedem
// recalcular, reclassificar, interpolar percentil, escolher faixa etária e
// virar diagnóstico. Mas elas só dizem o que o modelo NÃO pode fazer. Com
// dez medidas fechadas em duas dimensões e nenhuma orientação positiva, a
// narrativa saía segura e burocrática: repetia a tabela, escrevia "houve
// variação entre condições", enfileirava cautela e fechava com recomendação
// que serviria para qualquer instrumento.
//
// O QUE MUDOU. Um segundo bloco, PERFIL_INTERPRETATIVO_FDT, entra colado na
// REGRA_FDT e sob o MESMO sinalizador. Ele dá VOCABULÁRIO (o que cada
// condição representa) e ORDEM DE LEITURA (distribuição, agrupamentos,
// contrastes, tempo × erros, mensagem central). Não dá permissão nenhuma.
//
// AS DUAS TRAVAS QUE ESTE ARQUIVO GUARDA:
//
//   1. escopo — o par só existe com `comFdt` true. Com ele false o prompt
//      dos outros 20 instrumentos é BYTE A BYTE o que era, e há sha256 dos
//      quatro destinos provando isso, não promessa de comentário.
//
//   2. fronteira — o mapa novo não afrouxa nada. Tudo que era proibido
//      continua escrito e proibido, e as proibições que o mapa CRIA (causa
//      do contraste, traço global, trade-off) são conferidas uma a uma.
//
// Nenhum teste daqui chama a OpenAI.
// =====================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DerivadoFdt } from '@/lib/corrigefacil/api';
import { buildCorrigeFacilSystemPrompt } from '@/lib/corrigefacil/report-generator';
import {
  fdtParaTexto,
  MEDIDAS_ERRO,
  MEDIDAS_TEMPO,
} from '@/lib/corrigefacil/fdt-derivado';

function leia(...partes: string[]): string {
  return readFileSync(join(process.cwd(), ...partes), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

const GERADOR = leia('src', 'lib', 'corrigefacil', 'report-generator.ts');

const DESTINOS = ['family', 'school', 'technical', 'internal'] as const;
type Destino = (typeof DESTINOS)[number];

/** O prompt do FDT e o prompt de quem não é FDT. Os outros dois
 *  sinalizadores ficam em false de propósito: o que se mede aqui é o efeito
 *  do FDT sozinho. */
const prompt = (comFdt: boolean, destino: Destino = 'technical'): string =>
  buildCorrigeFacilSystemPrompt(destino, 'AVISO', false, false, comFdt);

const MARCA_PERFIL = 'COMO LER O FDT — PERFIL INTERPRETATIVO:';
const MARCA_REGRA = 'DADOS DERIVADOS CONGELADOS DO FDT:';

const P = prompt(true);

// =====================================================================
// 1 · ESCOPO — o par entra junto, e só com FDT
// =====================================================================

describe('FDT narrativa · escopo do perfil interpretativo', () => {
  it('1 · com FDT, os quatro destinos recebem regra e perfil', () => {
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

  it('2 · sem FDT, nenhum destino recebe o perfil', () => {
    for (const destino of DESTINOS) {
      expect(prompt(false, destino), destino).not.toContain(MARCA_PERFIL);
      expect(prompt(false, destino), destino).not.toContain(MARCA_REGRA);
    }
  });

  it('3 · CONFIAS e PHQ-9 sozinhos não recebem o perfil do FDT', () => {
    const soConfias = buildCorrigeFacilSystemPrompt(
      'technical', 'AVISO', true, false, false,
    );
    const soPhq9 = buildCorrigeFacilSystemPrompt(
      'technical', 'AVISO', false, true, false,
    );
    expect(soConfias).toContain('DADOS DERIVADOS CONGELADOS:');
    expect(soConfias).not.toContain(MARCA_PERFIL);
    expect(soPhq9).toContain('DADOS DERIVADOS CONGELADOS DO PHQ-9:');
    expect(soPhq9).not.toContain(MARCA_PERFIL);
  });

  it('4 · o par sai do MESMO sinalizador, não de dois', () => {
    // um dia alguém vai querer ligar o mapa sem a trava; a interpolação é
    // única justamente para isso não ter onde acontecer
    expect(GERADOR).toContain(
      "${comFdt ? REGRA_FDT + PERFIL_INTERPRETATIVO_FDT : ''}",
    );
  });

  it('5 · o perfil não cria seção nova: continuam cinco', () => {
    for (const destino of DESTINOS) {
      expect((prompt(true, destino).match(/^## /gm) ?? []).length, destino)
        .toBe(5);
    }
  });
});

// =====================================================================
// 2 · O PROMPT DOS OUTROS INSTRUMENTOS — sha256, não confiança
//
// "não alterei o prompt global" é exatamente o tipo de afirmação que se
// perde no PR seguinte. Os quatro sha são os do prompt sem derivado nenhum
// em 4efd5d0, e mudar qualquer regra global derruba este teste — que é o
// que deve acontecer, para a mudança ser deliberada e não colateral.
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

describe('FDT narrativa · o prompt dos outros instrumentos não mudou', () => {
  it('6 · os quatro destinos batem byte a byte com o baseline', () => {
    for (const destino of DESTINOS) {
      const sha = createHash('sha256')
        .update(prompt(false, destino), 'utf8')
        .digest('hex');
      expect(sha, destino).toBe(SHA_SEM_DERIVADO[destino]);
    }
  });

  it('7 · chamar sem os sinalizadores é o mesmo que chamá-los false', () => {
    for (const destino of DESTINOS) {
      expect(buildCorrigeFacilSystemPrompt(destino, 'AVISO'), destino).toBe(
        prompt(false, destino),
      );
    }
  });
});

// =====================================================================
// 3 · AS TRAVAS ANTIGAS — nenhuma saiu
// =====================================================================

describe('FDT narrativa · a REGRA_FDT continua inteira', () => {
  it('8 · classificação e faixa continuam fechadas', () => {
    expect(P).toContain('dados FECHADOS');
    expect(P).toContain(
      'reproduza os rótulos exatamente como vieram, sem sinônimo e sem gradação própria',
    );
    expect(P).toContain('não a deduza do z e não a recalcule');
  });

  it('9 · os oito "não" do cálculo continuam escritos', () => {
    for (const trava of [
      'Não recalcule Inibição nem Flexibilidade',
      'Não recalcule o z.',
      'Não reconstrua P95, P75, P50, P25 ou P5.',
      'Não selecione faixa etária.',
      'Não crie percentil interpolado',
      'nem estime posição percentílica a partir do z',
      'Não recalcule escores, percentis, z, IC95 ou classificações',
      'não reconstrua tabelas normativas',
    ]) {
      expect(P, trava).toContain(trava);
    }
  });

  it('10 · classificação não vira diagnóstico, e o mapa repete a trava', () => {
    expect(P).toContain('Classificação não é diagnóstico.');
    expect(P).toContain('conclusão sobre funcionamento executivo');
    // e o bloco novo não abre nenhuma porta: ele mesmo diz que não abre
    expect(P).toContain(
      'nada aqui autoriza recalcular, reclassificar, estimar posição, explicar causa ou concluir sobre a pessoa',
    );
  });
});

// =====================================================================
// 4 · O MAPA SEMÂNTICO — as seis entradas
// =====================================================================

describe('FDT narrativa · o mapa semântico', () => {
  it('11 · Leitura e Contagem são nomeadas como condições automáticas', () => {
    expect(P).toContain('Leitura e Contagem são as condições mais AUTOMÁTICAS');
    expect(P).toContain('velocidade de processamento simples');
    expect(P).toContain('componentes atencionais automáticos');
  });

  it('12 · Escolha é a condição de interferência e controle inibitório', () => {
    expect(P).toContain('Escolha é a condição que introduz INTERFERÊNCIA');
    expect(P).toContain('demanda de controle inibitório');
  });

  it('13 · Alternância é a condição de mudança entre regras', () => {
    expect(P).toContain('Alternância é a condição que introduz MUDANÇA ENTRE REGRAS');
    expect(P).toContain('flexibilidade cognitiva');
  });

  it('14 · Inibição e Flexibilidade são declaradas índices derivados', () => {
    expect(P).toContain(
      'Inibição e Flexibilidade são ÍNDICES DERIVADOS calculados pelo servidor',
    );
    expect(P).toContain('não tarefas cronometradas independentes');
    expect(P).toContain('custo relativo');
  });

  it('15 · os erros são segunda dimensão, lida em paralelo ao tempo', () => {
    expect(P).toContain('Os ERROS são a SEGUNDA dimensão');
    expect(P).toContain('lidos EM PARALELO ao tempo, nunca no lugar dele');
    // o que PODE ser dito sobre eles
    expect(P).toContain('convergência');
    expect(P).toContain('divergência');
    expect(P).toContain('distribuição diferente entre as condições');
  });

  it('16 · o mapa se declara vocabulário, não característica da pessoa', () => {
    expect(P).toContain(
      'O QUE CADA CONDIÇÃO REPRESENTA (vocabulário do instrumento, não característica do avaliado)',
    );
  });
});

// =====================================================================
// 5 · O RACIOCÍNIO EM CINCO PASSOS
// =====================================================================

describe('FDT narrativa · os cinco passos', () => {
  it('17 · distribuição, agrupamentos, contrastes, tempo × erros, mensagem', () => {
    for (const passo of [
      '1. DISTRIBUIÇÃO',
      '2. AGRUPAMENTOS',
      '3. CONTRASTES',
      '4. TEMPO E ERROS',
      '5. MENSAGEM CENTRAL',
    ]) {
      expect(P, passo).toContain(passo);
    }
    // e na ordem
    const posicoes = [
      P.indexOf('1. DISTRIBUIÇÃO'),
      P.indexOf('2. AGRUPAMENTOS'),
      P.indexOf('3. CONTRASTES'),
      P.indexOf('4. TEMPO E ERROS'),
      P.indexOf('5. MENSAGEM CENTRAL'),
    ];
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('18 · os três agrupamentos são nomeados pelas medidas reais', () => {
    expect(P).toContain('condições mais automáticas (Leitura e Contagem)');
    expect(P).toContain(
      'condições com maior demanda de controle (Escolha e Alternância)',
    );
    expect(P).toContain('índices derivados (Inibição e Flexibilidade)');
  });

  it('19 · agrupamento e contraste não podem ser forçados', () => {
    expect(P).toContain('NÃO force agrupamento que os resultados não sustentem');
    expect(P).toContain('procure contraste realmente visível');
    expect(P).toContain('Quando ele estiver nos dados');
  });

  it('20 · a lista é raciocínio interno e não vai ao papel', () => {
    expect(P).toContain(
      'NÃO imprima esta lista, não a numere no texto e não crie seção para ela',
    );
  });

  it('21 · a mensagem central organiza síntese e análise', () => {
    expect(P).toContain('escolha UMA leitura central do protocolo');
    expect(P).toContain('organize a Síntese e a Análise');
    expect(P).toContain('o que os dados realmente mostrarem');
  });
});

// =====================================================================
// 6 · AS CINCO SEÇÕES — cada uma ganhou função própria no FDT
// =====================================================================

describe('FDT narrativa · o que muda em cada seção', () => {
  it('22 · a síntese responde CONFIGURAÇÃO, não a tabela', () => {
    expect(P).toContain('qual é a configuração principal deste FDT?');
    expect(P).toContain('responda com CONFIGURAÇÃO, não com a tabela');
    // e a ordem do que ela responde: agrupamento, contraste, direção
    expect(P).toContain(
      'como as medidas se agrupam, onde está o contraste quando houver e em que direção as classificações se distribuem',
    );
    expect(P).toContain('sem percorrer as dez medidas uma a uma');
    // a trava global de não recitar a tabela continua de pé
    expect(P).toContain('Não repita a tabela linha por linha');
  });

  it('23 · a análise articula os três conjuntos e os erros', () => {
    expect(P).toContain('é a seção mais densa do FDT');
    expect(P).toContain('diga o que o padrão permite afirmar NO ÂMBITO DO FDT');
    expect(P).toContain('delimite o que não pode ser extrapolado');
    expect(P).toContain('Não reescreva a síntese');
  });

  it('24 · o contexto usa a mensagem central, sem inventar o que observar', () => {
    expect(P).toContain('use a mensagem central para explicar como INTEGRAR');
    expect(P).toContain('em lugar de acumular avisos abstratos');
    expect(P).toContain('evite resumir o resultado a um rótulo único');
    expect(P).toContain(
      'Continua proibido nomear o que o destinatário deve observar na pessoa',
    );
  });

  it('25 · TODA recomendação nasce da configuração real', () => {
    expect(P).toContain('ele existe POR CAUSA da configuração deste protocolo?');
    expect(P).toContain(
      'Se a mesma frase caberia em qualquer outro instrumento, ela não entra',
    );
    expect(P).toContain(
      'Não repita a mesma recomendação em sinônimos diferentes',
    );
    // as três fortes continuam disponíveis, e continuam condicionadas
    expect(P).toContain('sem reduzi-lo a uma medida única');
    expect(P).toContain(
      'considerar separadamente as condições automáticas, as controladas e os índices derivados',
    );
    expect(P).toContain(
      'confrontar a distribuição de tempo e erros com as outras fontes disponíveis',
    );
    expect(P).toContain('e só quando ele os sustentar');
  });

  it('26 · as considerações finais fecham a mensagem central', () => {
    expect(P).toContain('feche a MENSAGEM CENTRAL');
    expect(P).toContain(
      'Não resuma a tabela, não repita as recomendações e não escreva um segundo aviso',
    );
  });
});

// =====================================================================
// 7 · AS PROIBIÇÕES QUE O MAPA CRIA
//
// Dar vocabulário a um modelo de linguagem é dar-lhe também o caminho mais
// curto para usá-lo errado. Cada entrada do mapa vem com o seu "não".
// =====================================================================

describe('FDT narrativa · o que o mapa proíbe', () => {
  it('27 · proíbe explicar a CAUSA do contraste', () => {
    expect(P).toContain('é proibido explicar POR QUE o contraste apareceu');
    expect(P).toContain(
      'PROIBIDO chamá-lo de compensação, preservação, superação, estratégia ou mecanismo',
    );
    expect(P).toContain('não explique por que ficaram altas ou baixas');
    // a trava global de causalidade continua
    expect(P).toContain('atribuir causa');
  });

  it('28 · proíbe transformar desempenho em característica global', () => {
    expect(P).toContain(
      'DESEMPENHO NO TESTE NÃO É CARACTERÍSTICA DA PESSOA, e isso vale mesmo com classificação extrema',
    );
    for (const frase of [
      'possui excelente flexibilidade cognitiva',
      'apresenta déficit de processamento',
      'há prejuízo executivo',
      'possui dificuldade atencional',
      'o controle inibitório está preservado',
      'o desempenho indica TDAH',
      'o padrão sugere transtorno',
      'é cognitivamente flexível',
      'possui bom controle inibitório',
    ]) {
      expect(P, frase).toContain(frase);
    }
  });

  it('29 · proíbe "trade-off velocidade-precisão" e os vizinhos dele', () => {
    expect(P).toContain('É proibido EXPLICAR a discrepância');
    for (const termo of [
      'trade-off velocidade-precisão',
      'impulsividade',
      'desatenção',
      'priorizou velocidade',
      'perdeu precisão',
      'respondeu sem cuidado',
    ]) {
      expect(P, termo).toContain(termo);
    }
    expect(P).toContain('isso é causalidade inventada');
  });

  it('30 · proíbe inferir clínica, escola e transtorno a partir do FDT', () => {
    expect(P).toContain(
      'Não infira, a partir de nenhuma classificação do FDT, sintoma, funcionamento cotidiano, dificuldade escolar, rendimento, comportamento em sala de aula ou transtorno',
    );
    // e as leituras erradas das condições automáticas, uma a uma
    for (const erro of [
      'atenção prejudicada',
      'lentidão cognitiva',
      'problema de processamento',
      'dificuldade de leitura',
      'dificuldade matemática',
    ]) {
      expect(P, erro).toContain(erro);
    }
  });

  it('31 · manda ancorar a afirmação no protocolo', () => {
    for (const ancora of [
      'neste protocolo',
      'nesta avaliação',
      'no FDT',
      'nas condições avaliadas',
    ]) {
      expect(P, ancora).toContain(ancora);
    }
    expect(P).toContain('o índice derivado situou-se');
    expect(P).toContain('a configuração encontrada');
  });

  it('32 · separa resultado do FDT de observação do profissional', () => {
    expect(P).toContain('distinga o RESULTADO DO FDT do CONTEXTO INFORMADO');
    expect(P).toContain('segundo a observação registrada pelo profissional');
    expect(P).toContain('no contexto adicional informado');
    expect(P).toContain('nunca converta a observação em dado psicométrico');
  });

  it('33 · o pedido é raciocínio, não volume', () => {
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
    expect(P).toContain(
      'não alongue o texto, não percorra a tabela e não acrescente cautela nova',
    );
    // e o teto global continua onde estava
    expect(P).toContain('MAIS COMPLETO NÃO É MAIS LONGO');
    expect(P).toContain('Qualidade acima de tamanho');
  });
});

// =====================================================================
// 8 · NADA DA NORMA ENTROU NO MAPA
// =====================================================================

/** As nove faixas do FDT existem NO SERVIDOR. Estão aqui só para serem
 *  procuradas e não encontradas. */
const FAIXAS_DO_SERVIDOR = [
  '6-8', '9-10', '11-12', '13-15', '16-18', '19-34', '35-59', '60-75', '76-92',
];

describe('FDT narrativa · o mapa é semântico, não normativo', () => {
  it('34 · nenhum ponto empírico e nenhuma faixa etária no prompt', () => {
    // os nomes dos pontos aparecem UMA vez, e só para proibir reconstruí-los
    expect(P.split('P95').length - 1).toBe(1);
    for (const faixa of FAIXAS_DO_SERVIDOR) {
      expect(P, faixa).not.toContain(faixa);
    }
  });

  it('35 · o perfil não conhece rótulo de classificação do topo da régua', () => {
    // "Deficitário" e "Média inferior" já eram citados pela REGRA_FDT como
    // exemplos do que não vira diagnóstico. O resto da régua nunca entrou —
    // e não pode entrar, ou o mapa começa a sugerir o resultado.
    expect(P).not.toContain('Muito superior');
    expect(P).not.toContain('Média superior');
  });
});

// =====================================================================
// 9 · FREE DEMO E ASSINATURA — o mesmo prompt
// =====================================================================

describe('FDT narrativa · a origem comercial não entra no conteúdo', () => {
  it('36 · o construtor do prompt não conhece billing', () => {
    const inicio = GERADOR.indexOf(
      'export function buildCorrigeFacilSystemPrompt(',
    );
    const fim = GERADOR.indexOf('function formatDate');
    expect(inicio).toBeGreaterThan(-1);
    const funcao = GERADOR.slice(inicio, fim);
    expect(funcao).not.toMatch(/billing|free_demo|subscription/i);
  });

  it('37 · o mapa novo também não', () => {
    const inicio = GERADOR.indexOf('const PERFIL_INTERPRETATIVO_FDT');
    expect(inicio).toBeGreaterThan(-1);
    const bloco = GERADOR.slice(
      inicio,
      GERADOR.indexOf('export function buildCorrigeFacilSystemPrompt('),
    );
    expect(bloco).not.toMatch(/billing|free_demo|subscription/i);
  });

  it('38 · a chamada real passa os três sinalizadores, e nada mais', () => {
    const i = GERADOR.indexOf('content: buildCorrigeFacilSystemPrompt(\n');
    expect(i).toBeGreaterThan(-1);
    const chamada = GERADOR.slice(i, GERADOR.indexOf('),', i));
    expect(chamada).toContain('reportType,');
    expect(chamada).toContain('avisoFinal,');
    expect(chamada).toContain('derivado !== null,');
    expect(chamada).toContain('phq9 !== null,');
    expect(chamada).toContain('fdt !== null,');
    expect(chamada).not.toMatch(/billing|free_demo|subscription/i);
  });
});

// =====================================================================
// 10 · ESCOPO — a Fase 2A não foi tocada
// =====================================================================

describe('FDT narrativa · nada fora do prompt mudou', () => {
  it('39 · o mapa mora só no gerador', () => {
    for (const arquivo of [
      ['src', 'lib', 'corrigefacil', 'fdt-derivado.ts'],
      ['src', 'app', 'app', 'corrigefacil', 'FdtGraficos.tsx'],
      ['src', 'app', 'app', 'corrigefacil', 'FdtDerivado.tsx'],
      ['src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
        '[reportId]', 'RelatorioDocumentClient.tsx'],
      ['src', 'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
        '[reportId]', 'ReportGraphIsland.tsx'],
    ]) {
      const fonte = leia(...arquivo);
      expect(fonte, arquivo.join('/')).not.toContain('PERFIL_INTERPRETATIVO');
      expect(fonte, arquivo.join('/')).not.toContain(MARCA_PERFIL);
    }
  });

  it('40 · o gerador continua sem tocar em apresentação', () => {
    for (const nome of ['PerfilExecutivoFdt', 'ErrosPorTarefaFdt', 'blocosFdt']) {
      expect(GERADOR, nome).not.toContain(nome);
    }
  });

  it('41 · a transcrição do derivado não mudou de forma', () => {
    // `fdtParaTexto` é o que entrega o dado ao modelo. O mapa novo fala
    // SOBRE ele; se ele mudasse, o mapa passaria a descrever outra coisa.
    const texto = fdtParaTexto(CENARIOS.contrastante)!;
    expect(texto.startsWith('Desempenho · tempo\n')).toBe(true);
    expect(texto).toContain('\nErros\n');
    expect(texto).toContain('  Leitura: ');
  });
});

// =====================================================================
// 11 · OS QUATRO PERFIS QUE O PROMPT PRECISA SABER TRATAR
//
// Fixtures CONCEITUAIS: o que importa nelas é o padrão de classificação,
// não o número. A faixa percentílica fica de fora de propósito — ela é
// rótulo normativo, e o cenário aqui é sobre a configuração do perfil.
//
// Nenhum destes valores está no prompt de produção, e o teste 47 prova
// isso linha a linha.
// =====================================================================

function derivadoDe(
  tempo: Record<string, string>,
  erro: Record<string, string>,
): DerivadoFdt {
  const medidas: DerivadoFdt['medidas'] = {};
  let n = 20;
  for (const [code] of MEDIDAS_TEMPO) {
    if (tempo[code]) {
      medidas[code] = {
        bruto: (n += 3),
        faixa_percentilica: null,
        classificacao: tempo[code],
      };
    }
  }
  let e = 0;
  for (const [code] of MEDIDAS_ERRO) {
    if (erro[code]) {
      medidas[code] = {
        bruto: (e += 1),
        faixa_percentilica: null,
        classificacao: erro[code],
      };
    }
  }
  return { medidas, derivadas: { INIBICAO: true, FLEXIBILIDADE: true } };
}

const TODOS_OS_ERROS = (c: string) => ({
  E_LEITURA: c, E_CONTAGEM: c, E_ESCOLHA: c, E_ALTERNANCIA: c,
});

const CENARIOS = {
  /** A — automáticas baixas, controladas e derivadas altas */
  contrastante: derivadoDe(
    {
      T_LEITURA: 'Deficitário',
      T_CONTAGEM: 'Deficitário',
      T_ESCOLHA: 'Muito superior',
      T_ALTERNANCIA: 'Muito superior',
      INIBICAO: 'Muito superior',
      FLEXIBILIDADE: 'Muito superior',
    },
    TODOS_OS_ERROS('Média'),
  ),
  /** B — tudo em Média */
  homogeneo: derivadoDe(
    {
      T_LEITURA: 'Média',
      T_CONTAGEM: 'Média',
      T_ESCOLHA: 'Média',
      T_ALTERNANCIA: 'Média',
      INIBICAO: 'Média',
      FLEXIBILIDADE: 'Média',
    },
    TODOS_OS_ERROS('Média'),
  ),
  /** C — concentração nas faixas inferiores */
  baixo: derivadoDe(
    {
      T_LEITURA: 'Deficitário',
      T_CONTAGEM: 'Média inferior',
      T_ESCOLHA: 'Deficitário',
      T_ALTERNANCIA: 'Média inferior',
      INIBICAO: 'Média inferior',
      FLEXIBILIDADE: 'Deficitário',
    },
    TODOS_OS_ERROS('Média inferior'),
  ),
  /** D — tempo alto, erro baixo */
  divergente: derivadoDe(
    {
      T_LEITURA: 'Muito superior',
      T_CONTAGEM: 'Muito superior',
      T_ESCOLHA: 'Média superior',
      T_ALTERNANCIA: 'Muito superior',
      INIBICAO: 'Média superior',
      FLEXIBILIDADE: 'Muito superior',
    },
    TODOS_OS_ERROS('Deficitário'),
  ),
  /** O caso real de referência da Fase 2B */
  casoReal: derivadoDe(
    {
      T_LEITURA: 'Deficitário',
      T_CONTAGEM: 'Deficitário',
      T_ESCOLHA: 'Muito superior',
      T_ALTERNANCIA: 'Muito superior',
      INIBICAO: 'Muito superior',
      FLEXIBILIDADE: 'Muito superior',
    },
    {
      E_LEITURA: 'Deficitário',
      E_CONTAGEM: 'Média inferior',
      E_ESCOLHA: 'Média',
      E_ALTERNANCIA: 'Média',
    },
  ),
} as const;

/** As classificações que o bloco congelado entrega ao modelo, medida a
 *  medida. É o material bruto do raciocínio — e é o que prova que o
 *  cenário chega inteiro, sem depender do prompt. */
function classificacoes(d: DerivadoFdt): Record<string, string> {
  const fora: Record<string, string> = {};
  for (const [code, m] of Object.entries(d.medidas)) {
    if (m.classificacao) fora[code] = m.classificacao;
  }
  return fora;
}

describe('FDT narrativa · os quatro perfis e o caso real', () => {
  it('42 · A contrastante · o bloco entrega os dois polos, e o mapa nomeia', () => {
    const c = classificacoes(CENARIOS.contrastante);
    expect(c.T_LEITURA).toBe('Deficitário');
    expect(c.T_CONTAGEM).toBe('Deficitário');
    expect(c.INIBICAO).toBe('Muito superior');
    expect(c.FLEXIBILIDADE).toBe('Muito superior');
    // as dez medidas chegam ao modelo pelo bloco, não pelo prompt
    const texto = fdtParaTexto(CENARIOS.contrastante)!;
    expect(texto).toContain('Leitura: 23 · Deficitário');
    expect(texto).toContain('Inibição: 35 · Muito superior');

    // e o prompt autoriza NOMEAR o contraste
    expect(P).toContain('perfil contrastante');
    expect(P).toContain('distribuição heterogênea');
    expect(P).toContain('diferença marcada entre grupos de condições');
    // sem autorizar a explicação dele
    expect(P).toContain('Sem evidência adicional é PROIBIDO');
    expect(P).toContain('compensação, preservação, superação, estratégia ou mecanismo');
  });

  it('43 · B homogêneo · o prompt manda não inventar contraste', () => {
    const c = classificacoes(CENARIOS.homogeneo);
    expect(new Set(Object.values(c))).toEqual(new Set(['Média']));
    // "homogêneas" está entre as distribuições possíveis do passo 1
    expect(P).toContain('homogêneas, predominantemente baixas');
    // e o passo 2 barra o agrupamento forçado
    expect(P).toContain('NÃO force agrupamento que os resultados não sustentem');
    // a mensagem central aceita ser a homogeneidade
    expect(P).toContain('a homogeneidade do conjunto');
    // e o teto de extensão vale igual: perfil sem contraste pede texto curto
    expect(P).toContain('EXTENSÃO: proporcional à informação disponível');
  });

  it('44 · C predominantemente baixo · descreve no FDT, não converte', () => {
    const c = classificacoes(CENARIOS.baixo);
    expect(Object.values(c).every((v) =>
      v === 'Deficitário' || v === 'Média inferior',
    )).toBe(true);
    // o vocabulário para descrever a concentração existe
    expect(P).toContain('predominantemente baixas');
    expect(P).toContain('a concentração das classificações numa região da régua');
    // e a conversão em quadro clínico continua barrada nos dois blocos
    expect(P).toContain('Classificação não é diagnóstico.');
    expect(P).toContain('em transtorno, déficit confirmado, quadro clínico');
    expect(P).toContain('dificuldade escolar');
  });

  it('45 · D tempo e erros divergentes · descreve a estrutura, não o motivo', () => {
    const c = classificacoes(CENARIOS.divergente);
    expect(c.T_LEITURA).toBe('Muito superior');
    expect(c.E_LEITURA).toBe('Deficitário');
    // o passo 4 existe e pergunta exatamente isso
    expect(P).toContain('elas apontam na mesma direção?');
    expect(P).toContain('Há diferença de classificação entre tempo e erro?');
    expect(P).toContain('Em quais condições essa diferença ocorre?');
    expect(P).toContain('Descreva a ESTRUTURA e não atribua mecanismo');
    // e a explicação automática continua proibida
    expect(P).toContain('trade-off velocidade-precisão');
  });

  it('46 · caso real · o padrão chega inteiro nas duas dimensões', () => {
    const texto = fdtParaTexto(CENARIOS.casoReal)!;
    // tempo: automáticas embaixo, controladas e derivadas em cima
    expect(texto).toContain('Leitura: 23 · Deficitário');
    expect(texto).toContain('Contagem: 26 · Deficitário');
    expect(texto).toContain('Escolha: 29 · Muito superior');
    expect(texto).toContain('Alternância: 32 · Muito superior');
    expect(texto).toContain('Inibição: 35 · Muito superior');
    expect(texto).toContain('Flexibilidade: 38 · Muito superior');
    // erros: também não uniformes
    const erros = texto.slice(texto.indexOf('Erros\n'));
    expect(erros).toContain('Leitura: 1 · Deficitário');
    expect(erros).toContain('Contagem: 2 · Média inferior');
    expect(erros).toContain('Escolha: 3 · Média');
    expect(erros).toContain('Alternância: 4 · Média');
    // material suficiente para os cinco passos, sem nada a explicar
    expect(P).toContain('3. CONTRASTES');
    expect(P).toContain('4. TEMPO E ERROS');
    expect(P).toContain('é proibido explicar POR QUE o contraste apareceu');
  });

  it('47 · nenhum valor de cenário está no prompt de produção', () => {
    for (const [nome, cenario] of Object.entries(CENARIOS)) {
      for (const linha of fdtParaTexto(cenario)!.split('\n')) {
        const limpa = linha.trim();
        // as linhas de resultado (medida · classificação) nunca aparecem
        if (limpa.includes(' · ')) {
          expect(P, `${nome} · ${limpa}`).not.toContain(limpa);
        }
      }
    }
  });
});

// =====================================================================
// 12 · O POLIMENTO EDITORIAL — o que o primeiro FDT real ensinou
//
// O mapa funcionou: a narrativa encontrou o padrão certo. Ela escorregou
// em duas coisas que o prompt ainda não barrava, e as duas são de FORMA,
// não de segurança.
//
//   A SÍNTESE RECITAVA A FAIXA. Depois de nomear a configuração, o texto
//   repetia as faixas percentílicas medida a medida — e elas estão
//   impressas logo acima, na tabela do documento. Encontrar o padrão e
//   em seguida transcrevê-lo é a tabela em prosa.
//
//   AS RECOMENDAÇÕES CHEGAVAM A QUATRO porque quatro parecia ser o
//   número. A última era sempre verdadeira e sempre genérica: comunicar
//   com cuidado, guardar com confidencialidade — frases que caberiam em
//   qualquer instrumento do catálogo, e que por isso não são
//   recomendações DESTE protocolo.
//
// O dado não mudou de lugar: a faixa continua chegando inteira ao modelo
// pelo bloco congelado, e continua FECHADA quando ele a reproduz. O que
// mudou é o critério de QUANDO reproduzi-la.
// =====================================================================

/** Um cenário com as faixas que o servidor realmente manda.
 *
 *  Os quatro cenários do bloco 11 usam faixa null porque lá o assunto é o
 *  padrão de classificação. Aqui o assunto é a FAIXA, então ela existe —
 *  e é ela que prova que o modelo continua recebendo o dado que o prompt
 *  o desobriga de recitar. */
const COM_FAIXA: DerivadoFdt = {
  medidas: {
    T_LEITURA: {
      bruto: 45,
      faixa_percentilica: '< P5',
      classificacao: 'Deficitário',
    },
    T_ESCOLHA: {
      bruto: 22,
      faixa_percentilica: '> P95',
      classificacao: 'Muito superior',
    },
    E_LEITURA: {
      bruto: 2,
      faixa_percentilica: 'P5 a P25',
      classificacao: 'Média inferior',
    },
  },
  derivadas: { INIBICAO: false, FLEXIBILIDADE: false },
};

describe('FDT narrativa · síntese de padrão, não recitação de percentil', () => {
  it('48 · a faixa percentílica CHEGA ao modelo, inteira', () => {
    const texto = fdtParaTexto(COM_FAIXA)!;
    expect(texto).toContain('Leitura: 45 · < P5 · Deficitário');
    expect(texto).toContain('Escolha: 22 · > P95 · Muito superior');
    expect(texto).toContain('Leitura: 2 · P5 a P25 · Média inferior');
    // e o que não foi calculado continua legível como ausência
    expect(texto).toContain(
      'Não calculadas por falta de componente: Inibição, Flexibilidade',
    );
  });

  it('49 · mas não existe obrigação de reproduzi-la na narrativa', () => {
    expect(P).toContain(
      'A FAIXA PERCENTÍLICA ESTÁ DISPONÍVEL, MAS NÃO É OBRIGATÓRIA NO TEXTO',
    );
    expect(P).toContain('o documento já a imprime ao lado de cada medida');
    expect(P).toContain('enfileirá-la na narrativa é escrever a tabela em prosa');
    // a desobrigação não é permissão para deformar: quando entrar, entra
    // como veio — e a REGRA_FDT continua chamando o rótulo de fechado
    expect(P).toContain(
      'Cite faixa ou classificação exata SÓ onde ela sustentar uma distinção que a prosa não faria sozinha',
    );
    expect(P).toContain('e aí reproduza o rótulo como veio');
    expect(P).toContain('dados FECHADOS');
  });

  it('50 · nenhuma faixa do cenário virou texto obrigatório do prompt', () => {
    // o prompt não conhece rótulo de faixa: quem os traz é o bloco
    for (const faixa of ['< P5', '> P95', 'P5 a P25', 'P75 a P95']) {
      expect(P, faixa).not.toContain(faixa);
    }
  });
});

describe('FDT narrativa · recomendação sem quantidade artificial', () => {
  it('51 · não existe alvo numérico de itens', () => {
    expect(P).toContain('NÃO EXISTE QUANTIDADE MÍNIMA');
    expect(P).toContain(
      'uma recomendação específica vale mais que três genéricas',
    );
    expect(P).toContain('três específicas não pedem uma quarta para completar');
    // o alvo antigo saiu, e não voltou por outro nome
    expect(P).not.toContain('Dois a quatro itens');
    expect(P).not.toMatch(/\b(dois|três|quatro|cinco)\s+itens\b/i);
    // e a regra global que diz a mesma coisa continua de pé
    expect(P).toContain('um item verdadeiro vale mais que três repetidos');
    expect(P).toContain('Não crie itens para encher');
  });

  it('52 · o item genérico é nomeado e barrado', () => {
    expect(P).toContain(
      'comunicar com cuidado, guardar com confidencialidade e integrar ao acompanhamento são verdades genéricas, não recomendações deste FDT',
    );
    expect(P).toContain(
      'Não escreva recomendação genérica desconectada do resultado',
    );
  });
});

describe('FDT narrativa · perfil homogêneo', () => {
  it('53 · homogêneo pode produzir texto curto, e isso é a resposta certa', () => {
    expect(P).toContain('Conjunto homogêneo pede síntese CURTA');
    expect(P).toContain('diga a homogeneidade e pare');
    // e o teto global continua dizendo o mesmo
    expect(P).toContain('EXTENSÃO: proporcional à informação disponível');
    expect(P).toContain('Seção obrigatória NÃO significa volume obrigatório');
    expect(P).toContain('O ganho pedido é de RACIOCÍNIO, não de tamanho');
  });

  it('54 · contraste não pode ser criado quando não está nos dados', () => {
    // no cenário B não existe contraste nenhum a encontrar
    const valores = new Set(
      Object.values(CENARIOS.homogeneo.medidas).map((m) => m.classificacao),
    );
    expect(valores.size).toBe(1);
    // e o prompt barra a construção nos três lugares em que ela caberia
    expect(P).toContain(
      'sem construir contraste, agrupamento ou hierarquia que as classificações recebidas não mostrem',
    );
    expect(P).toContain('NÃO force agrupamento que os resultados não sustentem');
    expect(P).toContain('procure contraste realmente visível');
    // e a trava global contra hierarquia inventada continua onde estava
    expect(P).toContain('sem criar hierarquia que os dados não sustentam');
  });
});
