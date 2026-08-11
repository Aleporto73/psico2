// =====================================================================
// NARRATIVA EDITÁVEL · quebrar o Markdown salvo em campos, e remontá-lo.
//
// O profissional revisa a REDAÇÃO, não o resultado. Por isso o editor não
// mostra um textarea gigante com "## Síntese dos resultados" solto no meio
// do texto: os títulos ficam travados e cada seção vira um campo próprio.
//
// Puro: sem React, sem rede, sem banco. É aqui que mora tudo o que precisa
// de teste.
//
// DUAS REGRAS QUE ATRAVESSAM O ARQUIVO
//
// 1. A NOTA FINAL É EDITÁVEL E OPCIONAL. Ela sai do corpo da narrativa para
//    um campo próprio, vem preenchida quando existe e pode ser reescrita ou
//    apagada. Nada a reanexa por conta própria — nem aqui, nem no banco.
//    Quem assina o documento é o profissional.
//
// 2. NADA DE CONVERTER RELATÓRIO ANTIGO. Um relatório com quatro seções
//    continua com quatro; um sem estrutura nenhuma vira um campo único; e a
//    nota antiga é oferecida COMO ESTÁ, sem reescrita automática. Editar não
//    é regenerar.
// =====================================================================

import { NOTAS_RECONHECIDAS } from './ethical-disclaimer';

/** Uma seção editável. `titulo` vazio = relatório sem estrutura
 *  reconhecível, e o campo é único. */
export type SecaoEditavel = {
  /** Texto do heading SEM o `## `. Fica travado na tela. */
  titulo: string;
  /** O que o profissional edita. */
  conteudo: string;
};

/** O relatório aberto no editor: corpo em seções + nota final separada. */
export type NarrativaEditavel = {
  secoes: SecaoEditavel[];
  /** Vazia quando o relatório não tem nota — estado legítimo. */
  notaFinal: string;
};

/** Rótulo do campo único quando não há heading algum. */
export const TITULO_UNICO = 'Texto do relatório';

/** Rótulo do campo da nota. */
export const TITULO_NOTA = 'Nota de responsabilidade profissional (opcional)';

/** Separa a nota final do corpo, reconhecendo as formas conhecidas.
 *
 *  Compara pelo texto exato das constantes — não por regex nem por "último
 *  parágrafo": o último parágrafo de um relatório já editado pode ser
 *  qualquer coisa, e cortá-lo às cegas apagaria conteúdo do profissional.
 *
 *  Nota não reconhecida — porque o profissional a reescreveu — fica no corpo
 *  e continua editável lá. Preferimos isso a adivinhar. */
export function separarNotaFinal(texto: string): {
  corpo: string;
  nota: string;
} {
  const limpo = (texto ?? '').trimEnd();

  for (const nota of NOTAS_RECONHECIDAS) {
    const i = limpo.lastIndexOf(nota);
    // só conta se estiver realmente no FIM: um texto que a cite no meio não
    // está fechando com ela
    if (i !== -1 && limpo.slice(i).trim() === nota) {
      return { corpo: limpo.slice(0, i).trimEnd(), nota };
    }
  }

  return { corpo: limpo, nota: '' };
}

/** Markdown salvo -> campos do editor.
 *
 *  Só `##` conta como divisor. `#` e `###` continuam sendo conteúdo: o
 *  contrato do prompt usa `##`, e promover outros níveis a seção quebraria
 *  relatórios que usam `###` como subtítulo interno. */
export function parseNarrativa(outputText: string): NarrativaEditavel {
  const { corpo, nota } = separarNotaFinal(outputText ?? '');
  const linhas = corpo.split('\n');

  const secoes: SecaoEditavel[] = [];
  let atual: SecaoEditavel | null = null;
  const preambulo: string[] = [];

  for (const linha of linhas) {
    const m = /^##\s+(.+?)\s*$/.exec(linha);
    if (m) {
      if (atual) secoes.push(atual);
      atual = { titulo: m[1], conteudo: '' };
      continue;
    }
    if (atual) {
      atual.conteudo += (atual.conteudo ? '\n' : '') + linha;
    } else {
      preambulo.push(linha);
    }
  }
  if (atual) secoes.push(atual);

  // Sem nenhum heading: campo único, com o texto inteiro.
  if (secoes.length === 0) {
    return { secoes: [{ titulo: '', conteudo: corpo.trim() }], notaFinal: nota };
  }

  for (const s of secoes) s.conteudo = s.conteudo.trim();

  // Texto ANTES do primeiro heading não pode ser descartado — é conteúdo do
  // relatório, e perdê-lo ao abrir o editor seria destruir dado do
  // profissional em silêncio. Ele volta como campo sem título, na frente.
  const antes = preambulo.join('\n').trim();
  if (antes) secoes.unshift({ titulo: '', conteudo: antes });

  return { secoes, notaFinal: nota };
}

/** Campos do editor -> Markdown.
 *
 *  Preserva os headings que existiam: não acrescenta, não renomeia, não
 *  reordena.
 *
 *  A NOTA entra só se o profissional a deixou preenchida. Nota apagada é
 *  decisão dele, não erro a corrigir: nada a reintroduz aqui, e nada a
 *  reintroduz no banco.
 *
 *  Seção estruturada sem conteúdo NÃO chega aqui pelo caminho de
 *  salvamento: `secoesEstruturadasVazias` barra antes. O descarte abaixo
 *  existe só para nunca emitir um título órfão sobre nada — não é
 *  autorização para apagar seção. Não trocar por `## Título\n` vazio: isso
 *  gravaria heading solto no documento. Quem impede a perda é o validador. */
export function serializarNarrativa(
  secoes: SecaoEditavel[],
  notaFinal = '',
): string {
  const corpo = secoes
    .map((s) => {
      const conteudo = s.conteudo.trim();
      if (!s.titulo) return conteudo;
      if (!conteudo) return '';
      return `## ${s.titulo}\n${conteudo}`;
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const nota = notaFinal.trim();
  if (!nota) return corpo;
  return corpo ? `${corpo}\n\n${nota}` : nota;
}

/** Há algo a salvar no CORPO? A nota não conta: um relatório que só tivesse
 *  a nota de responsabilidade não seria um relatório. */
export function narrativaVazia(secoes: SecaoEditavel[]): boolean {
  return serializarNarrativa(secoes) === '';
}

/** Títulos das seções ESTRUTURADAS que ficaram sem conteúdo.
 *
 *  Os títulos são travados na tela, mas esvaziar o campo abaixo de um deles
 *  fazia a seção inteira desaparecer na serialização — um jeito indireto de
 *  apagar um heading que a UI não deixa editar. A saída não é gravar título
 *  órfão nem remover a seção calada: é recusar o salvamento e dizer qual
 *  seção falta.
 *
 *  O campo ÚNICO (`titulo === ''`) fica de fora: ali não há heading a
 *  proteger, e quem cuida do caso é `narrativaVazia`. */
export function secoesEstruturadasVazias(secoes: SecaoEditavel[]): string[] {
  return secoes
    .filter((s) => s.titulo !== '' && s.conteudo.trim() === '')
    .map((s) => s.titulo);
}
