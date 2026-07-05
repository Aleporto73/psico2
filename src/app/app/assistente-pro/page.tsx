'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Lock, Check, TriangleAlert, X, Sparkles, ImagePlus, Plus, Trash2, Zap, History, Shield, SquarePen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface AccessStatus {
  has_active_assistant: boolean;
  assistant_expires_at: string | null;
}

interface ReportProfile {
  display_name: string | null;
  gender: string | null;
  profession_category: string | null;
  credential_type: string | null;
  credential_number: string | null;
}

interface AiReport {
  id: string;
  title: string | null;
  report_type: string | null;
  output_text: string;
  created_at: string;
}

type ReportType = 'family' | 'school' | 'technical' | 'internal';

interface FormState {
  subjectIdentification: string;
  worksheetName: string;
  reportType: ReportType | '';
  additionalNotes: string;
}

interface AttachedImage {
  id: string;
  name: string;
  sizeBytes: number;
  dataUrl: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES = 4;
const MAX_NOTES_CHARS = 6000;
const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const CHECKOUT_URL_IA_PRO = 'https://www.payment.eng.br/checkout?product=MCGNKAAY&price=74F2T5WL';

const MONTHLY_LIMIT = 50;

// Flexão da profissão por gênero (F | M | N). Categoria "outro"/desconhecida → sem rótulo.
const PROFESSION_LABEL_BY_GENDER: Record<string, { F: string; M: string; N: string }> = {
  psicologo:             { F: 'Psicóloga',            M: 'Psicólogo',            N: 'Psicólogo(a)' },
  psicopedagogo:         { F: 'Psicopedagoga',        M: 'Psicopedagogo',        N: 'Psicopedagogo(a)' },
  neuropsicopedagogo:    { F: 'Neuropsicopedagoga',   M: 'Neuropsicopedagogo',   N: 'Neuropsicopedagogo(a)' },
  fonoaudiologo:         { F: 'Fonoaudióloga',        M: 'Fonoaudiólogo',        N: 'Fonoaudiólogo(a)' },
  terapeuta_ocupacional: { F: 'Terapeuta Ocupacional', M: 'Terapeuta Ocupacional', N: 'Terapeuta Ocupacional' },
  medico:                { F: 'Médica',               M: 'Médico',               N: 'Médico(a)' },
  pediatra:              { F: 'Pediatra',             M: 'Pediatra',             N: 'Pediatra' },
};

// Sigla exibida no cabeçalho (só a sigla, antes do hífen). "outro"/"nao_informado" → omitida.
const CREDENTIAL_SIGLA: Record<string, string> = {
  crp: 'CRP',
  crfa: 'CRFa',
  crefito: 'CREFITO',
  crm: 'CRM',
  rqe: 'RQE',
  cbo_2394_25: 'CBO',
  cbo_2394_40: 'CBO',
  cbo_2394_45: 'CBO',
  abpp: 'ABPp',
  sbnpp: 'SBNPp',
  sindpsicopp: 'SINDPSICOPP',
  outro: '',
  nao_informado: '',
};

const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string; hint: string }> = [
  { value: 'family',    label: 'Pais / Família',           hint: 'Acolhedor, simples, sem jargão técnico.' },
  { value: 'school',    label: 'Escola',                   hint: 'Objetivo, pedagógico, com orientações para a escola.' },
  { value: 'technical', label: 'Equipe multiprofissional', hint: 'Estrutura técnica de relatório descritivo de apoio.' },
  { value: 'internal',  label: 'Registro interno',         hint: 'Curto e direto, estilo prontuário/registro.' },
];

function getReportTypeLabel(reportType: string | null | undefined) {
  return REPORT_TYPE_OPTIONS.find((option) => option.value === reportType)?.label || reportType;
}

function getProfessionLabel(category: string | null | undefined, gender: string | null | undefined): string {
  if (!category) return '';
  const entry = PROFESSION_LABEL_BY_GENDER[category];
  if (!entry) return '';
  const g = gender === 'F' || gender === 'M' ? gender : 'N';
  return entry[g];
}

function getCredentialSigla(credentialType: string | null | undefined): string {
  if (!credentialType) return '';
  return CREDENTIAL_SIGLA[credentialType] ?? '';
}

function isReportProfileComplete(p: ReportProfile | null): boolean {
  return Boolean(
    p?.display_name?.trim() &&
    p?.gender?.trim() &&
    p?.profession_category?.trim() &&
    p?.credential_type?.trim() &&
    p?.credential_number?.trim()
  );
}

// Partes do cabeçalho fixo (nome + linha "profissão · sigla número"), compartilhadas
// pela renderização (ReportHeader) e pela cópia (composeCopyText). null se incompleto.
function getReportHeaderParts(profile: ReportProfile | null): { displayName: string; subtitle: string } | null {
  if (!profile || !isReportProfileComplete(profile)) return null;
  const professionLabel = getProfessionLabel(profile.profession_category, profile.gender);
  const sigla = getCredentialSigla(profile.credential_type);
  const credential = [sigla, (profile.credential_number || '').trim()].filter(Boolean).join(' ');
  const subtitle = [professionLabel, credential].filter(Boolean).join(' · ');
  return { displayName: (profile.display_name || '').trim(), subtitle };
}

// Texto copiado = cabeçalho + linha em branco + relatório. Sem cabeçalho se incompleto.
function composeCopyText(profile: ReportProfile | null, outputText: string): string {
  const parts = getReportHeaderParts(profile);
  if (!parts) return outputText;
  const header = [parts.displayName, parts.subtitle].filter(Boolean).join('\n');
  return `${header}\n\n${outputText}`;
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

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Cabeçalho fixo do profissional, renderizado em React (fora do conteúdo da IA).
// O cliente copia cabeçalho + relatório e cola no Word como documento próprio.
function ReportHeader({ profile }: { profile: ReportProfile | null }) {
  const parts = getReportHeaderParts(profile);
  if (!parts) return null;

  return (
    <div className="pb-3 mb-4 border-b border-[#D6DEF0]">
      <p className="font-serif text-[24px] leading-tight text-pp-ink">{parts.displayName}</p>
      {parts.subtitle && (
        <p className="font-sans text-sm text-pp-ink mt-1 tracking-[0.01em]">{parts.subtitle}</p>
      )}
    </div>
  );
}

// Renderiza output_text (Markdown) com o estilo visual do PsicoPlanilhas.
// HTML bruto é ignorado (padrão do react-markdown). Tabelas e divisórias via remark-gfm.
function ReportMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-[1.7] text-pp-ink break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-serif italic text-[32px] text-pp-ink mt-6 mb-1 pb-2 border-b border-pp-hairline first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-serif italic text-[24px] text-pp-ink mt-8 mb-3 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-serif italic text-[18px] text-pp-ink mt-6 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-medium text-[15px] text-pp-ink mt-4 mb-1.5">{children}</h4>
          ),
          p: ({ children }) => <p className="my-3 leading-[1.7]">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-pp-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pp-ink underline underline-offset-2"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-pp-hairline" />,
          blockquote: ({ children }) => (
            <blockquote className="bg-pp-block-cream border-l-[3px] border-pp-warning pl-4 py-3 my-4 italic rounded-r-lg">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) =>
            /language-/.test(className || '') ? (
              <code className="font-mono text-xs">{children}</code>
            ) : (
              <code className="rounded bg-pp-hairline-soft px-1 py-0.5 text-[0.85em] font-mono text-pp-ink">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg border border-pp-hairline bg-pp-canvas p-3 text-xs text-pp-ink">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-[15px]">{children}</table>
            </div>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-pp-hairline-soft/60">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border border-pp-ink/20 bg-pp-block-cream px-3 py-2 text-left font-semibold text-pp-ink">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-pp-ink/20 px-3 py-2 align-top text-pp-ink">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AppAssistenteProPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<AccessStatus | null>(null);
  const [reportProfile, setReportProfile] = useState<ReportProfile | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [reports, setReports] = useState<AiReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    subjectIdentification: '',
    worksheetName: '',
    reportType: '',
    additionalNotes: '',
  });

  const [images, setImages] = useState<AttachedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<AiReport | null>(null);

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

      // Cabeçalho profissional (cabeçalho fixo dos relatórios)
      const { data: reportProf } = await supabase
        .from('profiles')
        .select('display_name, gender, profession_category, credential_type, credential_number')
        .eq('id', user.id)
        .single();
      setReportProfile(reportProf ?? null);

      if (data?.has_active_assistant) {
        fetchReports(user.id);
        fetchMonthlyCount();
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

  const fetchMonthlyCount = useCallback(async () => {
    // Cliente confia no monthly_count do backend (não recalcula o início do mês localmente).
    try {
      const res = await fetch('/api/assistant/generate', { method: 'GET' });
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.monthly_count === 'number') setMonthlyCount(json.monthly_count);
    } catch {
      // status mensal é best-effort; falha silenciosa
    }
  }, []);

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

  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, reportType: e.target.value as ReportType | '' }));
    setGenerateError(null);
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (images.length + files.length > MAX_IMAGES) {
      setImageError('Envie no máximo 4 prints por relatório.');
      return;
    }

    const next: AttachedImage[] = [];
    for (const file of files) {
      const mime = (file.type || '').toLowerCase();
      if (!ALLOWED_IMAGE_MIME.includes(mime)) {
        setImageError('Use imagens em PNG, JPG, JPEG ou WEBP.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError('Cada imagem deve ter no máximo 5 MB.');
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        next.push({ id: makeId(), name: file.name, sizeBytes: file.size, dataUrl });
      } catch (err: any) {
        setImageError(err?.message || 'Não foi possível ler uma das imagens selecionadas.');
        return;
      }
    }

    setImages((prev) => [...prev, ...next]);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setImageError(null);
  };

  const handleClearImages = () => {
    setImages([]);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    setLastReport(null);

    if (!isReportProfileComplete(reportProfile)) {
      setGenerateError('Complete seu cabeçalho profissional em Minha conta antes de gerar relatórios.');
      setGenerating(false);
      return;
    }
    if (!form.reportType) {
      setGenerateError('Selecione para quem é o relatório.');
      setGenerating(false);
      return;
    }
    if (!form.worksheetName.trim()) {
      setGenerateError('Informe qual planilha você usou.');
      setGenerating(false);
      return;
    }
    if (images.length === 0 && !form.additionalNotes.trim()) {
      setGenerateError('Envie pelo menos um print da planilha ou escreva as observações no campo adicional.');
      setGenerating(false);
      return;
    }

    try {
      const worksheetName = form.worksheetName.trim();
      const destinoLabel =
        REPORT_TYPE_OPTIONS.find((o) => o.value === form.reportType)?.label || 'Equipe multiprofissional';

      const payload: Record<string, any> = {
        // Campos visíveis na UI simplificada
        subjectIdentification: form.subjectIdentification.trim(),
        worksheetName,
        reportType: form.reportType,
        additionalNotes: form.additionalNotes,
        // Compat: o backend deriva nome/idade a partir da identificação do avaliado.
        area: worksheetName || 'PsicoPlanilhas',
        objetivo: `Gerar rascunho de relatório para ${destinoLabel} a partir da planilha ${worksheetName}`,
      };
      if (images.length > 0) {
        payload.imageDataUrls = images.map((img) => img.dataUrl);
      }

      const res = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setGenerateError(json.message || 'Erro ao gerar relatório. Tente novamente.');
        if (typeof json.monthly_count === 'number') setMonthlyCount(json.monthly_count);
        return;
      }

      setLastReport(json.report);
      if (typeof json.monthly_count === 'number') setMonthlyCount(json.monthly_count);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) fetchReports(user.id);

      setForm({
        subjectIdentification: '',     // identificação é por avaliado: limpa a cada geração
        worksheetName: '',
        reportType: form.reportType,   // mantém o destino entre gerações
        additionalNotes: '',
      });
      handleClearImages();

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

  if (loadingStatus) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-pp-ink-soft">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p>Carregando status do assistente...</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 bg-pp-canvas border border-pp-hairline rounded-xl text-base text-pp-ink placeholder:text-pp-ink-soft focus:outline-none focus:ring-1 focus:ring-pp-ink/20 focus:border-pp-ink transition";
  const labelCls = "block text-sm font-medium text-pp-ink";

  const canAddMoreImages = images.length < MAX_IMAGES;
  const selectedReport = REPORT_TYPE_OPTIONS.find((o) => o.value === form.reportType);

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header editorial */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">Assistente de Relatórios IA</h1>
        <p className="text-pp-ink-soft text-base md:text-lg">
          Envie o print da planilha preenchida e gere um relatório editável em poucos minutos.
        </p>
        <p className="text-sm text-pp-ink-soft">
          O Relatório Grátis continua disponível. O Pro é opcional para relatórios mais completos.
        </p>
      </header>

      {assistantState === 'active' && (
        <>
          {/* Status line */}
          <div className="flex w-fit max-w-full flex-wrap items-center gap-x-4 gap-y-1.5 bg-pp-block-mint/50 rounded-2xl px-5 py-3">
            <span className="font-serif italic text-pp-ink text-sm">Assinatura ativa</span>
            <span className="text-sm text-pp-ink-soft">
              Válido até <strong className="font-medium text-pp-ink">{formatDate(profile?.assistant_expires_at)}</strong>
            </span>
            {monthlyCount !== null && (
              <span className="text-sm text-pp-ink-soft">
                Relatórios disponíveis este mês:{' '}
                <strong className={`font-medium ${monthlyCount >= MONTHLY_LIMIT ? 'text-pp-danger' : 'text-pp-ink'}`}>
                  {monthlyCount}/{MONTHLY_LIMIT}
                </strong>
              </span>
            )}
          </div>

          {lastReport && (
            <div id="last-report" className="bg-pp-block-mint/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-pp-ink">
                  <Check className="w-5 h-5" aria-hidden="true" />
                  <h3 className="font-serif italic text-base text-pp-ink">Relatório gerado</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(composeCopyText(reportProfile, lastReport.output_text), 'last')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-pp-ink border border-pp-ink/15 hover:bg-pp-ink/5 rounded-lg transition"
                  >
                    {copiedId === 'last' ? (<><Check className="w-4 h-4" /> Copiado</>) : 'Copiar'}
                  </button>
                  <button
                    onClick={() => setModalReport(lastReport)}
                    className="px-4 py-2 text-sm font-medium text-pp-ink border border-pp-ink/15 hover:bg-pp-ink/5 rounded-lg transition"
                  >
                    Ver completo
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-hidden">
                <ReportHeader profile={reportProfile} />
                <ReportMarkdown content={lastReport.output_text} />
              </div>
              <p className="text-xs text-pp-ink-soft">
                Salvo em: {formatDateTime(lastReport.created_at)}
              </p>
            </div>
          )}

          {generateError && (
            <div className="p-4 bg-pp-danger/10 rounded-xl text-base text-pp-danger leading-relaxed flex items-start gap-2">
              <span className="shrink-0 mt-0.5"><TriangleAlert className="w-[18px] h-[18px]" aria-hidden="true" /></span>
              <span>{generateError}</span>
            </div>
          )}

          {!isReportProfileComplete(reportProfile) ? (
            <section className="bg-pp-block-cream rounded-2xl p-8 md:p-10 text-center max-w-2xl mx-auto space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-pp-ink/5 flex items-center justify-center text-pp-ink">
                <SquarePen className="w-8 h-8" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                <h2 className="font-serif italic text-2xl md:text-3xl text-pp-ink">Configure seu cabeçalho profissional</h2>
                <p className="text-pp-ink-soft text-base leading-relaxed">
                  Antes de gerar relatórios, complete os dados que aparecerão no cabeçalho dos seus documentos. Isso garante que cada relatório saia com sua identidade profissional pronta para uso.
                </p>
              </div>
              <Link
                href="/app/minha-conta"
                className="inline-flex items-center bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
              >
                Completar perfil agora
              </Link>
            </section>
          ) : (
          <section className="bg-white border border-pp-hairline rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-medium text-pp-ink">Gerar relatório</h2>
              <p className="text-sm text-pp-ink-soft mt-1">
                Selecione o destino, informe a planilha e anexe o print. As observações são opcionais quando há print.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5" id="generate-form" noValidate>

              {/* 1. Identificação do avaliado (opcional) */}
              <div className="space-y-2">
                <label htmlFor="subjectIdentification" className={labelCls}>
                  Identificação do avaliado{' '}
                  <span className="text-pp-ink-soft font-normal">(opcional)</span>
                </label>
                <input
                  id="subjectIdentification"
                  name="subjectIdentification"
                  type="text"
                  value={form.subjectIdentification}
                  onChange={handleFormChange}
                  placeholder="Ex.: Pedro Henrique, 17 anos"
                  maxLength={200}
                  className={inputCls}
                />
              </div>

              {/* 2. Para quem é o relatório? */}
              <div className="space-y-2">
                <label htmlFor="reportType" className={labelCls}>
                  Para quem é o relatório? <span className="text-pp-danger">*</span>
                </label>
                <select
                  id="reportType"
                  name="reportType"
                  value={form.reportType}
                  onChange={handleReportTypeChange}
                  required
                  className={inputCls}
                >
                  <option value="">Selecione o destino...</option>
                  {REPORT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {selectedReport && (
                  <div className="px-4 py-2.5 bg-pp-block-mint/30 rounded-xl text-xs text-pp-ink-soft leading-relaxed">
                    <strong className="font-medium text-pp-ink">{selectedReport.label}:</strong> {selectedReport.hint}
                  </div>
                )}
              </div>

              {/* 3. Qual planilha você usou? */}
              <div className="space-y-2">
                <label htmlFor="worksheetName" className={labelCls}>
                  Qual planilha você usou? <span className="text-pp-danger">*</span>
                </label>
                <input
                  id="worksheetName"
                  name="worksheetName"
                  type="text"
                  value={form.worksheetName}
                  onChange={handleFormChange}
                  placeholder="Ex.: SNAP-IV, WISC-IV, VB-MAPP, CARS-2, TDE-2..."
                  maxLength={200}
                  required
                  className={inputCls}
                />
              </div>

              {/* ── Anexar prints (opcional, até 4) ─────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-pp-ink"><ImagePlus className="w-[22px] h-[22px]" aria-hidden="true" /></span>
                    <span className={labelCls + " !text-base"}>
                      Anexar print da planilha ou gráfico
                    </span>
                  </div>
                  <span className="text-xs text-pp-ink-soft font-normal">
                    {images.length}/{MAX_IMAGES} prints
                  </span>
                </div>
                <p className="text-sm text-pp-ink-soft leading-relaxed">
                  Você pode enviar até 4 prints da planilha, tabela ou gráfico. Se os prints estiverem claros, o campo de texto abaixo pode ficar em branco.
                </p>

                {images.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {images.map((img, idx) => (
                      <div key={img.id} className="p-3 bg-pp-canvas border border-pp-hairline rounded-xl space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-pp-ink truncate">
                              {idx + 1}. {img.name}
                            </p>
                            <p className="text-xs text-pp-ink-soft mt-0.5">{formatSize(img.sizeBytes)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-pp-danger bg-pp-danger/10 hover:bg-pp-danger/20 rounded-lg transition shrink-0"
                            aria-label={`Remover print ${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remover
                          </button>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-pp-hairline bg-white max-h-56">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.dataUrl}
                            alt={`Pré-visualização do print ${idx + 1}`}
                            className="w-full h-auto max-h-56 object-contain"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {images.length === 0 ? (
                  <label
                    htmlFor="imagePick"
                    className="flex flex-col items-center justify-center w-full min-h-[140px] px-4 py-6 bg-pp-canvas border-2 border-dashed border-pp-hairline rounded-xl cursor-pointer hover:border-pp-ink hover:bg-pp-hairline-soft transition text-center"
                  >
                    <span className="text-pp-ink mb-2"><ImagePlus className="w-[22px] h-[22px]" aria-hidden="true" /></span>
                    <span className="text-base text-pp-ink font-medium">
                      Clique para adicionar prints
                    </span>
                    <span className="text-xs text-pp-ink-soft mt-1">
                      PNG, JPG/JPEG ou WEBP — até 5 MB por imagem
                    </span>
                    <input
                      ref={fileInputRef}
                      id="imagePick"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      multiple
                      onChange={handleAddImages}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <label
                      htmlFor="imagePick"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl border transition ${
                        canAddMoreImages
                          ? 'bg-white text-pp-ink border-pp-ink/15 hover:bg-pp-ink/5 hover:border-pp-ink cursor-pointer'
                          : 'bg-pp-hairline-soft text-pp-ink-soft border-pp-hairline cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> Adicionar print
                      <input
                        ref={fileInputRef}
                        id="imagePick"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        multiple
                        onChange={handleAddImages}
                        disabled={!canAddMoreImages}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleClearImages}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-pp-ink-soft border border-pp-hairline hover:bg-pp-hairline-soft rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" /> Remover todas
                    </button>
                  </div>
                )}

                {imageError && (
                  <div className="p-3 text-sm text-pp-danger bg-pp-danger/10 rounded-xl flex items-start gap-2">
                    <span className="shrink-0 mt-0.5"><TriangleAlert className="w-[18px] h-[18px]" aria-hidden="true" /></span>
                    <span>{imageError}</span>
                  </div>
                )}
              </div>

              {/* 6. Observações adicionais (opcional quando há print) */}
              <div className="space-y-2">
                <label htmlFor="additionalNotes" className={labelCls}>
                  Observações adicionais{' '}
                  {images.length === 0 ? (
                    <span className="text-pp-danger">*</span>
                  ) : (
                    <span className="text-pp-ink-soft font-normal">(opcional — você anexou prints)</span>
                  )}
                </label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={form.additionalNotes}
                  onChange={handleFormChange}
                  placeholder="Opcional: escreva queixa principal, contexto, dados que não aparecem no print ou objetivo específico do relatório."
                  rows={8}
                  maxLength={MAX_NOTES_CHARS}
                  required={images.length === 0}
                  className={inputCls + " resize-y leading-relaxed"}
                />
                <p className="text-xs text-pp-ink-soft text-right">
                  {form.additionalNotes.length}/{MAX_NOTES_CHARS} caracteres
                </p>
              </div>

              <div className="p-4 bg-pp-block-cream rounded-xl text-sm text-pp-ink-soft leading-relaxed flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-pp-ink-soft"><TriangleAlert className="w-[18px] h-[18px]" aria-hidden="true" /></span>
                <span>O relatório gerado é um <strong className="font-medium text-pp-ink">texto inicial descritivo de apoio operacional</strong> e deve ser revisado, completado e validado pelo profissional responsável antes de qualquer uso formal. Nenhum dado é diagnosticado, inferido ou recalculado automaticamente.</span>
              </div>

              <button
                type="submit"
                disabled={generating || (monthlyCount !== null && monthlyCount >= MONTHLY_LIMIT)}
                className="w-full py-4 font-medium text-base rounded-pill transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-pp-ink hover:bg-pp-ink-soft text-pp-canvas"
              >
                {generating ? (
                  <>
                    <span className="w-5 h-5 border-2 border-pp-canvas/40 border-t-pp-canvas rounded-full animate-spin" />
                    Gerando relatório...
                  </>
                ) : monthlyCount !== null && monthlyCount >= MONTHLY_LIMIT ? (
                  <><Lock className="w-4 h-4" /> Limite mensal atingido</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Gerar relatório</>
                )}
              </button>
            </form>
          </section>
          )}

          <section className="space-y-4">
            <div className="border-t border-pp-hairline-soft pt-6">
              <p className="font-serif italic text-pp-ink-soft text-sm">Histórico de relatórios</p>
              <p className="text-sm text-pp-ink-soft mt-1">Seus últimos 50 relatórios gerados, mais recentes primeiro.</p>
            </div>

            {loadingReports ? (
              <div className="text-center text-pp-ink-soft text-sm py-6">Carregando histórico...</div>
            ) : reports.length === 0 ? (
              <div className="bg-pp-block-cream/50 rounded-2xl p-10 text-center space-y-2">
                <p className="text-pp-ink text-base">Nenhum relatório gerado ainda.</p>
                <p className="text-pp-ink-soft text-sm">Use o formulário acima para criar seu primeiro relatório.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white border border-pp-hairline rounded-2xl p-5 flex flex-col md:flex-row md:items-start gap-3 hover:border-pp-ink/20 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-pp-ink truncate">
                        {report.title || 'Relatório sem título'}
                      </p>
                      <p className="text-xs text-pp-ink-soft mt-1 flex items-center gap-2 flex-wrap">
                        {report.report_type && (
                          <span className="px-2 py-0.5 bg-pp-hairline-soft rounded-md text-pp-ink-soft">
                            {getReportTypeLabel(report.report_type)}
                          </span>
                        )}
                        <span>{formatDateTime(report.created_at)}</span>
                      </p>
                      <p className="text-sm text-pp-ink-soft mt-2 line-clamp-2 leading-relaxed">
                        {report.output_text.slice(0, 150)}...
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(report.output_text, report.id)}
                        className="px-4 py-2 text-sm font-medium text-pp-ink border border-pp-ink/15 hover:bg-pp-ink/5 rounded-lg transition whitespace-nowrap"
                      >
                        {copiedId === report.id ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => setModalReport(report)}
                        className="px-4 py-2 text-sm font-medium text-pp-ink border border-pp-ink/15 hover:bg-pp-ink/5 rounded-lg transition whitespace-nowrap"
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

      {assistantState === 'expired' && (
        <div className="bg-pp-block-coral rounded-block p-10 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-pp-ink/5 flex items-center justify-center text-pp-ink">
            <Lock className="w-10 h-10" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <h2 className="font-serif italic text-2xl md:text-3xl text-pp-ink">Sua assinatura expirou</h2>
            <p className="text-pp-ink-soft text-sm">
              Acesso encerrado em:{' '}
              <strong className="font-medium text-pp-ink">{formatDate(profile?.assistant_expires_at)}</strong>
            </p>
            <p className="text-pp-ink-soft text-base leading-relaxed pt-1">
              Renove sua assinatura anual do Assistente de Relatórios IA por apenas{' '}
              <strong className="font-medium text-pp-ink">R$57/ano</strong> para continuar gerando relatórios de apoio a
              partir das suas planilhas profissionais.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.open(CHECKOUT_URL_IA_PRO, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
          >
            Renovar assinatura (R$57/ano)
          </button>
        </div>
      )}

      {assistantState === 'blocked' && (
        <div className="bg-pp-block-coral rounded-block p-10 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-pp-ink/5 flex items-center justify-center text-pp-ink">
            <Lock className="w-10 h-10" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <h2 className="font-serif italic text-2xl md:text-3xl text-pp-ink">Assistente de Relatórios IA bloqueado</h2>
            <p className="text-pp-ink-soft text-base leading-relaxed">
              O Assistente de Relatórios IA é um recurso adicional com assinatura anual. Assine por apenas{' '}
              <strong className="font-medium text-pp-ink">R$57/ano</strong> para gerar relatórios de apoio estruturados
              diretamente integrados com seus dados de planilhas profissionais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
            <div className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
              <div className="text-pp-ink"><Zap className="w-[22px] h-[22px]" aria-hidden="true" /></div>
              <strong className="text-pp-ink block text-sm font-medium">Rapidez operacional</strong>
              <p className="text-xs text-pp-ink-soft leading-relaxed">
                Gere relatórios estruturados a partir dos dados da planilha em segundos.
              </p>
            </div>
            <div className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
              <div className="text-pp-ink"><History className="w-[22px] h-[22px]" aria-hidden="true" /></div>
              <strong className="text-pp-ink block text-sm font-medium">Histórico completo</strong>
              <p className="text-xs text-pp-ink-soft leading-relaxed">
                Todos os relatórios gerados ficam salvos e acessíveis a qualquer momento.
              </p>
            </div>
            <div className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
              <div className="text-pp-ink"><Shield className="w-[22px] h-[22px]" aria-hidden="true" /></div>
              <strong className="text-pp-ink block text-sm font-medium">100% seguro</strong>
              <p className="text-xs text-pp-ink-soft leading-relaxed">
                Dados processados com segurança. Nenhum dado é retido pela IA.
              </p>
            </div>
            <div className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
              <div className="text-pp-ink"><SquarePen className="w-[22px] h-[22px]" aria-hidden="true" /></div>
              <strong className="text-pp-ink block text-sm font-medium">Totalmente editável</strong>
              <p className="text-xs text-pp-ink-soft leading-relaxed">
                O relatório é um ponto de partida. Copie, edite e complemente conforme necessário.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.open(CHECKOUT_URL_IA_PRO, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
          >
            Assinar por R$57/ano
          </button>
        </div>
      )}

      <footer className="pt-4 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          <strong className="font-medium">Aviso de uso responsável:</strong> O Assistente de Relatórios IA gera relatórios descritivos iniciais de apoio operacional a
          partir dos dados inseridos pelo profissional (texto e/ou prints). O texto gerado deve ser minuciosamente revisado, completado e
          interpretado pelo profissional responsável antes de qualquer uso formal, exigindo a posse e conformidade com
          o manual técnico original do instrumento utilizado. Nenhuma funcionalidade do Assistente de Relatórios IA substitui a
          avaliação, diagnóstico ou interpretação de um profissional qualificado.
        </p>
      </footer>

      {modalReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-pp-ink/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-pp-hairline rounded-block max-w-2xl w-full p-6 relative flex flex-col gap-4 shadow-2xl my-auto">
            <div className="flex justify-between items-start gap-4 border-b border-pp-hairline pb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-pp-ink-soft mb-0.5">Relatório editável</p>
                <h3 className="font-serif italic text-base text-pp-ink truncate">
                  {modalReport.title || 'Relatório'}
                </h3>
                <p className="text-xs text-pp-ink-soft mt-0.5">{formatDateTime(modalReport.created_at)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(composeCopyText(reportProfile, modalReport.output_text), `modal-${modalReport.id}`)}
                  className="inline-flex items-center gap-1.5 bg-pp-ink text-pp-canvas px-4 py-2 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
                >
                  {copiedId === `modal-${modalReport.id}` ? (<><Check className="w-4 h-4" /> Copiado</>) : 'Copiar'}
                </button>
                <button
                  onClick={() => setModalReport(null)}
                  className="p-2 text-pp-ink-soft hover:text-pp-ink border border-pp-hairline hover:bg-pp-hairline-soft rounded-lg transition"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <ReportHeader profile={reportProfile} />
              <ReportMarkdown content={modalReport.output_text} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
