'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Palette, Printer, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type LineKey = 'psychopedagogy' | 'psychology';
type TemplateKey = 'family-feedback' | 'psychological-report';
type FontStyle = 'editorial' | 'classic' | 'clean';
type Density = 'comfortable' | 'compact';

interface ReportProfile {
  profile_type: string | null;
  display_name: string | null;
  gender: string | null;
  profession_category: string | null;
  credential_type: string | null;
  credential_number: string | null;
}

interface DraftFields {
  subjectName: string;
  subjectAge: string;
  documentPurpose: string;
  context: string;
  observations: string;
  strengths: string;
  attentionPoints: string;
  recommendations: string;
  nextSteps: string;
}

interface TemplateDefinition {
  key: TemplateKey;
  line: LineKey;
  title: string;
  eyebrow: string;
  intro: string;
  defaultPurpose: string;
  sections: Array<{ key: keyof DraftFields; title: string }>;
}

const lineOptions: Array<{ key: LineKey; title: string; description: string }> = [
  {
    key: 'psychopedagogy',
    title: 'Psicopedagogia / Neuropsicopedagogia',
    description: 'Devolutivas familiares e documentos de apoio ao acompanhamento da aprendizagem.',
  },
  {
    key: 'psychology',
    title: 'Psicologia / Neuropsicologia',
    description: 'Relatórios descritivos com linguagem técnica, cautelosa e profissional.',
  },
];

const templates: TemplateDefinition[] = [
  {
    key: 'family-feedback',
    line: 'psychopedagogy',
    title: 'Devolutiva psicopedagógica para família',
    eyebrow: 'Família',
    intro:
      'Documento de devolutiva em linguagem clara, com foco em aprendizagem, observações, potencialidades e próximos encaminhamentos.',
    defaultPurpose: 'Compartilhar com a família uma síntese psicopedagógica clara e acolhedora.',
    sections: [
      { key: 'context', title: 'Contexto da demanda' },
      { key: 'observations', title: 'Observações relevantes' },
      { key: 'strengths', title: 'Potencialidades observadas' },
      { key: 'attentionPoints', title: 'Pontos que merecem acompanhamento' },
      { key: 'recommendations', title: 'Orientações para família e escola' },
      { key: 'nextSteps', title: 'Próximos passos sugeridos' },
    ],
  },
  {
    key: 'psychological-report',
    line: 'psychology',
    title: 'Relatório psicológico descritivo',
    eyebrow: 'Técnico',
    intro:
      'Estrutura descritiva para organizar dados observacionais e informações recebidas, sem diagnóstico automático ou inferências fechadas.',
    defaultPurpose: 'Organizar uma síntese descritiva de apoio ao registro profissional.',
    sections: [
      { key: 'context', title: 'Motivo do documento' },
      { key: 'observations', title: 'Dados observacionais e informações consideradas' },
      { key: 'strengths', title: 'Recursos e aspectos preservados' },
      { key: 'attentionPoints', title: 'Aspectos que requerem atenção' },
      { key: 'recommendations', title: 'Encaminhamentos e recomendações' },
      { key: 'nextSteps', title: 'Considerações finais' },
    ],
  },
];

const initialDraft: DraftFields = {
  subjectName: 'Nome do avaliado',
  subjectAge: 'Idade ou faixa etária',
  documentPurpose: templates[0].defaultPurpose,
  context: 'Descreva brevemente a demanda, quem solicitou o documento e o contexto geral do acompanhamento.',
  observations: 'Registre aqui as principais observações, dados de atendimento ou informações enviadas pela família/escola.',
  strengths: 'Liste potencialidades, recursos, interesses, respostas positivas e habilidades observadas.',
  attentionPoints: 'Organize os pontos que merecem acompanhamento, sempre com linguagem descritiva e cuidadosa.',
  recommendations: 'Inclua orientações práticas, possíveis adaptações e sugestões de acompanhamento.',
  nextSteps: 'Feche com próximos passos objetivos, revisão do plano de acompanhamento ou encaminhamentos necessários.',
};

const professionLabels: Record<string, Record<string, string>> = {
  psicologo: { F: 'Psicóloga', M: 'Psicólogo', N: 'Psicólogo(a)' },
  psicopedagogo: { F: 'Psicopedagoga', M: 'Psicopedagogo', N: 'Psicopedagogo(a)' },
  neuropsicopedagogo: { F: 'Neuropsicopedagoga', M: 'Neuropsicopedagogo', N: 'Neuropsicopedagogo(a)' },
  fonoaudiologo: { F: 'Fonoaudióloga', M: 'Fonoaudiólogo', N: 'Fonoaudiólogo(a)' },
  terapeuta_ocupacional: { F: 'Terapeuta Ocupacional', M: 'Terapeuta Ocupacional', N: 'Terapeuta Ocupacional' },
  medico: { F: 'Médica', M: 'Médico', N: 'Médico(a)' },
  pediatra: { F: 'Pediatra', M: 'Pediatra', N: 'Pediatra' },
};

const credentialLabels: Record<string, string> = {
  crp: 'CRP',
  crfa: 'CRFa',
  crefito: 'CREFITO',
  crm: 'CRM',
  rqe: 'RQE',
  cbo_2394_25: 'CBO 2394-25',
  cbo_2394_40: 'CBO 2394-40',
  cbo_2394_45: 'CBO 2394-45',
  abpp: 'ABPp',
  sbnpp: 'SBNPp',
  sindpsicopp: 'SINDPSICOPP',
};

const colorOptions = [
  { label: 'Petróleo', value: '#0E2A38' },
  { label: 'Vinho', value: '#7A2E3A' },
  { label: 'Verde', value: '#315D4F' },
  { label: 'Grafite', value: '#2C3340' },
];

function getProfessionLabel(category: string | null | undefined, gender: string | null | undefined): string {
  if (!category || category === 'outro') return '';
  return professionLabels[category]?.[gender || 'N'] ?? '';
}

function getCredentialLabel(type: string | null | undefined): string {
  if (!type || type === 'outro' || type === 'nao_informado') return '';
  return credentialLabels[type] ?? '';
}

function buildHeader(profile: ReportProfile | null) {
  if (!profile) return { name: 'Nome profissional', subtitle: 'Identificação profissional' };

  const profession = getProfessionLabel(profile.profession_category, profile.gender);
  const credential = [getCredentialLabel(profile.credential_type), profile.credential_number?.trim()]
    .filter(Boolean)
    .join(' ');
  const subtitle = [profession, credential].filter(Boolean).join(' · ');

  return {
    name: profile.display_name?.trim() || 'Nome profissional',
    subtitle: subtitle || 'Identificação profissional',
  };
}

function lineFromProfileType(profileType: string | null | undefined): LineKey {
  if (profileType === 'psychologist') return 'psychology';
  return 'psychopedagogy';
}

function composePlainText(
  profile: ReportProfile | null,
  template: TemplateDefinition,
  fields: DraftFields,
  showHeader: boolean,
) {
  const header = buildHeader(profile);
  const lines: string[] = [];

  if (showHeader) {
    lines.push(header.name);
    if (header.subtitle) lines.push(header.subtitle);
    lines.push('');
  }

  lines.push(template.title);
  lines.push('');
  lines.push(`Avaliado(a): ${fields.subjectName}`);
  lines.push(`Idade/Faixa etária: ${fields.subjectAge}`);
  lines.push(`Finalidade: ${fields.documentPurpose}`);
  lines.push('');

  template.sections.forEach((section) => {
    lines.push(section.title);
    lines.push(fields[section.key]);
    lines.push('');
  });

  return lines.join('\n').trim();
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-pp-ink cursor-pointer select-none">
      <span>{label}</span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-pp-hairline transition-colors peer-checked:bg-pp-ink peer-focus-visible:ring-2 peer-focus-visible:ring-pp-ink/30 peer-focus-visible:ring-offset-2" />
        <span className="relative h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px]" />
      </span>
    </label>
  );
}

export default function DocStudioPage() {
  const [profile, setProfile] = useState<ReportProfile | null>(null);
  const [line, setLine] = useState<LineKey>('psychopedagogy');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('family-feedback');
  const [fields, setFields] = useState<DraftFields>(initialDraft);
  const [primaryColor, setPrimaryColor] = useState(colorOptions[0].value);
  const [fontStyle, setFontStyle] = useState<FontStyle>('editorial');
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [density, setDensity] = useState<Density>('comfortable');
  const [showHeader, setShowHeader] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        if (isMounted) setLoadingProfile(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('profile_type, display_name, gender, profession_category, credential_type, credential_number')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      setProfile((data as ReportProfile | null) ?? null);
      const preferredLine = lineFromProfileType(data?.profile_type);
      setLine(preferredLine);
      setTemplateKey(preferredLine === 'psychology' ? 'psychological-report' : 'family-feedback');
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === templateKey) ?? templates[0],
    [templateKey],
  );

  const header = useMemo(() => buildHeader(profile), [profile]);
  const activeColor = blackAndWhite ? '#111111' : primaryColor;
  const accentStyle = { color: activeColor };
  const borderStyle = { borderColor: blackAndWhite ? '#111111' : activeColor };
  const softBackground = blackAndWhite ? '#F6F6F6' : `${activeColor}12`;
  const previewFontClass =
    fontStyle === 'classic' ? 'font-serif' : fontStyle === 'clean' ? 'font-sans' : 'font-sans';
  const titleFontClass = fontStyle === 'clean' ? 'font-sans' : 'font-serif italic';
  const densityClass = density === 'compact' ? 'space-y-4 text-[14px]' : 'space-y-6 text-[15px]';
  const activeLine = lineOptions.find((option) => option.key === line) ?? lineOptions[0];

  function updateTemplate(nextTemplateKey: TemplateKey) {
    const nextTemplate = templates.find((template) => template.key === nextTemplateKey) ?? templates[0];
    setTemplateKey(nextTemplate.key);
    setLine(nextTemplate.line);
    setFields((current) => ({
      ...current,
      documentPurpose:
        current.documentPurpose === selectedTemplate.defaultPurpose ? nextTemplate.defaultPurpose : current.documentPurpose,
    }));
  }

  function updateLine(nextLine: LineKey) {
    setLine(nextLine);
    const nextTemplate = templates.find((template) => template.line === nextLine) ?? templates[0];
    setTemplateKey(nextTemplate.key);
    setFields((current) => ({
      ...current,
      documentPurpose: nextTemplate.defaultPurpose,
    }));
  }

  async function handleCopy() {
    const text = composePlainText(profile, selectedTemplate, fields, showHeader);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style jsx global>{`
        @keyframes docStudioRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .doc-studio-rise {
          animation: docStudioRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .doc-studio-rise {
            animation: none;
          }
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          .doc-studio-no-print {
            display: none !important;
          }

          .doc-studio-shell {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .doc-studio-print-area {
            display: block !important;
          }

          .doc-studio-glow {
            display: none !important;
          }

          .doc-studio-page {
            width: 190mm !important;
            min-height: auto !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 0 !important;
          }

          @page {
            size: A4;
            margin: 14mm;
          }
        }
      `}</style>

      <div className="doc-studio-shell max-w-[1640px] mx-auto space-y-6 xl:space-y-8 pb-16">
        <header className="doc-studio-rise doc-studio-no-print flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <p className="font-serif italic text-pp-ink-soft text-sm">Studio de documentos</p>
            <h1 className="font-serif italic text-3xl md:text-4xl text-pp-ink leading-[1.05]">Doc Studio</h1>
            <p className="text-pp-ink-soft text-sm max-w-xl leading-relaxed">
              Rascunho local, campos guiados e uma folha profissional pronta para copiar ou imprimir.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-pp-hairline-soft px-3.5 py-1.5 text-xs text-pp-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-pp-success" aria-hidden="true" />
            Local · sem IA · sem salvamento
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:gap-10 2xl:gap-12 xl:grid-cols-[280px_minmax(380px,1fr)_minmax(420px,1fr)] items-start">
          <aside
            className="doc-studio-rise doc-studio-no-print space-y-8 xl:sticky xl:top-8"
            style={{ animationDelay: '80ms' }}
          >
            <div className="space-y-3">
              <p className="font-serif italic text-pp-ink-soft text-sm">Linha</p>
              <div className="inline-flex w-full rounded-full bg-pp-hairline-soft p-1">
                {lineOptions.map((option) => {
                  const isActive = option.key === line;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => updateLine(option.key)}
                      className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition ${
                        isActive ? 'bg-pp-ink text-pp-canvas shadow-sm' : 'text-pp-ink-soft hover:text-pp-ink'
                      }`}
                    >
                      {option.title.split(' / ')[0]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs leading-relaxed text-pp-ink-soft">{activeLine.description}</p>
            </div>

            <div className="space-y-3 pt-8 border-t border-pp-hairline-soft">
              <p className="font-serif italic text-pp-ink-soft text-sm">Templates</p>
              <div className="space-y-1">
                {templates.map((template) => {
                  const isActive = template.key === templateKey;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => updateTemplate(template.key)}
                      className={`block w-full text-left rounded-xl border-l-2 px-3.5 py-3 transition ${
                        isActive
                          ? 'border-l-pp-ink bg-pp-block-cream/60'
                          : 'border-l-transparent hover:bg-pp-hairline-soft/70'
                      }`}
                    >
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide text-pp-ink-soft"
                        style={isActive ? accentStyle : undefined}
                      >
                        {template.eyebrow}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-pp-ink">{template.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-pp-hairline-soft">
              <div className="flex items-center justify-between">
                <p className="font-serif italic text-pp-ink-soft text-sm">Aparência</p>
                <SlidersHorizontal className="w-4 h-4 text-pp-ink-soft" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-pp-ink-soft">Cor principal</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setPrimaryColor(color.value)}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        primaryColor === color.value ? 'border-pp-ink' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="fontStyle" className="text-xs font-medium text-pp-ink-soft">
                    Estilo de fonte
                  </label>
                  <select
                    id="fontStyle"
                    value={fontStyle}
                    onChange={(event) => setFontStyle(event.target.value as FontStyle)}
                    className="w-full px-3 py-2 bg-white border border-pp-hairline rounded-lg text-sm text-pp-ink focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                  >
                    <option value="editorial">Editorial</option>
                    <option value="classic">Clássica</option>
                    <option value="clean">Limpa</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="density" className="text-xs font-medium text-pp-ink-soft">
                    Densidade
                  </label>
                  <select
                    id="density"
                    value={density}
                    onChange={(event) => setDensity(event.target.value as Density)}
                    className="w-full px-3 py-2 bg-white border border-pp-hairline rounded-lg text-sm text-pp-ink focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                  >
                    <option value="comfortable">Confortável</option>
                    <option value="compact">Compacta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <ToggleField label="Modo preto e branco" checked={blackAndWhite} onChange={setBlackAndWhite} />
                <ToggleField label="Mostrar cabeçalho" checked={showHeader} onChange={setShowHeader} />
              </div>
            </div>
          </aside>

          <main className="doc-studio-rise doc-studio-no-print space-y-6" style={{ animationDelay: '140ms' }}>
            <div className="space-y-2 border-b border-pp-hairline-soft pb-5">
              <p className="font-serif italic text-pp-ink-soft text-sm">Campos guiados</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl text-pp-ink font-medium">{selectedTemplate.title}</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-4 py-2 text-sm font-medium text-pp-ink transition hover:bg-pp-ink/5"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-pill bg-pp-ink px-4 py-2 text-sm font-medium text-pp-canvas transition hover:bg-pp-ink-soft"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
              <p className="text-sm text-pp-ink-soft max-w-md">
                {loadingProfile ? 'Carregando cabeçalho profissional...' : 'Preencha os blocos e acompanhe o documento ao lado.'}
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="subjectName" className="text-xs font-medium text-pp-ink-soft">
                    Nome ou identificação
                  </label>
                  <input
                    id="subjectName"
                    value={fields.subjectName}
                    onChange={(event) => setFields((current) => ({ ...current, subjectName: event.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-pp-hairline rounded-xl text-sm text-pp-ink focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="subjectAge" className="text-xs font-medium text-pp-ink-soft">
                    Idade ou faixa etária
                  </label>
                  <input
                    id="subjectAge"
                    value={fields.subjectAge}
                    onChange={(event) => setFields((current) => ({ ...current, subjectAge: event.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-pp-hairline rounded-xl text-sm text-pp-ink focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="documentPurpose" className="text-xs font-medium text-pp-ink-soft">
                  Finalidade
                </label>
                <textarea
                  id="documentPurpose"
                  value={fields.documentPurpose}
                  onChange={(event) => setFields((current) => ({ ...current, documentPurpose: event.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white border border-pp-hairline rounded-xl text-sm text-pp-ink leading-relaxed resize-y focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                />
              </div>

              {selectedTemplate.sections.map((section) => (
                <div key={section.key} className="space-y-2">
                  <label htmlFor={section.key} className="text-xs font-medium text-pp-ink-soft">
                    {section.title}
                  </label>
                  <textarea
                    id={section.key}
                    value={fields[section.key]}
                    onChange={(event) => setFields((current) => ({ ...current, [section.key]: event.target.value }))}
                    rows={density === 'compact' ? 3 : 4}
                    className="w-full px-4 py-3 bg-white border border-pp-hairline rounded-xl text-sm text-pp-ink leading-relaxed resize-y focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                  />
                </div>
              ))}
            </div>
          </main>

          <section
            className="doc-studio-rise doc-studio-print-area xl:sticky xl:top-8"
            style={{ animationDelay: '200ms' }}
          >
            <div className="relative mx-auto max-w-[720px] print:mx-0 print:max-w-none">
              <div
                className="doc-studio-glow pointer-events-none absolute -inset-8 -z-10 opacity-60 blur-2xl"
                style={{ background: `radial-gradient(closest-side, ${activeColor}14, transparent)` }}
                aria-hidden="true"
              />

              <div className="doc-studio-page min-h-[720px] rounded-block border border-pp-hairline/70 bg-white p-7 shadow-[0_30px_80px_rgba(14,42,56,0.14)] md:p-9 2xl:p-10">
                {showHeader && (
                  <header className="mb-7 border-b pb-5" style={borderStyle}>
                    <p className={`${titleFontClass} text-[25px] leading-tight text-pp-ink`}>{header.name}</p>
                    <p className="text-sm text-pp-ink-soft mt-1">{header.subtitle}</p>
                  </header>
                )}

                <article className={`${previewFontClass} ${densityClass} text-pp-ink`}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-semibold" style={accentStyle}>
                      <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                      {selectedTemplate.eyebrow}
                    </div>
                    <h2 className={`${titleFontClass} text-3xl md:text-4xl leading-tight text-pp-ink`}>
                      {selectedTemplate.title}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div className="rounded-xl p-3" style={{ backgroundColor: softBackground }}>
                      <span className="block text-[11px] uppercase tracking-wide text-pp-ink-soft">Avaliado(a)</span>
                      <strong className="block font-medium text-pp-ink mt-1">{fields.subjectName || 'Não informado'}</strong>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: softBackground }}>
                      <span className="block text-[11px] uppercase tracking-wide text-pp-ink-soft">Idade/Faixa</span>
                      <strong className="block font-medium text-pp-ink mt-1">{fields.subjectAge || 'Não informado'}</strong>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: softBackground }}>
                      <span className="block text-[11px] uppercase tracking-wide text-pp-ink-soft">Linha</span>
                      <strong className="block font-medium text-pp-ink mt-1">
                        {line === 'psychology' ? 'Psicologia' : 'Psicopedagogia'}
                      </strong>
                    </div>
                  </div>

                  <section className="rounded-2xl p-6 border-l-4" style={{ ...borderStyle, backgroundColor: softBackground }}>
                    <h3 className="text-sm font-semibold text-pp-ink mb-2">Finalidade</h3>
                    <p className="leading-relaxed text-pp-ink-soft">{fields.documentPurpose}</p>
                  </section>

                  {selectedTemplate.sections.map((section) => (
                    <section key={section.key} className="break-inside-avoid">
                      <h3 className={`${titleFontClass} text-xl text-pp-ink mb-2 pb-2 border-b border-pp-hairline`}>
                        {section.title}
                      </h3>
                      <p className="leading-[1.75] whitespace-pre-wrap text-pp-ink-soft">{fields[section.key]}</p>
                    </section>
                  ))}

                  <footer className="pt-4 border-t border-pp-hairline text-xs leading-relaxed text-pp-ink-soft">
                    Documento de apoio profissional. O conteúdo deve ser revisado e validado pelo profissional responsável antes de uso formal.
                  </footer>
                </article>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
