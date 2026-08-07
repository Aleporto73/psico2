'use client';

import { createClient } from '@/utils/supabase/client';
import { CorrigeFacilError, traduzirStatus } from './api';

export type RegraPrematuridade = 'ate_24_meses' | 'sempre' | 'nao_corrigir';

export type PedidoNormaData = {
  instrument_code: string;
  birth_date: string;
  evaluation_date: string;
  prematurity_weeks?: number;
  prematurity_rule?: RegraPrematuridade;
};

export type RespostaNormaData = {
  norm_selector: Record<string, string>;
  age: {
    years: number;
    months: number;
    days: number;
    corrected: boolean;
  };
};

const CAMINHO = '/functions/v1/resolver-norma-data';

function removerBarrasFinais(url: string): string {
  let fim = url.length;
  while (fim > 0 && url.charCodeAt(fim - 1) === 47) fim -= 1;
  return url.slice(0, fim);
}

function origemSupabase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new CorrigeFacilError('indisponivel', 'Configuração do Supabase ausente.');
  }
  return removerBarrasFinais(url);
}

function mensagemErro(corpo: unknown): string | undefined {
  if (!corpo || typeof corpo !== 'object' || !('error' in corpo)) return undefined;
  const erro = (corpo as { error?: unknown }).error;
  return typeof erro === 'string' ? erro : undefined;
}

export async function resolverNormaData(
  pedido: PedidoNormaData,
  opcoes: { signal?: AbortSignal } = {},
): Promise<RespostaNormaData> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    throw new CorrigeFacilError(
      'sem_sessao',
      'Você precisa estar autenticado para usar o CorrigeFácil.',
    );
  }

  const resposta = await fetch(`${origemSupabase()}${CAMINHO}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(pedido),
    signal: opcoes.signal,
  });

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
      resposta.status,
    );
  }

  if (!resposta.ok) {
    throw traduzirStatus(resposta.status, mensagemErro(corpo));
  }

  if (
    !corpo ||
    typeof corpo !== 'object' ||
    !('norm_selector' in corpo) ||
    !('age' in corpo)
  ) {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
      resposta.status,
    );
  }

  return corpo as RespostaNormaData;
}
