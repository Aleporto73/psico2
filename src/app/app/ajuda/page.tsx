'use client';

import { useMemo, useState } from 'react';
import {
  instrumentGuides,
  type InstrumentGuide,
  type InstrumentStatus,
} from './instrumentos-data';

const statusMeta: Record<InstrumentStatus, { label: string; shortLabel: string; guidance: string; limit: string; badge: string; border: string; panel: string }> = {
  allowed: {
    label: 'Uso psicopedagógico possível',
    shortLabel: 'Pode utilizar',
    guidance: 'Sim, como recurso educacional, funcional, de acompanhamento ou rastreio, conforme a finalidade do instrumento.',
    limit: 'Respeitar o manual, a formação profissional e o escopo psicopedagógico. O resultado não deve ser usado isoladamente para diagnóstico clínico.',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    border: 'border-emerald-200',
    panel: 'bg-emerald-50/60',
  },
  conditional: {
    label: 'Uso condicionado',
    shortLabel: 'Ver condições',
    guidance: 'Pode ser utilizado somente quando a formação, o manual, a edição e o contexto profissional permitirem.',
    limit: 'Usar para rastreio, acompanhamento ou intervenção dentro da própria competência. Encaminhar ou atuar em equipe quando houver demanda clínica, diagnóstica, fonoaudiológica ou terapêutica específica.',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    border: 'border-amber-200',
    panel: 'bg-amber-50/60',
  },
  psychologist: {
    label: 'Exclusivo para psicólogos',
    shortLabel: 'Psicólogo',
    guidance: 'Não. O instrumento é teste psicológico e seu uso profissional é privativo de psicólogos.',
    limit: 'Aplicação, correção e interpretação devem seguir a edição e o manual aprovados no SATEPSI, por psicólogo com CRP ativo.',
    badge: 'bg-red-100 text-red-800 border-red-200',
    border: 'border-red-200',
    panel: 'bg-red-50/60',
  },
  unavailable: {
    label: 'Edição sem condição de uso',
    shortLabel: 'Não utilizar',
    guidance: 'Não utilizar profissionalmente a edição indicada enquanto ela não estiver em condição regular de uso.',
    limit: 'Instrumentos desfavoráveis, com normas vencidas ou atualização em avaliação não devem ser usados na prática profissional. Consulte o SATEPSI antes de retomar o uso.',
    badge: 'bg-rose-200 text-rose-950 border-rose-300',
    border: 'border-rose-300',
    panel: 'bg-rose-100/70',
  },
  verify: {
    label: 'Confirmar instrumento e edição',
    shortLabel: 'Confirmar',
    guidance: 'Não é seguro classificar como liberado sem confirmar autoria, edição, manual e finalidade.',
    limit: 'O nome é genérico, ambíguo ou não identifica suficientemente o instrumento. Valide a documentação antes de qualquer uso profissional.',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    border: 'border-slate-200',
    panel: 'bg-slate-50',
  },
};

const filters: Array<{ value: 'all' | InstrumentStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'allowed', label: 'Pode utilizar' },
  { value: 'conditional', label: 'Uso condicionado' },
  { value: 'psychologist', label: 'Exclusivo psicólogos' },
  { value: 'unavailable', label: 'Não utilizar' },
  { value: 'verify', label: 'Confirmar' },
];

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function InstrumentAccordion({ instrument }: { instrument: InstrumentGuide }) {
  const meta = statusMeta[instrument.status];

  return (
    <details className={`group overflow-hidden rounded-2xl border bg-white ${meta.border}`}>
      <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 marker:content-none">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium leading-snug text-pp-ink">{instrument.name}</p>
          <p className="mt-1 text-xs text-pp-ink-soft">{instrument.audience}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>{meta.shortLabel}</span>
        <span className="shrink-0 text-lg text-pp-ink-soft transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>

      <div className={`border-t px-5 py-5 ${meta.border} ${meta.panel}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pp-ink-soft">Psicopedagogo pode utilizar?</p>
            <p className="mt-1 text-sm leading-relaxed text-pp-ink">{meta.guidance}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pp-ink-soft">Limite principal</p>
            <p className="mt-1 text-sm leading-relaxed text-pp-ink">{meta.limit}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-black/5 pt-4">
          <p className="text-sm leading-relaxed text-pp-ink-soft"><strong className="font-medium text-pp-ink">O que avalia: </strong>{instrument.summary}</p>
          {instrument.note && (
            <p className="mt-3 rounded-xl border border-black/5 bg-white/70 px-4 py-3 text-sm leading-relaxed text-pp-ink"><strong className="font-medium">Atenção: </strong>{instrument.note}</p>
          )}
        </div>
      </div>
    </details>
  );
}

export default function AjudaPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | InstrumentStatus>('all');

  const counts = useMemo(() => {
    const result: Record<InstrumentStatus, number> = { allowed: 0, conditional: 0, psychologist: 0, unavailable: 0, verify: 0 };
    instrumentGuides.forEach((instrument) => { result[instrument.status] += 1; });
    return result;
  }, []);

  const filtered = useMemo(() => {
    const query = normalizeText(search.trim());
    return instrumentGuides.filter((instrument) => {
      const matchesFilter = filter === 'all' || instrument.status === filter;
      const matchesSearch = !query || normalizeText(instrument.name).includes(query) || normalizeText(instrument.summary).includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-3 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pp-ink-soft">Ajuda · uso responsável</p>
        <h1 className="font-serif text-4xl italic leading-tight text-pp-ink md:text-5xl">Quem pode utilizar cada instrumento?</h1>
        <p className="max-w-4xl text-base leading-relaxed text-pp-ink-soft md:text-lg">Consulte os limites de uso das planilhas da biblioteca, com foco na atuação de psicopedagogos. A classificação diferencia recursos educacionais, usos condicionados, testes exclusivos de psicólogos e edições que precisam ser confirmadas.</p>
      </header>

      <section className="rounded-2xl border border-pp-hairline bg-pp-block-cream/60 p-5">
        <p className="text-sm leading-relaxed text-pp-ink"><strong>Importante:</strong> esta página é um guia informativo. Ela não substitui o manual original, a formação exigida, a legislação da profissão nem a consulta atual ao SATEPSI. Uma planilha de correção não autoriza a aplicação de um instrumento.</p>
        <p className="mt-2 text-xs text-pp-ink-soft">Revisão do conteúdo: 27/07/2026. O SATEPSI pode ser atualizado após plenárias do Conselho Federal de Psicologia.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Legenda">
        {(['allowed', 'conditional', 'psychologist', 'unavailable', 'verify'] as InstrumentStatus[]).map((status) => {
          const meta = statusMeta[status];
          return (
            <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${meta.border} ${meta.panel}`}>
              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${meta.badge}`}>{counts[status]}</span>
              <p className="mt-3 text-sm font-medium leading-snug text-pp-ink">{meta.label}</p>
            </button>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-pp-hairline bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Buscar instrumento</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, sigla ou finalidade..." className="w-full rounded-pill border border-pp-hairline bg-pp-canvas px-5 py-3 text-sm text-pp-ink outline-none transition placeholder:text-pp-ink-soft focus:border-pp-ink focus:ring-2 focus:ring-pp-ink/10" />
            </label>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {filters.map((item) => {
                const active = filter === item.value;
                return (
                  <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`shrink-0 rounded-pill px-4 py-2.5 text-xs font-medium transition ${active ? 'bg-pp-ink text-pp-canvas' : 'border border-pp-hairline bg-white text-pp-ink-soft hover:border-pp-ink/30 hover:text-pp-ink'}`}>{item.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-pp-ink-soft">{filtered.length} de {instrumentGuides.length} instrumentos</p>
          {(search || filter !== 'all') && (
            <button type="button" onClick={() => { setSearch(''); setFilter('all'); }} className="text-sm font-medium text-pp-ink underline underline-offset-4">Limpar filtros</button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-3">{filtered.map((instrument) => <InstrumentAccordion key={instrument.id} instrument={instrument} />)}</div>
        ) : (
          <div className="rounded-2xl border border-dashed border-pp-hairline bg-white p-10 text-center">
            <p className="text-pp-ink">Nenhum instrumento encontrado.</p>
            <p className="mt-1 text-sm text-pp-ink-soft">Tente outra sigla ou limpe os filtros.</p>
          </div>
        )}
      </section>

      <footer className="space-y-3 border-t border-pp-hairline pt-6">
        <h2 className="font-serif text-2xl italic text-pp-ink">Fontes para conferência</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-pp-ink-soft">Para testes psicológicos, consulte sempre a edição exata no SATEPSI. Para instrumentos não privativos, confirme o manual, a literatura científica e os limites da sua profissão.</p>
        <div className="flex flex-wrap gap-3">
          <a href="https://satepsi.cfp.org.br/lista_teste_completa.cfm" target="_blank" rel="noopener noreferrer" className="rounded-pill bg-pp-ink px-5 py-2.5 text-sm font-medium text-pp-canvas transition hover:bg-pp-ink-soft">Consultar lista completa do SATEPSI</a>
          <a href="https://satepsi.cfp.org.br/testesNaoPrivativos.cfm" target="_blank" rel="noopener noreferrer" className="rounded-pill border border-pp-hairline bg-white px-5 py-2.5 text-sm font-medium text-pp-ink transition hover:border-pp-ink/30">Ver instrumentos não privativos</a>
        </div>
      </footer>
    </div>
  );
}
