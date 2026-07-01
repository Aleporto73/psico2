import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';

// Endpoint público chamado pelo app Flow (outro domínio) → CORS restrito.
const ALLOWED_ORIGIN = 'https://flow.psicoplanilha.com';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin',
};

// Preflight.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Consome o token one-time. Sempre 200; nunca revela o motivo da falha.
export async function POST(request: Request) {
  try {
    const { token } = await request.json().catch(() => ({}));

    // Aceita SÓ o token, no formato exato gerado (randomBytes(32) → 64 hex).
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ valid: false }, { status: 200, headers: CORS });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const admin = createAdminClient();

    // UPDATE atômico: marca used_at só se ainda não usado e não expirado.
    // Postgres re-checa o WHERE sob lock → garante one-time use em concorrência.
    const { data, error } = await admin
      .from('activation_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('purpose', 'flow_activation')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('email')
      .maybeSingle();

    if (error) {
      // Loga o erro do banco (não contém o token); cliente recebe genérico.
      console.error('Erro ao validar token do Flow:', error);
      return NextResponse.json({ valid: false }, { status: 200, headers: CORS });
    }
    if (!data) {
      return NextResponse.json({ valid: false }, { status: 200, headers: CORS });
    }

    return NextResponse.json({ valid: true, email: data.email }, { status: 200, headers: CORS });
  } catch {
    return NextResponse.json({ valid: false }, { status: 200, headers: CORS });
  }
}
