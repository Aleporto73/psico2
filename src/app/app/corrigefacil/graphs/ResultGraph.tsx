// =====================================================================
// O renderizador único. A tela não sabe qual gráfico existe: ela entrega
// o resultado e o instrumento, e o REGISTRO decide.
//
// Tudo o que chega aqui já foi calculado pelo servidor. Este componente
// não faz nenhuma chamada de rede — o `InstrumentoDetalhe` já está em
// memória na tela de correção, com as `faixas_classificacao` dele.
//
// Instrumento sem gráfico aprovado (DCDQ) não renderiza nada: a tabela
// textual acima continua sendo o resultado completo.
// =====================================================================

import type {
  InstrumentoDetalhe,
  RespostaCorrecao,
} from '@/lib/corrigefacil/api';
import { configDoInstrumento } from './graph-config';
import { montarModelo } from './graph-model';
import { ScoreBandChart } from './ScoreBandChart';
import { StandardizedProfileChart } from './StandardizedProfileChart';
import { DomainProfileChart } from './DomainProfileChart';
import { CategoricalProfileChart } from './CategoricalProfileChart';
import { SemEixo } from './parts';

export function ResultGraph({
  detalhe,
  resposta,
}: Readonly<{
  detalhe: InstrumentoDetalhe;
  resposta: RespostaCorrecao;
}>) {
  const entrada = configDoInstrumento(detalhe.code);

  // sem entrada no registro, ou entrada pendente: nenhum gráfico. Não há
  // fallback genérico de propósito — um gráfico "aproximado" para um
  // instrumento cujo contrato visual não foi fechado é exatamente o que
  // G0 existe para impedir.
  if (entrada?.status !== 'aprovado') return null;

  // Um instrumento pode ter mais de uma representação aprovada: o
  // SCARED-C tem small multiples das subescalas E um band do TOTAL.
  // Cada uma vira um modelo próprio, com a régua própria.
  const modelos = [entrada.config, ...(entrada.complementos ?? [])].map((c) =>
    montarModelo(
      c,
      resposta.resultados,
      detalhe.faixas_classificacao,
      detalhe.escalas,
    ),
  );

  const visiveis = modelos.filter((m) => m.blocos.some((b) => b.pontos.length > 0));
  if (visiveis.length === 0) return null;

  return (
    <section className="border border-pp-ink/10 rounded-block p-5 space-y-6">
      <h2 className="text-pp-ink text-sm font-medium">Representação visual</h2>

      {visiveis.map((modelo, i) => (
        <div key={`${modelo.familia}-${i}`} className="space-y-4">
          {modelo.bloqueio ? (
            <SemEixo motivo={modelo.bloqueio} titulo={modelo.blocos[0]?.titulo} />
          ) : (
            <>
              {modelo.familia === 'score_band' && (
                <ScoreBandChart blocos={modelo.blocos} metrica={modelo.metrica} />
              )}
              {modelo.familia === 'standardized_profile' && (
                <StandardizedProfileChart
                  blocos={modelo.blocos}
                  metrica={modelo.metrica}
                />
              )}
              {modelo.familia === 'domain_profile' && (
                <DomainProfileChart
                  blocos={modelo.blocos}
                  metrica={modelo.metrica}
                />
              )}
              {modelo.familia === 'categorical_profile' && (
                <CategoricalProfileChart
                  blocos={modelo.blocos}
                  metrica={modelo.metrica}
                />
              )}
            </>
          )}

          {modelo.nota && (
            <p className="text-pp-ink-soft text-xs">{modelo.nota}</p>
          )}
        </div>
      ))}

      <p className="text-pp-ink-soft text-xs">
        O gráfico repete, em forma visual, os valores da tabela acima. Ele
        não acrescenta informação nova nem substitui a leitura do
        resultado.
      </p>
    </section>
  );
}
