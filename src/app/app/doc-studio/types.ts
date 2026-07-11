// Doc Studio — tipos e enums centrais.
// Fonte de referência (somente leitura): feature/doc-studio-lab:src/app/app/doc-studio/page.tsx
//
// Nota de arquitetura (Bloco 2): mantivemos o modelo de campos CONCRETO da lab
// (DraftFields fixo + guidedFields/sections referenciando chaves) em vez do
// DocStudioField/DocStudioSection totalmente genérico da spec §11. Os 8 modelos
// usam o mesmo conjunto fixo de campos com rótulos diferentes; um motor de campos
// genérico (type/select/date/showWhen) seria especulativo agora. Ver PENDÊNCIAS.

export type LineKey = 'psychopedagogy' | 'psychology';

export type TemplateKey =
  | 'family-feedback'
  | 'school-followup'
  | 'psychopedagogy-session'
  | 'psychopedagogy-referral'
  | 'psychopedagogy-anamnesis'
  | 'psychopedagogy-family-interview'
  | 'psychopedagogy-learner-interview'
  | 'psychopedagogy-teacher-interview'
  | 'psychopedagogy-school-observation'
  | 'psychopedagogy-play-observation'
  | 'school-feedback'
  | 'psychopedagogy-observation-report'
  | 'psychopedagogy-aee-report'
  | 'psychopedagogy-support-plan'
  | 'psychopedagogy-authorization'
  | 'psychological-report'
  | 'psychological-report-cfp'
  | 'psychological-followup-summary'
  | 'psychological-progress-note'
  | 'psychological-referral'
  | 'psychology-anamnesis-adult'
  | 'psychology-anamnesis-child'
  | 'psychology-treatment-plan'
  | 'psychology-opinion'
  | 'psychology-clinical-feedback'
  | 'psychology-family-guidance'
  | 'psychology-therapy-contract'
  | 'psychology-minor-authorization'
  | 'psychology-online-protocol'
  | 'psychology-attendance-declaration'
  | 'psychology-tcle'
  // Instrumentos (Modo Instrumento).
  | 'psychopedagogy-eoca'
  | 'psychopedagogy-observacao-ludica'
  | 'psychopedagogy-logico-matematico'
  | 'psychopedagogy-roteiro-descritivo-aluno'
  | 'psychopedagogy-levantamento-desempenho-escolar'
  | 'psychopedagogy-capacidades-basicas'
  | 'psychopedagogy-entrevista-inicial-professor'
  | 'psychopedagogy-relatorio-professor'
  | 'psychopedagogy-observacao-escolar'
  | 'psychopedagogy-ficha-cadastro'
  | 'psychopedagogy-coordenacao-motora-fina'
  | 'psychopedagogy-perfil-aprendente'
  | 'psychopedagogy-entrevista-aprendente'
  | 'psychopedagogy-entrevista-detalhada-aluno'
  | 'neuropsychopedagogy-eoca'
  | 'neuropsychopedagogy-anamnese-otimizada'
  | 'neuropsychopedagogy-entrevista-contratual'
  | 'neuropsychopedagogy-encaminhamento'
  | 'neuropsychopedagogy-informe-devolucao'
  | 'neuropsychopedagogy-anamnese-detalhada'
  | 'psychopedagogy-dados-devolutiva'
  | 'psychopedagogy-sala-recursos-bimestral'
  | 'psychopedagogy-sala-recursos-diario'
  | 'psychology-anamnese-infantil-adolescente'
  // Universais (D1) — aparecem para todas as profissões.
  | 'universal_blank_document'
  | 'universal_attendance_statement'
  | 'universal_payment_receipt'
  | 'universal_referral'
  | 'universal_service_agreement'
  | 'universal_simple_authorization'
  | 'universal_simplified_tcle';

export type FontStyle = 'editorial' | 'classic' | 'clean';
export type Density = 'comfortable' | 'compact';
export type CopyState = 'idle' | 'success' | 'error';
export type DraftStatus = 'idle' | 'saved' | 'restored' | 'cleared' | 'unavailable';

// profile_type é gravado por Minha Conta (src/app/app/minha-conta/page.tsx).
export type ProfileTypeKey = 'psychologist' | 'psychopedagogue' | 'both' | 'unknown';

// Vocabulário de profissão — DEVE espelhar Minha Conta. Não inventar enum paralelo.
export type ProfessionCategory =
  | 'psicologo'
  | 'psicopedagogo'
  | 'neuropsicopedagogo'
  | 'fonoaudiologo'
  | 'terapeuta_ocupacional'
  | 'medico'
  | 'pediatra'
  | 'outro';

export type DocStudioDocumentKind =
  | 'formal_document'
  | 'structured_form'
  | 'record'
  | 'referral'
  | 'family_orientation'
  | 'school_orientation'
  | 'psychological_report';

export type DocStudioTemplateStatus = 'active' | 'hidden';

export type RiskLevel = 'low' | 'medium' | 'restricted';

// Linha do Doc Studio por profissão (profession_category é o eixo central).
// `catalog` aponta para o conjunto de templates (LineKey) ou null = "em preparação".
// `emptyStateMessage` é usado apenas quando catalog === null.
export interface ProfessionCategoryLine {
  category: ProfessionCategory;
  title: string;
  description: string;
  catalog: LineKey | null;
  emptyStateMessage: string;
}

// Perfil lido de Supabase `profiles` (somente estes campos; assinatura é texto).
export interface ReportProfile {
  profile_type: string | null;
  display_name: string | null;
  gender: string | null;
  profession_category: string | null;
  credential_type: string | null;
  credential_number: string | null;
}

export interface DraftFields {
  subjectName: string;
  subjectAge: string;
  documentPurpose: string;
  context: string;
  observations: string;
  strengths: string;
  attentionPoints: string;
  recommendations: string;
  nextSteps: string;
  // Campos aditivos (D1) para suportar os universais. snake_case por vir da spec v2;
  // os campos legados acima permanecem em camelCase (não renomear ainda).
  document_title: string;
  document_date: string;
  start_time: string;
  end_time: string;
  procedures: string;
  family_guidance: string;
  school_guidance: string;
  authorization_scope: string;
  payment_description: string;
}

export type DraftFieldKey = keyof DraftFields;

export interface GuidedField {
  key: DraftFieldKey;
  label: string;
  placeholder?: string;
}

export interface DocSection {
  key: DraftFieldKey;
  title: string;
}

// Modo Instrumento: blocos de impressão em branco (aplicação em sessão), sem
// ligação com DraftFields/sections. Deliberadamente paralelo ao motor de
// campos de documento (ver nota de arquitetura no topo deste arquivo) — não
// generalizar um motor único para os dois casos.
export type InstrumentBlock =
  | { type: 'instruction'; label?: string; text: string; items?: string[] }
  | { type: 'line-field'; label: string; length?: 'short' | 'long'; width?: 'half' | 'full' }
  | { type: 'yes-no'; label: string; withLine?: boolean }
  | { type: 'checklist'; title?: string; items: string[]; columns?: 1 | 2; notesLabel?: string; notesLines?: number }
  | { type: 'free-space'; label?: string; heightMm?: number }
  // Título de seção simples (sem caixa), mesmo estilo do título do checklist —
  // para textos curtos que não precisam de destaque de instrução.
  | { type: 'section-title'; title: string; text?: string }
  // Lista-guia: bullets descritivos (pontos a observar) sem checkbox, seguidos
  // de linhas em branco para escrita à mão. Sem colunas — itens são frases.
  | { type: 'guide-list'; title?: string; items: string[]; notesLabel?: string; notesLines?: number };

export interface DocStudioTemplate {
  id: TemplateKey;
  schemaVersion: number;
  status: DocStudioTemplateStatus;
  // `line` é o catálogo por linha (psicologia/psicopedagogia). Opcional a partir do D1:
  // universais não pertencem a uma linha — aparecem via `professionCategories`.
  line?: LineKey;
  documentKind: DocStudioDocumentKind;
  category: string;
  title: string;
  description: string;
  defaultPurpose: string;
  searchTerms: string[];
  recommendedForProfileTypes: ProfileTypeKey[];
  allowedProfessionCategories: ProfessionCategory[];
  riskLevel: RiskLevel;
  requiresHeader: boolean;
  guidedFields: GuidedField[];
  sections: DocSection[];
  ethicalFooter: string;
  // Aditivos (D1). `professionCategories` marca universais (todas as profissões).
  // `essentialFields`/`optionalFields`/`skeleton` são dados para blocos futuros.
  professionCategories?: ProfessionCategory[];
  essentialFields?: DraftFieldKey[];
  optionalFields?: DraftFieldKey[];
  skeleton?: string;
  // Modo Instrumento (aditivo): ausência de `mode` = 'document' (comportamento
  // atual, inalterado). `instrumentBlocks` só é lido quando mode === 'instrument'.
  // Modelos de instrumento mantêm sections/guidedFields como [] (nada a digitar).
  mode?: 'document' | 'instrument';
  instrumentBlocks?: InstrumentBlock[];
}

export interface ColorOption {
  label: string;
  value: string;
}

// Rascunho local versionado (schemaVersion previsto para migração futura).
export interface DocStudioDraft {
  schemaVersion: number;
  line: LineKey;
  templateKey: TemplateKey;
  fields: DraftFields;
  primaryColor: string;
  fontStyle: FontStyle;
  density: Density;
  blackAndWhite: boolean;
  showHeader: boolean;
  showSignature: boolean;
  updatedAt: string;
}
