'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Package, Play, X, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipagem segura — note que access_url NÃO é exposto na vitrine pública.
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

const ASSISTANT_PRO_SLUG = 'assistente-ia-pro';
const ASSISTANT_PRO_APP_PATH = '/app/assistente-pro';

// ── Helpers de apresentação ──────────────────────────────────────────────────

function categoryToBlockClass(category: string | null, slug: string): string {
  if (slug === 'assistente-ia-pro') return 'bg-pp-block-coral';
  if (slug.includes('psicoplanilhas') && slug.includes('vital')) return 'bg-pp-block-cream';
  const cat = (category || '').toLowerCase();
  if (cat.includes('tcc')) return 'bg-pp-block-lime';
  if (cat.includes('aba')) return 'bg-pp-block-lilac';
  if (cat.includes('pei') || cat.includes('aee')) return 'bg-pp-block-cream';
  if (cat.includes('rastreio') || cat.includes('neuro')) return 'bg-pp-block-mint';
  if (cat.includes('tdah')) return 'bg-pp-block-pink';
  return 'bg-pp-block-lilac';
}

function humanizeCategory(category: string | null): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('tcc')) return 'Para psicoterapia';
  if (cat.includes('aba')) return 'Para análise comportamental';
  if (cat.includes('pei') || cat.includes('aee')) return 'Para educação';
  if (cat.includes('rastreio') || cat.includes('neuro')) return 'Para avaliação';
  if (cat.includes('tdah')) return 'Para TDAH';
  if (!category || cat === 'geral') return 'Recurso geral';
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

function humanizeAudience(audience: string): string {
  switch (audience) {
    case 'psychologist': return 'Para psicólogos';
    case 'psychopedagogue': return 'Para psicopedagogos';
    case 'both': return 'Para psi e psicoped';
    case 'all':
    default: return 'Para todos';
  }
}

export default function AppProdutosPage() {
  const supabase = createClient();
  const [profileType, setProfileType] = useState('unknown');
  const [hasLifetimeAccess, setHasLifetimeAccess] = useState(false);
  const [hasAssistantAccess, setHasAssistantAccess] = useState(false);
  const [hasFlowAccess, setHasFlowAccess] = useState(false);
  const [assistantExpiresAt, setAssistantExpiresAt] = useState<string | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoCta, setActiveVideoCta] = useState<{ text: string; url: string } | null>(null);
  const [flowBuyMessage, setFlowBuyMessage] = useState(false);

  useEffect(() => {
    fetchProfileAndProducts();
  }, []);

  const fetchProfileAndProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user profile type from user_access_status
      const { data: status, error: statusError } = await supabase
        .from('user_access_status')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statusError) console.error('[produtos] user_access_status:', statusError);
      if (status) {
        const s = status as Record<string, unknown>;
        setProfileType((s.profile_type as string) || 'unknown');
        setHasLifetimeAccess(Boolean(s.has_lifetime_access));
        setHasAssistantAccess(Boolean(s.has_active_assistant));
        setAssistantExpiresAt((s.assistant_expires_at as string | null) || null);
        setHasFlowAccess(Boolean(s.has_flow_access));
      }

      // 2. Fetch products from products_public (view sanitizada — sem access_url).
      //    Seleciona colunas explícitas para reforçar que nenhum campo
      //    sensível é trafegado para o navegador.
      const { data: prods, error: prodsErr } = await supabase
        .from('products_public')
        .select(
          'id, name, slug, type, audience, category, description, image_url, video_url, checkout_url, price, billing_type, sort_order'
        )
        .neq('type', 'spreadsheet')
        .order('sort_order', { ascending: true });

      if (!prodsErr && prods) {
        const commercialOnly = (prods as PublicProduct[]).filter((p) => p.type !== 'spreadsheet');
        setProducts(commercialOnly);
      }
    } catch (err) {
      console.error('Error loading products list:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateBR = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const isLifetimeProduct = (prod: PublicProduct) => {
    const slug = prod.slug.toLowerCase();
    const name = prod.name.toLowerCase();
    return (
      slug.includes('psicoplanilhas') && slug.includes('vital')
    ) || (
      name.includes('psicoplanilhas') && name.includes('vital')
    );
  };

  const isFlowProduct = (prod: PublicProduct) => prod.slug === 'psicoplanilhas-flow';

  const handleActivateFlow = async () => {
    try {
      const res = await fetch('/api/flow/generate-token', { method: 'POST' });
      const json = await res.json() as { activationUrl?: string };
      if (json.activationUrl) window.open(json.activationUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Erro ao gerar token. Tente novamente.');
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
      <div className="flex h-[60vh] items-center justify-center text-pp-ink-soft">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p>Carregando catálogo de produtos...</p>
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

  const displayedProducts = filteredProducts
    .filter((prod) => !(isLifetimeProduct(prod) && hasLifetimeAccess))
    .sort((a, b) => (isFlowProduct(b) ? 1 : 0) - (isFlowProduct(a) ? 1 : 0));

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      {/* 1. HEADER EDITORIAL */}
      <section className="space-y-2">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          Para sua prática
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg max-w-2xl">
          Ferramentas profissionais e recursos complementares selecionados para você.
        </p>
      </section>

      {/* 2. WARNING perfil incompleto */}
      {profileType === 'unknown' && (
        <div className="bg-pp-block-cream rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="font-serif italic text-pp-ink-soft text-sm">Personalize</p>
            <p className="text-pp-ink text-base leading-relaxed">
              Preencha sua área de atuação para liberar a vitrine completa de produtos especializados.
            </p>
          </div>
          <Link
            href="/app/minha-conta"
            className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition shrink-0"
          >
            Configurar perfil
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* 3. GRID DE PRODUTOS EM BLOCOS PASTEL POR CATEGORIA */}
      {displayedProducts.length === 0 ? (
        <div className="bg-pp-block-cream/50 rounded-2xl p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-pp-ink-soft mx-auto" aria-hidden="true" />
          <p className="text-pp-ink text-base">Nenhum produto disponível para o seu perfil agora</p>
          <p className="text-pp-ink-soft text-sm">Atualize seu perfil profissional para ver mais opções.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedProducts.map((prod) => (
            <article
              key={prod.id}
              id={isFlowProduct(prod) ? 'psicoplanilhas-flow' : undefined}
              className={cn(
                categoryToBlockClass(prod.category, prod.slug),
                'rounded-block p-8 md:p-10 flex flex-col gap-6 min-h-[320px]'
              )}
            >
              {/* Eyebrow categoria + audience + título + descrição */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-serif italic text-pp-ink-soft text-sm">
                    {humanizeCategory(prod.category)}
                  </p>
                  <p className="font-serif italic text-pp-ink-soft text-xs">
                    {humanizeAudience(prod.audience)}
                  </p>
                </div>
                <h2 className="text-pp-ink font-medium text-2xl md:text-[26px] leading-tight">
                  {prod.name}
                </h2>
                <p className="text-pp-ink-soft text-base leading-relaxed line-clamp-4">
                  {prod.description || 'Recurso de apoio operacional para psicólogos e psicopedagogos.'}
                </p>
              </div>

              {/* Status contextual — estrutura condicional preservada, re-estilizada */}
              {prod.slug === ASSISTANT_PRO_SLUG && hasAssistantAccess ? (
                <p className="font-serif italic text-pp-ink text-base">
                  {assistantExpiresAt ? `Válido até ${formatDateBR(assistantExpiresAt)}` : 'Relatórios IA liberado'}
                </p>
              ) : prod.price && !(isLifetimeProduct(prod) && hasLifetimeAccess) ? (
                <p className="text-pp-ink text-2xl font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                  {prod.billing_type && (
                    <span className="text-pp-ink-soft text-base font-normal ml-1.5">
                      / {prod.billing_type === 'yearly' ? 'ano' : prod.billing_type === 'monthly' ? 'mês' : 'único'}
                    </span>
                  )}
                </p>
              ) : null}

              {/* Status vitalício — conditional separado preservado, re-estilizado (sem badge verde) */}
              {isLifetimeProduct(prod) && hasLifetimeAccess && (
                <p className="font-serif italic text-pp-ink text-base">Acesso vitalício liberado</p>
              )}

              {/* CTAs */}
              <div className="mt-auto flex flex-col sm:flex-row gap-3">
                {isLifetimeProduct(prod) && hasLifetimeAccess ? (
                  <>
                    <Link
                      href="/app/planilhas"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-pill px-5 py-3 text-sm font-medium hover:bg-pp-ink-soft transition"
                    >
                      Acessar planilhas
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/app/assistente-gpt"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-transparent border border-pp-ink/15 text-pp-ink rounded-pill px-5 py-3 text-sm font-medium hover:border-pp-ink hover:bg-pp-ink/5 transition"
                    >
                      Assistente GPT incluso
                    </Link>
                  </>
                ) : prod.slug === ASSISTANT_PRO_SLUG ? (
                  hasAssistantAccess ? (
                    <Link
                      href={ASSISTANT_PRO_APP_PATH}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-pill px-5 py-3 text-sm font-medium hover:bg-pp-ink-soft transition"
                    >
                      Acessar Relatórios IA
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  ) : prod.checkout_url ? (
                    <a
                      href={prod.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-pill px-5 py-3 text-sm font-medium hover:bg-pp-ink-soft transition"
                    >
                      Assinar Relatórios IA
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      href={ASSISTANT_PRO_APP_PATH}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-pill px-5 py-3 text-sm font-medium hover:bg-pp-ink-soft transition"
                    >
                      Assinar Relatórios IA
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  )
                ) : isFlowProduct(prod) ? (
                  hasFlowAccess ? (
                    <button
                      onClick={handleActivateFlow}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-pill px-5 py-3 text-sm font-medium hover:bg-pp-ink-soft transition"
                    >
                      Ativar Flow neste computador
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 flex-1">
                      <button
                        onClick={() => setFlowBuyMessage(true)}
                        className="inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-pill px-5 py-3 text-sm font-medium hover:bg-pp-ink-soft transition"
                      >
                        Comprar por R$39
                      </button>
                      {flowBuyMessage && (
                        <p className="text-pp-ink-soft text-xs text-center">Compra em breve pelo painel.</p>
                      )}
                    </div>
                  )
                ) : (
                  (prod.video_url || prod.checkout_url) && (
                    <button
                      onClick={() => {
                        if (prod.video_url) {
                          setActiveVideoUrl(prod.video_url);
                          setActiveVideoCta(
                            prod.checkout_url
                              ? { text: 'Saber mais', url: prod.checkout_url }
                              : null
                          );
                        } else if (prod.checkout_url) {
                          window.open(prod.checkout_url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-2 rounded-pill px-5 py-3 text-sm font-medium transition',
                        prod.video_url
                          ? 'bg-transparent border border-pp-ink/15 text-pp-ink hover:border-pp-ink hover:bg-pp-ink/5'
                          : 'bg-pp-ink text-pp-canvas hover:bg-pp-ink-soft'
                      )}
                    >
                      {prod.video_url && <Play className="w-4 h-4" aria-hidden="true" />}
                      {prod.video_url ? 'Entenda como funciona' : 'Saiba mais'}
                      {!prod.video_url && <ExternalLink className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 4. DISCLAIMER MINIMALISTA */}
      <footer className="pt-8 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          <strong className="font-medium">Aviso de uso responsável:</strong> Nossos produtos e assistentes virtuais são recursos de apoio operacional. Eles auxiliam na organização de dados e agilizam cálculos. A utilização adequada requer a posse do manual técnico original de cada instrumento, e nenhuma ferramenta substitui a avaliação profissional ou diagnóstico clínico.
        </p>
      </footer>

      {/* 5. MODAL DE VÍDEO — lógica mantida, paleta atualizada (sem âmbar) */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pp-ink/70 backdrop-blur-sm">
          <div className="bg-white border border-pp-hairline rounded-block max-w-2xl w-full p-6 relative flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-pp-hairline pb-3">
              <h4 className="text-base font-medium text-pp-ink">Demonstração do produto</h4>
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
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
