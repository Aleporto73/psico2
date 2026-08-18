// =====================================================================
// FDT · TESTE DOS CINCO DÍGITOS · as dez medidas, em dois blocos, cada um
// seguido da sua representação visual.
//
// Recebe SOMENTE o que o servidor devolveu — `resultados` (bruto e z) e
// `derived.fdt` (faixa percentílica e classificação) — e imprime. Não
// subtrai Escolha menos Leitura, não divide por DP, não compara com corte
// nenhum e não escolhe rótulo: a Edge fez as quatro coisas.
//
// POR QUE ESTE BLOCO SUBSTITUI A GRADE DE CARDS, em vez de ficar ao lado
// dela como o do PHQ-9 e o do CONFIAS:
//
//   nos outros 20 instrumentos o card carrega a classificação. No FDT ela
//   sai nula em `resultados` — os cortes mudam a cada faixa etária e a
//   tabela de faixas do servidor não tem norm_set_id —, e vem no derivado.
//   Desenhar as duas coisas seria listar as mesmas dez medidas duas vezes,
//   e a metade sem classificação pareceria resultado incompleto.
//
// A ORDEM DA PÁGINA é dados, depois desenho, para cada bloco:
//
//   Desempenho · tempo   as seis medidas, quatro colunas
//   Perfil executivo     as mesmas seis, em régua ordinal
//   Erros                as quatro medidas, quatro colunas
//   Erros por tarefa     as mesmas quatro, em contagem
//
// Nunca lado a lado: o gráfico é a releitura do bloco imediatamente acima
// dele, e a leitura é vertical.
//
// POR QUE AS COLUNAS SÃO QUATRO E FIXAS, e por que isso não vale para os
// outros instrumentos: `ResultadoMetricas` omite a coluna sem valor, e
// está certo para os 20 comuns — lá as métricas mudam de instrumento para
// instrumento e uma coluna vazia seria ruído. No FDT as dez medidas são
// sempre as mesmas quatro colunas, uma linha embaixo da outra, e omitir
// fazia a classificação mudar de lugar quando a linha de cima não tinha z.
// Quem resolve as quatro é `colunasDaLinhaFdt`; aqui só se desenha.
//
// INIBIÇÃO E FLEXIBILIDADE APARECEM AQUI COMO RESULTADO, nunca como campo.
// Elas são a diferença entre duas condições, calculada no servidor, e o
// formulário não as pede (ver ESCALAS_CALCULADAS em form-model).
// =====================================================================

import { Fragment } from 'react';
import type { DerivadoFdt, ResultadoEscala } from '@/lib/corrigefacil/api';
import {
  blocosFdt,
  colunasDaLinhaFdt,
  derivadasAusentes,
  errosPorTarefaFdt,
  perfilExecutivoFdt,
  TITULO_ERRO,
  TITULO_TEMPO,
  type ColunaFdt,
  type LinhaFdt,
} from '@/lib/corrigefacil/fdt-derivado';
import { ErrosPorTarefaFdt, PerfilExecutivoFdt } from './FdtGraficos';

/** As quatro colunas de uma medida, nas MESMAS posições em toda linha.
 *
 *  DESKTOP: quatro colunas de largura declarada. Os dois números têm
 *  largura fixa porque são curtos e previsíveis; a faixa toma o espaço que
 *  sobra; a classificação tem teto para o selo não esticar a linha quando
 *  o rótulo é longo. Como toda linha usa este mesmo template dentro de um
 *  contêiner de mesma largura, as colunas se alinham entre as linhas.
 *
 *  MOBILE: duas colunas para os números, e faixa e classificação inteiras
 *  embaixo. Espremer quatro colunas em 375px cortaria "Média inferior" ao
 *  meio; `minmax(0, …)` impede que qualquer uma estoure a largura. */
function ColunasDaMedida({ linha }: Readonly<{ linha: LinhaFdt }>) {
  const colunas = colunasDaLinhaFdt(linha);
  return (
    <div
      className={[
        'grid items-start gap-x-6 gap-y-4',
        'grid-cols-2',
        'sm:grid-cols-[5.5rem_5.5rem_minmax(0,1fr)_minmax(0,13rem)]',
      ].join(' ')}
    >
      {colunas.map((coluna, i) => (
        <div
          key={coluna.rotulo}
          className={[
            'min-w-0',
            // no mobile as duas colunas de texto ocupam a largura inteira
            i >= 2 ? 'col-span-2 sm:col-span-1' : '',
          ].join(' ')}
        >
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {coluna.rotulo}
          </p>
          <Valor coluna={coluna} ultima={i === colunas.length - 1} />
        </div>
      ))}
    </div>
  );
}

/** O valor de uma coluna.
 *
 *  A CLASSIFICAÇÃO é selo, como nos outros instrumentos — ela é a leitura
 *  dos números à esquerda, e o selo é o que a marca como leitura em vez de
 *  mais um número.
 *
 *  AUSÊNCIA É TRAVESSÃO, e travessão não é selo nem número: sai no tom
 *  apagado, para o buraco ser visível sem competir com os valores reais.
 *  O dado continua null no modelo — isto é tinta, não conteúdo. */
function Valor({
  coluna,
  ultima,
}: Readonly<{ coluna: ColunaFdt; ultima: boolean }>) {
  if (coluna.ausente) {
    return (
      <p className="text-pp-ink-soft text-xl font-medium leading-tight" aria-label="sem valor">
        {coluna.texto}
      </p>
    );
  }
  if (ultima) {
    return (
      <span className="inline-block max-w-full break-words bg-pp-block-lilac text-pp-ink px-3 py-1.5 rounded-pill text-sm font-medium print:border print:border-pp-ink">
        {coluna.texto}
      </span>
    );
  }
  return (
    <p className="text-pp-ink text-xl font-medium tabular-nums leading-tight break-words">
      {coluna.texto}
    </p>
  );
}

export function FdtDerivado({
  code,
  derivado,
  resultados,
}: Readonly<{
  code: string | null | undefined;
  derivado: DerivadoFdt | null | undefined;
  resultados: Readonly<Record<string, ResultadoEscala>> | null | undefined;
}>) {
  const blocos = blocosFdt(code, derivado ?? null, resultados);
  if (!blocos) return null;
  const ausentes = derivadasAusentes(derivado ?? null);
  const perfil = perfilExecutivoFdt(blocos);
  const erros = errosPorTarefaFdt(blocos);

  return (
    <div className="space-y-4">
      {blocos.map((bloco) => (
        <Fragment key={bloco.titulo}>
          <section className="border border-pp-hairline bg-pp-block-lilac/15 rounded-block p-6 sm:p-7 space-y-5">
            <div className="space-y-1">
              <h3 className="text-pp-ink text-base font-medium">
                {bloco.titulo}
              </h3>
              <p className="text-pp-ink-soft text-xs leading-relaxed">
                {bloco.nota}
              </p>
            </div>

            <div className="space-y-4">
              {bloco.linhas.map((linha) => (
                <article
                  key={linha.code}
                  className="border-t border-pp-ink/10 pt-4 first:border-t-0 first:pt-0 space-y-3"
                >
                  <h4 className="text-pp-ink text-sm font-medium">
                    {linha.nome}
                  </h4>

                  {linha.indisponivel ? (
                    <p className="text-pp-ink-soft text-sm">
                      {linha.indisponivel}
                    </p>
                  ) : (
                    <ColunasDaMedida linha={linha} />
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* O desenho vem colado no bloco que ele relê, e não numa área de
              gráficos no fim da página: a régua do Perfil executivo só faz
              sentido ao lado das classificações que acabaram de ser lidas. */}
          {bloco.titulo === TITULO_TEMPO && perfil && (
            <PerfilExecutivoFdt medidas={perfil} />
          )}
          {bloco.titulo === TITULO_ERRO && erros && (
            <ErrosPorTarefaFdt dados={erros} />
          )}
        </Fragment>
      ))}

      {ausentes.length > 0 && (
        /* `role="note"`, não `alert`: o conteúdo já está na página quando
           ela é lida. Dizer QUAIS faltaram é o ponto — sem o tempo de
           Leitura não há Inibição nem Flexibilidade, e uma lista que
           simplesmente não as traz não explica a ausência. */
        <p
          role="note"
          className="text-pp-ink-soft text-xs leading-relaxed border border-pp-ink/20 rounded-block p-4"
        >
          Não calculadas por falta de componente: {ausentes.join(', ')}.
        </p>
      )}
    </div>
  );
}
