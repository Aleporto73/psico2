'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function DefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initSession = useCallback(async () => {
    try {
      const hash = window.location.hash;

      // 1. Check for error params in hash (e.g. expired link from Supabase)
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const hashError = params.get('error');
        const errorDescription = params.get('error_description');

        if (hashError) {
          console.warn('Link error:', hashError, errorDescription);
          window.history.replaceState({}, document.title, window.location.pathname);
          setLinkExpired(true);
          setChecking(false);
          return;
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          // 2. Establish session from tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          // 3. Clean URL to hide tokens
          window.history.replaceState({}, document.title, window.location.pathname);

          if (sessionError) {
            console.warn('Session error:', sessionError.message);
            setLinkExpired(true);
            setChecking(false);
            return;
          }

          setSessionReady(true);
          setChecking(false);
          return;
        }
      }

      // 4. Fallback: check if there's already an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setLinkExpired(true);
      }
    } catch (err) {
      console.warn('Init error:', err);
      setLinkExpired(true);
    } finally {
      setChecking(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Use pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não estão iguais.');
      setLoading(false);
      return;
    }

    try {
      // 1. Update the password in Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError || !user) {
        // Translate any technical error to friendly message
        const msg = authError?.message?.toLowerCase() || '';
        if (msg.includes('session') || msg.includes('token') || msg.includes('expired') || msg.includes('otp')) {
          setLinkExpired(true);
          setLoading(false);
          return;
        }
        throw new Error('Não foi possível salvar sua senha. Tente novamente.');
      }

      // 2. Mark activation_status as active in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          activation_status: 'active',
          last_login_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('Silent warning: could not update profile activation_status:', profileError);
      }

      setSuccess(true);
      
      // 3. Redirect to customer application dashboard
      setTimeout(() => {
        router.push('/app');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível salvar sua senha. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#061923] text-[#F8FAFC]">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#0B2430] backdrop-blur-md rounded-2xl shadow-2xl border border-[#1F4D5C]">
        
        {/* Loading state */}
        {checking && (
          <div className="text-center py-8 space-y-4">
            <div className="w-8 h-8 border-3 border-[#1F4D5C] border-t-[#38DDF8] rounded-full animate-spin mx-auto" />
            <p className="text-[#CBD5E1] text-base">Verificando seu link...</p>
          </div>
        )}

        {/* Link expired / invalid state */}
        {!checking && linkExpired && (
          <div className="text-center py-4 space-y-6">
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#FF3B6B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#F8FAFC]">Link expirado</h1>
              <p className="text-[#CBD5E1] text-base leading-relaxed">
                Esse link venceu. Solicite um novo link de ativação.
              </p>
            </div>
            <Link
              href="/ativar-acesso"
              className="inline-block w-full py-4 text-center text-base font-bold bg-[#38DDF8] text-[#061923] hover:bg-[#22D3EE] rounded-xl transition duration-200 shadow-md shadow-[#38DDF8]/15"
            >
              Receber novo link
            </Link>
          </div>
        )}

        {/* Session ready: show form or success */}
        {!checking && sessionReady && (
          <>
            {/* Title */}
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
                Crie sua senha
              </h1>
              <p className="text-[#CBD5E1] text-base">
                Digite uma senha para acessar suas planilhas.
              </p>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="p-4 text-base font-medium text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            {success ? (
              <div className="p-6 text-center space-y-3 bg-[#38DDF8]/10 border border-[#38DDF8]/20 rounded-xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#38DDF8]/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#38DDF8]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-xl text-[#F8FAFC]">Senha criada!</p>
                <p className="text-[#CBD5E1] text-sm">Entrando na plataforma...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#CBD5E1]">Nova senha</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#38DDF8] focus:ring-1 focus:ring-[#38DDF8] transition duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#CBD5E1]">Repita a senha</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente"
                    className="w-full px-4 py-3.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#38DDF8] focus:ring-1 focus:ring-[#38DDF8] transition duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-base font-bold bg-[#38DDF8] text-[#061923] hover:bg-[#22D3EE] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] rounded-xl transition duration-200 shadow-md shadow-[#38DDF8]/15 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-[#061923]/30 border-t-[#061923] rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar senha e entrar'
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-[#94A3B8]/60 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
