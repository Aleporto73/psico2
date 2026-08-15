// =====================================================================
// IDADE NA DATA DA AVALIAÇÃO · formatação, e só isso.
//
// Saiu de `lib/corrigefacil/report-generator.ts` SEM alteração de
// comportamento. O motivo da extração é técnico e não estético: aquele
// módulo importa `@/lib/openai`, que começa com `import 'server-only'`.
// Qualquer Client Component que quisesse a mesma formatação quebraria o
// build ao alcançar essa cadeia. O documento profissional precisa dela no
// cliente, e duas regras de idade divergentes num produto que imprime
// laudo é exatamente o que não pode acontecer.
//
// `report-generator.ts` reexporta daqui, então o prompt continua recebendo
// a mesma string que sempre recebeu.
//
// A regra que este arquivo carrega: NUNCA inventar precisão. Quem informou
// só "8 anos" não vira "8 anos, 0 meses e 0 dias" — a ausência de meses é
// um fato sobre a coleta, não um zero.
// =====================================================================

export type AgeAtEvaluation = {
  years?: unknown;
  months?: unknown;
  days?: unknown;
  corrected?: unknown;
};

/** Só inteiro não-negativo conta. Qualquer outra coisa é ausência, e
 *  ausência não entra na frase. */
function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/** Os anos da idade manual DECIMAL: número finito, não negativo e não
 *  inteiro. Inteiro não passa por aqui — ele segue pelo caminho de sempre,
 *  e é isso que mantém "5 anos" e "1 ano, 7 meses e 12 dias" idênticos ao
 *  que sempre foram. */
function decimalYearsOrNull(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    !Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

/** Número em pt-BR, e a vírgula é posta AQUI de propósito.
 *
 *  `toLocaleString` depende do locale de quem roda, e o servidor que gera
 *  o documento não é a máquina de quem lê: 1.5 sairia "1.5" num lugar e
 *  "1,5" no outro para a mesma avaliação. A troca literal é determinística
 *  e não tem esse risco.
 *
 *  Exportado porque a tela de identificação escreve a mesma faixa de idade
 *  no campo e na mensagem de erro — uma regra de vírgula só no produto. */
export function numeroPtBr(value: number): string {
  return String(value).replace('.', ',');
}

function comCorrecao(base: string, age: AgeAtEvaluation): string {
  return age.corrected === true ? `${base} (idade corrigida)` : base;
}

export function formatAgeAtEvaluation(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const age = raw as AgeAtEvaluation;
  const years = integerOrNull(age.years);
  const months = integerOrNull(age.months);
  const days = integerOrNull(age.days);

  if (years === null) {
    // Idade manual em anos decimais — o C-TRF 1.5-5 é quem a coleta, e ela
    // é IDENTIFICAÇÃO, não norma. 1.5 vira "1,5 anos" e não pode virar "1
    // ano": arredondar aqui mudaria a idade que o profissional informou.
    //
    // Só vale sem meses/dias. Decimal COM meses é duas precisões para o
    // mesmo fato — registro incoerente, e escolher uma delas seria
    // exatamente a invenção que este arquivo não faz.
    const decimal = decimalYearsOrNull(age.years);
    if (decimal === null || months !== null || days !== null) return null;
    return comCorrecao(`${numeroPtBr(decimal)} anos`, age);
  }

  const parts: string[] = [`${years} ${years === 1 ? 'ano' : 'anos'}`];
  if (months !== null) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days !== null) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);

  const base =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;

  return comCorrecao(base, age);
}
