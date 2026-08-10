// Doc Studio — cabeçalho e assinatura profissional a partir do perfil (Minha Conta).
// Assinatura é TEXTO (nome + profissão flexionada + registro). Sem imagem/logo.
//
// As tabelas e a tradução código -> rótulo saíram daqui para
// `@/lib/report/professional-identity`, porque o Relatório Pró do
// CorrigeFácil precisa exatamente da mesma tradução. Continuam
// reexportadas por este módulo: o comportamento do Doc Studio não muda e
// nenhum import existente precisou ser reescrito.

import type { ReportProfile } from '../types';
import {
  formatCredential,
  getCredentialLabel,
  getProfessionLabel,
} from '@/lib/report/professional-identity';

export {
  professionLabels,
  credentialLabels,
  getProfessionLabel,
  getCredentialLabel,
} from '@/lib/report/professional-identity';

export interface DocHeader {
  name: string;
  subtitle: string;
}

export function buildHeader(profile: ReportProfile | null): DocHeader {
  if (!profile) return { name: 'Nome profissional', subtitle: 'Identificação profissional' };

  const profession = getProfessionLabel(profile.profession_category, profile.gender);
  const credential = formatCredential(profile.credential_type, profile.credential_number);
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
  const credential = formatCredential(profile?.credential_type, profile?.credential_number);
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
