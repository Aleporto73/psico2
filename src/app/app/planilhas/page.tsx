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

// SVG Icons

function IconLockLarge() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
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
        // 2. Buscar planilhas via RPC SECURITY DEFINER.
        //    A função get_my_spreadsheets() roda no banco e SÓ devolve
        //    access_url quando has_lifetime_access(auth.uid()) for true.
        //    Se o usuário perder o acesso, a resposta vem vazia.
        const { data: prods, error: prodsErr } = await supabase.rpc('get_my_spreadsheets');

        if (prodsErr) throw prodsErr;
        setSpreadsheets((prods as Spreadsheet[]) || []);
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
      <div className="flex h-[60vh] items-center justify-center text-[#CBD5E1]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto" />
          <p>Carregando biblioteca de planilhas...</p>
        </div>
      </div>
    );
  }

  // 1. Lock Screen if user doesn't have lifetime access
  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] text-center max-w-2xl mx-auto space-y-6 my-12">
        <div className="w-20 h-20 rounded-full bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 flex items-center justify-center text-[#7DD3FC]">
          <IconLockLarge />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">Biblioteca de planilhas bloqueada</h2>
          <p className="text-[#CBD5E1] text-base leading-relaxed">
            Seu perfil ainda não tem acesso vitalício às planilhas profissionais. Adquira o plano vitalício para liberar permanentemente todo o material de apoio.
          </p>
        </div>
        <Link
          href="/app/produtos"
          className="px-8 py-3.5 text-base font-bold text-[#061923] bg-[#7DD3FC] hover:bg-[#67E8F9] rounded-xl transition shadow-md shadow-[#7DD3FC]/15"
        >
          Conhecer planos
        </Link>
      </div>
    );
  }

  // Extrai o rótulo curto (sigla / nome do instrumento) antes do travessão.
  // Splits apenas em separadores com espaços ao redor (" – " | " — " | " - "),
  // para preservar hifens internos como em "ABLLS-R", "APM-RAVEN", "ASRS-18".
  // Ex.: "ABLLS-R – Avaliação de Linguagem e Aprendizagem" -> "ABLLS-R"
  //      "ABC / ICA – Instrumento..."                     -> "ABC / ICA"
  const getShortInstrumentName = (name: string): string => {
    if (!name) return '';
    const parts = name.split(/\s+[–—-]\s+/);
    if (parts.length > 1 && parts[0]) return parts[0].trim();
    const trimmed = name.trim();
    return trimmed.length <= 20 ? trimmed : trimmed.slice(0, 20).trim();
  };

  return (
    <div className="-m-6 md:-m-8 p-6 md:p-8 min-h-full bg-[#F8FAFC] space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0B2430] tracking-tight">Biblioteca de planilhas</h1>
        <p className="text-[#475569] text-base mt-1">Planilhas de apoio operacional para psicólogos e psicopedagogos.</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-[#0B2430] rounded-2xl border border-[#1F4D5C]">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Buscar planilha por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat!)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-[#7DD3FC] text-[#061923]'
                    : 'bg-[#0E2A38] hover:bg-[#123340] text-[#CBD5E1] border border-[#1F4D5C]'
                }`}
              >
                {cat === 'all' ? 'Ver todas' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Spreadsheets */}
      {filteredSpreadsheets.length === 0 ? (
        <div className="p-12 text-center bg-[#0B2430]/50 border border-dashed border-[#1F4D5C] rounded-2xl space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#0E2A38] flex items-center justify-center text-[#94A3B8]">
            <IconEmpty />
          </div>
          <p className="text-[#CBD5E1] text-base">Nenhuma planilha encontrada.</p>
          <p className="text-[#94A3B8] text-sm">Tente ajustar a busca ou trocar a categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpreadsheets.map((sheet) => (
            <div key={sheet.id} className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] flex flex-col justify-between gap-4 hover:border-[#7DD3FC]/40 transition duration-200">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full">
                  {getShortInstrumentName(sheet.name) || sheet.category || 'Geral'}
                </span>
                <h3 className="text-base font-bold text-[#F8FAFC] pt-1">{sheet.name}</h3>
                <p className="text-sm text-[#CBD5E1] leading-relaxed line-clamp-3">
                  {sheet.description || 'Apoio para estruturação, cálculo e visualização de dados.'}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleAccess(sheet.access_url)}
                  disabled={!sheet.access_url}
                  className="w-full py-3 bg-[#7DD3FC] hover:bg-[#67E8F9] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] text-[#061923] font-bold rounded-xl text-sm transition duration-200"
                >
                  Acessar planilha (cópia)
                </button>
                {sheet.tutorial_url && (
                  <button
                    onClick={() => handleAccess(sheet.tutorial_url)}
                    className="w-full py-3 bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] font-semibold rounded-xl text-sm transition duration-200"
                  >
                    Ver tutorial de uso
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Obligatory Disclaimer Notice */}
      <footer className="pt-8 border-t border-[#1F4D5C]">
        <div className="p-4 bg-[#0B2430]/60 rounded-2xl border border-[#1F4D5C] text-center text-xs text-[#94A3B8] leading-relaxed max-w-3xl mx-auto">
          <strong>Aviso de uso responsável:</strong> Esta planilha é um recurso de apoio operacional. Ela agiliza cálculos, organização e visualização dos dados. O uso correto exige o manual original do instrumento. Não substitui avaliação profissional, teste original, manual ou interpretação clínica.
        </div>
      </footer>

    </div>
  );
}
