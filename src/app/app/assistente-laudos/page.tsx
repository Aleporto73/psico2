'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Lock, MessageSquare, ExternalLink } from 'lucide-react';

export default function AppAssistenteLaudosPage() {
  const supabase = createClient();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const gptBuilderUrl = 'https://chatgpt.com/g/g-67c9c9b8c564819187a4fbb03bd118f3-psiform-simulador-profissional-de-laudos';

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
      <div className="flex h-[60vh] items-center justify-center text-pp-ink-soft">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p>Carregando informações do assistente...</p>
        </div>
      </div>
    );
  }

  // Lock Screen if user doesn't have lifetime access
  if (hasAccess === false) {
    return (
      <div className="bg-pp-block-coral rounded-block p-10 max-w-2xl mx-auto my-12 text-center flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-pp-ink/5 flex items-center justify-center text-pp-ink">
          <Lock className="w-10 h-10" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <h2 className="font-serif italic text-2xl md:text-3xl text-pp-ink">Assistente Laudos bloqueado</h2>
          <p className="text-pp-ink-soft text-base leading-relaxed">
            O Assistente Laudos Incluso é um bônus exclusivo do plano vitalício. Adquira o acesso vitalício para liberar esta ferramenta e toda a biblioteca de planilhas profissionais.
          </p>
        </div>
        <Link
          href="/app/produtos"
          className="inline-flex items-center bg-pp-ink text-pp-canvas rounded-pill px-8 py-3.5 text-base font-medium hover:bg-pp-ink-soft transition"
        >
          Conhecer planos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header editorial */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">Assistente Laudos</h1>
        <p className="text-pp-ink-soft text-base md:text-lg">
          Apoio à estruturação de laudos psicológicos conforme a Resolução CFP 06/2019.
        </p>
        <div>
          <span className="inline-flex items-center rounded-pill bg-pp-block-coral text-pp-ink text-xs font-medium px-3 py-1">
            Exclusivo para psicólogos
          </span>
        </div>
      </header>

      {/* Bloco grande mint — recurso incluso */}
      <div className="bg-pp-block-mint rounded-block p-8 md:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-pp-ink/5 flex items-center justify-center text-pp-ink shrink-0">
            <MessageSquare className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="font-serif italic text-pp-ink-soft text-sm">Bônus incluso</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl md:text-[26px] text-pp-ink font-medium leading-tight">Bônus incluso no pacote vitalício</h2>
          <p className="text-pp-ink-soft text-base leading-relaxed">
            Como cliente PsicoPlanilhas Vitalício, você tem acesso ao nosso assistente GPT especialista em laudos psicológicos. Ele orienta a estrutura do documento — identificação, descrição da demanda, procedimento, análise e conclusão — conforme a Resolução CFP 06/2019 e o Código de Ética Profissional.
          </p>
          <p className="text-pp-ink-soft text-base leading-relaxed">
            Este assistente opera de forma externa à plataforma. Suas conversas e o histórico de geração de relatórios ficam salvos diretamente na sua conta da OpenAI (ChatGPT), sem integração local de banco de dados.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenGpt}
            className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-7 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
          >
            Abrir Assistente Laudos
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
          <p className="text-xs text-pp-ink-soft mt-2">O assistente abre em uma nova aba no ChatGPT.</p>
        </div>
      </div>

      {/* Disclaimer minimalista */}
      <footer className="pt-8 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          <strong className="font-medium">Nota de apoio profissional:</strong> A elaboração de laudo psicológico é atividade privativa da(o) psicóloga(o) regularmente inscrita(o) no Conselho Regional de Psicologia, nos termos da Resolução CFP 06/2019. Este assistente serve estritamente como apoio à redação e à estruturação do documento. Ele não realiza avaliação psicológica, não emite diagnóstico e não substitui o julgamento clínico do profissional responsável, que responde ética e legalmente pelo conteúdo do laudo.
        </p>
      </footer>

    </div>
  );
}
