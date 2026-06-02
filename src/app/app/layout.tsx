'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: '📊' },
    { name: 'Minhas Planilhas', path: '/app/planilhas', icon: '📋' },
    { name: 'Assistente GPT', path: '/app/assistente-gpt', icon: '🤖' },
    { name: 'Assistente IA Pro', path: '/app/assistente-pro', icon: '✨' },
    { name: 'Produtos', path: '/app/produtos', icon: '🛍️' },
    { name: 'Minha Conta', path: '/app/minha-conta', icon: '👤' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex">
        <div className="p-6 space-y-8">
          {/* Logo area */}
          <div>
            <Link href="/app" className="text-xl font-black bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">
              PsicoPlanilhas 2.0
            </Link>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Área do Cliente</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition duration-200 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Exit Area */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition duration-200"
          >
            <span>🚪</span>
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top nav */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
          <Link href="/app" className="text-lg font-black text-amber-500">
            PsicoPlanilhas
          </Link>
          <div className="flex space-x-3">
            <Link href="/app/minha-conta" className="text-slate-400 text-sm">Conta</Link>
            <button onClick={handleSignOut} className="text-red-400 text-sm">Sair</button>
          </div>
        </header>

        {/* Mobile nav bar menu (inline simple navigation for mobile) */}
        <nav className="md:hidden bg-slate-900 border-b border-slate-800 p-2 flex justify-around text-xs font-semibold text-slate-400 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`px-2 py-1.5 rounded transition shrink-0 ${
                  isActive ? 'text-amber-500 font-bold' : ''
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Children components pages */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
