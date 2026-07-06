import { randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateTemporaryPassword(length = 10) {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');
}

export async function POST(request: Request) {
  try {
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Informe um e-mail válido.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: profile, error: profileErr } = await adminSupabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('email', email)
      .maybeSingle();

    if (profileErr) {
      throw new Error(`Erro ao buscar cliente: ${profileErr.message}`);
    }

    if (!profile) {
      return NextResponse.json({ message: 'Cliente não encontrado em profiles.' }, { status: 404 });
    }

    if (profile.id === adminUser?.id || profile.role === 'admin') {
      return NextResponse.json(
        { message: 'Ação bloqueada: senha temporária não pode ser aplicada em contas admin.' },
        { status: 403 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();

    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(profile.id, {
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authErr) {
      throw new Error(`Erro ao atualizar senha no Auth: ${authErr.message}`);
    }

    const { error: profileUpdateErr } = await adminSupabase
      .from('profiles')
      .update({
        status: 'active',
        activation_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (profileUpdateErr) {
      throw new Error(`Senha alterada, mas houve erro ao ativar profile: ${profileUpdateErr.message}`);
    }

    await adminSupabase.from('admin_logs').insert({
      admin_id: adminUser?.id,
      action: 'definir senha temporária por suporte',
      target_table: 'profiles',
      target_id: profile.id,
      metadata: {
        email,
        password_strategy: 'random_temporary',
      },
    });

    return NextResponse.json({
      message: 'Senha temporária definida. Cliente já pode entrar pelo login.',
      email,
      temporaryPassword,
      loginUrl: 'https://app.psicoplanilha.com/login',
    });
  } catch (err: any) {
    console.error('Fatal error setting temporary password:', err);
    return NextResponse.json(
      { message: err?.message || 'Não foi possível definir a senha temporária.' },
      { status: 500 }
    );
  }
}
