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

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
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

  const isManualManagedPro = (sub: Subscription | null) =>
    !!sub && (sub.status === 'manual' || !['asaas', 'paymentbeta'].includes(sub.source || ''));

  const isActivePro = (sub: Subscription | null) =>
    !!sub && ['active', 'manual'].includes(sub.status) && new Date(sub.expires_at) >= new Date();

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
      const { data: purchRows } = await supabase
        .from('purchases')
        .select('id, payment_status, source, purchased_at, products!inner(slug)')
        .eq('user_id', clientId)
        .eq('products.slug', 'psicoplanilhas-vitalicio')
        .in('payment_status', ['paid', 'manual'])
        .order('purchased_at', { ascending: false })
        .limit(1);

      setPurchase((purchRows?.[0] ?? null) as any);

      // 3. Fetch Subscription
      const { data: subRows } = await supabase
        .from('subscriptions')
        .select('id, status, started_at, expires_at, cancelled_at, payment_reference, source, products!inner(slug)')
        .eq('user_id', clientId)
        .eq('products.slug', 'assistente-ia-pro')
        .in('status', ['active', 'manual'])
        .order('expires_at', { ascending: false })
        .limit(1);

      const sub = subRows?.[0] ?? null;
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
        return 'Não definido';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061923] text-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p className="text-[#CBD5E1]">Carregando detalhes do cliente...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#061923] text-[#F8FAFC] p-6 space-y-4">
        <h1 className="text-2xl font-bold">Cliente não encontrado.</h1>
        <Link href="/admin/clientes" className="px-6 py-3 bg-[#7DD3FC] text-[#061923] font-bold rounded-xl transition hover:bg-[#67E8F9]">
          Voltar para clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#061923] text-[#F8FAFC] pb-16">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-[#1F4D5C] gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#94A3B8] mb-1">
              <Link href="/admin" className="hover:text-[#7DD3FC] transition">Admin</Link>
              <span>/</span>
              <Link href="/admin/clientes" className="hover:text-[#7DD3FC] transition">Clientes</Link>
              <span>/</span>
              <span className="text-[#CBD5E1]">Detalhes</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">{profile.name || 'Sem nome'}</h1>
            <p className="text-[#CBD5E1] text-base mt-0.5">{profile.email}</p>
          </div>
          <Link
            href="/admin/clientes"
            className="px-5 py-2.5 text-sm bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] rounded-xl transition duration-200 self-start md:self-auto"
          >
            Voltar para lista
          </Link>
        </header>

        {/* Global Success / Error Messages */}
        {errorMsg && (
          <div className="p-4 text-base font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-4 text-base font-medium text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Confirmation Modal (Inline UI representation) */}
        {confirmModal.show && (
          <div className="p-6 bg-[#FACC15]/10 border border-[#FACC15]/30 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-[#FACC15]">
              <IconAlert />
              <h3 className="text-lg font-bold">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">{confirmModal.message}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => handleAction(confirmModal.action, confirmModal.metadata)}
                className="px-5 py-2.5 text-sm font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition"
              >
                {actionLoading ? 'Confirmando...' : 'Confirmar e executar'}
              </button>
              <button
                onClick={() => setConfirmModal({ show: false, action: '', title: '', message: '' })}
                className="px-5 py-2.5 text-sm font-semibold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition"
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
            <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
              <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Informações cadastrais</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="space-y-1">
                  <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Perfil profissional</span>
                  <span className="text-[#F8FAFC] font-medium text-base">{formatProfileType(profile.profile_type)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Telefone</span>
                  <span className="text-[#F8FAFC] font-medium text-base">{profile.phone || 'Não cadastrado'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Status cadastral</span>
                  <span className={`font-semibold text-base ${profile.status === 'active' ? 'text-[#34D399]' : 'text-[#FB7185]'}`}>
                    {profile.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Status de ativação</span>
                  <span className={`font-semibold text-base ${profile.activation_status === 'active' ? 'text-[#34D399]' : 'text-[#FACC15]'}`}>
                    {profile.activation_status === 'active' ? 'Ativo (senha criada)' : 'Pendente de ativação'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Último login</span>
                  <span className="text-[#CBD5E1] font-medium text-sm">{formatDate(profile.last_login_at)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Criado em</span>
                  <span className="text-[#CBD5E1] font-medium text-sm">{formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Access Management (Vitalicio and Assistant Pro) */}
            <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-6">
              <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Gerenciamento de acessos</h3>

              {/* Vitalicio Panel */}
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-[#F8FAFC] text-base">Acesso vitalício às planilhas</h4>
                    <p className="text-sm text-[#CBD5E1] leading-relaxed">Libera o acesso permanente à biblioteca de planilhas de apoio operacional.</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${purchase && ['paid', 'manual'].includes(purchase.payment_status) ? 'text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20' : 'text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C]'}`}>
                    {purchase && ['paid', 'manual'].includes(purchase.payment_status) ? `Liberado (${purchase.payment_status === 'manual' ? 'manual' : 'pago'})` : 'Sem acesso'}
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
                      className="px-4 py-2.5 text-sm font-bold bg-[#FB7185]/10 hover:bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/20 rounded-xl transition"
                    >
                      Revogar acesso
                    </button>
                  ) : purchase && purchase.payment_status === 'paid' ? (
                    <p className="text-xs text-[#94A3B8]">
                      Acesso pago detectado. Cancelamento deve seguir o fluxo de pagamento oficial.
                    </p>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('liberar-vitalicio')}
                      className="px-4 py-2.5 text-sm font-bold bg-[#34D399]/10 hover:bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/20 rounded-xl transition"
                    >
                      Liberar acesso vitalício
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-[#1F4D5C]"></div>

              {/* Assistant Pro Panel */}
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-[#F8FAFC] text-base">Assinatura do Assistente IA Pro (R$50/ano)</h4>
                    <p className="text-sm text-[#CBD5E1] leading-relaxed">Libera a geração inteligente de relatórios profissionais por 1 ano.</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full ${isActivePro(subscription) ? 'text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20' : 'text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C]'}`}>
                    {isActivePro(subscription) ? `Ativo (${isManualManagedPro(subscription) ? 'manual' : 'pago'})` : (<><IconLock /> Bloqueado</>)}
                  </span>
                </div>

                {isActivePro(subscription) && isManualManagedPro(subscription) ? (
                  <div className="space-y-4 p-4 bg-[#0E2A38] rounded-xl border border-[#1F4D5C]">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-[#94A3B8] block text-xs">Vencimento atual</span>
                        <span className="text-[#F8FAFC] font-semibold">{formatDate(subscription.expires_at)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#94A3B8] block text-xs">Iniciado em</span>
                        <span className="text-[#F8FAFC] font-semibold">{formatDate(subscription.started_at)}</span>
                      </div>
                    </div>

                    {/* Change expiration form */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Alterar data de vencimento</label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="px-3 py-2 bg-[#061923] border border-[#1F4D5C] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC]"
                        />
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAction('alterar-vencimento-pro', { expires_at: new Date(customDate).toISOString() })}
                          className="px-4 py-2 text-sm font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] rounded-xl transition"
                        >
                          Salvar data
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-1">
                      <button
                        disabled={actionLoading}
                        onClick={() => triggerConfirmation(
                          'cancelar-pro',
                          'Cancelar Assinatura',
                          'Tem certeza que deseja cancelar a assinatura do Assistente IA Pro para este cliente?'
                        )}
                        className="px-4 py-2.5 text-sm font-bold bg-[#FB7185]/10 hover:bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/20 rounded-xl transition"
                      >
                        Cancelar assinatura
                      </button>
                    </div>
                  </div>
                ) : isActivePro(subscription) ? (
                  <div className="space-y-4 p-4 bg-[#0E2A38] rounded-xl border border-[#1F4D5C]">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-[#94A3B8] block text-xs">Vencimento atual</span>
                        <span className="text-[#F8FAFC] font-semibold">{formatDate(subscription.expires_at)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#94A3B8] block text-xs">Iniciado em</span>
                        <span className="text-[#F8FAFC] font-semibold">{formatDate(subscription.started_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Assinatura paga detectada. Alterações e cancelamento devem seguir o fluxo de pagamento oficial.
                    </p>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAction('ativar-pro')}
                      className="px-4 py-2.5 text-sm font-bold bg-[#7DD3FC]/10 hover:bg-[#7DD3FC]/20 text-[#7DD3FC] border border-[#7DD3FC]/20 rounded-xl transition"
                    >
                      Ativar Assistente Pro (manual)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Actions & Administrative Log Timeline (Right Area, Span 1) */}
          <div className="space-y-6">

            {/* Quick General Actions */}
            <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-4">
              <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Ações rápidas</h3>

              <div className="flex flex-col space-y-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('reenviar-ativacao')}
                  className="w-full py-3 text-sm font-bold bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] text-[#F8FAFC] rounded-xl transition"
                >
                  Reenviar link de ativação
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('enviar-reset')}
                  className="w-full py-3 text-sm font-bold bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] text-[#F8FAFC] rounded-xl transition"
                >
                  Enviar reset de senha
                </button>

                <div className="border-t border-[#1F4D5C] my-2"></div>

                {profile.status === 'active' ? (
                  <button
                    disabled={actionLoading}
                    onClick={() => triggerConfirmation(
                      'bloquear',
                      'Bloquear Cliente',
                      'Tem certeza que deseja bloquear a conta deste cliente? Ele perderá imediatamente todo o acesso à plataforma.'
                    )}
                    className="w-full py-3 text-sm font-bold bg-[#FB7185]/10 hover:bg-[#FB7185]/20 border border-[#FB7185]/20 text-[#FB7185] rounded-xl transition"
                  >
                    Bloquear conta
                  </button>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('desbloquear')}
                    className="w-full py-3 text-sm font-bold bg-[#34D399]/10 hover:bg-[#34D399]/20 border border-[#34D399]/20 text-[#34D399] rounded-xl transition"
                  >
                    Desbloquear conta
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Timeline */}
            <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-4 max-h-[420px] overflow-y-auto">
              <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Logs do cliente</h3>

              {logs.length === 0 ? (
                <p className="text-sm text-[#94A3B8] text-center py-4">Nenhuma ação administrativa registrada.</p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l border-[#1F4D5C] text-xs space-y-1">
                      <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#7DD3FC] border border-[#061923]"></div>
                      <div className="font-semibold text-[#F8FAFC] capitalize text-sm">{log.action}</div>
                      <div className="text-[#94A3B8] text-xs">{formatDate(log.created_at)}</div>
                      <div className="text-xs text-[#CBD5E1]">
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
