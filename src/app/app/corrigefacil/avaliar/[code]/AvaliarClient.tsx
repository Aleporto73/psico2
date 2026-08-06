'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import {
  buscarInstrumento,
  corrigirInstrumento,
  CorrigeFacilError,
  type InstrumentoDetalhe,
  type RespostaCorrecao,
} from '@/lib/corrigefacil/api';
import { acaoSugerida } from '../../catalog-view';
import { montarModelo, TEXTO_BLOQUEIO, type ModeloFormulario } from './form-model';
import {
  COMPONENTES,
  escolherDimensao,
  estadoInicial,
  montarPedido,
  opcoesDaDimensao,
  pendencias,
  podeEnviar,
  type EstadoFormulario,
} from './form-state';

const AVISO =
  'Resultado de instrumento de rastreio/correção. Deve ser interpretado ' +
  'pelo profissional responsável e não substitui avaliação completa.';

type FaseInstrumento =
  | { fase: 'carregando' }
  | { fase: 'ok'; detalhe: InstrumentoDetalhe }
  | { fase: 'erro'; tipo: string; mensagem: string };

export function AvaliarClient({ code }: { code: string }) {
  const [instrumento, setInstrumento] = useState<FaseInstrumento>({ fase: 'carregando' });
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<RespostaCorrecao | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const carregar = useCallback(
    (signal?: AbortSignal) => {
      buscarInstrumento(code, { signal })
        .then((detalhe) => {
          if (signal?.aborted) return;
          setInstrumento({ fase: 'ok', detalhe });
        })
        .catch((err: unknown) => {
          if (signal?.aborted) return;
          const e =
            err instanceof CorrigeFacilError
              ? err
              : new CorrigeFacilError('indisponivel', 'O serviço está indisponível no momento.');
          setInstrumento({ fase: 'erro', tipo: e.tipo, mensagem: e.message });
        });
    },
    [code],
  );

  useEffect(() => {
    const controller = new AbortController();
    carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  const modelo: ModeloFormulario | null = useMemo(
    () => (instrumento.fase === 'ok' ? montarModelo(instrumento.detalhe) : null),
    [instrumento],
  );

  const faltando = modelo ? pendencias(modelo, estado) : [];
  const habilitado = modelo ? podeEnviar(modelo, estado, enviando) : false;

  async function enviar() {
    if (!modelo || !habilitado) return;   // trava de duplo clique
    setEnviando(true);
    setErroEnvio(null);
    try {
      const resposta = await corrigirInstrumento(montarPedido(modelo, estado));
      setResultado(resposta);
    } catch (err: unknown) {
      setErroEnvio(
        err instanceof CorrigeFacilError
          ? err.message
          : 'O serviço está indisponível no momento.',
      );
    } finally {
      setEnviando(false);
    }
  }

  const voltar = (
    <Link
      href="/app/corrigefacil"
      className="inline-flex items-center gap-2 text-pp-ink-soft text-sm hover:text-pp-ink transition"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Voltar ao catálogo
    </Link>
  );

  if (instrumento.fase === 'carregando') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <p className="text-pp-ink-soft text-sm" role="status">
          Carregando instrumento…
        </p>
      </div>
    );
  }

  if (instrumento.fase === 'erro') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <section className="bg-pp-block-lilac rounded-block p-8 space-y-4">
          <p className="text-pp-ink text-base">{instrumento.mensagem}</p>
          {acaoSugerida(instrumento.tipo as never) === 'tentar' && (
            <button
              type="button"
              onClick={() => carregar()}
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

  const detalhe = instrumento.detalhe;
  const m = modelo!;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pt-4">
      {voltar}

      <header className="space-y-2">
        <p className="font-mono text-xs tracking-wide text-pp-ink bg-white/60 inline-block px-2 py-0.5 rounded">
          {detalhe.code}
        </p>
        <h1 className="font-serif italic text-3xl md:text-4xl text-pp-ink leading-tight">
          {detalhe.name}
        </h1>
        <p className="text-pp-ink-soft text-sm">
          Preencha o protocolo e envie para correção. O cálculo é feito no
          servidor.
        </p>
      </header>

      {m.bloqueio ? (
        <section className="bg-pp-block-lilac rounded-block p-8">
          <p className="text-pp-ink text-base">{TEXTO_BLOQUEIO[m.bloqueio]}</p>
        </section>
      ) : resultado ? (
        <ResultadoCorrecao
          resposta={resultado}
          onCorrigirNovamente={() => setResultado(null)}
        />
      ) : (
        <>
          {m.dimensoes.length > 0 && (
            <section className="space-y-4">
              {m.dimensoes.map((d, i) => {
                const opcoes = opcoesDaDimensao(m, detalhe.arvore, i, estado.selector);
                return (
                  <label key={d.code} className="block space-y-1">
                    <span className="text-sm text-pp-ink">{d.label}</span>
                    <select
                      value={estado.selector[d.code] ?? ''}
                      onChange={(e) =>
                        setEstado((s) => ({
                          ...s,
                          selector: escolherDimensao(m, s.selector, i, e.target.value),
                        }))
                      }
                      className="block w-full max-w-sm rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
                    >
                      <option value="">— selecione —</option>
                      {opcoes.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </section>
          )}

          {m.entryMode === 'itens' && (
            <ol className="space-y-3">
              {m.itens.map((item) => (
                <li
                  key={item.numero}
                  className="border border-pp-ink/10 rounded-block p-4 space-y-3"
                >
                  <p className="text-pp-ink text-sm">
                    <span className="text-pp-ink-soft mr-2">{item.numero}.</span>
                    {item.texto}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.opcoes.map((o) => {
                      const marcado = estado.respostas[item.numero] === o.value;
                      return (
                        <button
                          key={`${item.numero}-${o.label}-${String(o.value)}`}
                          type="button"
                          aria-pressed={marcado}
                          disabled={o.value === null}
                          onClick={() =>
                            setEstado((s) => {
                              const respostas = { ...s.respostas };
                              if (o.value === null) return s;
                              if (respostas[item.numero] === o.value) {
                                delete respostas[item.numero];
                              } else {
                                respostas[item.numero] = o.value;
                              }
                              return { ...s, respostas };
                            })
                          }
                          className={`px-3 py-1.5 rounded-pill text-sm border transition ${
                            marcado
                              ? 'bg-pp-ink text-pp-canvas border-pp-ink'
                              : 'bg-white/60 text-pp-ink border-pp-ink/15 hover:border-pp-ink/40'
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {m.entryMode === 'bruto' && (
            <div className="space-y-3">
              {m.escalas.map((e) => (
                <label
                  key={e.code}
                  className="flex items-center justify-between gap-4 border border-pp-ink/10 rounded-block p-4"
                >
                  <span className="text-pp-ink text-sm">
                    {e.nome} <span className="text-pp-ink-soft">({e.code})</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={e.min ?? undefined}
                    max={e.max ?? undefined}
                    value={estado.brutos[e.code] ?? ''}
                    onChange={(ev) =>
                      setEstado((s) => {
                        const brutos = { ...s.brutos };
                        if (ev.target.value === '') delete brutos[e.code];
                        else brutos[e.code] = Number(ev.target.value);
                        return { ...s, brutos };
                      })
                    }
                    className="w-28 rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
                  />
                </label>
              ))}
            </div>
          )}

          {m.entryMode === 'componentes' && (
            <div className="space-y-3">
              {m.escalas.map((e) => (
                <div key={e.code} className="border border-pp-ink/10 rounded-block p-4 space-y-3">
                  <p className="text-pp-ink text-sm">
                    {e.nome} <span className="text-pp-ink-soft">({e.code})</span>
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {COMPONENTES.map((nome) => (
                      <label key={nome} className="text-xs text-pp-ink-soft space-y-1">
                        <span className="block capitalize">{nome}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={estado.componentes[e.code]?.[nome] ?? ''}
                          onChange={(ev) =>
                            setEstado((s) => {
                              const atual = { ...(s.componentes[e.code] ?? {}) };
                              if (ev.target.value === '') delete atual[nome];
                              else atual[nome] = Number(ev.target.value);
                              return {
                                ...s,
                                componentes: { ...s.componentes, [e.code]: atual },
                              };
                            })
                          }
                          className="w-24 rounded-pill border border-pp-ink/15 bg-white/60 px-3 py-1.5 text-sm text-pp-ink"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {erroEnvio && (
            <p className="text-sm text-pp-ink bg-pp-block-lilac rounded-block p-4">{erroEnvio}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 border-t border-pp-ink/10 pt-6">
            <button
              type="button"
              onClick={enviar}
              disabled={!habilitado}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? 'Corrigindo…' : 'Corrigir'}
            </button>
            {faltando.length > 0 && (
              <p className="text-pp-ink-soft text-sm">{textoPendencia(faltando)}</p>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        {AVISO}
      </p>
    </div>
  );
}

function textoPendencia(lista: ReturnType<typeof pendencias>): string {
  const partes = lista.map((p) => {
    if (p.tipo === 'itens') return `${p.faltam.length} item(ns) sem resposta`;
    if (p.tipo === 'dimensoes') return `escolha: ${p.faltam.join(', ')}`;
    return `preencha: ${p.faltam.join(', ')}`;
  });
  return partes.join(' · ');
}

function ResultadoCorrecao({
  resposta,
  onCorrigirNovamente,
}: {
  resposta: RespostaCorrecao;
  onCorrigirNovamente: () => void;
}) {
  const linhas = Object.entries(resposta.resultados);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        {linhas.map(([escala, r]) => (
          <div key={escala} className="border border-pp-ink/10 rounded-block p-5 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-pp-ink font-medium">{escala}</p>
              {r.raw !== null && (
                <p className="text-pp-ink-soft text-sm">bruto {r.raw}</p>
              )}
            </div>

            {r.available ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                {r.score !== null && (
                  <p className="text-pp-ink">
                    escore <span className="font-medium">{r.score}</span>
                    {r.ci95 ? ` (${r.ci95})` : ''}
                  </p>
                )}
                {r.percentile !== null && (
                  <p className="text-pp-ink">percentil {r.percentile}</p>
                )}
                {r.z !== null && <p className="text-pp-ink">z {r.z}</p>}
                {r.classification && (
                  <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
                    {r.classification}
                  </span>
                )}
              </div>
            ) : (
              // available=false nunca vira campo vazio: entra a mensagem que
              // o servidor mandou, sem tradução nem paráfrase.
              <p className="text-pp-ink-soft text-sm">
                {r.message ?? 'Resultado indisponível.'}
              </p>
            )}

            {r.flags.length > 0 && (
              <p className="text-pp-ink-soft text-xs">revisar: {r.flags.join(', ')}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={onCorrigirNovamente}
          className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
        >
          Corrigir novamente
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 border border-pp-ink/15 text-pp-ink px-6 py-3 rounded-pill text-sm font-medium hover:border-pp-ink/40 transition"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          Imprimir
        </button>
        <Link
          href="/app/corrigefacil"
          className="inline-flex items-center gap-2 border border-pp-ink/15 text-pp-ink px-6 py-3 rounded-pill text-sm font-medium hover:border-pp-ink/40 transition"
        >
          Voltar ao catálogo
        </Link>
      </div>
    </section>
  );
}
