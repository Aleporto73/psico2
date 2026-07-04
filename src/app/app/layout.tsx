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

function IconLogout() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Lógica de logout — sem alteração
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const navItems: { name: string; path: string; icon: React.ReactNode; badge?: string; external?: boolean }[] = [
    { name: 'Dashboard',        path: '/app',                  icon: <IconDashboard /> },
    { name: 'Minhas Planilhas', path: '/app/planilhas',        icon: <IconPlanilhas /> },
    { name: 'Assistente GPT',   path: '/app/assistente-gpt',   icon: <IconChat /> },
    { name: 'Assistente de Relatórios IA',path: '/app/assistente-pro',   icon: <IconSpark /> },
    { name: 'PsicoPlanilhas Flow', path: '/app/flow', icon: <IconFlow />, badge: 'Novo' },
    { name: 'Produtos',         path: '/app/produtos',         icon: <IconProducts /> },
    { name: 'Minha Conta',      path: '/app/minha-conta',      icon: <IconUser /> },
  ];
  const isDocStudioRoute = pathname === '/app/doc-studio';

  return (
    <div className="flex min-h-screen bg-pp-canvas text-pp-ink font-sans">

      {/* ── Sidebar — visível apenas em md+ ──────────────────────────────── */}
      <aside
        className={`hidden md:flex bg-white border-r border-pp-hairline flex-col justify-between shrink-0 ${
          isDocStudioRoute ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div className={isDocStudioRoute ? 'px-3 py-5 space-y-7' : 'p-6 space-y-8'}>

          {/* Logo */}
          {isDocStudioRoute ? (
            <div className="flex justify-center">
              <Link
                href="/app"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pp-block-cream font-serif italic text-[17px] leading-none text-pp-ink transition duration-200 hover:bg-pp-hairline-soft hover:text-pp-ink-soft"
                title="PsicoPlanilhas 2.0"
                aria-label="PsicoPlanilhas 2.0"
              >
                PP
              </Link>
            </div>
          ) : (
            <div>
              <Link
                href="/app"
                className="font-serif italic text-[22px] leading-tight text-pp-ink hover:text-pp-ink-soft transition duration-200 block"
              >
                PsicoPlanilhas 2.0
              </Link>
              <p className="font-serif italic text-xs text-pp-ink-soft mt-0.5">
                Área do cliente
              </p>
            </div>
          )}

          {/* Navegação */}
          <nav className={isDocStudioRoute ? 'flex flex-col items-center gap-1.5' : 'space-y-0.5'} aria-label="Navegação principal">
            {navItems.map((item) => {
              const isActive = !item.external && pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={
                    isDocStudioRoute
                      ? `relative flex h-11 w-11 items-center justify-center text-sm font-medium transition duration-200 ${
                          isActive
                            ? 'bg-pp-ink text-pp-canvas rounded-2xl shadow-sm'
                            : 'text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink rounded-2xl'
                        }`
                      : `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition duration-200 ${
                          isActive
                            ? 'bg-pp-ink text-pp-canvas rounded-pill'
                            : 'text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink rounded-lg'
                        }`
                  }
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={isDocStudioRoute ? item.name : undefined}
                  title={isDocStudioRoute ? item.name : undefined}
                >
                  <span className="shrink-0 opacity-90" aria-hidden={isDocStudioRoute ? 'true' : undefined}>{item.icon}</span>
                  {isDocStudioRoute ? (
                    <>
                      <span className="sr-only">{item.name}</span>
                      {item.badge && (
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-green-500 ring-2 ring-white" aria-hidden="true" />
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      {item.name}
                      {item.badge && (
                        <span className="text-[9px] font-semibold bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Área de saída */}
        <div className="p-4 border-t border-pp-hairline">
          <button
            onClick={handleSignOut}
            className={
              isDocStudioRoute
                ? 'flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-medium text-pp-danger transition duration-200 hover:bg-pp-danger/10'
                : 'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-pp-danger hover:bg-pp-danger/10 rounded-lg transition duration-200'
            }
            title={isDocStudioRoute ? 'Sair da Conta' : undefined}
            aria-label={isDocStudioRoute ? 'Sair da Conta' : undefined}
          >
            <IconLogout />
            {!isDocStudioRoute && <span>Sair da Conta</span>}
          </button>
        </div>
      </aside>

      {/* ── Conteúdo Principal ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topo mobile */}
        <header className="md:hidden bg-white border-b border-pp-hairline px-4 py-3 flex justify-between items-center">
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
          className="md:hidden bg-white border-b border-pp-hairline px-2 py-1.5 flex gap-0.5 overflow-x-auto"
          aria-label="Navegação mobile"
        >
          {navItems.map((item) => {
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
                    <span className="text-[8px] font-semibold bg-green-500 text-white px-1 py-0.5 rounded-full leading-none">
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
