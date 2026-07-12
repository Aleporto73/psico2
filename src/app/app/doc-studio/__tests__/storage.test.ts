import { describe, expect, it } from 'vitest';
import type { DocStudioDraft } from '../types';
import { initialDraft } from '../templates';
import {
  DRAFT_SCHEMA_VERSION,
  DRAFT_STORAGE_KEY,
  clearDraft,
  loadDraft,
  parseStoredDraft,
  saveDraft,
} from '../lib/storage';

const NOW = '2026-07-04T12:00:00.000Z';

// Storage em memória para testar sem window/localStorage (env: node).
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

const sampleDraft: DocStudioDraft = {
  schemaVersion: 2,
  line: 'psychopedagogy',
  templateKey: 'family-feedback',
  fields: { ...initialDraft, subjectName: 'Fulano' },
  primaryColor: '#0E2A38',
  fontStyle: 'editorial',
  density: 'comfortable',
  blackAndWhite: false,
  showHeader: true,
  showSignature: false,
  updatedAt: NOW,
};

describe('storage roundtrip', () => {
  it('salva e recarrega o rascunho', () => {
    const storage = createMemoryStorage();
    expect(saveDraft(sampleDraft, storage)).toBe(true);

    const loaded = loadDraft(NOW, storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.fields.subjectName).toBe('Fulano');
    expect(loaded?.templateKey).toBe('family-feedback');
  });

  it('limpa o rascunho', () => {
    const storage = createMemoryStorage();
    saveDraft(sampleDraft, storage);
    expect(clearDraft(storage)).toBe(true);
    expect(loadDraft(NOW, storage)).toBeNull();
  });
});

describe('parseStoredDraft schemaVersion', () => {
  it('rejeita versão de schema desconhecida', () => {
    const future = JSON.stringify({ ...sampleDraft, schemaVersion: 99 });
    expect(parseStoredDraft(future, NOW)).toBeNull();
  });

  it('aceita o campo legado "version"', () => {
    const legacy = JSON.stringify({ ...sampleDraft, schemaVersion: undefined, version: 2 });
    const parsed = parseStoredDraft(legacy, NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.schemaVersion).toBe(2);
  });

  it('retorna null para entrada inválida', () => {
    expect(parseStoredDraft(null, NOW)).toBeNull();
    expect(parseStoredDraft('{ not json', NOW)).toBeNull();
    expect(parseStoredDraft('123', NOW)).toBeNull();
  });

  it('normaliza cor inválida para o padrão', () => {
    const badColor = JSON.stringify({ ...sampleDraft, primaryColor: '#zzzzzz' });
    const parsed = parseStoredDraft(badColor, NOW);
    expect(parsed?.primaryColor).toBe('#0E2A38');
  });
});

describe('storage indisponível', () => {
  it('degrada com storage nulo', () => {
    expect(saveDraft(sampleDraft, null)).toBe(false);
    expect(loadDraft(NOW, null)).toBeNull();
    expect(clearDraft(null)).toBe(false);
  });

  it('expõe a chave de armazenamento', () => {
    expect(DRAFT_STORAGE_KEY).toContain('doc-studio');
  });
});

describe('schema version — regressão schemaVersion hardcoded', () => {
  // Este teste garante que o schemaVersion gravado no JSON é sempre o valor
  // da constante DRAFT_SCHEMA_VERSION, nunca um literal hardcoded.
  // Motivação: bug em que useDocStudioState gravava schemaVersion:1 enquanto
  // a guarda de leitura exigia DRAFT_SCHEMA_VERSION (2) — rascunho sumia no F5.
  it('roundtrip completo: fields voltam idênticos após save+load', () => {
    const storage = createMemoryStorage();
    const draft: DocStudioDraft = { ...sampleDraft, fields: { ...initialDraft, subjectName: 'Teste' } };
    saveDraft(draft, storage);

    // Verifica que o JSON gravado usa DRAFT_SCHEMA_VERSION, não um literal.
    const raw = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(raw.schemaVersion).toBe(DRAFT_SCHEMA_VERSION);

    // Verifica que loadDraft aceita e devolve os fields intactos.
    const loaded = loadDraft(NOW, storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.fields.subjectName).toBe('Teste');
  });

  it('draft com schemaVersion literal 1 é rejeitado pelo loadDraft atual', () => {
    const buggyDraft = JSON.stringify({ ...sampleDraft, schemaVersion: 1 });
    expect(parseStoredDraft(buggyDraft, NOW)).toBeNull();
  });
});
