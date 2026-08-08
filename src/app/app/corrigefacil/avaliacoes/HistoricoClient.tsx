'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import {
  CorrigeFacilError,
  listarAvaliacoes,
  LIMITE_MAXIMO,
  type AvaliacaoResumo,
} from '@/lib/corrigefacil/api';
import { acaoSugerida } from '../catalog-view';
import { CorrigeFacilNav } from '../CorrigeFacilNav';
import {
  filtrarLinhas,
  formatarData,
  montarLinhas,
  resumoQuantidadeHistorico,
  type EstadoHistorico,
  type LinhaHistorico,
} from './historico-view';

export function HistoricoClient() {
  const [estado, setEstado] = useState<EstadoHistorico>({ fase: 'carregando' });
  const [termo, setTermo] = useState('');

  const executar = useCallback((signal?: AbortSignal) => {
    listarAvaliacoes({ limit: LIMITE_MAXIMO, offset: 0 }, { signal })
      .then((avaliacoes: AvaliacaoResumo[]) => {
        if (signal?.aborted) return;
        setEstado({ fase: 'ok', avaliacoes });
      })
      .catch((err: unknown) => {
        if (signal?.aborted) return;
        const e =
          err instanceof CorrigeFacilError
            ? err
            : new CorrigeFacilError('indisponivel', 'O serviço está indisponível no momento.');
        setEstado({ fase: 'erro', tipo: e.tipo, mensagem: e.message });
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    executar(controller.signal);
    return () => controller.abort();
  }, [executar]);

  const retentar = useCallback(() => {
    setEstado({ fase: 'carregando' });
    executar();
  }, [executar]);

  const linhas = useMemo(
    () => (estado.fase === 'ok' ? montarLinhas(estado.avaliacoes) : []),
    [estado],
  );
  const visiveis = useMemo(() => filtrarLinhas(linhas, termo), [linhas, termo]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-4">
      <CorrigeFacilNav />

      <header className="space-y-2">
        <h1 className="font-serif italic text-3xl md:text-4xl text-pp-ink leading-tight">
          Avaliações salvas
        </h1>
        <p className="text-pp-ink-soft text-sm">
          O resultado é congelado na conclusão: reabrir mostra o que foi
          gravado, não um novo cálculo.
        </p>
      </header>

      {estado.fase === 'carregando' && (
        <output className="block text-pp-ink-soft text-sm">
          Carregando avaliações…
        </output>
      )}

      {estado.fase === 'erro' && (
        <section className="bg-pp-block-lilac rounded-block p-8 space-y-4">
          <p className="text-pp-ink text-base">{estado.mensagem}</p>
          {acaoSugerida(estado.tipo) === 'tentar' && (
            <button
              type="button"
              onClick={retentar}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Tentar novamente
            </button>
          )}
          {acaoSugerida(estado.tipo) === 'entrar' && (
            <p className="text-pp-ink-soft text-sm">
              Atualize a página para entrar novamente.
            </p>
          )}
        </section>
      )}

      {estado.fase === 'ok' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-pp-ink-soft text-sm">
              {resumoQuantidadeHistorico(estado.avaliacoes.length)}
            </p>
            {estado.avaliacoes.length > 0 && (
              <label className="relative w-full sm:w-auto">
                <span className="sr-only">Buscar por avaliado ou instrumento</span>
                <Search
                  className="w-4 h-4 text-pp-ink-soft absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Buscar por avaliado ou instrumento"
                  className="pl-9 pr-4 py-2 rounded-pill border border-pp-ink/15 bg-white/60 text-sm text-pp-ink placeholder:text-pp-ink-soft focus:outline-none focus:border-pp-ink/40 w-full sm:w-72"
                />
              </label>
            )}
          </div>

          <Lista total={estado.avaliacoes.length} visiveis={visiveis} termo={termo} />
        </>
      )}
    </div>
  );
}

/** Os três estados da lista, com retorno antecipado em vez de ternário
 *  aninhado: "nunca salvou nada" e "a busca não achou" são situações
 *  diferentes e merecem textos diferentes. */
function Lista({
  total,
  visiveis,
  termo,
}: Readonly<{ total: number; visiveis: LinhaHistorico[]; termo: string }>) {
  if (total === 0) {
    return (
      <section className="bg-pp-block-lilac rounded-block p-8">
        <p className="text-pp-ink text-base">Nenhuma avaliação salva ainda.</p>
        <p className="text-pp-ink-soft text-sm mt-2">
          Aplique um instrumento pelo catálogo e salve o resultado para que ele
          apareça aqui.
        </p>
      </section>
    );
  }

  if (visiveis.length === 0) {
    return (
      <output className="block text-pp-ink-soft text-sm">
        Nenhuma avaliação corresponde a “{termo}”.
      </output>
    );
  }

  return (
    <ul className="space-y-2">
      {visiveis.map((linha) => (
        <li
          key={linha.id}
          className="border border-pp-ink/10 rounded-block p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-pp-ink font-medium">{linha.rotulo}</p>
            <p className="text-pp-ink-soft text-xs">
              <span className="font-mono">{linha.instrumento}</span>
              {linha.respondente ? ` · ${linha.respondente}` : ''}
              {` · ${formatarData(linha.data)}`}
            </p>
          </div>
          {linha.href && (
            <Link
              href={linha.href}
              aria-label={`Abrir avaliação de ${linha.rotulo}`}
              className="inline-flex items-center gap-2 border border-pp-ink/15 text-pp-ink px-5 py-2 rounded-pill text-sm font-medium hover:border-pp-ink/40 transition"
            >
              Abrir
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
