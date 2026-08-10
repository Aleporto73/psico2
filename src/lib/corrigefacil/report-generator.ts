import { NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openai';
import { formatAgeAtEvaluation } from '@/lib/report/format-age';
import {
  formatCredential,
  getCredentialLabel,
  getProfessionLabel,
} from '@/lib/report/professional-identity';

// A formatação da idade mudou de arquivo, não de comportamento: o
// documento profissional precisa dela no cliente e este módulo é
// server-only por causa de `@/lib/openai`. Continua exportada daqui para
// não quebrar quem já a importava.
export { formatAgeAtEvaluation };

type ReportType = 'family' | 'school' | 'technical' | 'internal';

const REPORT_TYPES: ReadonlySet<ReportType> = new Set([
  'family',
  'school',
  'technical',
  'internal',
]);

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  family: 'Pais / Família',
  school: 'Escola',
  technical: 'Equipe multiprofissional',
  internal: 'Registro interno',
};

/** O que muda por destino é a VOZ e a profundidade — nunca a estrutura nem
 *  o que pode ser afirmado. As quatro seções são as mesmas nos quatro. */
const DESTINATION_RULES: Record<ReportType, string> = {
  family:
    'Escreva para quem não é da área: linguagem acessível, respeitosa, sem jargão, e sem alarmismo. ' +
    'Traduza a classificação em termos compreensíveis, mantendo o rótulo exato ao mencioná-lo. ' +
    'Nas orientações, fale do que observar no cotidiano em nível geral. ' +
    'Não responsabilize pais ou cuidadores pelo resultado, não sugira diagnóstico e não antecipe evolução.',
  school:
    'Escreva para o contexto educacional: linguagem pedagógica e funcional, voltada a observação, ' +
    'acompanhamento e comunicação entre escola, família e equipe. ' +
    'Não afirme dificuldade de aprendizagem, problema de comportamento ou queda de rendimento que não tenha sido fornecido. ' +
    'Um resultado emocional ou comportamental NÃO é causa de desempenho escolar: não transforme um no outro. ' +
    'Sem contexto escrito pelo profissional, NÃO nomeie o que a escola deve observar — nada de participação nas atividades, ' +
    'rendimento, comportamento, atenção, interação social, rotina, engajamento ou bem-estar como objetos de acompanhamento. ' +
    'Você não sabe o que a escola vai encontrar, e antecipar isso inventa um domínio que ninguém forneceu. ' +
    'Correto: "integrar o resultado às observações disponíveis no contexto escolar". ' +
    'Incorreto: "acompanhar mudanças na participação nas atividades".',
  technical:
    'Escreva para outros profissionais: linguagem técnica e precisa. ' +
    'Integre os valores e classificações disponíveis, destaque convergências e diferenças entre as escalas ' +
    'e explicite os limites interpretativos do que foi aplicado. ' +
    'O texto deve facilitar a integração com entrevista, observação e outros instrumentos, sem substituí-los.',
  internal:
    'Registro operacional do próprio profissional: MESMA estrutura de quatro seções, porém curto e direto. ' +
    'Evite prosa: resultado, significado cauteloso, o que acompanhar e próximos passos gerais. ' +
    'Frases objetivas valem mais que parágrafos desenvolvidos.',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_NOTES_CHARS = 6000;

type ResultRow = {
  raw: number | string | null;
  score: number | string | null;
  percentile: number | string | null;
  z_score: number | string | null;
  classification: string | null;
  ci95: string | null;
  available: boolean;
  message: string | null;
  flags: unknown;
  scales: unknown;
};

type InstrumentData = {
  code?: string;
  name?: string;
};

type ScaleData = {
  code?: string;
  name?: string;
  ordinal?: number;
};

/** Os campos de `profiles` que o cabeçalho do relatório usa. `gender` só
 *  serve para flexionar a profissão; nenhum outro dado de conta entra. */
type ProfessionalProfile = {
  name?: string | null;
  display_name?: string | null;
  gender?: string | null;
  profession_category?: string | null;
  credential_type?: string | null;
  credential_number?: string | null;
};

function normalizeReportType(raw: unknown): ReportType {
  if (typeof raw === 'string' && REPORT_TYPES.has(raw as ReportType)) {
    return raw as ReportType;
  }
  return 'technical';
}

function oneRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  if (value && typeof value === 'object') return value as T;
  return null;
}

function cleanScalar(value: number | string | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function formatClosedResults(rows: ResultRow[]): string {
  return rows
    .map((row) => {
      const scale = oneRelation<ScaleData>(row.scales);
      const name = scale?.name?.trim() || scale?.code?.trim() || 'Escala';
      const code = scale?.code?.trim();
      const lines = [`${name}${code && code !== name ? ` (${code})` : ''}`];

      const raw = cleanScalar(row.raw);
      const score = cleanScalar(row.score);
      const percentile = cleanScalar(row.percentile);
      const z = cleanScalar(row.z_score);
      if (raw !== null) lines.push(`- bruto: ${raw}`);
      if (score !== null) lines.push(`- escore: ${score}`);
      if (percentile !== null) lines.push(`- percentil: ${percentile}`);
      if (z !== null) lines.push(`- z: ${z}`);
      if (row.classification?.trim()) lines.push(`- classificação: ${row.classification.trim()}`);
      if (row.ci95?.trim()) lines.push(`- IC95: ${row.ci95.trim()}`);
      lines.push(`- disponível: ${row.available ? 'sim' : 'não'}`);
      if (row.message?.trim()) lines.push(`- mensagem: ${row.message.trim()}`);

      return lines.join('\n');
    })
    .join('\n\n');
}

export function buildCorrigeFacilSystemPrompt(
  reportType: ReportType,
  avisoFinal: string,
): string {
  return `Você redige rascunhos profissionais de apoio a partir de resultados já calculados pelo CorrigeFácil.

Responda exclusivamente em português brasileiro.

REGRA CENTRAL — DADOS FECHADOS:
Os resultados fornecidos foram calculados e classificados pelo CorrigeFácil. Trate-os como dados fechados. Preserve exatamente os valores e classificações recebidos. Não recalcule escores, percentis, z, IC95 ou classificações. Não determine pontos de corte, não selecione normas, não reconstrua tabelas normativas e não altere valores.

Use somente:
- identificação persistida da avaliação;
- idade persistida na data da avaliação;
- instrumento (código e nome);
- resultados persistidos por escala;
- observações adicionais escritas pelo profissional.

Não use respostas item a item, tabelas normativas, regras de pontuação, gráficos ou imagens como fonte de cálculo. Não faça diagnóstico. Não gere laudo formal definitivo. Não invente achados, contexto, funcionalidade, causalidade ou conclusão que não esteja sustentada pelos dados fornecidos.

Separe mentalmente três níveis de informação: (1) fatos do CorrigeFácil, que são imutáveis; (2) contexto fornecido pelo profissional; (3) sua redação/síntese. O nível 3 nunca pode contradizer nem inventar os níveis 1 e 2.

O QUE VOCÊ NÃO PRECISA ESCREVER:
O documento final já apresenta, fora do seu texto e de forma automática, o nome do avaliado, a idade, a data, o respondente, o instrumento, a identificação do profissional, a tabela completa dos resultados e o gráfico. Você escreve APENAS a parte interpretativa.
- Não abra o texto recontando nome, idade, data, respondente ou profissional.
- Não escreva parágrafo de identificação, de metodologia nem "rascunho de apoio destinado a...".
- Não repita a tabela linha por linha ("bruto: 29, escore: 29, percentil: ..."). Os números aparecem no texto só quando forem necessários para sustentar a leitura.
- Não assine: a identificação profissional já fecha o documento.
- O nome do avaliado pode aparecer pontualmente na análise, se melhorar a leitura.
- Nunca escreva códigos internos do sistema (por exemplo nomes de tipo de escore ou de campo).

REGRA DE EVIDÊNCIA — o que autoriza você a falar de um assunto:
Só pode entrar no texto o conceito sustentado por (1) nome do instrumento, (2) nome da escala, (3) classificação persistida, (4) valores persistidos ou (5) contexto escrito pelo profissional. Faltando isso, o conceito NÃO ENTRA — nem como exemplo, nem como possibilidade, nem como sugestão de observação.

O nome do instrumento e a classificação dizem QUE construto foi rastreado e em que faixa o resultado caiu. Não dizem como a pessoa se sente, se comporta, dorme, rende ou se relaciona. Portanto NÃO derive deles sintoma, manifestação ou domínio funcional.

Exemplo do erro a evitar: de "CES-D — Probabilidade MODERADA de depressão" é correto falar em resultado de rastreamento relacionado à depressão, na classificação recebida e na necessidade de integrá-la a outras informações. É INCORRETO acrescentar, sem contexto do profissional, sofrimento emocional, bem-estar, humor, sono, interesse, motivação, concentração, isolamento, ansiedade, funcionamento cotidiano, participação em atividades, rendimento, comportamento ou relações familiares. Esses termos são exemplos do que não se pode inventar — não são uma lista a ser preenchida nem substituída por sinônimos.

A classificação é RESULTADO DE RASTREIO, não descrição clínica da pessoa.

Quando houver contexto escrito pelo profissional, o domínio que ele mencionou fica liberado para a redação — mantendo clara a origem, sem convertê-lo em resultado do instrumento.

ESTRUTURA OBRIGATÓRIA — exatamente estas quatro seções, nesta ordem, em Markdown:

## Síntese dos resultados
Comece pelo RESULTADO, em poucas linhas. Dê a visão principal do que a avaliação mostrou. Ao mencionar uma classificação, reproduza o rótulo exatamente como recebido, sem sinônimo e sem gradação própria. Havendo várias escalas, sintetize o perfil conjunto sem criar hierarquia que os dados não sustentam.

## Análise e interpretação
Explique o PESO INTERPRETATIVO do resultado: o que a classificação permite afirmar, o que ela NÃO permite afirmar e, quando couber, a necessidade de integrar com outras fontes. Havendo mais de uma escala, é aqui que elas se articulam.
Não reescreva a síntese com outras palavras. A classificação já foi nomeada acima: refira-se a ela como "esse resultado" em vez de repetir o rótulo inteiro, salvo quando a repetição for realmente necessária.
É proibido explicar POR QUE a pessoa obteve o resultado, atribuir causa, presumir sintoma, comportamento, desempenho escolar ou dinâmica familiar que não tenham sido fornecidos, e usar conhecimento próprio de pontos de corte para acrescentar informação que não veio nos dados.
Não preencha a falta de dados com exemplos de sintomas ou de funcionalidade. Escala única e sem contexto do profissional pede uma análise CURTA: conhecimento geral sobre o construto não vira fato sobre o avaliado.
Evite "apresenta", "demonstra", "confirma", "comprova". Prefira formulações proporcionais: "o resultado sugere", "o achado é compatível com", "esse resultado deve ser integrado a".

## Pontos de atenção
Em lista de itens, cada um acrescentando algo DISTINTO das seções anteriores. Não use como item a classificação que a síntese já enunciou. Cada item precisa se apoiar diretamente num resultado persistido ou no contexto escrito pelo profissional.
Não crie itens para encher, não invente "aspectos preservados" sem dado que os sustente e não trate ausência de elevação como habilidade preservada. Havendo um único ponto distinto, escreva um único item: um item verdadeiro vale mais que três repetidos.

## Orientações
Próximos passos gerais, coerentes com o destino. Não repita aqui a classificação, o alerta de que não é diagnóstico nem o pedido de cautela, se isso já foi dito antes.
Sem contexto do profissional, as orientações devem ser PROCESSUAIS: integrar o resultado às informações já disponíveis, registrar o que for pertinente, manter comunicação entre os contextos envolvidos e discutir com os profissionais responsáveis, conforme julgamento profissional. Não nomeie o que acompanhar ("observar humor", "acompanhar sono", "monitorar participação", "acompanhar bem-estar") sem que instrumento, escala, classificação ou contexto do profissional sustentem aquele domínio.
Não prescreva medicamento, psicoterapia específica, intervenção padronizada ou encaminhamento obrigatório sem base. Não escreva recomendação genérica desconectada do resultado só para alongar o texto.

CADA SEÇÃO CUMPRE UMA FUNÇÃO DIFERENTE: a síntese diz o achado, a análise diz o alcance e o limite, os pontos de atenção acrescentam o que ainda não foi dito e as orientações apontam o próximo passo. Dizer a mesma coisa quatro vezes empobrece o documento.

NÃO transforme o relatório em checklist burocrático. A estrutura existe para organizar a leitura profissional, não para produzir uma sequência mecânica de campos nem frases padronizadas. Escreva texto que se lê, não formulário preenchido.

EXTENSÃO: proporcional à informação disponível. Instrumento de escala única pede texto conciso; instrumento com várias escalas comporta mais desenvolvimento. Seção obrigatória NÃO significa volume obrigatório: com dados pobres, seções curtas, poucos itens e orientação curta são a resposta certa. Qualidade acima de tamanho — nunca produza volume inventando conteúdo.

DESTINO: ${REPORT_TYPE_LABEL[reportType]}
${DESTINATION_RULES[reportType]}

Não crie outras seções. Em especial, não escreva Introdução, Identificação, Dados do paciente, Dados do profissional, Metodologia, Hipótese diagnóstica, Diagnóstico, Conclusão diagnóstica, Prognóstico, CID ou DSM.

Omita informação ausente quando ela não for necessária para compreender o relatório. Não preencha ausência com "não informado", "não disponível" nem "não avaliado": marcar o vazio não acrescenta nada e transforma o texto em formulário.

Depois da quarta seção, encerre o texto com EXATAMENTE este parágrafo, uma única vez, sem título acima dele:
"${avisoFinal}"`;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const datePart = value.slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value.trim().slice(0, 50);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** O bloco de profissional que vai ao prompt.
 *
 *  Manda RÓTULO, não código: `profiles` guarda `psicologo`/`crp`, e era
 *  isso que chegava à IA — que então redigia "psicologo" no lugar de
 *  "Psicóloga". A tradução é a mesma do Doc Studio e mora em
 *  `@/lib/report/professional-identity`.
 *
 *  Categoria ou credencial sem rótulo publicável (`outro`,
 *  `nao_informado`, valor desconhecido) sai como AUSÊNCIA: a linha some
 *  em vez de carregar o código cru. É o que o prompt já pede — omitir
 *  campo ausente em vez de preencher.
 *
 *  A credencial exige a SIGLA para existir, e é por isso que o gate é
 *  `getCredentialLabel` e não `formatCredential`. Sem sigla publicável,
 *  `formatCredential` devolveria o número sozinho — comportamento certo
 *  para o Doc Studio, que o mostra ao lado do nome de quem assina, e
 *  errado aqui: um "Registro/credencial: 12345" solto no prompt é um
 *  registro sem órgão, que a IA não tem como qualificar e pode redigir
 *  como se fosse. Número sem sigla não é registro; é dígito. */
export function professionalText(profile: ProfessionalProfile | null): string {
  if (!profile) return 'Perfil profissional: não incluído.';
  const name = (profile.display_name || profile.name || '').trim();
  const profession = getProfessionLabel(
    profile.profession_category,
    profile.gender,
  );
  const credential = getCredentialLabel(profile.credential_type)
    ? formatCredential(profile.credential_type, profile.credential_number)
    : '';

  const lines: string[] = [];
  if (name) lines.push(`Nome: ${name}`);
  if (profession) lines.push(`Profissão: ${profession}`);
  if (credential) lines.push(`Registro/credencial: ${credential}`);
  return lines.length ? lines.join('\n') : 'Perfil profissional: não incluído.';
}

export async function generateCorrigeFacilReport(args: {
  supabase: any;
  userId: string;
  body: Record<string, any>;
  currentMonthlyCount: number;
  monthlyLimit: number;
  avisoFinal: string;
}) {
  const {
    supabase,
    userId,
    body,
    currentMonthlyCount,
    monthlyLimit,
    avisoFinal,
  } = args;

  const assessmentId =
    typeof body.assessmentId === 'string' ? body.assessmentId.trim() : '';
  if (!UUID_REGEX.test(assessmentId)) {
    return NextResponse.json(
      { message: 'Avaliação CorrigeFácil inválida.' },
      { status: 400 },
    );
  }

  const reportType = normalizeReportType(body.reportType);
  const additionalNotes =
    typeof body.additionalNotes === 'string'
      ? body.additionalNotes.trim().slice(0, MAX_NOTES_CHARS)
      : '';

  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select(
      // `score_type` saiu: é código interno (`escore_bruto`) que vazava para o
      // texto do relatório, e nada na redação depende dele — os resultados
      // fechados já dizem quais métricas existem. Continua no banco e na
      // tabela do documento; só não vai mais ao modelo.
      'id, user_id, subject_label, subject_meta, eval_date, created_at, completed_at, status, instruments!inner(code, name)',
    )
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (assessmentError) {
    console.error('CorrigeFácil assessment lookup error:', assessmentError);
    return NextResponse.json(
      { message: 'Não foi possível carregar a avaliação salva.' },
      { status: 500 },
    );
  }
  if (!assessment) {
    return NextResponse.json(
      { message: 'Avaliação salva não encontrada.' },
      { status: 404 },
    );
  }

  const subjectName =
    typeof assessment.subject_label === 'string'
      ? assessment.subject_label.trim()
      : '';
  const subjectMeta =
    assessment.subject_meta && typeof assessment.subject_meta === 'object'
      ? assessment.subject_meta
      : {};
  const age = formatAgeAtEvaluation(subjectMeta.age_at_evaluation);

  if (!subjectName || !age) {
    return NextResponse.json(
      {
        message:
          'Esta avaliação não possui nome e idade completos para gerar o relatório.',
      },
      { status: 422 },
    );
  }

  const instrument = oneRelation<InstrumentData>(assessment.instruments);
  if (!instrument?.code || !instrument?.name) {
    return NextResponse.json(
      { message: 'Instrumento da avaliação não encontrado.' },
      { status: 422 },
    );
  }

  const { data: resultRows, error: resultsError } = await supabase
    .from('assessment_results')
    .select(
      'raw, score, percentile, z_score, classification, ci95, available, message, flags, scales!inner(code, name, ordinal)',
    )
    .eq('assessment_id', assessmentId);

  if (resultsError) {
    console.error('CorrigeFácil results lookup error:', resultsError);
    return NextResponse.json(
      { message: 'Não foi possível carregar os resultados salvos.' },
      { status: 500 },
    );
  }

  const rows = ((resultRows ?? []) as ResultRow[]).sort((a, b) => {
    const scaleA = oneRelation<ScaleData>(a.scales);
    const scaleB = oneRelation<ScaleData>(b.scales);
    return (scaleA?.ordinal ?? 9999) - (scaleB?.ordinal ?? 9999);
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { message: 'A avaliação salva não possui resultados disponíveis.' },
      { status: 422 },
    );
  }

  // O perfil profissional NÃO é mais lido aqui. O documento renderiza o
  // cabeçalho e a assinatura deterministicamente, e a narrativa não deve
  // assinar nem repetir o profissional — mandá-lo ao modelo só produzia
  // aberturas do tipo "elaborado a partir dos dados informados pela
  // profissional...". Nada na redação depende disso, então o dado deixa de
  // sair do banco para esta chamada. `professionalText` continua exportado e
  // testado: ele é o formatter compartilhado, e segue servindo ao documento.

  const evaluationDate =
    formatDate(assessment.eval_date) ||
    formatDate(assessment.completed_at) ||
    formatDate(assessment.created_at) ||
    'data não registrada';

  const respondent =
    typeof subjectMeta.respondent_name === 'string'
      ? subjectMeta.respondent_name.trim()
      : '';

  const resultsText = formatClosedResults(rows);
  // Contexto do profissional NÃO é resultado do instrumento, e o rótulo diz
  // isso ao modelo: sem essa separação, observação subjetiva e dado
  // quantitativo entram no texto como se tivessem o mesmo peso de evidência.
  const notesText = additionalNotes
    ? `\n\nCONTEXTO FORNECIDO PELO PROFISSIONAL (não é resultado do instrumento; ao apoiar uma conclusão nele, deixe a origem clara no texto):\n${additionalNotes}`
    : '';

  const userText = `ORIGEM: CorrigeFácil
TIPO DE RELATÓRIO: ${REPORT_TYPE_LABEL[reportType]}

IDENTIFICAÇÃO DA AVALIAÇÃO (contexto para você; o documento já a apresenta — não a reconte)
Nome do avaliado: ${subjectName}
Idade na avaliação: ${age}
Data da avaliação/registro: ${evaluationDate}${respondent ? `\nRespondente: ${respondent}` : ''}

INSTRUMENTO
Código: ${instrument.code}
Nome: ${instrument.name}

RESULTADOS FECHADOS DO CORRIGEFÁCIL
${resultsText}${notesText}

Redija as quatro seções para o destino solicitado. Preserve integralmente os dados fechados acima.`;

  let generatedText: string;
  try {
    const result = await callOpenAI([
      {
        role: 'system',
        content: buildCorrigeFacilSystemPrompt(reportType, avisoFinal),
      },
      { role: 'user', content: userText },
    ]);
    generatedText = result.content;

    console.info('[assistant_usage]', {
      user_id: userId,
      source: 'corrigefacil',
      assessment_id: assessmentId,
      instrument_code: instrument.code,
      model: result.model,
      prompt_tokens: result.usage?.prompt_tokens ?? null,
      completion_tokens: result.usage?.completion_tokens ?? null,
      total_tokens: result.usage?.total_tokens ?? null,
      image_count: 0,
      report_type: reportType,
    });
  } catch (error) {
    console.error('OpenAI CorrigeFácil error:', error);
    return NextResponse.json(
      { message: 'Erro ao conectar com o serviço de IA. Tente novamente em instantes.' },
      { status: 502 },
    );
  }

  if (!generatedText.includes(avisoFinal)) {
    generatedText = `${generatedText}\n\n${avisoFinal}`;
  }

  const reportTitle = `${instrument.code} — ${subjectName}`;
  const savedInput = [
    '[Origem: CorrigeFácil]',
    `[Avaliação: ${assessmentId}]`,
    `[Instrumento: ${instrument.code} — ${instrument.name}]`,
    `[Tipo de relatório: ${REPORT_TYPE_LABEL[reportType]}]`,
    additionalNotes ? `Observações do profissional:\n${additionalNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const { data: savedReport, error: saveError } = await supabase
    .from('ai_reports')
    .insert({
      user_id: userId,
      title: reportTitle,
      report_type: reportType,
      input_text: savedInput,
      output_text: generatedText,
      corrigefacil_assessment_id: assessmentId,
    })
    .select()
    .single();

  if (saveError || !savedReport) {
    console.error('Error saving CorrigeFácil report:', saveError);
    return NextResponse.json({
      message: 'Relatório gerado, mas não foi possível salvar no histórico.',
      report: {
        id: null,
        title: reportTitle,
        output_text: generatedText,
        created_at: new Date().toISOString(),
      },
      monthly_count: currentMonthlyCount + 1,
      monthly_limit: monthlyLimit,
      daily_count: currentMonthlyCount + 1,
      daily_limit: monthlyLimit,
    });
  }

  return NextResponse.json({
    message: 'Relatório gerado com sucesso.',
    report: savedReport,
    monthly_count: currentMonthlyCount + 1,
    monthly_limit: monthlyLimit,
    daily_count: currentMonthlyCount + 1,
    daily_limit: monthlyLimit,
  });
}