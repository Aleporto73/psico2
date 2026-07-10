// Doc Studio — composição do texto profissional para "Copiar".
// Puro: recebe perfil + template + campos e devolve string. Sem acesso a DOM/clipboard.

import type { DocStudioTemplate, DraftFields, ReportProfile } from '../types';
import { getLineTitle } from '../templates';
import { getCopyHeader, getProfessionalSignature } from './profile';

function formatCopyValue(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function appendCopySection(lines: string[], title: string, content: string): void {
  const cleanContent = content.trim();
  if (!cleanContent) return;

  lines.push(title);
  lines.push(cleanContent);
  lines.push('');
}

function appendCopySignature(lines: string[], profile: ReportProfile | null): void {
  const signature = getProfessionalSignature(profile);

  lines.push('Assinatura');
  lines.push('______________________________');

  if (!signature.hasAny) {
    lines.push('Dados profissionais não informados');
    lines.push('');
    return;
  }

  if (signature.name) lines.push(signature.name);
  if (signature.profession) lines.push(signature.profession);
  if (signature.credential) lines.push(`Registro: ${signature.credential}`);
  lines.push('');
}

export function composePlainText(
  profile: ReportProfile | null,
  template: DocStudioTemplate,
  fields: DraftFields,
  showHeader: boolean,
  showSignature: boolean,
  // Rótulo da linha/categoria profissional ativa. Fallback: título do catálogo bruto.
  lineLabel?: string,
): string {
  const header = getCopyHeader(profile);
  const lines: string[] = [];

  if (showHeader && header) {
    if (header.name) lines.push(header.name);
    if (header.subtitle) lines.push(header.subtitle);
    lines.push('');
  }

  const title =
    template.id === 'universal_blank_document'
      ? fields.document_title.trim() || 'Documento em branco'
      : template.title;
  lines.push(title);
  lines.push('');
  lines.push(`Linha/Categoria: ${lineLabel ?? getLineTitle(template.line)} / ${template.category}`);
  lines.push(`Avaliado(a): ${formatCopyValue(fields.subjectName, 'Não informado')}`);
  lines.push(`Idade/Faixa etária: ${formatCopyValue(fields.subjectAge, 'Não informado')}`);
  lines.push(`Finalidade: ${formatCopyValue(fields.documentPurpose, 'Não informada')}`);
  lines.push('');

  template.sections.forEach((section) => {
    appendCopySection(lines, section.title, fields[section.key]);
  });

  lines.push('Observação ética');
  lines.push(template.ethicalFooter);

  if (showSignature) {
    lines.push('');
    appendCopySignature(lines, profile);
  }

  return lines.join('\n').trim();
}
