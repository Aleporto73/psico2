/**
 * /api/assistant/generate/route.ts
 * Endpoint seguro para geração de relatórios com IA via OpenAI.
 *
 * Regras de segurança obrigatórias:
 * 1. Usuário precisa estar autenticado (sessão válida Supabase).
 * 2. Verificação server-side de has_active_assistant via user_access_status.
 * 3. Limite diário: 20 gerações por usuário por dia.
 * 4. Payload validado e higienizado (tamanho máximo dos campos).
 * 5. Chave OpenAI nunca exposta ao frontend.
 * 6. Imagens opcionais (PNG/JPG/JPEG/WEBP, até 5 MB cada, máximo 4 prints).
 * 7. Campo "Dados da planilha" é OBRIGATÓRIO apenas quando não há imagens.
 * 8. Tipo de relatório (reportType) ajusta linguagem; fallback seguro = 'technical'.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { callOpenAI, OpenAIContentPart, VISION_NOT_SUPPORTED } from '@/lib/openai';

// Limites de segurança
const DAILY_LIMIT = 20;
const MAX_PLANILHA_CHARS = 4000;
const MAX_OBSERVACOES_CHARS = 2000;
const MAX_OBJETIVO_CHARS = 500;

// Limites de imagem
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES = 4;
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
// Aceita header "data:image/png;base64,..."
const DATA_URL_REGEX = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/i;

// Aviso obrigatório final (hardcoded no backend — não pode ser removido pelo frontend)
const AVISO_FINAL =
  'Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.';

// Mensagem padrão devolvida pelo modelo quando o print não puder ser lido
const IMAGE_UNREADABLE_MSG =
  'Não consegui ler todos os dados do print. Envie uma imagem mais nítida ou transcreva os resultados principais.';

// ── Tipo de relatório ────────────────────────────────────────────────────────
type ReportType = 'family' | 'school' | 'technical' | 'internal' | 'three_versions';
const REPORT_TYPES: ReadonlySet<ReportType> = new Set([
  'family',
  'school',
  'technical',
  'internal',
  'three_versions',
]);

function normalizeReportType(raw: unknown): ReportType {
  if (typeof raw === 'string' && REPORT_TYPES.has(raw as ReportType)) {
    return raw as ReportType;
  }
  return 'technical';
}

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  family: 'Pais / Família',
  school: 'Escola',
  technical: 'Técnico',
  internal: 'Registro interno',
  three_versions: 'Três versões (Pais / Família, Escola, Técnica)',
};

/**
 * Instruções específicas por tipo de relatório, inseridas no system prompt.
 * Cada bloco mantém as regras éticas obrigatórias (sem diagnóstico, sem invenção,
 * sem recálculo de escores). O fechamento ético segue obrigatório UMA única vez
 * ao final do output completo.
 */
function reportTypeBlock(type: ReportType): string {
  switch (type) {
    case 'family':
      return `TIPO DE RELATÓRIO: Pais / Família.
Escreva UM texto único, acolhedor, simples e explicativo, dirigido aos responsáveis pela criança/adolescente.
- Vocabulário: cotidiano, sem jargão técnico desnecessário. Quando um termo técnico aparecer nos dados, traduza em uma frase simples.
- Tom: respeitoso, calmo, esperançoso, sem alarmismo.
- Profundidade técnica: baixa.
- Tamanho: curto a médio. Foco em clareza.
- Estrutura sugerida: o que foi observado nos dados informados; o que isso descreve no dia a dia; orientações práticas para casa (rotinas, organização, brincadeiras, reforço positivo, momentos de pausa); quando procurar acompanhamento profissional.
- NÃO use a palavra "diagnóstico" nem afirme presença/ausência de transtornos. NÃO use frases como "compatível com TEA/TDAH/etc.".`;
    case 'school':
      return `TIPO DE RELATÓRIO: Escola.
Escreva UM texto único, objetivo, pedagógico e funcional, dirigido à equipe escolar (professor, coordenação, AEE).
- Vocabulário: pedagógico-funcional. Centre nas implicações para sala de aula, não em rótulos.
- Tom: colaborativo, prático.
- Profundidade técnica: moderada, com foco funcional.
- Estrutura sugerida: descrição dos indicadores apresentados; impactos potenciais em sala (atenção, leitura, escrita, socialização, organização — conforme couber); recomendações pedagógicas que façam sentido aos dados (rotina visual, instruções curtas, apoio visual, tempo adicional, mediação, pausas programadas, acompanhamento individualizado, parceria família-escola).
- Adapte as recomendações ao que os dados realmente sustentam — não recomende intervenções para condições não evidenciadas.`;
    case 'technical':
      return `TIPO DE RELATÓRIO: Técnico (apoio profissional).
Escreva UM texto único, profissional, com estrutura de relatório descritivo de apoio operacional.
- Vocabulário: técnico moderado, em português brasileiro formal.
- Tom: cauteloso e profissional.
- Profundidade técnica: média.
- Estrutura sugerida: contextualização; descrição dos dados informados (texto e/ou prints); organização dos indicadores apresentados; análise descritiva cautelosa; recomendações de encaminhamento ou continuidade.
- NÃO feche diagnóstico, NÃO afirme presença/ausência de transtornos, NÃO recalcule escores, NÃO converta gráfico em número se o número não estiver escrito.`;
    case 'internal':
      return `TIPO DE RELATÓRIO: Registro interno (prontuário/anotação do profissional).
Escreva UM texto CURTO, direto, estilo registro de evolução interna.
- Vocabulário: técnico abreviado, telegráfico quando útil.
- Tom: factual, sem floreio.
- Profundidade técnica: alta na densidade dos dados, baixa em narrativa.
- Estrutura sugerida: dados aplicados/informados; indicadores principais visíveis; conduta atual; próximos passos / hipóteses descritivas a observar.
- NÃO produza um texto longo voltado a família ou escola. NÃO emita diagnóstico fechado.`;
    case 'three_versions':
      return `TIPO DE RELATÓRIO: Três versões em um único output.
Gere EXATAMENTE três blocos na ordem abaixo, cada um com cabeçalho claro em negrito e quebra de linha entre eles. Cada bloco deve ser objetivo (parágrafos curtos), com linguagem REALMENTE adaptada ao público — não repita o mesmo texto três vezes.

1. **Versão para Pais / Família**
   - Acolhedora, simples, sem jargão, com orientações práticas para casa, sem alarmismo.

2. **Versão para Escola**
   - Objetiva, pedagógica, funcional, com recomendações para sala de aula (rotina, instruções curtas, apoio visual, tempo adicional, mediação) quando fizerem sentido aos dados.

3. **Versão Técnica / Profissional**
   - Descritiva, cautelosa, com estrutura de relatório (contextualização, descrição dos dados, organização dos indicadores, análise descritiva, recomendações de continuidade).

REGRAS específicas para este modo:
- Mantenha cada bloco curto e útil. Sem inflar texto.
- Não duplique frases entre blocos.
- O fechamento ético obrigatório aparece UMA ÚNICA VEZ, ao final do output completo (depois do bloco 3), e NÃO dentro de cada versão.`;
  }
}

interface ValidatedImage {
  dataUrl: string;
  mime: string;
  approxBytes: number;
}

function validateImage(
  raw: string
): { ok: true; image: ValidatedImage } | { ok: false; error: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Imagem vazia.' };
  }

  const match = trimmed.match(DATA_URL_REGEX);
  if (!match) {
    return { ok: false, error: 'Use imagens em PNG, JPG, JPEG ou WEBP.' };
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, error: 'Use imagens em PNG, JPG, JPEG ou WEBP.' };
  }

  const b64 = match[2];
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const approxBytes = Math.floor((b64.length * 3) / 4) - padding;

  if (approxBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Cada imagem deve ter no máximo 5 MB.' };
  }

  return { ok: true, image: { dataUrl: trimmed, mime, approxBytes } };
}

export async function POST(request: Request) {
  try {
    // ── 1. Autenticação ────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não autenticado.' },
        { status: 401 }
      );
    }

    // ── 2. Verificar assinatura ativa (server-side) ───────────────────────────
    const { data: accessData, error: accessError } = await supabase
      .from('user_access_status')
      .select('has_active_assistant, assistant_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (accessError || !accessData) {
      return NextResponse.json(
        { message: 'Não foi possível verificar o status de acesso.' },
        { status: 500 }
      );
    }

    if (!accessData.has_active_assistant) {
      return NextResponse.json(
        {
          message:
            'Acesso negado. O Assistente IA Pro requer uma assinatura ativa. Consulte a página do Assistente IA Pro para mais informações.',
        },
        { status: 403 }
      );
    }

    // ── 3. Verificar limite diário ─────────────────────────────────────────────
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('ai_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDay.toISOString());

    if (countError) {
      return NextResponse.json(
        { message: 'Erro ao verificar limite diário.' },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          message:
            'Você atingiu o limite de segurança diário. Tente novamente amanhã ou entre em contato com o suporte.',
          daily_count: count,
          daily_limit: DAILY_LIMIT,
        },
        { status: 429 }
      );
    }

    // ── 4. Validar e higienizar payload ───────────────────────────────────────
    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: 'Payload inválido. Envie um JSON válido.' },
        { status: 400 }
      );
    }

    const { nome, idade, area, objetivo, planilhaData, observacoes } = body;

    // Tipo de relatório (com fallback seguro para 'technical')
    const reportType = normalizeReportType(body.reportType);

    // Normaliza imagens: aceita imageDataUrls (array) ou fallback imageDataUrl (string)
    let rawImages: string[] = [];
    if (Array.isArray(body.imageDataUrls)) {
      rawImages = body.imageDataUrls.filter((s: any) => typeof s === 'string' && s.trim() !== '');
    } else if (typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim() !== '') {
      rawImages = [body.imageDataUrl];
    }

    if (rawImages.length > MAX_IMAGES) {
      return NextResponse.json(
        { message: 'Envie no máximo 4 prints por relatório.' },
        { status: 400 }
      );
    }

    // Campos sempre obrigatórios
    if (!nome?.trim() || !idade?.trim() || !area?.trim() || !objetivo?.trim()) {
      return NextResponse.json(
        {
          message:
            'Campos obrigatórios em falta: Nome/Identificação, Idade/Faixa etária, Área do Relatório e Objetivo.',
        },
        { status: 400 }
      );
    }

    // Campo condicional: planilhaData é obrigatório APENAS quando não há imagens
    const planilhaDataTrim = (planilhaData ?? '').toString().trim();
    if (rawImages.length === 0 && !planilhaDataTrim) {
      return NextResponse.json(
        { message: 'Envie um print da planilha ou cole os resultados no campo de dados.' },
        { status: 400 }
      );
    }

    // Higienização de tamanho
    const nomeClean = nome.trim().slice(0, 200);
    const idadeClean = idade.trim().slice(0, 50);
    const areaClean = area.trim().slice(0, 200);
    const objetivoClean = objetivo.trim().slice(0, MAX_OBJETIVO_CHARS);
    const planilhaDataClean = planilhaDataTrim.slice(0, MAX_PLANILHA_CHARS);
    const observacoesClean = ((observacoes ?? '') as string).trim().slice(0, MAX_OBSERVACOES_CHARS);

    // Valida cada imagem
    const validatedImages: ValidatedImage[] = [];
    for (let i = 0; i < rawImages.length; i++) {
      const v = validateImage(rawImages[i]);
      if (!v.ok) {
        return NextResponse.json(
          { message: `Imagem ${i + 1}: ${v.error}` },
          { status: 400 }
        );
      }
      validatedImages.push(v.image);
    }
    const hasImages = validatedImages.length > 0;

    // ── 5. Construir prompt seguro ────────────────────────────────────────────
    const baseSystem = `Você é um assistente profissional de APOIO OPERACIONAL para psicólogos e psicopedagogos. Sua única função é organizar os dados que o profissional já apresentou (em texto e/ou em prints da planilha) em um rascunho descritivo de apoio.

REGRAS OBRIGATÓRIAS — VIOLAÇÃO NÃO É PERMITIDA:
1. NUNCA faça diagnósticos, hipóteses diagnósticas, sugestões de diagnóstico, conclusões clínicas ou fechamentos diagnósticos.
2. NUNCA invente pontos de corte, normas, percentis, T-escores ou classificações que não tenham sido fornecidos explicitamente no texto ou visíveis em algum print.
3. NUNCA substitua o manual técnico original do instrumento. Sempre indique ao leitor que o manual original deve ser consultado.
4. NUNCA gere um laudo clínico ou psicológico formal. O texto é um rascunho inicial de apoio.
5. USE APENAS os dados fornecidos pelo profissional (texto digitado e/ou prints). Não extrapole, não recalcule escores, não converta gráfico em número se o número não estiver escrito, não substitua dado enviado pelo usuário por conhecimento externo.
6. Escreva em português brasileiro formal, cauteloso e profissional (a menos que o TIPO DE RELATÓRIO peça linguagem mais simples — então adapte sem perder o cuidado ético).
7. LINGUAGEM OBRIGATÓRIA — use SEMPRE termos descritivos como:
   - "organização dos dados apresentados pelo profissional"
   - "dados extraídos da planilha enviada"
   - "indicadores apresentados no instrumento"
   - "apoio à elaboração de rascunho profissional"
   - "análise descritiva dos resultados informados"
   - "os dados devem ser interpretados pelo profissional responsável"
   EVITE TERMINANTEMENTE expressões como "avaliação psicológica realizada", "identificar a presença de TEA", "diagnóstico", "conclusão clínica", "o paciente apresenta transtorno", "confirmado", "indica transtorno", "compatível com diagnóstico".
8. Quando mencionar instrumentos sensíveis (CARS-2, WISC, WAIS, Raven, Vineland, VB-MAPP e similares), inclua uma frase de moldura próxima a esses dados:
   "Os dados abaixo organizam as informações apresentadas na planilha enviada e não substituem manual técnico, aplicação padronizada ou interpretação profissional."
9. Encerre o output completo com EXATAMENTE este parágrafo (uma única vez, ao final, mesmo no modo de três versões): "${AVISO_FINAL}"`;

    const visionBlock = `

ANÁLISE DE IMAGEM — quando houver 1 ou mais prints anexados:
O profissional pode enviar até 4 prints da MESMA aplicação. Trate todos os prints como partes do mesmo material:
- um print pode conter a tabela;
- outro pode conter o gráfico;
- outro pode conter resultado/classificação;
- outro pode conter continuação da planilha.
Os prints são complementares — combine o que estiver visível em todos eles.

Extraia apenas o que estiver VISÍVEL e organize internamente nesta estrutura antes de redigir o rascunho:
Dados extraídos dos prints:
- Planilha/instrumento:
- Pontuação total:
- Classificação textual visível:
- Percentil visível:
- T-escore visível:
- Outros indicadores visíveis:
- Subescalas/domínios visíveis:
- Dados não legíveis:

Regras de leitura dos prints:
- Não invente valores ausentes.
- Não recalcule escores.
- Não estime número ilegível.
- Não converta gráfico em número se o número não estiver escrito.
- Não substitua dado enviado pelo usuário por conhecimento externo.
- Se algo não estiver visível, escreva [dado não legível no print].
- Se houver conflito entre o texto digitado pelo profissional e o que o print mostra, mencione a divergência e peça confirmação — salvo se o profissional já tiver indicado nas Observações que o texto digitado é o valor correto.

Se TODOS os prints estiverem ilegíveis, inutilizáveis ou não contiverem dados de planilha/instrumento, responda EXATAMENTE com este texto e nada mais:
"${IMAGE_UNREADABLE_MSG}"

Depois transforme os dados visíveis (combinados com o texto digitado, quando houver) em rascunho descritivo, seguindo as instruções do TIPO DE RELATÓRIO solicitado.`;

    const reportBlock = `

${reportTypeBlock(reportType)}`;

    const systemPrompt = (hasImages ? baseSystem + visionBlock : baseSystem) + reportBlock;

    const printsLabel = hasImages
      ? `\nO profissional anexou ${validatedImages.length} ${validatedImages.length === 1 ? 'print' : 'prints'} da planilha/gráfico. Analise ${validatedImages.length === 1 ? 'a imagem em anexo' : 'todas as imagens em anexo'} seguindo as regras de ANÁLISE DE IMAGEM.`
      : '';

    const userText = `Tipo de relatório solicitado: ${REPORT_TYPE_LABEL[reportType]}

Profissional: ${nomeClean}
Idade/Faixa etária: ${idadeClean}
Área do relatório: ${areaClean}
Objetivo do relatório: ${objetivoClean}

${planilhaDataClean ? `Dados da planilha (digitados pelo profissional):\n${planilhaDataClean}` : 'Dados da planilha digitados: nenhum (o profissional escolheu enviar apenas os prints).'}
${observacoesClean ? `\nObservações adicionais:\n${observacoesClean}` : ''}${printsLabel}

Gere o rascunho descritivo de apoio conforme as instruções do sistema e o tipo de relatório solicitado.`;

    // Mensagem do usuário: string pura sem imagem; array multimodal quando há imagens.
    const userContent: string | OpenAIContentPart[] = hasImages
      ? [
          { type: 'text', text: userText },
          ...validatedImages.map<OpenAIContentPart>((img) => ({
            type: 'image_url',
            image_url: { url: img.dataUrl, detail: 'high' },
          })),
        ]
      : userText;

    // ── 6. Chamar a API da OpenAI ─────────────────────────────────────────────
    let generatedText: string;
    try {
      const result = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ]);
      generatedText = result.content;
    } catch (openaiErr: any) {
      console.error('OpenAI error:', openaiErr);

      if (openaiErr?.message === VISION_NOT_SUPPORTED) {
        return NextResponse.json(
          {
            message:
              'O modelo atual não conseguiu analisar imagem. Envie os resultados em texto ou ajuste o modelo para visão.',
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          message:
            'Erro ao conectar com o serviço de IA. Tente novamente em instantes.',
        },
        { status: 502 }
      );
    }

    // Se o modelo respondeu apenas a mensagem de "imagem ilegível", devolve direto
    // ao frontend como erro amigável e NÃO grava no histórico nem consome o limite.
    if (hasImages && generatedText.trim() === IMAGE_UNREADABLE_MSG) {
      return NextResponse.json(
        {
          message: IMAGE_UNREADABLE_MSG,
          daily_count: count ?? 0,
          daily_limit: DAILY_LIMIT,
        },
        { status: 422 }
      );
    }

    // Garantia extra: se o aviso final não estiver presente, anexar
    if (!generatedText.includes(AVISO_FINAL)) {
      generatedText = `${generatedText}\n\n${AVISO_FINAL}`;
    }

    // ── 7. Salvar relatório em ai_reports ─────────────────────────────────────
    const reportTitle = `${areaClean} — ${nomeClean}`;
    const printsMarker = hasImages
      ? `\n\n[${validatedImages.length} ${validatedImages.length === 1 ? 'print anexado' : 'prints anexados'} pelo profissional]`
      : '';
    const savedInput =
      (planilhaDataClean || (hasImages ? '(sem dados digitados — apenas prints)' : '')) +
      `\n[Tipo de relatório: ${REPORT_TYPE_LABEL[reportType]}]` +
      printsMarker;

    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .insert({
        user_id: user.id,
        title: reportTitle,
        report_type: areaClean,
        input_text: savedInput,
        output_text: generatedText,
      })
      .select()
      .single();

    if (saveError || !savedReport) {
      console.error('Error saving report:', saveError);
      return NextResponse.json({
        message: 'Relatório gerado, mas não foi possível salvar no histórico.',
        report: {
          id: null,
          title: reportTitle,
          output_text: generatedText,
          created_at: new Date().toISOString(),
        },
        daily_count: (count ?? 0) + 1,
        daily_limit: DAILY_LIMIT,
      });
    }

    return NextResponse.json({
      message: 'Relatório gerado com sucesso.',
      report: savedReport,
      daily_count: (count ?? 0) + 1,
      daily_limit: DAILY_LIMIT,
    });
  } catch (err: any) {
    console.error('Unexpected error in /api/assistant/generate:', err);
    return NextResponse.json(
      { message: err.message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
