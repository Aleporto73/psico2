import { beforeEach, describe, expect, it, vi } from 'vitest';

// Guardas da liberação/revogação MANUAL do CorrigeFácil pelo admin.
//
// O que está sendo protegido aqui é comercial, não visual: o CorrigeFácil é
// vendido por pagamento único e gravado em `purchases`. O admin pode CRIAR e
// REVOGAR acesso manual — e só isso. Uma compra `paid` é dinheiro que entrou
// pelo checkout: ela nunca pode ser cancelada por esta tela, nem duplicada,
// nem fabricada. Por isso os testes abaixo olham o ESTADO das linhas e os
// FILTROS aplicados no update, não a resposta HTTP sozinha.
//
// O gate (`has_corrigefacil_access`) não é tocado por esta rota: ele lê
// `purchases` + `products.is_active` + `profiles.status`. A rota só mexe na
// primeira das três pontas.

const mocks = vi.hoisted(() => ({
  clientRef: { current: null as unknown },
  verifyAdmin: vi.fn(),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mocks.clientRef.current,
}));

vi.mock('@/utils/supabase/admin-auth', () => ({
  verifyAdmin: () => mocks.verifyAdmin(),
}));

import { POST } from '../route';

// --- Supabase falso, em memória ---------------------------------------------

type Row = Record<string, unknown>;
type Filtro = { tipo: 'eq' | 'in'; col: string; val: unknown };
type Resultado = { data: Row | Row[] | null; error: { message: string } | null };
type Operacao = { tabela: string; op: string; valores?: Row; filtros: Filtro[] };

const ADMIN_ID = 'admin-1';
const CLIENTE_ID = 'cliente-1';
const PROD_CORRIGEFACIL = 'prod-corrigefacil';
const PROD_FLOW = 'prod-flow';

class Consulta implements PromiseLike<Resultado> {
  private op: 'select' | 'insert' | 'update' = 'select';
  private valores: Row | undefined;
  private filtros: Filtro[] = [];
  private limiteN: number | undefined;

  constructor(private banco: Banco, private tabela: string) {}

  private linhas(): Row[] {
    this.banco.tabelas[this.tabela] ??= [];
    return this.banco.tabelas[this.tabela];
  }

  select(_colunas?: string): this {
    void _colunas;
    return this;
  }
  insert(v: Row): this {
    this.op = 'insert';
    this.valores = v;
    return this;
  }
  update(v: Row): this {
    this.op = 'update';
    this.valores = v;
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filtros.push({ tipo: 'eq', col, val });
    return this;
  }
  in(col: string, val: unknown[]): this {
    this.filtros.push({ tipo: 'in', col, val });
    return this;
  }
  order(): this {
    return this;
  }
  limit(n: number): this {
    this.limiteN = n;
    return this;
  }

  private filtrar(linhas: Row[]): Row[] {
    return linhas.filter((linha) =>
      this.filtros.every((f) =>
        f.tipo === 'in' ? (f.val as unknown[]).includes(linha[f.col]) : linha[f.col] === f.val,
      ),
    );
  }

  private executar(): Resultado {
    this.banco.operacoes.push({
      tabela: this.tabela,
      op: this.op,
      valores: this.valores,
      filtros: this.filtros,
    });

    if (this.op === 'insert') {
      const linha: Row = { id: this.tabela + '-' + this.banco.proximoId(), ...this.valores };
      this.linhas().push(linha);
      return { data: linha, error: null };
    }
    if (this.op === 'update') {
      for (const linha of this.filtrar(this.linhas())) Object.assign(linha, this.valores ?? {});
      return { data: null, error: null };
    }
    const encontradas = this.filtrar(this.linhas());
    return {
      data: this.limiteN != null ? encontradas.slice(0, this.limiteN) : encontradas,
      error: null,
    };
  }

  async maybeSingle(): Promise<Resultado> {
    const r = this.executar();
    return Array.isArray(r.data) ? { data: r.data[0] ?? null, error: r.error } : r;
  }

  async single(): Promise<Resultado> {
    const r = await this.maybeSingle();
    return { data: r.data, error: r.data ? r.error : { message: 'No rows found' } };
  }

  then<T1 = Resultado, T2 = never>(
    ok?: ((v: Resultado) => T1 | PromiseLike<T1>) | null,
    falha?: ((m: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return Promise.resolve(this.executar()).then(ok, falha);
  }
}

class Banco {
  tabelas: Record<string, Row[]>;
  operacoes: Operacao[] = [];
  private seq = 0;

  constructor(semente: Partial<Record<string, Row[]>> = {}) {
    this.tabelas = {
      profiles: [{ id: CLIENTE_ID, email: 'cliente@teste.com', role: 'user', status: 'active' }],
      products: [
        { id: PROD_CORRIGEFACIL, slug: 'corrigefacil' },
        { id: PROD_FLOW, slug: 'psicoplanilhas-flow' },
        { id: 'prod-vitalicio', slug: 'psicoplanilhas-vitalicio' },
        { id: 'prod-pro', slug: 'assistente-ia-pro' },
      ],
      purchases: [],
      admin_logs: [],
      ...semente,
    } as Record<string, Row[]>;
  }

  proximoId(): number {
    this.seq += 1;
    return this.seq;
  }

  cliente() {
    return {
      from: (tabela: string) => new Consulta(this, tabela),
      auth: { resetPasswordForEmail: async () => ({ data: {}, error: null }) },
    };
  }

  compras(): Row[] {
    return this.tabelas.purchases;
  }

  logs(): Row[] {
    return this.tabelas.admin_logs;
  }
}

function compraCorrigeFacil(payment_status: string, extra: Row = {}): Row {
  return {
    id: 'compra-' + payment_status,
    user_id: CLIENTE_ID,
    product_id: PROD_CORRIGEFACIL,
    payment_status,
    source: 'paymentbeta',
    ...extra,
  };
}

async function chamar(action: string, banco: Banco) {
  mocks.clientRef.current = banco.cliente();
  const request = new Request('http://localhost/api/admin/clientes/' + CLIENTE_ID + '/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  const resposta = await POST(request, { params: Promise.resolve({ id: CLIENTE_ID }) });
  return { resposta, corpo: (await resposta.json()) as { message: string } };
}

/** Só as operações de escrita — é onde mora o risco. */
const escritas = (banco: Banco, tabela: string) =>
  banco.operacoes.filter((o) => o.tabela === tabela && o.op !== 'select');

beforeEach(() => {
  mocks.verifyAdmin.mockResolvedValue({
    error: null,
    status: 200,
    user: { id: ADMIN_ID },
    profile: { id: ADMIN_ID, role: 'admin', status: 'active' },
  });
});

describe('liberar-corrigefacil', () => {
  it('8) a ação existe: não cai no default de ação desconhecida', async () => {
    const banco = new Banco();
    const { resposta, corpo } = await chamar('liberar-corrigefacil', banco);

    expect(resposta.status).toBe(200);
    expect(corpo.message).toBe('Acesso ao CorrigeFácil liberado com sucesso!');
  });

  it('11) sem compra alguma: cria purchase manual com source admin', async () => {
    const banco = new Banco();
    await chamar('liberar-corrigefacil', banco);

    expect(banco.compras()).toHaveLength(1);
    expect(banco.compras()[0]).toMatchObject({
      user_id: CLIENTE_ID,
      product_id: PROD_CORRIGEFACIL,
      payment_status: 'manual',
      source: 'admin',
    });
  });

  it('9) já existe acesso manual: não duplica purchase', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('manual', { source: 'admin' })] });
    await chamar('liberar-corrigefacil', banco);

    expect(banco.compras()).toHaveLength(1);
    expect(escritas(banco, 'purchases')).toHaveLength(0);
  });

  it('9) já existe compra paga: não duplica nem rebaixa a compra para manual', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('paid')] });
    await chamar('liberar-corrigefacil', banco);

    expect(banco.compras()).toHaveLength(1);
    expect(banco.compras()[0].payment_status).toBe('paid');
    expect(banco.compras()[0].source).toBe('paymentbeta');
    expect(escritas(banco, 'purchases')).toHaveLength(0);
  });

  it('10) purchase antiga cancelada: reativa a MESMA linha como manual, sem criar outra', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('cancelled')] });
    await chamar('liberar-corrigefacil', banco);

    expect(banco.compras()).toHaveLength(1);
    expect(banco.compras()[0].id).toBe('compra-cancelled');
    expect(banco.compras()[0].payment_status).toBe('manual');

    const update = escritas(banco, 'purchases');
    expect(update).toHaveLength(1);
    expect(update[0].op).toBe('update');
    expect(update[0].valores).toEqual({ payment_status: 'manual' });
  });

  it('10) reativação nunca ressuscita como paid: o admin não fabrica compra paga', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('refunded')] });
    await chamar('liberar-corrigefacil', banco);

    expect(banco.compras()[0].payment_status).toBe('manual');
    for (const op of escritas(banco, 'purchases')) {
      expect(JSON.stringify(op.valores)).not.toContain('paid');
    }
  });

  it('só mexe no produto corrigefacil: compras de outros produtos ficam intactas', async () => {
    const outro: Row = {
      id: 'compra-flow',
      user_id: CLIENTE_ID,
      product_id: PROD_FLOW,
      payment_status: 'cancelled',
    };
    const banco = new Banco({ purchases: [outro] });
    await chamar('liberar-corrigefacil', banco);

    expect(banco.compras().find((c) => c.id === 'compra-flow')?.payment_status).toBe('cancelled');
    expect(banco.compras()).toHaveLength(2);
  });

  it('produto corrigefacil ausente no ambiente: 400 limpo, sem escrever nada', async () => {
    const banco = new Banco();
    banco.tabelas.products = banco.tabelas.products.filter((p) => p.slug !== 'corrigefacil');

    const { resposta, corpo } = await chamar('liberar-corrigefacil', banco);

    expect(resposta.status).toBe(400);
    expect(corpo.message).toBe('Produto corrigefacil não cadastrado.');
    expect(banco.compras()).toHaveLength(0);
    expect(banco.logs()).toHaveLength(0);
  });

  it('15) registra admin_log com product_slug corrigefacil', async () => {
    const banco = new Banco();
    await chamar('liberar-corrigefacil', banco);

    expect(banco.logs()).toHaveLength(1);
    expect(banco.logs()[0]).toMatchObject({
      admin_id: ADMIN_ID,
      action: 'liberar acesso corrigefacil',
      target_table: 'purchases',
      target_id: CLIENTE_ID,
      metadata: { product_slug: 'corrigefacil' },
    });
  });
});

describe('cancelar-corrigefacil', () => {
  it('a ação existe e revoga o acesso manual', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('manual', { source: 'admin' })] });
    const { resposta, corpo } = await chamar('cancelar-corrigefacil', banco);

    expect(resposta.status).toBe(200);
    expect(corpo.message).toBe('Acesso manual ao CorrigeFácil revogado com sucesso!');
    expect(banco.compras()[0].payment_status).toBe('cancelled');
  });

  it('12) o update filtra EXATAMENTE payment_status = manual', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('manual')] });
    await chamar('cancelar-corrigefacil', banco);

    const update = escritas(banco, 'purchases');
    expect(update).toHaveLength(1);
    expect(update[0].valores).toEqual({ payment_status: 'cancelled' });
    expect(update[0].filtros).toEqual([
      { tipo: 'eq', col: 'user_id', val: CLIENTE_ID },
      { tipo: 'eq', col: 'product_id', val: PROD_CORRIGEFACIL },
      { tipo: 'eq', col: 'payment_status', val: 'manual' },
    ]);
  });

  it('13) compra paga NUNCA entra no update: continua paid após a tentativa', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('paid')] });
    await chamar('cancelar-corrigefacil', banco);

    expect(banco.compras()[0].payment_status).toBe('paid');

    // A garantia estrutural: nenhum filtro do update aceita 'paid'.
    for (const op of escritas(banco, 'purchases')) {
      const porStatus = op.filtros.filter((f) => f.col === 'payment_status');
      expect(porStatus).toEqual([{ tipo: 'eq', col: 'payment_status', val: 'manual' }]);
    }
  });

  it('13) cliente com compra paga E linha manual: só a manual é cancelada', async () => {
    const banco = new Banco({
      purchases: [compraCorrigeFacil('paid'), compraCorrigeFacil('manual', { id: 'compra-manual' })],
    });
    await chamar('cancelar-corrigefacil', banco);

    const porId = Object.fromEntries(banco.compras().map((c) => [c.id, c.payment_status]));
    expect(porId['compra-paid']).toBe('paid');
    expect(porId['compra-manual']).toBe('cancelled');
  });

  it('15) registra admin_log de revogação com product_slug corrigefacil', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('manual')] });
    await chamar('cancelar-corrigefacil', banco);

    expect(banco.logs()).toHaveLength(1);
    expect(banco.logs()[0]).toMatchObject({
      admin_id: ADMIN_ID,
      action: 'cancelar acesso corrigefacil',
      target_table: 'purchases',
      target_id: CLIENTE_ID,
      metadata: { product_slug: 'corrigefacil' },
    });
  });
});

describe('14) cancelar-corrigefacil é ação destrutiva', () => {
  it('admin não revoga o próprio acesso', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('manual')] });
    mocks.verifyAdmin.mockResolvedValue({
      error: null,
      status: 200,
      user: { id: CLIENTE_ID },
      profile: { id: CLIENTE_ID, role: 'admin', status: 'active' },
    });

    const { resposta } = await chamar('cancelar-corrigefacil', banco);

    expect(resposta.status).toBe(403);
    expect(banco.compras()[0].payment_status).toBe('manual');
    expect(escritas(banco, 'purchases')).toHaveLength(0);
  });

  it('conta admin alvo continua protegida por esta tela', async () => {
    const banco = new Banco({ purchases: [compraCorrigeFacil('manual')] });
    banco.tabelas.profiles = [
      { id: CLIENTE_ID, email: 'outro@admin.com', role: 'admin', status: 'active' },
    ];

    const { resposta } = await chamar('cancelar-corrigefacil', banco);

    expect(resposta.status).toBe(403);
    expect(banco.compras()[0].payment_status).toBe('manual');
  });

  it('liberar-corrigefacil NÃO é destrutiva: funciona para um alvo admin', async () => {
    const banco = new Banco();
    banco.tabelas.profiles = [
      { id: CLIENTE_ID, email: 'outro@admin.com', role: 'admin', status: 'active' },
    ];

    const { resposta } = await chamar('liberar-corrigefacil', banco);

    expect(resposta.status).toBe(200);
    expect(banco.compras()).toHaveLength(1);
  });
});
