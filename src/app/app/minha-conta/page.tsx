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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        Carregando dados cadastrais...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Minha Conta</h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie suas configurações cadastrais e perfis profissionais.</p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Info details */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Dados Cadastrais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Nome Completo</span>
                <span className="text-slate-200 font-medium">{profile?.name || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">E-mail</span>
                <span className="text-slate-200 font-medium">{profile?.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Telefone</span>
                <span className="text-slate-200 font-medium">{profile?.phone || 'Não cadastrado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Status da Conta</span>
                <span className="text-emerald-400 font-semibold uppercase text-xs">Ativa</span>
              </div>
            </div>
          </div>

          {/* Form to change profile type */}
          <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Perfil Profissional</h3>
            
            <form onSubmit={handleUpdateProfileType} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Qual sua área principal de atuação?</label>
                <select
                  value={profileType}
                  onChange={(e) => setProfileType(e.target.value)}
                  className="w-full md:max-w-md px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="psychologist">Psicólogo(a)</option>
                  <option value="psychopedagogue">Psicopedagogo(a) / Neuropsicopedagogo(a)</option>
                  <option value="both">Atuo nas duas áreas</option>
                  <option value="unknown">Prefiro responder depois</option>
                </select>
                <p className="text-[10px] text-slate-500 max-w-md leading-normal">
                  Utilizamos esta informação para sugerir os vídeo-banners comerciais e produtos complementares mais adequados ao seu dia a dia profissional.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition"
              >
                {saving ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Access Stats */}
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Seus Acessos</h3>
            
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Biblioteca de Planilhas</span>
                {stats?.has_lifetime_access ? (
                  <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    Acesso Vitalício Liberado
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-900 border border-slate-800 rounded-full">
                    Sem Acesso
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold">Assistente IA Pro</span>
                {stats?.has_active_assistant ? (
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full">
                      Ativo (Manual/Recorrente)
                    </span>
                    <div className="text-[10px] text-slate-500">Expira em: {formatDate(stats?.assistant_expires_at)}</div>
                  </div>
                ) : stats?.assistant_expires_at ? (
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full">
                      Assinatura Expirada
                    </span>
                    <div className="text-[10px] text-slate-500">Expirou em: {formatDate(stats?.assistant_expires_at)}</div>
                  </div>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-900 border border-slate-800 rounded-full">
                    Bloqueado 🔒
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
