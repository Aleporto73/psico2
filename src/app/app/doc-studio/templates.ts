// Doc Studio — dados dos modelos (catálogo bruto) + seleção de template.
// Copiado seletivamente de feature/doc-studio-lab (conteúdo dos 8 modelos preservado).
// Metadados de catálogo (status, documentKind, searchTerms, allowedProfessionCategories,
// recommendedForProfileTypes, riskLevel) adicionados nesta refatoração.

import type {
  ColorOption,
  DocStudioTemplate,
  DraftFieldKey,
  DraftFields,
  LineKey,
  TemplateKey,
} from './types';

export const DEFAULT_LINE: LineKey = 'psychopedagogy';

export const lineOptions: Array<{ key: LineKey; title: string; description: string }> = [
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

export const colorOptions: ColorOption[] = [
  { label: 'Petróleo', value: '#0E2A38' },
  { label: 'Vinho', value: '#7A2E3A' },
  { label: 'Verde', value: '#315D4F' },
  { label: 'Grafite', value: '#2C3340' },
];

export const templates: DocStudioTemplate[] = [
  {
    id: 'family-feedback',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'family_orientation',
    category: 'Família',
    title: 'Devolutiva psicopedagógica para família',
    description:
      'Documento de devolutiva em linguagem clara, com foco em aprendizagem, observações, potencialidades e próximos encaminhamentos.',
    defaultPurpose: 'Compartilhar com a família uma síntese psicopedagógica clara e acolhedora.',
    searchTerms: ['devolutiva', 'família', 'aprendizagem', 'psicopedagogia'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Documento de apoio psicopedagógico. O conteúdo deve ser revisado pelo profissional responsável e não substitui avaliação interdisciplinar quando necessária.',
  },
  {
    id: 'school-followup',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'school_orientation',
    category: 'Acompanhamento',
    title: 'Relatório de acompanhamento psicopedagógico',
    description:
      'Síntese objetiva para organizar informações de acompanhamento, participação, aprendizagem e orientações à escola.',
    defaultPurpose: 'Registrar o acompanhamento psicopedagógico e orientar adaptações possíveis sem estabelecer diagnóstico.',
    searchTerms: ['acompanhamento', 'psicopedagógico', 'escola', 'aprendizagem', 'orientação', 'relatório'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Registro orientativo para apoio educacional. As informações devem ser contextualizadas com família, escola e demais profissionais envolvidos.',
  },
  {
    id: 'psychopedagogy-session',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'record',
    category: 'Sessão',
    title: 'Registro de sessão psicopedagógica',
    description:
      'Modelo interno para documentar objetivo da sessão, respostas observadas, recursos utilizados e continuidade do plano.',
    defaultPurpose: 'Registrar de forma descritiva a sessão psicopedagógica e apoiar a continuidade do acompanhamento.',
    searchTerms: ['sessão', 'registro', 'psicopedagogia', 'evolução'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter: 'Registro de uso profissional interno. Não constitui laudo, diagnóstico ou parecer conclusivo.',
  },
  {
    id: 'psychopedagogy-referral',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'referral',
    category: 'Encaminhamento',
    title: 'Encaminhamento orientativo',
    description:
      'Texto breve para organizar motivo do encaminhamento, observações descritivas e recomendações de continuidade.',
    defaultPurpose: 'Orientar encaminhamento para avaliação ou acompanhamento complementar, sem conclusão diagnóstica.',
    searchTerms: ['encaminhamento', 'orientação', 'psicopedagogia'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'medium',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Encaminhamento orientativo. A definição de conduta, avaliação ou diagnóstico cabe ao profissional ou serviço de destino.',
  },
  {
    id: 'psychological-report',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    // Decisão CFP aplicada (Bloco 3, spec §16): título alterado de
    // "Relatório psicológico descritivo" para "Síntese psicológica descritiva",
    // pois as seções não seguem a estrutura CFP 06/2019 (identificação, demanda,
    // procedimento, análise, conclusão). Mantido documentKind 'formal_document'
    // (NÃO 'psychological_report'). O id 'psychological-report' é chave interna.
    documentKind: 'formal_document',
    category: 'Técnico',
    title: 'Síntese psicológica descritiva',
    description:
      'Estrutura descritiva para organizar dados observacionais e informações recebidas, sem diagnóstico automático ou inferências fechadas.',
    defaultPurpose: 'Organizar uma síntese descritiva de apoio ao registro profissional.',
    searchTerms: ['síntese', 'psicológico', 'descritivo', 'técnico'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'medium',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Documento de apoio ao registro profissional. Deve ser revisado pelo psicólogo responsável e não substitui avaliação formal específica.',
  },
  {
    id: 'psychological-report-cfp',
    schemaVersion: 1,
    // Relatório psicológico estruturado (Bloco B2). Segue a organização documental
    // Identificação / Descrição da demanda / Procedimento / Análise / Conclusão, com
    // responsabilidade profissional no rodapé ético. NÃO é laudo, não conclui
    // diagnóstico, não cita CID/DSM e não interpreta teste — apenas estrutura o texto
    // que o profissional escreve. neuropsicologo não existe no enum ProfessionCategory
    // hoje, então allowedProfessionCategories usa apenas 'psicologo'.
    status: 'active',
    line: 'psychology',
    documentKind: 'psychological_report',
    category: 'Relatório',
    title: 'Relatório psicológico estruturado',
    description:
      'Estrutura documental de relatório psicológico com identificação, descrição da demanda, procedimento, análise e conclusão. Organiza o texto escrito pelo profissional; não gera diagnóstico nem conclusão automática.',
    defaultPurpose:
      'Organizar um relatório psicológico de forma estruturada, descritiva e dentro dos limites técnicos e éticos.',
    searchTerms: [
      'relatório',
      'psicológico',
      'estruturado',
      'CFP',
      'identificação',
      'demanda',
      'procedimento',
      'análise',
      'conclusão',
    ],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'restricted',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação (avaliado, solicitante, finalidade e data)' },
      { key: 'observations', label: 'Descrição da demanda (motivo e questão apresentada)' },
      { key: 'strengths', label: 'Procedimento (fontes de informação e como foram obtidas)' },
      { key: 'attentionPoints', label: 'Análise (organização descritiva dos elementos considerados)' },
      { key: 'recommendations', label: 'Conclusão (síntese e encaminhamentos, sem diagnóstico fechado)' },
    ],
    sections: [
      { key: 'context', title: 'Identificação' },
      { key: 'observations', title: 'Descrição da demanda' },
      { key: 'strengths', title: 'Procedimento' },
      { key: 'attentionPoints', title: 'Análise' },
      { key: 'recommendations', title: 'Conclusão' },
    ],
    ethicalFooter:
      'Relatório psicológico elaborado sob responsabilidade do psicólogo signatário. O conteúdo é descritivo, deve ser revisado pelo profissional responsável e não constitui laudo, diagnóstico conclusivo, parecer pericial ou interpretação de teste.',
  },
  {
    id: 'psychological-followup-summary',
    schemaVersion: 1,
    // Oculto (Bloco B1): não bate 1:1 com nenhum dos 15 documentos de Psicologia da
    // spec v1.1 e seu conteúdo (síntese técnica de registro profissional) se sobrepõe
    // a 'psychological-progress-note'. "Devolutiva clínica" e "Orientação à família" da
    // spec são documentos de linguagem acessível voltados à família — tom diferente —
    // e serão criados como modelos próprios no bloco de expansão do catálogo. Mantido
    // (não deletado) para preservar id de rascunho local; fica fora da vitrine.
    status: 'hidden',
    line: 'psychology',
    documentKind: 'record',
    category: 'Síntese',
    title: 'Síntese de acompanhamento psicológico',
    description:
      'Organiza evolução geral, temas trabalhados e orientações de continuidade em tom técnico e não pericial.',
    defaultPurpose: 'Sintetizar o acompanhamento psicológico de forma descritiva, preservando sigilo e limites técnicos.',
    searchTerms: ['síntese', 'acompanhamento', 'psicológico', 'evolução'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Síntese de acompanhamento, sem finalidade pericial. O conteúdo deve respeitar sigilo, contexto clínico e limites éticos da comunicação.',
  },
  {
    id: 'psychological-progress-note',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'record',
    category: 'Evolução',
    title: 'Registro de evolução / acompanhamento',
    description:
      'Registro interno de evolução, com foco em observações de sessão, intervenções e planejamento de continuidade.',
    defaultPurpose: 'Registrar a evolução do acompanhamento psicológico de forma objetiva e descritiva.',
    searchTerms: ['evolução', 'registro', 'psicológico', 'sessão'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Registro técnico de acompanhamento. Não deve ser utilizado como laudo, declaração conclusiva ou documento pericial.',
  },
  {
    id: 'psychological-referral',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'referral',
    category: 'Encaminhamento',
    title: 'Encaminhamento orientativo',
    description:
      'Modelo para indicar continuidade de cuidado ou avaliação complementar com linguagem cautelosa e não diagnóstica.',
    defaultPurpose: 'Orientar encaminhamento para cuidado ou avaliação complementar, sem afirmar hipótese diagnóstica como conclusão.',
    searchTerms: ['encaminhamento', 'orientação', 'psicológico', 'cuidado'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'medium',
    requiresHeader: true,    guidedFields: [
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
    ethicalFooter:
      'Encaminhamento orientativo. A avaliação e a conduta final devem ser definidas pelo profissional ou serviço responsável pelo atendimento subsequente.',
  },
];

export const initialDraft: DraftFields = {
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

export const DRAFT_FIELD_KEYS = Object.keys(initialDraft) as DraftFieldKey[];

export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === 'string' && templates.some((template) => template.id === value);
}

export function getFirstTemplateForLine(line: LineKey): DocStudioTemplate {
  return templates.find((template) => template.line === line && template.status === 'active') ?? templates[0];
}

export function getTemplateById(id: unknown): DocStudioTemplate | undefined {
  if (!isTemplateKey(id)) return undefined;
  return templates.find((template) => template.id === id);
}

export function getTemplateForDraft(line: LineKey, templateKey: unknown): DocStudioTemplate {
  if (isTemplateKey(templateKey)) {
    const template = templates.find((item) => item.id === templateKey && item.line === line);
    if (template) return template;
  }
  return getFirstTemplateForLine(line);
}

export function getDefaultFieldsForTemplate(template: DocStudioTemplate): DraftFields {
  return {
    ...initialDraft,
    documentPurpose: template.defaultPurpose,
  };
}

export function getLineTitle(line: LineKey): string {
  return lineOptions.find((option) => option.key === line)?.title ?? lineOptions[0].title;
}

export function lineFromProfileType(profileType: string | null | undefined): LineKey {
  if (profileType === 'psychologist') return 'psychology';
  return 'psychopedagogy';
}
