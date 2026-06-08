'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// â”€â”€ SVG Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// Tipagem segura â€” note que access_url NÃƒO Ã© exposto na vitrine pÃºblica.
interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  type: string;
  audience: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  checkout_url: string | null;
  price: number | null;
  billing_type: string | null;
  sort_order: number | null;
}

export default function AppProdutosPage() {
  const supabase = createClient();
  const [profileType, setProfileType] = useState('unknown');
  const [products, setProducts] = useState<PublicProduct[]>([]);
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

      // 2. Fetch products from products_public (view sanitizada â€” sem access_url).
      //    Seleciona colunas explÃ­citas para reforÃ§ar que nenhum campo
      //    sensÃ­vel Ã© trafegado para o navegador.
      const { data: prods, error: prodsErr } = await supabase
        .from('products_public')
        .select(
          'id, name, slug, type, audience, category, description, image_url, video_url, checkout_url, price, billing_type, sort_order'
        )
        .order('sort_order', { ascending: true });

      if (!prodsErr && prods) {
        setProducts(prods as PublicProduct[]);
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
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[#CBD5E1]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p>Carregando catÃ¡logo de produtos...</p>
        </div>
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
        <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Vitrine de produtos</h1>
        <p className="text-[#CBD5E1] text-base mt-1">
          Explore ferramentas de apoio operacional e recursos adicionais para sua prÃ¡tica profissional.
        </p>
      </div>

      {/* Warning if profile is unknown */}
      {profileType === 'unknown' && (
        <div className="p-5 bg-[#FACC15]/10 border border-[#FACC15]/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-bold text-[#FACC15] block text-xs uppercase tracking-wider">RecomendaÃ§Ãµes limitadas</span>
            <p className="text-[#CBD5E1] text-sm leading-relaxed">Preencha sua Ã¡rea de atuaÃ§Ã£o na sua conta para liberar a vitrine completa de produtos especializados.</p>
          </div>
          <Link href="/app/minha-conta" className="px-5 py-2.5 bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] text-sm font-bold rounded-xl transition shrink-0 self-start md:self-auto">
            Configurar perfil
          </Link>
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-[#0B2430]/50 border border-dashed border-[#1F4D5C] rounded-2xl space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#0E2A38] flex items-center justify-center text-[#94A3B8]">
            <IconEmpty />
          </div>
          <p className="text-[#CBD5E1] text-base">Nenhum produto disponÃ­vel para o seu perfil agora.</p>
          <p className="text-[#94A3B8] text-sm">Atualize seu perfil profissional para ver mais opÃ§Ãµes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] flex flex-col justify-between gap-6 hover:border-[#7DD3FC]/40 transition"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full">
                      {prod.category || 'Geral'}
                    </span>
                    <h3 className="text-lg font-bold text-[#F8FAFC] pt-1">{prod.name}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold text-[#CBD5E1] bg-[#0E2A38] rounded-full border border-[#1F4D5C]">
                    {
                      prod.audience === 'all' ? 'Todos' :
                      prod.audience === 'psychologist' ? 'PsicÃ³logos' :
                      prod.audience === 'psychopedagogue' ? 'Psicopedagogos' : 'Geral'
                    }
                  </span>
                </div>

                <p className="text-sm text-[#CBD5E1] leading-relaxed line-clamp-4">{prod.description || 'Nenhuma descriÃ§Ã£o fornecida.'}</p>

                {prod.price && (
                  <div className="pt-1">
                    <span className="text-2xl font-extrabold text-[#F8FAFC]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                    </span>
                    {prod.billing_type && (
                      <span className="text-[#94A3B8] text-sm ml-1.5">
                        / {prod.billing_type === 'yearly' ? 'ano' : prod.billing_type === 'monthly' ? 'mÃªs' : 'Ãºnico'}
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
                    className="flex-grow py-3 text-center text-sm font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15"
                  >
                    Comprar
                  </a>
                )}

                {prod.video_url && (
                  <button
                    onClick={() => {
                      setActiveVideoUrl(prod.video_url);
                      setActiveVideoCta(
                        prod.checkout_url
                          ? { text: 'Adquirir agora', url: prod.checkout_url }
                          : null
                      );
                    }}
                    className="flex-grow inline-flex items-center justify-center gap-1.5 py-3 text-center text-sm font-semibold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition duration-200"
                  >
                    <IconPlay /> Assistir vÃ­deo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <footer className="pt-8 border-t border-[#1F4D5C]">
        <div className="p-4 bg-[#0B2430]/60 rounded-2xl border border-[#1F4D5C] text-center text-xs text-[#94A3B8] leading-relaxed max-w-3xl mx-auto">
          <strong>Aviso de uso responsÃ¡vel:</strong> Nossos produtos e assistentes virtuais servem como recursos de apoio operacional. Eles auxiliam na organizaÃ§Ã£o de dados e agilizam cÃ¡lculos. A utilizaÃ§Ã£o adequada requer a posse do manual tÃ©cnico original de cada instrumento, e nenhuma ferramenta substitui a avaliaÃ§Ã£o profissional ou diagnÃ³stico clÃ­nico.
        </div>
      </footer>

      {/* Video Modal Overlay */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061923]/85 backdrop-blur-sm">
          <div className="bg-[#0B2430] border border-[#1F4D5C] rounded-2xl max-w-2xl w-full p-6 relative flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1F4D5C] pb-3">
              <h4 className="text-base font-bold text-[#F8FAFC]">DemonstraÃ§Ã£o do produto</h4>
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
