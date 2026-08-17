'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Printer, RefreshCw } from 'lucide-react';
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
import { CODIGOS_DOS_21 } from '../../graphs/graph-config';
import { RespostasAuxiliares } from '../../RespostasAuxiliares';
import { MetodoDeCorrecao } from '../../MetodoDeCorrecao';
import { metricasDaEscala } from '@/lib/corrigefacil/metricas-instrumento';
import { celulasDoResultado } from '@/lib/corrigefacil/resultado-celulas';
import { ResultadoMetricas } from '../../ResultadoMetricas';
import {
  identificacaoInicial,
  montarPedidoAvaliacao,
  podeSalvar,
  textoDoCampoIdade,
  textoErroIdentificacao,
  validarIdentificacao,
  type IdentificacaoAvaliado,
} from './save-model';
import {
  metaDeTempos,
  temposDoInstrumento,
  NOTA_TEMPOS,
  TITULO_TEMPOS,
} from '@/lib/corrigefacil/tempos-execucao';
import { TemposDeExecucao } from '../../TemposDeExecucao';
import { acaoSugerida } from '../../catalog-view';
import { CorrigeFacilNav } from '../../CorrigeFacilNav';
import { CorrigeFacilReportPanel } from '../../CorrigeFacilReportPanel';
import {
  gruposDeItens,
  itensVisiveis,
  montarModelo,
  resolvidaPelaIdade,
  secoesDeItens,
  TEXTO_BLOQUEIO,
  type ModeloFormulario,
} from './form-model';
import { ConfiasDerivado } from '../../ConfiasDerivado';
import { derivadoConfias } from '@/lib/corrigefacil/confias-derivado';
import { Phq9Derivado } from '../../Phq9Derivado';
import { derivadoPhq9 } from '@/lib/corrigefacil/phq9-derivado';
import { FdtDerivado } from '../../FdtDerivado';
import { derivadoFdt, ehFdt } from '@/lib/corrigefacil/fdt-derivado';
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
  textoDaEntradaBruta,
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
  avisarSemEnunciado = true,
}: Readonly<{
  item: CampoItem;
  valor: number | undefined;
  aoEscolher: (v: number) => void;
  ordinal: boolean;
  /** Mostrar "sem enunciado neste instrumento" no lugar do texto ausente.
   *
   *  Verdadeiro na lista corrida, que é como os instrumentos sem enunciado
   *  aparecem hoje e continuam aparecendo. Falso na apresentação AGRUPADA:
   *  ali o item já se identifica por "Item N" sob o título da tarefa, e
   *  repetir o aviso setenta vezes transformaria o protocolo numa coluna de
   *  advertências. A ausência é do instrumento inteiro, não de cada item. */
  avisarSemEnunciado?: boolean;
}>) {
  return (
    <>
      <p id={`item-${item.numero}`} className="text-pp-ink text-sm">
        {ordinal && (
          <span className="text-pp-ink-soft mr-2 tabular-nums">
            {item.numero}.
          </span>
        )}
        {item.semEnunciado && avisarSemEnunciado ? (
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

/** `modoDemo` NÃO é inferido aqui, e não pode ser: ele vem do Server
 *  Component, que é o único lugar que conhece os dois direitos (o do produto
 *  e o do instrumento). Deduzi-lo do `code` faria o comprador do CorrigeFácil
 *  ver copy de demonstração ao aplicar o mesmo instrumento. */
export function AvaliarClient({
  code,
  modoDemo,
}: {
  code: string;
  modoDemo: boolean;
}) {
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
  const errosIdentificacao = modelo ? validarIdentificacao(identificacao, modelo) : [];
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

      const resposta = await corrigirInstrumento(
        montarPedido(modelo, estadoParaEnvio, identificacao.idadeAnos),
      );
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
      !podeSalvar(identificacao, modelo, salvamento.fase === 'salvando', false)
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
  // Só o CONFIAS: os 70 itens desenhados tarefa a tarefa, na ordem do
  // catálogo. Lista vazia nos outros 20, e a lista corrida de sempre.
  const grupos = m.itensAgrupados ? gruposDeItens(visiveis) : [];

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
          modoDemo={modoDemo}
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

          {m.dimensoes.some(
            (d) => !resolvidaPelaIdade(m, estado.selector, d.code),
          ) && (
            <section className="space-y-4">
              {m.dimensoes.map((d, i) => {
                // Dimensão que a idade resolve não vira campo: perguntar a
                // faixa etária de quem já informou a idade é pedir a mesma
                // coisa duas vezes, e abre a porta para as duas discordarem.
                // O índice é preservado de propósito — `opcoesDaDimensao` e
                // `escolherDimensao` andam pela cascata por posição, e
                // filtrar a lista deslocaria as seguintes.
                if (resolvidaPelaIdade(m, estado.selector, d.code)) return null;
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
              {m.itensAgrupados ? (
                /* AGRUPADO · um bloco por tarefa, com o título vindo do
                   catálogo ("S1 — Síntese silábica"). Os números dos itens
                   são os reais e a ordem é a que a API mandou: nada é
                   renumerado, nada é reordenado, nenhum enunciado é
                   inventado. Sem ordinal e sem o aviso de enunciado
                   ausente — o item já se lê como "Item 4" logo abaixo do
                   nome da tarefa a que pertence. */
                <div className="space-y-8">
                  {grupos.map((g) => (
                    <section key={g.code} className="space-y-3">
                      <h3 className="text-pp-ink text-sm font-medium">
                        {g.code} — {g.nome}
                      </h3>
                      {g.itens.map((item) => {
                        const respondido =
                          estado.respostas[item.numero] !== undefined;
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
                              avisarSemEnunciado={false}
                              aoEscolher={(v) => responder(item.numero, v)}
                            />
                          </div>
                        );
                      })}
                    </section>
                  ))}
                </div>
              ) : (
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
              )}

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
                    {textoDaEntradaBruta(e.entrada, e.min, e.max) && (
                      <span className="block text-pp-ink-soft text-xs mt-0.5">
                        {textoDaEntradaBruta(e.entrada, e.min, e.max)}
                      </span>
                    )}
                  </span>
                  {/* O campo obedece à MESMA `entrada` que valida e que
                      escreve a frase acima. Sem `entrada` declarada, os
                      atributos são os de antes — os outros instrumentos não
                      mudam de comportamento.

                      `min` só é escrito quando o piso é INCLUSIVO: num campo
                      de tempo, `min={0}` diria ao navegador que zero serve, e
                      ele não serve. Quem recusa é `brutoValido`, e quem
                      recusa de verdade é o servidor. */}
                  <input
                    type="number"
                    inputMode={e.entrada?.decimal === true ? 'decimal' : 'numeric'}
                    step={
                      e.entrada ? (e.entrada.decimal ? 'any' : 1) : undefined
                    }
                    min={
                      e.entrada
                        ? (e.entrada.pisoAberto ? undefined : e.entrada.minimo)
                        : (e.min ?? undefined)
                    }
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

        {/* Limites e passo saem de `modelo.idadeManual` — o mesmo objeto que
            a validação usa. O campo aceitar o que o botão depois recusa é
            precisamente o que o mapa único evita. */}
        {!modelo.exigeDataNascimento && (
          <label className="text-xs text-pp-ink-soft space-y-1">
            <span className="block">
              Idade <span className="text-pp-ink">(obrigatória)</span>
            </span>
            <input
              type="number"
              inputMode={modelo.idadeManual.decimal ? 'decimal' : 'numeric'}
              min={modelo.idadeManual.min}
              max={modelo.idadeManual.max}
              step={modelo.idadeManual.decimal ? 'any' : 1}
              required
              aria-required="true"
              value={identificacao.idadeAnos}
              onChange={(e) =>
                onIdentificacao({ ...identificacao, idadeAnos: e.target.value })
              }
              className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
            />
            <span className="block text-[11px]">
              {textoDoCampoIdade(modelo.idadeManual)}
            </span>
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

      {/* Tempos de execução: REGISTRO DESCRITIVO, e a tela diz isso antes
          de pedir o número. Só aparece no instrumento que declara tempo —
          hoje o TRILHAS_PRE. Nos outros 19 `temposDoInstrumento` devolve
          null e esta seção não existe. */}
      <TemposFields
        modelo={modelo}
        identificacao={identificacao}
        onIdentificacao={onIdentificacao}
      />

      {modelo.exigeDataNascimento && (
        <p className="text-pp-ink-soft text-xs">
          A idade será calculada pelo servidor a partir das datas informadas abaixo.
        </p>
      )}

      {erros.length > 0 && (
        <p className="text-pp-ink-soft text-xs">
          {erros.map((e) => textoErroIdentificacao(e, modelo.idadeManual)).join(' · ')}
        </p>
      )}
    </section>
  );
}

/** Os tempos de execução do instrumento, quando ele declara algum.
 *
 *  OPCIONAIS: nunca bloqueiam o envio, nunca entram em `validarIdentificacao`
 *  e nunca viram erro. Um protocolo sem tempo anotado é um protocolo válido.
 *
 *  A nota fica ACIMA dos campos, não abaixo: quem está digitando precisa
 *  saber que o número não vai ser classificado ANTES de digitá-lo. */
function TemposFields({
  modelo,
  identificacao,
  onIdentificacao,
}: {
  modelo: ModeloFormulario;
  identificacao: IdentificacaoAvaliado;
  onIdentificacao: (d: IdentificacaoAvaliado) => void;
}) {
  const campos = temposDoInstrumento(modelo.code);
  if (!campos) return null;

  return (
    <div className="space-y-2 border-t border-pp-ink/10 pt-4">
      <div>
        <p className="text-pp-ink text-sm font-medium">{TITULO_TEMPOS}</p>
        <p className="text-pp-ink-soft text-xs mt-1">{NOTA_TEMPOS}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {campos.map((campo) => (
          <label key={campo.chave} className="text-xs text-pp-ink-soft space-y-1">
            <span className="block">
              {campo.label} <span className="text-pp-ink">(opcional)</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={identificacao.tempos?.[campo.chave] ?? ''}
              onChange={(e) =>
                onIdentificacao({
                  ...identificacao,
                  tempos: {
                    ...(identificacao.tempos ?? {}),
                    [campo.chave]: e.target.value,
                  },
                })
              }
              className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** A oferta que fecha a experiência gratuita.
 *
 *  NÃO carrega preço nem URL de checkout, de propósito. Os dois moram em
 *  `products_public` e são lidos num lugar só — a página de venda. Repetir
 *  "R$ 57" aqui criaria um segundo valor para envelhecer sozinho no dia de
 *  um reajuste, e um checkout copiado poderia apontar para o lugar errado.
 *  Este bloco leva o profissional ATÉ a oferta; quem vende é ela.
 *
 *  O total sai de CODIGOS_DOS_21, a mesma fonte soberana que a página
 *  comercial usa para escrever o número dela. Ninguém digita "21".
 *
 *  O nome do instrumento é PARÂMETRO e não literal: hoje só o FDT é
 *  gratuito, mas quem decide isso é `instruments.is_free_demo` no banco, e
 *  liberar um segundo instrumento não pode exigir editar esta frase. */
function OfertaCorrigeFacilCompleto({ instrumento }: { instrumento: string }) {
  return (
    <section className="bg-pp-block-lilac rounded-block p-6 md:p-8 space-y-4 print:hidden">
      <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
        Você experimentou 1 dos {CODIGOS_DOS_21.length} instrumentos
      </p>
      <h2 className="font-serif italic text-2xl md:text-3xl text-pp-ink leading-tight">
        Continue com o CorrigeFácil completo
      </h2>
      <p className="text-pp-ink text-base leading-relaxed max-w-2xl">
        Você usou o {instrumento} dentro do CorrigeFácil. Libere os demais
        instrumentos para correção digital, com resultados organizados e
        avaliações salvas no sistema.
      </p>
      <Link
        href="/app/corrigefacil#oferta-corrigefacil"
        className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
      >
        Liberar CorrigeFácil completo
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
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
  modoDemo,
}: {
  resposta: RespostaCorrecao;
  detalhe: InstrumentoDetalhe;
  onCorrigirNovamente: () => void;
  identificacao: IdentificacaoAvaliado;
  salvamento: EstadoSalvamento;
  onSalvar: () => Promise<string | null>;
  modoDemo: boolean;
}) {
  // O FDT desenha as dez medidas no bloco próprio, e não na grade: a
  // classificação dele não sai em `resultados` (ver FdtDerivado), e as duas
  // apresentações lado a lado seriam a mesma lista duas vezes. Os outros 20
  // seguem exatamente na grade de sempre.
  const linhas = ehFdt(detalhe.code)
    ? []
    : Object.entries(resposta.resultados);
  // o MESMO modelo que a tela de preenchimento montou: o botão de salvar
  // desta tela cobra a mesma idade que o campo lá atrás aceitou
  const habilitado = podeSalvar(
    identificacao,
    montarModelo(detalhe),
    salvamento.fase === 'salvando',
    salvamento.fase === 'salvo',
  );

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        {linhas.map(([escala, r]) => {
          // o bruto do cabeçalho do card, com o nome que ELE tem neste
          // instrumento: "Pontuação bruta 12" no SNAP-IV, "bruto 12" nos
          // que não declaram nome próprio
          const met = metricasDaEscala(detalhe.code, escala, r.raw, r.score);
          // as colunas deste resultado, na ordem, da MESMA regra que o
          // histórico usa — inclusive a classificação, que é a última
          // delas e não um bloco à parte
          const celulas = celulasDoResultado(detalhe.code, escala, r);
          return (
          <article
            key={escala}
            className="border border-pp-hairline bg-pp-block-lilac/15 rounded-block p-6 sm:p-7 space-y-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-pp-ink text-base font-medium">{escala}</h3>
              {met.bruto && (
                <p className="text-pp-ink-soft text-xs">
                  {met.bruto.rotulo} {met.bruto.texto}
                </p>
              )}
            </div>

            {r.available ? (
              <ResultadoMetricas
                metricas={celulas.metricas}
                classificacao={celulas.classificacao}
              />
            ) : (
              <p className="text-pp-ink-soft text-sm">
                {r.message ?? 'Resultado indisponível.'}
              </p>
            )}

            {r.flags.length > 0 && (
              <p className="text-pp-ink-soft text-xs">revisar: {r.flags.join(', ')}</p>
            )}
          </article>
          );
        })}
      </div>

      {/* Logo depois dos cards normativos — Sílaba, Fonema e Total — e
          FORA deles: as 16 tarefas não são escalas (não têm norma, z nem
          faixa normativa) e o nível equivalente não é a hipótese de
          escrita. Um card destes entre os outros seria lido como um quarto
          resultado normativo do instrumento.

          Vem PRONTO do servidor. Nada é contado, dividido ou classificado
          aqui. Devolve null sozinho fora do CONFIAS e no CONFIAS cujo
          protocolo estava incompleto — a Edge omite a chave nesse caso, em
          vez de mandar perfil pela metade. */}
      <ConfiasDerivado derivado={derivadoConfias(resposta)} />

      {/* Mesma posição e mesma razão: o card do TOTAL carrega a
          CLASSIFICAÇÃO — uma das cinco faixas —, e o rastreamento é outra
          leitura do mesmo número, com um corte só. Lado a lado dentro do
          card, a segunda seria lida como correção da primeira.

          O alerta do item 9 aparece aqui porque o item foi respondido
          positivamente, e não some quando o total é baixo — que é
          justamente quando o escore não o denunciaria.

          Devolve null sozinho fora do PHQ-9 e no PHQ-9 de protocolo
          incompleto. */}
      <Phq9Derivado derivado={derivadoPhq9(resposta)} />

      {/* As dez medidas do FDT, em dois blocos: tempo e erros. Bruto e z
          vêm do resultado normativo; faixa e classificação, do derivado —
          é lá que elas cabem, porque os cortes do FDT mudam a cada faixa
          etária. Inibição e Flexibilidade aparecem como RESULTADO, e o
          formulário nunca as pediu.

          Devolve null sozinho fora do FDT e no FDT cuja idade caiu fora de
          6 a 92, onde a Edge omite a chave por não haver norma. */}
      <FdtDerivado
        code={detalhe.code}
        derivado={derivadoFdt(resposta)}
        resultados={resposta.resultados}
      />

      {/* FORA dos cards e FORA do gráfico: o auxiliar é resposta, não
          resultado. O ResultGraph só desenha escala, e o auxiliar não é
          uma — ele nem chega lá, porque não está em `resultados`. */}
      <RespostasAuxiliares respostas={resposta.auxiliary_responses} />

      <ResultGraph detalhe={detalhe} resposta={resposta} />

      {/* Os tempos anotados na aplicação, no resultado que acabou de sair —
          sem esperar o salvamento. Eles foram digitados nesta mesma tela e
          sumiriam da vista justamente na hora em que o profissional lê o
          resultado.

          FORA dos cards e FORA do gráfico, pelo mesmo motivo do auxiliar:
          tempo não tem escore, faixa nem classificação, e o ResultGraph só
          desenha escala — ele nem chega lá, porque não está em `resultados`.

          O MESMO componente do histórico, alimentado pela MESMA regra que
          grava (`metaDeTempos`): o que se lê aqui é exatamente o que será
          salvo. Campo vazio não vira linha. */}
      <TemposDeExecucao
        instrumento={detalhe.code}
        meta={metaDeTempos(detalhe.code, identificacao.tempos)}
      />

      {/* UMA vez, depois dos resultados: qual método de correção está em
          uso. Fora dos cards e fora do gráfico de propósito — é nota de
          método, não classificação. Instrumento sem método declarado não
          renderiza nada. */}
      <MetodoDeCorrecao instrumento={detalhe.code} />

      <hr className="border-pp-hairline-soft" />

      {/* UMA oferta principal por vez, e o modo decide qual.
       *
       * Quem entrou pela porta do instrumento gratuito ainda não comprou o
       * CorrigeFácil — oferecer Relatórios Pró aqui seria pedir a segunda
       * compra antes da primeira, e dois CTAs disputando a mesma tela
       * dividem a atenção e não convertem nem um.
       *
       * Quem comprou vê o painel EXATAMENTE como sempre viu: o componente
       * não foi tocado, só deixou de ser renderizado num caso novo. */}
      {modoDemo ? (
        <OfertaCorrigeFacilCompleto instrumento={detalhe.code} />
      ) : (
        <CorrigeFacilReportPanel
          assessmentId={salvamento.fase === 'salvo' ? salvamento.id : null}
          ensureAssessmentId={onSalvar}
        />
      )}

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
