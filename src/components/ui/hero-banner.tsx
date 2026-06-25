'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

type Position = 'dashboard' | 'planilhas' | 'produtos';

interface HeroBannerProps {
  /** Onde o banner aparece. Define o fetch (/api/hero-banners?position=X) e os defaults. */
  position: Position;
  /** Se true, fixa no topo (sticky top-0 z-30) — usado na página de planilhas. */
  sticky?: boolean;
  /** Override opcional da proporção. Sem isso, usa o default por position. */
  aspectRatio?: string;
  /** Classes extras opcionais no wrapper. */
  className?: string;
}

interface HeroBannerRow {
  id: string;
  image_url: string;
  link_url: string | null;
  position: Position;
  audience: 'all' | 'psychologist' | 'psychopedagogue' | 'both';
  alt_text: string | null;
  sort_order: number;
}

// ── Defaults por posição (fallback + aspect ratio) ───────────────────────────

const POSITION_DEFAULTS: Record<
  Position,
  { fallbackSrc: string; fallbackAlt: string; aspectRatio: string; href: string }
> = {
  dashboard: {
    fallbackSrc: '/banners/dashboard-hero.placeholder.svg',
    fallbackAlt: 'Conheça nossos produtos profissionais',
    aspectRatio: '5/1',
    href: '/app/produtos',
  },
  planilhas: {
    fallbackSrc: '/banners/planilhas-sticky.placeholder.svg',
    fallbackAlt: 'Banner promocional PsicoPlanilhas',
    aspectRatio: '5/1',
    href: '/app/produtos',
  },
  produtos: {
    // Não há placeholder próprio de produtos; reusa o do dashboard.
    fallbackSrc: '/banners/dashboard-hero.placeholder.svg',
    fallbackAlt: 'Conheça nossos produtos profissionais',
    aspectRatio: '5/1',
    href: '/app/produtos',
  },
};

// Mesma regra de segmentação usada no dashboard (Sistema A) para promo_banners.
function matchesAudience(audience: string, profileType: string): boolean {
  if (audience === 'all') return true;
  if (profileType === 'both') {
    return audience === 'psychologist' || audience === 'psychopedagogue' || audience === 'both';
  }
  if (profileType === 'psychologist') {
    return audience === 'psychologist' || audience === 'both';
  }
  if (profileType === 'psychopedagogue') {
    return audience === 'psychopedagogue' || audience === 'both';
  }
  // profileType === 'unknown' só vê 'all'
  return false;
}

// Fire-and-forget: registra o clique sem bloquear a navegação. keepalive garante
// que o POST sobrevive ao unload/navegação. Falhas são silenciadas — tracking
// nunca pode quebrar a navegação do usuário.
function trackClick(bannerId: string) {
  fetch(`/api/hero-banners/${bannerId}/click`, { method: 'POST', keepalive: true }).catch((err) =>
    console.warn('Click tracking failed:', err),
  );
}

/**
 * Banner editorial (arte do Canva) que busca a imagem real do BD via
 * /api/hero-banners?position=X, segmenta por perfil do usuário e, se houver
 * mais de um banner elegível, sorteia um por load. Cai no placeholder SVG
 * quando o BD está vazio (graceful degradation).
 */
export function HeroBanner({ position, sticky = false, aspectRatio, className }: HeroBannerProps) {
  const defaults = POSITION_DEFAULTS[position];
  const [banner, setBanner] = useState<HeroBannerRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();

        // profile_type do usuário logado (para segmentação por audience)
        let profileType = 'unknown';
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('profile_type')
            .eq('id', user.id)
            .single();
          if (profile?.profile_type) profileType = profile.profile_type;
        }

        // Banners ativos da posição (endpoint público — RLS só devolve ativos)
        const res = await fetch(`/api/hero-banners?position=${encodeURIComponent(position)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Erro ao buscar banners.');

        const rows: HeroBannerRow[] = json.data || [];
        const eligible = rows.filter((b) => matchesAudience(b.audience, profileType));

        // Sorteio puro por load quando há mais de um elegível
        const chosen =
          eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)] : null;

        if (!cancelled) setBanner(chosen);
      } catch (err) {
        console.error('Error loading hero banner:', err);
        if (!cancelled) setBanner(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [position]);

  const ratio = aspectRatio ?? defaults.aspectRatio;

  const wrapperCls = cn(
    'w-full',
    sticky && 'sticky top-0 z-30 bg-pp-canvas py-2',
    className,
  );

  // Skeleton enquanto carrega — reserva o espaço no aspect-ratio para evitar layout shift.
  if (loading) {
    return (
      <div className={wrapperCls}>
        <div
          className="w-full overflow-hidden rounded-block bg-pp-block-cream animate-pulse"
          style={{ aspectRatio: ratio }}
        />
      </div>
    );
  }

  // Resolve imagem/alt/href: do BD quando há banner, senão o placeholder por position.
  const src = banner?.image_url ?? defaults.fallbackSrc;
  const alt = banner?.alt_text ?? defaults.fallbackAlt;
  const href = banner?.link_url ?? defaults.href;
  const external = /^https?:\/\//i.test(href);

  // next/image: SVG e URLs remotas são servidas sem o optimizer (sem precisar de
  // remotePatterns no next.config). PNG/JPG local volta a ser otimizado.
  const isOptimizable = src.startsWith('/') && !src.toLowerCase().endsWith('.svg');

  const figure = (
    <div className="relative w-full overflow-hidden rounded-block" style={{ aspectRatio: ratio }}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized={!isOptimizable}
        sizes="(max-width: 1152px) 100vw, 1152px"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );

  // Tracking só dispara para banner real do BD (tem id). Fallback (banner null) não rastreia.
  const onBannerClick = banner ? () => trackClick(banner.id) : undefined;

  const inner = external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onBannerClick}
      className="block transition-opacity hover:opacity-95"
    >
      {figure}
    </a>
  ) : (
    <Link href={href} onClick={onBannerClick} className="block transition-opacity hover:opacity-95">
      {figure}
    </Link>
  );

  return <div className={wrapperCls}>{inner}</div>;
}
