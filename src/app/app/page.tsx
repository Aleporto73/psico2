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
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        Carregando painel principal...
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
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Olá, {profile?.name || profile?.email.split('@')[0]}.
        </h2>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Acesse suas planilhas de apoio operacional, use o assistente incluso e conheça ferramentas para acelerar sua rotina profissional.
        </p>
      </div>

      {/* Grid of Main Products / Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Spreadsheets */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-2xl">📋</span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${profile?.has_lifetime_access ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-900 border border-slate-800'}`}>
                {profile?.has_lifetime_access ? 'Acesso Vitalício' : 'Sem Acesso'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white pt-2">Minhas Planilhas</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Biblioteca de planilhas profissionais de apoio operacional qualificadas para agilizar cálculos e organização.
            </p>
          </div>
          <Link
            href="/app/planilhas"
            className="w-full py-2.5 text-center text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition duration-200"
          >
            Acessar Planilhas
          </Link>
        </div>

        {/* Card 2: GPT Assistant */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-2xl">🤖</span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                Bônus Incluso
              </span>
            </div>
            <h3 className="text-lg font-bold text-white pt-2">Assistente GPT Incluso</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Apoio textual para estruturação de relatórios a partir de dados em formato de GPT Builder externo.
            </p>
          </div>
          <Link
            href="/app/assistente-gpt"
            className="w-full py-2.5 text-center text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-750 rounded-lg transition duration-200"
          >
            Abrir Assistente GPT
          </Link>
        </div>

        {/* Card 3: IA Pro Assistant */}
        <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-2xl">✨</span>
              
              {assistantState === 'active' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  Assinatura Ativa
                </span>
              )}
              {assistantState === 'expired' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-400 bg-red-500/10 border border-red-500/20 rounded-full">
                  Expirado
                </span>
              )}
              {assistantState === 'blocked' && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 bg-slate-900 border border-slate-800 rounded-full">
                  Bloqueado 🔒
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white pt-2">Assistente IA Pro</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Gere relatórios profissionais estruturados baseando-se estritamente nos dados das suas planilhas.
            </p>
          </div>
          <Link
            href="/app/assistente-pro"
            className={`w-full py-2.5 text-center text-xs font-bold rounded-lg transition duration-200 ${
              assistantState === 'active'
                ? 'text-slate-955 bg-amber-500 hover:bg-amber-400'
                : 'text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:bg-amber-500/5'
            }`}
          >
            {assistantState === 'active' ? 'Acessar Assistente Pro' : 'Ver Oferta Anual'}
          </Link>
        </div>

      </section>

      {/* Promo Banners Section */}
      <section className="space-y-6 pt-4">
        <div className="border-t border-slate-850 pt-8">
          <h3 className="text-xl font-bold text-white tracking-tight">Recomendações e Destaques</h3>
          <p className="text-xs text-slate-400 mt-1">Conheça recursos complementares e treinamentos selecionados para você.</p>
        </div>

        {/* Warning if profile is unknown */}
        {profileType === 'unknown' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-amber-400 block text-xs uppercase tracking-wider">Perfil Profissional Incompleto</span>
              <p className="text-slate-300 text-xs">Configure sua área de atuação na sua conta para receber recomendações exclusivas para Psicólogos ou Psicopedagogos.</p>
            </div>
            <Link href="/app/minha-conta" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition self-start md:self-auto shrink-0">
              Configurar Perfil
            </Link>
          </div>
        )}

        {filteredBanners.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900/10 border border-dashed border-slate-850 rounded-2xl">
            Nenhuma recomendação disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBanners.map((banner) => (
              <div
                key={banner.id}
                className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-750 transition duration-300"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      Público: {
                        banner.audience === 'all' ? 'Todos' :
                        banner.audience === 'psychologist' ? 'Psicologia' :
                        banner.audience === 'psychopedagogue' ? 'Psicopedagogia' : 'Geral'
                      }
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white leading-snug">{banner.title}</h4>
                    {banner.subtitle && <p className="text-xs text-slate-400 mt-1 leading-normal">{banner.subtitle}</p>}
                  </div>
                </div>

                {/* Banner Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {banner.button_url && banner.button_text && (
                    <a
                      href={banner.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-center text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition"
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
                      className="px-4 py-2 text-center text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-650 rounded-lg transition"
                    >
                      🎬 Assistir Vídeo
                    </button>
                  )}

                  {banner.secondary_button_url && banner.secondary_button_text && (
                    <a
                      href={banner.secondary_button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-850 hover:bg-slate-850/50 rounded-lg transition"
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
      <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 leading-relaxed max-w-3xl mx-auto">
        <strong>Aviso de uso responsável:</strong> As planilhas profissionais e assistentes virtuais servem como recursos de apoio operacional para organização de dados e auxílio nos cálculos automatizados. O uso correto exige o manual original de cada instrumento técnico e nenhuma funcionalidade substitui a análise, interpretação ou diagnóstico de um profissional qualificado.
      </div>

      {/* Video Modal Overlay */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 relative flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-200">Demonstração / Vídeo Informativo</h4>
              <button
                onClick={() => {
                  setActiveVideoUrl(null);
                  setActiveVideoCta(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-lg focus:outline-none"
              >
                ✕
              </button>
            </div>
            
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-slate-800">
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
                  className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition"
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
