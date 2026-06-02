'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AtivarAcessoPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/ativar-acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setMessage(data.message || 'Se este e-mail estiver cadastrado, você receberá um link de ativação.');
    } catch (err) {
      setMessage('Se este e-mail estiver cadastrado, você receberá um link de ativação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800/80">
        
        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">
            Ativar meu Acesso
          </h1>
          <p className="text-slate-400 text-sm">
            Já era cliente do PsicoPlanilhas e quer ativar na nova plataforma?
          </p>
        </div>

        {/* Info Message */}
        {message ? (
          <div className="p-4 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center space-y-3">
            <p>{message}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition duration-200"
            >
              Voltar ao Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">E-mail de Compra</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@provedor.com"
                className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
              <p className="text-[11px] text-slate-500 pt-1 leading-normal">
                Digite exatamente o e-mail que você utilizou ao efetuar a compra anteriormente para liberarmos seu acesso vitalício.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition duration-200 shadow-md shadow-amber-500/10"
            >
              {loading ? 'Processando...' : 'Enviar Link de Ativação'}
            </button>
          </form>
        )}

        {!message && (
          <div className="text-center pt-2">
            <Link href="/login" className="text-sm text-amber-400 hover:text-amber-300 transition underline underline-offset-4">
              Voltar para o Login
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-600 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
