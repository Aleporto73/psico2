'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { HeroBanner } from '@/components/ui/hero-banner';
import { FileText, MessageSquare, Sparkles, Lock, Play, X, ArrowRight, Workflow } from 'lucide-react';

interface ClientStats {
  name: string | null;
  email: string;
  profile_type: string;
  has_lifetime_access: boolean;
  has_active_assistant: boolean;
  assistant_expires_at: string | null;
  has_flow_access: boolean;
}

// Flow não tem checkout próprio ainda. Quando o fluxo de pagamento existir,
// preencha aqui (espelha CHECKOUT_URL_IA_PRO da página assistente-pro).
const FLOW_CHECKOUT_URL = '';

// ── Helpers de apresentação ──────────────────────────────────────────────────

function audienceToBlockClass(audience: string): string {
  switch (audience) {
    case 'psychologist': return 'bg-pp-block-mint';
    case 'psychopedagogue': return 'bg-pp-block-pink';
    case 'both': return 'bg-pp-block-cream';
    case 'all':
    default: return 'bg-pp-block-lilac';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AppDashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ClientStats | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoCta, setActiveVideoCta] = useState<{ text: string; url: string } | null>(null);
  const [flowOpening, setFlowOpening] = useState(false);
  const [flowMsg, setFlowMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileStatus();
  }, []);

  // Ativa o Flow neste computador: pede um token one-time ao backend
  // (/api/flow/generate-token só responde com acesso confirmado) e abre o app
  // Flow com o token no fragmento da URL — token nunca fica no bundle.
  const handleOpenFlow = async () => {
    setFlowMsg(null);
    setFlowOpening(true);
    try {
      const res = await fetch('/api/flow/generate-token', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.activationUrl) {
        setFlowMsg('Não foi possível ativar o Flow agora. Atualize a página ou fale com o suporte.');
        return;
      }
      window.open(data.activationUrl as string, '_blank', 'noopener,noreferrer');
    } catch {
      setFlowMsg('Não foi possível ativar o Flow agora. Atualize a página ou fale com o suporte.');
    } finally {
      setFlowOpening(false);
    }
  };

  const handleBuyFlow = () => {
    if (FLOW_CHECKOUT_URL) {
      window.open(FLOW_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    } else {
      setFlowMsg('Em breve! A compra do PsicoPlanilhas Flow ainda não está disponível por aqui. Fale com o suporte para liberar seu acesso.');
    }
  };

  const fetchProfileStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // 1. Query the user_access_status view for the logged-in user
      const { data, error } = await supabase
        .from('user_access_status')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);

      // 2. Fetch active promo banners ordered by sort_order
      const { data: bData, error: bErr } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!bErr && bData) {
        setBanners(bData);
      }
    } catch (err) {
      console.error('Error fetching client access status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmbedUrl = (url: string | null) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        const videoId = urlParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-pp-ink-soft">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p>Carregando painel principal...</p>
        </div>
      </div>
    );
  }

  // Determine Assistant IA Pro state
  let assistantState: 'blocked' | 'active' | 'expired' = 'blocked';
  if (profile?.has_active_assistant) {
    assistantState = 'active';
  } else if (profile?.assistant_expires_at) {
    assistantState = 'expired';
  }

  // Segment banners
  const profileType = profile?.profile_type || 'unknown';

  const filteredBanners = banners.filter((banner) => {
    const aud = banner.audience;
    // Rule: always show all
    if (aud === 'all') return true;

    if (profileType === 'both') {
      return aud === 'psychologist' || aud === 'psychopedagogue' || aud === 'both';
    }
    if (profileType === 'psychologist') {
      return aud === 'psychologist' || aud === 'both';
    }
    if (profileType === 'psychopedagogue') {
      return aud === 'psychopedagogue' || aud === 'both';
    }
    // profileType === 'unknown' only sees 'all'
    return false;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-12">

      {/* 1. WELCOME EDITORIAL */}
      <section className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          Olá, {profile?.name || profile?.email?.split('@')[0] || 'cliente'}.
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg max-w-2xl leading-relaxed">
          Acesse suas planilhas, use o assistente incluso e conheça ferramentas para acelerar sua rotina profissional.
        </p>
      </section>

      {/* 2. HERO BANNER CANVA */}
      <HeroBanner position="dashboard" />

      {/* 3. TRÊS CARDS DE PRODUTO EM BLOCOS PASTEL */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Minhas Planilhas — block-cream */}
        <article className="bg-pp-block-cream rounded-block p-8 md:p-10 flex flex-col gap-6 min-h-[280px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-pp-ink-soft">
              <FileText className="w-5 h-5" aria-hidden="true" />
              <p className="font-serif italic text-sm">Sua biblioteca</p>
            </div>
            <h2 className="text-2xl md:text-[28px] text-pp-ink font-medium leading-tight">
              Minhas Planilhas
            </h2>
            <p className="text-pp-ink-soft text-base leading-relaxed">
              Biblioteca de planilhas profissionais para agilizar cálculos e organizar seu trabalho.
            </p>
          </div>
          <div className="mt-auto">
            <Link
              href="/app/planilhas"
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              Acessar planilhas
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Card 2: Assistente GPT (bônus) — block-mint */}
        <article className="bg-pp-block-mint rounded-block p-8 md:p-10 flex flex-col gap-6 min-h-[280px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-pp-ink-soft">
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
              <p className="font-serif italic text-sm">Bônus incluso</p>
            </div>
            <h2 className="text-2xl md:text-[28px] text-pp-ink font-medium leading-tight">
              Assistente GPT
            </h2>
            <p className="text-pp-ink-soft text-base leading-relaxed">
              Apoio textual para estruturar relatórios a partir dos seus dados.
            </p>
          </div>
          <div className="mt-auto">
            <Link
              href="/app/assistente-gpt"
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              Abrir assistente
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Card 3: Assistente IA Pro — block-coral (commercial highlight, sempre) */}
        <article className="bg-pp-block-coral rounded-block p-8 md:p-10 flex flex-col gap-6 min-h-[280px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-pp-ink-soft">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
              <p className="font-serif italic text-sm">
                {assistantState === 'active'
                  ? 'Sua assinatura'
                  : assistantState === 'expired'
                    ? 'Renove'
                    : 'Recomendado'}
              </p>
            </div>
            <h2 className="text-2xl md:text-[28px] text-pp-ink font-medium leading-tight">
              Assistente de Relatórios IA
            </h2>
            <p className="text-pp-ink-soft text-base leading-relaxed">
              {assistantState === 'active'
                ? `Acesso ativo${profile?.assistant_expires_at ? ` até ${formatDate(profile.assistant_expires_at)}` : ''}.`
                : assistantState === 'expired'
                  ? 'Sua assinatura expirou. Renove para voltar a gerar relatórios.'
                  : 'Gere relatórios estruturados com IA a partir das suas planilhas.'}
            </p>
          </div>
          <div className="mt-auto">
            <Link
              href="/app/assistente-pro"
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              {assistantState === 'blocked' && <Lock className="w-4 h-4" aria-hidden="true" />}
              {assistantState === 'active'
                ? 'Abrir assistente'
                : assistantState === 'expired'
                  ? 'Renovar por R$50/ano'
                  : 'Assinar por R$50/ano'}
              {assistantState !== 'blocked' && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </Link>
          </div>
        </article>

      </section>

      {/* 3b. PSICOPLANILHAS FLOW — produto externo, ativação via token one-time (/api/flow/generate-token) */}
      <section className="bg-pp-block-lilac rounded-block p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 text-pp-ink-soft">
            <Workflow className="w-5 h-5" aria-hidden="true" />
            <p className="font-serif italic text-sm">
              {profile?.has_flow_access ? 'Seu acesso' : 'Ferramenta externa'}
            </p>
          </div>
          <h2 className="text-2xl md:text-[28px] text-pp-ink font-medium leading-tight">
            PsicoPlanilhas Flow
          </h2>
          <p className="text-pp-ink-soft text-base leading-relaxed">
            {profile?.has_flow_access
              ? 'Seu acesso vitalício está liberado. Abra o app Flow em uma nova aba.'
              : 'App externo para organizar seu fluxo de atendimentos. Acesso vitalício por pagamento único de R$39.'}
          </p>
          {flowMsg && (
            <p className="text-sm text-pp-ink bg-white/60 rounded-xl px-4 py-2.5 leading-relaxed">
              {flowMsg}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {profile?.has_flow_access ? (
            <button
              type="button"
              onClick={handleOpenFlow}
              disabled={flowOpening}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {flowOpening ? 'Ativando...' : 'Ativar Flow neste computador'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBuyFlow}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              Comprar por R$39
            </button>
          )}
        </div>
      </section>

      {/* 4. WARNING SE PERFIL DESCONHECIDO (lógica mantida) */}
      {profileType === 'unknown' && (
        <div className="p-8 bg-pp-block-cream rounded-block flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-serif italic text-pp-ink-soft text-sm">Perfil incompleto</p>
            <p className="text-pp-ink text-base leading-relaxed max-w-xl">
              Configure sua área de atuação na sua conta para receber recomendações para Psicólogos ou Psicopedagogos.
            </p>
          </div>
          <Link
            href="/app/minha-conta"
            className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition shrink-0 self-start md:self-auto"
          >
            Configurar perfil
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* 5. RECOMENDADOS — eyebrow editorial + banners segmentados em pastéis */}
      {filteredBanners.length > 0 && (
        <section className="space-y-6">
          <p className="font-serif italic text-pp-ink-soft text-base">Recomendado para você</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBanners.map((banner) => (
              <article
                key={banner.id}
                className={`${audienceToBlockClass(banner.audience)} rounded-block p-8 flex flex-col gap-6 min-h-[240px]`}
              >
                <div className="space-y-3">
                  <p className="font-serif italic text-pp-ink-soft text-sm">
                    {banner.audience === 'all' ? 'Para você' :
                     banner.audience === 'psychologist' ? 'Para psicólogos' :
                     banner.audience === 'psychopedagogue' ? 'Para psicopedagogos' : 'Selecionado'}
                  </p>
                  <h3 className="text-xl md:text-2xl text-pp-ink font-medium leading-tight">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-pp-ink-soft text-base leading-relaxed">{banner.subtitle}</p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-3">
                  {banner.button_url && banner.button_text && (
                    <a
                      href={banner.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-5 py-2.5 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
                    >
                      {banner.button_text}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  )}

                  {banner.video_url && (
                    <button
                      onClick={() => {
                        setActiveVideoUrl(banner.video_url);
                        setActiveVideoCta(
                          banner.button_url && banner.button_text
                            ? { text: banner.button_text, url: banner.button_url }
                            : null
                        );
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-medium text-pp-ink border border-pp-ink/15 hover:bg-pp-ink/5 transition"
                    >
                      <Play className="w-4 h-4" aria-hidden="true" /> Assistir vídeo
                    </button>
                  )}

                  {banner.secondary_button_url && banner.secondary_button_text && (
                    <a
                      href={banner.secondary_button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-2.5 rounded-pill text-sm font-medium text-pp-ink-soft hover:text-pp-ink transition"
                    >
                      {banner.secondary_button_text}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 6. DISCLAIMER MINIMALISTA */}
      <footer className="pt-8 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          As planilhas e assistentes são recursos de apoio operacional. Não substituem manual técnico, avaliação profissional ou diagnóstico clínico.
        </p>
      </footer>

      {/* 7. MODAL DE VÍDEO — lógica mantida, paleta atualizada */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pp-ink/70 backdrop-blur-sm">
          <div className="bg-white border border-pp-hairline rounded-block max-w-2xl w-full p-6 relative flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-pp-hairline pb-3">
              <h4 className="text-base font-medium text-pp-ink">Demonstração / vídeo informativo</h4>
              <button
                onClick={() => {
                  setActiveVideoUrl(null);
                  setActiveVideoCta(null);
                }}
                className="text-pp-ink-soft hover:text-pp-ink p-1 rounded-lg hover:bg-pp-hairline-soft transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-pp-ink border border-pp-hairline">
              {activeVideoUrl.includes('youtube.com') || activeVideoUrl.includes('youtu.be') ? (
                <iframe
                  src={getEmbedUrl(activeVideoUrl)}
                  title="Video Player"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              ) : (
                <video
                  src={activeVideoUrl}
                  controls
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>

            {activeVideoCta && (
              <div className="pt-2 flex justify-end">
                <a
                  href={activeVideoCta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-2.5 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
                >
                  {activeVideoCta.text}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
