// Doc Studio — cabeçalho e assinatura profissional a partir do perfil (Minha Conta).
// Assinatura é TEXTO (nome + profissão flexionada + registro). Sem imagem/logo.

import type { ReportProfile } from '../types';

export const professionLabels: Record<string, Record<string, string>> = {
  psicologo: { F: 'Psicóloga', M: 'Psicólogo', N: 'Psicólogo(a)' },
  psicopedagogo: { F: 'Psicopedagoga', M: 'Psicopedagogo', N: 'Psicopedagogo(a)' },
  neuropsicopedagogo: { F: 'Neuropsicopedagoga', M: 'Neuropsicopedagogo', N: 'Neuropsicopedagogo(a)' },
  fonoaudiologo: { F: 'Fonoaudióloga', M: 'Fonoaudiólogo', N: 'Fonoaudiólogo(a)' },
  terapeuta_ocupacional: { F: 'Terapeuta Ocupacional', M: 'Terapeuta Ocupacional', N: 'Terapeuta Ocupacional' },
  medico: { F: 'Médica', M: 'Médico', N: 'Médico(a)' },
  pediatra: { F: 'Pediatra', M: 'Pediatra', N: 'Pediatra' },
};

export const credentialLabels: Record<string, string> = {
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

export function getProfessionLabel(
  category: string | null | undefined,
  gender: string | null | undefined,
): string {
  if (!category || category === 'outro') return '';
  return professionLabels[category]?.[gender || 'N'] ?? '';
}

export function getCredentialLabel(type: string | null | undefined): string {
  if (!type || type === 'outro' || type === 'nao_informado') return '';
  return credentialLabels[type] ?? '';
}

export interface DocHeader {
  name: string;
  subtitle: string;
}

export function buildHeader(profile: ReportProfile | null): DocHeader {
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

export function getHeaderMissingItems(profile: ReportProfile | null): string[] {
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

export interface ProfessionalSignature {
  name: string;
  profession: string;
  credential: string;
  missingItems: string[];
  hasAny: boolean;
}

export function getProfessionalSignature(profile: ReportProfile | null): ProfessionalSignature {
  const name = profile?.display_name?.trim() ?? '';
  const profession = getProfessionLabel(profile?.profession_category, profile?.gender);
  const credential = [getCredentialLabel(profile?.credential_type), profile?.credential_number?.trim()]
    .filter(Boolean)
    .join(' ');
  const missingItems: string[] = [];

  if (!name) missingItems.push('nome profissional');
  if (!profession) missingItems.push('categoria profissional');
  if (!credential) missingItems.push('registro profissional');

  return {
    name,
    profession,
    credential,
    missingItems,
    hasAny: Boolean(name || profession || credential),
  };
}

export function getCopyHeader(profile: ReportProfile | null): DocHeader | null {
  const signature = getProfessionalSignature(profile);
  const subtitle = [signature.profession, signature.credential].filter(Boolean).join(' - ');

  if (!signature.name && !subtitle) return null;

  return { name: signature.name, subtitle };
}
