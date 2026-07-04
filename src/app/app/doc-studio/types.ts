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
  | 'psychological-report'
  | 'psychological-followup-summary'
  | 'psychological-progress-note'
  | 'psychological-referral';

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

export type AiRuleProfileId = 'psychopedagogy_safe' | 'psychology_cfp_06_2019' | 'general_safe';

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
}

export type DraftFieldKey = keyof DraftFields;

export interface GuidedField {
  key: DraftFieldKey;
  label: string;
}

export interface DocSection {
  key: DraftFieldKey;
  title: string;
}

export interface DocStudioTemplate {
  id: TemplateKey;
  schemaVersion: number;
  status: DocStudioTemplateStatus;
  line: LineKey;
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
  aiRulesProfile: AiRuleProfileId;
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

// Regras de IA revisora como DADOS (sem chamada de API nesta fase).
export interface AiRuleProfile {
  id: AiRuleProfileId;
  line: LineKey | 'any';
  allowedOperations: string[];
  forbiddenOperations: string[];
  requiredDisclaimer: string;
  toneRules: string[];
}
