import { instrumentGuidesA } from './instrumentos-data-a';
import { instrumentGuidesB } from './instrumentos-data-b';
import { instrumentGuidesC } from './instrumentos-data-c';
import { instrumentGuidesD } from './instrumentos-data-d';

export type InstrumentStatus =
  | 'allowed'
  | 'conditional'
  | 'psychologist'
  | 'unavailable'
  | 'verify';

export interface InstrumentGuide {
  id: string;
  name: string;
  status: InstrumentStatus;
  audience: string;
  summary: string;
  note?: string;
}

/**
 * Guia informativo da biblioteca PsicoPlanilhas.
 *
 * A classificação é orientativa e não substitui o manual, a legislação da
 * profissão, a análise da edição utilizada ou orientação do conselho
 * profissional competente.
 *
 * Revisão de conteúdo: 27/07/2026.
 */
export const instrumentGuides: InstrumentGuide[] = [
  ...instrumentGuidesA,
  ...instrumentGuidesB,
  ...instrumentGuidesC,
  ...instrumentGuidesD,
];
