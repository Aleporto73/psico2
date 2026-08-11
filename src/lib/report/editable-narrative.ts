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
// 1. O AVISO ÉTICO NUNCA ENTRA NA ÁREA EDITÁVEL. Ele é retirado na leitura
//    e NÃO é devolvido na serialização — quem o reanexa é a RPC, no banco.
//    Deixá-lo num textarea seria convidar a apagá-lo ou reescrevê-lo.
//
// 2. NADA DE CONVERTER RELATÓRIO ANTIGO. Um relatório com quatro seções
//    continua com quatro; um sem estrutura nenhuma vira um campo único.
//    Editar não é regenerar, e o editor não tem opinião sobre a estrutura
//    que a IA produziu na época.
// =====================================================================

import { AVISO_FINAL } from './ethical-disclaimer';

/** Uma seção editável. `titulo` vazio = relatório sem estrutura
 *  reconhecível, e o campo é único. */
export type SecaoEditavel = {
  /** Texto do heading SEM o `## `. Fica travado na tela. */
  titulo: string;
  /** O que o profissional edita. */
  conteudo: string;
};

/** Rótulo do campo único quando não há heading algum. */
export const TITULO_UNICO = 'Texto do relatório';

/** Retira o aviso do fim do texto, para que ele nunca chegue ao editor.
 *
 *  Compara pelo texto exato da constante compartilhada — não por regex nem
 *  por "último parágrafo": o último parágrafo de um relatório editado pode
 *  ser qualquer coisa, e cortá-lo às cegas apagaria conteúdo do
 *  profissional. */
export function removerAviso(texto: string): string {
  const i = texto.lastIndexOf(AVISO_FINAL);
  if (i === -1) return texto.trimEnd();
  return texto.slice(0, i).trimEnd();
}

/** Markdown salvo -> campos do editor.
 *
 *  Só `##` conta como divisor. `#` e `###` continuam sendo conteúdo: o
 *  contrato do prompt usa `##`, e promover outros níveis a seção quebraria
 *  relatórios que usam `###` como subtítulo interno. */
export function parseNarrativa(outputText: string): SecaoEditavel[] {
  const semAviso = removerAviso(outputText ?? '');
  const linhas = semAviso.split('\n');

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
    return [{ titulo: '', conteudo: semAviso.trim() }];
  }

  for (const s of secoes) s.conteudo = s.conteudo.trim();

  // Texto ANTES do primeiro heading não pode ser descartado — é conteúdo do
  // relatório, e perdê-lo ao abrir o editor seria destruir dado do
  // profissional em silêncio. Ele volta como campo sem título, na frente.
  const antes = preambulo.join('\n').trim();
  if (antes) secoes.unshift({ titulo: '', conteudo: antes });

  return secoes;
}

/** Campos do editor -> Markdown, SEM o aviso.
 *
 *  Preserva os headings que existiam: não acrescenta, não renomeia, não
 *  reordena.
 *
 *  Seção estruturada sem conteúdo NÃO chega aqui pelo caminho de
 *  salvamento: `secoesEstruturadasVazias` barra antes. O descarte abaixo
 *  existe só para nunca emitir um título órfão sobre nada — não é
 *  autorização para apagar seção. Não trocar por `## Título\n` vazio: isso
 *  gravaria heading solto no documento. Quem impede a perda é o validador. */
export function serializarNarrativa(secoes: SecaoEditavel[]): string {
  return secoes
    .map((s) => {
      const conteudo = s.conteudo.trim();
      if (!s.titulo) return conteudo;
      if (!conteudo) return '';
      return `## ${s.titulo}\n${conteudo}`;
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

/** Há algo a salvar? Serialização vazia significaria apagar a narrativa
 *  inteira e deixar o documento só com o aviso. */
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
