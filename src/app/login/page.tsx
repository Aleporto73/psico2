'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  // Inicia oculto: só revela após confirmar no localStorage que não foi fechado
  // (evita flash do toast para quem já dispensou e mismatch de SSR).
  const [splashDismissed, setSplashDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('migration-splash-dismissed') !== '1') {
      setSplashDismissed(false);
    }
  }, []);

  const handleDismissSplash = () => {
    localStorage.setItem('migration-splash-dismissed', '1');
    setSplashDismissed(true);
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'blocked') {
      setErrorMsg('Acesso bloqueado. Entre em contato com o suporte.');
    } else if (errorParam === 'no_profile') {
      setErrorMsg('Perfil não encontrado. Entre em contato com o suporte.');
    }

    const successParam = searchParams.get('success');
    if (successParam === 'password_reset') {
      setInfoMsg('Senha alterada com sucesso! Entre com sua nova senha.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        throw new Error('E-mail ou senha incorretos. Verifique os dados ou use "Esqueci minha senha".');
      }

      const user = data.user;
      if (!user) {
        throw new Error('E-mail ou senha incorretos. Verifique os dados ou use "Esqueci minha senha".');
      }

      // 2. Fetch profile status and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil não encontrado. Entre em contato com o suporte.');
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Acesso bloqueado. Entre em contato com o suporte.');
      }

      // 3. Update last_login_at timestamp in background (silent write)
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

      // 4. Redirect based on role
      router.refresh();
      if (profile.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/app');
      }
    } catch (err: any) {
      const message = String(err?.message || '');
      setErrorMsg(
        message === 'Acesso bloqueado. Entre em contato com o suporte.'
          ? 'Acesso bloqueado. Entre em contato com o suporte.'
          : 'E-mail ou senha incorretos. Verifique os dados ou use "Esqueci minha senha".'
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-pp-canvas text-pp-ink">

      {/* Toast de boas-vindas para clientes legacy (migração v1 → v2). Mobile:
          faixa fina no topo; desktop: toast no canto superior direito. Dispensável
          (X → localStorage), some sozinho ao logar (sai da rota /login). */}
      {!splashDismissed && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 z-50 flex items-start gap-2 bg-orange-500 p-3 text-white shadow-lg sm:left-auto sm:top-4 sm:right-4 sm:max-w-[340px] sm:rounded-lg"
        >
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-bold">Cliente antigo do PsicoPlanilhas?</p>
            <p className="text-sm">
              A plataforma mudou. Clique em “Ativar cadastro antigo” para criar sua nova senha.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissSplash}
            aria-label="Fechar aviso"
            className="flex-shrink-0 rounded p-0.5 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-pp-hairline">

        {/* Marca tipográfica — igual /app/layout */}
        <div className="text-center">
          <p className="font-serif italic text-[22px] leading-tight text-pp-ink">PsicoPlanilhas 2.0</p>
          <p className="font-serif italic text-xs text-pp-ink-soft mt-0.5">Área do cliente</p>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-pp-ink">
            Entrar na plataforma
          </h1>
          <p className="text-pp-ink-soft text-base">
            Já ativou seu cadastro ou já tem senha? Entre abaixo
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-4 text-base font-medium text-pp-danger bg-pp-danger/10 border border-pp-danger/20 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-4 text-base font-medium text-pp-success bg-pp-success/10 border border-pp-success/20 rounded-xl text-center">
            {infoMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-pp-ink">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="w-full px-4 py-3.5 bg-white border border-pp-hairline rounded-xl text-base text-pp-ink placeholder-pp-ink-soft/50 focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink transition duration-200"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-pp-ink">Senha</label>
              <Link href="/esqueci-senha" className="text-sm text-pp-ink-soft underline hover:text-pp-ink transition">
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-white border border-pp-hairline rounded-xl text-base text-pp-ink placeholder-pp-ink-soft/50 focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-base font-bold bg-pp-ink text-pp-canvas hover:bg-pp-ink-soft disabled:opacity-50 rounded-pill transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-pp-canvas/30 border-t-pp-canvas rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Activation Block */}
        <div className="border-t border-pp-hairline pt-5 text-center space-y-3">
          <p className="text-base font-bold text-pp-ink">
            Já era cliente do PsicoPlanilhas?
          </p>
          <p className="text-base text-pp-ink-soft">
            A plataforma mudou. Para acessar o PsicoPlanilhas 2.0 pela primeira vez, você precisa ativar seu cadastro antigo e criar uma nova senha.
          </p>
          <Link
            href="/ativar-acesso"
            className="inline-block w-full py-3.5 text-base font-bold text-white bg-orange-500 border border-orange-500 hover:bg-orange-600 hover:border-orange-600 rounded-pill transition duration-200 text-center"
          >
            Ativar cadastro antigo
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-pp-ink-soft/70 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-pp-canvas text-pp-ink">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p className="text-pp-ink-soft">Carregando...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
