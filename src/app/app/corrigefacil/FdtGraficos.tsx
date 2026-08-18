// =====================================================================
// FDT · AS DUAS REPRESENTAÇÕES VISUAIS DO RESULTADO.
//
// POR QUE ISTO NÃO ENTROU EM `graph-config` COM OS OUTROS 21:
//
//   o sistema genérico de gráficos é consumido TAMBÉM pelo documento
//   profissional, via ReportGraphIsland. Registrar o FDT lá faria o
//   ResultGraph desenhar o FDT com a régua dos outros — a que pede um
//   valor quantitativo contínuo, que o FDT não tem. O documento recebe
//   estes mesmos componentes por importação direta, na variante compacta,
//   e o registro genérico continua sem conhecer o FDT.
//
//   O que se compartilha com os graphs é a LINGUAGEM — régua de faixas,
//   barra `rounded-pill` com preenchimento, par `print:` para tudo que
//   precisa sobreviver ao papel, `role="img"` com descrição inteira. Não se
//   compartilha o modelo, porque o modelo genérico pede um valor
//   quantitativo contínuo que o FDT não tem.
//
// UMA IMPLEMENTAÇÃO, DUAS DENSIDADES. A tela e o documento desenham o
// MESMO gráfico: mesmas medidas, mesma posição, mesmas cores, mesmo eixo.
// O que muda é a moldura e a densidade — o A4 tem paginação própria e não
// comporta o cartão que respira da tela. Duas implementações divergiriam
// no primeiro ajuste de cor, e o relatório passaria a mostrar um gráfico
// que a tela já não mostra.
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
  fracaoDoTick,
  ORDEM_CLASSIFICACAO_TEMPO,
  NOTA_PERFIL,
  SUBTITULO_ERROS_TAREFA,
  SUBTITULO_PERFIL,
  TITULO_ERROS_TAREFA,
  TITULO_PERFIL,
  TOM_NEUTRO,
  tomDaClassificacao,
  type DegrauPerfil,
  type ErrosPorTarefa,
} from '@/lib/corrigefacil/fdt-derivado';

/** Onde o gráfico está sendo desenhado.
 *
 *  NÃO é um tema nem uma opção de estilo: é a caixa disponível. `tela` tem
 *  rolagem e largura de app; `documento` tem A4, paginação e tinta. */
export type VarianteFdt = 'tela' | 'documento';

/** A densidade de cada variante, num lugar só.
 *
 *  O documento é mais apertado em TUDO que é vertical — seis medidas não
 *  podem custar uma folha —, e mais discreto na moldura, porque ali o
 *  cartão compete com os outros blocos determinísticos do relatório, que
 *  não têm moldura nenhuma.
 *
 *  As larguras horizontais quase não mudam: a coluna útil do A4 e o cartão
 *  da tela têm largura parecida, e encolher a régua só a tornaria menos
 *  legível impressa. */
const DENSIDADE = {
  tela: {
    cartao:
      'border border-pp-hairline bg-pp-block-lilac/15 rounded-block p-6 sm:p-7 space-y-5',
    titulo: 'text-pp-ink text-base font-medium',
    subtitulo: 'text-pp-ink-soft text-xs leading-relaxed',
    entreMedidas: 'space-y-4',
    entreBarras: 'space-y-3',
    linha: 'space-y-1.5',
    nome: 'text-pp-ink text-sm',
    classificacao: 'text-pp-ink text-xs font-medium',
    classificacaoErro: 'text-pp-ink-soft text-xs',
    ausente: 'text-pp-ink-soft text-xs',
    altura: 'h-5',
    chip: 'text-[10px] px-1 py-1',
    valor: 'text-pp-ink text-sm font-medium tabular-nums w-8 text-right',
    folgaDoValor: 'pr-11',
    gapDaBarra: 'gap-3',
    eixo: 'relative h-4 text-[11px] text-pp-ink-soft tabular-nums',
    nota: 'text-pp-ink-soft text-xs leading-relaxed',
  },
  documento: {
    cartao: 'space-y-2',
    titulo: 'text-[11px] uppercase tracking-wide text-pp-ink-soft',
    subtitulo: 'text-[10px] text-pp-ink-soft leading-relaxed',
    entreMedidas: 'space-y-1.5',
    entreBarras: 'space-y-1.5',
    linha: 'space-y-1',
    nome: 'text-pp-ink text-[11px]',
    classificacao: 'text-pp-ink text-[10px] font-medium',
    classificacaoErro: 'text-pp-ink-soft text-[10px]',
    ausente: 'text-pp-ink-soft text-[10px]',
    altura: 'h-4',
    chip: 'text-[9px] px-1 py-0.5',
    valor: 'text-pp-ink text-[11px] font-medium tabular-nums w-7 text-right',
    folgaDoValor: 'pr-9',
    gapDaBarra: 'gap-2',
    eixo: 'relative h-3 text-[10px] text-pp-ink-soft tabular-nums',
    nota: 'text-pp-ink-soft text-[10px] leading-relaxed',
  },
} as const;

/** A moldura dos dois.
 *
 *  Na TELA é o cartão do produto, igual ao das seções de dados logo acima,
 *  para o gráfico se ler como continuação do bloco a que pertence.
 *
 *  No DOCUMENTO é só o título em versalete, igual ao dos outros blocos
 *  determinísticos — Confias, PHQ-9, tempos. Uma moldura ali destacaria o
 *  gráfico acima dos resultados que ele relê, que é o oposto do que se
 *  quer. O título é `h2` como os vizinhos, e é isso que lhe dá o
 *  `break-after: avoid` da folha de impressão: título não fica órfão no pé
 *  da página. */
function Cartao({
  titulo,
  subtitulo,
  variante,
  children,
}: Readonly<{
  titulo: string;
  subtitulo: string;
  variante: VarianteFdt;
  children: React.ReactNode;
}>) {
  const d = DENSIDADE[variante];
  if (variante === 'documento') {
    return (
      <section className={d.cartao}>
        <h2 className={d.titulo}>{titulo}</h2>
        <p className={d.subtitulo}>{subtitulo}</p>
        {children}
      </section>
    );
  }
  return (
    <section className={d.cartao}>
      <div className="space-y-1">
        <h3 className={d.titulo}>{titulo}</h3>
        <p className={d.subtitulo}>{subtitulo}</p>
      </div>
      {children}
    </section>
  );
}

/** A régua de cinco degraus de UMA medida.
 *
 *  OS INATIVOS SÃO NEUTROS E IGUAIS ENTRE SI. Eles eram alternados em dois
 *  tons de tinta, o que dava ritmo mas criava um segundo padrão visual
 *  competindo com o que importa: qual degrau está aceso. Quem separa os
 *  cinco continua sendo a divisória, que é borda e sobrevive ao papel.
 *
 *  O DEGRAU ATIVO recebe o pastel da classificação MAIS o contorno no tom
 *  fechado dela. O pastel sozinho, num cartão já claro, não saltava; o
 *  contorno é o que faz a faixa ser identificada de relance — e é também o
 *  que sobrevive à impressão, onde o fundo não é pintado.
 *
 *  A posição continua sendo a de antes: `m.degrau`, que vem da
 *  classificação do servidor. A cor ACOMPANHA a posição, não a decide. */
function Regua({
  m,
  variante,
}: Readonly<{ m: DegrauPerfil; variante: VarianteFdt }>) {
  const total = ORDEM_CLASSIFICACAO_TEMPO.length;
  const tom = tomDaClassificacao(m.classificacao) ?? TOM_NEUTRO;
  return (
    <div
      role="img"
      aria-label={
        `${m.nome}: ${m.classificacao}. Posição ${(m.degrau ?? 0) + 1} de ` +
        `${total}, da menor para a maior classificação.`
      }
      className={[
        'flex rounded-pill overflow-hidden border border-pp-ink/15 print:border-pp-ink',
        DENSIDADE[variante].altura,
      ].join(' ')}
    >
      {ORDEM_CLASSIFICACAO_TEMPO.map((rotulo, i) => (
        <div
          key={rotulo}
          className={[
            // a divisória é IGUAL nos cinco: é ela que mantém os degraus
            // exatamente do mesmo tamanho. O último a mantém TRANSPARENTE
            // em vez de removê-la — sem largura, ele ficava 1px menor que
            // os outros quatro, e os degraus de uma régua ordinal têm de
            // ser idênticos.
            'flex-1 border-r border-pp-ink/15 last:border-r-transparent',
            'print:border-pp-ink/30 print:last:border-r-transparent',
            // AS PONTAS ACOMPANHAM A CURVA DO TRILHO. O fundo do degrau já
            // saía redondo, porque o trilho tem `overflow-hidden` e o
            // recorta; o CONTORNO não — ele é retângulo e cruzava a curva,
            // deixando uma quebra visível no Deficitário (à esquerda) e no
            // Muito superior (à direita). `outline` segue o
            // `border-radius` do próprio elemento, então arredondar as
            // pontas resolve os dois.
            //
            // Raio não ocupa espaço: os cinco degraus continuam com a
            // mesma largura, e a posição não muda.
            'first:rounded-l-pill last:rounded-r-pill',
            i === m.degrau
              ? `${tom.fundo} ${tom.contorno} outline-2 -outline-offset-2 print:outline-pp-ink`
              : 'bg-pp-ink/[0.05]',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

export function PerfilExecutivoFdt({
  medidas,
  variante = 'tela',
}: Readonly<{ medidas: DegrauPerfil[]; variante?: VarianteFdt }>) {
  const d = DENSIDADE[variante];
  return (
    <Cartao
      titulo={TITULO_PERFIL}
      subtitulo={SUBTITULO_PERFIL}
      variante={variante}
    >
      <div className={d.entreMedidas}>
        {medidas.map((m) => (
          <div
            key={m.code}
            className={`${d.linha} print:break-inside-avoid`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className={d.nome}>{m.nome}</p>
              {m.classificacao && (
                <p className={d.classificacao}>{m.classificacao}</p>
              )}
            </div>

            {m.degrau === null ? (
              /* SEM DEGRAU NÃO É DEGRAU ZERO: degrau zero é "Deficitário",
                 que é um resultado. A ausência sai por escrito, do mesmo
                 jeito que o DomainProfile diz "não recebe barra". */
              <p className={d.ausente}>
                sem classificação para posicionar — não recebe barra
              </p>
            ) : (
              <Regua m={m} variante={variante} />
            )}
          </div>
        ))}
      </div>

      {/* O EIXO: os cinco degraus escritos, uma vez só, embaixo das réguas.
          São PALAVRAS, e não 0–25–50–75–100 — o FDT não tem percentil
          pontual, e um eixo numérico afirmaria um que não existe.

          Cada rótulo vem no PRÓPRIO pastel, nas mesmas cinco colunas das
          réguas acima. Assim o eixo é também a legenda: a cor acesa na
          régua encontra o nome dela na vertical, sem o olho ter de
          procurar. É o mesmo mapa dos dois gráficos. */}
      <ul className="grid grid-cols-5 gap-1 print:break-inside-avoid">
        {ORDEM_CLASSIFICACAO_TEMPO.map((rotulo) => {
          const tom = tomDaClassificacao(rotulo) ?? TOM_NEUTRO;
          return (
            <li
              key={rotulo}
              className={[
                'text-pp-ink text-center leading-tight break-words',
                'rounded-block border',
                d.chip,
                tom.fundo,
                tom.borda,
              ].join(' ')}
            >
              {rotulo}
            </li>
          );
        })}
      </ul>

      <p className={d.nota}>{NOTA_PERFIL}</p>
    </Cartao>
  );
}

export function ErrosPorTarefaFdt({
  dados,
  variante = 'tela',
}: Readonly<{ dados: ErrosPorTarefa; variante?: VarianteFdt }>) {
  const d = DENSIDADE[variante];
  return (
    <Cartao
      titulo={TITULO_ERROS_TAREFA}
      subtitulo={SUBTITULO_ERROS_TAREFA}
      variante={variante}
    >
      <div className={d.entreBarras}>
        {dados.barras.map((b) => (
          <div key={b.code} className="space-y-1 print:break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className={d.nome}>{b.nome}</p>
              {b.classificacao && (
                <p className={d.classificacaoErro}>{b.classificacao}</p>
              )}
            </div>

            {b.fracao === null ? (
              <p className={d.ausente}>sem contagem — não recebe barra</p>
            ) : (
              <div className={`flex items-center ${d.gapDaBarra}`}>
                <div
                  role="img"
                  aria-label={
                    `${b.nome}: ${b.bruto} de ${dados.topo} no eixo` +
                    `${b.classificacao ? `, ${b.classificacao}` : ''}.`
                  }
                  className={[
                    'relative flex-1 rounded-pill bg-pp-ink/[0.05]',
                    'border border-pp-hairline print:border-pp-ink',
                    d.altura,
                  ].join(' ')}
                >
                  {/* COMPRIMENTO E COR SÃO COISAS DIFERENTES, e é o ponto
                      deste desenho: o comprimento é `fracao`, que vem só da
                      CONTAGEM; a cor é a classificação que o servidor já
                      devolveu. Duas tarefas com o mesmo número de erros
                      saem do mesmo tamanho ainda que classifiquem
                      diferente — a norma dos erros muda a cada faixa
                      etária, e é isso que a cor mostra.

                      CONTAGEM ZERO NÃO DESENHA BARRA NENHUMA. Largura zero
                      não bastava: a barra tem borda, e borda de largura
                      zero ainda pinta ~2px — uma lasca que se lia como
                      "quase um erro". Quem informa o zero é o valor ao
                      lado, que continua lá. O trilho vazio permanece, e é
                      ele que mostra que a tarefa foi medida.

                      É APRESENTAÇÃO: `fracao` continua 0 no modelo, e 0
                      continua sendo resultado legítimo — no bloco de erros
                      não errar não é ausência. */}
                  {b.fracao > 0 && (
                    <div
                      className={[
                        'absolute inset-y-[3px] left-0 rounded-pill border',
                        (tomDaClassificacao(b.classificacao) ?? TOM_NEUTRO).fundo,
                        (tomDaClassificacao(b.classificacao) ?? TOM_NEUTRO).borda,
                        'print:border-pp-ink',
                      ].join(' ')}
                      style={{ width: `${b.fracao * 100}%` }}
                    />
                  )}
                </div>
                {/* o valor REAL, ao lado da barra: é ele que se lê, e a
                    barra só o compara com os outros três */}
                <span className={d.valor}>{b.bruto}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* O eixo começa em zero e vai até a maior contagem presente. As
          marcas são INTEIRAS: erro é contagem, e meia marca sugeriria meio
          erro. A folga à direita desconta a coluna do valor, para as marcas
          caírem debaixo da barra e não debaixo do número.

          CADA MARCA FICA NA PRÓPRIA FRAÇÃO, e não em espaços iguais. As
          marcas nem sempre são equidistantes: com topo ímpar elas são
          0, ceil(topo/2) e topo — em topo 7, 0, 4 e 7 —, e espaçá-las
          igualmente punha o 4 em 50% enquanto a barra de 4 termina em
          57,14%. A marca deixava de marcar a barra.

          Os extremos encostam nas pontas em vez de centrarem sobre elas:
          centrado, metade do glifo do 0 cairia fora do trilho à esquerda.
          As de dentro ficam centradas na posição exata que marcam. */}
      <div className={`${d.folgaDoValor} print:break-inside-avoid`}>
        <div className={d.eixo}>
          {dados.ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0"
              style={{
                left: `${fracaoDoTick(t, dados.topo) * 100}%`,
                transform:
                  t === 0
                    ? 'translateX(0)'
                    : t === dados.topo
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Cartao>
  );
}
