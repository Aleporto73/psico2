import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guardas do card do CorrigeFácil no painel administrativo do cliente.
//
// A tela é Client Component com hooks e o Vitest deste repositório roda em
// `node`, sem DOM — então aqui se usa a leitura de fonte já praticada em
// corrigefacil/__tests__ e assistente-pro/__tests__. O alvo não é aparência:
// é a MÁQUINA DE ESTADOS comercial. O painel precisa distinguir três casos
// (sem acesso / manual / pago) e só o do meio pode ser revogado por aqui.
//
// A lógica de escrita é coberta por testes de comportamento em
// api/admin/clientes/[id]/action/__tests__/corrigefacil-acesso.test.ts.

const RAIZ = join(process.cwd(), 'src');
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');

/** Sem comentários: uma guarda de "a tela não faz X" não pode ser satisfeita
 *  (nem quebrada) pela explicação escrita ao lado do código. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Espaços colapsados: copy de UI quebra em várias linhas por largura de
 *  coluna, e a guarda não pode depender de onde o formatador quebrou. */
const frases = (fonte: string) => fonte.replace(/\s+/g, ' ');

const PAINEL = semComentarios(ler('app/admin/clientes/[id]/page.tsx'));
const TEXTO = frases(PAINEL);

/** Recorte do bloco do CorrigeFácil: do seu título até o do Assistente Pro.
 *  Sem esse recorte, uma guarda passaria por causa do card do Flow ao lado. */
const BLOCO = frases(
  PAINEL.slice(
    PAINEL.indexOf('Acesso ao CorrigeFácil'),
    PAINEL.indexOf('Assinatura do Assistente IA Pro'),
  ),
);

describe('painel admin — card do CorrigeFácil', () => {
  it('1) o painel consulta purchases pelo slug corrigefacil', () => {
    expect(TEXTO).toContain(".eq('products.slug', 'corrigefacil')");
    expect(TEXTO).toContain(".in('payment_status', ['paid', 'manual'])");
  });

  it('2) existe estado próprio corrigeFacilPurchase, sem reaproveitar o do Flow', () => {
    expect(TEXTO).toContain(
      'const [corrigeFacilPurchase, setCorrigeFacilPurchase] = useState<Purchase | null>(null);',
    );
    expect(TEXTO).toContain('setCorrigeFacilPurchase(corrigeFacilRows?.[0] ?? null);');

    // O card do CorrigeFácil não pode ler nem escrever o estado do Flow.
    expect(BLOCO).not.toContain('flowPurchase');
    expect(BLOCO).not.toContain('setFlowPurchase');
  });

  it('o estado do painel NÃO vem da RPC has_corrigefacil_access', () => {
    // A RPC devolve boolean e apagaria a distinção entre pago e manual, que é
    // justamente o que decide se o botão de revogar pode existir.
    expect(TEXTO).not.toContain('has_corrigefacil_access');
    expect(TEXTO).not.toContain('.rpc(');
  });

  it('5) o card fica entre o PsicoPlanilhas Flow e o Assistente IA Pro', () => {
    const vitalicio = PAINEL.indexOf('Acesso vitalício às planilhas');
    const flow = PAINEL.indexOf('Acesso ao PsicoPlanilhas Flow');
    const corrigefacil = PAINEL.indexOf('Acesso ao CorrigeFácil');
    const pro = PAINEL.indexOf('Assinatura do Assistente IA Pro');

    expect(vitalicio).toBeGreaterThan(-1);
    expect(flow).toBeGreaterThan(vitalicio);
    expect(corrigefacil).toBeGreaterThan(flow);
    expect(pro).toBeGreaterThan(corrigefacil);
  });

  it('o card traz título e descrição do produto', () => {
    expect(BLOCO).toContain('Acesso ao CorrigeFácil');
    expect(BLOCO).toContain(
      'Libera o acesso vitalício ao CorrigeFácil para correção digital de instrumentos.',
    );
  });
});

describe('painel admin — os três estados do CorrigeFácil', () => {
  it('3) sem acesso: badge "Sem acesso" e botão de liberar', () => {
    expect(BLOCO).toContain("'Sem acesso'");
    expect(BLOCO).toContain('Liberar acesso CorrigeFácil');
    expect(BLOCO).toContain("'liberar-corrigefacil'");
    expect(BLOCO).toContain('Liberar Acesso ao CorrigeFácil');
    expect(BLOCO).toContain(
      'Tem certeza que deseja liberar manualmente o acesso vitalício ao CorrigeFácil para este cliente?',
    );
  });

  it('4) e 6) o badge distingue "Liberado (manual)" de "Liberado (pago)"', () => {
    expect(BLOCO).toContain(
      "`Liberado (${corrigeFacilPurchase.payment_status === 'manual' ? 'manual' : 'pago'})`",
    );
  });

  it('5) acesso manual: oferece revogação, e a ação é cancelar-corrigefacil', () => {
    expect(BLOCO).toContain("corrigeFacilPurchase.payment_status === 'manual'");
    expect(BLOCO).toContain('Revogar acesso CorrigeFácil');
    expect(BLOCO).toContain("'cancelar-corrigefacil'");
    expect(BLOCO).toContain('Revogar Acesso ao CorrigeFácil');
    expect(BLOCO).toContain(
      'Tem certeza que deseja revogar o acesso manual ao CorrigeFácil para este cliente?',
    );
  });

  it('7) compra paga: nota discreta no lugar do botão, sem revogação administrativa', () => {
    expect(BLOCO).toContain("corrigeFacilPurchase.payment_status === 'paid'");
    expect(BLOCO).toContain(
      'Compra paga detectada. Alterações e cancelamento devem seguir o fluxo de pagamento oficial.',
    );

    // A prova de que o ramo `paid` não tem saída destrutiva: o único
    // 'cancelar-corrigefacil' do bloco está no ramo `manual`, que vem antes.
    const ramoManual = BLOCO.indexOf("corrigeFacilPurchase.payment_status === 'manual'");
    const ramoPago = BLOCO.indexOf("corrigeFacilPurchase.payment_status === 'paid'");
    expect(ramoManual).toBeGreaterThan(-1);
    expect(ramoPago).toBeGreaterThan(ramoManual);
    expect(BLOCO.indexOf("'cancelar-corrigefacil'")).toBeLessThan(ramoPago);
    expect(BLOCO.split("'cancelar-corrigefacil'")).toHaveLength(2);
  });
});
