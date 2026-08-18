// PR4 · A FIAÇÃO: quem passa a prop, qual copy entra, e o que NÃO mudou.
//
// A decisão em si é provada caso a caso em free-demo-view.test.ts. Aqui se
// prova o contrato dos arquivos — no padrão de leitura de fonte já usado em
// report-ux.test.ts e fdt-free-ux.test.ts.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(caminho: string) {
  return readFileSync(join(process.cwd(), caminho), 'utf8');
}

function semComentarios(tsx: string) {
  return tsx
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const PAINEL = source('src/app/app/corrigefacil/CorrigeFacilReportPanel.tsx');
const PAINEL_CODIGO = semComentarios(PAINEL);
const DETALHE = source('src/app/app/corrigefacil/avaliacoes/[id]/DetalheClient.tsx');
const AVALIAR = source('src/app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx');
const MIGRATION = source(
  'supabase/migrations/20260820120000_corrigefacil_free_demo_report_status.sql',
);
const MIGRATION_PR3 = source(
  'supabase/migrations/20260819120000_relatorio_pro_free_demo_backend.sql',
);
const SQL = MIGRATION.replace(/^\s*--.*$/gm, '').toLowerCase();

// =====================================================================
// 1 · A TRAVA DO FUNIL — o primeiro contato não muda
//
// Esta é a decisão de PRODUTO que o PR4 não pode encostar: quem acabou de
// corrigir o FDT gratuito ainda não comprou o CorrigeFácil, e oferecer o
// Relatório Pró ali seria pedir a segunda compra antes da primeira.
//
// A tela do resultado imediato continua mostrando a oferta do CorrigeFácil
// completo, e continua NÃO montando o painel no ramo gratuito.
// =====================================================================
describe('PR4 · o primeiro contato continua intocado', () => {
  it('modoDemo segue renderizando a oferta do CorrigeFácil, e não o painel', () => {
    expect(AVALIAR).toContain('{modoDemo ? (');
    expect(AVALIAR).toContain('<OfertaCorrigeFacilCompleto');

    const inicio = AVALIAR.indexOf('{modoDemo ? (');
    const fim = AVALIAR.indexOf('<CorrigeFacilReportPanel', inicio);
    const ramoDemo = AVALIAR.slice(inicio, fim);

    expect(ramoDemo).toContain('<OfertaCorrigeFacilCompleto');
    expect(ramoDemo).not.toContain('<CorrigeFacilReportPanel');
  });

  it('a tela do resultado NÃO liga o contexto da demonstração', () => {
    // Sem a prop, `decidirOferta` devolve o comportamento anterior para
    // qualquer estado — está provado em free-demo-view.test.ts.
    expect(AVALIAR).not.toContain('freeDemoContext');
  });

  it('nenhuma copy de demonstração vazou para a tela do resultado', () => {
    // Sobre a fonte SEM comentários: o arquivo já explicava `modoDemo` com a
    // palavra "demonstração" antes deste PR, e comentário não é tela.
    const visivel = semComentarios(AVALIAR);
    for (const proibido of [
      'Gerar relatório grátis',
      'relatório gratuito',
      'gratuitamente',
      'Experimente o Relatório Pró',
      '1 relatório gratuito por conta',
    ]) {
      expect(visivel, proibido).not.toContain(proibido);
    }
  });
});

// =====================================================================
// 2 · O SEGUNDO CONTATO
// =====================================================================
describe('PR4 · a avaliação salva é onde a oferta aparece', () => {
  it('DetalheClient liga o contexto', () => {
    expect(DETALHE).toContain(
      '<CorrigeFacilReportPanel assessmentId={d.assessment_id} freeDemoContext />',
    );
  });

  it('a prop não autoriza nada e não conhece instrumento', () => {
    // O instrumento elegível é decidido pela RPC, por `is_free_demo`. Testar
    // o código aqui amarraria o funil ao FDT e quebraria no dia em que outro
    // instrumento for marcado como gratuito.
    expect(PAINEL_CODIGO).not.toContain("'FDT'");
    expect(PAINEL_CODIGO).not.toContain('is_free_demo');
    expect(DETALHE).not.toContain("=== 'FDT'");
  });
});

// =====================================================================
// 3 · A COPY APROVADA
// =====================================================================
describe('PR4 · a copy dos quatro estados', () => {
  it('disponível', () => {
    expect(PAINEL).toContain('Experimente o Relatório Pró gratuitamente.');
    expect(PAINEL).toContain(
      'Gere 1 relatório profissional a partir desta avaliação e veja',
    );
    expect(PAINEL).toContain('1 relatório gratuito por conta · sem cobrança.');
    expect(PAINEL).toContain('Gerar relatório grátis');
  });

  it('já usada — e o checkout é o de sempre', () => {
    expect(PAINEL).toContain('Você já experimentou o Relatório Pró.');
    expect(PAINEL).toContain(
      'Continue transformando suas avaliações em relatórios',
    );
    expect(PAINEL).toContain('50 relatórios por mês durante 12 meses · R$57 — pagamento único.');
    expect(PAINEL).toContain('Desbloquear Relatórios Pro');
    expect(PAINEL).toContain('CHECKOUT_URL_IA_PRO');
  });

  it('em andamento', () => {
    expect(PAINEL).toContain('Seu relatório gratuito está sendo processado.');
    expect(PAINEL).toContain('Já existe uma geração em andamento.');
    expect(PAINEL).toContain('Verificar novamente');
  });

  it('erro de verificação — sem promessa nenhuma', () => {
    expect(PAINEL).toContain(
      'Não foi possível verificar sua demonstração gratuita agora.',
    );
    expect(PAINEL).toContain('Tentar novamente');
  });

  it('o checkout NÃO concorre como CTA principal no card da demonstração', () => {
    // Duas ofertas primárias na mesma tela não convertem nem uma. A esteira
    // é experimentar → ver valor → comprar.
    const inicio = PAINEL.indexOf("{oferta === 'demo_disponivel' && (");
    const fim = PAINEL.indexOf("{oferta === 'demo_andamento' && (");
    const bloco = PAINEL.slice(inicio, fim);

    expect(inicio).toBeGreaterThan(-1);
    expect(bloco).toContain('Gerar relatório grátis');
    expect(bloco).not.toContain('Desbloquear Relatórios Pro');
    expect(bloco).not.toContain('goToCheckout');
    expect(bloco).not.toContain('R$57');
  });
});

// =====================================================================
// 4 · O QUE A TELA NÃO PODE FAZER
// =====================================================================
describe('PR4 · a tela não decide nada comercial', () => {
  it('o POST continua com os mesmos quatro campos', () => {
    expect(PAINEL).toContain("source: 'corrigefacil'");
    expect(PAINEL).toContain('assessmentId: id');
    expect(PAINEL).toContain('reportType,');
    expect(PAINEL).toContain('additionalNotes: additionalNotes.trim()');
  });

  it('o cliente NÃO manda origem, estado nem flag de demonstração', () => {
    // O servidor decide tudo. Um campo destes no corpo seria o cliente
    // escolhendo como ser cobrado.
    for (const proibido of [
      'billing_origin',
      'generation_status',
      'free_demo:',
      'demo: true',
      'freeDemo:',
      'isDemo',
    ]) {
      expect(PAINEL_CODIGO, proibido).not.toContain(proibido);
    }
  });

  it('a tela NUNCA chama reserve, complete ou release', () => {
    // Reservar pela tela gastaria a chance de quem apenas ABRIU a avaliação.
    for (const proibida of [
      'reserve_corrigefacil_free_demo_report',
      'complete_corrigefacil_free_demo_report',
      'release_corrigefacil_free_demo_report',
    ]) {
      expect(PAINEL_CODIGO, proibida).not.toContain(proibida);
    }
  });

  it('a única RPC é a de status, e é READ-ONLY', () => {
    const rpcs = PAINEL_CODIGO.match(/supabase\.rpc\(\s*'([a-z_]+)'/g) ?? [];
    expect(rpcs).toHaveLength(1);
    expect(rpcs[0]).toContain('corrigefacil_free_demo_report_status');
  });

  it('um POST no arquivo inteiro, e nenhum retry automático', () => {
    const posts = PAINEL_CODIGO.match(/method:\s*'POST'/g) ?? [];
    expect(posts).toHaveLength(1);

    // Nada de repetição por relógio.
    expect(PAINEL_CODIGO).not.toContain('setInterval(');

    // O único timer do arquivo é o flash de "Copiado", e ele não gera nada.
    const timers = PAINEL_CODIGO.match(/setTimeout\(/g) ?? [];
    expect(timers).toHaveLength(1);
    expect(PAINEL_CODIGO).toContain('window.setTimeout(() => setCopiado(false), 1800)');

    // `generateReport` aparece duas vezes: a definição e UM onClick. Nenhuma
    // terceira referência — nada a chama de dentro de um timer ou de um efeito.
    const usos = PAINEL_CODIGO.match(/generateReport/g) ?? [];
    expect(usos).toHaveLength(2);
    expect(PAINEL_CODIGO).toContain('onClick={generateReport}');
  });

  it('nada de localStorage, cookie ou flag de sessão', () => {
    // Na volta do documento, o banco volta a ser a verdade.
    for (const proibido of ['localStorage', 'sessionStorage', 'document.cookie']) {
      expect(PAINEL_CODIGO, proibido).not.toContain(proibido);
    }
  });

  it('o 503 leva ao estado indeterminado, e não a um novo POST', () => {
    expect(PAINEL_CODIGO).toContain('acaoAposFalhaDaDemo(response.status)');
    expect(PAINEL_CODIGO).toContain("setDemo('indeterminado')");
  });

  it('sucesso da demonstração não vira assinatura nem soma na cota', () => {
    expect(PAINEL_CODIGO).toContain("setDemo('already_used')");
    // a cota continua sendo LIDA da resposta, nunca calculada aqui
    expect(PAINEL_CODIGO).toContain('body.monthly_count');
    expect(PAINEL_CODIGO).not.toContain('monthly_count:');
  });

  it('o sucesso navega para o documento canônico, igual ao pago', () => {
    expect(PAINEL_CODIGO).toContain(
      '`/app/corrigefacil/avaliacoes/${encodeURIComponent(id)}/relatorios/${encodeURIComponent(report.id)}`',
    );
  });
});

// =====================================================================
// 5 · O DOCUMENTO E A LISTA NÃO GANHAM NADA COMERCIAL
// =====================================================================
describe('PR4 · o relatório entregue é o produto real', () => {
  it('a lista da avaliação não ganha selo de gratuidade', () => {
    const inicio = PAINEL.indexOf('Relatórios desta avaliação');
    const fim = PAINEL.indexOf('{reportsLoading &&');
    const lista = PAINEL.slice(inicio, fim);

    for (const proibido of ['GRÁTIS', 'Grátis', 'gratuito', 'demonstração', 'badge']) {
      expect(lista, proibido).not.toContain(proibido);
    }
  });

  it('o documento canônico não foi tocado por este PR', () => {
    const doc = source(
      'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]/RelatorioDocumentClient.tsx',
    );
    for (const proibido of [
      'billing_origin',
      'free_demo',
      'gratuito',
      'demonstração',
      'Desbloquear',
      'R$57',
    ]) {
      expect(doc, proibido).not.toContain(proibido);
    }
  });
});

// =====================================================================
// 6 · A MIGRATION
// =====================================================================
describe('PR4 · a RPC de status', () => {
  it('existe, é STABLE, SECURITY DEFINER e tem search_path fixo', () => {
    expect(SQL).toContain(
      'create or replace function public.corrigefacil_free_demo_report_status',
    );
    expect(SQL).toContain('returns text');
    expect(SQL).toContain('stable');
    expect(SQL).toContain('security definer');
    expect(SQL).toContain('set search_path = public');
  });

  it('usa auth.uid() e NÃO aceita usuário por parâmetro', () => {
    // Com um parâmetro de usuário, qualquer authenticated leria o estado
    // comercial da conta alheia.
    expect(SQL).toContain('auth.uid()');
    expect(SQL).not.toContain('user_uuid');
    const assinatura = SQL.slice(
      SQL.indexOf('corrigefacil_free_demo_report_status'),
      SQL.indexOf(')', SQL.indexOf('corrigefacil_free_demo_report_status')),
    );
    expect(assinatura).toContain('assessment_uuid uuid');
  });

  it('NÃO escreve: nem insert, nem update, nem delete', () => {
    // A limpeza de reserva órfã continua sendo da RPC de reserva, no momento
    // da tentativa real. Duas regras de limpeza seriam duas verdades.
    for (const proibido of ['insert into', 'update public.', 'delete from']) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('devolve exatamente os cinco estados do contrato', () => {
    const retornos = (SQL.match(/return '([a-z_]+)'/g) ?? [])
      .map((r) => r.replace("return '", '').replace("'", ''))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    expect(retornos).toEqual([
      'already_used',
      'available',
      'in_progress',
      'ineligible',
      'use_subscription',
    ]);
  });

  it('Pró ativo sai antes de qualquer leitura de avaliação', () => {
    const posPro = SQL.indexOf('has_active_assistant');
    const posAssessment = SQL.indexOf('from public.assessments');
    expect(posPro).toBeGreaterThan(-1);
    expect(posAssessment).toBeGreaterThan(posPro);
  });

  it('exige as MESMAS condições de elegibilidade da reserva', () => {
    expect(SQL).toContain("a.status       = 'concluida'");
    expect(SQL).toContain('a.completed_at is not null');
    expect(SQL).toContain('a.user_id      = v_user');
    expect(SQL).toContain('i.is_free_demo');
    expect(SQL).toContain('can_access_corrigefacil_instrument');
  });

  it('a janela do pending é IDÊNTICA à da reserva', () => {
    // Se esta dissesse 45 minutos e a reserva 30, a tela anunciaria "em
    // andamento" para uma chance que já estava livre.
    const daqui = SQL.match(/interval '([^']+)'/g) ?? [];
    const daReserva = MIGRATION_PR3.toLowerCase().match(/interval '([^']+)'/g) ?? [];

    expect(daqui).toHaveLength(1);
    expect(daReserva.length).toBeGreaterThan(0);
    expect(new Set(daReserva)).toEqual(new Set(daqui));
  });

  it('menor privilégio, como as funções irmãs', () => {
    const alvo = 'public.corrigefacil_free_demo_report_status(uuid)';
    expect(SQL).toContain(`revoke all on function ${alvo} from public`);
    expect(SQL).toContain(`revoke all on function ${alvo} from anon`);
    expect(SQL).toContain(`grant execute on function ${alvo} to authenticated`);
  });

  it('não toca no backend fechado do PR3', () => {
    // Os nomes das três RPCs APARECEM — no texto do `comment on function`,
    // dizendo quem é a autoridade de verdade. O que não pode existir é
    // redefinição: seria reescrever em silêncio o backend já auditado.
    for (const rpc of [
      'reserve_corrigefacil_free_demo_report',
      'complete_corrigefacil_free_demo_report',
      'release_corrigefacil_free_demo_report',
    ]) {
      expect(SQL, rpc).not.toContain(`function public.${rpc}`);
      expect(SQL, rpc).not.toContain(`drop function public.${rpc}`);
    }

    // E nenhuma DDL de estrutura: a migration cria UMA função e nada mais.
    for (const proibido of [
      'create policy',
      'drop policy',
      'alter table',
      'create unique index',
      'create table',
      'alter policy',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }

    const funcoes = SQL.match(/create or replace function/g) ?? [];
    expect(funcoes).toHaveLength(1);
  });
});
