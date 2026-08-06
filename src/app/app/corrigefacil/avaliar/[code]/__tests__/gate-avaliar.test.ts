import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ clientRef: { current: null as unknown } }));

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => mocks.clientRef.current,
}));

import { temAcessoCorrigeFacil, type ClienteDeAcesso } from '../../../access';
import { CorrigeFacilLocked } from '../../../CorrigeFacilLocked';
import { AvaliarClient } from '../AvaliarClient';
import AvaliarPage from '../page';

function cliente(opts: {
  user?: { id: string } | null;
  rpcData?: unknown;
  rpcError?: unknown;
  lancar?: unknown;
}): ClienteDeAcesso {
  return {
    auth: {
      getUser: async () => {
        if (opts.lancar) throw opts.lancar;
        return { data: { user: opts.user ?? null } };
      },
    },
    rpc: async () => ({ data: opts.rpcData ?? null, error: opts.rpcError ?? null }),
  };
}

const params = (code: string) => Promise.resolve({ code });

beforeEach(() => {
  mocks.clientRef.current = null;
});

describe('gate da rota de aplicação', () => {
  it('15) sem direito não carrega a ferramenta: renderiza Locked', async () => {
    mocks.clientRef.current = cliente({ user: { id: 'u-1' }, rpcData: false });
    const el = await AvaliarPage({ params: params('PHQ-9') });
    expect(el.type).toBe(CorrigeFacilLocked);
    // o formulário sequer entra na árvore, então nenhuma chamada à Edge sai
    expect(el.type).not.toBe(AvaliarClient);
  });

  it('16) RPC true libera e passa o código decodificado', async () => {
    mocks.clientRef.current = cliente({ user: { id: 'u-1' }, rpcData: true });
    const el = await AvaliarPage({ params: params(encodeURIComponent('C-TRF_1.5-5')) });
    expect(el.type).toBe(AvaliarClient);
    expect(el.props.code).toBe('C-TRF_1.5-5');
  });

  it('17) RPC false bloqueia', async () => {
    expect(await temAcessoCorrigeFacil(cliente({ user: { id: 'u-1' }, rpcData: false }))).toBe(
      false,
    );
  });

  it('18) RPC com erro bloqueia', async () => {
    expect(
      await temAcessoCorrigeFacil(
        cliente({ user: { id: 'u-1' }, rpcData: true, rpcError: { message: 'boom' } }),
      ),
    ).toBe(false);
  });

  it('18b) usuário ausente bloqueia', async () => {
    mocks.clientRef.current = cliente({ user: null });
    const el = await AvaliarPage({ params: params('PHQ-9') });
    expect(el.type).toBe(CorrigeFacilLocked);
  });

  it('19) sinal interno do Next continua sendo relançado', async () => {
    const sinal = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/entrar;307;',
    });
    await expect(temAcessoCorrigeFacil(cliente({ lancar: sinal }))).rejects.toBe(sinal);
  });
});
