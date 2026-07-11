// Doc Studio — rascunho local versionado (localStorage). Sem persistência remota.
// As funções aceitam um Storage opcional para testabilidade (fallback: window.localStorage).

import type { DocStudioDraft, DraftFields } from '../types';
import { isDensity, isFontStyle, isLineKey, isRecord } from './format';
import {
  DRAFT_FIELD_KEYS,
  colorOptions,
  getDefaultFieldsForTemplate,
  getTemplateForDraft,
  initialDraft,
} from '../templates';

const DRAFT_STORAGE_KEY_V1 = 'psicoplanilhas:doc-studio:draft:v1';
export const DRAFT_STORAGE_KEY = 'psicoplanilhas:doc-studio:draft:v2';
export const DRAFT_SCHEMA_VERSION = 2;

function getDefaultStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeDraftFields(value: unknown, defaults: DraftFields): DraftFields {
  if (!isRecord(value)) return defaults;

  return DRAFT_FIELD_KEYS.reduce((nextFields, key) => {
    const fieldValue = value[key];
    return {
      ...nextFields,
      [key]: typeof fieldValue === 'string' ? fieldValue : defaults[key],
    };
  }, defaults);
}

/**
 * Faz o parse de um rascunho serializado, validando/normalizando cada campo.
 * `now` é injetável para manter a função pura e testável.
 */
export function parseStoredDraft(rawDraft: string | null, now: string): DocStudioDraft | null {
  if (!rawDraft) return null;

  try {
    const parsed: unknown = JSON.parse(rawDraft);
    if (!isRecord(parsed)) return null;

    // schemaVersion: aceita v1 e o campo legado `version`. Versões futuras desconhecidas
    // são descartadas (retorna null) para evitar hidratar formato incompatível.
    const rawVersion = parsed.schemaVersion ?? parsed.version;
    if (typeof rawVersion === 'number' && rawVersion !== DRAFT_SCHEMA_VERSION) return null;

    const line = isLineKey(parsed.line) ? parsed.line : 'psychopedagogy';
    const template = getTemplateForDraft(line, parsed.templateKey);
    const defaults = getDefaultFieldsForTemplate(template);
    const primaryColor =
      typeof parsed.primaryColor === 'string' &&
      colorOptions.some((color) => color.value === parsed.primaryColor)
        ? parsed.primaryColor
        : colorOptions[0].value;

    return {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      line,
      templateKey: template.id,
      fields: normalizeDraftFields(parsed.fields, defaults),
      primaryColor,
      fontStyle: isFontStyle(parsed.fontStyle) ? parsed.fontStyle : 'editorial',
      density: isDensity(parsed.density) ? parsed.density : 'comfortable',
      blackAndWhite: typeof parsed.blackAndWhite === 'boolean' ? parsed.blackAndWhite : false,
      showHeader: typeof parsed.showHeader === 'boolean' ? parsed.showHeader : true,
      showSignature: typeof parsed.showSignature === 'boolean' ? parsed.showSignature : false,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : now,
    };
  } catch {
    return null;
  }
}

export function loadDraft(now: string, storage: Storage | null = getDefaultStorage()): DocStudioDraft | null {
  if (!storage) return null;
  try {
    // Descarta rascunho v1 legado para não acumular lixo no localStorage.
    storage.removeItem(DRAFT_STORAGE_KEY_V1);
    return parseStoredDraft(storage.getItem(DRAFT_STORAGE_KEY), now);
  } catch {
    return null;
  }
}

/** Retorna true em sucesso, false se o storage estiver indisponível. */
export function saveDraft(draft: DocStudioDraft, storage: Storage | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(storage: Storage | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getDraftStatusLabel(status: 'idle' | 'saved' | 'restored' | 'cleared' | 'unavailable'): string {
  switch (status) {
    case 'restored':
      return 'Rascunho restaurado neste navegador';
    case 'cleared':
      return 'Rascunho limpo neste navegador';
    case 'unavailable':
      return 'Rascunho local indisponível';
    case 'saved':
    case 'idle':
    default:
      return 'Rascunho salvo neste navegador';
  }
}

// Reexport utilitário para consumidores do rascunho.
export { initialDraft };
