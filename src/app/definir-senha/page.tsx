'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function DefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      // 1. Update the password in Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError || !user) {
        throw new Error(authError?.message || 'Não foi possível definir a nova senha. O link pode ter expirado.');
      }

      // 2. Mark activation_status as active in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          activation_status: 'active',
          last_login_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('Silent warning: could not update profile activation_status:', profileError);
      }

      setSuccess(true);
      
      // 3. Redirect to customer application dashboard
      setTimeout(() => {
        router.push('/app');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao definir sua senha.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800/80">
        
        {/* Title */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent">
            Crie sua Nova Senha
          </h1>
          <p className="text-slate-400 text-sm">
            Defina sua credencial de acesso para garantir a segurança da sua conta.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="p-4 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center space-y-2">
            <p className="font-semibold text-lg">Senha Definida com Sucesso!</p>
            <p className="text-slate-400 text-xs">Redirecionando você para a área de membros...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nova Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="No mínimo 6 caracteres"
                className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition duration-200 shadow-md shadow-amber-500/10"
            >
              {loading ? 'Redefinindo...' : 'Salvar Senha e Acessar'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-600 max-w-sm">
        Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação profissional.
      </div>
    </div>
  );
}
