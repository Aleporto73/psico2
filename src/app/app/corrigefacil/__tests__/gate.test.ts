import { beforeEach, describe, expect, it, vi } from 'vitest';

// O gate é Server Component: devolve JSX sem renderizar. Em ambiente `node`
// (que é o deste repositório) dá para inspecionar o elemento devolvido pelo
// seu `type` — é o que prova QUAL tela o gate escolheu, sem precisar de DOM.
const mocks = vi.hoisted(() => ({
  clientRef: { current: null as unknown },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => mocks.clientRef.current,
}));

import { RPC_ACESSO, temAcessoCorrigeFacil, type ClienteDeAcesso } from '../access';
import CorrigeFacilPage from '../page';
import { CorrigeFacilCatalogClient } from '../CorrigeFacilCatalogClient';
import { CorrigeFacilLocked } from '../CorrigeFacilLocked';

const USUARIO = { id: 'u-1' };

function clienteFalso(opts: {
  user?: { id: string } | null;
  rpcData?: unknown;
  rpcError?: unknown;
  lancar?: unknown;
}): ClienteDeAcesso & { chamadas: Array<{ fn: string; args: unknown }> } {
  const chamadas: Array<{ fn: string; args: unknown }> = [];
  return {
    chamadas,
    auth: {
      getUser: async () => {
        if (opts.lancar) throw opts.lancar;
        return { data: { user: opts.user ?? null } };
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      chamadas.push({ fn, args });
      return { data: opts.rpcData ?? null, error: opts.rpcError ?? null };
    },
  };
}

beforeEach(() => {
  mocks.clientRef.current = null;
});

describe('gate comercial do CorrigeFácil', () => {
  it('1) usuário ausente: nega e nem consulta a RPC', async () => {
    const cliente = clienteFalso({ user: null });
    expect(await temAcessoCorrigeFacil(cliente)).toBe(false);
    expect(cliente.chamadas).toHaveLength(0);
  });

  it('2) RPC true: libera e chama has_corrigefacil_access com o id do usuário', async () => {
    const cliente = clienteFalso({ user: USUARIO, rpcData: true });
    expect(await temAcessoCorrigeFacil(cliente)).toBe(true);
    expect(cliente.chamadas).toEqual([
      { fn: RPC_ACESSO, args: { user_uuid: 'u-1' } },
    ]);
  });

  it('3) RPC false: bloqueia', async () => {
    const cliente = clienteFalso({ user: USUARIO, rpcData: false });
    expect(await temAcessoCorrigeFacil(cliente)).toBe(false);
  });

  it('4) RPC null: bloqueia', async () => {
    const cliente = clienteFalso({ user: USUARIO, rpcData: null });
    expect(await temAcessoCorrigeFacil(cliente)).toBe(false);
  });

  it('4b) RPC devolve valor truthy inesperado: bloqueia (comparação estrita)', async () => {
    for (const inesperado of ['true', 1, {}, [], 'sim']) {
      const cliente = clienteFalso({ user: USUARIO, rpcData: inesperado });
      expect(await temAcessoCorrigeFacil(cliente)).toBe(false);
    }
  });

  it('5) RPC com erro (ex.: função ausente no banco): bloqueia', async () => {
    const cliente = clienteFalso({
      user: USUARIO,
      rpcData: true,
      rpcError: { code: '42883', message: 'function has_corrigefacil_access does not exist' },
    });
    expect(await temAcessoCorrigeFacil(cliente)).toBe(false);
  });

  it('6) exceção real (Supabase fora): fail-closed, sem propagar', async () => {
    const cliente = clienteFalso({ lancar: new Error('network down') });
    expect(await temAcessoCorrigeFacil(cliente)).toBe(false);
  });

  it('7) sinais internos do Next continuam sendo relançados', async () => {
    const sinal = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/entrar;307;',
    });
    const cliente = clienteFalso({ lancar: sinal });
    await expect(temAcessoCorrigeFacil(cliente)).rejects.toBe(sinal);
  });

  it('7b) page.tsx sem acesso monta CorrigeFacilLocked', async () => {
    mocks.clientRef.current = clienteFalso({ user: USUARIO, rpcData: false });
    const elemento = await CorrigeFacilPage();
    expect(elemento.type).toBe(CorrigeFacilLocked);
  });

  it('7c) page.tsx com acesso monta CorrigeFacilCatalogClient', async () => {
    mocks.clientRef.current = clienteFalso({ user: USUARIO, rpcData: true });
    const elemento = await CorrigeFacilPage();
    expect(elemento.type).toBe(CorrigeFacilCatalogClient);
  });

  it('7d) page.tsx com usuário ausente monta CorrigeFacilLocked', async () => {
    mocks.clientRef.current = clienteFalso({ user: null });
    const elemento = await CorrigeFacilPage();
    expect(elemento.type).toBe(CorrigeFacilLocked);
  });
});
