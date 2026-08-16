// CONFIAS · perfil por habilidade e nível equivalente, na apresentação.
// Puro, para ser testado sem DOM (o Vitest deste repositório roda em `node`).
//
// TRAVA CENTRAL, a mesma do resto desta pasta: NADA AQUI CALCULA.
//
// Os dois derivados saem prontos da Edge `corrigir`. Ela conta os acertos
// de cada tarefa, divide pelo teto, escolhe a faixa em
// `classification_bands` e resolve o nível pela tabela do controlador —
// tudo no servidor, sobre as respostas que ele mesmo validou. O que este
// módulo faz é ESCOLHER PALAVRA E FORMATO:
//
//   fração -> "75%"        formatação, e só. O número não muda.
//   rótulo -> o mesmo      `classificacao` é impressa como veio.
//
// Ninguém aqui compara percentual com corte, e é de propósito: os cortes
// (0,75 e 0,50) não chegam ao browser, e reconstruí-los aqui criaria uma
// segunda régua que um dia discordaria da do servidor sem ninguém notar.
//
// ONDE O DERIVADO É LIDO, e por que são dois caminhos:
//
//   tela / histórico / documento   `derived.confias`, da Edge
//   Relatório Pró (gerador)        `subject_meta._corrigefacil.confias`,
//                                  lido direto do banco pelo servidor
//
// É o MESMO objeto: a Edge congela em `_corrigefacil` na conclusão e
// promove a `derived` na leitura. O gerador não passa pela Edge — ele
// consulta `assessments` com o cliente Supabase dele —, e por isso precisa
// do leitor da chave reservada. `derivadoDoMeta` existe só para isso.

import type { DerivadoConfias, HabilidadeConfias } from './api';

/** O instrumento que tem derivado. Fechado de propósito, como
 *  INSTRUCAO_DOS_ITENS e TEMPOS_POR_INSTRUMENTO: os outros 20 não têm a
 *  chave, e nada neste módulo os alcança. */
export const CODIGO_CONFIAS = 'CONFIAS';

/** A chave RESERVADA do CorrigeFácil dentro de `subject_meta`. Quem
 *  escreve é a Edge; o navegador nunca. Ela não sai em `subject_meta` nas
 *  respostas públicas — o snapshot sai em `derived`. */
export const CHAVE_RESERVADA = '_corrigefacil';

export const TITULO_NIVEL = 'Nível equivalente (escore sílaba)';

/** A frase que impede a leitura errada mais provável deste bloco.
 *
 *  Os rótulos do nível equivalente são os MESMOS da hipótese de escrita
 *  ("Pré-silábica", "Silábica", "Silábico-alfabética", "Alfabética"),
 *  porque é a mesma nomenclatura. Sem esta nota, um profissional que veja
 *  "Alfabética" aqui e tenha informado "Silábica" na seleção normativa lê
 *  uma contradição onde há duas medidas diferentes. */
export const NOTA_NIVEL =
  'Leitura adicional do escore de Sílaba. Não substitui a hipótese de ' +
  'escrita informada para a seleção normativa.';

export const TITULO_PERFIL = 'Perfil por Habilidade';

export const NOTA_PERFIL =
  'Acertos por tarefa, calculados e classificados no servidor a partir do ' +
  'protocolo completo.';

/** Os dois blocos do perfil. É separação de LEITURA, não de dado: a ordem
 *  e o conteúdo das linhas são os que a Edge mandou, e nenhuma habilidade
 *  entra, sai ou troca de lugar por causa disto. */
export const TITULO_SILABICAS = 'Habilidades silábicas';
export const TITULO_FONEMICAS = 'Habilidades fonêmicas';

/** O derivado do CONFIAS, quando existe.
 *
 *  Devolve null para: instrumento sem `derived`, CONFIAS cujo protocolo
 *  estava incompleto (a Edge omite a chave nesse caso) e avaliação salva
 *  antes de o campo existir. Os três são a mesma coisa para a tela — não
 *  há bloco a desenhar. */
export function derivadoConfias(
  origem: { derived?: { confias?: DerivadoConfias } } | null | undefined,
): DerivadoConfias | null {
  const d = origem?.derived?.confias;
  if (!d || !Array.isArray(d.perfil_habilidades)) return null;
  return d;
}

/** O MESMO derivado, lido da chave reservada de `subject_meta`.
 *
 *  É o caminho do Relatório Pró, que consulta `assessments` direto no banco
 *  e por isso vê `_corrigefacil` em vez de `derived`. Nenhuma outra parte
 *  do app deve usar este leitor: quem fala com a Edge recebe `derived`
 *  pronto, e a chave reservada nem chega ao browser. */
export function derivadoDoMeta(
  meta: Record<string, unknown> | null | undefined,
): DerivadoConfias | null {
  const reservada = meta?.[CHAVE_RESERVADA];
  if (!reservada || typeof reservada !== 'object' || Array.isArray(reservada)) {
    return null;
  }
  return derivadoConfias({
    derived: (reservada as { confias?: DerivadoConfias }),
  });
}

const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/** A fração do servidor como porcentagem legível.
 *
 *  0.75 -> "75%"   ·   0.8333… -> "83,3%"
 *
 *  Uma casa no máximo, e nenhuma nos valores redondos: "75,0%" ao lado de
 *  "Consolidada" sugere precisão que 3/4 não tem. O `Intl` faz as duas
 *  coisas sozinho, e faz a vírgula decimal de pt-BR junto.
 *
 *  Isto é FORMATAÇÃO. O número comparado com o corte foi o do servidor, e
 *  arredondar aqui não pode mover ninguém de faixa — nem move: a
 *  `classificacao` vem pronta ao lado e não é recalculada. */
export function formatarPercentual(fracao: number | null): string | null {
  if (fracao === null || !Number.isFinite(fracao)) return null;
  return PERCENTUAL.format(fracao);
}

/** "3/4" — acertos sobre o teto da tarefa, como o caderno registra. */
export function formatarAcertos(h: HabilidadeConfias): string {
  return `${h.acertos}/${h.max}`;
}

/** Uma linha do perfil, pronta para desenhar. */
export type LinhaPerfil = {
  code: string;
  name: string;
  /** "S1 — Síntese silábica": o código à esquerda porque é por ele que o
   *  profissional acha a tarefa no caderno de aplicação. */
  titulo: string;
  acertos: string;
  percentual: string | null;
  classificacao: string | null;
};

export function montarLinhaPerfil(h: HabilidadeConfias): LinhaPerfil {
  return {
    code: h.code,
    name: h.name,
    titulo: `${h.code} — ${h.name}`,
    acertos: formatarAcertos(h),
    percentual: formatarPercentual(h.percentual),
    // exatamente como veio; sem `??`, sem tradução, sem faixa de reserva
    classificacao: h.classificacao,
  };
}

/** As 16 linhas, NA ORDEM EM QUE A EDGE AS MANDOU.
 *
 *  Sem ordenação, sem filtro e sem completar buraco: se um dia vierem 15,
 *  saem 15 — inventar a décima sexta seria afirmar um acerto que ninguém
 *  registrou. */
export function linhasDoPerfil(d: DerivadoConfias): LinhaPerfil[] {
  return d.perfil_habilidades.map(montarLinhaPerfil);
}

export type BlocoPerfil = { titulo: string; linhas: LinhaPerfil[] };

/** O perfil partido em silábicas e fonêmicas, para leitura.
 *
 *  A partição sai do CÓDIGO da tarefa, que é o que a Edge manda — 'S…' e
 *  'F…' são os prefixos do próprio instrumento. Código que não comece por
 *  nenhum dos dois não é descartado: cai no primeiro bloco, porque sumir
 *  da tela é pior que aparecer no lugar imperfeito.
 *
 *  Bloco vazio não vira título. */
export function blocosDoPerfil(d: DerivadoConfias): BlocoPerfil[] {
  const linhas = linhasDoPerfil(d);
  const fonemicas = linhas.filter((l) => l.code.toUpperCase().startsWith('F'));
  const resto = linhas.filter((l) => !l.code.toUpperCase().startsWith('F'));
  return [
    { titulo: TITULO_SILABICAS, linhas: resto },
    { titulo: TITULO_FONEMICAS, linhas: fonemicas },
  ].filter((b) => b.linhas.length > 0);
}

/** O bloco do derivado no texto que vai ao modelo do Relatório Pró.
 *
 *  Mesma natureza de `temposParaTexto`: transcrição, com os rótulos que a
 *  tela e o documento usam, para o modelo não receber um vocabulário
 *  próprio. Cada linha traz acertos, percentual e classificação JUNTOS —
 *  mandar só o percentual convidaria o modelo a classificá-lo, que é
 *  exatamente o que ele não pode fazer.
 *
 *  Null quando não há snapshot: é o que mantém o prompt dos outros 20
 *  instrumentos, e o de toda avaliação antiga, sem um caractere de
 *  diferença. */
export function derivadoParaTexto(d: DerivadoConfias | null): string | null {
  if (!d) return null;
  const linhas: string[] = [];
  if (d.nivel_equivalente_silaba) {
    linhas.push(`${TITULO_NIVEL}: ${d.nivel_equivalente_silaba}`);
    linhas.push(NOTA_NIVEL);
  }
  const perfil = linhasDoPerfil(d);
  if (perfil.length > 0) {
    if (linhas.length > 0) linhas.push('');
    linhas.push(`${TITULO_PERFIL}:`);
    for (const l of perfil) {
      const partes = [l.acertos, l.percentual, l.classificacao].filter(
        (p): p is string => typeof p === 'string' && p.length > 0,
      );
      linhas.push(`${l.titulo}: ${partes.join(' · ')}`);
    }
  }
  return linhas.length > 0 ? linhas.join('\n') : null;
}
