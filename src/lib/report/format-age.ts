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

export function formatAgeAtEvaluation(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const age = raw as AgeAtEvaluation;
  const years = integerOrNull(age.years);
  const months = integerOrNull(age.months);
  const days = integerOrNull(age.days);

  if (years === null) return null;

  const parts: string[] = [`${years} ${years === 1 ? 'ano' : 'anos'}`];
  if (months !== null) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days !== null) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);

  const base =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;

  return age.corrected === true ? `${base} (idade corrigida)` : base;
}
