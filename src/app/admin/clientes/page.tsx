'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface ClientAccessStatus {
  user_id: string;
  name: string | null;
  email: string;
  profile_type: string;
  status: string;
  activation_status: string;
  last_login_at: string | null;
  has_lifetime_access: boolean;
  has_active_assistant: boolean;
  assistant_expires_at: string | null;
}

export default function AdminClientesPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<ClientAccessStatus[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Query the user_access_status view
      const { data, error } = await supabase
        .from('user_access_status')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Erro ao carregar lista de clientes.');
      }

      setClients(data || []);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setErrorMsg(err.message || 'Ocorreu um erro ao carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase();
    const nameMatch = client.name?.toLowerCase().includes(term);
    const emailMatch = client.email.toLowerCase().includes(term);
    return nameMatch || emailMatch;
  });

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

  return (
    <div className="min-h-screen p-8 bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-slate-800 space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-amber-500 transition">Admin</Link>
              <span>/</span>
              <span className="text-slate-300">Clientes</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Clientes</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie acessos vitalícios, assinaturas e status de clientes antigos e novos.</p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href="/admin"
              className="px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition duration-200"
            >
              Voltar ao Início
            </Link>
          </div>
        </header>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Search Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800">
          <div className="w-full md:max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition duration-200"
            />
          </div>
          <div className="text-sm text-slate-400">
            Mostrando {filteredClients.length} de {clients.length} clientes
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Carregando dados dos clientes...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum cliente encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Perfil</th>
                    <th className="p-4">Vitalício</th>
                    <th className="p-4">Assistente Pro</th>
                    <th className="p-4">Ativação</th>
                    <th className="p-4">Último Login</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {filteredClients.map((client) => (
                    <tr key={client.user_id} className="hover:bg-slate-900/30 transition">
                      <td className="p-4">
                        <div className="font-semibold text-white">{client.name || 'Sem nome'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{client.email}</div>
                      </td>
                      <td className="p-4 text-slate-300">
                        {formatProfileType(client.profile_type)}
                      </td>
                      <td className="p-4">
                        {client.has_lifetime_access ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-900 border border-slate-800 rounded-full">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {client.has_active_assistant ? (
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full">
                              Ativo
                            </span>
                            <div className="text-[10px] text-slate-500">Expira: {formatDate(client.assistant_expires_at).split(',')[0]}</div>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-900 border border-slate-800 rounded-full">
                            Bloqueado 🔒
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {client.activation_status === 'active' ? (
                          <span className="inline-block px-2 py-0.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-md">Ativo</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-xs text-amber-500 bg-amber-500/10 rounded-md">Pendente</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        {formatDate(client.last_login_at)}
                      </td>
                      <td className="p-4">
                        {client.status === 'active' ? (
                          <span className="text-emerald-400 font-medium">Ativo</span>
                        ) : (
                          <span className="text-red-400 font-medium">Bloqueado</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/clientes/${client.user_id}`}
                          className="inline-block px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition duration-200"
                        >
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
