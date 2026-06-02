import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' },
        { status: 200 }
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
      console.error('Error fetching profile during forgot password check:', error);
      return NextResponse.json(
        { message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' },
        { status: 200 }
      );
    }

    // 2. If profile exists and is active, trigger native Supabase resetPasswordForEmail
    if (profile && profile.status === 'active') {
      const origin = new URL(request.url).origin;
      const redirectTo = `${origin}/definir-senha`;

      // Trigger native password reset email
      const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      );

      if (resetError) {
        console.error('Error triggering native reset password:', resetError);
      }
    }

    // Always return neutral success message
    return NextResponse.json(
      { message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Fatal error in esqueci-senha API:', err);
    return NextResponse.json(
      { message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' },
      { status: 200 }
    );
  }
}
