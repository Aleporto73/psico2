'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Lock, Search, FileText, ExternalLink, BookOpen } from 'lucide-react';

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
      <div className="flex h-[60vh] items-center justify-center text-pp-ink-soft">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pp-hairline border-t-pp-ink rounded-full animate-spin mx-auto" />
          <p>Carregando biblioteca de planilhas...</p>
        </div>
      </div>
    );
  }

  // 1. Lock Screen if user doesn't have lifetime access
  if (hasAccess === false) {
    return (
      <div className="bg-pp-block-coral rounded-block p-10 max-w-2xl mx-auto my-12 text-center flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-pp-ink/5 flex items-center justify-center text-pp-ink">
          <Lock className="w-10 h-10" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <h2 className="font-serif italic text-2xl md:text-3xl text-pp-ink">Biblioteca bloqueada</h2>
          <p className="text-pp-ink-soft text-base leading-relaxed">
            Seu perfil ainda não tem acesso vitalício às planilhas profissionais. Adquira o plano vitalício para liberar permanentemente todo o material de apoio.
          </p>
        </div>
        <Link
          href="/app/produtos"
          className="inline-flex items-center bg-pp-ink text-pp-canvas rounded-pill px-8 py-3.5 text-base font-medium hover:bg-pp-ink-soft transition"
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
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Header editorial — rola junto com a página */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          Biblioteca de planilhas
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg">
          Planilhas de apoio operacional para psicólogos e psicopedagogos.
        </p>
      </header>

      {/* Banner sticky — fica fixo no topo durante o scroll da biblioteca */}
      <HeroBanner position="planilhas" sticky />

      {/* Filtros — busca + chips de categoria */}
      <div className="bg-white rounded-2xl border border-pp-hairline p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pp-ink-soft pointer-events-none">
            <Search className="w-[18px] h-[18px]" aria-hidden="true" />
          </span>
          <input
            type="text"
            placeholder="Buscar planilha por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-pp-canvas border border-pp-hairline rounded-pill text-base text-pp-ink placeholder:text-pp-ink-soft focus:outline-none focus:border-pp-ink focus:ring-1 focus:ring-pp-ink/20 transition"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat!)}
                className={`px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-pp-ink text-pp-canvas'
                    : 'bg-white border border-pp-hairline text-pp-ink-soft hover:border-pp-ink/30 hover:text-pp-ink'
                }`}
              >
                {cat === 'all' ? 'Ver todas' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de planilhas */}
      {filteredSpreadsheets.length === 0 ? (
        <div className="bg-pp-block-cream/50 rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-pp-ink-soft mx-auto" aria-hidden="true" />
          <p className="text-pp-ink text-base">Nenhuma planilha encontrada.</p>
          <p className="text-pp-ink-soft text-sm">Tente ajustar a busca ou trocar a categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpreadsheets.map((sheet) => (
            <article
              key={sheet.id}
              className="bg-white border border-pp-hairline rounded-2xl p-6 flex flex-col justify-between gap-4 hover:border-pp-ink/20 transition"
            >
              <div className="space-y-2">
                <p className="font-serif italic text-pp-ink-soft text-sm">
                  {getShortInstrumentName(sheet.name) || sheet.category || 'Geral'}
                </p>
                <h3 className="text-base md:text-lg text-pp-ink font-medium leading-snug">{sheet.name}</h3>
                <p className="text-sm text-pp-ink-soft leading-relaxed line-clamp-3">
                  {sheet.description || 'Apoio para estruturação, cálculo e visualização de dados.'}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleAccess(sheet.access_url)}
                  disabled={!sheet.access_url}
                  className="w-full inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas rounded-xl py-3 text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-pp-ink"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  Acessar planilha (cópia)
                </button>
                {sheet.tutorial_url && (
                  <button
                    onClick={() => handleAccess(sheet.tutorial_url)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-pp-ink border border-pp-ink/15 hover:bg-pp-ink/5 transition"
                  >
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    Ver tutorial de uso
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Disclaimer obrigatório */}
      <footer className="pt-8 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          <strong>Aviso de uso responsável:</strong> Esta planilha é um recurso de apoio operacional. Ela agiliza cálculos, organização e visualização dos dados. O uso correto exige o manual original do instrumento. Não substitui avaliação profissional, teste original, manual ou interpretação clínica.
        </p>
      </footer>

    </div>
  );
}
