'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function AppProdutosPage() {
  const supabase = createClient();
  const [profileType, setProfileType] = useState('unknown');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoCta, setActiveVideoCta] = useState<{ text: string; url: string } | null>(null);

  useEffect(() => {
    fetchProfileAndProducts();
  }, []);

  const fetchProfileAndProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user profile type from user_access_status
      const { data: status } = await supabase
        .from('user_access_status')
        .select('profile_type')
        .eq('user_id', user.id)
        .single();

      if (status) {
        setProfileType(status.profile_type || 'unknown');
      }

      // 2. Fetch all active products
      const { data: prods, error: prodsErr } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!prodsErr && prods) {
        setProducts(prods);
      }
    } catch (err) {
      console.error('Error loading products list:', err);
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
        Carregando catálogo de produtos...
      </div>
    );
  }

  // Segment products based on audience
  const filteredProducts = products.filter((prod) => {
    const aud = prod.audience;
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
    // 'unknown' sees only 'all'
    return false;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Vitrine de Produtos</h1>
        <p className="text-slate-400 text-sm mt-1">
          Explore ferramentas de apoio operacional e recursos adicionais para sua prática profissional.
        </p>
      </div>

      {/* Warning if profile is unknown */}
      {profileType === 'unknown' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="font-bold text-amber-400 block text-xs uppercase tracking-wider">Recomendações Limitadas</span>
            <p className="text-slate-300 text-xs">Preencha sua área de atuação na sua conta para liberar a vitrine completa de produtos especializados.</p>
          </div>
          <Link href="/app/minha-conta" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shrink-0 self-start md:self-auto">
            Configurar Perfil
          </Link>
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 rounded-2xl border border-slate-800">
          Nenhum produto complementar disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6 hover:border-slate-750 transition"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      {prod.category || 'Geral'}
                    </span>
                    <h3 className="text-lg font-bold text-white pt-1">{prod.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-semibold text-slate-400 bg-slate-800/40 rounded-full border border-slate-800">
                    Público: {
                      prod.audience === 'all' ? 'Todos' :
                      prod.audience === 'psychologist' ? 'Psicólogos' :
                      prod.audience === 'psychopedagogue' ? 'Psicopedagogos' : 'Geral'
                    }
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{prod.description || 'Nenhuma descrição fornecida.'}</p>
                
                {prod.price && (
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                    </span>
                    {prod.billing_type && (
                      <span className="text-slate-500 text-xs ml-1">
                        / {prod.billing_type === 'yearly' ? 'ano' : prod.billing_type === 'monthly' ? 'mês' : 'único'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {prod.checkout_url && (
                  <a
                    href={prod.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-grow py-2.5 text-center text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition duration-200 shadow-md shadow-amber-500/10"
                  >
                    Comprar / Adquirir
                  </a>
                )}
                
                {prod.video_url && (
                  <button
                    onClick={() => {
                      setActiveVideoUrl(prod.video_url);
                      setActiveVideoCta(
                        prod.checkout_url
                          ? { text: 'Adquirir Agora', url: prod.checkout_url }
                          : null
                      );
                    }}
                    className="flex-grow py-2.5 text-center text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition duration-200"
                  >
                    🎬 Assistir Vídeo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <footer className="pt-8 border-t border-slate-850">
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 leading-relaxed max-w-3xl mx-auto">
          <strong>Aviso de uso responsável:</strong> Nossos produtos e assistentes virtuais servem como recursos de apoio operacional. Eles auxiliam na organização de dados e agilizam cálculos. A utilização adequada requer a posse do manual técnico original de cada instrumento, e nenhuma ferramenta substitui a avaliação profissional ou diagnóstico clínico.
        </div>
      </footer>

      {/* Video Modal Overlay */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 relative flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-200">Demonstração do Produto</h4>
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
