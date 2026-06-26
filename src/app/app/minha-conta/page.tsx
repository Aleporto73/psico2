'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Lock } from 'lucide-react';

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
      setErrorMsg('Não foi possível carregar os dados da conta. Tente novamente.');
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
      setErrorMsg('Não foi possível atualizar o perfil profissional. Revise os dados e tente novamente.');
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
      <div className="flex h-[60vh] items-center justify-center text-pp-ink-soft">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p>Carregando dados cadastrais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header editorial */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">Minha conta</h1>
        <p className="text-pp-ink-soft text-base md:text-lg">Gerencie seus dados cadastrais e perfil profissional.</p>
      </header>

      {/* Mensagens */}
      {errorMsg && (
        <div className="p-4 text-base font-medium text-pp-danger bg-pp-danger/10 rounded-xl">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 text-base font-medium text-pp-success bg-pp-success/10 rounded-xl">
          {successMsg}
        </div>
      )}

      {/* Grid: Dados cadastrais (2/3) + Seus acessos (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Dados cadastrais */}
        <div className="md:col-span-2 bg-white border border-pp-hairline rounded-2xl p-6 space-y-5">
          <div className="space-y-1 border-b border-pp-hairline pb-3">
            <p className="font-serif italic text-pp-ink-soft text-sm">Seus dados</p>
            <h2 className="text-lg text-pp-ink font-medium">Dados cadastrais</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div className="space-y-1">
              <span className="text-pp-ink-soft block text-xs font-medium">Nome completo</span>
              <span className="text-pp-ink font-medium text-base">{profile?.name || 'Não informado'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-pp-ink-soft block text-xs font-medium">E-mail</span>
              <span className="text-pp-ink font-medium text-base break-all">{profile?.email}</span>
            </div>
            <div className="space-y-1">
              <span className="text-pp-ink-soft block text-xs font-medium">Telefone</span>
              <span className="text-pp-ink font-medium text-base">{profile?.phone || 'Não cadastrado'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-pp-ink-soft block text-xs font-medium">Status da conta</span>
              <span className="inline-block px-3 py-1 text-xs font-medium text-pp-success bg-pp-success/10 rounded-pill">
                Ativa
              </span>
            </div>
          </div>
        </div>

        {/* Seus acessos */}
        <div className="bg-white border border-pp-hairline rounded-2xl p-6 space-y-5">
          <div className="space-y-1 border-b border-pp-hairline pb-3">
            <p className="font-serif italic text-pp-ink-soft text-sm">O que você tem</p>
            <h2 className="text-lg text-pp-ink font-medium">Seus acessos</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <span className="text-pp-ink-soft block text-xs font-medium">Biblioteca de planilhas</span>
              {stats?.has_lifetime_access ? (
                <span className="inline-block px-3 py-1 text-xs font-medium text-pp-success bg-pp-success/10 rounded-pill">
                  Acesso vitalício liberado
                </span>
              ) : (
                <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink-soft bg-pp-hairline-soft rounded-pill">
                  Sem acesso
                </span>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-pp-ink-soft block text-xs font-medium">Assistente de Relatórios IA</span>
              {stats?.has_active_assistant ? (
                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-1 text-xs font-medium text-pp-success bg-pp-success/10 rounded-pill">
                    Ativo
                  </span>
                  <div className="text-xs text-pp-ink-soft">Expira em: {formatDate(stats?.assistant_expires_at)}</div>
                </div>
              ) : stats?.assistant_expires_at ? (
                <div className="space-y-1.5">
                  <span className="inline-block px-3 py-1 text-xs font-medium text-pp-danger bg-pp-danger/10 rounded-pill">
                    Assinatura expirada
                  </span>
                  <div className="text-xs text-pp-ink-soft">Expirou em: {formatDate(stats?.assistant_expires_at)}</div>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-pp-ink-soft bg-pp-hairline-soft rounded-pill">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Bloqueado
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Perfil profissional — full-width */}
      <div className="bg-white border border-pp-hairline rounded-2xl p-6 space-y-5">
        <div className="space-y-1 border-b border-pp-hairline pb-3">
          <p className="font-serif italic text-pp-ink-soft text-sm">Perfil profissional</p>
          <h2 className="text-lg text-pp-ink font-medium">Qual sua área principal de atuação?</h2>
        </div>

        <form onSubmit={handleUpdateProfileType} className="space-y-4">
          <div className="space-y-2">
            <select
              value={profileType}
              onChange={(e) => setProfileType(e.target.value)}
              className="w-full md:max-w-md px-4 py-3 bg-pp-canvas border border-pp-hairline rounded-xl text-base text-pp-ink focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
            >
              <option value="psychologist">Psicólogo(a)</option>
              <option value="psychopedagogue">Psicopedagogo(a) / Neuropsicopedagogo(a)</option>
              <option value="both">Atuo nas duas áreas</option>
              <option value="unknown">Prefiro responder depois</option>
            </select>
            <p className="text-xs text-pp-ink-soft max-w-md leading-relaxed">
              Usamos esta informação para sugerir os banners comerciais e produtos complementares mais adequados ao seu dia a dia profissional.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center bg-pp-ink text-pp-canvas px-7 py-3 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-pp-ink"
          >
            {saving ? 'Salvando...' : 'Salvar alteração'}
          </button>
        </form>
      </div>

    </div>
  );
}
