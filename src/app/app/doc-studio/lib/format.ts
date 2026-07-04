// Doc Studio — helpers puros de normalização e type guards (sem dependências de domínio).

import type { Density, FontStyle, LineKey } from '../types';

// Faixa de marcas diacríticas combinantes (U+0300–U+036F) usada para remover acentos.
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Normaliza texto para busca: minúsculas + remoção de acentos (NFD) + colapso de espaços.
 * Ex.: "Avaliação  Psicológica" -> "avaliacao psicologica".
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isLineKey(value: unknown): value is LineKey {
  return value === 'psychopedagogy' || value === 'psychology';
}

export function isFontStyle(value: unknown): value is FontStyle {
  return value === 'editorial' || value === 'classic' || value === 'clean';
}

export function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact';
}
