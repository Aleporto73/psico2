'use client';

import { useMemo, useState } from 'react';
import { instrumentGuides, type InstrumentGuide } from './instrumentos-data';

const PSYCHOLOGIST_ONLY_IDS = new Set([
  '005-apm-raven-matrizes-progressivas-avancadas-de-raven',
  '008-bai-beck-anxiety-inventory',
  '009-bdi-2-beck-depression-inventory-ii',
  '010-bhs-beck-hopelessness-scale',
  '013-bpa-2-sao-paulo-bateria-psicologica-para-avaliacao-da-atencao',
  '020-columbia-escala-de-maturidade-mental-columbia',
  '022-cpm-raven-matrizes-progressivas-coloridas-de-raven',
  '036-escala-de-traco-ansiedade-infantil-medida-de-ansiedade-infantil',
  '044-etdah-2-escala-de-tdah-2a-edicao',
  '055-ihs-2-inventario-de-habilidades-sociais',
  '056-ihsa-del-prette-inventario-de-habilidades-sociais-para-adolescentes',
  '068-quati-questionario-de-avaliacao-tipologica',
  '069-r1-teste-nao-verbal-de-inteligencia',
  '071-ravlt-rey-auditory-verbal-learning-test',
  '087-thas-c-teste-de-habilidades-sociais-infantil',
  '088-thcp-teste-de-habilidades-e-conhecimento-pre-alfabetizacao',
  '099-wais-iii-escala-de-inteligencia-wechsler-para-adultos',
  '100-wasi-escala-wechsler-abreviada-de-inteligencia',
  '101-wisc-iv-escala-de-inteligencia-wechsler-infantil',
]);

const SELO_CFP = new Set([
  '053-iep-inventario-de-estilos-parentais',
  '058-m-chat-triagem-para-autismo-em-criancas',
  '062-phq-9-questionario-de-saude-depressao',
]);

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function InstrumentList({ instruments, tone }: { instruments: InstrumentGuide[]; tone: 'green' | 'red' }) {
  const styles = tone === 'green'
    ? { row: 'border-emerald-100 bg-emerald-50/50', dot: 'bg-emerald-500' }
    : { row: 'border-red-100 bg-red-50/60', dot: 'bg-red-500' };

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {instruments.map((instrument) => (
        <div key={instrument.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles.row}`}>
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="text-sm leading-relaxed text-pp-ink">{instrument.name}</span>
            {SELO_CFP.has(instrument.id) && (
              <span
                title="Consta na lista oficial de Instrumentos Não Privativos do Psicólogo (SATEPSI)."
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-emerald-800"
              >
                Declarado não privativo pelo CFP
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AjudaPage() {
  const [search, setSearch] = useState('');
  const query = normalizeText(search.trim());

  const { psychopedagogues, psychologists } = useMemo(() => {
    const filtered = instrumentGuides
      .filter((instrument) => !query || normalizeText(instrument.name).includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return {
      psychopedagogues: filtered.filter((instrument) => !PSYCHOLOGIST_ONLY_IDS.has(instrument.id)),
      psychologists: filtered.filter((instrument) => PSYCHOLOGIST_ONLY_IDS.has(instrument.id)),
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="space-y-3 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pp-ink-soft">Ajuda · aplicação dos instrumentos</p>
        <h1 className="font-serif text-4xl italic leading-tight text-pp-ink md:text-5xl">Quem pode aplicar?</h1>
        <p className="max-w-3xl text-base leading-relaxed text-pp-ink-soft md:text-lg">
          Separação por privatividade: o que a lei reserva ao psicólogo e o que não tem essa reserva.
        </p>
      </header>

      <section className="rounded-2xl border border-pp-hairline bg-pp-block-cream/60 p-5">
        <p className="text-sm leading-relaxed text-pp-ink">
          <strong>Critério desta lista:</strong> considera apenas se o instrumento é privativo de psicólogos. O parecer favorável ou desfavorável no SATEPSI não altera esta separação.
        </p>
      </section>

      <label className="block rounded-2xl border border-pp-hairline bg-white p-4">
        <span className="sr-only">Buscar instrumento</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar instrumento ou sigla..."
          className="w-full rounded-pill border border-pp-hairline bg-pp-canvas px-5 py-3 text-sm text-pp-ink outline-none transition placeholder:text-pp-ink-soft focus:border-pp-ink focus:ring-2 focus:ring-pp-ink/10"
        />
      </label>

      <section className="space-y-4">
        <details open className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 marker:content-none">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-emerald-900">Não privativos do psicólogo</h2>
              <p className="mt-1 text-sm text-pp-ink-soft">Instrumentos que não são classificados como teste psicológico. Podem ser aplicados por outros profissionais, respeitados formação e manual.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{psychopedagogues.length}</span>
            <span className="text-xl text-pp-ink-soft" aria-hidden="true">⌄</span>
          </summary>
          <div className="border-t border-emerald-100 p-5">
            <InstrumentList instruments={psychopedagogues} tone="green" />
          </div>
        </details>

        <details open className="overflow-hidden rounded-2xl border border-red-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 marker:content-none">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-red-900">Privativos do psicólogo</h2>
              <p className="mt-1 text-sm text-pp-ink-soft">Instrumentos classificados pelo CFP como teste psicológico. A aplicação profissional é privativa do psicólogo (Lei 4.119/62). O parecer atual não altera isso.</p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">{psychologists.length}</span>
            <span className="text-xl text-pp-ink-soft" aria-hidden="true">⌄</span>
          </summary>
          <div className="border-t border-red-100 p-5">
            <InstrumentList instruments={psychologists} tone="red" />
          </div>
        </details>
      </section>

      <footer className="border-t border-pp-hairline pt-5">
        <p className="text-sm leading-relaxed text-pp-ink-soft">
          A inclusão na área de psicopedagogos não substitui formação, manual ou limites profissionais. A lista serve apenas para indicar quais instrumentos não são exclusivos da Psicologia.
        </p>
        <p className="mt-4 border-l-4 border-[#EF2066] bg-gray-100 px-4 py-3 text-sm leading-relaxed text-pp-ink">
          Aplicar não é laudar. O laudo e o diagnóstico psicológico são privativos do psicólogo, qualquer que seja o instrumento.
        </p>
        <a
          href="https://satepsi.cfp.org.br/lista_teste_completa.cfm"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-pill bg-pp-ink px-5 py-2.5 text-sm font-medium text-pp-canvas transition hover:bg-pp-ink-soft"
        >
          Verificar parecer atual no SATEPSI
        </a>
      </footer>
    </div>
  );
}
