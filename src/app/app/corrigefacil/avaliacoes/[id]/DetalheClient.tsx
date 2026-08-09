'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  buscarAvaliacao,
  CorrigeFacilError,
  type AvaliacaoDetalhe,
} from '@/lib/corrigefacil/api';
import { acaoSugerida } from '../../catalog-view';
import { CorrigeFacilNav } from '../../CorrigeFacilNav';
import { CorrigeFacilReportPanel } from '../../CorrigeFacilReportPanel';
import { formatarData } from '../historico-view';

const AVISO =
  'Resultado de instrumento de rastreio/correção. Deve ser interpretado ' +
  'pelo profissional responsável e não substitui avaliação completa.';

type Fase =
  | { fase: 'carregando' }
  | { fase: 'ok'; detalhe: AvaliacaoDetalhe }
  | { fase: 'erro'; tipo: string; mensagem: string };

export function DetalheClient({ id }: { id: string }) {
  const [estado, setEstado] = useState<Fase>({ fase: 'carregando' });

  const executar = useCallback(
    (signal?: AbortSignal) => {
      buscarAvaliacao(id, { signal })
        .then((detalhe) => {
          if (signal?.aborted) return;
          setEstado({ fase: 'ok', detalhe });
        })
        .catch((err: unknown) => {
          if (signal?.aborted) return;
          const e =
            err instanceof CorrigeFacilError
              ? err
              : new CorrigeFacilError('indisponivel', 'O serviço está indisponível no momento.');
          setEstado({ fase: 'erro', tipo: e.tipo, mensagem: e.message });
        });
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    executar(controller.signal);
    return () => controller.abort();
  }, [executar]);

  const voltar = (
    <div className="space-y-4 print:hidden">
      <CorrigeFacilNav />
      <Link
        href="/app/corrigefacil/avaliacoes"
        className="inline-flex items-center gap-2 text-pp-ink-soft text-sm hover:text-pp-ink transition"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Voltar ao histórico
      </Link>
    </div>
  );

  if (estado.fase === 'carregando') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <output className="block text-pp-ink-soft text-sm">
          Carregando avaliação…
        </output>
      </div>
    );
  }

  if (estado.fase === 'erro') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <section className="bg-pp-block-lilac rounded-block p-8 space-y-4">
          <p className="text-pp-ink text-base">
            {estado.tipo === 'nao_encontrado'
              ? 'Avaliação não encontrada.'
              : estado.mensagem}
          </p>
          {acaoSugerida(estado.tipo as never) === 'tentar' && (
            <button
              type="button"
              onClick={() => executar()}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Tentar novamente
            </button>
          )}
        </section>
      </div>
    );
  }

  const d = estado.detalhe;
  const meta = d.subject_meta ?? {};
  const respondente =
    typeof meta.respondent_name === 'string' ? meta.respondent_name : null;
  const profissional =
    typeof meta.profissional === 'string' ? meta.profissional : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pt-4">
      {voltar}

      <header className="space-y-2">
        <p className="font-mono text-xs tracking-wide text-pp-ink bg-white/60 inline-block px-2 py-0.5 rounded">
          {d.instrument}
        </p>
        <h1 className="font-serif italic text-3xl md:text-4xl text-pp-ink leading-tight">
          {d.subject_label?.trim() || 'Sem identificação'}
        </h1>
        <p className="text-pp-ink-soft text-sm">
          {formatarData(d.completed_at ?? d.created_at)}
          {respondente ? ` · Respondente: ${respondente}` : ''}
          {profissional ? ` · ${profissional}` : ''}
        </p>
      </header>

      <section className="space-y-3">
        {Object.entries(d.resultados).map(([escala, r]) => (
          <div key={escala} className="border border-pp-ink/10 rounded-block p-5 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-pp-ink font-medium">{escala}</p>
              {r.raw !== null && <p className="text-pp-ink-soft text-sm">bruto {r.raw}</p>}
            </div>

            {r.available ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                {r.score !== null && (
                  <p className="text-pp-ink">
                    escore <span className="font-medium">{r.score}</span>
                    {r.ci95 ? ` (${r.ci95})` : ''}
                  </p>
                )}
                {r.percentile !== null && <p className="text-pp-ink">percentil {r.percentile}</p>}
                {r.z !== null && <p className="text-pp-ink">z {r.z}</p>}
                {r.classification && (
                  <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
                    {r.classification}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-pp-ink-soft text-sm">
                {r.message ?? 'Resultado indisponível.'}
              </p>
            )}

            {r.flags.length > 0 && (
              <p className="text-pp-ink-soft text-xs">revisar: {r.flags.join(', ')}</p>
            )}
          </div>
        ))}
      </section>

      <CorrigeFacilReportPanel assessmentId={d.assessment_id} />

      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        {AVISO}
      </p>
    </div>
  );
}