'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// ── SVG Icons minimalistas (stroke-width 1.5, 18×18) ─────────────────────────

function IconDashboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPlanilhas() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function IconProducts() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconFlow() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10.4 12.6a2 2 0 0 1 3 3L8 21l-4 1 1-4Z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Shell (sidebar + nav mobile + área principal) ────────────────────────────
// Client Component: interatividade (pathname, logout). O acesso ao Doc Studio é
// resolvido no servidor (layout.tsx) e chega por prop, para que o trilho fino
// da sidebar só valha quando o usuário TEM acesso (ferramenta aberta). Na tela
// de venda (sem acesso) a sidebar fica cheia, como nas demais rotas.

export function AppShell({
  children,
  hasDocStudioAccess,
}: {
  children: React.ReactNode;
  hasDocStudioAccess: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Lógica de logout — sem alteração
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  type NavItem = { name: string; path: string; icon: React.ReactNode; badge?: string; badgeTone?: 'neutral' | 'pink'; external?: boolean };
  type NavGroup = { label?: string; labelBadge?: string; labelBadgeTone?: 'neutral' | 'pink'; separatorBefore?: boolean; items: NavItem[] };

  // Nav em blocos: conta (topo) · Assistentes Free (rótulo + UM badge 'Incluído')
  // · ferramentas 'Novo' · navegação de conta. Separador discreto entre os
  // blocos de baixo. O colapsado (trilho Doc Studio) ignora rótulos/separadores
  // e renderiza a lista achatada — sem alteração de comportamento.
  const navGroups: NavGroup[] = [
    { items: [
      { name: 'Dashboard',        path: '/app',           icon: <IconDashboard /> },
      { name: 'Minhas Planilhas', path: '/app/planilhas', icon: <IconPlanilhas /> },
    ] },
    { label: 'Ferramentas incluídas', items: [
      { name: 'Studio DOC', path: '/app/doc-studio',     icon: <IconDoc />, badge: 'Novo', badgeTone: 'pink' },
      { name: 'Relatório',  path: '/app/assistente-gpt',    icon: <IconChat /> },
      { name: 'ABA',        path: '/app/assistente-aba',    icon: <IconChat /> },
      { name: 'Laudos',     path: '/app/assistente-laudos', icon: <IconChat /> },
    ] },
    { separatorBefore: true, label: 'Ferramentas upgrade', items: [
      { name: 'Relatório Pró', path: '/app/assistente-pro', icon: <IconSpark />, badge: 'Novo' },
      { name: 'Psico Flow',    path: '/app/flow',           icon: <IconFlow />, badge: 'Novo' },
    ] },
    { separatorBefore: true, items: [
      { name: 'Produtos',    path: '/app/produtos',    icon: <IconProducts /> },
      { name: 'Minha Conta', path: '/app/minha-conta', icon: <IconUser /> },
    ] },
  ];

  // Lista achatada p/ mobile e trilho colapsado; groupBadge propaga o badge do
  // grupo para o dot do colapsado (mantém os 3 assistentes com dot).
  const flatItems = navGroups.flatMap((g) => g.items.map((item) => ({ item, groupBadge: g.labelBadge })));

  // Classe do badge do menu: neutro (borda que herda a cor do texto — legível
  // nos estados ativo/inativo, sem verde) ou destaque verde para novidades.
  // ponytail: 'pink' é temporário pro Doc Studio — reverter removendo badgeTone: 'pink' do item acima.
  const badgeClass = (tone?: 'neutral' | 'pink') =>
    tone === 'neutral' ? 'border border-current opacity-60'
    : tone === 'pink'  ? 'bg-pink-500 text-white'
    :                    'bg-green-500 text-white';

  // Trilho fino SÓ na ferramenta do Doc Studio (rota /app/doc-studio COM
  // acesso). Na tela de venda (sem acesso) e em todas as outras rotas a
  // sidebar permanece cheia.
  const collapsed =
    hasDocStudioAccess &&
    (pathname === '/app/doc-studio' || pathname.startsWith('/app/doc-studio/'));

  const renderNavLink = (item: NavItem, groupBadge?: string) => {
    const isActive = !item.external && pathname === item.path;
    const showDot = Boolean(item.badge || groupBadge);
    return (
      <Link
        key={item.path}
        href={item.path}
        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={
          collapsed
            ? `relative flex h-11 w-11 items-center justify-center text-sm font-medium transition duration-200 ${isActive ? 'bg-pp-ink text-pp-canvas rounded-2xl shadow-sm' : 'text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink rounded-2xl'}`
            : `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition duration-200 ${isActive ? 'bg-pp-ink text-pp-canvas rounded-pill' : 'text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink rounded-lg'}`
        }
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? item.name : undefined}
        title={collapsed ? item.name : undefined}
      >
        <span className="shrink-0 opacity-90" aria-hidden={collapsed ? 'true' : undefined}>{item.icon}</span>
        {collapsed ? (
          showDot && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-green-500 ring-2 ring-white" aria-hidden="true" />
          )
        ) : (
          <span className="flex items-center w-full gap-2">
            <span className="flex-1 min-w-0 truncate">{item.name}</span>
            {item.badge && (
              <span className={`ml-auto shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${badgeClass(item.badgeTone)}`}>
                {item.badge}
              </span>
            )}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-pp-canvas text-pp-ink font-sans">

      {/* ── Sidebar — visível apenas em md+ ──────────────────────────────── */}
      <aside
        className={`hidden md:flex print:hidden bg-white border-r border-pp-hairline flex-col justify-between shrink-0 ${collapsed ? 'w-[76px]' : 'w-64'}`}
      >
        <div className={collapsed ? 'px-3 py-5 space-y-7' : 'p-6 space-y-8'}>

          {/* Logo */}
          <div>
            {collapsed ? (
              <Link
                href="/app"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pp-accent-soft font-serif italic text-lg text-pp-ink transition duration-200 hover:text-pp-ink-soft"
                aria-label="PsicoPlanilhas 2.0"
                title="PsicoPlanilhas 2.0"
              >
                PP
              </Link>
            ) : (
              <>
                <Link
                  href="/app"
                  className="font-serif italic text-[22px] leading-tight text-pp-ink hover:text-pp-ink-soft transition duration-200 block"
                >
                  PsicoPlanilhas 2.0
                </Link>
                <p className="font-serif italic text-xs text-pp-ink-soft mt-0.5">
                  ?rea do cliente
                </p>
              </>
            )}
          </div>

          {/* Navegação */}
          <nav className={collapsed ? 'flex flex-col items-center gap-1.5' : 'space-y-0.5'} aria-label="Navegação principal">
            {collapsed
              ? flatItems.map(({ item, groupBadge }) => renderNavLink(item, groupBadge))
              : navGroups.map((group, gi) => (
                  <div key={group.label ?? `g${gi}`}>
                    {group.separatorBefore && <hr className="my-2 border-t border-pp-hairline" />}
                    {group.label && (
                      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pp-ink-soft">
                          {group.label}
                        </span>
                        {group.labelBadge && (
                          <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${badgeClass(group.labelBadgeTone)}`}>
                            {group.labelBadge}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {group.items.map((item) => renderNavLink(item, group.labelBadge))}
                    </div>
                  </div>
                ))}
          </nav>
        </div>

        {/* Área de saída */}
        <div className={`border-t border-pp-hairline p-4 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={handleSignOut}
            className={
              collapsed
                ? 'flex h-11 w-11 items-center justify-center text-pp-danger hover:bg-pp-danger/10 rounded-2xl transition duration-200'
                : 'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-pp-danger hover:bg-pp-danger/10 rounded-lg transition duration-200'
            }
            title={collapsed ? 'Sair da Conta' : undefined}
            aria-label={collapsed ? 'Sair da Conta' : undefined}
          >
            <IconLogout />
            {!collapsed && <span>Sair da Conta</span>}
          </button>
        </div>
      </aside>

      {/* ── Conteúdo Principal ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topo mobile */}
        <header className="md:hidden print:hidden bg-white border-b border-pp-hairline px-4 py-3 flex justify-between items-center">
          <Link href="/app" className="font-serif italic text-lg leading-tight text-pp-ink">
            PsicoPlanilhas
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/app/minha-conta" className="text-pp-ink-soft text-sm hover:text-pp-ink transition">
              Conta
            </Link>
            <button
              onClick={handleSignOut}
              className="text-pp-danger text-sm hover:text-pp-danger/80 transition"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Nav mobile em linha */}
        <nav
          className="md:hidden print:hidden bg-white border-b border-pp-hairline px-2 py-1.5 flex gap-0.5 overflow-x-auto"
          aria-label="Navegação mobile"
        >
          {flatItems.map(({ item }) => {
            const isActive = !item.external && pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold shrink-0 transition duration-200 ${
                  isActive
                    ? 'bg-pp-ink text-pp-canvas rounded-pill'
                    : 'text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink rounded-lg'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="opacity-90">{item.icon}</span>
                <span className="hidden sm:flex items-center gap-1 leading-none">
                  {item.name}
                  {item.badge && (
                    <span className={`text-[8px] font-semibold px-1 py-0.5 rounded-full leading-none ${badgeClass(item.badgeTone)}`}>
                      {item.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Páginas */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
