'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

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

      // 3. Active Subscriptions
      const { count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'manual');

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

  return (
    <div className="min-h-screen p-8 bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight">Painel do Administrador</h1>
            <p className="text-slate-400 text-sm mt-1">Gestão operacional do PsicoPlanilhas 2.0.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition duration-200"
          >
            Sair
          </button>
        </header>

        {/* Real-time counters */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-850 shadow-md">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Clientes Totais</h4>
            <div className="text-3xl font-bold mt-2 text-white">
              {loading ? '...' : stats.totalClients}
            </div>
          </div>
          <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-850 shadow-md">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ativações Pendentes</h4>
            <div className="text-3xl font-bold mt-2 text-amber-500">
              {loading ? '...' : stats.pendingActivation}
            </div>
          </div>
          <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-850 shadow-md">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Assinaturas Pro Ativas</h4>
            <div className="text-3xl font-bold mt-2 text-emerald-400">
              {loading ? '...' : stats.activeSubscriptions}
            </div>
          </div>
          <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-850 shadow-md">
            <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Logs Registrados</h4>
            <div className="text-3xl font-bold mt-2 text-slate-400">
              {loading ? '...' : stats.logsCount}
            </div>
          </div>
        </section>

        {/* Dashboard Shortcuts */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300">Controles e Operações</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/admin/clientes"
              className="flex flex-col p-6 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700/80 rounded-xl border border-slate-850/80 transition duration-200 text-left"
            >
              <span className="font-bold text-lg text-white">Gerenciar Clientes</span>
              <span className="text-xs text-slate-400 mt-2">Busque usuários, libere/cancele acessos vitalícios e ative a assinatura do Assistente IA Pro.</span>
            </Link>

            <Link
              href="/admin/importacao"
              className="flex flex-col p-6 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700/80 rounded-xl border border-slate-850/80 transition duration-200 text-left"
            >
              <span className="font-bold text-lg text-white">Importação CSV (Base Antiga)</span>
              <span className="text-xs text-slate-400 mt-2">Suba listas de e-mails de clientes antigos para integrá-los de forma idempotente e segura no sistema.</span>
            </Link>

            <Link
              href="/admin/banners"
              className="flex flex-col p-6 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700/80 rounded-xl border border-slate-850/80 transition duration-200 text-left"
            >
              <span className="font-bold text-lg text-white">Vídeo-Banners Comerciais</span>
              <span className="text-xs text-slate-400 mt-2">Cadastre e configure os vídeo-banners comerciais segmentados por perfil de atuação.</span>
            </Link>

            <Link
              href="/admin/produtos"
              className="flex flex-col p-6 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700/80 rounded-xl border border-slate-850/80 transition duration-200 text-left"
            >
              <span className="font-bold text-lg text-white">Catálogo de Produtos</span>
              <span className="text-xs text-slate-400 mt-2">Adicione ou edite produtos complementares, assistentes virtuais, bundles e links de checkouts.</span>
            </Link>
          </div>
        </section>

        <footer className="pt-8 text-center text-slate-700 text-xs">
          Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
        </footer>
      </div>
    </div>
  );
}
