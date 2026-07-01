import { createHmac } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Module mocks -----------------------------------------------------------
// The admin Supabase client and the activation-email helper are replaced so the
// route can be exercised without a real database or transactional e-mail.
const mocks = vi.hoisted(() => ({
  clientRef: { current: null as unknown },
  sendActivationLink: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mocks.clientRef.current,
}));

vi.mock('@/utils/auth/activation', () => ({
  sendActivationLink: (...args: unknown[]) => mocks.sendActivationLink(...args),
}));

import { POST } from './route';

// --- In-memory Supabase mock ------------------------------------------------
type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
type QueryError = { code?: string; message: string } | null;
type QueryResult = { data: Row | Row[] | null; error: QueryError };

class FakeDb {
  tables: Tables;
  private seq = 0;

  constructor(seed: Partial<Tables> = {}) {
    this.tables = {
      paymentbeta_webhook_events: [],
      profiles: [],
      products: [],
      purchases: [],
      subscriptions: [],
      ...seed,
    } as Tables;
  }

  nextId(): number {
    this.seq += 1;
    return this.seq;
  }
}

type Filter = { type: 'eq' | 'ilike'; col: string; val: unknown };
type Op = 'select' | 'insert' | 'update' | undefined;

class QueryBuilder implements PromiseLike<QueryResult> {
  private op: Op;
  private values: Row | undefined;
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | undefined;
  private limitN: number | undefined;

  constructor(private db: FakeDb, private tableName: string) {}

  private rows(): Row[] {
    if (!this.db.tables[this.tableName]) {
      this.db.tables[this.tableName] = [];
    }
    return this.db.tables[this.tableName];
  }

  select(_columns?: string): this {
    void _columns;
    if (!this.op) {
      this.op = 'select';
    }
    return this;
  }

  insert(values: Row): this {
    this.op = 'insert';
    this.values = values;
    return this;
  }

  update(values: Row): this {
    this.op = 'update';
    this.values = values;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  ilike(col: string, val: unknown): this {
    this.filters.push({ type: 'ilike', col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, ascending: opts?.ascending ?? true };
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  private applyFilters(rows: Row[]): Row[] {
    return rows.filter((row) =>
      this.filters.every((f) => {
        const cell = row[f.col];
        if (f.type === 'ilike') {
          return String(cell ?? '').toLowerCase() === String(f.val).toLowerCase();
        }
        return cell === f.val;
      }),
    );
  }

  private runSelect(): Row[] {
    let rows = this.applyFilters(this.rows());
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[col] as number | string;
        const bv = b[col] as number | string;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }
    if (this.limitN != null) {
      rows = rows.slice(0, this.limitN);
    }
    return rows;
  }

  private runInsert(): QueryResult {
    const values = this.values ?? {};
    if (this.tableName === 'paymentbeta_webhook_events') {
      const dup = this.rows().find(
        (r) =>
          r.delivery_id === values.delivery_id ||
          (r.transaction_id === values.transaction_id && r.event === values.event),
      );
      if (dup) {
        return {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        };
      }
    }
    const row: Row = {
      id: `${this.tableName}-${this.db.nextId()}`,
      created_at: new Date().toISOString(),
      ...values,
    };
    this.rows().push(row);
    return { data: row, error: null };
  }

  private runUpdate(): QueryResult {
    for (const row of this.applyFilters(this.rows())) {
      Object.assign(row, this.values ?? {});
    }
    return { data: null, error: null };
  }

  private runSync(): QueryResult {
    if (this.op === 'insert') return this.runInsert();
    if (this.op === 'update') return this.runUpdate();
    if (this.op === 'select') return { data: this.runSelect(), error: null };
    return { data: null, error: null };
  }

  async maybeSingle(): Promise<QueryResult> {
    const res = this.runSync();
    if (Array.isArray(res.data)) {
      return { data: res.data[0] ?? null, error: res.error };
    }
    return res;
  }

  async single(): Promise<QueryResult> {
    const res = this.runSync();
    if (Array.isArray(res.data)) {
      return {
        data: res.data[0] ?? null,
        error: res.error ?? (res.data.length ? null : { message: 'No rows found' }),
      };
    }
    return res;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.runSync()).then(onfulfilled, onrejected);
  }
}

type CreateUserMode = 'success' | 'error';

function createClientMock(db: FakeDb, opts: { createUser?: CreateUserMode } = {}) {
  const createUserCalls: Array<{ email: string; email_confirm?: boolean }> = [];
  const client = {
    from: (table: string) => new QueryBuilder(db, table),
    auth: {
      admin: {
        createUser: async (attrs: { email: string; email_confirm?: boolean }) => {
          createUserCalls.push(attrs);
          if (opts.createUser === 'error') {
            return { data: { user: null }, error: { message: 'createUser indisponível' } };
          }
          // Simula a trigger on_auth_user_created criando o profile.
          const id = `user-${db.nextId()}`;
          db.tables.profiles.push({
            id,
            email: attrs.email,
            activation_status: 'pending_activation',
            status: 'active',
          });
          return { data: { user: { id } }, error: null };
        },
      },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
    },
  };
  return { client, createUserCalls };
}

// --- Request helpers --------------------------------------------------------
const SECRET = 'test-secret';
const CONTRACT_VERSION = '2026-06-10';
const ENDPOINT = 'https://app.psicoplanilha.com/api/paymentbeta/entitlement-webhook';

const nowSeconds = () => Math.floor(Date.now() / 1000);

function vitalicioPayload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: 'sale.confirmed',
    event_version: CONTRACT_VERSION,
    delivery_id: 'dlv-1',
    transaction_id: 'tx-1',
    entitlement: { code: 'psicoplanilhas-vitalicio' },
    customer: { email: 'novo@cliente.com' },
    payment: { status: 'paid' },
    ...over,
  };
}

function signedRequest(
  payload: Record<string, unknown>,
  opts: {
    secret?: string;
    timestamp?: number;
    signature?: string;
    deliveryId?: string;
    event?: string;
    version?: string;
  } = {},
): Request {
  const raw = JSON.stringify(payload);
  const secret = opts.secret ?? SECRET;
  const timestamp = String(opts.timestamp ?? nowSeconds());
  const deliveryId = opts.deliveryId ?? String(payload.delivery_id ?? 'dlv-1');
  const event = opts.event ?? String(payload.event ?? 'sale.confirmed');
  const version = opts.version ?? String(payload.event_version ?? CONTRACT_VERSION);
  const signature =
    opts.signature ??
    `sha256=${createHmac('sha256', secret).update(`${timestamp}.${deliveryId}.${raw}`).digest('hex')}`;

  return new Request(ENDPOINT, {
    method: 'POST',
    headers: {
      'X-PaymentBeta-Event': event,
      'X-PaymentBeta-Delivery': deliveryId,
      'X-PaymentBeta-Timestamp': timestamp,
      'X-PaymentBeta-Signature': signature,
      'X-PaymentBeta-Version': version,
      'content-type': 'application/json',
    },
    body: raw,
  });
}

const products = () => [
  { id: 'prod-vit', slug: 'psicoplanilhas-vitalicio' },
  { id: 'prod-ia', slug: 'assistente-ia-pro' },
  { id: 'prod-flow', slug: 'psicoplanilhas-flow' },
];

type Body = { status?: string; message?: string; previous_status?: string };

beforeAll(() => {
  process.env.PAYMENTBETA_WEBHOOK_SECRET = SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

beforeEach(() => {
  mocks.sendActivationLink.mockReset();
  mocks.sendActivationLink.mockResolvedValue(undefined);
  mocks.clientRef.current = null;
});

describe('POST /api/paymentbeta/entitlement-webhook', () => {
  it('1) comprador inexistente: cria usuário, concede entitlement e envia ativação', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload()));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(createUserCalls).toHaveLength(1);
    expect(createUserCalls[0]).toEqual({ email: 'novo@cliente.com', email_confirm: true });
    expect(mocks.sendActivationLink).toHaveBeenCalledTimes(1);
    expect(mocks.sendActivationLink.mock.calls[0][1]).toBe('novo@cliente.com');
    expect(db.tables.purchases).toHaveLength(1);

    const event = db.tables.paymentbeta_webhook_events[0];
    expect(event.status).toBe('processed');
    expect(event.user_created).toBe(true);
    expect(event.onboarding_email_status).toBe('sent');
    expect(event.user_id).toBeDefined();
  });

  it('2) comprador existente já ativado: concede acesso e NÃO reenvia ativação', async () => {
    const db = new FakeDb({
      products: products(),
      profiles: [{ id: 'u-1', email: 'cliente@x.com', activation_status: 'active', status: 'active' }],
    });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload({ customer: { email: 'cliente@x.com' } })));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(createUserCalls).toHaveLength(0);
    expect(mocks.sendActivationLink).not.toHaveBeenCalled();
    expect(db.tables.purchases).toHaveLength(1);

    const event = db.tables.paymentbeta_webhook_events[0];
    expect(event.user_created).toBe(false);
    expect(event.onboarding_email_status).toBe('skipped_already_active');
  });

  it('2b) comprador existente pendente de ativação: reenvia ativação', async () => {
    const db = new FakeDb({
      products: products(),
      profiles: [
        { id: 'u-9', email: 'pendente@x.com', activation_status: 'pending_activation', status: 'active' },
      ],
    });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload({ customer: { email: 'pendente@x.com' } })));

    expect(res.status).toBe(200);
    expect(createUserCalls).toHaveLength(0);
    expect(mocks.sendActivationLink).toHaveBeenCalledTimes(1);
    expect(db.tables.paymentbeta_webhook_events[0].onboarding_email_status).toBe('sent');
  });

  it('3) webhook repetido (mesmo delivery_id): responde duplicate_ignored', async () => {
    const db = new FakeDb({
      products: products(),
      paymentbeta_webhook_events: [
        {
          id: 'e-prev',
          delivery_id: 'dlv-1',
          transaction_id: 'tx-1',
          event: 'sale.confirmed',
          status: 'processed',
        },
      ],
    });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload()));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('duplicate_ignored');
    expect(body.previous_status).toBe('processed');
    expect(createUserCalls).toHaveLength(0);
    expect(db.tables.purchases).toHaveLength(0);
  });

  it('4) entitlement já concedido: atualiza sem duplicar a purchase', async () => {
    const db = new FakeDb({
      products: products(),
      profiles: [{ id: 'u-1', email: 'cliente@x.com', activation_status: 'active', status: 'active' }],
      purchases: [
        {
          id: 'p-1',
          user_id: 'u-1',
          product_id: 'prod-vit',
          payment_reference: 'ref-antiga',
          payment_status: 'paid',
        },
      ],
    });
    const { client } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(
      signedRequest(vitalicioPayload({ customer: { email: 'cliente@x.com' }, delivery_id: 'dlv-novo', transaction_id: 'tx-2' }), {
        deliveryId: 'dlv-novo',
      }),
    );
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(db.tables.purchases).toHaveLength(1);
    expect(db.tables.purchases[0].payment_reference).toBe('tx-2');
  });

  it('5) assinatura inválida: 401 sem qualquer efeito colateral', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload(), { signature: 'sha256=deadbeef' }));

    expect(res.status).toBe(401);
    expect(createUserCalls).toHaveLength(0);
    expect(db.tables.paymentbeta_webhook_events).toHaveLength(0);
  });

  it('6) payload expirado/replay (timestamp fora da tolerância): 408', async () => {
    const db = new FakeDb({ products: products() });
    const { client } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload(), { timestamp: nowSeconds() - 10_000 }));

    expect(res.status).toBe(408);
    expect(db.tables.paymentbeta_webhook_events).toHaveLength(0);
  });

  it('7) entitlement não suportado: 200 unsupported_entitlement, sem onboarding', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload({ entitlement: { code: 'curso-extra' } })));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('unsupported_entitlement');
    expect(createUserCalls).toHaveLength(0);
    expect(db.tables.purchases).toHaveLength(0);
    expect(db.tables.paymentbeta_webhook_events[0].status).toBe('unsupported_entitlement');
  });

  it('8) falha ao criar usuário: status retryável (failed) + HTTP 500, nunca 200', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db, { createUser: 'error' });
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload()));

    expect(res.status).toBe(500);
    expect(createUserCalls).toHaveLength(1);
    expect(mocks.sendActivationLink).not.toHaveBeenCalled();
    expect(db.tables.purchases).toHaveLength(0);
    expect(db.tables.paymentbeta_webhook_events[0].status).toBe('failed');
  });

  it('9) falha ao enviar ativação: status retryável (failed) + HTTP 500, nunca 200', async () => {
    const db = new FakeDb({ products: products() });
    const { client } = createClientMock(db);
    mocks.clientRef.current = client;
    mocks.sendActivationLink.mockRejectedValue(new Error('SMTP indisponível'));

    const res = await POST(signedRequest(vitalicioPayload()));

    expect(res.status).toBe(500);
    expect(mocks.sendActivationLink).toHaveBeenCalledTimes(1);
    expect(db.tables.paymentbeta_webhook_events[0].status).toBe('failed');
  });

  it('10) falha ao conceder acesso (produto ausente): status retryável (failed) + HTTP 500', async () => {
    const db = new FakeDb({
      products: [], // getProductId lança -> catch -> failed
      profiles: [{ id: 'u-1', email: 'cliente@x.com', activation_status: 'active', status: 'active' }],
    });
    const { client } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload({ customer: { email: 'cliente@x.com' } })));

    expect(res.status).toBe(500);
    expect(mocks.sendActivationLink).not.toHaveBeenCalled();
    expect(db.tables.paymentbeta_webhook_events[0].status).toBe('failed');
  });

  it('11) reenvio de evento legado user_not_found: reprocessa e faz onboarding (correção D4)', async () => {
    const db = new FakeDb({
      products: products(),
      paymentbeta_webhook_events: [
        {
          id: 'e-legacy',
          delivery_id: 'dlv-1',
          transaction_id: 'tx-1',
          event: 'sale.confirmed',
          status: 'user_not_found',
        },
      ],
    });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(signedRequest(vitalicioPayload()));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(createUserCalls).toHaveLength(1);
    expect(db.tables.purchases).toHaveLength(1);
    expect(db.tables.paymentbeta_webhook_events[0].status).toBe('processed');
    expect(db.tables.paymentbeta_webhook_events[0].user_created).toBe(true);
  });

  it('12) assinatura do assistente para comprador novo: cria subscription', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const expiresAt = new Date(nowSeconds() * 1000 + 365 * 24 * 60 * 60 * 1000).toISOString();
    const payload = vitalicioPayload({
      entitlement: { code: 'assistente-ia-pro', expires_at: expiresAt },
      customer: { email: 'assistente@x.com' },
    });

    const res = await POST(signedRequest(payload));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(createUserCalls).toHaveLength(1);
    expect(db.tables.subscriptions).toHaveLength(1);
    expect(db.tables.subscriptions[0].plan_slug).toBe('assistente-ia-pro');
  });

  it('13) assistente sem expires_at válido: invalid_payload 400 antes de criar usuário', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const res = await POST(
      signedRequest(
        vitalicioPayload({ entitlement: { code: 'assistente-ia-pro' }, customer: { email: 'semdata@x.com' } }),
      ),
    );
    const body = (await res.json()) as Body;

    expect(res.status).toBe(400);
    expect(body.status).toBe('invalid_payload');
    expect(createUserCalls).toHaveLength(0);
    expect(db.tables.subscriptions).toHaveLength(0);
    expect(db.tables.paymentbeta_webhook_events[0].status).toBe('invalid_payload');
  });

  it('14) comprador novo + psicoplanilhas-flow: cria usuário, grava purchase (prod-flow) e envia ativação', async () => {
    const db = new FakeDb({ products: products() });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const payload = vitalicioPayload({
      entitlement: { code: 'psicoplanilhas-flow' },
      customer: { email: 'flow@x.com' },
    });

    const res = await POST(signedRequest(payload));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(createUserCalls).toHaveLength(1);
    expect(mocks.sendActivationLink).toHaveBeenCalledTimes(1);
    // Concessão foi realmente gravada (não é sucesso silencioso).
    expect(db.tables.purchases).toHaveLength(1);
    expect(db.tables.purchases[0].product_id).toBe('prod-flow');
    expect(db.tables.purchases[0].payment_status).toBe('paid');
    // Flow NUNCA usa subscriptions.
    expect(db.tables.subscriptions).toHaveLength(0);
  });

  it('15) psicoplanilhas-flow reativa purchase cancelada sem duplicar', async () => {
    const db = new FakeDb({
      products: products(),
      profiles: [{ id: 'u-1', email: 'flow@x.com', activation_status: 'active', status: 'active' }],
      purchases: [
        {
          id: 'pf-1',
          user_id: 'u-1',
          product_id: 'prod-flow',
          payment_reference: 'ref-antiga',
          payment_status: 'cancelled',
        },
      ],
    });
    const { client, createUserCalls } = createClientMock(db);
    mocks.clientRef.current = client;

    const payload = vitalicioPayload({
      entitlement: { code: 'psicoplanilhas-flow' },
      customer: { email: 'flow@x.com' },
      delivery_id: 'dlv-flow',
      transaction_id: 'tx-flow',
    });

    const res = await POST(signedRequest(payload, { deliveryId: 'dlv-flow' }));
    const body = (await res.json()) as Body;

    expect(res.status).toBe(200);
    expect(body.status).toBe('processed');
    expect(createUserCalls).toHaveLength(0);
    // Reativou a linha existente (update), não inseriu outra.
    expect(db.tables.purchases).toHaveLength(1);
    expect(db.tables.purchases[0].id).toBe('pf-1');
    expect(db.tables.purchases[0].payment_status).toBe('paid');
    expect(db.tables.purchases[0].payment_reference).toBe('tx-flow');
    // Flow NUNCA usa subscriptions.
    expect(db.tables.subscriptions).toHaveLength(0);
  });
});
