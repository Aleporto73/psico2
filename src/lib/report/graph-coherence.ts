// =====================================================================
// COERÊNCIA ENTRE O RESULTADO CONGELADO E AS FAIXAS DE HOJE
//
// O documento junta duas coisas de épocas diferentes: `assessment_results`
// foi congelado na conclusão da avaliação, e `faixas_classificacao` vem do
// catálogo ATUAL. Enquanto o acervo não muda, as duas concordam. Se um dia
// mudarem, a régua desenhada deixa de ser a que classificou aquele
// resultado.
//
// O modo de falha é o pior possível: `montarSegmentos` marca a faixa atual
// comparando RÓTULO (`f.label === classification`). Rótulo renomeado ⇒
// nenhum segmento marcado ⇒ o gráfico sai bonito, completo e MUDO, sem
// destacar faixa nenhuma. Ninguém percebe olhando.
//
// Este módulo detecta exatamente esse caso e o documento se recusa a
// desenhar. FAIL CLOSED: sem gráfico é uma ausência visível; gráfico
// incoerente é uma afirmação errada.
//
// O QUE ESTE ARQUIVO NÃO FAZ, e é o ponto: não reclassifica, não aplica
// corte, não escolhe faixa, não corrige nada. Ele só compara o que o
// servidor gravou com o que o catálogo diz hoje, e responde sim ou não.
// Reclassificar o valor com os cortes atuais seria justamente produzir a
// representação histórica dependente do presente que a trava proíbe.
//
// Mora aqui, e não em graph-model/graph-config/ResultGraph, porque é regra
// do DOCUMENTO: a tela de correção desenha um resultado recém-calculado,
// onde resultado e catálogo são necessariamente da mesma época.
// =====================================================================

import type {
  InstrumentoDetalhe,
  RespostaCorrecao,
} from '@/lib/corrigefacil/api';
import { configDoInstrumento } from '@/app/app/corrigefacil/graphs/graph-config';
import { montarModelo } from '@/app/app/corrigefacil/graphs/graph-model';

/** Adapta a avaliação SALVA ao contrato que `ResultGraph` já recebe na tela
 *  de correção.
 *
 *  É adaptação de forma, não cálculo: os três campos saem inteiros de
 *  `AvaliacaoDetalhe`, que por sua vez é leitura direta de
 *  `assessment_results`. Nenhum valor é derivado, convertido ou revisto. */
export function respostaDaAvaliacao(avaliacao: {
  instrument: string;
  norm_selector: Record<string, unknown>;
  resultados: RespostaCorrecao['resultados'];
}): RespostaCorrecao {
  return {
    instrument: avaliacao.instrument,
    norm_selector: avaliacao.norm_selector,
    resultados: avaliacao.resultados,
  };
}

/** True quando alguma escala tem classificação persistida e faixas atuais,
 *  mas NENHUMA faixa atual corresponde a essa classificação.
 *
 *  As três condições são necessárias, e cada exclusão tem motivo:
 *
 *  - escala indisponível não tem classificação a conferir;
 *  - classificação nula idem — nada foi afirmado;
 *  - SEM SEGMENTOS não é divergência, é ausência de régua. É o caso normal
 *    de instrumentos cujos cortes não chegam ao cliente (o DCDQ tem corte
 *    por faixa etária em norm_entries) e das famílias que não leem régua
 *    numérica (o ETPC plota `classification`, e `basisDaMetrica` devolve
 *    null para ela). Disparar aí recusaria gráficos perfeitamente corretos.
 *
 *  Percorre a config principal E os complementos, porque o SCARED-C tem
 *  duas representações aprovadas e a divergência pode estar em qualquer
 *  uma. */
export function faixasDivergemDoResultado(
  detalhe: InstrumentoDetalhe,
  resposta: RespostaCorrecao,
): boolean {
  const entrada = configDoInstrumento(detalhe.code);
  // Sem entrada aprovada não haveria gráfico de qualquer forma: quem decide
  // isso é o ResultGraph, e aqui não há o que declarar incoerente.
  if (entrada?.status !== 'aprovado') return false;

  const configs = [entrada.config, ...(entrada.complementos ?? [])];

  for (const config of configs) {
    const modelo = montarModelo(
      config,
      resposta.resultados,
      detalhe.faixas_classificacao,
      detalhe.escalas,
    );

    for (const bloco of modelo.blocos) {
      for (const ponto of bloco.pontos) {
        if (!ponto.disponivel) continue;
        if (!ponto.classificacao) continue;
        if (ponto.segmentos.length === 0) continue;
        if (!ponto.segmentos.some((s) => s.atual)) return true;
      }
    }
  }

  return false;
}
