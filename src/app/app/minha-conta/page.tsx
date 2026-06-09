'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ProfileDetails {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  profile_type: string;
  status: string;
  activation_status: string;
}

interface ClientStats {
  has_lifetime_access: boolean;
  has_active_assistant: boolean;
  assistant_expires_at: string | null;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function AppMinhaContaPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [profileType, setProfileType] = useState('unknown');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profErr) throw profErr;
      setProfile(prof);
      setProfileType(prof.profile_type || 'unknown');

      // 2. Fetch Access stats from view
      const { data: accessStats } = await supabase
        .from('user_access_status')
        .select('has_lifetime_access, has_active_assistant, assistant_expires_at')
        .eq('user_id', user.id)
        .single();

      setStats(accessStats);
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setErrorMsg(err.message || 'Erro ao carregar dados da conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfileType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Update profiles setting profile_type. Allowed by own update check in RLS!
      const { error } = await supabase
        .from('profiles')
        .update({ profile_type: profileType })
        .eq('id', user.id);

      if (error) throw error;
      setSuccessMsg('Perfil profissional atualizado com sucesso!');
      await fetchAccountData();
    } catch (err: any) {
      console.error('Error updating profile type:', err);
      setErrorMsg(err.message || 'Erro ao atualizar perfil profissional.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[#CBD5E1]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p>Carregando dados cadastrais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Minha conta</h1>
        <p className="text-[#CBD5E1] text-base mt-1">Gerencie seus dados cadastrais e perfil profissional.</p>
      </div>

      {/* Messages */}
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

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Col: Info details */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Dados cadastrais</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div className="space-y-1">
                <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Nome completo</span>
                <span className="text-[#F8FAFC] font-medium text-base">{profile?.name || 'Não informado'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">E-mail</span>
                <span className="text-[#F8FAFC] font-medium text-base break-all">{profile?.email}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Telefone</span>
                <span className="text-[#F8FAFC] font-medium text-base">{profile?.phone || 'Não cadastrado'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Status da conta</span>
                <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-full">
                  Ativa
                </span>
              </div>
            </div>
          </div>

          {/* Form to change profile type */}
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Perfil profissional</h3>

            <form onSubmit={handleUpdateProfileType} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#CBD5E1] block">Qual sua área principal de atuação?</label>
                <select
                  value={profileType}
                  onChange={(e) => setProfileType(e.target.value)}
                  className="w-full md:max-w-md px-4 py-3 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition"
                >
                  <option value="psychologist">Psicólogo(a)</option>
                  <option value="psychopedagogue">Psicopedagogo(a) / Neuropsicopedagogo(a)</option>
                  <option value="both">Atuo nas duas áreas</option>
                  <option value="unknown">Prefiro responder depois</option>
                </select>
                <p className="text-xs text-[#94A3B8] max-w-md leading-relaxed">
                  Usamos esta informação para sugerir os banners comerciais e produtos complementares mais adequados ao seu dia a dia profissional.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-7 py-3 text-base font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] rounded-xl transition shadow-md shadow-[#7DD3FC]/15"
              >
                {saving ? 'Salvando...' : 'Salvar alteração'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Access Stats */}
        <div className="space-y-6">
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[#1F4D5C] pb-3">Seus acessos</h3>

            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Biblioteca de planilhas</span>
                {stats?.has_lifetime_access ? (
                  <span className="inline-block px-3 py-1 text-xs font-bold text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-full">
                    Acesso vitalício liberado
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 text-xs font-medium text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] rounded-full">
                    Sem acesso
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[#94A3B8] block text-xs uppercase tracking-wider font-semibold">Assistente IA Pro</span>
                {stats?.has_active_assistant ? (
                  <div className="space-y-1.5">
                    <span className="inline-block px-3 py-1 text-xs font-bold text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full">
                      Ativo
                    </span>
                    <div className="text-xs text-[#94A3B8]">Expira em: {formatDate(stats?.assistant_expires_at)}</div>
                  </div>
                ) : stats?.assistant_expires_at ? (
                  <div className="space-y-1.5">
                    <span className="inline-block px-3 py-1 text-xs font-bold text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-full">
                      Assinatura expirada
                    </span>
                    <div className="text-xs text-[#94A3B8]">Expirou em: {formatDate(stats?.assistant_expires_at)}</div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] rounded-full">
                    <IconLock /> Bloqueado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
