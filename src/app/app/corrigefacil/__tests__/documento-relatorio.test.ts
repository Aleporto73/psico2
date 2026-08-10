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

  it('declara A4 com margens de documento', () => {
    expect(css).toContain('@page');
    expect(css).toContain('size: A4');
    expect(css).toMatch(/margin:\s*\d+mm\s+\d+mm/);
  });

  // O padding do <main> é do AppShell, compartilhado por todo o produto.
  // A regra é escopada por uma classe que só esta rota adiciona.
  it('neutraliza o padding do shell sem alterar o AppShell', () => {
    expect(css).toContain('body.pp-print-document main');
    expect(documentoCodigo).toContain("classList.add('pp-print-document')");
    expect(documentoCodigo).toContain("classList.remove('pp-print-document')");
    expect(source('src/app/app/AppShell.tsx')).toContain('p-6 md:p-8');
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

describe('documento profissional — o que é do próximo bloco', () => {
  it('não desenha gráfico neste bloco', () => {
    for (const proibido of [
      'ResultGraph',
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

describe('painel — a porta de entrada não substitui o que existia', () => {
  it('mantém Ver, Copiar e imprimir', () => {
    expect(painel).toContain('Ver');
    expect(painel).toContain('Copiar relatório');
    expect(painel).toContain('window.print()');
  });

  it('o link do documento só existe com report.id e avaliação resolvida', () => {
    expect(painel).toContain('report.id && resolvedAssessmentId &&');
    expect(painel).toContain('Abrir relatório completo');
    expect(painel).toContain('/relatorios/${encodeURIComponent(report.id)}');
  });
});
