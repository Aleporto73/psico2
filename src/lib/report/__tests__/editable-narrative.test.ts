import { describe, expect, it } from 'vitest';
import { NOTA_LEGADA, NOTA_PROFISSIONAL } from '../ethical-disclaimer';
import {
  narrativaVazia,
  parseNarrativa,
  secoesEstruturadasVazias,
  separarNotaFinal,
  serializarNarrativa,
  TITULO_NOTA,
  TITULO_UNICO,
} from '../editable-narrative';

const CORPO_CINCO = `## Síntese dos resultados
O rastreamento resultou na classificação Probabilidade MODERADA de depressão.

## Análise e interpretação
Esse resultado indica necessidade de integração com outras informações.

## Considerações para o contexto
Integrar o resultado às observações já disponíveis.

## Recomendações e acompanhamento
- Integrar aos registros existentes.
- Preservar confidencialidade.

## Considerações finais
O resultado compõe o acompanhamento, sem encerrá-lo.`;

/** Relatório novo: cinco seções + nota profissional. */
const CINCO = `${CORPO_CINCO}\n\n${NOTA_PROFISSIONAL}`;

/** Relatório anterior a esta mudança: quatro seções + nota LEGADA. */
const QUATRO = `## Síntese dos resultados
Texto da síntese.

## Análise e interpretação
Texto da análise.

## Pontos de atenção
- Um ponto.

## Orientações
Texto das orientações.

${NOTA_LEGADA}`;

describe('a nota padrão', () => {
  // O documento é profissional e impresso; chamá-lo de rascunho o
  // desqualificava como entregável.
  it('não fala em rascunho, apoio operacional nem substituição', () => {
    const minuscula = NOTA_PROFISSIONAL.toLowerCase();
    expect(minuscula).not.toContain('rascunho');
    expect(minuscula).not.toContain('apoio operacional');
    expect(minuscula).not.toContain('não substitui');
    expect(minuscula).not.toContain('provisório');
  });

  it('mantém a prudência sem desqualificar o documento', () => {
    expect(NOTA_PROFISSIONAL).toContain('Nota de responsabilidade profissional');
    expect(NOTA_PROFISSIONAL).toContain('julgamento técnico do profissional responsável');
    expect(NOTA_PROFISSIONAL).toContain('normas técnicas aplicáveis');
  });
});

describe('separação da nota final', () => {
  it('reconhece a nota nova no fim do texto', () => {
    const { corpo, nota } = separarNotaFinal(`Narrativa.\n\n${NOTA_PROFISSIONAL}`);
    expect(corpo).toBe('Narrativa.');
    expect(nota).toBe(NOTA_PROFISSIONAL);
  });

  // Relatório antigo não pode ter a nota escondida nem protegida.
  it('reconhece a nota LEGADA de relatórios anteriores', () => {
    const { corpo, nota } = separarNotaFinal(`Narrativa.\n\n${NOTA_LEGADA}`);
    expect(corpo).toBe('Narrativa.');
    expect(nota).toBe(NOTA_LEGADA);
  });

  it('relatório sem nota devolve nota vazia — e isso é legítimo', () => {
    const { corpo, nota } = separarNotaFinal('Narrativa sem nota.');
    expect(corpo).toBe('Narrativa sem nota.');
    expect(nota).toBe('');
  });

  it('não corta o último parágrafo do profissional por engano', () => {
    const texto = 'Primeiro.\n\nÚltimo parágrafo escrito pelo profissional.';
    expect(separarNotaFinal(texto)).toEqual({ corpo: texto, nota: '' });
  });

  it('nota citada no MEIO do texto não é tratada como fechamento', () => {
    const texto = `Início.\n\n${NOTA_PROFISSIONAL}\n\nSegue o texto depois dela.`;
    expect(separarNotaFinal(texto).nota).toBe('');
  });
});

describe('parse — relatório novo (cinco seções)', () => {
  const { secoes, notaFinal } = parseNarrativa(CINCO);

  it('recupera as cinco seções, na ordem', () => {
    expect(secoes.map((s) => s.titulo)).toEqual([
      'Síntese dos resultados',
      'Análise e interpretação',
      'Considerações para o contexto',
      'Recomendações e acompanhamento',
      'Considerações finais',
    ]);
  });

  it('o conteúdo de cada seção vem sem o heading', () => {
    for (const s of secoes) expect(s.conteudo).not.toContain('## ');
    expect(secoes[3].conteudo).toContain('- Integrar aos registros existentes.');
  });

  // A nota agora é editável: ela aparece no campo próprio, não some.
  it('a nota vai para o campo dedicado, fora das seções', () => {
    expect(notaFinal).toBe(NOTA_PROFISSIONAL);
    for (const s of secoes) expect(s.conteudo).not.toContain(NOTA_PROFISSIONAL);
    expect(TITULO_NOTA).toContain('opcional');
  });
});

describe('parse — compatibilidade com relatórios antigos', () => {
  it('quatro seções continuam editáveis, com os títulos que existiam', () => {
    const { secoes } = parseNarrativa(QUATRO);
    expect(secoes.map((s) => s.titulo)).toEqual([
      'Síntese dos resultados',
      'Análise e interpretação',
      'Pontos de atenção',
      'Orientações',
    ]);
  });

  // O ponto do hotfix: o aviso antigo deixa de ser intocável.
  it('a nota LEGADA aparece no campo e pode ser alterada ou apagada', () => {
    const { notaFinal } = parseNarrativa(QUATRO);
    expect(notaFinal).toBe(NOTA_LEGADA);
    expect(notaFinal).toContain('rascunho de apoio operacional');
  });

  it('não converte a estrutura antiga nem reescreve a nota antiga', () => {
    const { secoes, notaFinal } = parseNarrativa(QUATRO);
    expect(secoes).toHaveLength(4);
    expect(secoes.map((s) => s.titulo)).not.toContain('Considerações finais');
    // oferecida COMO ESTÁ: migrar o texto sozinho reescreveria documento
    // que já circulou
    expect(notaFinal).not.toBe(NOTA_PROFISSIONAL);
  });

  it('relatório sem heading algum vira um campo único', () => {
    const { secoes } = parseNarrativa(`Texto corrido.\n\n${NOTA_LEGADA}`);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe('');
    expect(secoes[0].conteudo).toBe('Texto corrido.');
    expect(TITULO_UNICO).toBe('Texto do relatório');
  });

  it('texto antes do primeiro heading não é descartado', () => {
    const { secoes } = parseNarrativa(
      `Introdução solta.\n\n## Síntese dos resultados\nCorpo.`,
    );
    expect(secoes[0].titulo).toBe('');
    expect(secoes[0].conteudo).toBe('Introdução solta.');
  });

  it('### continua sendo conteúdo, não vira seção', () => {
    const { secoes } = parseNarrativa(`## Síntese dos resultados\n### Sub\nCorpo.`);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].conteudo).toContain('### Sub');
  });
});

describe('serialização', () => {
  it('devolve o Markdown com os mesmos headings e a nota ao final', () => {
    const { secoes, notaFinal } = parseNarrativa(CINCO);
    const texto = serializarNarrativa(secoes, notaFinal);
    expect((texto.match(/^## /gm) ?? []).length).toBe(5);
    expect(texto.endsWith(NOTA_PROFISSIONAL)).toBe(true);
  });

  // O coração do hotfix: nota apagada NÃO volta.
  it('nota apagada some do documento e nada a reintroduz', () => {
    const { secoes } = parseNarrativa(CINCO);
    const texto = serializarNarrativa(secoes, '');
    expect(texto).not.toContain(NOTA_PROFISSIONAL);
    expect(texto).not.toContain('Nota de responsabilidade');
    expect(texto.endsWith('O resultado compõe o acompanhamento, sem encerrá-lo.')).toBe(true);
  });

  it('nota em branco só com espaços conta como apagada', () => {
    const { secoes } = parseNarrativa(CINCO);
    expect(serializarNarrativa(secoes, '   \n  ')).not.toContain('Nota de responsabilidade');
  });

  it('nota reescrita pelo profissional é preservada como ele digitou', () => {
    const { secoes } = parseNarrativa(CINCO);
    const texto = serializarNarrativa(secoes, 'Documento emitido a pedido da família.');
    expect(texto.endsWith('Documento emitido a pedido da família.')).toBe(true);
    expect(texto).not.toContain(NOTA_PROFISSIONAL);
  });

  it('ida e volta preserva corpo e nota', () => {
    const { secoes, notaFinal } = parseNarrativa(CINCO);
    const texto = serializarNarrativa(secoes, notaFinal);
    const volta = parseNarrativa(texto);
    expect(serializarNarrativa(volta.secoes, volta.notaFinal)).toBe(texto);
  });

  it('campo único sai sem heading inventado', () => {
    expect(serializarNarrativa([{ titulo: '', conteudo: 'Só texto.' }])).toBe('Só texto.');
  });

  it('não renomeia, não acrescenta e não reordena', () => {
    const { secoes } = parseNarrativa(QUATRO);
    const texto = serializarNarrativa(secoes);
    const ordem = (texto.match(/^## (.+)$/gm) ?? []).map((l) => l.replace('## ', ''));
    expect(ordem).toEqual(secoes.map((s) => s.titulo));
  });
});

describe('seção estruturada vazia — heading travado não pode sumir', () => {
  it('cinco seções com uma vazia é inválido para salvar', () => {
    const { secoes } = parseNarrativa(CINCO);
    const alterado = secoes.map((s, i) => (i === 2 ? { ...s, conteudo: '' } : s));
    expect(secoesEstruturadasVazias(alterado)).toEqual([
      'Considerações para o contexto',
    ]);
  });

  it('quatro seções com uma vazia é inválido para salvar', () => {
    const { secoes } = parseNarrativa(QUATRO);
    const alterado = secoes.map((s, i) => (i === 3 ? { ...s, conteudo: '  ' } : s));
    expect(secoesEstruturadasVazias(alterado)).toEqual(['Orientações']);
  });

  it('edição válida não acusa nada e preserva TODOS os headings', () => {
    const { secoes, notaFinal } = parseNarrativa(CINCO);
    const revisado = secoes.map((s) => ({ ...s, conteudo: `${s.conteudo} Revisado.` }));
    expect(secoesEstruturadasVazias(revisado)).toEqual([]);
    expect((serializarNarrativa(revisado, notaFinal).match(/^## /gm) ?? []).length).toBe(5);
  });

  // A nota é opcional: apagá-la não pode barrar o salvamento.
  it('nota vazia NÃO entra na validação de seção obrigatória', () => {
    const { secoes } = parseNarrativa(CINCO);
    expect(secoesEstruturadasVazias(secoes)).toEqual([]);
    expect(narrativaVazia(secoes)).toBe(false);
    // e o texto final sem nota continua salvável
    expect(serializarNarrativa(secoes, '')).not.toBe('');
  });

  it('o fallback sem headings não é afetado', () => {
    expect(secoesEstruturadasVazias([{ titulo: '', conteudo: '' }])).toEqual([]);
    expect(narrativaVazia([{ titulo: '', conteudo: '' }])).toBe(true);
  });
});

describe('narrativa vazia', () => {
  it('a nota sozinha não faz um relatório', () => {
    expect(narrativaVazia([{ titulo: 'Síntese dos resultados', conteudo: '' }])).toBe(true);
    expect(narrativaVazia(parseNarrativa(CINCO).secoes)).toBe(false);
  });
});
