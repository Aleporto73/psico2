'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface AccessStatus {
  has_active_assistant: boolean;
  assistant_expires_at: string | null;
}

interface AiReport {
  id: string;
  title: string | null;
  report_type: string | null;
  output_text: string;
  created_at: string;
}

interface FormState {
  nome: string;
  idade: string;
  area: string;
  objetivo: string;
  planilhaData: string;
  observacoes: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppAssistenteProPage() {
  const supabase = createClient();

  // Status de acesso
  const [profile, setProfile] = useState<AccessStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Histórico
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [dailyCount, setDailyCount] = useState<number | null>(null);

  // Formulário
  const [form, setForm] = useState<FormState>({
    nome: '',
    idade: '',
    area: '',
    objetivo: '',
    planilhaData: '',
    observacoes: '',
  });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<AiReport | null>(null);

  // Modal de visualização
  const [modalReport, setModalReport] = useState<AiReport | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch Status ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAssistantStatus();
  }, []);

  const fetchAssistantStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await supabase
        .from('user_access_status')
        .select('has_active_assistant, assistant_expires_at')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);

      if (data?.has_active_assistant) {
        fetchReports(user.id);
        fetchDailyCount(user.id);
      }
    } catch (err) {
      console.error('Error loading assistant status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchReports = useCallback(async (userId: string) => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('id, title, report_type, output_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data ?? []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [supabase]);

  const fetchDailyCount = useCallback(async (userId: string) => {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('ai_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString());

    setDailyCount(count ?? 0);
  }, [supabase]);

  // ── Lógica de Estado ──────────────────────────────────────────────────────

  let assistantState: 'loading' | 'blocked' | 'active' | 'expired' = 'loading';
  if (!loadingStatus) {
    if (profile?.has_active_assistant) {
      assistantState = 'active';
    } else if (profile?.assistant_expires_at) {
      assistantState = 'expired';
    } else {
      assistantState = 'blocked';
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setGenerateError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    setLastReport(null);

    try {
      const res = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        setGenerateError(json.message || 'Erro ao gerar relatório. Tente novamente.');
        return;
      }

      // Sucesso — mostrar relatório gerado e atualizar histórico
      setLastReport(json.report);
      if (json.daily_count !== undefined) setDailyCount(json.daily_count);

      // Recarregar lista de relatórios
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) fetchReports(user.id);

      // Limpar formulário
      setForm({ nome: '', idade: '', area: '', objetivo: '', planilhaData: '', observacoes: '' });

      // Rolar para o relatório gerado
      setTimeout(() => {
        document.getElementById('last-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setGenerateError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback silencioso
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingStatus) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400 text-sm">
        Carregando status do assistente...
      </div>
    );
  }

  const DAILY_LIMIT = 20;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Assistente IA Pro</h1>
        <p className="text-slate-400 text-sm mt-1">
          Geração inteligente de rascunhos de apoio operacional a partir dos dados das suas planilhas profissionais.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STATE: ATIVO
      ══════════════════════════════════════════════════════════════════ */}
      {assistantState === 'active' && (
        <>
          {/* Badge de status + vencimento */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Assinatura Ativa
            </span>
            <span className="text-xs text-slate-500">
              Válido até:{' '}
              <strong className="text-amber-500">{formatDate(profile?.assistant_expires_at)}</strong>
            </span>
            {dailyCount !== null && (
              <span className="text-xs text-slate-500">
                Gerações hoje:{' '}
                <strong className={dailyCount >= DAILY_LIMIT ? 'text-red-400' : 'text-slate-300'}>
                  {dailyCount}/{DAILY_LIMIT}
                </strong>
              </span>
            )}
          </div>

          {/* ── Resultado da última geração ─────────────────────────────── */}
          {lastReport && (
            <div id="last-report" className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">✅</span>
                  <h3 className="text-sm font-bold text-emerald-300">Rascunho Gerado com Sucesso</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(lastReport.output_text, 'last')}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                  >
                    {copiedId === 'last' ? '✓ Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => setModalReport(lastReport)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                  >
                    Ver Completo
                  </button>
                </div>
              </div>
              <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans line-clamp-6 overflow-hidden">
                {lastReport.output_text}
              </pre>
              <p className="text-[10px] text-slate-500">
                Salvo em: {formatDateTime(lastReport.created_at)}
              </p>
            </div>
          )}

          {/* ── Erro de geração ─────────────────────────────────────────── */}
          {generateError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 leading-relaxed">
              ⚠️ {generateError}
            </div>
          )}

          {/* ── Formulário de Geração ───────────────────────────────────── */}
          <section className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Gerar Rascunho de Apoio</h2>
              <p className="text-xs text-slate-400 mt-1">
                Preencha os campos com os dados da sua planilha. Quanto mais detalhado, melhor a qualidade do rascunho.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4" id="generate-form">

              {/* Linha 1: Nome + Idade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="nome" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Nome / Identificação <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    value={form.nome}
                    onChange={handleFormChange}
                    placeholder="Ex.: Paciente A (use identificação, não nome completo)"
                    maxLength={200}
                    required
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="idade" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Idade / Faixa Etária
                  </label>
                  <input
                    id="idade"
                    name="idade"
                    type="text"
                    value={form.idade}
                    onChange={handleFormChange}
                    placeholder="Ex.: 8 anos, Adulto 25-30 anos"
                    maxLength={50}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition"
                  />
                </div>
              </div>

              {/* Área do Relatório */}
              <div className="space-y-1.5">
                <label htmlFor="area" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Área do Relatório <span className="text-red-400">*</span>
                </label>
                <select
                  id="area"
                  name="area"
                  value={form.area}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition"
                >
                  <option value="" className="text-slate-600">Selecione a área...</option>
                  <option value="Avaliação Psicológica">Avaliação Psicológica</option>
                  <option value="Avaliação Psicopedagógica">Avaliação Psicopedagógica</option>
                  <option value="Desenvolvimento Cognitivo">Desenvolvimento Cognitivo</option>
                  <option value="Habilidades Socioemocionais">Habilidades Socioemocionais</option>
                  <option value="Memória e Atenção">Memória e Atenção</option>
                  <option value="Linguagem e Comunicação">Linguagem e Comunicação</option>
                  <option value="Aprendizagem Escolar">Aprendizagem Escolar</option>
                  <option value="Comportamento Adaptativo">Comportamento Adaptativo</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* Objetivo */}
              <div className="space-y-1.5">
                <label htmlFor="objetivo" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Objetivo do Relatório <span className="text-red-400">*</span>
                </label>
                <input
                  id="objetivo"
                  name="objetivo"
                  type="text"
                  value={form.objetivo}
                  onChange={handleFormChange}
                  placeholder="Ex.: Sintetizar resultados para encaminhamento escolar"
                  maxLength={500}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition"
                />
              </div>

              {/* Dados da Planilha */}
              <div className="space-y-1.5">
                <label htmlFor="planilhaData" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Dados da Planilha <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="planilhaData"
                  name="planilhaData"
                  value={form.planilhaData}
                  onChange={handleFormChange}
                  placeholder="Cole aqui os resultados brutos da planilha: pontuações, percentis fornecidos, categorias, subtestes, etc."
                  rows={7}
                  maxLength={4000}
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition resize-y font-mono leading-relaxed"
                />
                <p className="text-[10px] text-slate-600 text-right">
                  {form.planilhaData.length}/4000 caracteres
                </p>
              </div>

              {/* Observações Opcionais */}
              <div className="space-y-1.5">
                <label htmlFor="observacoes" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Observações Adicionais <span className="text-slate-600 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={form.observacoes}
                  onChange={handleFormChange}
                  placeholder="Contexto adicional: histórico relevante, queixa principal, informações do responsável, etc."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition resize-y"
                />
              </div>

              {/* Aviso de responsabilidade no formulário */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs text-amber-500/80 leading-relaxed">
                ⚠️ O rascunho gerado é um <strong>texto inicial de apoio operacional</strong> e deve ser revisado, completado e validado pelo profissional responsável antes de qualquer uso formal. Nenhum dado é diagnosticado ou inferido automaticamente.
              </div>

              {/* Botão de envio */}
              <button
                type="submit"
                disabled={generating || (dailyCount !== null && dailyCount >= DAILY_LIMIT)}
                className="w-full py-3 font-bold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Gerando rascunho...
                  </>
                ) : dailyCount !== null && dailyCount >= DAILY_LIMIT ? (
                  '🔒 Limite diário atingido'
                ) : (
                  '✨ Gerar Rascunho de Apoio'
                )}
              </button>
            </form>
          </section>

          {/* ── Histórico de Relatórios ─────────────────────────────────── */}
          <section className="space-y-4">
            <div className="border-t border-slate-850 pt-6">
              <h2 className="text-lg font-bold text-white">Histórico de Relatórios</h2>
              <p className="text-xs text-slate-400 mt-1">Seus últimos 50 rascunhos gerados, mais recentes primeiro.</p>
            </div>

            {loadingReports ? (
              <div className="text-center text-slate-500 text-sm py-6">Carregando histórico...</div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900/20 border border-dashed border-slate-850 rounded-2xl text-sm">
                Nenhum relatório gerado ainda. Use o formulário acima para criar seu primeiro rascunho.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-start gap-3 hover:border-slate-750 transition duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {report.title || 'Relatório sem título'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {report.report_type && (
                          <span className="mr-2 px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                            {report.report_type}
                          </span>
                        )}
                        {formatDateTime(report.created_at)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {report.output_text.slice(0, 150)}...
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(report.output_text, report.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition whitespace-nowrap"
                      >
                        {copiedId === report.id ? '✓ Copiado!' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => setModalReport(report)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition whitespace-nowrap"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STATE: EXPIRADO
      ══════════════════════════════════════════════════════════════════ */}
      {assistantState === 'expired' && (
        <div className="p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 text-center max-w-2xl mx-auto space-y-6">
          <div className="text-5xl">🔒</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Sua Assinatura Expirou</h2>
            <p className="text-slate-400 text-xs leading-normal">
              Acesso encerrado em:{' '}
              <strong className="text-amber-400/80">{formatDate(profile?.assistant_expires_at)}</strong>
            </p>
            <p className="text-slate-400 text-sm leading-relaxed pt-2">
              Renove sua assinatura anual do Assistente IA Pro por apenas{' '}
              <strong className="text-amber-400">R$50/ano</strong> para continuar gerando rascunhos de apoio a
              partir das suas planilhas profissionais.
            </p>
          </div>
          <button
            type="button"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition duration-200"
          >
            Renovar Assinatura (R$50/ano)
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STATE: BLOQUEADO / NUNCA ASSINOU
      ══════════════════════════════════════════════════════════════════ */}
      {assistantState === 'blocked' && (
        <div className="p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 text-center max-w-2xl mx-auto space-y-6">
          <div className="text-5xl">🔒</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Assistente IA Pro Bloqueado</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              O Assistente IA Pro é um recurso adicional com assinatura anual. Assine por apenas{' '}
              <strong className="text-amber-400">R$50/ano</strong> para gerar rascunhos de apoio estruturados
              diretamente integrados com seus dados de planilhas profissionais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2 text-xs text-slate-400">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
              ⚡ <strong>Rapidez Operacional</strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Gere rascunhos estruturados a partir dos dados da planilha em segundos.
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
              📝 <strong>Histórico Completo</strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Todos os rascunhos gerados ficam salvos e acessíveis a qualquer momento.
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
              🔒 <strong>100% Seguro</strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Dados processados com segurança. Nenhum dado é retido pela IA.
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
              📋 <strong>Totalmente Editável</strong>
              <p className="text-[11px] text-slate-500 mt-1">
                O rascunho é um ponto de partida. Copie, edite e complemente conforme necessário.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition duration-200 shadow-md shadow-amber-500/10"
          >
            Assinar por R$50/ano
          </button>
        </div>
      )}

      {/* ── Aviso de uso responsável ──────────────────────────────────────── */}
      <footer className="pt-4 border-t border-slate-850">
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 leading-relaxed max-w-3xl mx-auto">
          <strong>Aviso de uso responsável:</strong> O Assistente IA Pro gera rascunhos iniciais de apoio operacional a
          partir dos dados inseridos pelo profissional. O texto gerado deve ser minuciosamente revisado, completado e
          interpretado pelo profissional responsável antes de qualquer uso formal, exigindo a posse e conformidade com
          o manual técnico original do instrumento utilizado. Nenhuma funcionalidade do Assistente IA Pro substitui a
          avaliação, diagnóstico ou interpretação de um profissional qualificado.
        </div>
      </footer>

      {/* ── Modal de Visualização Completa ───────────────────────────────── */}
      {modalReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 relative flex flex-col space-y-4 shadow-2xl my-auto">
            {/* Header do modal */}
            <div className="flex justify-between items-start gap-4 border-b border-slate-800 pb-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-200 truncate">
                  {modalReport.title || 'Relatório'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatDateTime(modalReport.created_at)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(modalReport.output_text, `modal-${modalReport.id}`)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                >
                  {copiedId === `modal-${modalReport.id}` ? '✓ Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={() => setModalReport(null)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700 transition"
                  aria-label="Fechar modal"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            {/* Conteúdo do relatório */}
            <div className="max-h-[60vh] overflow-y-auto">
              <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {modalReport.output_text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
