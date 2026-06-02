'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Spreadsheet {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  access_url: string | null;
  tutorial_url: string | null;
  image_url: string | null;
}

export default function AppPlanilhasPage() {
  const supabase = createClient();
  
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // 1. Check access status from user_access_status view
      const { data: status, error: statusErr } = await supabase
        .from('user_access_status')
        .select('has_lifetime_access')
        .eq('user_id', user.id)
        .single();

      if (statusErr || !status) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(status.has_lifetime_access);

      if (status.has_lifetime_access) {
        // 2. Fetch all active spreadsheets
        const { data: prods, error: prodsErr } = await supabase
          .from('products')
          .select('id, name, category, description, access_url, tutorial_url, image_url')
          .eq('type', 'spreadsheet')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (prodsErr) throw prodsErr;
        setSpreadsheets(prods || []);
      }
    } catch (err) {
      console.error('Error loading spreadsheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccess = (url: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filter spreadsheets by search and category
  const filteredSpreadsheets = spreadsheets.filter((sheet) => {
    const nameMatch = sheet.name.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = selectedCategory === 'all' || sheet.category === selectedCategory;
    return nameMatch && categoryMatch;
  });

  const categories = ['all', ...Array.from(new Set(spreadsheets.map((s) => s.category).filter(Boolean)))];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        Carregando biblioteca de planilhas...
      </div>
    );
  }

  // 1. Lock Screen if user doesn't have lifetime access
  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800 text-center max-w-2xl mx-auto space-y-6 my-12">
        <div className="text-5xl">🔒</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Biblioteca de Planilhas Bloqueada</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Seu perfil não possui acesso vitalício ativo para as planilhas profissionais. Adquira nosso plano vitalício para liberar permanentemente todo o material de apoio.
          </p>
        </div>
        <Link
          href="/app/produtos"
          className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition"
        >
          Conhecer Planos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Biblioteca de Planilhas</h1>
        <p className="text-slate-400 text-sm mt-1">Biblioteca de planilhas de apoio operacional para psicólogos e psicopedagogos.</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Buscar planilha por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition duration-200"
        />

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat!)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-955'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-400'
                }`}
              >
                {cat === 'all' ? 'Ver Todas' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Spreadsheets */}
      {filteredSpreadsheets.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/20 rounded-xl border border-slate-800/40">
          Nenhuma planilha encontrada nesta categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpreadsheets.map((sheet) => (
            <div key={sheet.id} className="p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  {sheet.category || 'Geral'}
                </span>
                <h3 className="text-base font-bold text-white pt-1">{sheet.name}</h3>
                <p className="text-xs text-slate-400 leading-normal line-clamp-3">
                  {sheet.description || 'Apoio para estruturação, cálculo e visualização de dados.'}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleAccess(sheet.access_url)}
                  disabled={!sheet.access_url}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-xs transition duration-200"
                >
                  Acessar Planilha (Cópia)
                </button>
                {sheet.tutorial_url && (
                  <button
                    onClick={() => handleAccess(sheet.tutorial_url)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-semibold rounded-lg text-xs transition duration-200"
                  >
                    Ver Tutorial de Uso
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Obligatory Disclaimer Notice */}
      <footer className="pt-8 border-t border-slate-850">
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-850 text-center text-xs text-slate-500 leading-relaxed max-w-3xl mx-auto">
          <strong>Aviso de uso responsável:</strong> Esta planilha é um recurso de apoio operacional. Ela agiliza cálculos, organização e visualização dos dados. O uso correto exige o manual original do instrumento. Não substitui avaliação profissional, teste original, manual ou interpretação clínica.
        </div>
      </footer>

    </div>
  );
}
