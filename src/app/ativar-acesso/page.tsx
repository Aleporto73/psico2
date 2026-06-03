'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AtivarAcessoPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/auth/ativar-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // API returned an error (e.g. email not found)
        setErrorMsg(data.message || 'Não foi possível enviar o link. Tente novamente.');
        return;
      }

      // Success
      setSent(true);
    } catch (err) {
      setErrorMsg('Não foi possível enviar o link. Tente novamente.');
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
            Ativar meu acesso
          </h1>
          <p className="text-[#CBD5E1] text-base">
            Digite o e-mail usado na compra para receber o link de criação de senha.
          </p>
        </div>

        {/* Success state */}
        {sent ? (
          <div className="space-y-5">
            <div className="p-6 text-center space-y-4 bg-[#38DDF8]/10 border border-[#38DDF8]/20 rounded-xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#38DDF8]/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#38DDF8]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[#F8FAFC]">
                Enviamos um e-mail para você.
              </p>
              <p className="text-[#CBD5E1] text-sm leading-relaxed">
                Abra a mensagem e clique no link para criar sua senha.
              </p>
              <p className="text-[#94A3B8] text-xs">
                Se não encontrar, veja também a caixa de spam ou promoções.
              </p>
            </div>

            <Link
              href="/login"
              className="block w-full py-4 text-center text-base font-bold bg-[#0E2A38] text-[#F8FAFC] border border-[#1F4D5C] hover:border-[#38DDF8] rounded-xl transition duration-200"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            {/* Error */}
            {errorMsg && (
              <div className="p-4 text-base font-medium text-[#FF3B6B] bg-[#FF3B6B]/10 border border-[#FF3B6B]/20 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#CBD5E1]">Seu e-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
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
                    Enviando...
                  </>
                ) : (
                  'Receber link por e-mail'
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <Link href="/login" className="text-sm text-[#38DDF8] hover:text-[#22D3EE] transition underline underline-offset-4">
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-[#94A3B8]/60 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
