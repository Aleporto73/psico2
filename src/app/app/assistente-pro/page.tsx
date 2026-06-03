'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ── Constantes de imagem ──────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function IconLockLarge() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 10 9 10" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="15.5" y2="14" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
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

  // Imagem opcional (print da planilha/gráfico)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ name: string; sizeKb: number } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_MIME.includes(mime)) {
      setImageError('Formato não suportado. Use PNG, JPG/JPEG ou WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setImageError(`Imagem muito grande (${mb} MB). Limite: 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
      setImageMeta({ name: file.name, sizeKb: Math.round(file.size / 1024) });
    } catch (err: any) {
      setImageError(err?.message || 'Não foi possível ler a imagem selecionada.');
    }
  };

  const handleRemoveImage = () => {
    setImageDataUrl(null);
    setImageMeta(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    setLastReport(null);

    try {
      const payload: Record<string, any> = { ...form };
      if (imageDataUrl) {
        payload.imageDataUrl = imageDataUrl;
      }

      const res = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setGenerateError(json.message || 'Erro ao gerar relatório. Tente novamente.');
        if (typeof json.daily_count === 'number') setDailyCount(json.daily_count);
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

      // Limpar formulário e imagem
      setForm({ nome: '', idade: '', area: '', objetivo: '', planilhaData: '', observacoes: '' });
      handleRemoveImage();

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
      <div className="flex h-[60vh] items-center justify-center text-[#CBD5E1]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p>Carregando status do assistente...</p>
        </div>
      </div>
    );
  }

  const DAILY_LIMIT = 20;

  const inputCls = "w-full px-4 py-3 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:ring-1 focus:ring-[#7DD3FC] focus:border-[#7DD3FC] transition";
  const labelCls = "block text-sm font-bold text-[#CBD5E1]";

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Assistente IA Pro</h1>
        <p className="text-[#CBD5E1] text-base mt-1">
          Geração inteligente de rascunhos de apoio a partir dos dados das suas planilhas profissionais.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STATE: ATIVO
      ══════════════════════════════════════════════════════════════════ */}
      {assistantState === 'active' && (
        <>
          {/* Badge de status + vencimento */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] inline-block animate-pulse" />
              Assinatura Ativa
            </span>
            <span className="text-sm text-[#CBD5E1]">
              Válido até:{' '}
              <strong className="text-[#7DD3FC]">{formatDate(profile?.assistant_expires_at)}</strong>
            </span>
            {dailyCount !== null && (
              <span className="text-sm text-[#CBD5E1]">
                Gerações hoje:{' '}
                <strong className={dailyCount >= DAILY_LIMIT ? 'text-[#FB7185]' : 'text-[#F8FAFC]'}>
                  {dailyCount}/{DAILY_LIMIT}
                </strong>
              </span>
            )}
          </div>

          {/* ── Resultado da última geração ─────────────────────────────── */}
          {lastReport && (
            <div id="last-report" className="p-6 bg-[#34D399]/5 border border-[#34D399]/25 rounded-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[#34D399]">
                  <IconCheck />
                  <h3 className="text-base font-bold">Rascunho gerado com sucesso</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(lastReport.output_text, 'last')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] rounded-xl border border-[#1F4D5C] transition"
                  >
                    {copiedId === 'last' ? (<><IconCheck /> Copiado</>) : 'Copiar'}
                  </button>
                  <button
                    onClick={() => setModalReport(lastReport)}
                    className="px-4 py-2 text-sm font-semibold bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] rounded-xl border border-[#1F4D5C] transition"
                  >
                    Ver completo
                  </button>
                </div>
              </div>
              <pre className="text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-wrap font-sans line-clamp-6 overflow-hidden">
                {lastReport.output_text}
              </pre>
              <p className="text-xs text-[#94A3B8]">
                Salvo em: {formatDateTime(lastReport.created_at)}
              </p>
            </div>
          )}

          {/* ── Erro de geração ─────────────────────────────────────────── */}
          {generateError && (
            <div className="p-4 bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl text-base text-[#FB7185] leading-relaxed flex items-start gap-2">
              <span className="shrink-0 mt-0.5"><IconAlert /></span>
              <span>{generateError}</span>
            </div>
          )}

          {/* ── Formulário de Geração ───────────────────────────────────── */}
          <section className="p-6 md:p-8 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">Gerar rascunho de apoio</h2>
              <p className="text-sm text-[#CBD5E1] mt-1">
                Preencha os campos com os dados da sua planilha. Quanto mais detalhado, melhor a qualidade do rascunho. Você também pode anexar um print da planilha ou gráfico.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5" id="generate-form">

              {/* Linha 1: Nome + Idade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nome" className={labelCls}>
                    Nome / Identificação <span className="text-[#FB7185]">*</span>
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
                    className={inputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="idade" className={labelCls}>
                    Idade / Faixa etária
                  </label>
                  <input
                    id="idade"
                    name="idade"
                    type="text"
                    value={form.idade}
                    onChange={handleFormChange}
                    placeholder="Ex.: 8 anos, Adulto 25-30 anos"
                    maxLength={50}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Área do Relatório */}
              <div className="space-y-2">
                <label htmlFor="area" className={labelCls}>
                  Área do relatório <span className="text-[#FB7185]">*</span>
                </label>
                <select
                  id="area"
                  name="area"
                  value={form.area}
                  onChange={handleFormChange}
                  required
                  className={inputCls}
                >
                  <option value="">Selecione a área...</option>
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
              <div className="space-y-2">
                <label htmlFor="objetivo" className={labelCls}>
                  Objetivo do relatório <span className="text-[#FB7185]">*</span>
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
                  className={inputCls}
                />
              </div>

              {/* Dados da Planilha */}
              <div className="space-y-2">
                <label htmlFor="planilhaData" className={labelCls}>
                  Dados da planilha <span className="text-[#FB7185]">*</span>
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
                  className={inputCls + " resize-y font-mono leading-relaxed"}
                />
                <p className="text-xs text-[#94A3B8] text-right">
                  {form.planilhaData.length}/4000 caracteres
                </p>
              </div>

              {/* ── Anexar print (opcional) ─────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#7DD3FC]"><IconImage /></span>
                    <label htmlFor="imagePick" className={labelCls + " !text-base"}>
                      Anexar print da planilha ou gráfico
                    </label>
                  </div>
                  <span className="text-xs text-[#94A3B8] font-normal">Opcional</span>
                </div>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  Envie um print com os resultados, tabela ou gráfico da PsicoPlanilha. PNG, JPG/JPEG ou WEBP até 5 MB.
                </p>

                {!imageDataUrl ? (
                  <label
                    htmlFor="imagePick"
                    className="flex flex-col items-center justify-center w-full min-h-[140px] px-4 py-6 bg-[#0E2A38] border-2 border-dashed border-[#1F4D5C] rounded-xl cursor-pointer hover:border-[#7DD3FC] hover:bg-[#123340] transition text-center"
                  >
                    <span className="text-[#7DD3FC] mb-2"><IconImage /></span>
                    <span className="text-base text-[#F8FAFC] font-semibold">
                      Clique para selecionar uma imagem
                    </span>
                    <span className="text-xs text-[#94A3B8] mt-1">
                      PNG, JPG/JPEG ou WEBP, até 5 MB
                    </span>
                    <input
                      ref={fileInputRef}
                      id="imagePick"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImagePick}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-4 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl space-y-3">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                          {imageMeta?.name || 'Imagem anexada'}
                        </p>
                        {imageMeta && (
                          <p className="text-xs text-[#94A3B8] mt-0.5">
                            {imageMeta.sizeKb >= 1024
                              ? `${(imageMeta.sizeKb / 1024).toFixed(1)} MB`
                              : `${imageMeta.sizeKb} KB`}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#FB7185] bg-[#FB7185]/10 hover:bg-[#FB7185]/20 border border-[#FB7185]/20 rounded-xl transition shrink-0"
                      >
                        <IconTrash /> Remover imagem
                      </button>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-[#1F4D5C] bg-[#061923] max-h-80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageDataUrl}
                        alt="Pré-visualização do print anexado"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                  </div>
                )}

                {imageError && (
                  <div className="p-3 text-sm text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl flex items-start gap-2">
                    <span className="shrink-0 mt-0.5"><IconAlert /></span>
                    <span>{imageError}</span>
                  </div>
                )}
              </div>

              {/* Observações Opcionais */}
              <div className="space-y-2">
                <label htmlFor="observacoes" className={labelCls}>
                  Observações adicionais <span className="text-[#94A3B8] font-normal">(opcional)</span>
                </label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  value={form.observacoes}
                  onChange={handleFormChange}
                  placeholder="Contexto adicional: histórico relevante, queixa principal, informações do responsável, etc."
                  rows={3}
                  maxLength={2000}
                  className={inputCls + " resize-y"}
                />
              </div>

              {/* Aviso de responsabilidade no formulário */}
              <div className="p-4 bg-[#FACC15]/10 border border-[#FACC15]/25 rounded-xl text-sm text-[#CBD5E1] leading-relaxed flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-[#FACC15]"><IconAlert /></span>
                <span>O rascunho gerado é um <strong>texto inicial de apoio operacional</strong> e deve ser revisado, completado e validado pelo profissional responsável antes de qualquer uso formal. Nenhum dado é diagnosticado ou inferido automaticamente.</span>
              </div>

              {/* Botão de envio */}
              <button
                type="submit"
                disabled={generating || (dailyCount !== null && dailyCount >= DAILY_LIMIT)}
                className="w-full py-4 font-bold text-base rounded-xl transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] shadow-md shadow-[#7DD3FC]/15"
              >
                {generating ? (
                  <>
                    <span className="w-5 h-5 border-2 border-[#061923]/30 border-t-[#061923] rounded-full animate-spin" />
                    Gerando rascunho...
                  </>
                ) : dailyCount !== null && dailyCount >= DAILY_LIMIT ? (
                  <><IconLock /> Limite diário atingido</>
                ) : (
                  <><IconSpark /> Gerar rascunho de apoio</>
                )}
              </button>
            </form>
          </section>

          {/* ── Histórico de Relatórios ─────────────────────────────────── */}
          <section className="space-y-4">
            <div className="border-t border-[#1F4D5C] pt-6">
              <h2 className="text-xl font-bold text-[#F8FAFC]">Histórico de relatórios</h2>
              <p className="text-sm text-[#CBD5E1] mt-1">Seus últimos 50 rascunhos gerados, mais recentes primeiro.</p>
            </div>

            {loadingReports ? (
              <div className="text-center text-[#CBD5E1] text-sm py-6">Carregando histórico...</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center bg-[#0B2430]/50 border border-dashed border-[#1F4D5C] rounded-2xl space-y-2">
                <p className="text-[#CBD5E1] text-base">Nenhum relatório gerado ainda.</p>
                <p className="text-[#94A3B8] text-sm">Use o formulário acima para criar seu primeiro rascunho.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-5 bg-[#0B2430] border border-[#1F4D5C] rounded-2xl flex flex-col md:flex-row md:items-start gap-3 hover:border-[#7DD3FC]/40 transition duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-[#F8FAFC] truncate">
                        {report.title || 'Relatório sem título'}
                      </p>
                      <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-2 flex-wrap">
                        {report.report_type && (
                          <span className="px-2 py-0.5 bg-[#0E2A38] rounded-md text-[#CBD5E1]">
                            {report.report_type}
                          </span>
                        )}
                        <span>{formatDateTime(report.created_at)}</span>
                      </p>
                      <p className="text-sm text-[#CBD5E1] mt-2 line-clamp-2 leading-relaxed">
                        {report.output_text.slice(0, 150)}...
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(report.output_text, report.id)}
                        className="px-4 py-2 text-sm font-semibold bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] rounded-xl border border-[#1F4D5C] transition whitespace-nowrap"
                      >
                        {copiedId === report.id ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => setModalReport(report)}
                        className="px-4 py-2 text-sm font-semibold bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] rounded-xl border border-[#1F4D5C] transition whitespace-nowrap"
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
        <div className="p-10 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#FB7185]/10 border border-[#FB7185]/20 flex items-center justify-center text-[#FB7185]">
            <IconLockLarge />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-[#F8FAFC]">Sua assinatura expirou</h2>
            <p className="text-[#CBD5E1] text-sm">
              Acesso encerrado em:{' '}
              <strong className="text-[#FB7185]">{formatDate(profile?.assistant_expires_at)}</strong>
            </p>
            <p className="text-[#CBD5E1] text-base leading-relaxed pt-1">
              Renove sua assinatura anual do Assistente IA Pro por apenas{' '}
              <strong className="text-[#7DD3FC]">R$50/ano</strong> para continuar gerando rascunhos de apoio a
              partir das suas planilhas profissionais.
            </p>
          </div>
          <button
            type="button"
            className="px-8 py-3.5 text-base bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] font-bold rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15"
          >
            Renovar assinatura (R$50/ano)
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STATE: BLOQUEADO / NUNCA ASSINOU
      ══════════════════════════════════════════════════════════════════ */}
      {assistantState === 'blocked' && (
        <div className="p-10 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 flex items-center justify-center text-[#7DD3FC]">
            <IconLockLarge />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-[#F8FAFC]">Assistente IA Pro bloqueado</h2>
            <p className="text-[#CBD5E1] text-base leading-relaxed">
              O Assistente IA Pro é um recurso adicional com assinatura anual. Assine por apenas{' '}
              <strong className="text-[#7DD3FC]">R$50/ano</strong> para gerar rascunhos de apoio estruturados
              diretamente integrados com seus dados de planilhas profissionais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
            <div className="p-4 bg-[#0E2A38] rounded-xl border border-[#1F4D5C] space-y-2">
              <div className="text-[#7DD3FC]"><IconBolt /></div>
              <strong className="text-[#F8FAFC] block text-sm">Rapidez operacional</strong>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Gere rascunhos estruturados a partir dos dados da planilha em segundos.
              </p>
            </div>
            <div className="p-4 bg-[#0E2A38] rounded-xl border border-[#1F4D5C] space-y-2">
              <div className="text-[#7DD3FC]"><IconHistory /></div>
              <strong className="text-[#F8FAFC] block text-sm">Histórico completo</strong>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Todos os rascunhos gerados ficam salvos e acessíveis a qualquer momento.
              </p>
            </div>
            <div className="p-4 bg-[#0E2A38] rounded-xl border border-[#1F4D5C] space-y-2">
              <div className="text-[#7DD3FC]"><IconShield /></div>
              <strong className="text-[#F8FAFC] block text-sm">100% seguro</strong>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Dados processados com segurança. Nenhum dado é retido pela IA.
              </p>
            </div>
            <div className="p-4 bg-[#0E2A38] rounded-xl border border-[#1F4D5C] space-y-2">
              <div className="text-[#7DD3FC]"><IconEdit /></div>
              <strong className="text-[#F8FAFC] block text-sm">Totalmente editável</strong>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                O rascunho é um ponto de partida. Copie, edite e complemente conforme necessário.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-8 py-3.5 text-base bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] font-bold rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15"
          >
            Assinar por R$50/ano
          </button>
        </div>
      )}

      {/* ── Aviso de uso responsável ──────────────────────────────────────── */}
      <footer className="pt-4 border-t border-[#1F4D5C]">
        <div className="p-4 bg-[#0B2430]/60 rounded-2xl border border-[#1F4D5C] text-center text-xs text-[#94A3B8] leading-relaxed max-w-3xl mx-auto">
          <strong>Aviso de uso responsável:</strong> O Assistente IA Pro gera rascunhos iniciais de apoio operacional a
          partir dos dados inseridos pelo profissional. O texto gerado deve ser minuciosamente revisado, completado e
          interpretado pelo profissional responsável antes de qualquer uso formal, exigindo a posse e conformidade com
          o manual técnico original do instrumento utilizado. Nenhuma funcionalidade do Assistente IA Pro substitui a
          avaliação, diagnóstico ou interpretação de um profissional qualificado.
        </div>
      </footer>

      {/* ── Modal de Visualização Completa ───────────────────────────────── */}
      {modalReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-[#061923]/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0B2430] border border-[#1F4D5C] rounded-2xl max-w-2xl w-full p-6 relative flex flex-col gap-4 shadow-2xl my-auto">
            {/* Header do modal */}
            <div className="flex justify-between items-start gap-4 border-b border-[#1F4D5C] pb-4">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#F8FAFC] truncate">
                  {modalReport.title || 'Relatório'}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">{formatDateTime(modalReport.created_at)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(modalReport.output_text, `modal-${modalReport.id}`)}
                  className="px-4 py-2 text-sm font-semibold bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] rounded-xl border border-[#1F4D5C] transition"
                >
                  {copiedId === `modal-${modalReport.id}` ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  onClick={() => setModalReport(null)}
                  className="p-2 bg-[#0E2A38] hover:bg-[#123340] text-[#CBD5E1] rounded-xl border border-[#1F4D5C] transition"
                  aria-label="Fechar modal"
                >
                  <IconClose />
                </button>
              </div>
            </div>

            {/* Conteúdo do relatório */}
            <div className="max-h-[60vh] overflow-y-auto">
              <pre className="text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-wrap font-sans">
                {modalReport.output_text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
