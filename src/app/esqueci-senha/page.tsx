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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#061923] text-[#F8FAFC]">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#0B2430] backdrop-blur-md rounded-2xl shadow-2xl border border-[#1F4D5C]">

        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
            Recuperar senha
          </h1>
          <p className="text-[#CBD5E1] text-base">
            Digite o e-mail cadastrado para receber o link de recuperação.
          </p>
        </div>

        {/* Feedback Message */}
        {message ? (
          <div className="p-6 text-center space-y-4 bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#34D399]/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#34D399]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-base text-[#F8FAFC] leading-relaxed">{message}</p>
            <Link
              href="/login"
              className="inline-block w-full py-3.5 text-base font-bold text-[#7DD3FC] bg-[#0E2A38] border border-[#1F4D5C] hover:border-[#7DD3FC] rounded-xl transition duration-200 text-center"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#CBD5E1]">E-mail cadastrado</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
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
            <Link href="/login" className="text-sm text-[#7DD3FC] hover:text-[#67E8F9] transition underline underline-offset-4">
              Voltar ao login
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-[#94A3B8]/60 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
