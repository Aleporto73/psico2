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
  ReportProfile,
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
    id: 'psychopedagogy-anamnesis',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'structured_form',
    category: 'Anamnese',
    title: 'Anamnese psicopedagógica inicial',
    description:
      'Roteiro para organizar a coleta inicial de informações sobre desenvolvimento, aprendizagem, rotina e contexto do aprendente.',
    defaultPurpose: 'Registrar a anamnese inicial de forma descritiva para orientar o acompanhamento psicopedagógico.',
    searchTerms: ['anamnese', 'psicopedagógica', 'inicial', 'história', 'entrevista', 'coleta'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e motivo da procura' },
      { key: 'observations', label: 'História do desenvolvimento e da aprendizagem' },
      { key: 'strengths', label: 'Rotina, interesses e potencialidades' },
      { key: 'attentionPoints', label: 'Queixas e dificuldades relatadas' },
      { key: 'recommendations', label: 'Aspectos de saúde, escola e família a considerar' },
      { key: 'nextSteps', label: 'Encaminhamentos iniciais e plano de trabalho' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e motivo da procura' },
      { key: 'observations', title: 'História do desenvolvimento e da aprendizagem' },
      { key: 'strengths', title: 'Rotina, interesses e potencialidades' },
      { key: 'attentionPoints', title: 'Queixas e dificuldades relatadas' },
      { key: 'recommendations', title: 'Aspectos de saúde, escola e família a considerar' },
      { key: 'nextSteps', title: 'Encaminhamentos iniciais e plano de trabalho' },
    ],
    ethicalFooter:
      'Coleta inicial de informações relatadas. Documento descritivo de apoio ao acompanhamento; não constitui avaliação, diagnóstico ou conclusão.',
  },
  {
    id: 'psychopedagogy-family-interview',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'structured_form',
    category: 'Entrevista',
    title: 'Entrevista com família',
    description:
      'Roteiro para registrar informações trazidas pela família sobre rotina, vínculos, desenvolvimento e preocupações.',
    defaultPurpose: 'Organizar de forma descritiva as informações relatadas pela família.',
    searchTerms: ['entrevista', 'família', 'anamnese', 'história', 'responsáveis'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Dados da família e do aprendente' },
      { key: 'observations', label: 'Histórico relatado pela família' },
      { key: 'strengths', label: 'Rotinas, vínculos e potencialidades em casa' },
      { key: 'attentionPoints', label: 'Preocupações e dificuldades relatadas' },
      { key: 'recommendations', label: 'Combinados e orientações à família' },
      { key: 'nextSteps', label: 'Próximos passos do acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Dados da família e do aprendente' },
      { key: 'observations', title: 'Histórico relatado pela família' },
      { key: 'strengths', title: 'Rotinas, vínculos e potencialidades em casa' },
      { key: 'attentionPoints', title: 'Preocupações e dificuldades relatadas' },
      { key: 'recommendations', title: 'Combinados e orientações à família' },
      { key: 'nextSteps', title: 'Próximos passos do acompanhamento' },
    ],
    ethicalFooter:
      'Registro descritivo de informações relatadas pela família. Não constitui diagnóstico nem conclusão técnica fechada.',
  },
  {
    id: 'psychopedagogy-learner-interview',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'structured_form',
    category: 'Entrevista',
    title: 'Entrevista com aprendente',
    description:
      'Roteiro para registrar, com linguagem acolhedora, como o próprio aprendente percebe sua rotina de estudos e aprendizagem.',
    defaultPurpose: 'Registrar de forma descritiva a percepção do aprendente sobre a própria aprendizagem.',
    searchTerms: ['entrevista', 'aprendente', 'aluno', 'estudante', 'criança'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Contexto e clima da conversa' },
      { key: 'observations', label: 'Relato do aprendente sobre escola e estudos' },
      { key: 'strengths', label: 'Interesses, gostos e recursos próprios' },
      { key: 'attentionPoints', label: 'Dificuldades percebidas pelo aprendente' },
      { key: 'recommendations', label: 'Combinados construídos com o aprendente' },
      { key: 'nextSteps', label: 'Próximos passos' },
    ],
    sections: [
      { key: 'context', title: 'Contexto e clima da conversa' },
      { key: 'observations', title: 'Relato do aprendente sobre escola e estudos' },
      { key: 'strengths', title: 'Interesses, gostos e recursos próprios' },
      { key: 'attentionPoints', title: 'Dificuldades percebidas pelo aprendente' },
      { key: 'recommendations', title: 'Combinados construídos com o aprendente' },
      { key: 'nextSteps', title: 'Próximos passos' },
    ],
    ethicalFooter:
      'Registro descritivo da percepção do aprendente. Documento de apoio ao acompanhamento, sem finalidade diagnóstica.',
  },
  {
    id: 'psychopedagogy-teacher-interview',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'structured_form',
    category: 'Entrevista',
    title: 'Entrevista com professor/escola',
    description:
      'Roteiro para registrar observações do professor sobre a participação, a rotina e as respostas de aprendizagem em sala.',
    defaultPurpose: 'Organizar de forma descritiva as informações trazidas pelo professor ou pela escola.',
    searchTerms: ['entrevista', 'professor', 'escola', 'docente', 'sala'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Contexto escolar e turma' },
      { key: 'observations', label: 'Observações do professor sobre a aprendizagem' },
      { key: 'strengths', label: 'Respostas positivas e recursos em sala' },
      { key: 'attentionPoints', label: 'Dificuldades observadas em sala' },
      { key: 'recommendations', label: 'Estratégias já tentadas e sugestões' },
      { key: 'nextSteps', label: 'Combinados com a escola' },
    ],
    sections: [
      { key: 'context', title: 'Contexto escolar e turma' },
      { key: 'observations', title: 'Observações do professor sobre a aprendizagem' },
      { key: 'strengths', title: 'Respostas positivas e recursos em sala' },
      { key: 'attentionPoints', title: 'Dificuldades observadas em sala' },
      { key: 'recommendations', title: 'Estratégias já tentadas e sugestões' },
      { key: 'nextSteps', title: 'Combinados com a escola' },
    ],
    ethicalFooter:
      'Registro descritivo de informações trazidas pela escola. Não constitui diagnóstico nem avaliação conclusiva do aprendente.',
  },
  {
    id: 'psychopedagogy-school-observation',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'record',
    category: 'Observação',
    title: 'Observação escolar',
    description:
      'Registro funcional e descritivo de uma observação em ambiente escolar, com foco em situações concretas de aprendizagem e interação.',
    defaultPurpose: 'Registrar de forma funcional e descritiva o que foi observado no ambiente escolar.',
    searchTerms: ['observação', 'escolar', 'sala', 'descritiva', 'funcional'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Contexto e objetivo da observação' },
      { key: 'observations', label: 'Descrição funcional do que foi observado' },
      { key: 'strengths', label: 'Situações de engajamento e recursos' },
      { key: 'attentionPoints', label: 'Situações que pedem apoio' },
      { key: 'recommendations', label: 'Hipóteses de trabalho e ajustes possíveis' },
      { key: 'nextSteps', label: 'Continuidade da observação' },
    ],
    sections: [
      { key: 'context', title: 'Contexto e objetivo da observação' },
      { key: 'observations', title: 'Descrição funcional do que foi observado' },
      { key: 'strengths', title: 'Situações de engajamento e recursos' },
      { key: 'attentionPoints', title: 'Situações que pedem apoio' },
      { key: 'recommendations', title: 'Hipóteses de trabalho e ajustes possíveis' },
      { key: 'nextSteps', title: 'Continuidade da observação' },
    ],
    ethicalFooter:
      'Observação funcional e descritiva. Registra situações observadas e não estabelece diagnóstico ou conclusão sobre o aprendente.',
  },
  {
    id: 'psychopedagogy-play-observation',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'record',
    category: 'Observação',
    title: 'Observação lúdica',
    description:
      'Registro funcional e descritivo do brincar, das interações e dos recursos mobilizados durante uma proposta lúdica.',
    defaultPurpose: 'Registrar de forma descritiva o que foi observado durante a atividade lúdica.',
    searchTerms: ['observação', 'lúdica', 'brincar', 'jogo', 'funcional'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Contexto e proposta da atividade lúdica' },
      { key: 'observations', label: 'Descrição do brincar e das interações' },
      { key: 'strengths', label: 'Recursos, criatividade e engajamento' },
      { key: 'attentionPoints', label: 'Aspectos que merecem acompanhamento' },
      { key: 'recommendations', label: 'Leituras funcionais e próximas propostas' },
      { key: 'nextSteps', label: 'Continuidade da observação' },
    ],
    sections: [
      { key: 'context', title: 'Contexto e proposta da atividade lúdica' },
      { key: 'observations', title: 'Descrição do brincar e das interações' },
      { key: 'strengths', title: 'Recursos, criatividade e engajamento' },
      { key: 'attentionPoints', title: 'Aspectos que merecem acompanhamento' },
      { key: 'recommendations', title: 'Leituras funcionais e próximas propostas' },
      { key: 'nextSteps', title: 'Continuidade da observação' },
    ],
    ethicalFooter:
      'Observação funcional e descritiva do brincar. Não constitui teste, prova projetiva, diagnóstico ou conclusão sobre o aprendente.',
  },
  {
    id: 'school-feedback',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'school_orientation',
    category: 'Escola',
    title: 'Devolutiva para escola',
    description:
      'Documento de devolutiva à escola com síntese do acompanhamento, potencialidades a valorizar e orientações pedagógicas.',
    defaultPurpose: 'Compartilhar com a escola uma devolutiva clara e orientativa sobre o acompanhamento.',
    searchTerms: ['devolutiva', 'escola', 'orientação', 'aprendizagem', 'pedagógica'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Objetivo da devolutiva' },
      { key: 'observations', label: 'Síntese do acompanhamento' },
      { key: 'strengths', label: 'Potencialidades a valorizar em sala' },
      { key: 'attentionPoints', label: 'Necessidades de apoio na escola' },
      { key: 'recommendations', label: 'Estratégias pedagógicas sugeridas' },
      { key: 'nextSteps', label: 'Combinados de acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Objetivo da devolutiva' },
      { key: 'observations', title: 'Síntese do acompanhamento' },
      { key: 'strengths', title: 'Potencialidades a valorizar em sala' },
      { key: 'attentionPoints', title: 'Necessidades de apoio na escola' },
      { key: 'recommendations', title: 'Estratégias pedagógicas sugeridas' },
      { key: 'nextSteps', title: 'Combinados de acompanhamento' },
    ],
    ethicalFooter:
      'Devolutiva orientativa para apoio educacional. As informações devem ser contextualizadas com família, escola e demais profissionais envolvidos.',
  },
  {
    id: 'psychopedagogy-observation-report',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'school_orientation',
    category: 'Relatório',
    title: 'Relatório de observação escolar',
    description:
      'Relatório descritivo que organiza, em texto, as observações realizadas no ambiente escolar ao longo de um período.',
    defaultPurpose: 'Organizar em relatório descritivo as observações realizadas na escola.',
    searchTerms: ['relatório', 'observação', 'escolar', 'descritivo'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Motivo e período da observação' },
      { key: 'observations', label: 'Registro descritivo das observações' },
      { key: 'strengths', label: 'Recursos e respostas positivas' },
      { key: 'attentionPoints', label: 'Necessidades de apoio observadas' },
      { key: 'recommendations', label: 'Orientações à escola e à família' },
      { key: 'nextSteps', label: 'Encaminhamentos de continuidade' },
    ],
    sections: [
      { key: 'context', title: 'Motivo e período da observação' },
      { key: 'observations', title: 'Registro descritivo das observações' },
      { key: 'strengths', title: 'Recursos e respostas positivas' },
      { key: 'attentionPoints', title: 'Necessidades de apoio observadas' },
      { key: 'recommendations', title: 'Orientações à escola e à família' },
      { key: 'nextSteps', title: 'Encaminhamentos de continuidade' },
    ],
    ethicalFooter:
      'Relatório descritivo de observação. Registra o que foi observado e não estabelece diagnóstico, laudo ou conclusão fechada.',
  },
  {
    id: 'psychopedagogy-aee-report',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'formal_document',
    category: 'AEE',
    title: 'Relatório individual AEE',
    description:
      'Relatório de apoio ao Atendimento Educacional Especializado, organizando percurso, recursos de acessibilidade e necessidades de apoio.',
    defaultPurpose: 'Organizar o relatório individual de apoio no contexto do AEE, com foco em acessibilidade e acompanhamento.',
    searchTerms: ['relatório', 'AEE', 'atendimento educacional especializado', 'apoio', 'individual', 'acessibilidade'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'medium',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e objetivo do relatório de AEE' },
      { key: 'observations', label: 'Descrição do percurso e do apoio oferecido' },
      { key: 'strengths', label: 'Avanços, recursos e potencialidades' },
      { key: 'attentionPoints', label: 'Barreiras e necessidades de apoio' },
      { key: 'recommendations', label: 'Recursos de acessibilidade e adaptações sugeridas' },
      { key: 'nextSteps', label: 'Plano de continuidade do apoio' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e objetivo do relatório de AEE' },
      { key: 'observations', title: 'Descrição do percurso e do apoio oferecido' },
      { key: 'strengths', title: 'Avanços, recursos e potencialidades' },
      { key: 'attentionPoints', title: 'Barreiras e necessidades de apoio' },
      { key: 'recommendations', title: 'Recursos de acessibilidade e adaptações sugeridas' },
      { key: 'nextSteps', title: 'Plano de continuidade do apoio' },
    ],
    ethicalFooter:
      'Relatório de apoio educacional (AEE). Organiza acompanhamento e recursos de acessibilidade; não constitui avaliação diagnóstica nem laudo.',
  },
  {
    id: 'psychopedagogy-support-plan',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'structured_form',
    category: 'Plano',
    title: 'Plano de apoio escolar / PEI simplificado',
    description:
      'Estrutura para organizar metas, estratégias e responsáveis em um plano de apoio escolar individualizado e simplificado.',
    defaultPurpose: 'Organizar um plano de apoio escolar com metas, estratégias e revisões, construído com a escola.',
    searchTerms: ['plano', 'apoio', 'PEI', 'escolar', 'individualizado', 'organização', 'metas'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e objetivos do plano de apoio' },
      { key: 'observations', label: 'Ponto de partida: o que já se observa' },
      { key: 'strengths', label: 'Potencialidades a mobilizar' },
      { key: 'attentionPoints', label: 'Necessidades de apoio prioritárias' },
      { key: 'recommendations', label: 'Estratégias, recursos e responsáveis' },
      { key: 'nextSteps', label: 'Metas e datas de revisão' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e objetivos do plano de apoio' },
      { key: 'observations', title: 'Ponto de partida: o que já se observa' },
      { key: 'strengths', title: 'Potencialidades a mobilizar' },
      { key: 'attentionPoints', title: 'Necessidades de apoio prioritárias' },
      { key: 'recommendations', title: 'Estratégias, recursos e responsáveis' },
      { key: 'nextSteps', title: 'Metas e datas de revisão' },
    ],
    ethicalFooter:
      'Plano de organização e apoio, construído com a escola e a família. Ferramenta pedagógica de acompanhamento; não substitui avaliação diagnóstica nem promete diagnóstico.',
  },
  {
    id: 'psychopedagogy-authorization',
    schemaVersion: 1,
    status: 'active',
    line: 'psychopedagogy',
    documentKind: 'formal_document',
    category: 'Documentos',
    title: 'Autorização / contrato / declaração simples',
    description:
      'Modelo administrativo flexível para autorização, combinado de atendimento ou declaração simples de comparecimento.',
    defaultPurpose: 'Registrar de forma organizada uma autorização, um combinado de atendimento ou uma declaração simples.',
    searchTerms: ['autorização', 'contrato', 'declaração', 'consentimento', 'comparecimento', 'combinado'],
    recommendedForProfileTypes: ['psychopedagogue', 'both', 'unknown'],
    allowedProfessionCategories: ['psicopedagogo', 'neuropsicopedagogo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Tipo de documento e finalidade' },
      { key: 'observations', label: 'Partes envolvidas e dados necessários' },
      { key: 'recommendations', label: 'Termos, condições e combinados' },
      { key: 'nextSteps', label: 'Data, local e validade' },
    ],
    sections: [
      { key: 'context', title: 'Tipo de documento e finalidade' },
      { key: 'observations', title: 'Partes envolvidas e dados necessários' },
      { key: 'recommendations', title: 'Termos, condições e combinados' },
      { key: 'nextSteps', title: 'Data, local e validade' },
    ],
    ethicalFooter:
      'Modelo administrativo de apoio. O conteúdo deve ser revisado e adequado à situação real e à legislação aplicável antes do uso.',
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
  {
    id: 'psychology-anamnesis-adult',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'structured_form',
    category: 'Anamnese',
    title: 'Anamnese psicológica adulto',
    description:
      'Roteiro para organizar a coleta inicial de informações sobre história pessoal, queixa atual e contexto de vida do paciente adulto.',
    defaultPurpose: 'Registrar a anamnese inicial do adulto de forma descritiva para orientar o acompanhamento.',
    searchTerms: ['anamnese', 'psicológica', 'adulto', 'história', 'entrevista inicial'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e motivo da procura' },
      { key: 'observations', label: 'História pessoal e queixa atual' },
      { key: 'strengths', label: 'Recursos, rede de apoio e fatores de proteção' },
      { key: 'attentionPoints', label: 'Aspectos que requerem atenção' },
      { key: 'recommendations', label: 'Histórico de saúde e informações a considerar' },
      { key: 'nextSteps', label: 'Direcionamento inicial do acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e motivo da procura' },
      { key: 'observations', title: 'História pessoal e queixa atual' },
      { key: 'strengths', title: 'Recursos, rede de apoio e fatores de proteção' },
      { key: 'attentionPoints', title: 'Aspectos que requerem atenção' },
      { key: 'recommendations', title: 'Histórico de saúde e informações a considerar' },
      { key: 'nextSteps', title: 'Direcionamento inicial do acompanhamento' },
    ],
    ethicalFooter:
      'Coleta inicial de informações relatadas. Documento descritivo de apoio; não constitui avaliação, diagnóstico ou conclusão.',
  },
  {
    id: 'psychology-anamnesis-child',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'structured_form',
    category: 'Anamnese',
    title: 'Anamnese psicológica infantil/adolescente',
    description:
      'Roteiro para organizar informações sobre desenvolvimento, contexto familiar e escolar e queixa atual de crianças e adolescentes.',
    defaultPurpose: 'Registrar a anamnese inicial da criança/adolescente de forma descritiva.',
    searchTerms: ['anamnese', 'psicológica', 'infantil', 'adolescente', 'criança', 'desenvolvimento'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e motivo da procura' },
      { key: 'observations', label: 'História do desenvolvimento e contexto familiar/escolar' },
      { key: 'strengths', label: 'Recursos, interesses e potencialidades' },
      { key: 'attentionPoints', label: 'Queixas e preocupações relatadas' },
      { key: 'recommendations', label: 'Aspectos de saúde, escola e rotina a considerar' },
      { key: 'nextSteps', label: 'Direcionamento inicial do acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e motivo da procura' },
      { key: 'observations', title: 'História do desenvolvimento e contexto familiar/escolar' },
      { key: 'strengths', title: 'Recursos, interesses e potencialidades' },
      { key: 'attentionPoints', title: 'Queixas e preocupações relatadas' },
      { key: 'recommendations', title: 'Aspectos de saúde, escola e rotina a considerar' },
      { key: 'nextSteps', title: 'Direcionamento inicial do acompanhamento' },
    ],
    ethicalFooter:
      'Coleta inicial de informações relatadas pelos responsáveis. Documento descritivo de apoio; não constitui diagnóstico ou conclusão.',
  },
  {
    id: 'psychology-treatment-plan',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'structured_form',
    category: 'Planejamento',
    title: 'Planejamento terapêutico inicial',
    description:
      'Estrutura para organizar a compreensão inicial do caso, objetivos terapêuticos e estratégias, de forma revisável.',
    defaultPurpose: 'Organizar um planejamento terapêutico inicial com objetivos e estratégias combinados.',
    searchTerms: ['planejamento', 'terapêutico', 'plano', 'objetivos', 'psicoterapia'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Demanda e foco do acompanhamento' },
      { key: 'observations', label: 'Compreensão inicial do caso' },
      { key: 'strengths', label: 'Recursos do paciente e da rede de apoio' },
      { key: 'attentionPoints', label: 'Pontos de atenção para o plano' },
      { key: 'recommendations', label: 'Objetivos terapêuticos e estratégias iniciais' },
      { key: 'nextSteps', label: 'Combinados, frequência e revisão do plano' },
    ],
    sections: [
      { key: 'context', title: 'Demanda e foco do acompanhamento' },
      { key: 'observations', title: 'Compreensão inicial do caso' },
      { key: 'strengths', title: 'Recursos do paciente e da rede de apoio' },
      { key: 'attentionPoints', title: 'Pontos de atenção para o plano' },
      { key: 'recommendations', title: 'Objetivos terapêuticos e estratégias iniciais' },
      { key: 'nextSteps', title: 'Combinados, frequência e revisão do plano' },
    ],
    ethicalFooter:
      'Planejamento inicial de trabalho, revisável ao longo do acompanhamento. Não constitui conclusão diagnóstica.',
  },
  {
    id: 'psychology-opinion',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'formal_document',
    category: 'Parecer',
    title: 'Parecer psicológico orientativo',
    description:
      'Parecer técnico e orientativo que organiza elementos considerados e recomendações, sem finalidade pericial ou judicial.',
    defaultPurpose: 'Organizar um parecer psicológico orientativo, com linguagem técnica e cautelosa.',
    searchTerms: ['parecer', 'psicológico', 'orientativo', 'opinião técnica'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'medium',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e finalidade do parecer' },
      { key: 'observations', label: 'Elementos considerados' },
      { key: 'strengths', label: 'Recursos e fatores favoráveis' },
      { key: 'attentionPoints', label: 'Aspectos que requerem atenção' },
      { key: 'recommendations', label: 'Orientações e considerações técnicas' },
      { key: 'nextSteps', label: 'Encaminhamentos sugeridos' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e finalidade do parecer' },
      { key: 'observations', title: 'Elementos considerados' },
      { key: 'strengths', title: 'Recursos e fatores favoráveis' },
      { key: 'attentionPoints', title: 'Aspectos que requerem atenção' },
      { key: 'recommendations', title: 'Orientações e considerações técnicas' },
      { key: 'nextSteps', title: 'Encaminhamentos sugeridos' },
    ],
    ethicalFooter:
      'Parecer orientativo sob responsabilidade do psicólogo signatário. Não é laudo, documento pericial ou judicial, nem conclusão diagnóstica.',
  },
  {
    id: 'psychology-clinical-feedback',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'family_orientation',
    category: 'Devolutiva',
    title: 'Devolutiva clínica em linguagem acessível',
    description:
      'Documento de devolutiva ao paciente ou à família com síntese do acompanhamento em linguagem clara e acolhedora.',
    defaultPurpose: 'Compartilhar uma devolutiva clínica clara, preservando sigilo e limites técnicos.',
    searchTerms: ['devolutiva', 'clínica', 'acessível', 'família', 'paciente'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'medium',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Objetivo da devolutiva' },
      { key: 'observations', label: 'Síntese do acompanhamento em linguagem clara' },
      { key: 'strengths', label: 'Potencialidades e avanços' },
      { key: 'attentionPoints', label: 'Pontos que merecem cuidado' },
      { key: 'recommendations', label: 'Orientações práticas' },
      { key: 'nextSteps', label: 'Próximos passos combinados' },
    ],
    sections: [
      { key: 'context', title: 'Objetivo da devolutiva' },
      { key: 'observations', title: 'Síntese do acompanhamento em linguagem clara' },
      { key: 'strengths', title: 'Potencialidades e avanços' },
      { key: 'attentionPoints', title: 'Pontos que merecem cuidado' },
      { key: 'recommendations', title: 'Orientações práticas' },
      { key: 'nextSteps', title: 'Próximos passos combinados' },
    ],
    ethicalFooter:
      'Devolutiva em linguagem acessível, respeitando sigilo e limites técnicos. Não substitui avaliação formal específica.',
  },
  {
    id: 'psychology-family-guidance',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'family_orientation',
    category: 'Orientação',
    title: 'Orientação à família/responsáveis',
    description:
      'Documento de orientação prática à família ou aos responsáveis, com foco em rotina, cuidado e fatores de proteção.',
    defaultPurpose: 'Registrar orientações práticas de apoio à família ou aos responsáveis.',
    searchTerms: ['orientação', 'família', 'responsáveis', 'psicoeducação'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Contexto e objetivo da orientação' },
      { key: 'observations', label: 'Aspectos observados relevantes para a família' },
      { key: 'strengths', label: 'Recursos e fatores de proteção da família' },
      { key: 'attentionPoints', label: 'Situações que pedem cuidado' },
      { key: 'recommendations', label: 'Orientações práticas para o dia a dia' },
      { key: 'nextSteps', label: 'Combinados de acompanhamento' },
    ],
    sections: [
      { key: 'context', title: 'Contexto e objetivo da orientação' },
      { key: 'observations', title: 'Aspectos observados relevantes para a família' },
      { key: 'strengths', title: 'Recursos e fatores de proteção da família' },
      { key: 'attentionPoints', title: 'Situações que pedem cuidado' },
      { key: 'recommendations', title: 'Orientações práticas para o dia a dia' },
      { key: 'nextSteps', title: 'Combinados de acompanhamento' },
    ],
    ethicalFooter:
      'Orientação de apoio à família. Não substitui acompanhamento individualizado nem constitui diagnóstico ou conclusão.',
  },
  {
    id: 'psychology-therapy-contract',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'formal_document',
    category: 'Documentos',
    title: 'Contrato terapêutico',
    description:
      'Modelo de combinado terapêutico com enquadre de frequência, sigilo e condições do acompanhamento.',
    defaultPurpose: 'Registrar de forma organizada o enquadre e os combinados do acompanhamento terapêutico.',
    searchTerms: ['contrato', 'terapêutico', 'combinado', 'psicoterapia', 'enquadre'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Partes e objeto do contrato' },
      { key: 'observations', label: 'Enquadre: frequência, duração e valores' },
      { key: 'recommendations', label: 'Combinados sobre faltas, sigilo e cancelamento' },
      { key: 'nextSteps', label: 'Vigência, data e assinaturas' },
    ],
    sections: [
      { key: 'context', title: 'Partes e objeto do contrato' },
      { key: 'observations', title: 'Enquadre: frequência, duração e valores' },
      { key: 'recommendations', title: 'Combinados sobre faltas, sigilo e cancelamento' },
      { key: 'nextSteps', title: 'Vigência, data e assinaturas' },
    ],
    ethicalFooter:
      'Modelo de combinado terapêutico. Revisar e adequar à situação real e à legislação aplicável antes do uso.',
  },
  {
    id: 'psychology-minor-authorization',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'formal_document',
    category: 'Documentos',
    title: 'Autorização para atendimento de menor',
    description:
      'Modelo administrativo para registrar a autorização do responsável legal para o atendimento de criança ou adolescente.',
    defaultPurpose: 'Registrar a autorização do responsável legal para o atendimento do menor.',
    searchTerms: ['autorização', 'atendimento', 'menor', 'responsável', 'consentimento'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação do menor e do responsável' },
      { key: 'observations', label: 'Finalidade e escopo do atendimento autorizado' },
      { key: 'recommendations', label: 'Termos, sigilo e condições' },
      { key: 'nextSteps', label: 'Data, local e assinatura do responsável' },
    ],
    sections: [
      { key: 'context', title: 'Identificação do menor e do responsável' },
      { key: 'observations', title: 'Finalidade e escopo do atendimento autorizado' },
      { key: 'recommendations', title: 'Termos, sigilo e condições' },
      { key: 'nextSteps', title: 'Data, local e assinatura do responsável' },
    ],
    ethicalFooter:
      'Modelo administrativo. Revisar e adequar à situação real e à legislação aplicável, inclusive quanto à guarda e à responsabilidade legal.',
  },
  {
    id: 'psychology-online-protocol',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'formal_document',
    category: 'Documentos',
    title: 'Protocolo de atendimento online',
    description:
      'Modelo para registrar combinados do atendimento a distância: modalidade, plataforma, privacidade e contingência.',
    defaultPurpose: 'Registrar os combinados e as condições do atendimento psicológico online.',
    searchTerms: ['protocolo', 'atendimento', 'online', 'telepsicologia', 'remoto'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e modalidade online' },
      { key: 'observations', label: 'Recursos, plataforma e condições técnicas' },
      { key: 'recommendations', label: 'Combinados de sigilo, privacidade e contingência' },
      { key: 'nextSteps', label: 'Ciência, data e registro' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e modalidade online' },
      { key: 'observations', title: 'Recursos, plataforma e condições técnicas' },
      { key: 'recommendations', title: 'Combinados de sigilo, privacidade e contingência' },
      { key: 'nextSteps', title: 'Ciência, data e registro' },
    ],
    ethicalFooter:
      'Combinado de atendimento online. Observar as normas do Conselho de Psicologia sobre atendimento a distância.',
  },
  {
    id: 'psychology-attendance-declaration',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'formal_document',
    category: 'Documentos',
    title: 'Declaração de comparecimento / recibo',
    description:
      'Modelo simples e administrativo para declarar comparecimento ou registrar recibo, sem conteúdo clínico.',
    defaultPurpose: 'Registrar uma declaração de comparecimento ou um recibo de forma simples e administrativa.',
    searchTerms: ['declaração', 'comparecimento', 'recibo', 'presença', 'pagamento'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'low',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Tipo de documento e finalidade' },
      { key: 'observations', label: 'Dados: nome, data, horário e/ou valor' },
      { key: 'nextSteps', label: 'Local, data e assinatura' },
    ],
    sections: [
      { key: 'context', title: 'Tipo de documento e finalidade' },
      { key: 'observations', title: 'Dados: nome, data, horário e/ou valor' },
      { key: 'nextSteps', title: 'Local, data e assinatura' },
    ],
    ethicalFooter:
      'Declaração/recibo simples e administrativo. Não informa conteúdo clínico nem constitui atestado.',
  },
  {
    id: 'psychology-tcle',
    schemaVersion: 1,
    status: 'active',
    line: 'psychology',
    documentKind: 'formal_document',
    category: 'Documentos',
    title: 'TCLE simplificado',
    description:
      'Termo de consentimento livre e esclarecido em versão simplificada, com linguagem clara sobre o que consentir e direitos do participante.',
    defaultPurpose: 'Registrar um consentimento livre e esclarecido simplificado, com linguagem clara.',
    searchTerms: ['TCLE', 'consentimento', 'livre', 'esclarecido', 'termo'],
    recommendedForProfileTypes: ['psychologist', 'both'],
    allowedProfessionCategories: ['psicologo'],
    riskLevel: 'medium',
    requiresHeader: true,
    guidedFields: [
      { key: 'context', label: 'Identificação e objetivo do consentimento' },
      { key: 'observations', label: 'Em que consiste, com riscos e benefícios em linguagem clara' },
      { key: 'strengths', label: 'Direitos do participante e voluntariedade' },
      { key: 'recommendations', label: 'Sigilo, uso das informações e possibilidade de desistência' },
      { key: 'nextSteps', label: 'Ciência, data e assinaturas' },
    ],
    sections: [
      { key: 'context', title: 'Identificação e objetivo do consentimento' },
      { key: 'observations', title: 'Em que consiste, com riscos e benefícios em linguagem clara' },
      { key: 'strengths', title: 'Direitos do participante e voluntariedade' },
      { key: 'recommendations', title: 'Sigilo, uso das informações e possibilidade de desistência' },
      { key: 'nextSteps', title: 'Ciência, data e assinaturas' },
    ],
    ethicalFooter:
      'Termo simplificado de consentimento. Não substitui documento jurídico completo — revisar e adequar ao contexto e à legislação aplicável.',
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

/**
 * Linha inicial a partir de profession_category (Minha Conta).
 * Retorna null quando a profissão não define catálogo na v1 (fono, TO, médico,
 * pediatra, outro, ausente) — o chamador deve cair no fallback por profile_type.
 * Não promete catálogo Fono/TO: essas profissões usam o fallback seguro.
 */
export function lineFromProfessionCategory(category: string | null | undefined): LineKey | null {
  if (category === 'psicologo') return 'psychology';
  if (category === 'psicopedagogo' || category === 'neuropsicopedagogo') return 'psychopedagogy';
  return null;
}

/**
 * Linha inicial com prioridade: profession_category primeiro, profile_type depois,
 * fallback seguro por último (lineFromProfileType já default para 'psychopedagogy').
 */
export function lineFromProfile(
  profile: Pick<ReportProfile, 'profession_category' | 'profile_type'> | null | undefined,
): LineKey {
  return (
    lineFromProfessionCategory(profile?.profession_category) ?? lineFromProfileType(profile?.profile_type)
  );
}
