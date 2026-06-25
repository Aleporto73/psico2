import 'server-only';
/**
 * openai.ts — Helper server-side para integração com a API da OpenAI.
 * NUNCA exposto ao cliente. Usado apenas em Route Handlers (server-side).
 *
 * Regras de segurança:
 * - OPENAI_API_KEY é carregada exclusivamente via variável de ambiente server-side.
 * - Nunca usar NEXT_PUBLIC_ para essa chave.
 * - Temperatura baixa (0.3) para maior fidelidade e menos alucinações.
 *
 * Suporte multimodal:
 * - O campo `content` aceita string (texto puro) OU array de partes
 *   ({ type: 'text', text } | { type: 'image_url', image_url: { url, detail? } }).
 * - Quando o modelo configurado não suportar visão e o request contiver imagem,
 *   o erro é normalizado para o marcador VISION_NOT_SUPPORTED.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
}

export interface OpenAIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Marcador especial: a rota detecta esta string para retornar erro amigável.
export const VISION_NOT_SUPPORTED = 'VISION_NOT_SUPPORTED';

/**
 * Detecta modelos da família GPT-5 (gpt-5, gpt-5.4-nano, etc.) pelo prefixo do id.
 * A família GPT-5 aceita `image_url` normalmente, mas muda as regras de parâmetros
 * no Chat Completions (ver comentário em callOpenAI).
 */
function isGPT5Family(model: string): boolean {
  return model.startsWith('gpt-5');
}

/**
 * Chama a API da OpenAI com os messages fornecidos.
 * Lança erro em caso de falha de autenticação, erro de rede ou modelo incompatível.
 */
export async function callOpenAI(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  // Modelo precisa aceitar entrada de imagem/image_url. gpt-5.4-nano é vision-compatible.
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-nano';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não está configurada nas variáveis de ambiente do servidor.');
  }

  // GPT-5 family rejects legacy max_tokens and non-default temperature in Chat Completions.
  // Legacy models such as gpt-4o-mini keep max_tokens + temperature for rollback compatibility.
  const requestBody: Record<string, unknown> = { model, messages };
  if (isGPT5Family(model)) {
    requestBody.max_completion_tokens = 2000;
  } else {
    requestBody.temperature = 0.3;
    requestBody.max_tokens = 2000;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const lower = errorBody.toLowerCase();

    // Detecta cenários de modelo sem suporte a visão / image_url
    const hasImagePart = messages.some(
      (m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url')
    );
    const looksLikeVisionError =
      lower.includes('image_url') ||
      lower.includes('vision') ||
      lower.includes('does not support image') ||
      lower.includes('image input') ||
      lower.includes('multimodal') ||
      (lower.includes('invalid') && lower.includes('image'));

    if (hasImagePart && looksLikeVisionError) {
      throw new Error(VISION_NOT_SUPPORTED);
    }

    throw new Error(`Erro da API OpenAI (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    model,
    usage: data.usage,
  };
}
