import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendActivationLink } from '@/utils/auth/activation';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Informe o e-mail usado na compra.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminSupabase = createAdminClient();

    // 1. Check if email exists in public.profiles and is active
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('email, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile during activation check:', error);
      return NextResponse.json(
        { message: 'Não foi possível verificar o e-mail. Tente novamente.' },
        { status: 500 }
      );
    }

    // 2. If profile does NOT exist, return clear error
    if (!profile) {
      return NextResponse.json(
        { message: 'Não encontramos esse e-mail. Verifique se digitou o mesmo e-mail usado na compra.' },
        { status: 404 }
      );
    }

    // 3. If profile exists and is active, trigger the shared activation email flow
    if (profile.status === 'active') {
      const origin = new URL(request.url).origin;

      // Reusa o helper compartilhado; aqui logamos e seguimos (mantém o 200 da rota).
      try {
        await sendActivationLink(adminSupabase, normalizedEmail, origin);
      } catch (resetError) {
        console.error('Error triggering native reset password for activation:', resetError);
      }
    }

    // 4. Return success
    return NextResponse.json(
      { message: 'Link enviado com sucesso.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Fatal error in ativar-acesso API:', err);
    return NextResponse.json(
      { message: 'Não foi possível enviar o link. Tente novamente.' },
      { status: 500 }
    );
  }
}
