'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  profile_type: string;
  status: string;
  activation_status: string;
  source: string | null;
  imported_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface Purchase {
  id: string;
  payment_status: string;
  source: string | null;
  purchased_at: string;
}

interface Subscription {
  id: string;
  status: string;
  started_at: string;
  expires_at: string;
  cancelled_at: string | null;
  payment_reference: string | null;
  source: string | null;
}

interface AdminLog {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
  admin: {
    name: string | null;
    email: string;
  } | null;
}

export default function AdminClienteDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for inline confirmations
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    action: string;
    title: string;
    message: string;
    metadata?: any;
  }>({ show: false, action: '', title: '', message: '' });

  // Custom date picker for expiration
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  const fetchClientDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (profErr || !prof) {
        throw new Error(profErr?.message || 'Cliente não encontrado.');
      }
      setProfile(prof);

      // 2. Fetch Lifetime Purchase
      const { data: purch } = await supabase
        .from('purchases')
        .select('id, payment_status, source, purchased_at, products(slug)')
        .eq('user_id', clientId)
        .eq('products.slug', 'psicoplanilhas-vitalicio')
        .maybeSingle();
      
      // Filter out non-matching products because of supabase query structure if needed
      setPurchase(purch as any);

      // 3. Fetch Subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, status, started_at, expires_at, cancelled_at, payment_reference, source, products(slug)')
        .eq('user_id', clientId)
        .eq('products.slug', 'assistente-ia-pro')
        .maybeSingle();

      setSubscription(sub as any);

      if (sub?.expires_at) {
        setCustomDate(new Date(sub.expires_at).toISOString().split('T')[0]);
      } else {
        // Default to +1 year
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        setCustomDate(nextYear.toISOString().split('T')[0]);
      }

      // 4. Fetch Admin Logs
      const { data: dbLogs } = await supabase
        .from('admin_logs')
        .select('id, action, created_at, metadata, admin_id')
        .eq('target_id', clientId)
        .order('created_at', { ascending: false });

      if (dbLogs && dbLogs.length > 0) {
        // Fetch admin profiles details
        const adminIds = Array.from(new Set(dbLogs.map((l) => l.admin_id).filter(Boolean)));
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', adminIds);

        const logsWithAdmins = dbLogs.map((log) => {
          const adminProf = adminProfiles?.find((p) => p.id === log.admin_id);
          return {
            id: log.id,
            action: log.action,
            created_at: log.created_at,
            metadata: log.metadata,
            admin: adminProf ? { name: adminProf.name, email: adminProf.email } : null,
          };
        });
        setLogs(logsWithAdmins);
      } else {
        setLogs([]);
      }

    } catch (err: any) {
      console.error('Error fetching details:', err);
      setErrorMsg(err.message || 'Erro ao carregar detalhes do cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, metadata?: any) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmModal({ show: false, action: '', title: '', message: '' });

    try {
      const response = await fetch(`/api/admin/clientes/${clientId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, metadata }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Erro ao executar ação.');
      }

      setSuccessMsg(resData.message);
      await fetchClientDetails(); // Reload data
    } catch (err: any) {
      console.error('Error running action:', err);
      setErrorMsg(err.message || 'Erro ao executar ação administrativa.');
    } finally {
      setActionLoading(false);
    }
  };

  const triggerConfirmation = (action: string, title: string, message: string, metadata?: any) => {
    setConfirmModal({ show: true, action, title, message, metadata });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatProfileType = (type: string) => {
    switch (type) {
      case 'psychologist':
        return 'Psicólogo';
      case 'psychopedagogue':
        return 'Psicopedagogo';
      case 'both':
        return 'Ambos';
      default:
        return 'Não Definido';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-955 text-white">
        Carregando detalhes do cliente...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-955 text-white p-6 space-y-4">
        <h1 className="text-2xl font-bold">Cliente não encontrado.</h1>
        <Link href="/admin/clientes" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg transition hover:bg-amber-400">
          Voltar para Clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-slate-950 text-slate-100 pb-16">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-amber-500 transition">Admin</Link>
              <span>/</span>
              <Link href="/admin/clientes" className="hover:text-amber-500 transition">Clientes</Link>
              <span>/</span>
              <span className="text-slate-300">Detalhes</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{profile.name || 'Sem Nome'}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
          </div>
          <Link
            href="/admin/clientes"
            className="px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition duration-200"
          >
            Voltar para Lista
          </Link>
        </header>

        {/* Global Success / Error Messages */}
        {errorMsg && (
          <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Confirmation Modal (Inline UI representation) */}
        {confirmModal.show && (
          <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center space-x-2 text-amber-400">
              <span className="text-xl">⚠️</span>
              <h3 className="text-lg font-bold">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex space-x-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => handleAction(confirmModal.action, confirmModal.metadata)}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition"
              >
                {actionLoading ? 'Confirmando...' : 'Confirmar e Executar'}
              </button>
              <button
                onClick={() => setConfirmModal({ show: false, action: '', title: '', message: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1: Profile & Access Controls (Left Area, Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Box 1: Core Profile Info */}
            <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Informações Cadastrais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Perfil Profissional</span>
                  <span className="text-slate-200 font-medium">{formatProfileType(profile.profile_type)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Telefone</span>
                  <span className="text-slate-200 font-medium">{profile.phone || 'Não cadastrado'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Status Cadastral</span>
                  <span className={`font-semibold ${profile.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profile.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Status de Ativação</span>
                  <span className={`font-semibold ${profile.activation_status === 'active' ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {profile.activation_status === 'active' ? 'Ativo (Senha Criada)' : 'Pendente de Ativação'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Último Login</span>
                  <span className="text-slate-300 font-medium text-xs">{formatDate(profile.last_login_at)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Criado Em</span>
                  <span className="text-slate-300 font-medium text-xs">{formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Access Management (Vitalicio and Assistant Pro) */}
            <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Gerenciamento de Acessos</h3>
              
              {/* Vitalicio Panel */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-200">Acesso Vitalício às Planilhas</h4>
                    <p className="text-xs text-slate-400">Libera o acesso permanente à biblioteca de planilhas de apoio operacional.</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${purchase && purchase.payment_status === 'manual' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-900 border border-slate-800'}`}>
                    {purchase && purchase.payment_status === 'manual' ? 'Liberado (Manual)' : 'Sem Acesso'}
                  </span>
                </div>
                <div className="flex space-x-3 pt-1">
                  {purchase && purchase.payment_status === 'manual' ? (
                    <button
                      disabled={actionLoading}
                      onClick={() => triggerConfirmation(
                        'cancelar-vitalicio', 
                        'Cancelar Acesso Vitalício', 
                        'Tem certeza que deseja revogar o acesso vitalício às planilhas profissionais para este cliente?'
                      )}
                      className="px-3 py-2 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition"
                    >
                      Revogar Acesso
                    </button>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('liberar-vitalicio')}
                      className="px-3 py-2 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition"
                    >
                      Liberar Acesso Vitalício
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 my-4"></div>

              {/* Assistant Pro Panel */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-slate-200">Assinatura do Assistente IA Pro (R$50/ano)</h4>
                    <p className="text-xs text-slate-400">Libera a geração inteligente de relatórios profissionais por 1 ano.</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${subscription && subscription.status === 'manual' && new Date(subscription.expires_at) >= new Date() ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-slate-500 bg-slate-900 border border-slate-800'}`}>
                    {subscription && subscription.status === 'manual' && new Date(subscription.expires_at) >= new Date() ? 'Ativo (Manual)' : 'Bloqueado 🔒'}
                  </span>
                </div>

                {subscription && subscription.status === 'manual' ? (
                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-lg border border-slate-800">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Vencimento Atual</span>
                        <span className="text-slate-200 font-medium">{formatDate(subscription.expires_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Iniciado Em</span>
                        <span className="text-slate-200 font-medium">{formatDate(subscription.started_at)}</span>
                      </div>
                    </div>

                    {/* Change expiration form */}
                    <div className="space-y-2 pt-2">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Alterar Data de Vencimento</label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none"
                        />
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAction('alterar-vencimento-pro', { expires_at: new Date(customDate).toISOString() })}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition"
                        >
                          Salvar Data
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => triggerConfirmation(
                          'cancelar-pro',
                          'Cancelar Assinatura',
                          'Tem certeza que deseja cancelar a assinatura do Assistente IA Pro para este cliente?'
                        )}
                        className="px-3 py-2 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition"
                      >
                        Cancelar Assinatura
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('ativar-pro')}
                      className="px-3 py-2 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition"
                    >
                      Ativar Assistente Pro (Manual)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Actions & Administrative Log Timeline (Right Area, Span 1) */}
          <div className="space-y-6">
            
            {/* Quick General Actions */}
            <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Ações Rápidas</h3>
              
              <div className="flex flex-col space-y-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('reenviar-ativacao')}
                  className="w-full py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition"
                >
                  Reenviar Link de Ativação
                </button>
                
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('enviar-reset')}
                  className="w-full py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition"
                >
                  Enviar Reset de Senha
                </button>

                <div className="border-t border-slate-800/80 my-2"></div>

                {profile.status === 'active' ? (
                  <button
                    disabled={actionLoading}
                    onClick={() => triggerConfirmation(
                      'bloquear',
                      'Bloquear Cliente',
                      'Tem certeza que deseja bloquear a conta deste cliente? Ele perderá imediatamente todo o acesso à plataforma.'
                    )}
                    className="w-full py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition"
                  >
                    Bloquear Conta
                  </button>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('desbloquear')}
                    className="w-full py-2.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition"
                  >
                    Desbloquear Conta
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Timeline */}
            <div className="p-6 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4 max-h-[420px] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Logs do Cliente</h3>
              
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Nenhuma ação administrativa registrada.</p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l border-slate-800 text-xs space-y-1">
                      <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-950"></div>
                      <div className="font-semibold text-slate-300 capitalize">{log.action}</div>
                      <div className="text-slate-500 text-[10px]">{formatDate(log.created_at)}</div>
                      <div className="text-[10px] text-slate-400">
                        Por: {log.admin ? `${log.admin.name || log.admin.email}` : 'Sistema'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
