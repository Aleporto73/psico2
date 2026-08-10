// =====================================================================
// IDENTIDADE PROFISSIONAL · a tradução de código para rótulo legível.
//
// `profiles` guarda CÓDIGOS (`psicologo`, `crp`), que é o certo para o
// banco e errado para qualquer texto que uma pessoa vá ler. Quem escreve
// documento precisa de "Psicóloga" e "CRP", e essa tradução é a mesma
// para todo produto que assina um documento — Doc Studio e Relatório Pró
// do CorrigeFácil inclusive.
//
// Este módulo é a fonte única dessa tradução. As tabelas e as duas
// funções vieram de `app/doc-studio/lib/profile.ts`, sem alteração de
// comportamento: aquele arquivo passou a reexportar daqui, então o Doc
// Studio continua produzindo exatamente o que produzia.
//
// O que este arquivo NÃO faz: não lê banco, não decide o que é perfil
// completo, não monta cabeçalho nem assinatura. Essas regras variam por
// produto e continuam em quem as usa.
// =====================================================================

/** Flexão por gênero (F | M | N). As chaves são os `profession_category`
 *  oferecidos em Minha Conta — categoria fora desta tabela não recebe
 *  rótulo, em vez de vazar o código cru para o texto. */
export const professionLabels: Record<string, Record<string, string>> = {
  psicologo: { F: 'Psicóloga', M: 'Psicólogo', N: 'Psicólogo(a)' },
  psicopedagogo: { F: 'Psicopedagoga', M: 'Psicopedagogo', N: 'Psicopedagogo(a)' },
  neuropsicopedagogo: { F: 'Neuropsicopedagoga', M: 'Neuropsicopedagogo', N: 'Neuropsicopedagogo(a)' },
  fonoaudiologo: { F: 'Fonoaudióloga', M: 'Fonoaudiólogo', N: 'Fonoaudiólogo(a)' },
  terapeuta_ocupacional: { F: 'Terapeuta Ocupacional', M: 'Terapeuta Ocupacional', N: 'Terapeuta Ocupacional' },
  medico: { F: 'Médica', M: 'Médico', N: 'Médico(a)' },
  pediatra: { F: 'Pediatra', M: 'Pediatra', N: 'Pediatra' },
};

/** Sigla publicável do registro. `outro` e `nao_informado` não estão
 *  aqui de propósito: são ausência declarada, e `getCredentialLabel` os
 *  trata como tal. */
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

/** Profissão legível e flexionada. Gênero ausente cai em 'N', que é a
 *  forma neutra publicável — não é erro nem falta a ser sinalizada. */
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

/** "CRP 06/12345". Sem sigla reconhecida sai só o número; sem número sai
 *  só a sigla; sem nenhum dos dois sai string vazia, e quem chama decide
 *  omitir a linha. É a junção que Doc Studio já fazia nos dois lugares em
 *  que monta credencial. */
export function formatCredential(
  type: string | null | undefined,
  number: string | null | undefined,
): string {
  return [getCredentialLabel(type), number?.trim()].filter(Boolean).join(' ');
}
