import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Gera um token one-time de ativação do PsicoPlanilhas Flow.
// Same-origin (chamado pelo próprio app) — sem CORS aqui de propósito.
export async function POST() {
  try {
    // 1. Exige sessão Supabase válida.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
    }

    // 2. Confirma acesso pela RPC (roda como o próprio usuário). Falha = sem acesso.
    const { data: hasAccess, error: accessErr } = await supabase.rpc('has_flow_access', {
      user_uuid: user.id,
    });
    if (accessErr || !hasAccess) {
      return NextResponse.json({ message: 'Sem acesso ao Flow.' }, { status: 403 });
    }

    // 3. Admin client SÓ para products/activation_tokens.
    const admin = createAdminClient();

    const { data: product, error: prodErr } = await admin
      .from('products')
      .select('access_url')
      .eq('slug', 'psicoplanilhas-flow')
      .eq('is_active', true)
      .maybeSingle();

    if (prodErr || !product?.access_url) {
      return NextResponse.json({ message: 'Produto Flow indisponível.' }, { status: 500 });
    }

    // Base vem do access_url cadastrado (nunca hardcode do domínio aqui).
    // ponytail: usa só o origin; Flow vive na raiz. Suportar path = trocar por base sem origin.
    let base: string;
    try {
      base = new URL(product.access_url).origin;
    } catch {
      return NextResponse.json({ message: 'URL do Flow inválida.' }, { status: 500 });
    }

    // 4. Token one-time: grava apenas o hash sha256, nunca o token.
    const token = randomBytes(32).toString('hex'); // 64 chars hex
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await admin.from('activation_tokens').insert({
      user_id: user.id,
      email: user.email,
      token_hash: tokenHash,
      purpose: 'flow_activation',
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error('Erro ao gravar token de ativação do Flow:', insertErr);
      return NextResponse.json({ message: 'Não foi possível gerar o acesso agora.' }, { status: 500 });
    }

    return NextResponse.json({ activationUrl: `${base}/#activate=${token}` });
  } catch (err) {
    console.error('Erro fatal em generate-token (Flow):', err);
    return NextResponse.json({ message: 'Erro interno.' }, { status: 500 });
  }
}
