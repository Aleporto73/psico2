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
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { callOpenAI } from '@/lib/openai';

// Limites de segurança
const DAILY_LIMIT = 20;
const MAX_PLANILHA_CHARS = 4000;
const MAX_OBSERVACOES_CHARS = 2000;
const MAX_OBJETIVO_CHARS = 500;

// Aviso obrigatório final (hardcoded no backend — não pode ser removido pelo frontend)
const AVISO_FINAL =
  'Este texto é uma versão inicial de apoio e deve ser revisado pelo profissional responsável antes de qualquer uso formal.';

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
    let body: Record<string, string>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: 'Payload inválido. Envie um JSON válido.' },
        { status: 400 }
      );
    }

    const { nome, idade, area, objetivo, planilhaData, observacoes } = body;

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

    // ── 5. Construir prompt seguro ────────────────────────────────────────────
    const systemPrompt = `Você é um assistente profissional de apoio operacional para psicólogos e psicopedagogos. Sua única função é gerar rascunhos estruturados de texto de apoio a partir dos dados brutos fornecidos pelo profissional.

REGRAS OBRIGATÓRIAS — VIOLAÇÃO NÃO É PERMITIDA:
1. NUNCA faça diagnósticos, hipóteses diagnósticas ou sugestões de diagnóstico.
2. NUNCA invente pontos de corte, normas, percentis ou classificações que não tenham sido fornecidos explicitamente nos dados.
3. NUNCA substitua o manual técnico original do instrumento. Sempre indique ao leitor que o manual original deve ser consultado.
4. NUNCA gere um laudo clínico ou psicológico formal. O texto é um rascunho inicial de apoio.
5. USE APENAS os dados fornecidos pelo profissional. Não extrapole nem assuma informações adicionais.
6. Escreva em português brasileiro formal, claro e profissional.
7. Estruture o texto em seções coerentes: contextualização, descrição dos dados, considerações operacionais e observações finais.
8. Encerre SEMPRE com o parágrafo exato: "${AVISO_FINAL}"`;

    const userMessage = `Profissional: ${nomeClean}
${idadeClean ? `Idade/Faixa etária: ${idadeClean}` : ''}
Área do relatório: ${areaClean}
Objetivo do relatório: ${objetivoClean}

Dados da planilha:
${planilhaDataClean}
${observacoesClean ? `\nObservações adicionais:\n${observacoesClean}` : ''}

Gere o rascunho de apoio conforme as instruções do sistema.`;

    // ── 6. Chamar a API da OpenAI ─────────────────────────────────────────────
    let generatedText: string;
    try {
      const result = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);
      generatedText = result.content;
    } catch (openaiErr: any) {
      console.error('OpenAI error:', openaiErr);
      return NextResponse.json(
        {
          message:
            'Erro ao conectar com o serviço de IA. Tente novamente em instantes.',
        },
        { status: 502 }
      );
    }

    // Garantia extra: se o aviso final não estiver presente, anexar
    if (!generatedText.includes(AVISO_FINAL)) {
      generatedText = `${generatedText}\n\n${AVISO_FINAL}`;
    }

    // ── 7. Salvar relatório em ai_reports ─────────────────────────────────────
    const reportTitle = `${areaClean} — ${nomeClean}`;
    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .insert({
        user_id: user.id,
        title: reportTitle,
        report_type: areaClean,
        input_text: planilhaDataClean,
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
