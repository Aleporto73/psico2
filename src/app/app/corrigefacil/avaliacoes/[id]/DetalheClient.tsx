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
import { RespostasAuxiliares } from '../../RespostasAuxiliares';
import { ConfiasDerivado } from '../../ConfiasDerivado';
import { derivadoConfias } from '@/lib/corrigefacil/confias-derivado';
import { Phq9Derivado } from '../../Phq9Derivado';
import { derivadoPhq9 } from '@/lib/corrigefacil/phq9-derivado';
import { FdtDerivado } from '../../FdtDerivado';
import { derivadoFdt, ehFdt } from '@/lib/corrigefacil/fdt-derivado';
import { MetodoDeCorrecao } from '../../MetodoDeCorrecao';
import { TemposDeExecucao } from '../../TemposDeExecucao';
import { metricasDaEscala } from '@/lib/corrigefacil/metricas-instrumento';
import { celulasDoResultado } from '@/lib/corrigefacil/resultado-celulas';
import { ResultadoMetricas } from '../../ResultadoMetricas';
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

      {/* O FDT desenha as dez medidas no bloco próprio, mais abaixo, e não
          nesta grade: a classificação dele não sai em `resultados` — os
          cortes mudam a cada faixa etária e a tabela de faixas do servidor
          não tem norm_set_id. As duas apresentações juntas seriam a mesma
          lista duas vezes, metade dela sem classificação. Os outros 20
          seguem exatamente na grade de sempre. */}
      {!ehFdt(d.instrument) && (
      <section className="space-y-3">
        {Object.entries(d.resultados).map(([escala, r]) => {
          // os mesmos nomes que a tela de correção usa, pela mesma função:
          // o laudo entregue e o histórico não podem chamar a mesma medida
          // de duas coisas diferentes
          const met = metricasDaEscala(d.instrument, escala, r.raw, r.score);
          const celulas = celulasDoResultado(d.instrument, escala, r);
          return (
          <div key={escala} className="border border-pp-ink/10 rounded-block p-5 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-pp-ink font-medium">{escala}</p>
              {met.bruto && (
                <p className="text-pp-ink-soft text-sm">
                  {met.bruto.rotulo} {met.bruto.texto}
                </p>
              )}
            </div>

            {r.available ? (
              // As MESMAS colunas da tela de correção, pela mesma função e
              // no mesmo desenho: a avaliação salva e o resultado
              // recém-corrigido são o mesmo resultado, e mostrá-los
              // diferente fazia parecer que um deles trazia menos.
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
          </div>
          );
        })}
      </section>
      )}

      {/* O MESMO componente da tela de correção, alimentado pelo snapshot
          CONGELADO na conclusão. A Edge o gravou em
          `subject_meta._corrigefacil` e o promove a `derived` na leitura —
          aqui não se reconstrói perfil a partir de resposta, não se busca
          catálogo e não se recalcula nada, exatamente como os cards acima.

          Avaliação salva antes de o campo existir não traz a chave e não
          renderiza seção nenhuma. */}
      <ConfiasDerivado derivado={derivadoConfias(d)} />

      {/* O MESMO componente da tela de correção, sobre o snapshot
          CONGELADO na conclusão. O alerta do item 9 reaparece aqui pelo
          mesmo motivo que apareceu lá: ele foi gravado, e o histórico lê o
          gravado. Avaliação salva antes do campo não traz a chave. */}
      <Phq9Derivado derivado={derivadoPhq9(d)} />

      {/* O MESMO bloco da tela de correção, alimentado pelo snapshot
          CONGELADO: `derived` aqui é o que a Edge promoveu de
          `subject_meta._corrigefacil` na conclusão, e não um recálculo.
          Reabrir uma avaliação antiga mostra as mesmas faixas e as mesmas
          classificações que o profissional leu no dia. */}
      <FdtDerivado
        code={d.instrument}
        derivado={derivadoFdt(d)}
        resultados={d.resultados}
      />

      {/* O que foi respondido e não foi pontuado. Vem GRAVADO da Edge, em
          `auxiliary_responses` — nada é recalculado aqui, e o TOTAL acima
          continua sendo o congelado na conclusão. Avaliação antiga, salva
          antes de o campo existir, simplesmente não traz a chave e não
          renderiza seção nenhuma. */}
      <RespostasAuxiliares respostas={d.auxiliary_responses} />

      {/* UMA vez, depois dos resultados: qual método de correção está em
          uso. Instrumento sem método declarado não renderiza nada. */}
      {/* Tempos de execução: registro descritivo, fora dos cards e fora do
          gráfico. Devolve null sozinho quando não há tempo gravado — o que
          inclui os outros 19 instrumentos e toda avaliação salva antes de
          o campo existir. */}
      <TemposDeExecucao instrumento={d.instrument} meta={meta} />

      <MetodoDeCorrecao instrumento={d.instrument} />

      {/* O SEGUNDO contato. A avaliação já foi corrigida, salva e reaberta
          pelo histórico — é aqui, e só aqui, que a demonstração gratuita do
          Relatório Pró pode ser oferecida.

          Na tela do resultado recém-corrigido a oferta continua sendo a do
          CorrigeFácil completo: quem entrou pela porta do instrumento
          gratuito ainda não fez a primeira compra, e pedir a segunda antes
          dela não converte nem uma. Aquele fluxo não passa esta prop. */}
      <CorrigeFacilReportPanel assessmentId={d.assessment_id} freeDemoContext />

      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        {AVISO}
      </p>
    </div>
  );
}