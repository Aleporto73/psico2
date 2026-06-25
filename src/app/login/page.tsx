'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#061923] text-[#F8FAFC]">

      {/* Splash de migração v1 → v2 — rede de segurança não dismissível para
          clientes legacy (psicoplanilhas.store). Some sozinha ao logar, pois o
          login redireciona para fora de /login. */}
      <div
        role="alert"
        className="w-full max-w-md mb-6 flex gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 text-left shadow-lg"
      >
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-900">
            O site da PsicoPlanilhas mudou.
          </p>
          <p className="text-sm text-amber-800">
            Você é cliente da PsicoPlanilhas antiga (psicoplanilhas.store)? Agora
            você precisa criar uma senha nova. Enviamos o link no seu e-mail —
            confira sua caixa de entrada e também o spam. Se não achar, clique em
            “Esqueci minha senha” aqui embaixo.
          </p>
        </div>
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-[#0B2430] backdrop-blur-md rounded-2xl shadow-2xl border border-[#1F4D5C]">
        
        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
            Entrar na plataforma
          </h1>
          <p className="text-[#CBD5E1] text-base">
            Acesse suas planilhas e materiais.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-4 text-base font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-4 text-base font-medium text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl text-center">
            {infoMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#CBD5E1]">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="w-full px-4 py-3.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-[#CBD5E1]">Senha</label>
              <Link href="/esqueci-senha" className="text-sm text-[#7DD3FC] hover:text-[#67E8F9] transition">
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-base font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-[#061923]/30 border-t-[#061923] rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Activation Block */}
        <div className="border-t border-[#1F4D5C] pt-5 text-center space-y-3">
          <p className="text-base text-[#CBD5E1]">
            Ainda não criou sua senha?
          </p>
          <Link
            href="/ativar-acesso"
            className="inline-block w-full py-3.5 text-base font-bold text-[#7DD3FC] bg-[#0E2A38] border border-[#1F4D5C] hover:border-[#7DD3FC] rounded-xl transition duration-200 text-center"
          >
            Ativar meu acesso
          </Link>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-[#94A3B8]/60 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#061923] text-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p className="text-[#CBD5E1]">Carregando...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
