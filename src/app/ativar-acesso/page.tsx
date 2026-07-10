'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MIGRATION_MODE, ACTIVATION_COOLDOWN_MS } from '@/lib/migration';

const COOLDOWN_STORAGE_KEY = 'psico2-activation-cooldown-until';

type DirectResult = {
  email: string;
  temporaryPassword: string;
  loginUrl: string;
};

function getInitialCooldownUntil() {
  if (typeof window === 'undefined') return 0;
  const stored = window.localStorage.getItem(COOLDOWN_STORAGE_KEY);
  const parsed = stored ? Number(stored) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AtivarAcessoPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [directResult, setDirectResult] = useState<DirectResult | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(getInitialCooldownUntil);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const cooldownActive = Date.now() < cooldownUntil;

  const startCooldown = () => {
    const nextCooldown = Date.now() + ACTIVATION_COOLDOWN_MS;
    setCooldownUntil(nextCooldown);
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(nextCooldown));
  };

  // Caminho por e-mail (link nativo do Supabase). Trava com cooldown client-side.
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownActive) {
      setErrorMsg(null);
      setInfoMsg('Aguarde antes de pedir outro link. Se já solicitou, verifique também spam e promoções.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    startCooldown();

    try {
      const response = await fetch('/api/auth/ativar-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data?.message || 'Não foi possível enviar o link. Tente novamente.');
        return;
      }

      if (data?.throttled) {
        setInfoMsg(data.message || 'O link já foi solicitado. Aguarde alguns minutos antes de tentar novamente.');
        return;
      }

      setSent(true);
    } catch (err) {
      setErrorMsg('Não foi possível enviar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Caminho SEM e-mail (só na migração): senha temporária na hora, sem /recover.
  const handleDirect = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await fetch('/api/auth/ativar-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, direct: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data?.message || 'Não foi possível criar sua senha. Tente novamente.');
        return;
      }

      if (data?.throttled) {
        setInfoMsg(data.message || 'Você acabou de gerar uma senha. Aguarde um instante antes de gerar outra.');
        return;
      }

      setDirectResult(data);
    } catch (err) {
      setErrorMsg('Não foi possível criar sua senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (directResult) {
      await navigator.clipboard.writeText(directResult.temporaryPassword);
    }
  };

  // Na onda de migração, criar a senha na hora é a ação principal; o e-mail
  // vira alternativa. Fora da migração, tudo volta ao fluxo por e-mail.
  const handlePrimary = MIGRATION_MODE ? handleDirect : handleEmail;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-pp-canvas text-pp-ink">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-pp-hairline">

        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-pp-ink">
            Ativar meu acesso
          </h1>
          <p className="text-pp-ink-soft text-base">
            {MIGRATION_MODE
              ? 'Digite o e-mail usado na compra para criar sua senha agora mesmo.'
              : 'Digite o e-mail usado na compra para receber o link de criação de senha.'}
          </p>
        </div>

        {directResult ? (
          /* Success — senha criada na hora (caminho sem e-mail) */
          <div className="space-y-5">
            <div className="p-6 text-center space-y-4 bg-pp-success/10 border border-pp-success/20 rounded-xl">
              <p className="text-base font-semibold text-pp-ink">Sua senha temporária está pronta</p>
              <p className="text-3xl font-extrabold tracking-wide text-pp-ink select-all break-all">
                {directResult.temporaryPassword}
              </p>
              <button
                type="button"
                onClick={copyPassword}
                className="inline-block px-4 py-2 text-sm font-bold text-pp-ink bg-white border border-pp-hairline hover:border-pp-ink rounded-pill transition duration-200"
              >
                Copiar senha
              </button>
              <p className="text-pp-ink-soft text-sm leading-relaxed">
                Anote esta senha agora. Entre com o seu e-mail e esta senha. Depois de entrar, você pode trocá-la.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-block w-full py-4 text-center text-base font-bold bg-pp-ink text-pp-canvas hover:bg-pp-ink-soft rounded-pill transition duration-200"
            >
              Ir para o login
            </Link>
          </div>
        ) : sent ? (
          /* Success — link enviado por e-mail */
          <div className="space-y-5">
            <div className="p-6 text-center space-y-4 bg-pp-success/10 border border-pp-success/20 rounded-xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-pp-success/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-pp-success" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-pp-ink">
                Enviamos um e-mail para você.
              </p>
              <p className="text-pp-ink-soft text-sm leading-relaxed">
                Abra a mensagem e clique no link para criar sua senha.
              </p>
              <p className="text-pp-ink-soft/70 text-xs">
                Se não encontrar, veja também a caixa de spam ou promoções.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-block w-full py-3.5 text-center text-base font-bold text-pp-ink bg-white border border-pp-hairline hover:border-pp-ink rounded-pill transition duration-200"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-4 text-base font-medium text-pp-danger bg-pp-danger/10 border border-pp-danger/20 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="p-4 text-base font-medium text-pp-ink bg-pp-ink/5 border border-pp-hairline rounded-xl text-center">
                {infoMsg}
              </div>
            )}

            <form onSubmit={handlePrimary} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-pp-ink">Seu e-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3.5 bg-white border border-pp-hairline rounded-xl text-base text-pp-ink placeholder-pp-ink-soft/50 focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink transition duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!MIGRATION_MODE && cooldownActive)}
                className="w-full py-4 text-base font-bold bg-pp-ink text-pp-canvas hover:bg-pp-ink-soft disabled:opacity-50 rounded-pill transition duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-pp-canvas/30 border-t-pp-canvas rounded-full animate-spin" />
                    {MIGRATION_MODE ? 'Criando...' : 'Enviando...'}
                  </>
                ) : MIGRATION_MODE ? (
                  'Criar minha senha agora'
                ) : cooldownActive ? (
                  'Aguarde alguns minutos'
                ) : (
                  'Receber link por e-mail'
                )}
              </button>
            </form>

            {/* Na migração, o e-mail continua disponível como alternativa. */}
            {MIGRATION_MODE && (
              <button
                type="button"
                onClick={handleEmail}
                disabled={loading || cooldownActive}
                className="w-full py-3 text-sm font-bold text-pp-ink bg-white border border-pp-hairline hover:border-pp-ink disabled:opacity-50 rounded-pill transition duration-200"
              >
                {cooldownActive ? 'Aguarde para reenviar por e-mail' : 'Prefiro receber o link por e-mail'}
              </button>
            )}

            <div className="text-center pt-1">
              <Link href="/login" className="text-sm text-pp-ink-soft underline hover:text-pp-ink transition underline-offset-4">
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-pp-ink-soft/70 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
