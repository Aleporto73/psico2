'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      await response.json();
      setMessage('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
    } catch (err) {
      setMessage('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-pp-canvas text-pp-ink">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-pp-hairline">

        {/* Marca tipográfica — igual /login */}
        <div className="text-center">
          <p className="font-serif italic text-[22px] leading-tight text-pp-ink">PsicoPlanilhas 2.0</p>
          <p className="font-serif italic text-xs text-pp-ink-soft mt-0.5">Área do cliente</p>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-pp-ink">
            Recuperar senha
          </h1>
          <p className="text-pp-ink-soft text-base">
            Digite o e-mail cadastrado para receber o link de recuperação.
          </p>
        </div>

        {/* Feedback Message */}
        {message ? (
          <div className="space-y-5">
            <div className="p-6 text-center space-y-4 bg-pp-success/10 border border-pp-success/20 rounded-xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-pp-success/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-pp-success" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-base text-pp-ink leading-relaxed">{message}</p>
            </div>

            <Link
              href="/login"
              className="inline-block w-full py-3.5 text-center text-base font-bold text-pp-ink bg-white border border-pp-hairline hover:border-pp-ink rounded-pill transition duration-200"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-pp-ink">E-mail cadastrado</label>
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
              disabled={loading}
              className="w-full py-4 text-base font-bold bg-pp-ink text-pp-canvas hover:bg-pp-ink-soft disabled:opacity-50 rounded-pill transition duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-pp-canvas/30 border-t-pp-canvas rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link de recuperação'
              )}
            </button>
          </form>
        )}

        {!message && (
          <div className="text-center pt-1">
            <Link href="/login" className="text-sm text-pp-ink-soft underline hover:text-pp-ink transition underline-offset-4">
              Voltar ao login
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-pp-ink-soft/70 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
