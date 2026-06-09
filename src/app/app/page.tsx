'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface ClientStats {
  name: string | null;
  email: string;
  profile_type: string;
  has_lifetime_access: boolean;
  has_active_assistant: boolean;
  assistant_expires_at: string | null;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconSheet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function AppDashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ClientStats | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoCta, setActiveVideoCta] = useState<{ text: string; url: string } | null>(null);

  useEffect(() => {
    fetchProfileStatus();
  }, []);

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
      <div className="flex h-[60vh] items-center justify-center text-[#CBD5E1]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
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
    <div className="space-y-8">
      {/* Welcome Block */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
          Olá, {profile?.name || profile?.email?.split('@')[0] || 'cliente'}.
        </h2>
        <p className="text-[#CBD5E1] text-base max-w-2xl leading-relaxed">
          Acesse suas planilhas de apoio operacional, use o assistente incluso e conheça ferramentas para acelerar sua rotina profissional.
        </p>
      </div>

      {/* Grid of Main Products / Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Spreadsheets */}
        <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[#7DD3FC] shrink-0"><IconSheet /></span>
              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${profile?.has_lifetime_access ? 'text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20' : 'text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C]'}`}>
                {profile?.has_lifetime_access ? 'Acesso Vitalício' : 'Sem Acesso'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Minhas Planilhas</h3>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Biblioteca de planilhas profissionais de apoio operacional qualificadas para agilizar cálculos e organização.
            </p>
          </div>
          <Link
            href="/app/planilhas"
            className="w-full py-3 text-center text-sm font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition duration-200"
          >
            Acessar planilhas
          </Link>
        </div>

        {/* Card 2: GPT Assistant */}
        <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[#7DD3FC] shrink-0"><IconChat /></span>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-full">
                Bônus Incluso
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Assistente GPT Incluso</h3>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Apoio textual para estruturação de relatórios a partir de dados em formato de GPT Builder externo.
            </p>
          </div>
          <Link
            href="/app/assistente-gpt"
            className="w-full py-3 text-center text-sm font-bold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition duration-200"
          >
            Abrir Assistente GPT
          </Link>
        </div>

        {/* Card 3: IA Pro Assistant */}
        <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[#7DD3FC] shrink-0"><IconSpark /></span>

              {assistantState === 'active' && (
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-full">
                  Assinatura Ativa
                </span>
              )}
              {assistantState === 'expired' && (
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-full">
                  Expirado
                </span>
              )}
              {assistantState === 'blocked' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] rounded-full">
                  <IconLock /> Bloqueado
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">Assistente IA Pro</h3>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Gere relatórios profissionais estruturados baseando-se estritamente nos dados das suas planilhas.
            </p>
          </div>
          <Link
            href="/app/assistente-pro"
            className={`w-full py-3 text-center text-sm font-bold rounded-xl transition duration-200 ${
              assistantState === 'active'
                ? 'text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9]'
                : 'text-[#7DD3FC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C]'
            }`}
          >
            {assistantState === 'active' ? 'Acessar Assistente Pro' : 'Ver oferta anual'}
          </Link>
        </div>

      </section>

      {/* Promo Banners Section */}
      <section className="space-y-6 pt-4">
        <div className="border-t border-[#1F4D5C] pt-8">
          <h3 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Recomendações e Destaques</h3>
          <p className="text-sm text-[#CBD5E1] mt-1">Conheça recursos complementares e treinamentos selecionados para você.</p>
        </div>

        {/* Warning if profile is unknown */}
        {profileType === 'unknown' && (
          <div className="p-5 bg-[#FACC15]/10 border border-[#FACC15]/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-[#FACC15] block text-xs uppercase tracking-wider">Perfil profissional incompleto</span>
              <p className="text-[#CBD5E1] text-sm leading-relaxed">Configure sua área de atuação na sua conta para receber recomendações exclusivas para Psicólogos ou Psicopedagogos.</p>
            </div>
            <Link href="/app/minha-conta" className="px-5 py-2.5 bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] text-sm font-bold rounded-xl transition self-start md:self-auto shrink-0">
              Configurar perfil
            </Link>
          </div>
        )}

        {filteredBanners.length === 0 ? (
          <div className="p-10 text-center bg-[#0B2430]/50 border border-dashed border-[#1F4D5C] rounded-2xl space-y-2">
            <p className="text-[#CBD5E1] text-base">Nenhuma recomendação disponível no momento.</p>
            <p className="text-[#94A3B8] text-sm">Volte em breve — novidades aparecem aqui regularmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBanners.map((banner) => (
              <div
                key={banner.id}
                className="bg-[#0B2430] border border-[#1F4D5C] rounded-2xl p-6 flex flex-col justify-between gap-4 hover:border-[#7DD3FC]/40 transition duration-200"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full">
                      Público: {
                        banner.audience === 'all' ? 'Todos' :
                        banner.audience === 'psychologist' ? 'Psicologia' :
                        banner.audience === 'psychopedagogue' ? 'Psicopedagogia' : 'Geral'
                      }
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#F8FAFC] leading-snug">{banner.title}</h4>
                    {banner.subtitle && <p className="text-sm text-[#CBD5E1] mt-1.5 leading-relaxed">{banner.subtitle}</p>}
                  </div>
                </div>

                {/* Banner Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {banner.button_url && banner.button_text && (
                    <a
                      href={banner.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 text-center text-sm font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition"
                    >
                      {banner.button_text}
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
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-center text-sm font-semibold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition"
                    >
                      <IconPlay /> Assistir vídeo
                    </button>
                  )}

                  {banner.secondary_button_url && banner.secondary_button_text && (
                    <a
                      href={banner.secondary_button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 text-center text-sm font-semibold text-[#CBD5E1] hover:text-[#F8FAFC] border border-[#1F4D5C] hover:bg-[#123340] rounded-xl transition"
                    >
                      {banner.secondary_button_text}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer Responsible Use */}
      <div className="p-4 bg-[#0B2430]/60 rounded-2xl border border-[#1F4D5C] text-center text-xs text-[#94A3B8] leading-relaxed max-w-3xl mx-auto">
        <strong>Aviso de uso responsável:</strong> As planilhas profissionais e assistentes virtuais servem como recursos de apoio operacional para organização de dados e auxílio nos cálculos automatizados. O uso correto exige o manual original de cada instrumento técnico e nenhuma funcionalidade substitui a análise, interpretação ou diagnóstico de um profissional qualificado.
      </div>

      {/* Video Modal Overlay */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061923]/85 backdrop-blur-sm">
          <div className="bg-[#0B2430] border border-[#1F4D5C] rounded-2xl max-w-2xl w-full p-6 relative flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1F4D5C] pb-3">
              <h4 className="text-base font-bold text-[#F8FAFC]">Demonstração / vídeo informativo</h4>
              <button
                onClick={() => {
                  setActiveVideoUrl(null);
                  setActiveVideoCta(null);
                }}
                className="text-[#CBD5E1] hover:text-[#F8FAFC] p-1 rounded-lg hover:bg-[#123340] transition"
                aria-label="Fechar"
              >
                <IconClose />
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-[#1F4D5C]">
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
                  className="px-6 py-2.5 text-sm font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition"
                >
                  {activeVideoCta.text}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
