'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type SupportResult = {
  message: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
};

export default function AdminSuportePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SupportResult | null>(null);

  const supportMessage = result
    ? `Acesso liberado.\n\nLink: ${result.loginUrl}\nE-mail: ${result.email}\nSenha temporária: ${result.temporaryPassword}\n\nDepois de entrar, você já poderá usar a plataforma normalmente.`
    : '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/suporte/senha-temporaria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data?.message || 'Não foi possível definir a senha temporária.');
        return;
      }

      setResult(data);
    } catch (err) {
      setErrorMsg('Não foi possível definir a senha temporária. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async () => {
    if (!supportMessage) return;
    await navigator.clipboard.writeText(supportMessage);
  };

  return (
    <div className="min-h-screen bg-[#061923] text-[#F8FAFC] p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2 pb-6 border-b border-[#1F4D5C]">
          <Link href="/admin" className="text-sm text-[#7DD3FC] hover:text-[#67E8F9] underline underline-offset-4">
            Voltar ao admin
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Suporte de acesso</h1>
          <p className="text-[#CBD5E1] text-sm leading-relaxed">
            Use quando o envio automático de e-mail estiver limitado. O sistema gera uma senha temporária aleatória, ativa o perfil e registra log administrativo.
          </p>
        </header>

        <section className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#CBD5E1]">E-mail do cliente</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-4 py-3.5 bg-[#061923] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-base font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] rounded-xl transition flex items-center justify-center"
            >
              {loading ? 'Gerando senha...' : 'Gerar senha temporária'}
            </button>
          </form>

          {errorMsg && (
            <div className="p-4 text-sm font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          {result && (
            <div className="space-y-4 p-5 bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">
              <div>
                <p className="text-sm text-[#CBD5E1]">Senha temporária gerada</p>
                <p className="text-2xl font-bold tracking-wide text-[#34D399]">{result.temporaryPassword}</p>
              </div>

              <textarea
                readOnly
                value={supportMessage}
                className="w-full min-h-36 p-4 bg-[#061923] border border-[#1F4D5C] rounded-xl text-sm text-[#F8FAFC] leading-relaxed"
              />

              <button
                type="button"
                onClick={copyMessage}
                className="w-full py-3 text-sm font-bold bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] text-[#F8FAFC] rounded-xl transition"
              >
                Copiar mensagem para cliente
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
