// Guardas do compositor do documento profissional (Bloco 7A), no padrão de
// leitura de fonte já usado em report-ux.test.ts.
//
// Elas travam sobretudo o que o documento NÃO pode fazer: chamar IA, gastar
// cota, exigir assinatura ativa para leitura, desenhar gráfico ou recalcular
// psicometria. São invariantes de arquitetura, e a única forma barata de
// perceber que uma delas caiu é falhar aqui.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/** Fonte sem comentários.
 *
 *  As guardas de "não faz X" precisam olhar CÓDIGO. Sem isso, explicar no
 *  comentário por que não se lê `scales` — que é informação valiosa e deve
 *  continuar escrita — derrubaria o teste que protege exatamente essa
 *  decisão. Comentário é documentação, não comportamento. */
function semComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const ROTA = 'src/app/app/corrigefacil/avaliacoes/[id]/relatorios/[reportId]';
const page = source(`${ROTA}/page.tsx`);
const documento = source(`${ROTA}/RelatorioDocumentClient.tsx`);
const painel = source('src/app/app/corrigefacil/CorrigeFacilReportPanel.tsx');
const modelo = source('src/lib/report/document-model.ts');

const documentoCodigo = semComentarios(documento);
const modeloCodigo = semComentarios(modelo);

describe('documento profissional — rota', () => {
  it('a rota carrega avaliação E relatório, não um relatório solto', () => {
    expect(page).toContain('params: Promise<{ id: string; reportId: string }>');
    expect(page).toContain('assessmentId={decodeURIComponent(id)}');
    expect(page).toContain('reportId={decodeURIComponent(reportId)}');
  });

  // Posse sozinha aceitaria "avaliação A + relatório da avaliação B", ambos
  // do mesmo dono — um documento que nunca existiu.
  it('o relatório precisa estar vinculado a ESTA avaliação', () => {
    expect(documento).toContain(".eq('id', reportId)");
    expect(documento).toContain(".eq('corrigefacil_assessment_id', assessmentId)");
  });

  it('não distingue inexistente de alheio na mensagem', () => {
    expect(documento).toContain("'Relatório não encontrado.'");
  });
});

describe('documento profissional — travas de custo e acesso', () => {
  it('não chama a IA nem o endpoint de geração', () => {
    expect(documentoCodigo).not.toContain('openai');
    expect(documentoCodigo).not.toContain('callOpenAI');
    expect(documentoCodigo).not.toContain('/api/assistant/generate');
  });

  // Abrir relatório existente custa 0 unidades: sem POST, sem contador.
  it('não consome cota nem grava relatório', () => {
    expect(documentoCodigo).not.toContain('monthly_count');
    expect(documentoCodigo).not.toContain('monthly_limit');
    expect(documentoCodigo).not.toContain('.insert(');
    expect(documentoCodigo).not.toContain('.update(');
    expect(documentoCodigo).not.toContain("method: 'POST'");
  });

  // Gerar exige assinatura ativa; LER o que já foi gerado, não.
  it('não usa has_active_assistant como gate de visualização', () => {
    expect(documentoCodigo).not.toContain('has_active_assistant');
    expect(documentoCodigo).not.toContain('user_access_status');
  });
});

describe('documento profissional — fontes de dados', () => {
  it('lê a avaliação pelo contrato já aprovado do CorrigeFácil', () => {
    expect(documento).toContain('buscarAvaliacao');
  });

  // Nomes de escala/instrumento exigiriam `scales`/`instruments`, cuja policy
  // depende de assinatura ativa — a tabela esvaziaria em silêncio.
  it('não lê catálogo nem norma direto do banco', () => {
    expect(documentoCodigo).not.toContain("from('scales')");
    expect(documentoCodigo).not.toContain("from('instruments')");
    expect(documentoCodigo).not.toContain("from('assessment_results')");
    expect(documentoCodigo).not.toContain('norm_');
  });

  it('a consulta a assessments busca só eval_date', () => {
    expect(documento).toContain("from('assessments')");
    expect(documento).toContain("select('eval_date')");
  });

  it('do perfil, lê só o que o documento imprime', () => {
    expect(documento).toContain(
      "'display_name, clinic_name, gender, profession_category, credential_type, credential_number'",
    );
    expect(documentoCodigo).not.toContain('billing');
    expect(documentoCodigo).not.toContain("'role'");
  });
});

describe('documento profissional — composição', () => {
  it('renderiza output_text sem substituí-lo', () => {
    expect(documento).toContain('{relatorio.output_text}');
    expect(documento).toContain('ReactMarkdown');
    expect(documento).toContain('remarkGfm');
  });

  // O motor já obriga a narrativa a terminar com o aviso ético; repetir aqui
  // duplicaria o disclaimer no mesmo documento.
  it('não acrescenta um segundo aviso ético', () => {
    expect(documentoCodigo).not.toContain('AVISO_FINAL');
    expect(documentoCodigo).not.toContain('rascunho de apoio operacional');
  });

  it('clínica e credencial aparecem só quando existem', () => {
    expect(documento).toContain('identidade.clinica &&');
    expect(documento).toContain('identidade.credenciamento &&');
  });

  it('usa os formatters compartilhados de identidade e idade', () => {
    expect(modelo).toContain("from './professional-identity'");
    expect(documento).toContain("from '@/lib/report/format-age'");
    // rótulo hardcoded aqui seria uma terceira cópia da tradução
    expect(documentoCodigo).not.toContain('Psicóloga');
    expect(documentoCodigo).not.toContain("'CRP'");
  });

  it('a tabela sai do modelo puro, não de cálculo na tela', () => {
    expect(documento).toContain('montarLinhas(avaliacao.resultados)');
    expect(documento).toContain('colunasVisiveis(linhas)');
  });

  // Bug real: com TODAS as escalas indisponíveis, `colunasVisiveis` zera
  // todas as colunas quantitativas, `numericas` vira 0 e a mensagem
  // persistida sumia — a linha ficava só com o código da escala. É
  // exatamente o "campo vazio" que o produto proíbe. Os dois caminhos
  // precisam existir: colSpan quando há colunas, e a mensagem junto da
  // escala quando não há.
  it('mensagem de indisponível sobrevive mesmo sem coluna quantitativa', () => {
    expect(documentoCodigo).toContain('!l.disponivel && numericas === 0');
    expect(documentoCodigo).toContain('numericas > 0 &&');

    const ocorrencias = documentoCodigo.match(
      /l\.mensagem \?\? 'Resultado indisponível\.'/g,
    );
    expect(ocorrencias).toHaveLength(2);
  });
});

describe('documento profissional — impressão A4 (Bloco 7B)', () => {
  const css = source('src/app/globals.css');

  it('oferece a ação de imprimir usando só o diálogo nativo', () => {
    expect(documento).toContain('Imprimir / Salvar PDF');
    expect(documentoCodigo).toContain('window.print()');
  });

  // Nada da aplicação pode entrar no papel: a barra inteira sai, e o shell
  // já saía antes deste bloco.
  it('a barra de ações fica fora do papel', () => {
    expect(documento).toContain('print:hidden');
    const barra = documento.slice(
      documento.indexOf('const barra ='),
      documento.indexOf("if (estado.fase === 'carregando')"),
    );
    expect(barra).toContain('print:hidden');
    expect(barra).toContain('window.print()');
    expect(barra).toContain('Voltar à avaliação');
  });

  it('declara A4 com margens de documento numa página NOMEADA', () => {
    expect(css).toMatch(
      /@page\s+pp-relatorio\s*\{[^}]*size:\s*A4[^}]*margin:\s*18mm\s+16mm[^}]*\}/,
    );
  });

  // `@page` anônimo não aceita seletor: ele configuraria o papel de TODA
  // impressão do Psico2 — Doc Studio incluso — só por existir neste CSS.
  // A named page só vale onde alguém a referencia.
  it('não deixa @page anônimo impondo A4 ao app inteiro', () => {
    expect(css).not.toMatch(/@page\s*\{/);
  });

  it('só o documento reivindica a página nomeada', () => {
    expect(css).toMatch(
      /body\.pp-print-document \.pp-doc\s*\{\s*\n?\s*page:\s*pp-relatorio/,
    );
    // e o gancho já existia no componente, então ele não precisou mudar
    expect(documento).toContain('pp-doc');
  });

  // bg-pp-canvas vive na raiz do AppShell, que é compartilhado. O fundo é
  // neutralizado sob o escopo do documento em vez de sair do produto.
  it('fundo da aplicação não vai ao papel, e só sob o escopo do documento', () => {
    expect(css).toMatch(
      /body\.pp-print-document,\s*\n?\s*body\.pp-print-document \[class~='bg-pp-canvas'\]\s*\{\s*\n?\s*background:\s*#fff\s*!important/,
    );
    expect(source('src/app/app/AppShell.tsx')).toContain('bg-pp-canvas');
  });

  // Toda regra de ELEMENTO precisa ser escopada; caso contrário vaza para
  // as outras telas do app na impressão.
  it('nenhuma regra de elemento do bloco de print escapa do escopo', () => {
    const bloco = css.slice(css.indexOf('@media print {'));
    const seletores = bloco
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.endsWith('{') || l.endsWith(','))
      .map((l) => l.replace(/\s*[{,]$/, ''))
      .filter((l) => l && !l.startsWith('/*') && !l.startsWith('*'));

    for (const seletor of seletores) {
      const permitido =
        seletor === '@media print' ||
        seletor === '@page pp-relatorio' ||
        seletor.startsWith('body.pp-print-document');
      expect(permitido, `seletor fora do escopo: ${seletor}`).toBe(true);
    }
  });

  // O padding do <main> é do AppShell, compartilhado por todo o produto.
  // A regra é escopada por uma classe que só esta rota adiciona.
  it('neutraliza o padding do shell sem alterar o AppShell', () => {
    expect(css).toContain('body.pp-print-document main');
    expect(documentoCodigo).toContain("classList.add('pp-print-document')");
    expect(documentoCodigo).toContain("classList.remove('pp-print-document')");
    // o AppShell continua com o padding e o fundo que o produto usa
    const shell = source('src/app/app/AppShell.tsx');
    expect(shell).toContain('p-6 md:p-8');
    expect(shell).toContain('bg-pp-canvas');
  });

  it('a folha perde borda, sombra e padding no papel', () => {
    expect(documento).toContain('print:border-0');
    expect(documento).toContain('print:shadow-none');
    expect(documento).toContain('print:p-0');
  });

  it('tabela não depende de scroll horizontal na impressão', () => {
    expect(documento).toContain('print:overflow-visible');
    expect(css).toContain('overflow: visible !important');
  });

  it('cabeçalho de tabela pode repetir entre páginas', () => {
    expect(css).toContain('display: table-header-group');
  });

  it('protege unidades pequenas contra quebra, não blocos inteiros', () => {
    // linha da tabela, item de lista, cabeçalho e identificação: pequenos.
    expect(documento).toContain('print:break-inside-avoid');
    expect(css).toMatch(/tr,\s*\n?\s*body\.pp-print-document \.pp-doc li \{\s*\n?\s*break-inside: avoid/);

    // a narrativa e a seção de resultados podem ocupar várias páginas e
    // NÃO podem ser protegidas inteiras — produziria folhas quase vazias.
    const narrativa = documento.slice(
      documento.indexOf('<section className="text-[15px]'),
      documento.indexOf('{relatorio.output_text}'),
    );
    expect(narrativa).not.toContain('break-inside-avoid');
  });

  it('título não fica órfão no pé da página', () => {
    expect(css).toContain('break-after: avoid');
    expect(css).toContain('orphans: 2');
    expect(css).toContain('widows: 2');
  });

  it('não usa biblioteca de PDF nem download próprio', () => {
    for (const proibido of [
      'jspdf',
      'html2canvas',
      'puppeteer',
      'playwright',
      'react-to-print',
      'pdfkit',
      'createObjectURL',
      'new Blob',
    ]) {
      expect(documentoCodigo.toLowerCase(), proibido).not.toContain(proibido.toLowerCase());
    }
  });
});

describe('documento profissional — travas permanentes', () => {
  // O gráfico entrou no 7C, mas por COMPOSIÇÃO: o documento monta a ilha, e
  // é ela que fala com o registro visual. Nenhum renderizador é importado
  // aqui, e nenhuma régua é desenhada fora dos componentes aprovados.
  it('o documento não importa renderizador nem registro gráfico', () => {
    for (const proibido of [
      'graph-model',
      'graph-config',
      'ScoreBandChart',
      'StandardizedProfileChart',
      'DomainProfileChart',
      'CategoricalProfileChart',
      'visual_context',
    ]) {
      expect(documentoCodigo, proibido).not.toContain(proibido);
    }
  });

  it('não recalcula psicometria', () => {
    for (const proibido of ['percentil(', 'calcular', 'Math.round', 'norm_set']) {
      expect(modeloCodigo, proibido).not.toContain(proibido);
    }
  });
});

describe('painel — um relatório canônico (Bloco 7C)', () => {
  const painelCodigo = semComentarios(painel);

  it('a lista oferece UM único caminho de visualização', () => {
    expect(painel).toContain('Abrir relatório');
    expect(painel).toContain('/relatorios/${encodeURIComponent(report.id)}');
    expect(painel).toContain('report.id && resolvedAssessmentId &&');
  });

  // A duplicidade era o problema: dois botões abrindo representações
  // diferentes do MESMO relatório, com layouts e conteúdos distintos.
  it('não sobrou o CTA paralelo nem o rótulo antigo', () => {
    expect(painelCodigo).not.toContain('Abrir relatório completo');
    expect(painelCodigo).not.toContain('>Ver<');
    expect(painelCodigo).not.toContain('setSelectedReport');
    expect(painelCodigo).not.toContain('selectedReport');
  });

  // O texto só reaparece no painel como RESGATE de erro (pré-formatado, ver
  // adiante). Como leitura normal do relatório, não existe mais aqui.
  it('não renderiza mais narrativa como leitura normal', () => {
    expect(painelCodigo).not.toContain('ReactMarkdown');
    expect(painelCodigo).not.toContain('remarkGfm');
    expect(painelCodigo).not.toContain('window.print()');
    expect(painelCodigo).not.toContain('Copiar relatório');
  });

  it('a lista deixou de carregar o texto que não exibe mais', () => {
    expect(painelCodigo).toContain("select('id, title, report_type, created_at')");
    expect(painelCodigo).not.toContain("select('id, title, report_type, output_text, created_at')");
  });

  // Abrir é navegação: o POST que gerou já gravou e já cobrou a unidade.
  it('após gerar, navega para a rota canônica sem novo POST', () => {
    expect(painelCodigo).toContain('router.push');
    expect(painelCodigo).toContain('/relatorios/${encodeURIComponent(report.id)}');
    const posts = painelCodigo.match(/method:\s*'POST'/g) ?? [];
    expect(posts).toHaveLength(1);
  });

  const gerar = painelCodigo.slice(
    painelCodigo.indexOf('async function generateReport()'),
    painelCodigo.indexOf('async function goToCheckout()'),
  );

  it('caso normal: com report.id navega e sai, sem fallback', () => {
    // o push acontece dentro do `if (report.id)` e ele RETORNA — o resgate
    // abaixo é inalcançável quando o relatório foi salvo
    expect(gerar).toMatch(/if \(report\.id\) \{[\s\S]*?router\.push\([\s\S]*?\);\s*\n\s*return;/);
  });

  // O backend responde 200 com `id: null` quando a IA gerou e o INSERT
  // falhou: a unidade JÁ foi cobrada e o texto só existe nessa resposta.
  // Sem resgate, o profissional perde uma geração que pagou.
  it('caso save failure: preserva o texto sem inventar rota', () => {
    expect(gerar).toContain('setUnsavedReport({');
    expect(gerar).toContain('texto: report.output_text ?? \'\'');
    expect(painelCodigo).toContain('unsavedReport && (');
    expect(painelCodigo).toContain('copiarTexto(unsavedReport.texto)');
    expect(painelCodigo).toContain('{unsavedReport.texto}');
  });

  it('o resgate não finge ser o documento canônico', () => {
    const resgate = painelCodigo.slice(painelCodigo.indexOf('{unsavedReport && ('));
    // sem rota, sem impressão, sem tabela, sem gráfico: nada disso existe
    // para um relatório que não foi salvo
    expect(resgate).not.toContain('Abrir relatório');
    expect(resgate).not.toContain('/relatorios/');
    expect(resgate).not.toContain('window.print()');
    expect(resgate).not.toContain('ResultGraph');
    expect(resgate).not.toContain('<table');
  });

  it('nunca constrói uma rota com id nulo', () => {
    expect(painelCodigo).not.toContain('/relatorios/null');
    expect(painelCodigo).not.toMatch(/relatorios\/\$\{[^}]*report\.id\}/);
    // a única construção de rota passa por encodeURIComponent(report.id),
    // e ela vive dentro do `if (report.id)`
    expect(gerar).toContain('/relatorios/${encodeURIComponent(report.id)}');
  });

  it('o resgate é limpo ao iniciar nova geração', () => {
    expect(gerar).toContain('setUnsavedReport(null)');
  });

  it('o resgate não dispara segundo POST nem nova geração', () => {
    const resgate = painelCodigo.slice(painelCodigo.indexOf('{unsavedReport && ('));
    expect(resgate).not.toContain('fetch(');
    expect(resgate).not.toContain('generateReport');
    // e o arquivo inteiro segue com um POST só
    const posts = painelCodigo.match(/method:\s*'POST'/g) ?? [];
    expect(posts).toHaveLength(1);
  });

  it('preserva geração, cota, checkout, destinos e observações', () => {
    expect(painel).toContain('monthly_count');
    expect(painel).toContain('CHECKOUT_URL_IA_PRO');
    expect(painel).toContain("value: 'family'");
    expect(painel).toContain("value: 'internal'");
    expect(painel).toContain('additionalNotes');
    expect(painel).toContain('Relatórios desta avaliação');
  });
});

describe('documento — gráfico do CorrigeFácil (Bloco 7C)', () => {
  const ilha = source(`${ROTA}/ReportGraphIsland.tsx`);
  const ilhaCodigo = semComentarios(ilha);
  const coerencia = source('src/lib/report/graph-coherence.ts');

  it('o documento monta o gráfico entre a tabela e a narrativa', () => {
    expect(documento).toContain('<ReportGraphIsland avaliacao={avaliacao} />');
    const iTabela = documento.indexOf('montarLinhas(avaliacao.resultados)');
    const iGrafico = documento.indexOf('<ReportGraphIsland');
    const iNarrativa = documento.indexOf('{relatorio.output_text}');
    expect(iGrafico).toBeGreaterThan(iTabela);
    expect(iNarrativa).toBeGreaterThan(iGrafico);
  });

  it('reutiliza o ResultGraph aprovado, sem um quinto gráfico', () => {
    expect(ilhaCodigo).toContain('ResultGraph');
    for (const renderizador of [
      'ScoreBandChart',
      'StandardizedProfileChart',
      'DomainProfileChart',
      'CategoricalProfileChart',
      'parts',
    ]) {
      expect(ilhaCodigo, renderizador).not.toContain(renderizador);
    }
  });

  it('o quantitativo sai da avaliação salva, sem recálculo', () => {
    expect(coerencia).toContain('instrument: avaliacao.instrument');
    expect(coerencia).toContain('norm_selector: avaliacao.norm_selector');
    expect(coerencia).toContain('resultados: avaliacao.resultados');
  });

  it('o adaptador não pontua, não classifica e não escolhe corte', () => {
    for (const proibido of [
      'Math.',
      'reduce(',
      'classification =',
      'percentil(',
      'cutoff',
      'corte',
      'norm_entries',
    ]) {
      expect(semComentarios(coerencia), proibido).not.toContain(proibido);
    }
  });

  it('falha do catálogo não derruba o documento', () => {
    expect(ilhaCodigo).toContain('.catch(');
    expect(ilhaCodigo).toContain('if (!detalhe) return null;');
  });

  it('fail closed quando as faixas de hoje não reconhecem a classificação', () => {
    expect(ilhaCodigo).toContain('faixasDivergemDoResultado(detalhe, resposta)');
    expect(ilhaCodigo).toMatch(/faixasDivergemDoResultado\([^)]*\)\)\s*return null;/);
  });

  // A guarda é regra do DOCUMENTO: na tela de correção resultado e catálogo
  // são necessariamente da mesma época.
  it('a guarda mora no adaptador, não nos gráficos aprovados', () => {
    const graphs = 'src/app/app/corrigefacil/graphs';
    for (const arquivo of ['graph-model.ts', 'graph-config.ts', 'ResultGraph.tsx']) {
      expect(source(`${graphs}/${arquivo}`), arquivo).not.toContain(
        'faixasDivergemDoResultado',
      );
    }
  });

  it('não ressuscita visual_context nem chama IA', () => {
    for (const proibido of ['visual_context', 'openai', 'callOpenAI', 'monthly_']) {
      expect(ilhaCodigo, proibido).not.toContain(proibido);
      expect(semComentarios(coerencia), proibido).not.toContain(proibido);
    }
  });

  it('o gráfico não é convertido em imagem nem persistido', () => {
    for (const proibido of ['canvas', 'toDataURL', 'base64', 'screenshot', '.insert(']) {
      expect(ilhaCodigo.toLowerCase(), proibido).not.toContain(proibido.toLowerCase());
    }
  });
});

describe('documento — copiar texto', () => {
  it('a toolbar oferece copiar, e copia só a narrativa', () => {
    expect(documento).toContain('Copiar texto');
    expect(documento).toContain('Copiado');
    expect(documentoCodigo).toContain(
      'copiarNarrativa(estado.dados.relatorio.output_text)',
    );
    expect(documentoCodigo).toContain('navigator.clipboard.writeText(texto)');
  });
});
