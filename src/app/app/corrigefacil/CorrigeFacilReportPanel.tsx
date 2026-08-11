'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type ReportType = 'family' | 'school' | 'technical' | 'internal';

type AiReport = {
  id: string | null;
  title: string | null;
  report_type: string | null;
  /** Só a resposta do POST traz o texto. A LISTA não busca mais: ela mostra
   *  destino e data, e quem lê a narrativa é o documento. Carregar N
   *  relatórios inteiros para exibir duas linhas cada era custo da
   *  visualização inline que deixou de existir. */
  output_text?: string;
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
  const [message, setMessage] = useState<string | null>(null);
  /** FALLBACK DE ERRO, não uma segunda UX. Só existe quando a IA gerou e o
   *  INSERT em ai_reports falhou: a unidade já foi cobrada, o texto veio na
   *  resposta e não há rota canônica para ele. Some na próxima geração. */
  const [unsavedReport, setUnsavedReport] = useState<{
    texto: string;
    aviso: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (assessmentId) setResolvedAssessmentId(assessmentId);
  }, [assessmentId]);

  const loadReports = useCallback(async (id: string) => {
    setReportsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ai_reports')
        .select('id, title, report_type, created_at')
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
      const id = await resolveAssessment();
      if (!id) {
        setAccess('idle');
        setMessage('Não foi possível salvar a avaliação antes de abrir o Relatório Pró.');
        return;
      }

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
    // Geração nova zera o resgate anterior: se aquele texto não foi copiado,
    // ele já se perdeu, e mantê-lo na tela ao lado de um relatório novo só
    // confundiria qual é qual.
    setUnsavedReport(null);
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

      // O relatório já está gravado e a cota já foi consumida por ESTE POST.
      // Abrir o documento é só navegação — nenhuma segunda requisição, nenhuma
      // segunda unidade.
      if (report.id) {
        router.push(
          `/app/corrigefacil/avaliacoes/${encodeURIComponent(id)}/relatorios/${encodeURIComponent(report.id)}`,
        );
        return;
      }

      // `id` nulo com 200: a IA gerou, a unidade foi cobrada e o INSERT em
      // ai_reports falhou. Não existe rota canônica para um relatório que não
      // foi salvo, e o texto só existe NESTA resposta — some no reload. Sem
      // este resgate, o profissional perde uma geração que já pagou.
      // Não há retry, não há segundo POST: a saída é copiar agora.
      setUnsavedReport({
        texto: report.output_text ?? '',
        aviso:
          typeof body?.message === 'string'
            ? body.message
            : 'Relatório gerado, mas não foi possível salvá-lo no histórico.',
      });
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

  async function copiarTexto(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setMessage('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.');
    }
  }

  const actionLabel =
    reports.length > 0 ? 'Gerar outro relatório completo' : 'Gerar relatório completo';

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
                {/* UM caminho só. O documento completo é o relatório: não
                    existe mais uma segunda representação do mesmo conteúdo
                    aqui dentro, com metade das informações e outra ideia de
                    layout. Sem `report.id` não há rota, e aí a linha aparece
                    sem ação em vez de abrir algo que não existe. */}
                {report.id && resolvedAssessmentId && (
                  <Link
                    href={`/app/corrigefacil/avaliacoes/${encodeURIComponent(resolvedAssessmentId)}/relatorios/${encodeURIComponent(report.id)}`}
                    className="rounded-pill border border-pp-ink/15 px-4 py-2 text-sm text-pp-ink hover:border-pp-ink/40 transition"
                  >
                    Abrir relatório
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reportsLoading && (
        <output className="block text-sm text-pp-ink-soft print:hidden">Carregando relatórios…</output>
      )}

      {/* O card de oferta. Ele fica DEPOIS do resultado (quem posiciona são
          AvaliarClient e DetalheClient) porque a promessa só faz sentido
          quando já existe um resultado na tela para transformar.

          A hierarquia é eyebrow → título → o que o relatório entrega → para
          quem serve → CTA → microcopy do CTA. Nenhuma promessa fora do fluxo
          implementado: o que está escrito aqui é exatamente o que o
          documento canônico faz (gerar, revisar, editar, imprimir/PDF). */}
      <div className="bg-pp-block-lilac/40 border border-pp-block-lilac rounded-block p-6 sm:p-7 space-y-5 print:hidden">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Relatórios Pro
          </p>
          <h2 className="text-pp-ink text-lg sm:text-xl font-medium leading-snug">
            Transforme esta avaliação em um relatório profissional.
          </h2>
          <p className="text-pp-ink text-sm leading-relaxed max-w-prose">
            Gere um relatório completo a partir deste resultado, com análise
            organizada, considerações para o contexto e recomendações prontas
            para revisar, editar e salvar.
          </p>
          <p className="text-pp-ink-soft text-xs leading-relaxed">
            Ideal para escola, família, equipe multiprofissional ou registro
            interno.
          </p>
          {access === 'active' && monthlyCount !== null && (
            <p className="text-xs text-pp-ink-soft tabular-nums pt-1">
              {monthlyCount} de {monthlyLimit} relatórios utilizados neste mês.
            </p>
          )}
        </div>

        {access === 'inactive' ? (
          /* SEM ACESSO. Mesmo gate e mesmo checkout de antes — só o rótulo e
             a microcopy mudaram. O plano continua sendo exibido como está
             cadastrado: esta etapa não decide preço. */
          <div className="space-y-3">
            <p className="text-sm text-pp-ink-soft">
              50 relatórios por mês durante 12 meses · R$57 — pagamento único.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={goToCheckout}
                disabled={preparingCheckout}
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-50"
              >
                {preparingCheckout ? 'Salvando avaliação…' : 'Desbloquear Relatórios Pro'}
              </button>
              {/* "Assine" sugeriria recorrência num produto de pagamento
                  único, e o nome do produto já é o do eyebrow — não se
                  introduz um segundo nome comercial aqui. */}
              <p className="text-xs text-pp-ink-soft">
                Tenha acesso aos Relatórios Pro e gere relatórios completos com
                base nesta avaliação.
              </p>
            </div>
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
          /* COM ACESSO (e também o estado inicial, antes de o gate responder).
             Mesmo `openGenerator` de sempre: ele salva a avaliação, consulta o
             endpoint único de acesso e abre o compositor. Não há fluxo
             paralelo de geração. */
          <div className="space-y-2">
            <button
              type="button"
              onClick={openGenerator}
              disabled={access === 'checking'}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {access === 'checking' ? 'Salvando e verificando acesso…' : actionLabel}
            </button>
            <p className="text-xs text-pp-ink-soft">
              Edite o texto antes de imprimir ou salvar em PDF.
            </p>
          </div>
        )}

        {message && (
          <p role="alert" className="text-sm text-pp-ink">
            {message}
          </p>
        )}
      </div>

      {/* RESGATE. Não é o relatório: é o texto de uma geração que já foi
          cobrada e não chegou ao histórico. Sem `ai_report` salvo não existe
          documento canônico, então aqui NÃO há "Abrir relatório", rota,
          impressão, tabela nem gráfico — só o texto e como levá-lo embora.

          Em pré-formatado, não em Markdown renderizado: o que aparece é
          exatamente o que o botão copia, e isto não pode virar uma segunda
          leitura concorrendo com o documento canônico. */}
      {unsavedReport && (
        <section
          role="alert"
          className="border border-pp-block-coral rounded-block p-6 space-y-4 print:hidden"
        >
          <div className="space-y-1">
            <p className="text-pp-ink text-sm font-medium">{unsavedReport.aviso}</p>
            <p className="text-pp-ink-soft text-xs">
              Copie o texto agora para não perder o conteúdo. Esta geração já foi
              contabilizada, e o texto não ficará disponível depois que você sair
              desta tela.
            </p>
          </div>

          <button
            type="button"
            onClick={() => copiarTexto(unsavedReport.texto)}
            className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-5 py-2.5 text-sm text-pp-ink hover:border-pp-ink/40 transition"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
            {copiado ? 'Copiado' : 'Copiar texto'}
          </button>

          <div className="max-h-96 overflow-y-auto rounded-2xl border border-pp-ink/10 bg-white/60 p-4">
            <p className="whitespace-pre-wrap text-sm leading-[1.7] text-pp-ink break-words">
              {unsavedReport.texto}
            </p>
          </div>
        </section>
      )}
    </section>
  );
}
