// Tempos de execução: REGISTRO DESCRITIVO, não medida normativa. Puro, para
// ser testado sem DOM (o Vitest deste repositório roda em `node`).
//
// POR QUE ISTO EXISTE
//
// A planilha controladora do TRILHAS_PRE registra o tempo em segundos das
// Partes A e B. São dois números que o profissional anota durante a
// aplicação e relê depois — não entram em nenhuma das quatro medidas
// normativas do instrumento.
//
// TRAVA CENTRAL, a mesma do resto desta pasta: nada aqui pontua. E aqui a
// trava é mais forte que nos vizinhos, porque o dado PARECE pontuável:
// tempo é número, e número ao lado de escore convida a ser lido como
// desempenho. Por isso o tempo NÃO recebe pontuação-padrão, classificação,
// percentil, faixa, cor, gráfico nem leitura automática de rápido/lento.
// Ele é transcrito, e só.
//
// Onde ele mora: `subject_meta` da avaliação, junto de `respondent_name` e
// `age_at_evaluation` — que são exatamente da mesma natureza (contexto da
// aplicação, informado pelo profissional). Nenhuma coluna nova, nenhuma
// tabela nova, nenhuma migration: `subject_meta` é jsonb e já existe.
//
// O mapa é FECHADO de propósito, como INSTRUCAO_DOS_ITENS,
// GATE_POR_INSTRUMENTO e METRICAS_POR_INSTRUMENTO: só o código listado
// ganha os campos, e todo instrumento fora dele continua exatamente como
// estava — formulário, histórico, documento e prompt inclusive.

/** Um tempo declarado por um instrumento. */
export type CampoTempo = {
  /** a chave dentro de `subject_meta`. É contrato de dado: mudar aqui
   *  torna ilegível o que já foi gravado. */
  chave: string;
  /** o nome curto na apresentação: "Parte A" */
  rotulo: string;
  /** o rótulo do campo no formulário, com a unidade explícita */
  label: string;
};

export const TEMPOS_POR_INSTRUMENTO: Readonly<
  Record<string, readonly CampoTempo[]>
> = {
  // TRILHAS_PRE · as duas partes da prova, como a planilha as registra.
  // A ordem é a da aplicação: A antes de B.
  TRILHAS_PRE: [
    {
      chave: 'tempo_parte_a_segundos',
      rotulo: 'Parte A',
      label: 'Tempo Parte A (segundos)',
    },
    {
      chave: 'tempo_parte_b_segundos',
      rotulo: 'Parte B',
      label: 'Tempo Parte B (segundos)',
    },
  ],
};

/** O título da seção, um só para tela, documento e prompt. */
export const TITULO_TEMPOS = 'Tempo de execução';

/** A nota que acompanha os tempos SEMPRE que eles aparecem.
 *
 *  Não é decoração: é ela que impede o número de ser lido como desempenho.
 *  Por isso viaja junto em todos os destinos — tela, PDF e prompt. */
export const NOTA_TEMPOS =
  'Medidas descritivas de execução, sem classificação normativa.';

/** Os campos de tempo deste instrumento, ou null. Null é o caso dos 19
 *  outros, e é essa ausência que mantém a tela deles idêntica. */
export function temposDoInstrumento(
  code: string | undefined,
): readonly CampoTempo[] | null {
  if (!code) return null;
  return TEMPOS_POR_INSTRUMENTO[code] ?? null;
}

/** Um tempo já pronto para apresentar. */
export type TempoNaTela = { rotulo: string; segundos: number };

/** Converte o que veio do formulário para o que se grava.
 *
 *  Campo vazio devolve null e a chave simplesmente não entra no
 *  `subject_meta` — não se grava zero para dizer "não informado", porque
 *  zero segundo é um valor possível e mentiria sobre o que foi coletado.
 *
 *  Recusa o que não é número finito e não-negativo. O limite de 24h existe
 *  para pegar dedo escorregado (digitar a data no campo do tempo), não para
 *  julgar a aplicação: qualquer duração plausível passa. */
export function segundosDoCampo(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const n = Number(limpo.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 86400) return null;
  return n;
}

/** Lê de `subject_meta` só o que foi realmente gravado.
 *
 *  Tempo ausente não vira linha: a apresentação não inventa valor e não
 *  mostra rótulo órfão. Avaliação salva antes deste campo existir
 *  simplesmente não traz as chaves e não renderiza seção nenhuma — mesmo
 *  contrato das respostas auxiliares. */
export function lerTempos(
  code: string | undefined,
  meta: Record<string, unknown> | null | undefined,
): TempoNaTela[] {
  const campos = temposDoInstrumento(code);
  if (!campos || !meta) return [];

  const out: TempoNaTela[] = [];
  for (const campo of campos) {
    const v = meta[campo.chave];
    // aceita number gravado e string numérica: `subject_meta` é jsonb e
    // avaliação antiga pode ter sido gravada por outro caminho.
    //
    // String em BRANCO é AUSENTE, nunca zero. `Number('')` e `Number('  ')`
    // devolvem 0, e um 0 aqui viraria "Parte A: 0 segundos" na tela, no PDF
    // e no prompt — um tempo que ninguém cronometrou, apresentado como se
    // tivesse sido. Ausente é o campo não existir, e é assim que ele some.
    const n =
      typeof v === 'number'
        ? v
        : typeof v === 'string' && v.trim() !== ''
          ? Number(v)
          : NaN;
    if (Number.isFinite(n) && n >= 0) {
      out.push({ rotulo: campo.rotulo, segundos: n });
    }
  }
  return out;
}

/** O que o formulário digitou, na forma em que o `subject_meta` guarda.
 *
 *  Existe para haver UMA regra: quem grava (`montarPedidoAvaliacao`) e quem
 *  mostra o resultado ainda não salvo passam por aqui. Sem isso a tela do
 *  resultado precisaria repetir a conversão, e as duas envelheceriam
 *  separadas — o resultado na tela diria uma coisa e o que foi salvo, outra.
 *
 *  Campo vazio, inválido ou de instrumento que não declara tempo não vira
 *  chave: o objeto devolvido tem só o que foi realmente informado. */
export function metaDeTempos(
  code: string | undefined,
  tempos: Record<string, string> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const campo of temposDoInstrumento(code) ?? []) {
    const segundos = segundosDoCampo(tempos?.[campo.chave] ?? '');
    if (segundos !== null) out[campo.chave] = segundos;
  }
  return out;
}

/** "Parte A: 35 segundos" — a MESMA linha em tela, documento e prompt.
 *
 *  Esta é a única formatação de tempo do produto. Espalhar
 *  `${n} segundos` pelos componentes garantiria que um deles envelhecesse
 *  sozinho, que é o defeito que `formatarMedia` já evita para a média. */
export function formatarTempo(t: TempoNaTela): string {
  return `${t.rotulo}: ${t.segundos} segundos`;
}

/** O bloco inteiro como TEXTO, para o prompt do Relatório Pró.
 *
 *  Null quando não há tempo gravado — e é por isso que o prompt dos outros
 *  19 instrumentos, e o das avaliações antigas, não muda um caractere.
 *
 *  A nota vai junto de propósito: o modelo recebe o número e, na mesma
 *  respiração, a instrução de que ele não classifica. Sem ela, "55
 *  segundos na Parte B" é exatamente o tipo de dado que uma narrativa
 *  transforma em "desempenho lento". */
export function temposParaTexto(
  code: string | undefined,
  meta: Record<string, unknown> | null | undefined,
): string | null {
  const tempos = lerTempos(code, meta);
  if (tempos.length === 0) return null;
  return `${TITULO_TEMPOS.toUpperCase()}\n${tempos.map(formatarTempo).join('\n')}\n${NOTA_TEMPOS}`;
}
