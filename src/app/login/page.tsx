'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'blocked') {
      setErrorMsg('Acesso bloqueado. Entre em contato com o suporte.');
    } else if (errorParam === 'no_profile') {
      setErrorMsg('Perfil de usuário não encontrado. Entre em contato com o suporte.');
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
        throw new Error('Não foi possível entrar com esses dados. Verifique seu e-mail e senha ou use a opção de recuperação.');
      }

      const user = data.user;
      if (!user) {
        throw new Error('Usuário inválido.');
      }

      // 2. Fetch profile status and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil de usuário não encontrado.');
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
      setErrorMsg(err.message || 'Erro ao realizar login.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800/80">
        
        {/* Title / Logo */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">
            PsicoPlanilhas 2.0
          </h1>
          <p className="text-slate-400 text-sm">
            Área de membros para planilhas profissionais e apoio operacional.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-3 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            {infoMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-email@provedor.com"
              className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50 transition duration-200"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Senha</label>
              <Link href="/esqueci-senha" className="text-xs text-amber-400 hover:text-amber-300 transition">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50 transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition duration-200 shadow-md shadow-amber-500/10"
          >
            {loading ? 'Entrando...' : 'Entrar na Plataforma'}
          </button>
        </form>

        <div className="border-t border-slate-800/80 pt-4 text-center">
          <p className="text-sm text-slate-400">
            Cliente antigo e ainda não ativou?
          </p>
          <Link
            href="/ativar-acesso"
            className="inline-block mt-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition underline underline-offset-4"
          >
            Ativar meu acesso vitalício
          </Link>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-slate-600 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Carregando...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
