import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { temAcessoCorrigeFacil, RPC_ACESSO, type ClienteDeAcesso } from '../../corrigefacil/access';

// Guardas da página comercial do Relatórios Pró, no padrão de leitura de
// fonte já usado em corrigefacil/__tests__ (o Vitest deste repositório roda
// em `node`, sem DOM).
//
// O que elas protegem é COMERCIAL e, sobretudo, de EXPOSIÇÃO. A página cita o
// CorrigeFácil para vender o fluxo conjunto. O produto já é público — aparece
// no menu para todos —, mas o DIREITO de usá-lo continua sendo pago: esta
// página não pode virar a porta dos fundos do gate nem oferecer o produto a
// quem já o tem.

const RAIZ = join(process.cwd(), 'src');
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');

/** Sem comentários: as guardas de "não diz X" precisam olhar o que vai à
 *  tela, não a explicação escrita ao lado. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Espaços colapsados: uma frase de UI quebra em várias linhas por causa da
 *  largura da coluna, e uma guarda de copy não pode depender de onde o
 *  formatador escolheu quebrar. */
const frases = (fonte: string) => fonte.replace(/\s+/g, ' ');

const PAGINA = semComentarios(ler('app/app/assistente-pro/page.tsx'));
const TEXTO = frases(PAGINA);
const APPSHELL = semComentarios(ler('app/app/AppShell.tsx'));
const ROTA_CORRIGEFACIL = semComentarios(ler('app/app/corrigefacil/page.tsx'));

/** Recorte do ramo SEM direito ao CorrigeFácil dentro de `copyIntegracao`.
 *  É o texto que chega a quem não tem o produto. */
const ramoSemAcesso = () =>
  TEXTO.slice(TEXTO.indexOf(': { heroTitulo:'), TEXTO.indexOf('}; } '));

describe('Relatórios Pró — posicionamento com o CorrigeFácil', () => {
  it('o hero traz a oferta, e ela não depende do outro produto', () => {
    expect(TEXTO).toContain(
      'Transforme resultados, gráficos e informações salvas no sistema em relatórios profissionais com muito mais agilidade.',
    );
    expect(TEXTO).toContain('R$57 uma única vez');
    expect(TEXTO).toContain('50 relatórios por mês durante 12 meses');
    expect(TEXTO).toContain('sem mensalidade');
  });

  // O Grátis existe e continua existindo. Uma página que só fala do pago dá
  // a entender que ele é a única saída.
  it('o hero não esconde que o Relatório Grátis continua disponível', () => {
    expect(TEXTO).toContain('O Relatório Grátis continua disponível.');
  });

  it('quem TEM o CorrigeFácil vê a comunicação integrada', () => {
    expect(TEXTO).toContain('Relatórios Pró — ideal para quem usa o CorrigeFácil');
    expect(TEXTO).toContain('Perfeito para os resultados do CorrigeFácil');
    expect(TEXTO).toContain(
      'Corrija no CorrigeFácil e transforme o resultado em relatório profissional com o Relatórios Pró.',
    );
    expect(TEXTO).toContain('avaliações já corrigidas');
    expect(TEXTO).toContain('gráficos quando disponíveis');
    expect(TEXTO).toContain('informações já salvas no sistema');
  });

  it('a oferta e a renovação continuam explícitas nos dois estados', () => {
    expect(TEXTO).toContain('você libera 50 relatórios por mês durante 12 meses');
    expect(TEXTO).toContain('Todo mês, sua franquia volta para 50.');
    // e o enquadramento antigo, que vendia pelo limite do Grátis, saiu
    expect(TEXTO).not.toContain('Quando o Grátis não é suficiente');
    expect(TEXTO).not.toContain('permite poucos usos por mês');
  });

  it('os quatro cards falam de volume, preço, reaproveitamento e registro', () => {
    for (const titulo of [
      '50 por mês',
      'Pagamento único',
      'Aproveite os resultados',
      'Fica tudo salvo',
    ]) {
      expect(TEXTO, titulo).toContain(titulo);
    }
    expect(TEXTO).toContain(
      'Use informações já registradas no sistema para agilizar a montagem.',
    );
    expect(TEXTO).toContain(
      'Os relatórios ficam registrados e acessíveis quando precisar.',
    );
    // nenhum card nomeia o outro produto: eles valem nos dois estados
    for (const card of [
      'Use informações já registradas no sistema para agilizar a montagem.',
      'Os relatórios ficam registrados e acessíveis quando precisar.',
    ]) {
      expect(card).not.toContain('CorrigeFácil');
    }
  });

  // O card "100% seguro" saiu da grade, mas a afirmação é sobre o produto e
  // era o único lugar do sistema que a fazia. Ela desceu para a microcopy.
  it('a garantia de segurança não sumiu junto com o card', () => {
    expect(TEXTO).toContain('nenhum dado é retido pela IA');
  });
});

// ── A trava principal desta entrega ────────────────────────────────────
describe('Relatórios Pró — o CorrigeFácil em fase de testes não vaza', () => {
  it('1) sem direito, nenhum caminho para /app/corrigefacil é renderizado', () => {
    // O Link vive DENTRO da condicional, e é o único do bloco comercial.
    expect(PAGINA).toContain('{hasCorrigeFacilAccess && (');
    const semCondicional = PAGINA.replace(
      /\{hasCorrigeFacilAccess && \([\s\S]*?\)\}/g,
      '',
    );
    expect(semCondicional).not.toContain('ROTA_CORRIGEFACIL}');
    expect(semCondicional).not.toContain('Abrir CorrigeFácil');
    // e não existe segunda rota de descoberta escondida em outro formato
    const rotas = PAGINA.match(/['"]\/app\/corrigefacil['"]/g) ?? [];
    expect(rotas).toHaveLength(1);
    expect(PAGINA).toContain("const ROTA_CORRIGEFACIL = '/app/corrigefacil'");
  });

  it('1b) sem direito, o produto nem sequer é NOMEADO', () => {
    // Citar o nome já seria descoberta. O ramo sem acesso é neutro.
    const semAcesso = ramoSemAcesso();
    expect(semAcesso.length).toBeGreaterThan(0);
    expect(semAcesso).not.toContain('CorrigeFácil');
    expect(semAcesso).toContain('Relatórios Pró — pague uma vez, use o ano todo');
    expect(semAcesso).toContain('Potencialize seus resultados com o Relatórios Pró');
    // a separação comercial continua dita, sem nomear o outro produto
    expect(semAcesso).toContain('Relatórios Pró é um produto contratado à parte.');
  });

  it('2) com direito, o CTA existe e assume que a ferramenta já é da pessoa', () => {
    expect(TEXTO).toContain('Abrir CorrigeFácil');
    expect(PAGINA).toContain('href={ROTA_CORRIGEFACIL}');
    // "Conhecer"/"Comprar" seriam oferta; quem tem acesso não recebe oferta
    expect(TEXTO).not.toContain('Conhecer o CorrigeFácil');
    expect(TEXTO).not.toContain('Comprar o CorrigeFácil');
  });

  it('3) o direito vem do helper existente, não de regra reescrita', () => {
    expect(PAGINA).toContain(
      "import { temAcessoCorrigeFacil, type ClienteDeAcesso } from '../corrigefacil/access'",
    );
    expect(PAGINA).toContain('temAcessoCorrigeFacil(cliente as unknown as ClienteDeAcesso)');
    // nada de consultar compra, entitlement ou a RPC à mão
    expect(PAGINA).not.toContain("from('purchases')");
    expect(PAGINA).not.toContain("rpc('has_corrigefacil_access'");
    expect(PAGINA).not.toContain('has_corrigefacil_access');
    expect(PAGINA).not.toContain('products_public');
    // e o helper continua sendo o mesmo que a ROTA usa — o layout deixou de
    // consultá-lo quando o item do menu virou público
    expect(ROTA_CORRIGEFACIL).toContain('temAcessoCorrigeFacil');
  });

  it('4) fail-closed: começa negado e erro não abre o caminho', () => {
    // o estado nasce `false`, então o CTA não pisca antes do gate responder
    expect(PAGINA).toContain('useState(false)');
    expect(PAGINA).toContain('setHasCorrigeFacilAccess(false)');
    const efeito = PAGINA.slice(
      PAGINA.indexOf('temAcessoCorrigeFacil(cliente'),
      PAGINA.indexOf('// ── Fetch Reports') > -1
        ? PAGINA.indexOf('// ── Fetch Reports')
        : PAGINA.length,
    );
    expect(efeito).toContain('.catch(');
    expect(efeito).toContain('setHasCorrigeFacilAccess(false)');
  });

  // O helper já é fail-closed; esta é a prova de que continua sendo, porque
  // é dele que depende a decisão de mostrar ou não o caminho.
  it('4b) o helper nega em todos os caminhos de falha', async () => {
    const cliente = (over: Partial<ClienteDeAcesso> = {}): ClienteDeAcesso => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
      rpc: async () => ({ data: true, error: null }),
      ...over,
    });

    expect(RPC_ACESSO).toBe('has_corrigefacil_access');
    // caminho feliz
    expect(await temAcessoCorrigeFacil(cliente())).toBe(true);
    // sem usuário
    expect(
      await temAcessoCorrigeFacil(
        cliente({ auth: { getUser: async () => ({ data: { user: null } }) } }),
      ),
    ).toBe(false);
    // erro de RPC
    expect(
      await temAcessoCorrigeFacil(
        cliente({ rpc: async () => ({ data: null, error: { message: 'x' } }) }),
      ),
    ).toBe(false);
    // qualquer coisa que não seja exatamente `true`
    for (const data of [null, undefined, 1, 'true', {}]) {
      expect(
        await temAcessoCorrigeFacil(cliente({ rpc: async () => ({ data, error: null }) })),
      ).toBe(false);
    }
  });

  it('5) o gate do CorrigeFácil permanece intocado por esta página', () => {
    // O item do menu deixou de ser condicionado ao direito: o CorrigeFácil é
    // público desde a liberação comercial. O que esta página não pode fazer é
    // reimplementar ou afrouxar o gate da ROTA, que é onde ele mora.
    expect(APPSHELL).toContain("path: '/app/corrigefacil'");
    expect(APPSHELL).not.toContain('hasCorrigeFacilAccess');
    expect(PAGINA).not.toContain('CorrigeFacilLocked');
    expect(PAGINA).not.toContain('CorrigeFacilCatalogClient');
  });
});

describe('Relatórios Pró — CTAs e checkout', () => {
  it('o CTA principal usa o checkout que já existia, sem inventar URL', () => {
    expect(TEXTO).toContain('Quero liberar 50 relatórios por mês');
    expect(PAGINA).toContain(
      "const CHECKOUT_URL_IA_PRO = 'https://www.payment.eng.br/checkout?product=MCGNKAAY&price=74F2T5WL'",
    );
    expect(PAGINA).toContain(
      "window.open(CHECKOUT_URL_IA_PRO, '_blank', 'noopener,noreferrer')",
    );
    // nenhuma segunda URL de pagamento nasceu nesta página
    const urls = PAGINA.match(/https?:\/\/www\.payment\.eng\.br[^'"`\s]*/g) ?? [];
    expect(new Set(urls).size).toBe(1);
  });

  it('o CTA do CorrigeFácil não abre checkout do outro produto', () => {
    expect(PAGINA).not.toContain('CHECKOUT_URL_CORRIGEFACIL');
    expect(PAGINA).not.toContain('product=CXMVG9JG');
  });
});

describe('Relatórios Pró — travas de verdade', () => {
  // Cross-sell, nunca bundle: são duas compras.
  it('em nenhum lugar promete que um produto inclui o outro', () => {
    const texto = TEXTO.toLowerCase();
    for (const proibido of [
      'incluído no corrigefácil',
      'incluso no corrigefácil',
      'incluído no relatórios pró',
      'corrigefácil incluído',
      'corrigefácil incluso',
      'vem junto com o corrigefácil',
      'grátis com o corrigefácil',
      'já vem com',
      'sem custo adicional',
      'os dois por r$',
      'combo',
    ]) {
      expect(texto, proibido).not.toContain(proibido);
    }
  });

  it('a separação comercial está dita nos dois estados', () => {
    expect(TEXTO).toContain('Relatórios Pró é contratado à parte do CorrigeFácil.');
    expect(TEXTO).toContain('Relatórios Pró é um produto contratado à parte.');
  });

  // Nem os 21 instrumentos do CorrigeFácil têm gráfico.
  it('não promete gráfico para todo instrumento nem automação sem revisão', () => {
    const texto = TEXTO.toLowerCase();
    for (const proibido of [
      'gráfico para todos',
      'gráficos para todos',
      'gráfico em todos',
      'gráficos em todos',
      'todos os instrumentos',
      'sem revisão',
      'pronto para entrega',
      'laudo automático',
      'diagnóstico automático',
    ]) {
      expect(texto, proibido).not.toContain(proibido);
    }
    expect(TEXTO).toContain('gráficos quando disponíveis');
  });

  it('o aviso de uso responsável continua na página', () => {
    expect(TEXTO).toContain('Aviso de uso responsável');
    expect(TEXTO).toContain('revisado, completado e interpretado pelo profissional responsável');
    expect(TEXTO).toContain(
      'substitui a avaliação, diagnóstico ou interpretação de um profissional qualificado',
    );
  });

  it('o acesso ao próprio Relatórios Pró continua vindo de onde vinha', () => {
    expect(PAGINA).toContain('has_active_assistant');
    expect(PAGINA).toContain("assistantState = 'blocked'");
    expect(PAGINA).toContain("assistantState = 'active'");
    expect(PAGINA).toContain("assistantState = 'expired'");
  });
});
