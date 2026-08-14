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
import { RespostasAuxiliares } from '../../RespostasAuxiliares';
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
import { CorrigeFacilReportPanel } from '../../CorrigeFacilReportPanel';
import {
  itensVisiveis,
  montarModelo,
  secoesDeItens,
  TEXTO_BLOQUEIO,
  type ModeloFormulario,
} from './form-model';
import type { CampoItem } from './form-model';
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

const ROTULO_COMPONENTE: Record<string, string> = {
  acertos: 'Acertos',
  erros: 'Erros',
  omissoes: 'Omissões',
};

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

/** O corpo de UM item: enunciado e as alternativas dele.
 *
 *  Extraído para que o item AUXILIAR use exatamente a mesma marcação dos
 *  itens pontuados — a diferença entre os dois é ONDE cada um aparece, e
 *  não como se responde. Duplicar o JSX faria a seção auxiliar envelhecer
 *  sozinha na primeira mudança de estilo.
 *
 *  `ordinal` é o "1." antes do enunciado. O auxiliar não recebe: ele não é
 *  o décimo de uma lista de nove, é uma pergunta à parte. */
function CorpoDoItem({
  item,
  valor,
  aoEscolher,
  ordinal,
}: Readonly<{
  item: CampoItem;
  valor: number | undefined;
  aoEscolher: (v: number) => void;
  ordinal: boolean;
}>) {
  return (
    <>
      <p id={`item-${item.numero}`} className="text-pp-ink text-sm">
        {ordinal && (
          <span className="text-pp-ink-soft mr-2 tabular-nums">
            {item.numero}.
          </span>
        )}
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
          const marcado = valor === o.value;
          return (
            <button
              key={`${item.numero}-${o.label}-${String(o.value)}`}
              type="button"
              role="radio"
              aria-checked={marcado}
              disabled={o.value === null}
              onClick={() => {
                if (o.value === null) return;
                aoEscolher(o.value);
              }}
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
    </>
  );
}

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
  const errosIdentificacao = modelo
    ? validarIdentificacao(identificacao, modelo.exigeDataNascimento)
    : [];
  const habilitado = modelo
    ? podeEnviar(modelo, estado, enviando) && errosIdentificacao.length === 0
    : false;

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
        setEstado(estadoParaEnvio);
        setIdentificacao((atual) => ({ ...atual, idadeCalculada: resolvida.age }));
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

  async function salvar(): Promise<string | null> {
    if (salvamento.fase === 'salvo') return salvamento.id;
    if (
      !modelo ||
      !podeSalvar(
        identificacao,
        modelo.exigeDataNascimento,
        salvamento.fase === 'salvando',
        false,
      )
    ) {
      return null;
    }
    setSalvamento({ fase: 'salvando' });
    try {
      const criada = await salvarAvaliacao(
        montarPedidoAvaliacao(modelo, estado, identificacao),
      );
      setSalvamento({ fase: 'salvo', id: criada.assessment_id });
      return criada.assessment_id;
    } catch (err: unknown) {
      setSalvamento({
        fase: 'erro',
        mensagem:
          err instanceof CorrigeFacilError
            ? err.message
            : 'Não foi possível salvar agora. Tente novamente.',
      });
      return null;
    }
  }

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
  // Os itens que estão na tela AGORA: com uma seção de porta fechada, os
  // dependentes dela não aparecem. Nos outros 20 instrumentos é a lista
  // inteira, sempre.
  const visiveis = itensVisiveis(m, estado.respostas);
  const secoes = secoesDeItens(visiveis);

  /** Marcar de novo a alternativa já marcada limpa a resposta — é como se
   *  desmarca um item respondido por engano. */
  const responder = (numero: number, v: number) =>
    setEstado((st) => {
      const respostas = { ...st.respostas };
      if (respostas[numero] === v) delete respostas[numero];
      else respostas[numero] = v;
      return { ...st, respostas };
    });

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
          salvamento={salvamento}
          onSalvar={salvar}
        />
      ) : (
        <>
          <IdentificacaoFields
            modelo={m}
            identificacao={identificacao}
            onIdentificacao={setIdentificacao}
            erros={errosIdentificacao}
          />

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
            <>
              {/* O enunciado dos itens PONTUADOS, uma vez, imediatamente
                  antes deles. Fica fora do <ol> porque não é item, e antes
                  da seção auxiliar porque não vale para ela — o impacto
                  funcional pergunta outra coisa e traz o enunciado dele. */}
              {m.instrucaoItens && (
                <p className="text-pp-ink text-sm">{m.instrucaoItens}</p>
              )}

              {/* A lista numerada: os itens SEM seção. O que define o lugar
                  é `secao`, não `auxiliar` — a Seção de Impacto do SDQ tem
                  itens que pontuam, e eles pertencem ao bloco dela, não a
                  esta lista. O ordinal continua sendo só de quem pontua: o
                  auxiliar não é o décimo de uma lista de nove. */}
              <ol className="space-y-3">
                {visiveis
                  .filter((item) => !item.secao)
                  .map((item) => {
                    const respondido = estado.respostas[item.numero] !== undefined;
                    return (
                      <li
                        key={item.numero}
                        className={`border rounded-block p-4 space-y-3 transition-colors ${
                          respondido ? 'border-pp-ink/25' : 'border-pp-ink/10'
                        }`}
                      >
                        <CorpoDoItem
                          item={item}
                          valor={estado.respostas[item.numero]}
                          ordinal={!item.auxiliar}
                          aoEscolher={(v) => responder(item.numero, v)}
                        />
                      </li>
                    );
                  })}
              </ol>

              {/* E, abaixo, as SEÇÕES: o título aparece UMA vez para o bloco
                  inteiro, não a cada pergunta. Instrumento sem item em seção
                  não renderiza nada aqui; no PHQ-9 dá uma seção com um item
                  só, que é o que a tela já desenhava. */}
              {secoes.map((secao) => (
                <section key={secao.titulo} className="space-y-3">
                  <h3 className="text-pp-ink text-sm font-medium">
                    {secao.titulo}
                  </h3>
                  {secao.itens.map((item) => {
                    const respondido = estado.respostas[item.numero] !== undefined;
                    return (
                      <div
                        key={item.numero}
                        className={`border rounded-block p-4 space-y-3 transition-colors ${
                          respondido ? 'border-pp-ink/25' : 'border-pp-ink/10'
                        }`}
                      >
                        <CorpoDoItem
                          item={item}
                          valor={estado.respostas[item.numero]}
                          ordinal={false}
                          aoEscolher={(v) => responder(item.numero, v)}
                        />
                      </div>
                    );
                  })}
                </section>
              ))}
            </>
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

function IdentificacaoFields({
  modelo,
  identificacao,
  onIdentificacao,
  erros,
}: {
  modelo: ModeloFormulario;
  identificacao: IdentificacaoAvaliado;
  onIdentificacao: (d: IdentificacaoAvaliado) => void;
  erros: ReturnType<typeof validarIdentificacao>;
}) {
  return (
    <section className="bg-pp-block-lilac rounded-block p-6 space-y-4">
      <div>
        <p className="text-pp-ink text-sm font-medium">Identificação do avaliado</p>
        <p className="text-pp-ink-soft text-xs mt-1">
          Nome e idade acompanham a avaliação salva e deixam o resultado pronto para o Relatório Pró.
        </p>
      </div>

      <div className={`grid gap-3 ${modelo.exigeDataNascimento ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <label className="text-xs text-pp-ink-soft space-y-1">
          <span className="block">
            Nome do avaliado <span className="text-pp-ink">(obrigatório)</span>
          </span>
          <input
            type="text"
            required
            aria-required="true"
            value={identificacao.nome}
            onChange={(e) => onIdentificacao({ ...identificacao, nome: e.target.value })}
            className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
          />
        </label>

        {!modelo.exigeDataNascimento && (
          <label className="text-xs text-pp-ink-soft space-y-1">
            <span className="block">
              Idade <span className="text-pp-ink">(obrigatória)</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={130}
              step={1}
              required
              aria-required="true"
              value={identificacao.idadeAnos}
              onChange={(e) =>
                onIdentificacao({ ...identificacao, idadeAnos: e.target.value })
              }
              className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
            />
            <span className="block text-[11px]">Anos completos.</span>
          </label>
        )}

        <label className="text-xs text-pp-ink-soft space-y-1">
          <span className="block">Respondente (opcional)</span>
          <input
            type="text"
            value={identificacao.respondente}
            onChange={(e) =>
              onIdentificacao({ ...identificacao, respondente: e.target.value })
            }
            className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
          />
        </label>
      </div>

      {modelo.exigeDataNascimento && (
        <p className="text-pp-ink-soft text-xs">
          A idade será calculada pelo servidor a partir das datas informadas abaixo.
        </p>
      )}

      {erros.length > 0 && (
        <p className="text-pp-ink-soft text-xs">
          {erros.map((e) => TEXTO_ERRO_IDENTIFICACAO[e]).join(' · ')}
        </p>
      )}
    </section>
  );
}

function ResultadoCorrecao({
  resposta,
  detalhe,
  onCorrigirNovamente,
  identificacao,
  salvamento,
  onSalvar,
}: {
  resposta: RespostaCorrecao;
  detalhe: InstrumentoDetalhe;
  onCorrigirNovamente: () => void;
  identificacao: IdentificacaoAvaliado;
  salvamento: EstadoSalvamento;
  onSalvar: () => Promise<string | null>;
}) {
  const linhas = Object.entries(resposta.resultados);
  const habilitado = podeSalvar(
    identificacao,
    detalhe.requires_birthdate,
    salvamento.fase === 'salvando',
    salvamento.fase === 'salvo',
  );

  return (
    <section className="space-y-8">
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
                    <span className="inline-block max-w-full break-words bg-pp-block-lilac text-pp-ink px-4 py-2 rounded-pill text-sm font-medium print:border print:border-pp-ink">
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

      {/* FORA dos cards e FORA do gráfico: o auxiliar é resposta, não
          resultado. O ResultGraph só desenha escala, e o auxiliar não é
          uma — ele nem chega lá, porque não está em `resultados`. */}
      <RespostasAuxiliares respostas={resposta.auxiliary_responses} />

      <ResultGraph detalhe={detalhe} resposta={resposta} />

      <hr className="border-pp-hairline-soft" />

      <CorrigeFacilReportPanel
        assessmentId={salvamento.fase === 'salvo' ? salvamento.id : null}
        ensureAssessmentId={onSalvar}
      />

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
        <section className="bg-white/30 border border-pp-hairline rounded-block p-6 space-y-4 print:hidden">
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Salvar sem relatório
          </p>
          <p className="text-sm text-pp-ink">
            {identificacao.nome.trim()}
          </p>

          {salvamento.fase === 'erro' && (
            <p role="alert" className="text-sm text-pp-ink">
              {salvamento.mensagem}
            </p>
          )}

          <button
            type="button"
            onClick={() => void onSalvar()}
            disabled={!habilitado}
            className="inline-flex items-center gap-2 border border-pp-ink/20 text-pp-ink px-6 py-3 rounded-pill text-sm font-medium hover:border-pp-ink/45 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {salvamento.fase === 'salvando' ? 'Salvando…' : 'Salvar sem relatório'}
          </button>
        </section>
      )}

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
