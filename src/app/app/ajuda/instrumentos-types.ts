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
