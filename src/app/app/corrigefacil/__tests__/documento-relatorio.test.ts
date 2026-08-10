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
