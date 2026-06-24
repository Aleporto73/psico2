'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconClients() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconBanner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  );
}

function IconCatalog() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stats, setStats] = useState({
    totalClients: 0,
    pendingActivation: 0,
    activeSubscriptions: 0,
    logsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 1. Total Clients
      const { count: clientCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 2. Pending Activation
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('activation_status', 'pending_activation');

      // 3. Active Pro Subscriptions
      const { count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'manual'])
        .gte('expires_at', new Date().toISOString());

      // 4. Logs count
      const { count: logs } = await supabase
        .from('admin_logs')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalClients: clientCount || 0,
        pendingActivation: pendingCount || 0,
        activeSubscriptions: subCount || 0,
        logsCount: logs || 0,
      });
    } catch (err) {
      console.error('Error fetching admin counts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const shortcuts = [
    { href: '/admin/clientes',   icon: <IconClients />, title: 'Gerenciar clientes',         desc: 'Busque usuários, libere/cancele acessos vitalícios e ative a assinatura do Assistente IA Pro.' },
    { href: '/admin/importacao', icon: <IconUpload />,  title: 'Importação CSV / Cadastro',  desc: 'Suba listas de e-mails de clientes antigos ou cadastre clientes manualmente.' },
    { href: '/admin/banners',    icon: <IconBanner />,  title: 'Vídeo-banners comerciais',   desc: 'Cadastre e configure os banners comerciais segmentados por perfil de atuação.' },
    { href: '/admin/banners-canva', icon: <IconBanner />, title: 'Banners Canva',            desc: 'Suba imagens prontas do Canva para o HeroBanner do dashboard, planilhas e produtos.' },
    { href: '/admin/produtos',   icon: <IconCatalog />, title: 'Catálogo de produtos',       desc: 'Adicione ou edite produtos complementares, assistentes, bundles e links de checkout.' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#061923] text-[#F8FAFC]">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-[#1F4D5C] gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">Painel do administrador</h1>
            <p className="text-[#CBD5E1] text-base mt-1">Gestão operacional do PsicoPlanilhas 2.0.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-5 py-2.5 text-sm font-bold bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] rounded-xl transition duration-200 self-start md:self-auto"
          >
            Sair
          </button>
        </header>

        {/* Real-time counters */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C]">
            <h4 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Clientes totais</h4>
            <div className="text-3xl font-bold mt-2 text-[#F8FAFC]">
              {loading ? '...' : stats.totalClients}
            </div>
          </div>
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C]">
            <h4 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Ativações pendentes</h4>
            <div className="text-3xl font-bold mt-2 text-[#FACC15]">
              {loading ? '...' : stats.pendingActivation}
            </div>
          </div>
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C]">
            <h4 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Assinaturas Pro ativas</h4>
            <div className="text-3xl font-bold mt-2 text-[#34D399]">
              {loading ? '...' : stats.activeSubscriptions}
            </div>
          </div>
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C]">
            <h4 className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Logs registrados</h4>
            <div className="text-3xl font-bold mt-2 text-[#7DD3FC]">
              {loading ? '...' : stats.logsCount}
            </div>
          </div>
        </section>

        {/* Dashboard Shortcuts */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-[#F8FAFC]">Controles e operações</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-start gap-4 p-6 bg-[#0B2430] hover:bg-[#0E2A38] border border-[#1F4D5C] hover:border-[#7DD3FC]/40 rounded-2xl transition duration-200 text-left"
              >
                <span className="shrink-0 mt-0.5 text-[#7DD3FC]">{s.icon}</span>
                <div className="min-w-0 space-y-1.5">
                  <span className="block font-bold text-lg text-[#F8FAFC]">{s.title}</span>
                  <span className="block text-sm text-[#CBD5E1] leading-relaxed">{s.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="pt-8 text-center text-[#94A3B8]/70 text-xs">
          Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
        </footer>
      </div>
    </div>
  );
}
