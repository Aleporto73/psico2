import { NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openai';
import {
  formatCredential,
  getCredentialLabel,
  getProfessionLabel,
} from '@/lib/report/professional-identity';

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

const DESTINATION_RULES: Record<ReportType, string> = {
  family:
    'Use linguagem profissional, simples e acessível. Explique classificações sem jargão desnecessário, destaque pontos de atenção e aspectos preservados somente quando sustentados pelos dados e ofereça orientações gerais cautelosas.',
  school:
    'Use linguagem objetiva, pedagógica e funcional. Relacione os achados ao contexto escolar somente quando isso estiver sustentado pelos dados ou pelas observações fornecidas. Não invente causalidade.',
  technical:
    'Use linguagem técnica e organizada. Inclua os valores quantitativos realmente disponíveis, suas classificações e uma síntese cautelosa para integração com outros dados profissionais.',
  internal:
    'Produza um registro curto e operacional: identificação, instrumento, resultados principais, síntese, observações profissionais e acompanhamento.',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_NOTES_CHARS = 6000;

type AgeAtEvaluation = {
  years?: unknown;
  months?: unknown;
  days?: unknown;
  corrected?: unknown;
};

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
  score_type?: string;
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

function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function formatAgeAtEvaluation(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const age = raw as AgeAtEvaluation;
  const years = integerOrNull(age.years);
  const months = integerOrNull(age.months);
  const days = integerOrNull(age.days);

  if (years === null) return null;

  const parts: string[] = [`${years} ${years === 1 ? 'ano' : 'anos'}`];
  if (months !== null) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days !== null) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);

  const base =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;

  return age.corrected === true ? `${base} (idade corrigida)` : base;
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
- instrumento e tipo de escore;
- resultados persistidos por escala;
- perfil profissional fornecido;
- observações adicionais escritas pelo profissional.

Não use respostas item a item, tabelas normativas, regras de pontuação, gráficos ou imagens como fonte de cálculo. Não faça diagnóstico. Não gere laudo formal definitivo. Não invente achados, contexto, funcionalidade, causalidade ou conclusão que não esteja sustentada pelos dados fornecidos.

Separe mentalmente três níveis de informação: (1) fatos do CorrigeFácil, que são imutáveis; (2) contexto fornecido pelo profissional; (3) sua redação/síntese. O nível 3 nunca pode contradizer nem inventar os níveis 1 e 2.

DESTINO: ${REPORT_TYPE_LABEL[reportType]}
${DESTINATION_RULES[reportType]}

Estruture o texto de forma natural para o destino solicitado, omitindo campos ausentes em vez de preencher com "não informado" repetidamente.

Encerre o texto completo com EXATAMENTE este parágrafo, uma única vez, ao final:
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
      'id, user_id, subject_label, subject_meta, eval_date, created_at, completed_at, status, instruments!inner(code, name, score_type)',
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'name, display_name, gender, profession_category, credential_type, credential_number',
    )
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.warn('Professional profile lookup failed:', profileError);
  }

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
  const notesText = additionalNotes
    ? `\n\nOBSERVAÇÕES ADICIONAIS DO PROFISSIONAL:\n${additionalNotes}`
    : '';

  const userText = `ORIGEM: CorrigeFácil
TIPO DE RELATÓRIO: ${REPORT_TYPE_LABEL[reportType]}

IDENTIFICAÇÃO DA AVALIAÇÃO
Nome do avaliado: ${subjectName}
Idade na avaliação: ${age}
Data da avaliação/registro: ${evaluationDate}${respondent ? `\nRespondente: ${respondent}` : ''}

PROFISSIONAL RESPONSÁVEL
${professionalText(profile)}

INSTRUMENTO
Código: ${instrument.code}
Nome: ${instrument.name}
Tipo de escore: ${instrument.score_type || 'não especificado'}

RESULTADOS FECHADOS DO CORRIGEFÁCIL
${resultsText}${notesText}

Redija o rascunho profissional para o destino solicitado. Preserve integralmente os dados fechados acima.`;

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