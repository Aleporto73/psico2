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
 * 6. Imagem opcional (PNG/JPG/JPEG/WEBP, até 5 MB) com validação de prefixo
 *    data URL e estimativa de tamanho decodificado.
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
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
// Aceita header "data:image/png;base64,..." (com/sem o sufixo ;base64 antes da vírgula)
const DATA_URL_REGEX = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/i;

// Aviso obrigatório final (hardcoded no backend — não pode ser removido pelo frontend)
const AVISO_FINAL =
  'Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.';

// Mensagem padrão devolvida pelo modelo quando o print não puder ser lido
const IMAGE_UNREADABLE_MSG =
  'Não consegui ler todos os dados do print. Envie uma imagem mais nítida ou transcreva os resultados principais.';

interface ValidatedImage {
  dataUrl: string;
  mime: string;
  approxBytes: number;
}

/**
 * Valida um data URL de imagem.
 * Retorna ValidatedImage em caso de sucesso ou um objeto { error } amigável.
 */
function validateImage(
  raw: string
): { ok: true; image: ValidatedImage } | { ok: false; error: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Imagem vazia.' };
  }

  const match = trimmed.match(DATA_URL_REGEX);
  if (!match) {
    return {
      ok: false,
      error:
        'Formato de imagem inválido. Aceitamos apenas PNG, JPG/JPEG ou WEBP enviados em data URL base64.',
    };
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    return {
      ok: false,
      error: 'Tipo de imagem não suportado. Use PNG, JPG/JPEG ou WEBP.',
    };
  }

  const b64 = match[2];
  // Estimativa de bytes decodificados a partir do tamanho base64
  const padding = (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  const approxBytes = Math.floor((b64.length * 3) / 4) - padding;

  if (approxBytes > MAX_IMAGE_BYTES) {
    const mb = (approxBytes / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `Imagem muito grande (${mb} MB). Limite: 5 MB.`,
    };
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
    // Conta gerações do usuário desde o início do dia corrente (UTC)
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

    const { nome, idade, area, objetivo, planilhaData, observacoes, imageDataUrl } = body;

    // Imagem é opcional — campos textuais continuam obrigatórios como antes
    if (!nome?.trim() || !area?.trim() || !objetivo?.trim() || !planilhaData?.trim()) {
      return NextResponse.json(
        {
          message:
            'Campos obrigatórios em falta: Nome/Identificação, Área do Relatório, Objetivo e Dados da Planilha.',
        },
        { status: 400 }
      );
    }

    // Higienização de tamanho
    const nomeClean = nome.trim().slice(0, 200);
    const idadeClean = (idade ?? '').trim().slice(0, 50);
    const areaClean = area.trim().slice(0, 200);
    const objetivoClean = objetivo.trim().slice(0, MAX_OBJETIVO_CHARS);
    const planilhaDataClean = planilhaData.trim().slice(0, MAX_PLANILHA_CHARS);
    const observacoesClean = (observacoes ?? '').trim().slice(0, MAX_OBSERVACOES_CHARS);

    // Validação da imagem (opcional)
    let validatedImage: ValidatedImage | null = null;
    if (imageDataUrl) {
      const v = validateImage(String(imageDataUrl));
      if (!v.ok) {
        return NextResponse.json({ message: v.error }, { status: 400 });
      }
      validatedImage = v.image;
    }

    // ── 5. Construir prompt seguro ────────────────────────────────────────────
    const baseSystem = `Você é um assistente profissional de apoio operacional para psicólogos e psicopedagogos. Sua única função é gerar rascunhos estruturados de texto de apoio a partir dos dados brutos fornecidos pelo profissional.

REGRAS OBRIGATÓRIAS — VIOLAÇÃO NÃO É PERMITIDA:
1. NUNCA faça diagnósticos, hipóteses diagnósticas ou sugestões de diagnóstico.
2. NUNCA invente pontos de corte, normas, percentis ou classificações que não tenham sido fornecidos explicitamente nos dados.
3. NUNCA substitua o manual técnico original do instrumento. Sempre indique ao leitor que o manual original deve ser consultado.
4. NUNCA gere um laudo clínico ou psicológico formal. O texto é um rascunho inicial de apoio.
5. USE APENAS os dados fornecidos pelo profissional. Não extrapole nem assuma informações adicionais.
6. Escreva em português brasileiro formal, claro e profissional.
7. Estruture o texto em seções coerentes: contextualização, descrição dos dados, considerações operacionais e observações finais.
8. Encerre SEMPRE com o parágrafo exato: "${AVISO_FINAL}"`;

    const visionBlock = `

ANÁLISE DE IMAGEM (print de planilha/gráfico/resultado visual):
Quando o usuário enviar um print de planilha, gráfico ou resultado visual, analise apenas o que estiver visível na imagem.
Extraia:
- nome da planilha/instrumento;
- área avaliada;
- resultados numéricos visíveis;
- classificações visíveis;
- padrões do gráfico;
- observações relevantes;
- campos vazios ou inconsistentes.

Não invente dados ausentes. Não calcule escores. Não estime valores ilegíveis. Não interprete além do que a imagem permite.

Se a imagem estiver parcialmente legível, gere uma versão parcial e marque cada item ilegível como: [dado não legível no print].

Se a imagem estiver totalmente ilegível, inutilizável ou não contiver dados de planilha/instrumento, responda EXATAMENTE com este texto e nada mais:
"${IMAGE_UNREADABLE_MSG}"

Depois transforme os dados visíveis em rascunho profissional, com linguagem cautelosa e fechamento ético, combinando os dados visíveis com o texto fornecido pelo profissional (quando houver).`;

    const systemPrompt = validatedImage ? baseSystem + visionBlock : baseSystem;

    const userText = `Profissional: ${nomeClean}
${idadeClean ? `Idade/Faixa etária: ${idadeClean}` : ''}
Área do relatório: ${areaClean}
Objetivo do relatório: ${objetivoClean}

Dados da planilha:
${planilhaDataClean}
${observacoesClean ? `\nObservações adicionais:\n${observacoesClean}` : ''}
${validatedImage ? '\nO profissional anexou um print da planilha/gráfico. Analise a imagem em anexo seguindo as regras de ANÁLISE DE IMAGEM.' : ''}

Gere o rascunho de apoio conforme as instruções do sistema.`;

    // Mensagem do usuário: string puro quando não há imagem; array multimodal quando há.
    const userContent: string | OpenAIContentPart[] = validatedImage
      ? [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: validatedImage.dataUrl, detail: 'high' } },
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

      // Modelo configurado não suporta visão e o usuário enviou imagem
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
    if (validatedImage && generatedText.trim() === IMAGE_UNREADABLE_MSG) {
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
    // Marca no input_text quando houve imagem (sem armazenar a imagem em si)
    const savedInput = validatedImage
      ? `${planilhaDataClean}\n\n[Print da planilha/gráfico anexado pelo profissional]`
      : planilhaDataClean;

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
      // Retornar texto mesmo sem salvar (degradação graceful)
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
