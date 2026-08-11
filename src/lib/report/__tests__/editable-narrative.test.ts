import { describe, expect, it } from 'vitest';
import { AVISO_FINAL } from '../ethical-disclaimer';
import {
  narrativaVazia,
  parseNarrativa,
  removerAviso,
  secoesEstruturadasVazias,
  serializarNarrativa,
  TITULO_UNICO,
} from '../editable-narrative';

/** Relatório do Bloco 9A.2: cinco seções + aviso. */
const CINCO = `## Síntese dos resultados
O rastreamento resultou na classificação Probabilidade MODERADA de depressão.

## Análise e interpretação
Esse resultado indica necessidade de integração com outras informações.

## Considerações para o contexto
Integrar o resultado às observações já disponíveis.

## Recomendações e acompanhamento
- Integrar aos registros existentes.
- Preservar confidencialidade.

## Considerações finais
O resultado compõe o acompanhamento, sem encerrá-lo.

${AVISO_FINAL}`;

/** Relatório anterior ao 9A.2: quatro seções. */
const QUATRO = `## Síntese dos resultados
Texto da síntese.

## Análise e interpretação
Texto da análise.

## Pontos de atenção
- Um ponto.

## Orientações
Texto das orientações.

${AVISO_FINAL}`;

describe('remoção do aviso ético', () => {
  it('tira o aviso do fim do texto', () => {
    expect(removerAviso(`Narrativa.\n\n${AVISO_FINAL}`)).toBe('Narrativa.');
  });

  it('texto sem aviso passa intacto', () => {
    expect(removerAviso('Narrativa sem aviso.')).toBe('Narrativa sem aviso.');
  });

  it('não corta o último parágrafo por engano', () => {
    const texto = 'Primeiro.\n\nÚltimo parágrafo do profissional.';
    expect(removerAviso(texto)).toBe(texto);
  });
});

describe('parse — relatório do 9A.2 (cinco seções)', () => {
  const secoes = parseNarrativa(CINCO);

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
    expect(secoes[0].conteudo).toBe(
      'O rastreamento resultou na classificação Probabilidade MODERADA de depressão.',
    );
    expect(secoes[3].conteudo).toContain('- Integrar aos registros existentes.');
  });

  // O profissional não pode apagar nem reescrever a ressalva obrigatória.
  it('o aviso ético não chega a nenhum campo editável', () => {
    for (const s of secoes) expect(s.conteudo).not.toContain(AVISO_FINAL);
    expect(JSON.stringify(secoes)).not.toContain('rascunho de apoio operacional');
  });
});

describe('parse — compatibilidade com relatórios antigos', () => {
  it('quatro seções continuam editáveis, com os títulos que existiam', () => {
    const secoes = parseNarrativa(QUATRO);
    expect(secoes.map((s) => s.titulo)).toEqual([
      'Síntese dos resultados',
      'Análise e interpretação',
      'Pontos de atenção',
      'Orientações',
    ]);
  });

  // Editar não é regenerar: nada de promover um relatório de quatro seções
  // para a estrutura nova.
  it('não converte a estrutura antiga para a nova', () => {
    const secoes = parseNarrativa(QUATRO);
    expect(secoes.map((s) => s.titulo)).not.toContain('Considerações finais');
    expect(secoes).toHaveLength(4);
  });

  it('relatório sem heading algum vira um campo único', () => {
    const secoes = parseNarrativa(`Texto corrido, sem estrutura.\n\n${AVISO_FINAL}`);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].titulo).toBe('');
    expect(secoes[0].conteudo).toBe('Texto corrido, sem estrutura.');
    expect(TITULO_UNICO).toBe('Texto do relatório');
  });

  // Perder texto ao abrir o editor seria destruir trabalho em silêncio.
  it('texto antes do primeiro heading não é descartado', () => {
    const secoes = parseNarrativa(
      `Introdução solta.\n\n## Síntese dos resultados\nCorpo.`,
    );
    expect(secoes[0].titulo).toBe('');
    expect(secoes[0].conteudo).toBe('Introdução solta.');
    expect(secoes[1].titulo).toBe('Síntese dos resultados');
  });

  it('### continua sendo conteúdo, não vira seção', () => {
    const secoes = parseNarrativa(`## Síntese dos resultados\n### Subtítulo\nCorpo.`);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].conteudo).toContain('### Subtítulo');
  });
});

describe('serialização', () => {
  it('devolve o Markdown com os mesmos headings', () => {
    const texto = serializarNarrativa(parseNarrativa(CINCO));
    expect(texto).toContain('## Síntese dos resultados');
    expect(texto).toContain('## Considerações finais');
    expect((texto.match(/^## /gm) ?? []).length).toBe(5);
  });

  // Quem reanexa o aviso é a RPC, no banco.
  it('NUNCA inclui o aviso ético', () => {
    const texto = serializarNarrativa(parseNarrativa(CINCO));
    expect(texto).not.toContain(AVISO_FINAL);
    expect(texto).not.toContain('rascunho de apoio operacional');
  });

  it('ida e volta preserva o texto', () => {
    const texto = serializarNarrativa(parseNarrativa(CINCO));
    expect(serializarNarrativa(parseNarrativa(texto))).toBe(texto);
  });

  it('campo único sai sem heading inventado', () => {
    const texto = serializarNarrativa([{ titulo: '', conteudo: 'Só texto.' }]);
    expect(texto).toBe('Só texto.');
    expect(texto).not.toContain('##');
  });

  it('seção esvaziada some junto com o título', () => {
    const texto = serializarNarrativa([
      { titulo: 'Síntese dos resultados', conteudo: 'Fica.' },
      { titulo: 'Considerações finais', conteudo: '   ' },
    ]);
    expect(texto).toContain('## Síntese dos resultados');
    expect(texto).not.toContain('## Considerações finais');
  });

  it('não renomeia, não acrescenta e não reordena', () => {
    const secoes = parseNarrativa(QUATRO);
    const texto = serializarNarrativa(secoes);
    const ordem = (texto.match(/^## (.+)$/gm) ?? []).map((l) => l.replace('## ', ''));
    expect(ordem).toEqual(secoes.map((s) => s.titulo));
  });
});

describe('seção estruturada vazia — heading travado não pode sumir', () => {
  // Os títulos são travados na tela, mas esvaziar o campo abaixo de um deles
  // fazia a seção inteira desaparecer na serialização: um jeito indireto de
  // apagar um heading que a UI não deixa editar.
  it('cinco seções com uma vazia é inválido para salvar', () => {
    const secoes = parseNarrativa(CINCO).map((s, i) =>
      i === 2 ? { ...s, conteudo: '' } : s,
    );
    expect(secoesEstruturadasVazias(secoes)).toEqual([
      'Considerações para o contexto',
    ]);
  });

  it('quatro seções com uma vazia é inválido para salvar', () => {
    const secoes = parseNarrativa(QUATRO).map((s, i) =>
      i === 3 ? { ...s, conteudo: '   ' } : s,
    );
    expect(secoesEstruturadasVazias(secoes)).toEqual(['Orientações']);
  });

  it('aponta todas as seções faltantes, não só a primeira', () => {
    const secoes = parseNarrativa(CINCO).map((s, i) =>
      i === 0 || i === 4 ? { ...s, conteudo: '' } : s,
    );
    expect(secoesEstruturadasVazias(secoes)).toEqual([
      'Síntese dos resultados',
      'Considerações finais',
    ]);
  });

  it('edição válida não acusa nada e preserva TODOS os headings', () => {
    const secoes = parseNarrativa(CINCO).map((s) => ({
      ...s,
      conteudo: `${s.conteudo} Revisado pelo profissional.`,
    }));
    expect(secoesEstruturadasVazias(secoes)).toEqual([]);

    const texto = serializarNarrativa(secoes);
    expect((texto.match(/^## /gm) ?? []).length).toBe(5);
    expect(texto).toContain('## Considerações para o contexto');
    expect(texto).toContain('Revisado pelo profissional.');
  });

  // O campo único não tem heading a proteger; quem cuida dele é narrativaVazia.
  it('o fallback sem headings não é afetado', () => {
    const unico = parseNarrativa('Texto corrido, sem estrutura.');
    expect(secoesEstruturadasVazias(unico)).toEqual([]);
    expect(secoesEstruturadasVazias([{ titulo: '', conteudo: '' }])).toEqual([]);
    expect(narrativaVazia([{ titulo: '', conteudo: '' }])).toBe(true);
  });
});

describe('narrativa vazia', () => {
  it('detecta quando não sobrou nada para salvar', () => {
    expect(narrativaVazia([{ titulo: 'Síntese dos resultados', conteudo: '' }])).toBe(true);
    expect(narrativaVazia([{ titulo: '', conteudo: '   ' }])).toBe(true);
    expect(narrativaVazia(parseNarrativa(CINCO))).toBe(false);
  });
});
