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

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
        return 'Não definido';
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#061923] text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-[#1F4D5C] gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#94A3B8] mb-1">
              <Link href="/admin" className="hover:text-[#7DD3FC] transition">Admin</Link>
              <span>/</span>
              <span className="text-[#CBD5E1]">Clientes</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Clientes</h1>
            <p className="text-[#CBD5E1] text-base mt-1">Gerencie acessos vitalícios, assinaturas e status de clientes antigos e novos.</p>
          </div>

          <div className="flex space-x-3">
            <Link
              href="/admin"
              className="px-5 py-2.5 text-sm bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] rounded-xl transition duration-200"
            >
              Voltar ao início
            </Link>
          </div>
        </header>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 text-base font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Search Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0B2430] rounded-2xl border border-[#1F4D5C]">
          <div className="w-full md:max-w-md relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
            />
          </div>
          <div className="text-sm text-[#CBD5E1]">
            Mostrando {filteredClients.length} de {clients.length} clientes
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-[#0B2430] rounded-2xl border border-[#1F4D5C] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[#CBD5E1]">
              <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto mb-3" />
              Carregando dados dos clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-10 text-center text-[#CBD5E1] space-y-2">
              <p className="text-base">Nenhum cliente encontrado.</p>
              <p className="text-sm text-[#94A3B8]">Tente ajustar a busca.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F4D5C] bg-[#0E2A38] text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Perfil</th>
                    <th className="p-4">Vitalício</th>
                    <th className="p-4">Assistente Pro</th>
                    <th className="p-4">Ativação</th>
                    <th className="p-4">Último login</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F4D5C]/60 text-sm">
                  {filteredClients.map((client) => (
                    <tr key={client.user_id} className="hover:bg-[#0E2A38]/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-[#F8FAFC]">{client.name || 'Sem nome'}</div>
                        <div className="text-xs text-[#94A3B8] mt-0.5">{client.email}</div>
                      </td>
                      <td className="p-4 text-[#CBD5E1]">
                        {formatProfileType(client.profile_type)}
                      </td>
                      <td className="p-4">
                        {client.has_lifetime_access ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-full">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-medium text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] rounded-full">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {client.has_active_assistant ? (
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-0.5 text-xs font-bold text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full">
                              Ativo
                            </span>
                            <div className="text-[10px] text-[#94A3B8]">Expira: {formatDate(client.assistant_expires_at).split(',')[0]}</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] rounded-full">
                            <IconLock /> Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {client.activation_status === 'active' ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-[#34D399] bg-[#34D399]/10 rounded-full border border-[#34D399]/20">Ativo</span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-[#FACC15] bg-[#FACC15]/10 rounded-full border border-[#FACC15]/20">Pendente</span>
                        )}
                      </td>
                      <td className="p-4 text-[#94A3B8] text-xs">
                        {formatDate(client.last_login_at)}
                      </td>
                      <td className="p-4">
                        {client.status === 'active' ? (
                          <span className="text-[#34D399] font-semibold text-sm">Ativo</span>
                        ) : (
                          <span className="text-[#FB7185] font-semibold text-sm">Bloqueado</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/clientes/${client.user_id}`}
                          className="inline-block px-4 py-2 text-sm font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition duration-200"
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
