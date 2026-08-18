'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  acaoAposFalhaDaDemo,
  decidirCabecalho,
  decidirOferta,
  freeDemoStateFromRpc,
  podeGerarDemo,
  type FreeDemoState,
} from './free-demo-view';

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

/**
 * O gate do Relatório Pró pago — o MESMO endpoint de sempre, agora num
 * lugar só. Ele é consultado de dois pontos (a montagem da avaliação salva
 * e o clique em gerar), e duplicar o `fetch` seria duplicar a chance de os
 * dois divergirem. Continua havendo um gate, e 403 continua sendo o único
 * sinal de "sem acesso".
 */
type AcessoPro =
  | { tipo: 'ativo'; monthlyCount: number; monthlyLimit: number }
  | { tipo: 'sem_acesso' }
  | { tipo: 'erro'; message: string | null };

async function consultarAcessoPro(): Promise<AcessoPro> {
  try {
    const response = await fetch('/api/assistant/generate', { method: 'GET' });

    if (response.status === 403) return { tipo: 'sem_acesso' };
    if (!response.ok) return { tipo: 'erro', message: await responseMessage(response) };

    const body = await response.json();
    return {
      tipo: 'ativo',
      monthlyCount: typeof body.monthly_count === 'number' ? body.monthly_count : 0,
      monthlyLimit: typeof body.monthly_limit === 'number' ? body.monthly_limit : 50,
    };
  } catch {
    return { tipo: 'erro', message: null };
  }
}

/**
 * A consulta READ-ONLY de status. NÃO reserva, não gera, não consome: a
 * reserva continua acontecendo só no POST, imediatamente antes da IA.
 *
 * Fica fora do componente e DEVOLVE o estado em vez de gravá-lo. Quem decide
 * o que fazer com a resposta é quem chamou — e é isso que permite ao efeito
 * de montagem tocar o estado só dentro de callbacks.
 */
async function consultarStatusDemo(id: string): Promise<FreeDemoState> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      'corrigefacil_free_demo_report_status',
      { assessment_uuid: id },
    );
    // Erro NÃO vira `available`: sem resposta do banco a tela não promete
    // relatório grátis nenhum.
    return error ? 'error' : freeDemoStateFromRpc(data);
  } catch {
    return 'error';
  }
}

export function CorrigeFacilReportPanel({
  assessmentId,
  ensureAssessmentId,
  /** Esta tela é o SEGUNDO contato — a avaliação já salva, reaberta pelo
   *  histórico —, onde a demonstração gratuita pode ser oferecida.
   *
   *  A prop não autoriza nada e não fala de instrumento: quem decide se a
   *  avaliação é elegível é a RPC, por `is_free_demo`. Testar
   *  `instrument === 'FDT'` aqui amarraria o funil a um código e quebraria
   *  no dia em que outro instrumento for marcado como gratuito.
   *
   *  Ausente por padrão: a tela do resultado recém-corrigido (AvaliarClient)
   *  não a passa, e continua exatamente como está. */
  freeDemoContext = false,
}: {
  assessmentId: string | null;
  ensureAssessmentId?: () => Promise<string | null>;
  freeDemoContext?: boolean;
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
  /** Estado da demonstração gratuita. Nasce em `checking` quando esta é a
   *  tela do segundo contato: até a consulta responder, a tela não afirma
   *  nem oferta paga nem gratuidade. */
  const [demo, setDemo] = useState<FreeDemoState>(
    freeDemoContext ? 'checking' : 'idle',
  );
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

  /** Reconsulta o status a pedido da tela (botões "Verificar novamente" e
   *  "Tentar novamente", e o reposicionamento depois de uma falha). */
  const verificarDemo = useCallback(async (id: string) => {
    setDemo('checking');
    setDemo(await consultarStatusDemo(id));
  }, []);

  /** Na avaliação salva, o estado é descoberto sozinho: o profissional não
   *  deveria precisar clicar para saber o que a tela tem a oferecer.
   *
   *  O gate pago responde primeiro — 200 é assinante e encerra o assunto;
   *  403 é quem pode ver a demonstração. Só então se consulta o status.
   *
   *  Em cadeia de promessas, e não em função async chamada direto: todo
   *  `setState` daqui acontece dentro de callback, como no efeito de
   *  DetalheClient. `ativo` evita gravar estado depois de desmontar. */
  useEffect(() => {
    if (!freeDemoContext || !resolvedAssessmentId) return;

    const id = resolvedAssessmentId;
    let ativo = true;

    consultarAcessoPro()
      .then(async (acesso) => {
        if (!ativo) return;

        if (acesso.tipo === 'erro') {
          setAccess('error');
          setDemo('error');
          return;
        }

        if (acesso.tipo === 'ativo') {
          setMonthlyCount(acesso.monthlyCount);
          setMonthlyLimit(acesso.monthlyLimit);
          setAccess('active');
          return;
        }

        // Sem Pró: é aqui que se descobre se há demonstração a oferecer.
        setAccess('inactive');
        const estado = await consultarStatusDemo(id);
        if (ativo) setDemo(estado);
      })
      .catch(() => {
        if (!ativo) return;
        setAccess('error');
        setDemo('error');
      });

    return () => {
      ativo = false;
    };
  }, [freeDemoContext, resolvedAssessmentId]);

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

      const acesso = await consultarAcessoPro();

      if (acesso.tipo === 'sem_acesso') {
        setAccess('inactive');
        setComposerOpen(false);
        // Sem Pró na tela do segundo contato: aqui é que se descobre se há
        // demonstração a oferecer.
        if (freeDemoContext) await verificarDemo(id);
        return;
      }
      if (acesso.tipo === 'erro') {
        setAccess('error');
        setMessage(
          acesso.message ??
            'Não foi possível verificar o Relatório Pró agora. Tente novamente.',
        );
        return;
      }

      setMonthlyCount(acesso.monthlyCount);
      setMonthlyLimit(acesso.monthlyLimit);
      setAccess('active');
      setComposerOpen(true);
    } catch {
      setAccess('error');
      setMessage('Não foi possível verificar o Relatório Pró agora. Tente novamente.');
    }
  }

  async function generateReport() {
    if (!reportType || generating) return;
    // Sem demonstração disponível não há POST. `in_progress` e
    // `indeterminado` são justamente os estados em que gerar de novo
    // duplicaria trabalho que talvez já esteja em curso — e o backend, que é
    // quem decide, devolveria `in_progress` de qualquer modo.
    if (freeDemoContext && access === 'inactive' && !podeGerarDemo(demo)) return;
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

      // Fora do fluxo da demonstração, 403 continua sendo só "não tem
      // acesso" e some sem mensagem — é o gate de sempre. DENTRO dele, um
      // 403 pode significar coisas muito diferentes (a chance acabou, o
      // perfil mudou, a avaliação deixou de ser elegível), e engolir a
      // mensagem esconderia justamente o que o profissional precisa ler.
      if (response.status === 403 && !freeDemoContext) {
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

        if (freeDemoContext) {
          setComposerOpen(false);
          // NUNCA um segundo POST automático, em nenhum dos ramos.
          //
          // 503 é o estado indeterminado do backend: ele chamou a IA e não
          // conseguiu confirmar se a linha ficou concluída. Reconsultar
          // poderia devolver `available` e a tela convidaria a gerar de novo
          // algo que talvez já esteja no histórico. Nos demais erros o estado
          // é conhecível, e perguntar ao banco reposiciona a tela sozinho.
          if (acaoAposFalhaDaDemo(response.status) === 'indeterminado') {
            setDemo('indeterminado');
          } else {
            const atual = await resolveAssessment();
            if (atual) await verificarDemo(atual);
          }
        }
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
      // A demonstração NÃO transforma a conta em assinante: quem estava sem
      // Pró continua sem Pró, e a chance passa a estar usada. Nada disso é
      // gravado no navegador — na volta, o banco volta a ser a verdade.
      if (freeDemoContext && access === 'inactive') {
        setDemo('already_used');
      } else {
        setAccess('active');
      }

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

  const oferta = decidirOferta({ access, composerOpen, freeDemoContext, demo });
  const cabecalho = decidirCabecalho({ access, freeDemoContext, demo });

  async function reverificarDemo() {
    const id = await resolveAssessment();
    if (id) await verificarDemo(id);
  }

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
          {cabecalho === 'padrao' && (
            <>
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
            </>
          )}

          {cabecalho === 'demo_disponivel' && (
            <>
              <h2 className="text-pp-ink text-lg sm:text-xl font-medium leading-snug">
                Experimente o Relatório Pró gratuitamente.
              </h2>
              <p className="text-pp-ink text-sm leading-relaxed max-w-prose">
                Gere 1 relatório profissional a partir desta avaliação e veja
                como o resultado fica organizado para uso profissional.
              </p>
              <p className="text-pp-ink-soft text-xs leading-relaxed">
                1 relatório gratuito por conta · sem cobrança.
              </p>
            </>
          )}

          {cabecalho === 'demo_ja_usada' && (
            <>
              <h2 className="text-pp-ink text-lg sm:text-xl font-medium leading-snug">
                Você já experimentou o Relatório Pró.
              </h2>
              <p className="text-pp-ink text-sm leading-relaxed max-w-prose">
                Continue transformando suas avaliações em relatórios
                profissionais.
              </p>
            </>
          )}

          {cabecalho === 'demo_andamento' && (
            <>
              <h2 className="text-pp-ink text-lg sm:text-xl font-medium leading-snug">
                Seu relatório gratuito está sendo processado.
              </h2>
              <p className="text-pp-ink text-sm leading-relaxed max-w-prose">
                Já existe uma geração em andamento. Aguarde alguns instantes
                antes de tentar novamente.
              </p>
            </>
          )}
        </div>

        {/* Blocos mutuamente exclusivos: `decidirOferta` escolhe UM. A
            decisão mora em free-demo-view.ts, onde pode ser provada caso a
            caso — e não espalhada em ternários dentro do JSX. */}

        {oferta === 'demo_verificando' && (
          /* Enquanto a consulta está em voo a tela não afirma nada: nem
             oferta paga, nem gratuidade. Copy neutra de propósito — ela
             aparece também para quem tem Pró, por um instante. */
          <output className="block text-sm text-pp-ink-soft">
            Verificando seu acesso ao Relatório Pró…
          </output>
        )}

        {oferta === 'demo_disponivel' && (
          /* CTA ÚNICA. O checkout não aparece aqui como concorrente do mesmo
             peso: a esteira é experimentar → ver valor → comprar, e duas
             ofertas primárias na mesma tela não convertem nem uma. */
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setComposerOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Gerar relatório grátis
            </button>
            <p className="text-xs text-pp-ink-soft">
              Edite o texto antes de imprimir ou salvar em PDF.
            </p>
          </div>
        )}

        {oferta === 'demo_andamento' && (
          /* Verificar NÃO gera e NÃO reserva: só reconsulta o status. */
          <button
            type="button"
            onClick={reverificarDemo}
            className="rounded-pill border border-pp-ink/15 px-5 py-3 text-sm text-pp-ink hover:border-pp-ink/40 transition"
          >
            Verificar novamente
          </button>
        )}

        {oferta === 'demo_indeterminado' && (
          /* O backend não conseguiu confirmar se o relatório ficou pronto.
             Ele PODE ter ficado. Nenhum POST novo daqui, nenhum checkout
             imediato, nenhuma conclusão sobre a chance: a mensagem do
             backend fica na tela e o caminho é verificar. */
          <div className="space-y-3">
            <button
              type="button"
              onClick={reverificarDemo}
              className="rounded-pill border border-pp-ink/15 px-5 py-3 text-sm text-pp-ink hover:border-pp-ink/40 transition"
            >
              Verificar novamente
            </button>
          </div>
        )}

        {oferta === 'demo_erro' && (
          /* FAIL CLOSED: sem resposta do banco, nada de "você ganhou um
             relatório grátis". */
          <div className="space-y-2">
            <p className="text-sm text-pp-ink">
              Não foi possível verificar sua demonstração gratuita agora.
            </p>
            <button
              type="button"
              onClick={reverificarDemo}
              className="rounded-pill border border-pp-ink/15 px-5 py-3 text-sm text-pp-ink hover:border-pp-ink/40 transition"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {oferta === 'checkout' && (
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
        )}

        {oferta === 'composer' && (
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
        )}

        {oferta === 'padrao' && (
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
