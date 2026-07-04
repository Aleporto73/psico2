// Doc Studio — regras da IA revisora como DADOS. Nesta fase NÃO há chamada de API,
// endpoint, custo ou IA real. Este arquivo apenas prepara os perfis de revisão.
//
// Princípio: O sistema estrutura. A IA revisa. O profissional decide.

import type { AiRuleProfile, AiRuleProfileId } from './types';

// Trava obrigatória (spec §14) — deve valer para QUALQUER perfil de revisão.
export const AI_REVIEW_LOCK =
  'A IA revisa REGISTRO e TOM de texto já escrito pelo profissional. ' +
  'A IA NUNCA: cria documento do zero, preenche o documento final sozinha, ' +
  'emite diagnóstico, cita CID/DSM, conclui hipótese clínica, nem substitui ' +
  'o julgamento profissional. Toda saída exige aceite humano explícito.';

const GLOBAL_FORBIDDEN: string[] = [
  'criar documento do zero',
  'preencher o documento final sem revisão humana',
  'emitir diagnóstico',
  'citar CID ou DSM',
  'concluir hipótese clínica como fato',
  'substituir o julgamento do profissional',
];

export const aiRuleProfiles: Record<AiRuleProfileId, AiRuleProfile> = {
  psychopedagogy_safe: {
    id: 'psychopedagogy_safe',
    line: 'psychopedagogy',
    allowedOperations: [
      'ajustar registro e tom para linguagem profissional',
      'organizar observações descritivas já fornecidas',
      'melhorar clareza e coesão sem inventar conteúdo',
    ],
    forbiddenOperations: [
      ...GLOBAL_FORBIDDEN,
      'patologizar comportamento',
      'fazer afirmação clínica forte',
      'inferir sem dado fornecido',
    ],
    requiredDisclaimer:
      'Texto revisado quanto à forma. Conteúdo, contexto e decisões são de responsabilidade do profissional.',
    toneRules: ['funcional', 'acolhedor', 'orientativo', 'descritivo', 'focado em aprendizagem, apoio, família e escola'],
  },
  psychology_cfp_06_2019: {
    id: 'psychology_cfp_06_2019',
    line: 'psychology',
    allowedOperations: [
      'ajustar registro e tom técnico do texto já escrito',
      'organizar dados observacionais fornecidos',
      'alinhar linguagem a documentos psicológicos descritivos',
    ],
    forbiddenOperations: [
      ...GLOBAL_FORBIDDEN,
      'produzir diagnóstico psicológico',
      'extrapolar além do dado observado',
      'rotular texto livre como documento formal do CFP',
    ],
    requiredDisclaimer:
      'Documento psicológico descritivo, sem finalidade diagnóstica isolada. Referência normativa: Resolução CFP nº 06/2019. Revisão e responsabilidade do psicólogo.',
    toneRules: ['técnico', 'descritivo', 'cauteloso', 'alinhado a documentos psicológicos', 'sem extrapolar dado observado'],
  },
  general_safe: {
    id: 'general_safe',
    line: 'any',
    allowedOperations: [
      'ajustar registro e tom para linguagem profissional',
      'melhorar clareza sem inventar conteúdo',
    ],
    forbiddenOperations: [...GLOBAL_FORBIDDEN],
    requiredDisclaimer: 'Texto revisado quanto à forma. Revisão final e responsabilidade do profissional.',
    toneRules: ['claro', 'profissional', 'cauteloso'],
  },
};

export function getAiRuleProfile(id: AiRuleProfileId): AiRuleProfile {
  return aiRuleProfiles[id];
}
