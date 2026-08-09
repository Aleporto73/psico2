'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import {
  buscarInstrumento,
  corrigirInstrumento,
  CorrigeFacilError,
  salvarAvaliacao,
  type InstrumentoDetalhe,
  type RespostaCorrecao,
} from '@/lib/corrigefacil/api';
import { resolverNormaData } from '@/lib/corrigefacil/date-norm-api';
import { ResultGraph } from '../../graphs/ResultGraph';
import {
  identificacaoInicial,
  montarPedidoAvaliacao,
  podeSalvar,
  TEXTO_ERRO_IDENTIFICACAO,
  validarIdentificacao,
  type IdentificacaoAvaliado,
} from './save-model';
import { acaoSugerida } from '../../catalog-view';
import { CorrigeFacilNav } from '../../CorrigeFacilNav';
import { montarModelo, TEXTO_BLOQUEIO, type ModeloFormulario } from './form-model';
import {
  COMPONENTES,
  escolherDimensao,
  estadoInicial,
  montarPedido,
  opcoesDaDimensao,
  pendencias,
  podeEnviar,
  progresso,
  textoIntervaloBruto,
  textoPendencia,
  type EstadoFormulario,
} from './form-state';
import { DateNormFields } from './DateNormFields';

/** Rótulo humano dos componentes. As CHAVES (`omissoes`) são contrato do
 *  payload e não mudam; só o que aparece na tela ganha acento. */
const ROTULO_COMPONENTE: Record<string, string> = {
  acertos: 'Acertos',
  erros: 'Erros',
  omissoes: 'Omissões',
};

/** A partir de quantos itens o protocolo ganha barra de ação fixa.
 *
 *  Não é enfeite: em 8 dos 21 instrumentos publicados o protocolo passa
 *  disso (DCDQ 15, CES-D 20, SNAP-IV-26 26, TRAÇO 34, ERA-F 34, SCARED-C 41,
 *  EPQ-J 60, CONFIAS 70, ERA-A 75, C-TRF 100). Sem a barra, quem responde o
 *  último item precisa rolar até o fim para achar o botão e não vê quanto
 *  falta enquanto responde. Abaixo do limite a página inteira cabe na tela e
 *  a barra só ocuparia espaço. */
const LIMITE_BARRA_FIXA = 15;

const AVISO =
  'Resultado de instrumento de rastreio/correção. Deve ser interpretado ' +
  'pelo profissional responsável e não substitui avaliação completa.';

type FaseInstrumento =
  | { fase: 'carregando' }
  | { fase: 'ok'; detalhe: InstrumentoDetalhe }
  | { fase: 'erro'; tipo: string; mensagem: string };

export type EstadoSalvamento =
  | { fase: 'inativo' }
  | { fase: 'salvando' }
  | { fase: 'salvo'; id: string }
  | { fase: 'erro'; mensagem: string };

export function AvaliarClient({ code }: { code: string }) {
  const [instrumento, setInstrumento] = useState<FaseInstrumento>({ fase: 'carregando' });
  const [estado, setEstado] = useState<EstadoFormulario>(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<RespostaCorrecao | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [identificacao, setIdentificacao] = useState(identificacaoInicial);
  const [salvamento, setSalvamento] = useState<EstadoSalvamento>({ fase: 'inativo' });

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

  const modelo: ModeloFormulario | null =
    instrumento.fase === 'ok' ? montarModelo(instrumento.detalhe) : null;

  const faltando = modelo ? pendencias(modelo, estado) : [];
  const habilitado = modelo ? podeEnviar(modelo, estado, enviando) : false;

  async function enviar() {
    if (!modelo || !habilitado) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      let estadoParaEnvio = estado;

      if (modelo.exigeDataNascimento) {
        const resolvida = await resolverNormaData({
          instrument_code: modelo.code,
          birth_date: estado.birthDate,
          evaluation_date: estado.evaluationDate,
          ...(modelo.suportaPrematuridade
            ? {
                prematurity_weeks: estado.prematurityWeeks,
                prematurity_rule: estado.prematurityRule,
              }
            : {}),
        });
        estadoParaEnvio = {
          ...estado,
          selector: { ...estado.selector, ...resolvida.norm_selector },
        };
        // O mesmo selector usado na correção fica no estado para o POST
        // /avaliacao. O resultado salvo é recalculado pela Edge com a mesma norma.
        setEstado(estadoParaEnvio);
      }

      const resposta = await corrigirInstrumento(montarPedido(modelo, estadoParaEnvio));
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

  // Salvar é SEMPRE por clique. A Edge recalcula e só o 201 marca como salvo.
  async function salvar() {
    if (
      !modelo ||
      !podeSalvar(
        identificacao,
        salvamento.fase === 'salvando',
        salvamento.fase === 'salvo',
      )
    ) {
      return;
    }
    setSalvamento({ fase: 'salvando' });
    try {
      const criada = await salvarAvaliacao(
        montarPedidoAvaliacao(modelo, estado, identificacao),
      );
      setSalvamento({ fase: 'salvo', id: criada.assessment_id });
    } catch (err: unknown) {
      setSalvamento({
        fase: 'erro',
        mensagem:
          err instanceof CorrigeFacilError
            ? err.message
            : 'Não foi possível salvar agora. Tente novamente.',
      });
    }
  }

  // Barra de seções + retorno de um nível. A aba "Instrumentos" fica marcada
  // durante toda a aplicação: quem está no meio do protocolo vê onde está.
  const voltar = (
    <div className="space-y-4">
      <CorrigeFacilNav />
      <Link
        href="/app/corrigefacil"
        className="inline-flex items-center gap-2 text-pp-ink-soft text-sm hover:text-pp-ink transition"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Voltar ao catálogo
      </Link>
    </div>
  );

  if (instrumento.fase === 'carregando') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <output className="block text-pp-ink-soft text-sm">
          Carregando instrumento…
        </output>
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
  const prog = progresso(m, estado);
  const barraFixa = (prog?.total ?? 0) >= LIMITE_BARRA_FIXA;

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
          Preencha o protocolo e envie para correção. O cálculo é feito no servidor.
        </p>
      </header>

      {m.bloqueio ? (
        <section className="bg-pp-block-lilac rounded-block p-8">
          <p className="text-pp-ink text-base">{TEXTO_BLOQUEIO[m.bloqueio]}</p>
        </section>
      ) : resultado ? (
        <ResultadoCorrecao
          resposta={resultado}
          detalhe={detalhe}
          onCorrigirNovamente={() => {
            setResultado(null);
            setSalvamento({ fase: 'inativo' });
          }}
          identificacao={identificacao}
          onIdentificacao={setIdentificacao}
          salvamento={salvamento}
          onSalvar={salvar}
        />
      ) : (
        <>
          <DateNormFields modelo={m} estado={estado} setEstado={setEstado} />

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
              {m.itens.map((item) => {
                const respondido = estado.respostas[item.numero] !== undefined;
                return (
                  <li
                    key={item.numero}
                    className={`border rounded-block p-4 space-y-3 transition-colors ${
                      respondido ? 'border-pp-ink/25' : 'border-pp-ink/10'
                    }`}
                  >
                    <p id={`item-${item.numero}`} className="text-pp-ink text-sm">
                      <span className="text-pp-ink-soft mr-2 tabular-nums">
                        {item.numero}.
                      </span>
                      {/* Sem enunciado no banco, o número É o enunciado: some
                          o "Item 12" redundante ao lado do "12." e fica a
                          referência ao caderno impresso. */}
                      {item.semEnunciado ? (
                        <span className="text-pp-ink-soft italic">
                          sem enunciado neste instrumento
                        </span>
                      ) : (
                        item.texto
                      )}
                    </p>
                    <div
                      role="radiogroup"
                      aria-labelledby={`item-${item.numero}`}
                      className="flex flex-wrap gap-2"
                    >
                      {item.opcoes.map((o) => {
                        const marcado = estado.respostas[item.numero] === o.value;
                        return (
                          <button
                            key={`${item.numero}-${o.label}-${String(o.value)}`}
                            type="button"
                            role="radio"
                            aria-checked={marcado}
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
                            className={`px-3 py-2 min-h-11 rounded-pill text-sm border transition disabled:opacity-40 disabled:cursor-not-allowed ${
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
                );
              })}
            </ol>
          )}

          {m.entryMode === 'bruto' && (
            <div className="space-y-3">
              {m.escalas.map((e) => (
                <label
                  key={e.code}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-pp-ink/10 rounded-block p-4"
                >
                  <span className="text-pp-ink text-sm">
                    {e.nome} <span className="text-pp-ink-soft">({e.code})</span>
                    {/* O intervalo aceito vem do catálogo. Dizê-lo evita o
                        vaivém de digitar, enviar e receber recusa. */}
                    {textoIntervaloBruto(e.min, e.max) && (
                      <span className="block text-pp-ink-soft text-xs mt-0.5">
                        {textoIntervaloBruto(e.min, e.max)}
                      </span>
                    )}
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
                  <p className="text-pp-ink text-sm font-medium">
                    {e.nome} <span className="text-pp-ink-soft font-normal">({e.code})</span>
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {COMPONENTES.map((nome) => (
                      <label key={nome} className="text-xs text-pp-ink-soft space-y-1">
                        {/* `capitalize` sobre a chave crua imprimia "Omissoes".
                            A chave é contrato do payload; o rótulo é da tela. */}
                        <span className="block">{ROTULO_COMPONENTE[nome] ?? nome}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
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
            <p
              role="alert"
              className="text-sm text-pp-ink bg-pp-block-lilac rounded-block p-4"
            >
              {erroEnvio}
            </p>
          )}

          {/* Em protocolo longo a barra acompanha a rolagem; em protocolo
              curto ela é só o rodapé de sempre. O conteúdo é idêntico nos
              dois casos — muda o posicionamento, não a ação. */}
          <div
            className={
              barraFixa
                ? 'sticky bottom-0 -mx-4 px-4 py-4 bg-pp-canvas/95 backdrop-blur border-t border-pp-ink/10'
                : 'border-t border-pp-ink/10 pt-6'
            }
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={enviar}
                disabled={!habilitado}
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviando ? 'Corrigindo…' : 'Corrigir'}
              </button>

              {prog && (
                <output className="block text-pp-ink-soft text-sm tabular-nums">
                  {prog.respondidos} de {prog.total} respondidos
                </output>
              )}

              {faltando.length > 0 && (
                <p className="text-pp-ink-soft text-sm w-full sm:w-auto">
                  {textoPendencia(faltando)}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        {AVISO}
      </p>
    </div>
  );
}

function ResultadoCorrecao({
  resposta,
  detalhe,
  onCorrigirNovamente,
  identificacao,
  onIdentificacao,
  salvamento,
  onSalvar,
}: {
  resposta: RespostaCorrecao;
  detalhe: InstrumentoDetalhe;
  onCorrigirNovamente: () => void;
  identificacao: IdentificacaoAvaliado;
  onIdentificacao: (d: IdentificacaoAvaliado) => void;
  salvamento: EstadoSalvamento;
  onSalvar: () => void;
}) {
  const linhas = Object.entries(resposta.resultados);
  const erros = validarIdentificacao(identificacao);
  const habilitado = podeSalvar(
    identificacao,
    salvamento.fase === 'salvando',
    salvamento.fase === 'salvo',
  );

  return (
    <section className="space-y-8">
      {/* O resultado é o principal elemento da tela: respiro maior, valor
          em corpo grande e a classificação como chip. O chip é lilás
          porque é o pastel neutro do produto — destaque de leitura, não
          indicação de gravidade. */}
      <div className="space-y-4">
        {linhas.map(([escala, r]) => (
          <article
            key={escala}
            className="border border-pp-hairline bg-pp-block-lilac/15 rounded-block p-6 sm:p-7 space-y-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-pp-ink text-base font-medium">{escala}</h3>
              {r.raw !== null && (
                <p className="text-pp-ink-soft text-xs">bruto {r.raw}</p>
              )}
            </div>

            {r.available ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                  {r.score !== null && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                        escore
                      </p>
                      <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
                        {r.score}
                        {r.ci95 && (
                          <span className="text-pp-ink-soft text-sm font-normal">
                            {' '}
                            ({r.ci95})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {r.percentile !== null && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                        percentil
                      </p>
                      <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
                        {r.percentile}
                      </p>
                    </div>
                  )}
                  {r.z !== null && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                        z
                      </p>
                      <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
                        {r.z}
                      </p>
                    </div>
                  )}
                </div>

                {r.classification && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                      classificação
                    </p>
                    {/* break-words: classificação longa não estoura o card
                        no celular */}
                    <span className="inline-block max-w-full break-words bg-pp-block-lilac text-pp-ink px-4 py-2 rounded-pill text-sm font-medium">
                      {r.classification}
                    </span>
                  </div>
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
          </article>
        ))}
      </div>

      {/* Entre o resultado textual e o salvamento. A tabela acima
          permanece intacta: o gráfico acompanha a leitura, não a
          substitui — e há instrumento sem gráfico aprovado, onde ele
          simplesmente não aparece. */}
      <ResultGraph detalhe={detalhe} resposta={resposta} />

      <hr className="border-pp-hairline-soft" />

      {salvamento.fase === 'salvo' ? (
        <section className="bg-pp-block-lilac/40 border border-pp-block-lilac rounded-block p-6 space-y-3 print:hidden">
          <output className="block text-pp-ink text-base">
            Avaliação salva. Ela já aparece em Avaliações salvas.
          </output>
          <Link
            href={`/app/corrigefacil/avaliacoes/${encodeURIComponent(salvamento.id)}`}
            className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
          >
            Abrir avaliação salva
          </Link>
        </section>
      ) : (
        <section className="bg-pp-block-lilac/40 border border-pp-block-lilac rounded-block p-6 space-y-4 print:hidden">
          {/* ação operacional: fica abaixo do resultado na hierarquia, e
              por isso o lilás entra lavado, com o título em corpo menor
              que o de "Representação visual" */}
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Salvar esta avaliação
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-pp-ink-soft space-y-1">
              {/* O único obrigatório dos três, e até aqui nada dizia isso: o
                  botão ficava desabilitado sem explicar qual campo faltava. */}
              <span className="block">
                Avaliado · iniciais ou código{' '}
                <span className="text-pp-ink">(obrigatório)</span>
              </span>
              <input
                type="text"
                required
                aria-required="true"
                value={identificacao.rotulo}
                onChange={(e) => onIdentificacao({ ...identificacao, rotulo: e.target.value })}
                className="w-full rounded-pill border border-pp-hairline bg-white px-4 py-2 text-sm text-pp-ink"
              />
            </label>
            <label className="text-xs text-pp-ink-soft space-y-1">
              <span className="block">Respondente (opcional)</span>
              <input
                type="text"
                value={identificacao.respondente}
                onChange={(e) =>
                  onIdentificacao({ ...identificacao, respondente: e.target.value })
                }
                className="w-full rounded-pill border border-pp-hairline bg-white px-4 py-2 text-sm text-pp-ink"
              />
            </label>
            <label className="text-xs text-pp-ink-soft space-y-1">
              <span className="block">Profissional (opcional)</span>
              <input
                type="text"
                value={identificacao.profissional}
                onChange={(e) =>
                  onIdentificacao({ ...identificacao, profissional: e.target.value })
                }
                className="w-full rounded-pill border border-pp-hairline bg-white px-4 py-2 text-sm text-pp-ink"
              />
            </label>
          </div>

          {salvamento.fase === 'erro' && (
            <p role="alert" className="text-sm text-pp-ink">
              {salvamento.mensagem}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onSalvar}
              disabled={!habilitado}
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {salvamento.fase === 'salvando' ? 'Salvando…' : 'Salvar avaliação'}
            </button>
            {erros.length > 0 && (
              <p className="text-pp-ink-soft text-xs">
                {erros.map((e) => TEXTO_ERRO_IDENTIFICACAO[e]).join(' · ')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Ações secundárias: nenhuma delas disputa atenção com o
          resultado. "Corrigir novamente" saiu de botão cheio para
          contorno — ela reinicia a leitura, não a conclui. */}
      <div className="flex flex-wrap gap-3 pt-2 print:hidden">
        <button
          type="button"
          onClick={onCorrigirNovamente}
          className="inline-flex items-center gap-2 border border-pp-hairline text-pp-ink px-5 py-2.5 rounded-pill text-sm hover:border-pp-ink/30 transition"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Corrigir novamente
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 border border-pp-hairline text-pp-ink px-5 py-2.5 rounded-pill text-sm hover:border-pp-ink/30 transition"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          Imprimir
        </button>
        <Link
          href="/app/corrigefacil"
          className="inline-flex items-center gap-2 text-pp-ink-soft px-5 py-2.5 rounded-pill text-sm hover:text-pp-ink transition"
        >
          Voltar ao catálogo
        </Link>
      </div>
    </section>
  );
}
