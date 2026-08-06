'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, History, RefreshCw, Search } from 'lucide-react';
import { buscarCatalogo, CorrigeFacilError } from '@/lib/corrigefacil/api';
import {
  acaoSugerida,
  filtrarInstrumentos,
  montarCartao,
  resumoQuantidade,
  ROTA_HISTORICO,
  type EstadoCatalogo,
} from './catalog-view';

// Catálogo dos instrumentos publicados, lido da Edge com o JWT do usuário.
//
// Só é montado depois que o Server Component confirmou o direito comercial.
// Um 403 aqui, portanto, é um desencontro entre a função do banco e a Edge —
// e a tela diz isso em vez de fingir catálogo vazio.
//
// Cada instrumento leva à sua tela de aplicação, e o cabeçalho leva ao
// histórico — que, diferente daqui, NÃO exige direito comercial ativo.
export function CorrigeFacilCatalogClient() {
  const [estado, setEstado] = useState<EstadoCatalogo>({ fase: 'carregando' });
  const [termo, setTermo] = useState('');

  // Não mexe no estado de forma síncrona: o estado inicial já é 'carregando',
  // e quem precisa voltar para ele é o retry, não a montagem.
  const executar = useCallback((signal?: AbortSignal) => {
    buscarCatalogo({ signal })
      .then((instrumentos) => {
        if (signal?.aborted) return;
        setEstado({ fase: 'ok', instrumentos });
      })
      .catch((err: unknown) => {
        if (signal?.aborted) return;
        if (err instanceof CorrigeFacilError) {
          setEstado({ fase: 'erro', tipo: err.tipo, mensagem: err.message });
          return;
        }
        setEstado({
          fase: 'erro',
          tipo: 'indisponivel',
          mensagem:
            'O serviço está indisponível no momento. Tente novamente em instantes.',
        });
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

  const visiveis = useMemo(
    () =>
      estado.fase === 'ok' ? filtrarInstrumentos(estado.instrumentos, termo) : [],
    [estado, termo],
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-3 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          CorrigeFácil
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg">
          Corrija instrumentos psicométricos direto no PsicoPlanilhas. O cálculo
          roda no servidor; você registra as respostas e recebe escore,
          classificação e faixa.
        </p>
        <Link
          href={ROTA_HISTORICO}
          className="inline-flex items-center gap-2 text-pp-ink-soft text-sm hover:text-pp-ink transition"
        >
          <History className="w-4 h-4" aria-hidden="true" />
          Avaliações salvas
        </Link>
      </header>

      {estado.fase === 'carregando' && (
        <p className="text-pp-ink-soft text-sm" role="status">
          Carregando instrumentos…
        </p>
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
              {resumoQuantidade(estado.instrumentos.length)}
            </p>
            {estado.instrumentos.length > 0 && (
              <label className="relative">
                <span className="sr-only">Buscar por código ou nome</span>
                <Search
                  className="w-4 h-4 text-pp-ink-soft absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Buscar por código ou nome"
                  className="pl-9 pr-4 py-2 rounded-pill border border-pp-ink/15 bg-white/60 text-sm text-pp-ink placeholder:text-pp-ink-soft focus:outline-none focus:border-pp-ink/40 w-64"
                />
              </label>
            )}
          </div>

          {estado.instrumentos.length === 0 ? (
            <section className="bg-pp-block-lilac rounded-block p-8">
              <p className="text-pp-ink text-base">
                Nenhum instrumento publicado no momento.
              </p>
              <p className="text-pp-ink-soft text-sm mt-2">
                Assim que houver instrumentos liberados, eles aparecem aqui.
              </p>
            </section>
          ) : visiveis.length === 0 ? (
            <p className="text-pp-ink-soft text-sm">
              Nenhum instrumento corresponde a “{termo}”.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visiveis.map((instrumento) => {
                const cartao = montarCartao(instrumento);
                return (
                  <li
                    key={cartao.code}
                    className="border border-pp-ink/10 rounded-block p-5 space-y-2"
                  >
                    <p className="font-mono text-xs tracking-wide text-pp-ink bg-white/60 inline-block px-2 py-0.5 rounded">
                      {cartao.code}
                    </p>
                    <h2 className="text-pp-ink font-medium leading-snug">
                      {cartao.name}
                    </h2>
                    {cartao.meta.length > 0 && (
                      <p className="text-pp-ink-soft text-xs">
                        {cartao.meta.join(' · ')}
                      </p>
                    )}
                    {cartao.acaoDisponivel && cartao.href && (
                      <Link
                        href={cartao.href}
                        className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-5 py-2 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition mt-1"
                      >
                        Aplicar
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
