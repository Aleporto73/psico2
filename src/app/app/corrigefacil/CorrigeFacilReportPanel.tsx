'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Printer, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';

type ReportType = 'family' | 'school' | 'technical' | 'internal';

type AiReport = {
  id: string | null;
  title: string | null;
  report_type: string | null;
  output_text: string;
  created_at: string;
};

type AccessState = 'idle' | 'checking' | 'active' | 'inactive' | 'error';

const CHECKOUT_URL_IA_PRO =
  'https://www.payment.eng.br/checkout?product=MCGNKAAY&price=74F2T5WL';

const REPORT_TYPES: Array<{ value: ReportType; label: string; hint: string }> = [
  {
    value: 'family',
    label: 'Família',
    hint: 'Linguagem clara e acessível para pais e familiares.',
  },
  {
    value: 'school',
    label: 'Escola',
    hint: 'Síntese objetiva e funcional para o contexto escolar.',
  },
  {
    value: 'technical',
    label: 'Equipe multiprofissional',
    hint: 'Versão mais técnica, com os valores disponíveis.',
  },
  {
    value: 'internal',
    label: 'Registro interno',
    hint: 'Registro curto e operacional.',
  },
];

function reportTypeLabel(value: string | null) {
  return REPORT_TYPES.find((item) => item.value === value)?.label || value || 'Relatório';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.message === 'string' ? body.message : 'Não foi possível concluir agora.';
  } catch {
    return 'Não foi possível concluir agora.';
  }
}

export function CorrigeFacilReportPanel({
  assessmentId,
  ensureAssessmentId,
}: {
  assessmentId: string | null;
  ensureAssessmentId?: () => Promise<string | null>;
}) {
  const [resolvedAssessmentId, setResolvedAssessmentId] = useState<string | null>(assessmentId);
  const [access, setAccess] = useState<AccessState>('idle');
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preparingCheckout, setPreparingCheckout] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(50);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AiReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (assessmentId) setResolvedAssessmentId(assessmentId);
  }, [assessmentId]);

  const loadReports = useCallback(async (id: string) => {
    setReportsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ai_reports')
        .select('id, title, report_type, output_text, created_at')
        .eq('corrigefacil_assessment_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        setMessage('Não foi possível carregar os relatórios desta avaliação.');
        return;
      }
      setReports((data ?? []) as AiReport[]);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (resolvedAssessmentId) void loadReports(resolvedAssessmentId);
  }, [resolvedAssessmentId, loadReports]);

  async function resolveAssessment(): Promise<string | null> {
    if (resolvedAssessmentId) return resolvedAssessmentId;
    if (!ensureAssessmentId) return null;

    const id = await ensureAssessmentId();
    if (id) setResolvedAssessmentId(id);
    return id;
  }

  async function openGenerator() {
    setMessage(null);
    setAccess('checking');
    try {
      const response = await fetch('/api/assistant/generate', { method: 'GET' });
      if (response.status === 403) {
        setAccess('inactive');
        setComposerOpen(false);
        return;
      }
      if (!response.ok) {
        setAccess('error');
        setMessage(await responseMessage(response));
        return;
      }

      const body = await response.json();
      setMonthlyCount(typeof body.monthly_count === 'number' ? body.monthly_count : 0);
      setMonthlyLimit(typeof body.monthly_limit === 'number' ? body.monthly_limit : 50);
      setAccess('active');
      setComposerOpen(true);
    } catch {
      setAccess('error');
      setMessage('Não foi possível verificar o Relatório Pró agora. Tente novamente.');
    }
  }

  async function generateReport() {
    if (!reportType || generating) return;
    setMessage(null);
    setGenerating(true);
    try {
      const id = await resolveAssessment();
      if (!id) {
        setMessage('Não foi possível salvar a avaliação antes de gerar o relatório.');
        return;
      }

      const response = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'corrigefacil',
          assessmentId: id,
          reportType,
          additionalNotes: additionalNotes.trim(),
        }),
      });

      if (response.status === 403) {
        setAccess('inactive');
        setComposerOpen(false);
        return;
      }

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(
          typeof body?.message === 'string'
            ? body.message
            : 'Não foi possível gerar o relatório agora.',
        );
        if (typeof body?.monthly_count === 'number') setMonthlyCount(body.monthly_count);
        return;
      }

      const report = body?.report as AiReport | undefined;
      if (!report?.output_text) {
        setMessage('O relatório foi processado, mas a resposta retornou incompleta.');
        return;
      }

      setSelectedReport(report);
      if (report.id) {
        setReports((current) => [report, ...current.filter((item) => item.id !== report.id)]);
      }
      setMonthlyCount(
        typeof body.monthly_count === 'number'
          ? body.monthly_count
          : monthlyCount === null
            ? null
            : monthlyCount + 1,
      );
      if (typeof body.monthly_limit === 'number') setMonthlyLimit(body.monthly_limit);
      setAdditionalNotes('');
      setReportType('');
      setComposerOpen(false);
      setAccess('active');
    } catch {
      setMessage('Não foi possível gerar o relatório agora. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  async function goToCheckout() {
    if (preparingCheckout) return;
    setPreparingCheckout(true);
    setMessage(null);
    try {
      const id = await resolveAssessment();
      if (!id) {
        setMessage('Não foi possível salvar a avaliação antes de abrir o checkout.');
        return;
      }
      window.location.assign(CHECKOUT_URL_IA_PRO);
    } finally {
      setPreparingCheckout(false);
    }
  }

  async function copyReport() {
    if (!selectedReport) return;
    try {
      await navigator.clipboard.writeText(selectedReport.output_text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.');
    }
  }

  const actionLabel = reports.length > 0 ? 'Gerar outro relatório' : 'Gerar relatório';

  return (
    <section className="space-y-5">
      {reports.length > 0 && (
        <div className="border border-pp-hairline rounded-block p-5 space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-pp-ink text-sm font-medium">Relatórios desta avaliação</p>
              <p className="text-pp-ink-soft text-xs mt-1">
                Cada nova geração utiliza uma unidade do limite mensal do Relatório Pró.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id ?? `${report.created_at}-${report.report_type}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pp-ink/10 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-pp-ink">{reportTypeLabel(report.report_type)}</p>
                  <p className="text-xs text-pp-ink-soft">{formatDate(report.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className="rounded-pill border border-pp-ink/15 px-4 py-2 text-sm text-pp-ink hover:border-pp-ink/40 transition"
                >
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportsLoading && (
        <output className="block text-sm text-pp-ink-soft print:hidden">Carregando relatórios…</output>
      )}

      <div className="bg-pp-block-lilac/40 border border-pp-block-lilac rounded-block p-6 space-y-4 print:hidden">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">Relatório Pró</p>
          <p className="text-pp-ink text-base font-medium">
            Transforme este resultado em um relatório profissional.
          </p>
          {access === 'active' && monthlyCount !== null && (
            <p className="text-xs text-pp-ink-soft tabular-nums">
              {monthlyCount} de {monthlyLimit} relatórios utilizados neste mês.
            </p>
          )}
        </div>

        {access === 'inactive' ? (
          <div className="space-y-4">
            <p className="text-sm text-pp-ink-soft">
              50 relatórios por mês durante 12 meses · R$57 — pagamento único.
            </p>
            <button
              type="button"
              onClick={goToCheckout}
              disabled={preparingCheckout}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-50"
            >
              {preparingCheckout ? 'Salvando avaliação…' : 'Liberar Relatório Pró'}
            </button>
          </div>
        ) : composerOpen && access === 'active' ? (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm text-pp-ink font-medium mb-2">
                Para quem é o relatório?
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {REPORT_TYPES.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-3 transition ${
                      reportType === option.value
                        ? 'border-pp-ink bg-white/70'
                        : 'border-pp-ink/10 bg-white/35 hover:border-pp-ink/30'
                    }`}
                  >
                    <span className="flex gap-2">
                      <input
                        type="radio"
                        name="corrigefacil-report-type"
                        value={option.value}
                        checked={reportType === option.value}
                        onChange={() => setReportType(option.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm text-pp-ink font-medium">
                          {option.label}
                        </span>
                        <span className="block text-xs text-pp-ink-soft mt-0.5">
                          {option.hint}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-1.5">
              <span className="text-sm text-pp-ink">Observações adicionais</span>
              <span className="block text-xs text-pp-ink-soft">Opcional.</span>
              <textarea
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value.slice(0, 6000))}
                rows={4}
                placeholder="Inclua apenas informações que devam ser consideradas na redação."
                className="w-full rounded-2xl border border-pp-ink/15 bg-white/60 px-4 py-3 text-sm text-pp-ink resize-y"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateReport}
                disabled={!reportType || generating}
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                {generating ? 'Gerando relatório…' : 'Gerar relatório'}
              </button>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                disabled={generating}
                className="rounded-pill border border-pp-ink/15 px-5 py-3 text-sm text-pp-ink hover:border-pp-ink/40 transition disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openGenerator}
            disabled={access === 'checking'}
            className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {access === 'checking' ? 'Verificando acesso…' : actionLabel}
          </button>
        )}

        {message && (
          <p role="alert" className="text-sm text-pp-ink">
            {message}
          </p>
        )}
      </div>

      {selectedReport && (
        <article className="border border-pp-hairline rounded-block bg-white/40 p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pp-hairline pb-4">
            <div>
              <p className="text-pp-ink font-medium">{reportTypeLabel(selectedReport.report_type)}</p>
              <p className="text-xs text-pp-ink-soft mt-1">{formatDate(selectedReport.created_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={copyReport}
                className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-4 py-2 text-sm text-pp-ink hover:border-pp-ink/40 transition"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
                {copied ? 'Copiado' : 'Copiar relatório'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-4 py-2 text-sm text-pp-ink hover:border-pp-ink/40 transition"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                Imprimir
              </button>
            </div>
          </div>

          <div className="text-[15px] leading-[1.7] text-pp-ink break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="font-serif italic text-3xl mt-6 mb-3 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-serif italic text-2xl mt-7 mb-3 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => <h3 className="font-medium text-lg mt-5 mb-2">{children}</h3>,
                p: ({ children }) => <p className="my-3">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="w-full border-collapse text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-pp-ink/15 px-3 py-2 text-left">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-pp-ink/15 px-3 py-2 align-top">{children}</td>
                ),
              }}
            >
              {selectedReport.output_text}
            </ReactMarkdown>
          </div>
        </article>
      )}
    </section>
  );
}
