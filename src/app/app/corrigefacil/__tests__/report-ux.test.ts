import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const panel = source('src/app/app/corrigefacil/CorrigeFacilReportPanel.tsx');
const avaliar = source('src/app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx');
const detalhe = source('src/app/app/corrigefacil/avaliacoes/[id]/DetalheClient.tsx');

describe('CorrigeFácil → Relatório Pró — UX V1', () => {
  it('gera no mesmo endpoint com assessment salvo e sem mandar resultados pelo browser', () => {
    expect(panel).toContain("source: 'corrigefacil'");
    expect(panel).toContain('assessmentId: id');
    expect(panel).toContain("fetch('/api/assistant/generate'");
    expect(panel).not.toContain('resultados:');
    expect(panel).not.toContain('imageDataUrl');
  });

  it('salva a avaliação antes de verificar o acesso ao Relatório Pró', () => {
    const openStart = panel.indexOf('async function openGenerator()');
    const openEnd = panel.indexOf('async function generateReport()', openStart);
    const trecho = panel.slice(openStart, openEnd);
    expect(trecho.indexOf('await resolveAssessment()')).toBeGreaterThan(-1);
    expect(trecho.indexOf("fetch('/api/assistant/generate'")).toBeGreaterThan(
      trecho.indexOf('await resolveAssessment()'),
    );
  });

  it('mantém os quatro destinos aprovados e observação opcional', () => {
    expect(panel).toContain("value: 'family'");
    expect(panel).toContain("value: 'school'");
    expect(panel).toContain("value: 'technical'");
    expect(panel).toContain("value: 'internal'");
    expect(panel).toContain('Observações adicionais');
    expect(panel).toContain('Opcional.');
  });

  it('faz upsell inline e salva antes do checkout quando necessário', () => {
    expect(panel).toContain('50 relatórios por mês durante 12 meses · R$57 — pagamento único.');
    expect(panel).toContain('Desbloquear Relatórios Pro');
    expect(panel).toContain('await resolveAssessment()');
    expect(panel).toContain('CHECKOUT_URL_IA_PRO');
  });

  it('resultado oferece relatório antes de salvar sem relatório', () => {
    const reportPos = avaliar.indexOf('<CorrigeFacilReportPanel');
    const savePos = avaliar.indexOf('Salvar sem relatório', reportPos);
    expect(reportPos).toBeGreaterThan(-1);
    expect(savePos).toBeGreaterThan(reportPos);
    expect(avaliar).toContain('ensureAssessmentId={onSalvar}');
  });

  it('avaliação salva também permite gerar e rever relatórios vinculados', () => {
    expect(detalhe).toContain('<CorrigeFacilReportPanel assessmentId={d.assessment_id} />');
    expect(panel).toContain(".eq('corrigefacil_assessment_id', id)");
    expect(panel).toContain('Relatórios desta avaliação');
    expect(panel).toContain('Gerar outro relatório');
    // Rever é abrir o documento canônico. A leitura inline do mesmo relatório
    // dentro do painel saiu no Bloco 7C — eram duas representações do mesmo
    // conteúdo, com layouts e informações diferentes.
    expect(panel).toContain('Abrir relatório');
  });

  it('copiar e imprimir vivem no documento, não no painel', () => {
    const documento = source(
      'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]/RelatorioDocumentClient.tsx',
    );
    expect(documento).toContain('Copiar texto');
    expect(documento).toContain('onClick={() => window.print()}');
    // o detalhe salvo nunca teve impressão própria, e continua sem
    expect(detalhe).not.toContain('onClick={() => window.print()}');
    expect(panel).not.toContain('onClick={() => window.print()}');
  });
});

// ── Card de oferta dos Relatórios Pro ────────────────────────────────────
//
// Este bloco cobre COPY e COMPOSIÇÃO do card, e — sobretudo — trava o que o
// ajuste comercial NÃO pode ter arrastado junto: um segundo gate, um segundo
// POST, uma chamada de IA nova ou qualquer mexida em cota. O card é tela;
// backend, entitlement e cota continuam sendo os mesmos de antes.

/** Fonte sem comentários, mesmo motivo de documento-relatorio.test.ts: as
 *  guardas de "não faz X" precisam olhar CÓDIGO, não a explicação escrita
 *  ao lado dele. */
function semComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Fonte com os espaços colapsados.
 *
 *  Uma frase de UI dentro do JSX é quebrada em várias linhas pela largura da
 *  coluna, e uma guarda de COPY não pode depender de onde o formatador
 *  escolheu quebrar — reindentar o card derrubaria o teste sem que uma
 *  palavra tivesse mudado. */
function frases(fonte: string): string {
  return fonte.replace(/\s+/g, ' ');
}

const panelCodigo = semComentarios(panel);
const panelTexto = frases(panel);
/** O que de fato chega à tela: sem comentário e sem quebra de linha. */
const panelCodigoTexto = frases(panelCodigo);

describe('CorrigeFácil → card dos Relatórios Pro', () => {
  it('tem eyebrow, título, texto e linha de apoio na ordem da hierarquia', () => {
    const eyebrow = panelTexto.indexOf('> Relatórios Pro </p>');
    const titulo = panelTexto.indexOf(
      'Transforme esta avaliação em um relatório profissional.',
    );
    const texto = panelTexto.indexOf(
      'Gere um relatório completo a partir deste resultado',
    );
    const apoio = panelTexto.indexOf(
      'Ideal para escola, família, equipe multiprofissional ou registro interno.',
    );

    expect(eyebrow).toBeGreaterThan(-1);
    expect(titulo).toBeGreaterThan(eyebrow);
    expect(texto).toBeGreaterThan(titulo);
    expect(apoio).toBeGreaterThan(texto);

    // o eyebrow é pequeno e caixa-alta por CSS, não por texto gritado na fonte
    expect(panel).toContain('text-[11px] uppercase tracking-wide text-pp-ink-soft');
  });

  it('promete só o que o fluxo entrega', () => {
    expect(panelTexto).toContain(
      'Gere um relatório completo a partir deste resultado, com análise ' +
        'organizada, considerações para o contexto e recomendações prontas ' +
        'para revisar, editar e salvar.',
    );
    for (const proibido of [
      'diagnóstico automático',
      'laudo automático',
      'interpretação clínica automática',
      'substitui o profissional',
    ]) {
      expect(frases(semComentarios(panel)).toLowerCase(), proibido).not.toContain(
        proibido.toLowerCase(),
      );
    }
  });

  it('com acesso: CTA de gerar e microcopy de edição', () => {
    expect(panelTexto).toContain('Gerar relatório completo');
    expect(panelTexto).toContain('Edite o texto antes de imprimir ou salvar em PDF.');
    // a microcopy fica ABAIXO do botão que abre o gerador
    const botao = panelTexto.indexOf('onClick={openGenerator}');
    const micro = panelTexto.indexOf('Edite o texto antes de imprimir ou salvar em PDF.');
    expect(botao).toBeGreaterThan(-1);
    expect(micro).toBeGreaterThan(botao);
  });

  it('sem acesso: CTA de desbloqueio e microcopy de acesso', () => {
    expect(panelTexto).toContain('Desbloquear Relatórios Pro');
    expect(panelTexto).toContain(
      'Tenha acesso aos Relatórios Pro e gere relatórios completos com base ' +
        'nesta avaliação.',
    );
    const botao = panelTexto.indexOf('onClick={goToCheckout}');
    const micro = panelTexto.indexOf(
      'Tenha acesso aos Relatórios Pro e gere relatórios completos',
    );
    expect(botao).toBeGreaterThan(-1);
    expect(micro).toBeGreaterThan(botao);
    // e o desbloqueio só aparece quando o gate disse que não há acesso
    expect(panel).toContain("{access === 'inactive' ? (");
  });

  // O produto é pagamento único: "assine" prometeria recorrência. E o card
  // usa UM nome comercial só, o do eyebrow.
  it('a microcopy sem acesso não fala em assinatura nem cria um segundo nome', () => {
    // texto que chega à tela, não o comentário que explica a decisão
    expect(panelCodigoTexto).not.toContain('PsicoPro');
    expect(panelCodigoTexto).not.toContain('Assine');
    expect(panelCodigoTexto.toLowerCase()).not.toContain('assinatura');
    expect(panelCodigoTexto.toLowerCase()).not.toContain('mensalidade');
  });

  it('o botão continua no fluxo existente, sem caminho paralelo', () => {
    // gerar = abrir o gerador de sempre; desbloquear = o checkout de sempre
    expect(panelCodigo).toContain('onClick={openGenerator}');
    expect(panelCodigo).toContain('onClick={goToCheckout}');
    expect(panelCodigo).toContain('window.location.assign(CHECKOUT_URL_IA_PRO)');

    const aberturas = panelCodigo.match(/onClick=\{openGenerator\}/g) ?? [];
    expect(aberturas).toHaveLength(1);
    const checkouts = panelCodigo.match(/onClick=\{goToCheckout\}/g) ?? [];
    expect(checkouts).toHaveLength(1);

    // um POST no arquivo inteiro: o card não gera por conta própria
    const posts = panelCodigo.match(/method:\s*'POST'/g) ?? [];
    expect(posts).toHaveLength(1);
  });

  it('não duplica entitlement: um gate só, o mesmo de antes', () => {
    const gates = panelCodigo.match(/fetch\('\/api\/assistant\/generate',\s*\{\s*method:\s*'GET'\s*\}\)/g) ?? [];
    expect(gates).toHaveLength(1);
    // nenhuma regra de acesso reimplementada na tela
    for (const proibido of [
      'has_active_assistant',
      'user_access_status',
      "from('subscriptions')",
      "from('entitlements')",
      "from('user_products')",
      'service_role',
    ]) {
      expect(panelCodigo, proibido).not.toContain(proibido);
    }
    // 403 continua sendo o único sinal de "sem acesso"
    expect(panelCodigo).toContain('response.status === 403');
  });

  it('não cria chamada de IA nem toca em cota', () => {
    for (const proibido of ['openai', 'callopenai', 'anthropic', 'gpt-']) {
      expect(panelCodigo.toLowerCase(), proibido).not.toContain(proibido);
    }
    // cota é LIDA da resposta, nunca escrita nem calculada aqui
    expect(panelCodigo).toContain('body.monthly_count');
    expect(panelCodigo).toContain('body.monthly_limit');
    expect(panelCodigo).not.toContain('monthly_limit:');
    expect(panelCodigo).not.toContain('monthly_count:');
  });

  it('o card não escreve no banco', () => {
    expect(panelCodigo).not.toContain('.insert(');
    expect(panelCodigo).not.toContain('.update(');
    expect(panelCodigo).not.toContain('.delete(');
    expect(panelCodigo).not.toContain('supabase.rpc(');
    // a única leitura continua sendo a lista de relatórios da avaliação
    const selects = panelCodigo.match(/\.from\('/g) ?? [];
    expect(selects).toHaveLength(1);
    expect(panelCodigo).toContain("from('ai_reports')");
  });

  it('o card vem depois do resultado, nas duas telas que o exibem', () => {
    // correção: escalas → gráfico → card. Nada da oferta antes do dado.
    const iResultados = avaliar.indexOf('{linhas.map(([escala, r]) => {');
    const iGrafico = avaliar.indexOf('<ResultGraph detalhe={detalhe}');
    const iCard = avaliar.indexOf('<CorrigeFacilReportPanel');
    expect(iResultados).toBeGreaterThan(-1);
    expect(iGrafico).toBeGreaterThan(iResultados);
    expect(iCard).toBeGreaterThan(iGrafico);

    // avaliação salva: resultados → card
    const dResultados = detalhe.indexOf('{Object.entries(d.resultados).map(');
    const dCard = detalhe.indexOf('<CorrigeFacilReportPanel');
    expect(dResultados).toBeGreaterThan(-1);
    expect(dCard).toBeGreaterThan(dResultados);
  });

  it('o card fica fora do papel e não mexe em gráfico nem em impressão', () => {
    const card = panel.slice(
      panel.indexOf('bg-pp-block-lilac/40 border border-pp-block-lilac'),
      panel.indexOf('{unsavedReport && ('),
    );
    expect(card).toContain('print:hidden');
    expect(card).not.toContain('ResultGraph');
    expect(card).not.toContain('window.print()');
  });
});
