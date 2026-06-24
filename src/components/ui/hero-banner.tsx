'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface HeroBannerProps {
  /** Caminho da imagem (ex: '/banners/dashboard-hero.png'). */
  src: string;
  /** Texto alternativo para acessibilidade. */
  alt: string;
  /** Link de destino. Sem href = banner não clicável. */
  href?: string;
  /** Se true, fixa no topo (sticky top-0 z-30) — usado na Fase 4 (planilhas). */
  sticky?: boolean;
  /** Proporção do banner (default '5/1'). */
  aspectRatio?: string;
  /** Se href é externo, abre em nova aba. */
  external?: boolean;
  /** Classes extras opcionais no wrapper. */
  className?: string;
}

/**
 * Banner editorial reutilizável (arte do Canva).
 * Usado no dashboard (Fase 3) e na página de planilhas com sticky (Fase 4).
 */
export function HeroBanner({
  src,
  alt,
  href,
  sticky = false,
  aspectRatio = '5/1',
  external = false,
  className,
}: HeroBannerProps) {
  // next/image não otimiza SVG sem `dangerouslyAllowSVG` no next.config (fora de
  // escopo). O placeholder é SVG, então o servimos direto (unoptimized) — e a
  // otimização volta automaticamente quando o Alê subir um PNG/JPG real.
  const isSvg = src.toLowerCase().endsWith('.svg');

  // O container precisa de `position: relative` para o <Image fill> se posicionar.
  const figure = (
    <div
      className="relative w-full overflow-hidden rounded-block"
      style={{ aspectRatio }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        preload
        unoptimized={isSvg}
        sizes="(max-width: 1152px) 100vw, 1152px"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );

  const inner = href ? (
    external ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-opacity hover:opacity-95"
      >
        {figure}
      </a>
    ) : (
      <Link href={href} className="block transition-opacity hover:opacity-95">
        {figure}
      </Link>
    )
  ) : (
    figure
  );

  return (
    <div
      className={cn(
        'w-full',
        sticky && 'sticky top-0 z-30 bg-pp-canvas py-2',
        className,
      )}
    >
      {inner}
    </div>
  );
}
