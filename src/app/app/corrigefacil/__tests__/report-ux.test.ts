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
    expect(panel).toContain('Liberar Relatório Pró');
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
    expect(panel).toContain('Copiar relatório');
  });
});