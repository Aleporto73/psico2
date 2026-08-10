'use client';

// =====================================================================
// O GRÁFICO DO CORRIGEFÁCIL DENTRO DO DOCUMENTO
//
// Responsabilidade única: entregar ao `ResultGraph` APROVADO os dois
// argumentos que ele já recebe na tela de correção, e desistir em silêncio
// quando não puder provar que a representação é segura.
//
// Não há gráfico novo aqui. Nenhum dos quatro renderizadores é importado,
// nenhuma faixa é desenhada, nenhum eixo é decidido: tudo isso continua
// morando no registro visual aprovado, e este arquivo só o alimenta.
//
// DE ONDE VEM CADA COISA
//
//   quantitativo  → avaliação SALVA (assessment_results, congelado)
//   régua/escalas → catálogo atual, via GET /catalogo/:code
//
// O catálogo entra SÓ para dizer como desenhar — nomes de escala e faixas.
// Nenhum valor dele vira resultado. O que a tabela mostra e o que o gráfico
// posiciona é o mesmo dado persistido.
//
// POR QUE PODE NÃO APARECER, e por que isso é aceitável: o gráfico é camada
// de apresentação de um documento que precisa abrir mesmo para quem já não
// tem o Relatório Pró ativo. Tabela e narrativa nunca dependem dele.
// =====================================================================

import { useEffect, useState } from 'react';
import {
  buscarInstrumento,
  type AvaliacaoDetalhe,
  type InstrumentoDetalhe,
} from '@/lib/corrigefacil/api';
import {
  faixasDivergemDoResultado,
  respostaDaAvaliacao,
} from '@/lib/report/graph-coherence';
import { ResultGraph } from '@/app/app/corrigefacil/graphs/ResultGraph';

export function ReportGraphIsland({
  avaliacao,
}: Readonly<{ avaliacao: AvaliacaoDetalhe }>) {
  const [detalhe, setDetalhe] = useState<InstrumentoDetalhe | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    buscarInstrumento(avaliacao.instrument, { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setDetalhe(d);
      })
      .catch(() => {
        // Falha do catálogo NÃO derruba o documento e não vira mensagem de
        // erro: quem lê o relatório é o destinatário, não quem opera o
        // sistema. Sem metadados visuais, o bloco simplesmente não existe —
        // tabela e narrativa seguem completas acima e abaixo.
      });

    return () => controller.abort();
  }, [avaliacao.instrument]);

  if (!detalhe) return null;

  const resposta = respostaDaAvaliacao(avaliacao);

  // FAIL CLOSED. A régua vem do catálogo de hoje e o resultado é de ontem;
  // se as faixas atuais não reconhecem a classificação que ficou gravada,
  // desenhar produziria uma régua sem faixa destacada — silenciosamente
  // errada. Sem gráfico é uma ausência visível; gráfico incoerente é uma
  // afirmação falsa.
  if (faixasDivergemDoResultado(detalhe, resposta)) return null;

  // O componente já traz o próprio título "Representação visual" e devolve
  // null sozinho quando o instrumento não tem gráfico aprovado.
  return <ResultGraph detalhe={detalhe} resposta={resposta} />;
}
