'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

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

function IconHelp() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 1.8-2.5 2-2.5 3.7" />
      <path d="M12 17h.01" />
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

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  badgeTone?: 'neutral' | 'pink';
  external?: boolean;
};

type NavGroup = {
  label?: string;
  labelBadge?: string;
  labelBadgeTone?: 'neutral' | 'pink';
  separatorBefore?: boolean;
  items: NavItem[];
};

export function AppShell({ children, hasDocStudioAccess }: { children: React.ReactNode; hasDocStudioAccess: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const navGroups: NavGroup[] = [
    { items: [
      { name: 'Dashboard', path: '/app', icon: <IconDashboard /> },
      { name: 'Minhas Planilhas', path: '/app/planilhas', icon: <IconPlanilhas /> },
    ] },
    { label: 'Ferramentas incluídas', items: [
      { name: 'Studio DOC', path: '/app/doc-studio', icon: <IconDoc />, badge: 'Novo', badgeTone: 'pink' },
      { name: 'Relatório', path: '/app/assistente-gpt', icon: <IconChat /> },
      { name: 'ABA', path: '/app/assistente-aba', icon: <IconChat /> },
      { name: 'Laudos', path: '/app/assistente-laudos', icon: <IconChat /> },
    ] },
    { separatorBefore: true, label: 'Ferramentas upgrade', items: [
      { name: 'Relatório Pró', path: '/app/assistente-pro', icon: <IconSpark />, badge: 'Novo' },
      { name: 'Psico Flow', path: '/app/flow', icon: <IconFlow />, badge: 'Novo' },
    ] },
    { separatorBefore: true, items: [
      { name: 'Produtos', path: '/app/produtos', icon: <IconProducts /> },
      { name: 'Quem pode aplicar?', path: '/app/ajuda', icon: <IconHelp /> },
      { name: 'Minha Conta', path: '/app/minha-conta', icon: <IconUser /> },
    ] },
  ];

  const flatItems = navGroups.flatMap((group) => group.items.map((item) => ({ item, groupBadge: group.labelBadge })));
  const badgeClass = (tone?: 'neutral' | 'pink') => tone === 'neutral' ? 'border border-current opacity-60' : tone === 'pink' ? 'bg-pink-500 text-white' : 'bg-green-500 text-white';
  const collapsed = hasDocStudioAccess && (pathname === '/app/doc-studio' || pathname.startsWith('/app/doc-studio/'));

  const renderNavLink = (item: NavItem, groupBadge?: string) => {
    const isActive = !item.external && pathname === item.path;
    const showDot = Boolean(item.badge || groupBadge);
    return (
      <Link key={item.path} href={item.path} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={collapsed ? `relative flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-medium transition duration-200 ${isActive ? 'bg-pp-ink text-pp-canvas shadow-sm' : 'text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink'}` : `flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition duration-200 ${isActive ? 'rounded-pill bg-pp-ink text-pp-canvas' : 'rounded-lg text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink'}`} aria-current={isActive ? 'page' : undefined} aria-label={collapsed ? item.name : undefined} title={collapsed ? item.name : undefined}>
        <span className="shrink-0 opacity-90" aria-hidden={collapsed ? 'true' : undefined}>{item.icon}</span>
        {collapsed ? (
          showDot && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-green-500 ring-2 ring-white" aria-hidden="true" />
        ) : (
          <span className="flex w-full items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            {item.badge && <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${badgeClass(item.badgeTone)}`}>{item.badge}</span>}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-pp-canvas font-sans text-pp-ink">
      <aside className={`hidden shrink-0 flex-col justify-between border-r border-pp-hairline bg-white md:flex print:hidden ${collapsed ? 'w-[76px]' : 'w-64'}`}>
        <div className={collapsed ? 'space-y-7 px-3 py-5' : 'space-y-8 p-6'}>
          <div>
            {collapsed ? (
              <Link href="/app" className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pp-accent-soft font-serif text-lg italic text-pp-ink transition duration-200 hover:text-pp-ink-soft" aria-label="PsicoPlanilhas 2.0" title="PsicoPlanilhas 2.0">PP</Link>
            ) : (
              <>
                <Link href="/app" className="block font-serif text-[22px] italic leading-tight text-pp-ink transition duration-200 hover:text-pp-ink-soft">PsicoPlanilhas 2.0</Link>
                <p className="mt-0.5 font-serif text-xs italic text-pp-ink-soft">Área do cliente</p>
              </>
            )}
          </div>

          <nav className={collapsed ? 'flex flex-col items-center gap-1.5' : 'space-y-0.5'} aria-label="Navegação principal">
            {collapsed ? flatItems.map(({ item, groupBadge }) => renderNavLink(item, groupBadge)) : navGroups.map((group, groupIndex) => (
              <div key={group.label ?? `g${groupIndex}`}>
                {group.separatorBefore && <hr className="my-2 border-t border-pp-hairline" />}
                {group.label && (
                  <div className="flex items-center gap-2 px-3 pb-1 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pp-ink-soft">{group.label}</span>
                    {group.labelBadge && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${badgeClass(group.labelBadgeTone)}`}>{group.labelBadge}</span>}
                  </div>
                )}
                <div className="space-y-0.5">{group.items.map((item) => renderNavLink(item, group.labelBadge))}</div>
              </div>
            ))}
          </nav>
        </div>

        <div className={`border-t border-pp-hairline p-4 ${collapsed ? 'flex justify-center' : ''}`}>
          <button onClick={handleSignOut} className={collapsed ? 'flex h-11 w-11 items-center justify-center rounded-2xl text-pp-danger transition duration-200 hover:bg-pp-danger/10' : 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-pp-danger transition duration-200 hover:bg-pp-danger/10'} title={collapsed ? 'Sair da Conta' : undefined} aria-label={collapsed ? 'Sair da Conta' : undefined}>
            <IconLogout />
            {!collapsed && <span>Sair da Conta</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-pp-hairline bg-white px-4 py-3 md:hidden print:hidden">
          <Link href="/app" className="font-serif text-lg italic leading-tight text-pp-ink">PsicoPlanilhas</Link>
          <div className="flex items-center gap-4">
            <Link href="/app/minha-conta" className="text-sm text-pp-ink-soft transition hover:text-pp-ink">Conta</Link>
            <button onClick={handleSignOut} className="text-sm text-pp-danger transition hover:text-pp-danger/80">Sair</button>
          </div>
        </header>

        <nav className="flex gap-0.5 overflow-x-auto border-b border-pp-hairline bg-white px-2 py-1.5 md:hidden print:hidden" aria-label="Navegação mobile">
          {flatItems.map(({ item }) => {
            const isActive = !item.external && pathname === item.path;
            return (
              <Link key={item.path} href={item.path} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={`flex shrink-0 flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold transition duration-200 ${isActive ? 'rounded-pill bg-pp-ink text-pp-canvas' : 'rounded-lg text-pp-ink-soft hover:bg-pp-hairline-soft hover:text-pp-ink'}`} aria-current={isActive ? 'page' : undefined}>
                <span className="opacity-90">{item.icon}</span>
                <span className="hidden items-center gap-1 leading-none sm:flex">{item.name}{item.badge && <span className={`rounded-full px-1 py-0.5 text-[8px] font-semibold leading-none ${badgeClass(item.badgeTone)}`}>{item.badge}</span>}</span>
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
