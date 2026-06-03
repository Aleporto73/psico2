'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconLockLarge() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconChatLarge() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function AppAssistenteGptPage() {
  const supabase = createClient();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const gptBuilderUrl = 'https://chatgpt.com/g/g-6798ead70b948191a705512fe534fdb4-psicoplanilhas';

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasAccess(false);
        return;
      }

      const { data: status, error: statusErr } = await supabase
        .from('user_access_status')
        .select('has_lifetime_access')
        .eq('user_id', user.id)
        .single();

      if (statusErr || !status) {
        setHasAccess(false);
      } else {
        setHasAccess(status.has_lifetime_access);
      }
    } catch (err) {
      console.error('Error loading access status:', err);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGpt = () => {
    if (!hasAccess) return;
    window.open(gptBuilderUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[#CBD5E1]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p>Carregando informações do assistente...</p>
        </div>
      </div>
    );
  }

  // Lock Screen if user doesn't have lifetime access
  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] text-center max-w-2xl mx-auto space-y-6 my-12">
        <div className="w-20 h-20 rounded-full bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 flex items-center justify-center text-[#7DD3FC]">
          <IconLockLarge />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">Assistente GPT bloqueado</h2>
          <p className="text-[#CBD5E1] text-base leading-relaxed">
            O Assistente GPT Incluso é um bônus exclusivo do plano vitalício. Adquira o acesso vitalício para liberar esta ferramenta e toda a biblioteca de planilhas profissionais.
          </p>
        </div>
        <Link
          href="/app/produtos"
          className="px-8 py-3.5 text-base font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition shadow-md shadow-[#7DD3FC]/15"
        >
          Conhecer planos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 my-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Assistente GPT Incluso</h1>
        <p className="text-[#CBD5E1] text-base mt-1">
          Apoio textual para estruturação de relatórios a partir de dados da planilha.
        </p>
      </div>

      {/* Main card */}
      <div className="p-8 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 flex items-center justify-center text-[#7DD3FC]">
          <IconChatLarge />
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-bold text-[#F8FAFC]">Bônus incluso no pacote vitalício</h3>
          <p className="text-[#CBD5E1] text-base leading-relaxed">
            Como cliente PsicoPlanilhas Vitalício, você tem acesso ao nosso assistente GPT Builder externo. Ele foi configurado para ajudar na redação profissional a partir dos resultados obtidos em suas planilhas de apoio operacional.
          </p>
          <p className="text-[#CBD5E1] text-base leading-relaxed">
            Este assistente opera de forma externa à plataforma. Suas conversas e o histórico de geração de relatórios ficam salvos diretamente na sua conta da OpenAI (ChatGPT), sem integração local de banco de dados.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleOpenGpt}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] text-base font-bold rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15"
          >
            Abrir Assistente GPT
            <IconExternal />
          </button>
          <p className="text-xs text-[#94A3B8] mt-2">O assistente abre em uma nova aba no ChatGPT.</p>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 bg-[#0B2430]/60 rounded-2xl border border-[#1F4D5C] text-center text-xs text-[#94A3B8] leading-relaxed">
        <strong>Nota de apoio profissional:</strong> O Assistente GPT serve estritamente como recurso de apoio operacional de redação textual. Ele não substitui de forma alguma o diagnóstico, manual original do teste, avaliação profissional ou julgamento clínico do profissional responsável.
      </div>

    </div>
  );
}
