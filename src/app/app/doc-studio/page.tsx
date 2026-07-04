'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Palette, Printer, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type LineKey = 'psychopedagogy' | 'psychology';
type TemplateKey =
  | 'family-feedback'
  | 'school-followup'
  | 'psychopedagogy-session'
  | 'psychopedagogy-referral'
  | 'psychological-report'
  | 'psychological-followup-summary'
  | 'psychological-progress-note'
  | 'psychological-referral';
type FontStyle = 'editorial' | 'classic' | 'clean';
type Density = 'comfortable' | 'compact';
type CopyState = 'idle' | 'success' | 'error';

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
  id: TemplateKey;
  line: LineKey;
  category: string;
  title: string;
  description: string;
  defaultPurpose: string;
  guidedFields: Array<{ key: keyof DraftFields; label: string }>;
  sections: Array<{ key: keyof DraftFields; title: string }>;
  footerNote: string;
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
    id: 'family-feedback',
    line: 'psychopedagogy',
    category: 'Família',
    title: 'Devolutiva psicopedagógica para família',
    description:
      'Documento de devolutiva em linguagem clara, com foco em aprendizagem, observações, potencialidades e próximos encaminhamentos.',
    defaultPurpose: 'Compartilhar com a família uma síntese psicopedagógica clara e acolhedora.',
    guidedFields: [
      { key: 'context', label: 'Contexto da demanda' },
      { key: 'observations', label: 'Observações relevantes' },
      { key: 'strengths', label: 'Potencialidades observadas' },
      { key: 'attentionPoints', label: 'Pontos que merecem acompanhamento' },
      { key: 'recommendations', label: 'Orientações para família e escola' },
      { key: 'nextSteps', label: 'Próximos passos sugeridos' },
    ],
    sections: [
      { key: 'context', title: 'Contexto da demanda' },
      { key: 'observations', title: 'Observações relevantes' },
      { key: 'strengths', title: 'Potencialidades observadas' },
      { key: 'attentionPoints', title: 'Pontos que merecem acompanhamento' },
      { key: 'recommendations', title: 'Orientações para família e escola' },
      { key: 'nextSteps', title: 'Próximos passos sugeridos' },
    ],
    footerNote:
      'Documento de apoio psicopedagógico. O conteúdo deve ser revisado pelo profissional responsável e não substitui avaliação interdisciplinar quando necessária.',
  },
  {
    id: 'school-followup',
    line: 'psychopedagogy',
    category: 'Escola',
    title: 'Relatório de acompanhamento escolar',
    description:
      'Síntese objetiva para organizar informações de acompanhamento, participação, aprendizagem e orientações à escola.',
    defaultPurpose: 'Registrar o acompanhamento escolar e orientar adaptações possíveis sem estabelecer diagnóstico.',
    guidedFields: [
      { key: 'context', label: 'Contexto escolar observado' },
      { key: 'observations', label: 'Participação e rotina de aprendizagem' },
      { key: 'strengths', label: 'Recursos e respostas positivas' },
      { key: 'attentionPoints', label: 'Necessidades de apoio observadas' },
      { key: 'recommendations', label: 'Estratégias pedagógicas sugeridas' },
      { key: 'nextSteps', label: 'Combinados para acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Contexto escolar' },
      { key: 'observations', title: 'Acompanhamento da aprendizagem' },
      { key: 'strengths', title: 'Recursos observados' },
      { key: 'attentionPoints', title: 'Necessidades de apoio' },
      { key: 'recommendations', title: 'Orientações à escola' },
      { key: 'nextSteps', title: 'Próximos combinados' },
    ],
    footerNote:
      'Registro orientativo para apoio educacional. As informações devem ser contextualizadas com família, escola e demais profissionais envolvidos.',
  },
  {
    id: 'psychopedagogy-session',
    line: 'psychopedagogy',
    category: 'Sessão',
    title: 'Registro de sessão psicopedagógica',
    description:
      'Modelo interno para documentar objetivo da sessão, respostas observadas, recursos utilizados e continuidade do plano.',
    defaultPurpose: 'Registrar de forma descritiva a sessão psicopedagógica e apoiar a continuidade do acompanhamento.',
    guidedFields: [
      { key: 'context', label: 'Objetivo da sessão' },
      { key: 'observations', label: 'Atividades e respostas observadas' },
      { key: 'strengths', label: 'Recursos mobilizados' },
      { key: 'attentionPoints', label: 'Aspectos para observar nas próximas sessões' },
      { key: 'recommendations', label: 'Intervenções ou ajustes planejados' },
      { key: 'nextSteps', label: 'Continuidade do plano' },
    ],
    sections: [
      { key: 'context', title: 'Objetivo da sessão' },
      { key: 'observations', title: 'Descrição da sessão' },
      { key: 'strengths', title: 'Recursos e engajamento' },
      { key: 'attentionPoints', title: 'Pontos de acompanhamento' },
      { key: 'recommendations', title: 'Ajustes planejados' },
      { key: 'nextSteps', title: 'Encaminhamentos internos' },
    ],
    footerNote:
      'Registro de uso profissional interno. Não constitui laudo, diagnóstico ou parecer conclusivo.',
  },
  {
    id: 'psychopedagogy-referral',
    line: 'psychopedagogy',
    category: 'Encaminhamento',
    title: 'Encaminhamento orientativo',
    description:
      'Texto breve para organizar motivo do encaminhamento, observações descritivas e recomendações de continuidade.',
    defaultPurpose: 'Orientar encaminhamento para avaliação ou acompanhamento complementar, sem conclusão diagnóstica.',
    guidedFields: [
      { key: 'context', label: 'Motivo do encaminhamento' },
      { key: 'observations', label: 'Observações que sustentam a orientação' },
      { key: 'strengths', label: 'Recursos e contextos favoráveis' },
      { key: 'attentionPoints', label: 'Aspectos que precisam de investigação' },
      { key: 'recommendations', label: 'Profissional ou serviço sugerido' },
      { key: 'nextSteps', label: 'Orientações para a família/escola' },
    ],
    sections: [
      { key: 'context', title: 'Motivo do encaminhamento' },
      { key: 'observations', title: 'Observações descritivas' },
      { key: 'strengths', title: 'Recursos identificados' },
      { key: 'attentionPoints', title: 'Aspectos a investigar' },
      { key: 'recommendations', title: 'Encaminhamento sugerido' },
      { key: 'nextSteps', title: 'Orientações de continuidade' },
    ],
    footerNote:
      'Encaminhamento orientativo. A definição de conduta, avaliação ou diagnóstico cabe ao profissional ou serviço de destino.',
  },
  {
    id: 'psychological-report',
    line: 'psychology',
    category: 'Técnico',
    title: 'Relatório psicológico descritivo',
    description:
      'Estrutura descritiva para organizar dados observacionais e informações recebidas, sem diagnóstico automático ou inferências fechadas.',
    defaultPurpose: 'Organizar uma síntese descritiva de apoio ao registro profissional.',
    guidedFields: [
      { key: 'context', label: 'Motivo do documento' },
      { key: 'observations', label: 'Dados observacionais e informações consideradas' },
      { key: 'strengths', label: 'Recursos e aspectos preservados' },
      { key: 'attentionPoints', label: 'Aspectos que requerem atenção' },
      { key: 'recommendations', label: 'Encaminhamentos e recomendações' },
      { key: 'nextSteps', label: 'Considerações finais' },
    ],
    sections: [
      { key: 'context', title: 'Motivo do documento' },
      { key: 'observations', title: 'Dados observacionais e informações consideradas' },
      { key: 'strengths', title: 'Recursos e aspectos preservados' },
      { key: 'attentionPoints', title: 'Aspectos que requerem atenção' },
      { key: 'recommendations', title: 'Encaminhamentos e recomendações' },
      { key: 'nextSteps', title: 'Considerações finais' },
    ],
    footerNote:
      'Documento de apoio ao registro profissional. Deve ser revisado pelo psicólogo responsável e não substitui avaliação formal específica.',
  },
  {
    id: 'psychological-followup-summary',
    line: 'psychology',
    category: 'Síntese',
    title: 'Síntese de acompanhamento psicológico',
    description:
      'Organiza evolução geral, temas trabalhados e orientações de continuidade em tom técnico e não pericial.',
    defaultPurpose: 'Sintetizar o acompanhamento psicológico de forma descritiva, preservando sigilo e limites técnicos.',
    guidedFields: [
      { key: 'context', label: 'Contexto do acompanhamento' },
      { key: 'observations', label: 'Temas e aspectos observados' },
      { key: 'strengths', label: 'Recursos e estratégias desenvolvidas' },
      { key: 'attentionPoints', label: 'Pontos que permanecem em atenção' },
      { key: 'recommendations', label: 'Orientações de continuidade' },
      { key: 'nextSteps', label: 'Plano ou revisão do acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Contexto do acompanhamento' },
      { key: 'observations', title: 'Síntese descritiva' },
      { key: 'strengths', title: 'Recursos observados' },
      { key: 'attentionPoints', title: 'Pontos em acompanhamento' },
      { key: 'recommendations', title: 'Orientações de continuidade' },
      { key: 'nextSteps', title: 'Considerações finais' },
    ],
    footerNote:
      'Síntese de acompanhamento, sem finalidade pericial. O conteúdo deve respeitar sigilo, contexto clínico e limites éticos da comunicação.',
  },
  {
    id: 'psychological-progress-note',
    line: 'psychology',
    category: 'Evolução',
    title: 'Registro de evolução / acompanhamento',
    description:
      'Registro interno de evolução, com foco em observações de sessão, intervenções e planejamento de continuidade.',
    defaultPurpose: 'Registrar a evolução do acompanhamento psicológico de forma objetiva e descritiva.',
    guidedFields: [
      { key: 'context', label: 'Foco do atendimento ou período' },
      { key: 'observations', label: 'Observações clínicas descritivas' },
      { key: 'strengths', label: 'Recursos, adesão e estratégias' },
      { key: 'attentionPoints', label: 'Pontos de atenção para continuidade' },
      { key: 'recommendations', label: 'Intervenções realizadas ou planejadas' },
      { key: 'nextSteps', label: 'Plano para próximos atendimentos' },
    ],
    sections: [
      { key: 'context', title: 'Foco do registro' },
      { key: 'observations', title: 'Evolução observada' },
      { key: 'strengths', title: 'Recursos e estratégias' },
      { key: 'attentionPoints', title: 'Pontos de atenção' },
      { key: 'recommendations', title: 'Intervenções e manejo' },
      { key: 'nextSteps', title: 'Plano de continuidade' },
    ],
    footerNote:
      'Registro técnico de acompanhamento. Não deve ser utilizado como laudo, declaração conclusiva ou documento pericial.',
  },
  {
    id: 'psychological-referral',
    line: 'psychology',
    category: 'Encaminhamento',
    title: 'Encaminhamento orientativo',
    description:
      'Modelo para indicar continuidade de cuidado ou avaliação complementar com linguagem cautelosa e não diagnóstica.',
    defaultPurpose: 'Orientar encaminhamento para cuidado ou avaliação complementar, sem afirmar hipótese diagnóstica como conclusão.',
    guidedFields: [
      { key: 'context', label: 'Motivo da orientação' },
      { key: 'observations', label: 'Elementos observados ou relatados' },
      { key: 'strengths', label: 'Recursos e fatores de proteção' },
      { key: 'attentionPoints', label: 'Aspectos que indicam necessidade de cuidado' },
      { key: 'recommendations', label: 'Encaminhamento ou cuidado sugerido' },
      { key: 'nextSteps', label: 'Orientações de continuidade' },
    ],
    sections: [
      { key: 'context', title: 'Motivo do encaminhamento' },
      { key: 'observations', title: 'Elementos considerados' },
      { key: 'strengths', title: 'Recursos e fatores de proteção' },
      { key: 'attentionPoints', title: 'Aspectos de atenção' },
      { key: 'recommendations', title: 'Encaminhamento sugerido' },
      { key: 'nextSteps', title: 'Orientações finais' },
    ],
    footerNote:
      'Encaminhamento orientativo. A avaliação e a conduta final devem ser definidas pelo profissional ou serviço responsável pelo atendimento subsequente.',
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

function getHeaderMissingItems(profile: ReportProfile | null) {
  const missing: string[] = [];
  const hasName = Boolean(profile?.display_name?.trim());
  const hasProfession = Boolean(getProfessionLabel(profile?.profession_category, profile?.gender));
  const hasCredential = Boolean(
    getCredentialLabel(profile?.credential_type) && profile?.credential_number?.trim(),
  );

  if (!hasName) missing.push('nome profissional');
  if (!hasProfession && !hasCredential) missing.push('identificação profissional');

  return missing;
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

  lines.push(template.footerNote);

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
  const [copyState, setCopyState] = useState<CopyState>('idle');
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
      const preferredTemplate = templates.find((template) => template.line === preferredLine) ?? templates[0];
      setLine(preferredLine);
      setTemplateKey(preferredTemplate.id);
      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const templatesForActiveLine = useMemo(
    () => templates.filter((template) => template.line === line),
    [line],
  );

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === templateKey && template.line === line) ??
      templatesForActiveLine[0] ??
      templates[0],
    [line, templateKey, templatesForActiveLine],
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
  const headerMissingItems = useMemo(() => getHeaderMissingItems(profile), [profile]);
  const hasIncompleteHeader = showHeader && !loadingProfile && headerMissingItems.length > 0;

  function updateTemplate(nextTemplateKey: TemplateKey) {
    const nextTemplate = templates.find((template) => template.id === nextTemplateKey) ?? templates[0];
    setTemplateKey(nextTemplate.id);
    setLine(nextTemplate.line);
    setFields((current) => ({
      ...current,
      documentPurpose: nextTemplate.defaultPurpose,
    }));
  }

  function updateLine(nextLine: LineKey) {
    setLine(nextLine);
    const nextTemplate = templates.find((template) => template.line === nextLine) ?? templates[0];
    setTemplateKey(nextTemplate.id);
    setFields((current) => ({
      ...current,
      documentPurpose: nextTemplate.defaultPurpose,
    }));
  }

  async function handleCopy() {
    const text = composePlainText(profile, selectedTemplate, fields, showHeader);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        try {
          textArea.value = text;
          textArea.setAttribute('readonly', '');
          textArea.style.position = 'fixed';
          textArea.style.top = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();

          if (!document.execCommand('copy')) {
            throw new Error('Copy command was not accepted.');
          }
        } finally {
          textArea.parentNode?.removeChild(textArea);
        }
      }

      setCopyState('success');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2400);
    }
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

          body * {
            visibility: hidden !important;
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
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible !important;
          }

          .doc-studio-print-area * {
            visibility: visible !important;
          }

          .doc-studio-glow {
            display: none !important;
          }

          .doc-studio-page {
            box-sizing: border-box !important;
            width: 186mm !important;
            max-width: 186mm !important;
            min-height: auto !important;
            margin: 0 auto !important;
            padding: 9mm 10mm !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .doc-studio-page * {
            overflow-wrap: anywhere;
          }

          .doc-studio-page article {
            font-size: 12.25px !important;
            line-height: 1.55 !important;
          }

          .doc-studio-page article > :not([hidden]) ~ :not([hidden]) {
            margin-top: 13px !important;
          }

          .doc-studio-page header {
            margin-bottom: 16px !important;
            padding-bottom: 12px !important;
          }

          .doc-studio-page h2 {
            font-size: 25px !important;
            line-height: 1.12 !important;
          }

          .doc-studio-page h3 {
            font-size: 15px !important;
            margin-bottom: 6px !important;
            padding-bottom: 5px !important;
          }

          .doc-studio-page section {
            margin-top: 13px !important;
          }

          .doc-studio-meta-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
            margin-top: 15px !important;
          }

          .doc-studio-meta-card {
            min-height: 0 !important;
            padding: 7px 8px !important;
            border-radius: 8px !important;
          }

          .doc-studio-meta-label {
            font-size: 8.5px !important;
            letter-spacing: 0.04em !important;
          }

          .doc-studio-meta-value {
            margin-top: 2px !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }

          .doc-studio-purpose-box {
            margin-top: 14px !important;
            padding: 11px 13px !important;
            border-radius: 10px !important;
          }

          .doc-studio-page footer {
            margin-top: 15px !important;
            padding-top: 10px !important;
          }

          .doc-studio-purpose-box p,
          .doc-studio-page section p {
            line-height: 1.55 !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="doc-studio-shell max-w-[1880px] mx-auto space-y-8 xl:space-y-10 pb-16">
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

        <div className="grid grid-cols-1 gap-9 xl:gap-14 2xl:gap-16 xl:grid-cols-[280px_minmax(380px,440px)_minmax(560px,1fr)] items-start">
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
                {templatesForActiveLine.map((template) => {
                  const isActive = template.id === selectedTemplate.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => updateTemplate(template.id)}
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
                        {template.category}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-pp-ink">{template.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-pp-ink-soft">{template.description}</span>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                {hasIncompleteHeader && (
                  <p className="rounded-xl bg-pp-block-cream/70 px-3 py-2 text-xs leading-relaxed text-pp-ink-soft">
                    Cabeçalho incompleto: revise {headerMissingItems.join(' e ')} em Minha conta.
                  </p>
                )}
              </div>
            </div>
          </aside>

          <main className="doc-studio-rise doc-studio-no-print space-y-6" style={{ animationDelay: '140ms' }}>
            <div className="space-y-2 border-b border-pp-hairline-soft pb-5">
              <p className="font-serif italic text-pp-ink-soft text-sm">Campos guiados</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-xl space-y-1">
                  <h2 className="text-xl text-pp-ink font-medium">{selectedTemplate.title}</h2>
                  <p className="text-sm leading-relaxed text-pp-ink-soft">{selectedTemplate.description}</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-live="polite"
                    className="inline-flex items-center justify-center gap-2 rounded-pill border border-pp-ink/15 px-4 py-2 text-sm font-medium text-pp-ink transition hover:bg-pp-ink/5"
                  >
                    {copyState === 'success' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copyState === 'success' ? 'Copiado' : copyState === 'error' ? 'Falhou' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center justify-center gap-2 rounded-pill bg-pp-ink px-4 py-2 text-sm font-medium text-pp-canvas transition hover:bg-pp-ink-soft"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-pp-ink-soft">
                Na janela de impressão, desative Cabeçalhos e rodapés para gerar um PDF limpo.
              </p>
              <p className="text-sm text-pp-ink-soft max-w-md">
                {loadingProfile
                  ? 'Carregando cabeçalho profissional...'
                  : hasIncompleteHeader
                    ? `Cabeçalho incompleto: faltam ${headerMissingItems.join(' e ')}.`
                    : 'Preencha os blocos e acompanhe o documento ao lado.'}
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

              {selectedTemplate.guidedFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label htmlFor={field.key} className="text-xs font-medium text-pp-ink-soft">
                    {field.label}
                  </label>
                  <textarea
                    id={field.key}
                    value={fields[field.key]}
                    onChange={(event) => setFields((current) => ({ ...current, [field.key]: event.target.value }))}
                    rows={density === 'compact' ? 3 : 4}
                    className="w-full px-4 py-3 bg-white border border-pp-hairline rounded-xl text-sm text-pp-ink leading-relaxed resize-y focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
                  />
                </div>
              ))}
            </div>
          </main>

          <section
            className="doc-studio-rise doc-studio-print-area xl:sticky xl:top-10"
            style={{ animationDelay: '200ms' }}
          >
            <div className="relative mx-auto w-full max-w-[900px] print:mx-0 print:max-w-none">
              <div
                className="doc-studio-glow pointer-events-none absolute -inset-8 -z-10 opacity-60 blur-2xl"
                style={{ background: `radial-gradient(closest-side, ${activeColor}14, transparent)` }}
                aria-hidden="true"
              />

              <div className="doc-studio-page min-h-[720px] rounded-block border border-pp-hairline/70 bg-white p-5 shadow-[0_30px_80px_rgba(14,42,56,0.14)] sm:p-7 md:p-9 2xl:p-10">
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
                      {selectedTemplate.category}
                    </div>
                    <h2 className={`${titleFontClass} text-3xl md:text-4xl leading-tight text-pp-ink`}>
                      {selectedTemplate.title}
                    </h2>
                  </div>

                  <div className="doc-studio-meta-grid grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="doc-studio-meta-card rounded-xl p-3" style={{ backgroundColor: softBackground }}>
                      <span className="doc-studio-meta-label block text-[11px] uppercase tracking-wide text-pp-ink-soft">Avaliado(a)</span>
                      <strong className="doc-studio-meta-value block font-medium text-pp-ink mt-1">{fields.subjectName || 'Não informado'}</strong>
                    </div>
                    <div className="doc-studio-meta-card rounded-xl p-3" style={{ backgroundColor: softBackground }}>
                      <span className="doc-studio-meta-label block text-[11px] uppercase tracking-wide text-pp-ink-soft">Idade/Faixa</span>
                      <strong className="doc-studio-meta-value block font-medium text-pp-ink mt-1">{fields.subjectAge || 'Não informado'}</strong>
                    </div>
                    <div className="doc-studio-meta-card rounded-xl p-3" style={{ backgroundColor: softBackground }}>
                      <span className="doc-studio-meta-label block text-[11px] uppercase tracking-wide text-pp-ink-soft">Linha</span>
                      <strong className="doc-studio-meta-value block font-medium text-pp-ink mt-1">
                        {line === 'psychology' ? 'Psicologia' : 'Psicopedagogia'}
                      </strong>
                    </div>
                  </div>

                  <section className="doc-studio-purpose-box rounded-2xl p-5 sm:p-6 border-l-4" style={{ ...borderStyle, backgroundColor: softBackground }}>
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
                    {selectedTemplate.footerNote}
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
