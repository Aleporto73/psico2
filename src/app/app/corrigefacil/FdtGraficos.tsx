// =====================================================================
// FDT · AS DUAS REPRESENTAÇÕES VISUAIS DO RESULTADO.
//
// POR QUE ISTO NÃO ENTROU EM `graph-config` COM OS OUTROS 21:
//
//   o sistema genérico de gráficos é consumido TAMBÉM pelo documento
//   profissional, via ReportGraphIsland. Registrar o FDT lá colocaria
//   estes dois cartões dentro do Relatório Pró e do PDF no mesmo commit
//   em que eles aparecem na tela — e o relatório é outra fase, com outra
//   aprovação visual. Aqui eles são desenhados SÓ pelo fluxo de resultado
//   do FDT: tela de correção e avaliação salva.
//
//   O que se compartilha com os graphs é a LINGUAGEM — régua de faixas em
//   lilás, barra `rounded-pill` com preenchimento em tinta, par
//   `print:` para tudo que precisa sobreviver ao papel, `role="img"` com
//   descrição inteira. Não se compartilha o modelo, porque o modelo
//   genérico pede um valor quantitativo contínuo que o FDT não tem.
//
// A TRAVA QUE EXPLICA O DESENHO DO PERFIL EXECUTIVO:
//
//   o FDT não devolve percentil pontual — `percentile` sai nulo nas dez
//   medidas, por decisão da controladora. Então a régua aqui tem CINCO
//   DEGRAUS, que são as cinco classificações que o servidor nomeou, e não
//   um eixo de 0 a 100. Não há número no eixo, não há marcador de ponto
//   dentro do degrau e a palavra "percentil" não descreve esta posição em
//   lugar nenhum.
//
//   NÃO EXISTE MARCADOR VERTICAL, ao contrário do ScoreBand e do
//   Categorical, e a diferença é de honestidade: lá o marcador mostra
//   onde um escore contínuo caiu DENTRO da faixa. Aqui não há escore
//   contínuo — há a faixa. Um marcador no meio do degrau desenharia uma
//   precisão que o dado não tem, e duas medidas na mesma classificação
//   têm mesmo de ocupar a mesma posição.
// =====================================================================

import {
  ORDEM_CLASSIFICACAO_TEMPO,
  NOTA_PERFIL,
  SUBTITULO_ERROS_TAREFA,
  SUBTITULO_PERFIL,
  TITULO_ERROS_TAREFA,
  TITULO_PERFIL,
  type DegrauPerfil,
  type ErrosPorTarefa,
} from '@/lib/corrigefacil/fdt-derivado';

/** O cartão dos dois — mesma moldura das seções de dados logo acima, para
 *  o gráfico se ler como continuação do bloco a que pertence, e não como
 *  um painel de outro assunto. */
function Cartao({
  titulo,
  subtitulo,
  children,
}: Readonly<{ titulo: string; subtitulo: string; children: React.ReactNode }>) {
  return (
    <section className="border border-pp-hairline bg-pp-block-lilac/15 rounded-block p-6 sm:p-7 space-y-5">
      <div className="space-y-1">
        <h3 className="text-pp-ink text-base font-medium">{titulo}</h3>
        <p className="text-pp-ink-soft text-xs leading-relaxed">{subtitulo}</p>
      </div>
      {children}
    </section>
  );
}

/** A régua de cinco degraus de UMA medida.
 *
 *  O degrau nomeado pelo servidor recebe o lilás do produto. No papel ele
 *  recebe MOLDURA, porque `background-color` não é pintado sem background
 *  graphics e o lilás sumiria — aqui a moldura pode existir sem disputar
 *  atenção com nada, já que esta régua não tem marcador. */
function Regua({ m }: Readonly<{ m: DegrauPerfil }>) {
  const total = ORDEM_CLASSIFICACAO_TEMPO.length;
  return (
    <div
      role="img"
      aria-label={
        `${m.nome}: ${m.classificacao}. Posição ${(m.degrau ?? 0) + 1} de ` +
        `${total}, da menor para a maior classificação.`
      }
      className="flex h-5 rounded-pill overflow-hidden border border-pp-ink/15 print:border-pp-ink"
    >
      {ORDEM_CLASSIFICACAO_TEMPO.map((rotulo, i) => (
        <div
          key={rotulo}
          className={[
            'flex-1 border-r border-pp-ink/15 last:border-r-0',
            'print:border-pp-ink/30',
            i === m.degrau
              ? 'bg-pp-block-lilac print:border-2 print:border-pp-ink'
              : i % 2 === 0
                ? 'bg-pp-ink/[0.04]'
                : 'bg-pp-ink/[0.09]',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

export function PerfilExecutivoFdt({
  medidas,
}: Readonly<{ medidas: DegrauPerfil[] }>) {
  return (
    <Cartao titulo={TITULO_PERFIL} subtitulo={SUBTITULO_PERFIL}>
      <div className="space-y-4">
        {medidas.map((m) => (
          <div key={m.code} className="space-y-1.5 print:break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-pp-ink text-sm">{m.nome}</p>
              {m.classificacao && (
                <p className="text-pp-ink text-xs font-medium">
                  {m.classificacao}
                </p>
              )}
            </div>

            {m.degrau === null ? (
              /* SEM DEGRAU NÃO É DEGRAU ZERO: degrau zero é "Deficitário",
                 que é um resultado. A ausência sai por escrito, do mesmo
                 jeito que o DomainProfile diz "não recebe barra". */
              <p className="text-pp-ink-soft text-xs">
                sem classificação para posicionar — não recebe barra
              </p>
            ) : (
              <Regua m={m} />
            )}
          </div>
        ))}
      </div>

      {/* O EIXO: os cinco degraus escritos, uma vez só, embaixo das réguas.
          São PALAVRAS, e não 0–25–50–75–100 — o FDT não tem percentil
          pontual, e um eixo numérico afirmaria um que não existe. */}
      <ul className="grid grid-cols-5 gap-1">
        {ORDEM_CLASSIFICACAO_TEMPO.map((rotulo) => (
          <li
            key={rotulo}
            className="text-[10px] text-pp-ink-soft text-center leading-tight break-words"
          >
            {rotulo}
          </li>
        ))}
      </ul>

      <p className="text-pp-ink-soft text-xs leading-relaxed">{NOTA_PERFIL}</p>
    </Cartao>
  );
}

export function ErrosPorTarefaFdt({
  dados,
}: Readonly<{ dados: ErrosPorTarefa }>) {
  return (
    <Cartao titulo={TITULO_ERROS_TAREFA} subtitulo={SUBTITULO_ERROS_TAREFA}>
      <div className="space-y-3">
        {dados.barras.map((b) => (
          <div key={b.code} className="space-y-1 print:break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-pp-ink text-sm">{b.nome}</p>
              {b.classificacao && (
                <p className="text-pp-ink-soft text-xs">{b.classificacao}</p>
              )}
            </div>

            {b.fracao === null ? (
              <p className="text-pp-ink-soft text-xs">
                sem contagem — não recebe barra
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  role="img"
                  aria-label={`${b.nome}: ${b.bruto} de ${dados.topo} no eixo.`}
                  className="relative h-5 flex-1 rounded-pill bg-pp-ink/[0.05] border border-pp-hairline print:border-pp-ink"
                >
                  {/* CONTAGEM ZERO É COMPRIMENTO ZERO — e o valor 0 continua
                      escrito ao lado. No bloco de erros não errar é
                      resultado, não ausência. */}
                  <div
                    className="absolute inset-y-[3px] left-0 bg-pp-ink/70 rounded-pill print:border print:border-pp-ink"
                    style={{ width: `${b.fracao * 100}%` }}
                  />
                </div>
                {/* o valor REAL, ao lado da barra: é ele que se lê, e a
                    barra só o compara com os outros três */}
                <span className="text-pp-ink text-sm font-medium tabular-nums w-8 text-right">
                  {b.bruto}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* O eixo começa em zero e vai até a maior contagem presente. As
          marcas são INTEIRAS: erro é contagem, e meia marca sugeriria meio
          erro. `pr-11` desconta a coluna do valor, para as marcas caírem
          debaixo da barra e não debaixo do número. */}
      <div className="flex justify-between text-[11px] text-pp-ink-soft tabular-nums pr-11">
        {dados.ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </Cartao>
  );
}
