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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Marcador especial: a rota detecta esta string para retornar erro amigável.
export const VISION_NOT_SUPPORTED = 'VISION_NOT_SUPPORTED';

/**
 * Chama a API da OpenAI com os messages fornecidos.
 * Lança erro em caso de falha de autenticação, erro de rede ou modelo incompatível.
 */
export async function callOpenAI(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não está configurada nas variáveis de ambiente do servidor.');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
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
    usage: data.usage,
  };
}
