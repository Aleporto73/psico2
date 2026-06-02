'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function AppAssistenteGptPage() {
  const supabase = createClient();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const gptBuilderUrl = 'https://chat.openai.com/g/g-placeholder-psicoplanilhas-builder';

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
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        Carregando informações do assistente...
      </div>
    );
  }

  // Lock Screen if user doesn't have lifetime access
  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800 text-center max-w-2xl mx-auto space-y-6 my-12">
        <div className="text-5xl">🔒</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Assistente GPT Incluso Bloqueado</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            O Assistente GPT Incluso é um bônus exclusivo do plano vitalício. Adquira nosso acesso vitalício para liberar esta ferramenta e toda a biblioteca de planilhas profissionais de apoio operacional.
          </p>
        </div>
        <Link
          href="/app/produtos"
          className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition"
        >
          Conhecer Planos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 my-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Assistente GPT Incluso</h1>
        <p className="text-slate-400 text-sm mt-1">
          Apoio textual para estruturação de relatórios a partir de dados da planilha.
        </p>
      </div>

      {/* Main card */}
      <div className="p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 space-y-6 text-center md:text-left">
        <div className="flex justify-center md:justify-start text-4xl">🤖</div>
        
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-slate-100">Bônus Incluso no Pacote Vitalício</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Como cliente PsicoPlanilhas Vitalício, você tem acesso ao nosso assistente GPT Builder externo. Ele foi configurado para ajudar na redação profissional a partir dos resultados obtidos em suas planilhas profissionais de apoio operacional.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Este assistente opera de forma externa à plataforma, ou seja, suas conversas e o histórico de geração de relatórios ficam salvos diretamente na sua conta da OpenAI (ChatGPT), sem integração local de banco de dados.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleOpenGpt}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition duration-200 shadow-md shadow-amber-500/10"
          >
            Abrir Assistente GPT (Externo)
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 leading-relaxed">
        <strong>Nota de apoio profissional:</strong> O Assistente GPT serve estritamente como recurso de apoio operacional de redação textual. Ele não substitui de forma alguma o diagnóstico, manual original do teste, avaliação profissional ou julgamento clínico do profissional responsável.
      </div>

    </div>
  );
}
