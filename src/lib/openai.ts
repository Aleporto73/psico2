/**
 * openai.ts — Helper server-side para integração com a API da OpenAI.
 * NUNCA exposto ao cliente. Usado apenas em Route Handlers (server-side).
 *
 * Regras de segurança:
 * - OPENAI_API_KEY é carregada exclusivamente via variável de ambiente server-side.
 * - Nunca usar NEXT_PUBLIC_ para essa chave.
 * - Temperatura baixa (0.3) para maior fidelidade e menos alucinações.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Chama a API da OpenAI com os messages fornecidos.
 * Lança erro em caso de falha de autenticação ou erro de rede.
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
    throw new Error(`Erro da API OpenAI (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  return {
    content,
    usage: data.usage,
  };
}
