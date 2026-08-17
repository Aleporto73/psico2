// =====================================================================
// QUAIS COLUNAS UM RESULTADO TEM, e em que ordem.
//
// Uma pergunta, uma resposta, um lugar. A tela de correção e o histórico
// mostram o MESMO resultado; enquanto cada uma montava a própria lista de
// colunas, "parecer o mesmo produto" dependia de alguém lembrar de editar
// os dois arquivos juntos.
//
// NADA AQUI CALCULA E NADA AQUI CLASSIFICA. Os números já vêm prontos de
// `metricasDaEscala` (que sabe os nomes próprios e os tetos de cada
// instrumento) e de `textoDePercentil` (que sabe o "< 1" do BPA-2). Este
// módulo só decide QUAIS deles viram coluna — e a regra é uma só: coluna
// sem valor não existe. Cabeçalho vazio sugere que algo se perdeu no
// caminho, e no meio de um resultado normativo isso se lê como falha do
// instrumento.
//
// A CLASSIFICAÇÃO SAI JUNTO, e é de propósito que ela sai da mesma função:
// ela é a leitura dos números ao lado dela, não um segundo resultado. Quem
// desenha a põe como última célula do mesmo bloco.
//
// O BRUTO NÃO ESTÁ AQUI. Ele já aparece no cabeçalho do card ("Total ·
// bruto 14"), e repeti-lo na linha de métricas seria mostrar o mesmo
// número duas vezes, a meio palmo de distância.
// =====================================================================

import type { ResultadoEscala } from './api';
import { metricasDaEscala, textoDePercentil } from './metricas-instrumento';

/** Uma coluna: o nome que a métrica tem NESTE instrumento e o valor já
 *  escrito. `complemento` é o IC95%, que sai colado no escore em tipo
 *  menor — é a margem DAQUELE número, e não uma coluna própria. */
export type CelulaResultado = {
  rotulo: string;
  texto: string;
  complemento: string | null;
};

export type CelulasDoResultado = {
  metricas: CelulaResultado[];
  classificacao: string | null;
};

function celula(
  rotulo: string,
  texto: string,
  complemento: string | null = null,
): CelulaResultado {
  return { rotulo, texto, complemento };
}

export function celulasDoResultado(
  code: string | undefined,
  escala: string,
  r: ResultadoEscala,
): CelulasDoResultado {
  // Resultado indisponível não tem quantitativo nenhum — nem o número que
  // por acaso tenha vindo junto. Mesma regra do gráfico, do documento e de
  // `textoDePercentil`. Quem desenha mostra a mensagem no lugar da linha.
  if (!r.available) return { metricas: [], classificacao: null };

  // as métricas com o nome que ELAS têm neste instrumento. Nos 20 em que
  // bruto e escore são a mesma conta, sai "escore 4", como sempre saiu.
  const met = metricasDaEscala(code, escala, r.raw, r.score);
  const percentil = textoDePercentil(code, r);

  const metricas: CelulaResultado[] = [];

  // A Média por item vem ANTES do escore: ela é leitura do bruto, na régua
  // de 0 a 3 por item, e o escore é outra medida. Só existe onde o
  // instrumento a declara — SNAP-IV hoje, null nos outros 20.
  if (met.media) metricas.push(celula(met.media.rotulo, met.media.texto));
  if (met.escore) {
    metricas.push(celula(met.escore.rotulo, met.escore.texto, r.ci95 ?? null));
  }
  if (percentil !== null) metricas.push(celula('percentil', percentil));
  if (r.z !== null) metricas.push(celula('z', String(r.z)));

  return {
    metricas,
    // string vazia é ausência: vira null aqui para não virar pílula vazia
    classificacao: r.classification?.trim() ? r.classification : null,
  };
}
