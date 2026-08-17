'use client';

// =====================================================================
// COMPOSITOR DO DOCUMENTO PROFISSIONAL · Bloco 7A
//
// O documento NÃO é gravado: é remontado a cada visualização a partir de
// quatro fontes que já existem —
//
//   avaliação salva + resultados fechados  (Edge, GET /avaliacao/:id)
//   narrativa da IA                        (ai_reports.output_text)
//   identidade profissional + clínica      (profiles)
//   data da avaliação                      (assessments.eval_date)
//
// É isso que permite melhorar o layout de um relatório antigo sem
// regenerar a IA, e que mantém `output_text` sendo SÓ a narrativa. Nenhum
// HTML de documento é persistido.
//
// NENHUMA chamada à OpenAI acontece aqui. Abrir relatório existente custa
// zero unidade da cota.
//
// Por que a avaliação vem da Edge e não de `assessments`/`assessment_results`
// direto: os nomes das escalas moram em `public.scales`, cuja policy de
// leitura exige `has_active_assistant`. Ler por ali faria a tabela ESVAZIAR
// em silêncio no dia em que a assinatura vencesse — justamente o usuário que
// esta tela precisa atender. A Edge roda com service_role e cobra só posse.
//
// O gráfico do CorrigeFácil NÃO entra neste bloco. O espaço dele é o
// Bloco 7B, e por isso nada de `graphs/` é importado aqui.
// =====================================================================

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Pencil, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';
import {
  buscarAvaliacao,
  CorrigeFacilError,
  type AvaliacaoDetalhe,
  type RespostaAuxiliar,
} from '@/lib/corrigefacil/api';
import { formatAgeAtEvaluation } from '@/lib/report/format-age';
import {
  colunasVisiveis,
  formatarDataDocumento,
  montarIdentidade,
  montarAuxiliares,
  montarLinhas,
  resolverDataAvaliacao,
  rotuloDestino,
  rotuloInstrumento,
  rotulosDasColunas,
  type PerfilDocumento,
} from '@/lib/report/document-model';
import { metodoDeCorrecao } from '@/lib/corrigefacil/metricas-instrumento';
import {
  lerTempos,
  NOTA_TEMPOS,
  TITULO_TEMPOS,
} from '@/lib/corrigefacil/tempos-execucao';
import {
  blocosDoPerfil,
  derivadoConfias,
  NOTA_NIVEL,
  TITULO_NIVEL,
  TITULO_PERFIL,
} from '@/lib/corrigefacil/confias-derivado';
import {
  derivadoPhq9,
  NOTA_RASTREAMENTO,
  TITULO_ALERTA,
  TITULO_RASTREAMENTO,
} from '@/lib/corrigefacil/phq9-derivado';
import {
  blocosFdt,
  derivadasAusentes,
  derivadoFdt,
  ehFdt,
  zFormatado,
} from '@/lib/corrigefacil/fdt-derivado';
import {
  narrativaVazia,
  parseNarrativa,
  secoesEstruturadasVazias,
  serializarNarrativa,
  TITULO_NOTA,
  TITULO_UNICO,
  type NarrativaEditavel,
} from '@/lib/report/editable-narrative';
import { ReportGraphIsland } from './ReportGraphIsland';

/** Mensagem única para relatório inexistente, de outro usuário, ou de
 *  outra avaliação. Distinguir os casos confirmaria a existência de um
 *  registro alheio — é a mesma política do detalhe da avaliação. */
const NAO_ENCONTRADO = 'Relatório não encontrado.';

type RelatorioSalvo = {
  id: string;
  report_type: string | null;
  output_text: string;
  created_at: string;
};

type Dados = {
  avaliacao: AvaliacaoDetalhe;
  relatorio: RelatorioSalvo;
  perfil: PerfilDocumento | null;
  evalDate: string | null;
};

type Fase =
  | { fase: 'carregando' }
  | { fase: 'ok'; dados: Dados }
  | { fase: 'erro'; mensagem: string };

/** O relatório precisa ser DESTE usuário E desta avaliação.
 *
 *  A cláusula `corrigefacil_assessment_id` não é redundante com o RLS: o
 *  RLS prova posse, e sozinho aceitaria montar "avaliação A + relatório da
 *  avaliação B" — os dois do mesmo dono, e ainda assim um documento que
 *  nunca existiu. */
async function carregarRelatorio(
  supabase: ReturnType<typeof createClient>,
  assessmentId: string,
  reportId: string,
): Promise<RelatorioSalvo | null> {
  const { data, error } = await supabase
    .from('ai_reports')
    .select('id, report_type, output_text, created_at')
    .eq('id', reportId)
    .eq('corrigefacil_assessment_id', assessmentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as RelatorioSalvo;
}

/** `eval_date` é a data que o profissional informou, e é a única das três
 *  que significa "data da avaliação". A Edge não a devolve, então vem
 *  daqui — consulta de UMA coluna, escopada ao dono pela policy
 *  `own_assessments` (`user_id = auth.uid()`), sem join e sem tocar em
 *  catálogo ou norma.
 *
 *  Falhar aqui não derruba o documento: cai no fallback aprovado
 *  (completed_at, created_at), o mesmo que o motor já usa. */
async function carregarEvalDate(
  supabase: ReturnType<typeof createClient>,
  assessmentId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('assessments')
    .select('eval_date')
    .eq('id', assessmentId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { eval_date: string | null }).eval_date ?? null;
}

/** Perfil parcial NÃO impede o documento: cada pedaço ausente some, e o
 *  resto continua. Falha de leitura também não derruba — o documento sai
 *  sem cabeçalho de identidade, que é degradação honesta. */
async function carregarPerfil(
  supabase: ReturnType<typeof createClient>,
): Promise<PerfilDocumento | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'display_name, clinic_name, gender, profession_category, credential_type, credential_number',
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PerfilDocumento;
}

export function RelatorioDocumentClient({
  assessmentId,
  reportId,
}: Readonly<{ assessmentId: string; reportId: string }>) {
  const [estado, setEstado] = useState<Fase>({ fase: 'carregando' });
  const [copiado, setCopiado] = useState(false);
  /** Nome completo do instrumento, quando o catálogo o entrega. Chega pela
   *  ilha do gráfico, que já fazia essa carga — o documento NÃO abre uma
   *  segunda consulta só para o cabeçalho. Vazio é normal: o código sozinho
   *  continua sendo um rótulo válido. */
  const [nomeInstrumento, setNomeInstrumento] = useState('');
  /** Campos do editor. `null` = fora do modo edição. O documento continua
   *  mostrando o texto PERSISTIDO enquanto isso não for salvo. */
  const [rascunho, setRascunho] = useState<NarrativaEditavel | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const editando = rascunho !== null;

  const carregar = useCallback(
    async (signal: AbortSignal) => {
      const supabase = createClient();

      // O relatório é a porta: sem ele, ou sem o vínculo com esta
      // avaliação, não há documento a compor.
      const relatorio = await carregarRelatorio(supabase, assessmentId, reportId);
      if (signal.aborted) return;
      if (!relatorio) {
        setEstado({ fase: 'erro', mensagem: NAO_ENCONTRADO });
        return;
      }

      let avaliacao: AvaliacaoDetalhe;
      try {
        avaliacao = await buscarAvaliacao(assessmentId, { signal });
      } catch (err: unknown) {
        if (signal.aborted) return;
        // 404 da Edge cobre inexistente E de outro usuário, e vira a mesma
        // mensagem. Falha de infraestrutura é dita como tal, para não
        // sugerir que o relatório sumiu.
        const eNaoEncontrado =
          err instanceof CorrigeFacilError && err.tipo === 'nao_encontrado';
        setEstado({
          fase: 'erro',
          mensagem: eNaoEncontrado
            ? NAO_ENCONTRADO
            : 'Não foi possível carregar o documento agora. Tente novamente.',
        });
        return;
      }
      if (signal.aborted) return;

      // Os dois abaixo são complementares: nenhum deles impede o documento.
      const [perfil, evalDate] = await Promise.all([
        carregarPerfil(supabase),
        carregarEvalDate(supabase, assessmentId),
      ]);
      if (signal.aborted) return;

      setEstado({ fase: 'ok', dados: { avaliacao, relatorio, perfil, evalDate } });
    },
    [assessmentId, reportId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  // Marca o <body> enquanto esta rota está montada. É o que permite ao
  // `@media print` de globals.css zerar o padding de tela do <main> — que
  // pertence ao AppShell, compartilhado por todo o produto — sem alterar o
  // AppShell nem afetar nenhuma outra página. Sai na desmontagem.
  useEffect(() => {
    document.body.classList.add('pp-print-document');
    return () => document.body.classList.remove('pp-print-document');
  }, []);

  async function copiarNarrativa(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sem clipboard disponível o texto continua na tela, selecionável.
      setCopiado(false);
    }
  }

  /** Salva a REDAÇÃO. Não gera IA, não cria relatório, não consome cota.
   *
   *  Vai por RPC e não por `.update()`: `ai_reports` não tem policy de
   *  UPDATE de usuário, e criar uma destrancaria a linha inteira. A função
   *  toca uma coluna só e grava exatamente o texto enviado. */
  async function salvarEdicao(reportIdAtual: string) {
    if (!rascunho || salvando) return;

    // Seção estruturada vazia seria apagada na serialização — e com ela o
    // heading, que a tela mantém travado. Em vez de gravar título órfão ou
    // remover a seção em silêncio, recusa-se o salvamento: o texto das
    // outras seções continua intacto na tela.
    //
    // A NOTA não entra nesta validação: ela é opcional, e apagá-la é uma
    // decisão legítima de quem assina o documento.
    if (secoesEstruturadasVazias(rascunho.secoes).length > 0) {
      setErroEdicao('Preencha o conteúdo de todas as seções antes de salvar.');
      return;
    }

    if (narrativaVazia(rascunho.secoes)) {
      setErroEdicao('O relatório não pode ficar sem texto.');
      return;
    }

    setSalvando(true);
    setErroEdicao(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        'update_corrigefacil_report_text',
        {
          report_uuid: reportIdAtual,
          assessment_uuid: assessmentId,
          // Texto FINAL, com a nota se o profissional a manteve e sem ela se
          // apagou. Nada é reanexado depois — nem aqui, nem no banco.
          new_narrative: serializarNarrativa(rascunho.secoes, rascunho.notaFinal),
        },
      );

      if (error || typeof data !== 'string') {
        // Falha mantém o modo edição e TODO o texto digitado. Voltar ao
        // texto antigo em silêncio faria o profissional perder a revisão.
        setErroEdicao(
          'Não foi possível salvar as alterações. O texto continua aqui — tente novamente.',
        );
        return;
      }

      setEstado((atual) =>
        atual.fase === 'ok'
          ? {
              ...atual,
              dados: {
                ...atual.dados,
                relatorio: { ...atual.dados.relatorio, output_text: data },
              },
            }
          : atual,
      );
      setRascunho(null);
      setSalvo(true);
      window.setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  /** Ações da aplicação: vivem FORA da folha e somem no papel. */
  const barra = (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link
        href={`/app/corrigefacil/avaliacoes/${encodeURIComponent(assessmentId)}`}
        className="inline-flex items-center gap-2 text-pp-ink-soft text-sm hover:text-pp-ink transition"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Voltar à avaliação
      </Link>

      {estado.fase === 'ok' && !editando && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Ícone MAIS texto: quem usa isto é profissional de saúde e
              educação, não desenvolvedor. Lápis sozinho não se lê. */}
          <button
            type="button"
            onClick={() => {
              setErroEdicao(null);
              setRascunho(parseNarrativa(estado.dados.relatorio.output_text));
            }}
            className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-5 py-2.5 text-sm text-pp-ink hover:border-pp-ink/40 transition"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            Editar texto
          </button>

          {/* Copia SÓ a narrativa da IA — o mesmo texto que a visualização
              inline copiava antes de ser unificada aqui. Nada de HTML,
              cabeçalho, tabela ou gráfico: quem cola isso num editor quer o
              texto para trabalhar em cima, não a marcação do documento. */}
          <button
            type="button"
            onClick={() => copiarNarrativa(estado.dados.relatorio.output_text)}
            className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-5 py-2.5 text-sm text-pp-ink hover:border-pp-ink/40 transition"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
            {copiado ? 'Copiado' : 'Copiar texto'}
          </button>

          {/* Só o diálogo nativo: quem gera o PDF é o navegador, com "Salvar
              como PDF". Sem blob, sem download próprio, sem PDF no servidor. */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-pill border border-pp-ink/15 px-5 py-2.5 text-sm text-pp-ink hover:border-pp-ink/40 transition"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Imprimir / Salvar PDF
          </button>
        </div>
      )}

      {/* Em edição, Copiar e Imprimir SOMEM. Enquanto há texto não salvo, os
          dois operariam sobre o conteúdo persistido — o profissional
          imprimiria a versão antiga achando que levava a revisão. */}
      {estado.fase === 'ok' && editando && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRascunho(null);
              setErroEdicao(null);
            }}
            disabled={salvando}
            className="rounded-pill border border-pp-ink/15 px-5 py-2.5 text-sm text-pp-ink hover:border-pp-ink/40 transition disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => salvarEdicao(estado.dados.relatorio.id)}
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-pill bg-pp-ink text-pp-canvas px-5 py-2.5 text-sm font-medium hover:bg-pp-ink-soft transition disabled:opacity-40"
          >
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  );

  if (estado.fase === 'carregando') {
    return (
      <div className="mx-auto max-w-[210mm] space-y-6 pt-4">
        {barra}
        <output className="block text-pp-ink-soft text-sm">
          Montando o documento…
        </output>
      </div>
    );
  }

  if (estado.fase === 'erro') {
    return (
      <div className="mx-auto max-w-[210mm] space-y-6 pt-4">
        {barra}
        <section className="bg-pp-block-lilac rounded-block p-8">
          <p className="text-pp-ink text-base">{estado.mensagem}</p>
        </section>
      </div>
    );
  }

  const { avaliacao, relatorio, perfil, evalDate } = estado.dados;
  const identidade = montarIdentidade(perfil);
  const linhas = montarLinhas(avaliacao.resultados, avaliacao.instrument);
  const colunas = colunasVisiveis(linhas);
  // os MESMOS nomes que a tela de correção e o histórico usam. O documento é
  // o que sai impresso e vira PDF: ele não pode chamar as duas medidas do
  // SNAP-IV-26 de "Bruto" e "Escore" depois de a tela já as ter separado.
  const cabecalhos = rotulosDasColunas(avaliacao.instrument);
  const destino = rotuloDestino(relatorio.report_type);

  const meta = avaliacao.subject_meta ?? {};
  const idade = formatAgeAtEvaluation(meta.age_at_evaluation);
  const respondente =
    typeof meta.respondent_name === 'string' ? meta.respondent_name.trim() : '';
  const dataAvaliacao = formatarDataDocumento(
    resolverDataAvaliacao(evalDate, avaliacao.completed_at, avaliacao.created_at),
  );

  return (
    <div className="mx-auto max-w-[210mm] space-y-6 pt-4 print:max-w-none print:pt-0 print:space-y-0">
      {barra}

      {/* A FOLHA. Na tela: largura de A4, fundo branco e sombra muito
          discreta, para ler como documento e não como formulário. No papel:
          sem borda, sem sombra, sem cantos e sem padding — quem dá a margem
          é `@page`, e somar as duas empurraria o texto para dentro.

          `pp-doc` é o gancho das regras de paginação em globals.css. */}
      <article className="pp-doc bg-white border border-pp-hairline rounded-block shadow-[0_1px_3px_rgba(14,42,56,0.06)] px-[16mm] py-[18mm] space-y-8 print:max-w-none print:border-0 print:rounded-none print:shadow-none print:p-0">
        {/* ── CABEÇALHO ─────────────────────────────────────────────── */}
        {/* Bloco pequeno e de leitura única: cabe inteiro numa página e não
            deve ser partido. */}
        <header className="space-y-4 border-b border-pp-hairline pb-6 print:break-inside-avoid">
          {identidade.temAlgo && (
            <div className="space-y-0.5">
              {identidade.clinica && (
                <p className="font-serif italic text-xl text-pp-ink leading-tight">
                  {identidade.clinica}
                </p>
              )}
              {identidade.nome && (
                <p className="text-pp-ink text-base font-medium">{identidade.nome}</p>
              )}
              {identidade.credenciamento && (
                <p className="text-pp-ink-soft text-sm">{identidade.credenciamento}</p>
              )}
            </div>
          )}

          <div className="space-y-1 pt-2">
            <h1 className="font-serif italic text-2xl sm:text-3xl text-pp-ink leading-tight">
              Relatório Profissional
            </h1>
            {destino && (
              <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                Destino: {destino}
              </p>
            )}
          </div>
        </header>

        {/* ── IDENTIFICAÇÃO ─────────────────────────────────────────── */}
        {/* Quadro curto: parte-lo entre páginas separaria "Avaliado" da
            idade e da data, que se leem juntos. */}
        <section className="space-y-3 print:break-inside-avoid">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Identificação
          </h2>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
            <Campo rotulo="Avaliado" valor={avaliacao.subject_label?.trim() || null} />
            <Campo rotulo="Idade na avaliação" valor={idade} />
            <Campo rotulo="Data da avaliação" valor={dataAvaliacao} />
            <Campo rotulo="Respondente" valor={respondente || null} />
            {/* Código sempre; nome completo quando o catálogo o entrega pela
                ilha do gráfico. Se não vier, o código sozinho permanece — o
                cabeçalho nunca fica vazio nem exibe erro técnico. */}
            <Campo
              rotulo="Instrumento"
              valor={rotuloInstrumento(avaliacao.instrument, nomeInstrumento)}
            />
          </dl>
        </section>

        {/* ── RESULTADOS ────────────────────────────────────────────── */}
        {/* SEM `break-inside-avoid` na seção: um instrumento com muitas
            escalas ocupa mais de uma página, e protegê-la inteira jogaria
            tudo para a folha seguinte deixando um vazio enorme. A proteção
            fica na LINHA, que é a unidade pequena. */}
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Resultados
          </h2>

          {/* O FDT imprime as dez medidas AQUI, no lugar da tabela — e não
              além dela. A tabela genérica traz a coluna de classificação, e
              no FDT ela sairia vazia: os cortes mudam a cada faixa etária e
              a classificação vive no derivado. Ter as duas seria imprimir a
              mesma lista duas vezes, metade dela sem classificação.

              É a MESMA decisão da tela de correção e do histórico, e é por
              isso que o bloco não aparece uma segunda vez mais abaixo. Os
              outros instrumentos seguem na tabela de sempre. */}
          {ehFdt(avaliacao.instrument) ? (
            <FdtDoDocumento avaliacao={avaliacao} />
          ) : (
            <>
          {linhas.length === 0 ? (
            <p className="text-pp-ink-soft text-sm">
              Esta avaliação não possui resultados registrados.
            </p>
          ) : (
            /* Na tela o scroll horizontal salva a tabela larga; no papel não
               há para onde rolar, então o contêiner libera o overflow (regra
               em globals.css) e a tabela quebra o texto na célula. Nenhuma
               coluna é escondida para caber. */
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse text-sm print:text-[11px]">
                <thead>
                  <tr className="text-left text-pp-ink-soft">
                    <th className="border border-pp-ink/15 px-3 py-2 font-medium">Escala</th>
                    {colunas.bruto && <th className="border border-pp-ink/15 px-3 py-2 font-medium">{cabecalhos.bruto}</th>}
                    {colunas.media && cabecalhos.media && <th className="border border-pp-ink/15 px-3 py-2 font-medium">{cabecalhos.media}</th>}
                    {colunas.escore && <th className="border border-pp-ink/15 px-3 py-2 font-medium">{cabecalhos.escore}</th>}
                    {colunas.percentil && <th className="border border-pp-ink/15 px-3 py-2 font-medium">Percentil</th>}
                    {colunas.z && <th className="border border-pp-ink/15 px-3 py-2 font-medium">z</th>}
                    {colunas.ci95 && <th className="border border-pp-ink/15 px-3 py-2 font-medium">IC95</th>}
                    {colunas.classificacao && <th className="border border-pp-ink/15 px-3 py-2 font-medium">Classificação</th>}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    // Quantas colunas a mensagem de indisponível precisa
                    // atravessar para não deixar células fantasma.
                    const numericas =
                      Number(colunas.bruto) +
                      Number(colunas.media) +
                      Number(colunas.escore) +
                      Number(colunas.percentil) +
                      Number(colunas.z) +
                      Number(colunas.ci95) +
                      Number(colunas.classificacao);

                    return (
                      <tr key={l.escala} className="align-top print:break-inside-avoid">
                        <td className="border border-pp-ink/15 px-3 py-2 text-pp-ink font-medium">
                          {l.escala}
                          {/* Quando NENHUMA escala tem valor, não sobra
                              coluna quantitativa para a mensagem atravessar
                              com colSpan — e ela sumia, deixando só o código
                              da escala numa linha muda. A mensagem desce para
                              cá em vez de criar uma coluna sem cabeçalho. */}
                          {!l.disponivel && numericas === 0 && (
                            <span className="block font-normal text-pp-ink-soft mt-1">
                              {l.mensagem ?? 'Resultado indisponível.'}
                            </span>
                          )}
                        </td>

                        {l.disponivel ? (
                          <>
                            {colunas.bruto && <Celula valor={l.brutoTexto} />}
                            {colunas.media && cabecalhos.media && <Celula valor={l.mediaTexto} />}
                            {colunas.escore && <Celula valor={l.escoreTexto} />}
                            {colunas.percentil && <Celula valor={l.percentilTexto} />}
                            {colunas.z && <Celula valor={l.z} />}
                            {colunas.ci95 && <Celula valor={l.ci95} />}
                            {colunas.classificacao && <Celula valor={l.classificacao} />}
                          </>
                        ) : (
                          // available=false não recebe número nenhum: quem
                          // informa é a mensagem que o servidor gravou.
                          numericas > 0 && (
                            <td
                              colSpan={numericas}
                              className="border border-pp-ink/15 px-3 py-2 text-pp-ink-soft"
                            >
                              {l.mensagem ?? 'Resultado indisponível.'}
                            </td>
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
            </>
          )}
        </section>

        {/* ── DERIVADOS DO CONFIAS ──────────────────────────────────── */}
        {/* Determinístico, e por isso FORA da narrativa: o perfil das 16
            habilidades sai impresso porque foi calculado e congelado na
            conclusão, não porque a IA resolveu mencioná-lo. A IA
            INTERPRETA; o documento IMPRIME. Se a narrativa citar só três
            tarefas, as dezesseis continuam no PDF.

            Fora da TABELA também: aquela tem colunas de escore, percentil
            e classificação NORMATIVA, e as tarefas não têm nenhuma das
            três. Uma linha delas ali seria lida como uma quarta escala do
            instrumento, ao lado de Sílaba, Fonema e Total.

            Vem de `avaliacao.derived`, que a Edge promoveu do snapshot
            congelado — nada é recalculado aqui. Devolve null sozinho fora
            do CONFIAS e em toda avaliação anterior ao campo. */}
        <ConfiasDoDocumento avaliacao={avaliacao} />

        {/* ── RASTREAMENTO E ALERTA DO PHQ-9 ────────────────────────── */}
        {/* Determinístico pelo mesmo motivo, e aqui o motivo é mais forte:
            o alerta do item 9 sai impresso porque o item foi respondido
            positivamente, NÃO porque a IA resolveu mencioná-lo. Se a
            narrativa não falar dele, ele continua no PDF.

            Fora da TABELA: aquela tem a coluna de classificação, que é uma
            das cinco faixas. O rastreamento é outra leitura do mesmo total,
            e uma linha dele ali seria lida como uma segunda escala. */}
        <Phq9DoDocumento avaliacao={avaliacao} />

        {/* ── RESPOSTAS AUXILIARES ──────────────────────────────────── */}
        {/* Determinístico, e por isso FORA da narrativa: o valor aparece no
            documento porque foi respondido, não porque a IA resolveu
            mencioná-lo. A IA pode interpretá-lo no texto abaixo; alterá-lo
            ela não pode, porque não é ela quem o imprime aqui.

            Fora da TABELA também, e pelo mesmo motivo do resto do produto:
            a tabela tem colunas de escore, percentil e classificação, e o
            auxiliar não tem nenhuma das três. Uma linha dele ali seria lida
            como resultado.

            Devolve null sozinho quando a avaliação não tem auxiliar — o que
            inclui toda avaliação salva antes deste campo existir. */}
        <AuxiliaresDoDocumento respostas={avaliacao.auxiliary_responses} />

        {/* ── MÉTODO DE CORREÇÃO ────────────────────────────────────── */}
        {/* Uma vez, logo abaixo da tabela que ele explica, e fora dela: é
            nota de método, não resultado nem classificação. Sem isso, quem
            comparasse este documento com outra implementação do SNAP-IV —
            uma que some 0 a 3, ou que use média por dimensão — concluiria
            que os números estão errados.

            Devolve null sozinho nos instrumentos sem método declarado, que
            são todos os outros. */}
        {/* ── TEMPO DE EXECUÇÃO ─────────────────────────────────────── */}
        {/* Determinístico, e por isso FORA da narrativa e FORA da tabela,
            pelo mesmo motivo das respostas auxiliares: a tabela tem colunas
            de escore, percentil e classificação, e o tempo não tem nenhuma
            das três. Uma linha dele ali seria lida como resultado.

            Devolve null sozinho quando não há tempo gravado. */}
        <TemposDoDocumento instrumento={avaliacao.instrument} meta={meta} />

        <MetodoDoDocumento instrumento={avaliacao.instrument} />

        {/* ── REPRESENTAÇÃO VISUAL ──────────────────────────────────── */}
        {/* Entre a tabela e a narrativa: o gráfico é releitura dos mesmos
            números que acabaram de ser lidos, e a análise vem depois de
            ambos. Sem título aqui — o `ResultGraph` já traz o dele, e dois
            títulos iguais seriam ruído.

            Devolve null sozinho quando não há gráfico aprovado, quando o
            catálogo não carregou ou quando as faixas de hoje não reconhecem
            a classificação gravada. */}
        <ReportGraphIsland
          avaliacao={avaliacao}
          onNomeDoInstrumento={setNomeInstrumento}
        />

        {/* ── NARRATIVA ─────────────────────────────────────────────── */}
        {/* `output_text` como está: renderizado, nunca reescrito. O aviso
            ético já vem embutido nele pelo motor — acrescentar outro aqui
            duplicaria o disclaimer. */}
        {/* Parágrafo longo PRECISA poder quebrar entre páginas — proteger a
            narrativa inteira produziria folhas quase vazias. As guardas de
            órfã/viúva e de título ficam em globals.css, no nível certo. */}
        {editando && (
          // O EDITOR. Títulos travados, conteúdo editável, e a nota final num
          // campo próprio — opcional, porque quem assina o documento é o
          // profissional. `print:hidden` porque texto não salvo não vai ao papel.
          <section className="space-y-5 print:hidden">
            <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
              Revisando a redação — os resultados, a tabela e o gráfico não mudam
            </p>

            {rascunho.secoes.map((secao, i) => (
              <div key={secao.titulo || `secao-${i}`} className="space-y-1.5">
                <p className="text-pp-ink text-sm font-medium">
                  {secao.titulo || TITULO_UNICO}
                </p>
                <textarea
                  value={secao.conteudo}
                  onChange={(e) =>
                    setRascunho((atual) =>
                      atual
                        ? {
                            ...atual,
                            secoes: atual.secoes.map((s, j) =>
                              j === i ? { ...s, conteudo: e.target.value } : s,
                            ),
                          }
                        : atual,
                    )
                  }
                  rows={Math.min(20, Math.max(4, secao.conteudo.split('\n').length + 2))}
                  className="w-full rounded-2xl border border-pp-ink/15 bg-white px-4 py-3 text-sm leading-[1.7] text-pp-ink resize-y"
                />
              </div>
            ))}

            {/* A NOTA. Vem preenchida quando o relatório tem uma — inclusive a
                antiga, de relatórios anteriores a esta mudança. Pode ser
                mantida, reescrita ou apagada, e apagar não impede salvar. */}
            <div className="space-y-1.5 border-t border-pp-hairline pt-5">
              <p className="text-pp-ink text-sm font-medium">{TITULO_NOTA}</p>
              <textarea
                value={rascunho.notaFinal}
                onChange={(e) =>
                  setRascunho((atual) =>
                    atual ? { ...atual, notaFinal: e.target.value } : atual,
                  )
                }
                rows={4}
                className="w-full rounded-2xl border border-pp-ink/15 bg-white px-4 py-3 text-sm leading-[1.7] text-pp-ink resize-y"
              />
              <p className="text-xs text-pp-ink-soft">
                Texto sugerido para fechar o documento. Você pode ajustá-lo ou
                deixá-lo em branco — o relatório é de sua responsabilidade.
              </p>
            </div>

            {erroEdicao && (
              <p role="alert" className="text-sm text-pp-ink">
                {erroEdicao}
              </p>
            )}
          </section>
        )}

        {salvo && !editando && (
          <output className="block text-sm text-pp-ink-soft print:hidden">
            Alterações salvas.
          </output>
        )}

        <section
          className={[
            'text-[15px] leading-[1.7] text-pp-ink break-words print:text-[11.5pt] print:leading-[1.55]',
            // Em edição a leitura some da tela, mas continua montada: é ela
            // que o print usaria, e ter duas versões visíveis do mesmo texto
            // deixaria ambíguo qual está valendo.
            editando ? 'hidden' : '',
          ].join(' ')}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="font-serif italic text-2xl mt-7 mb-3 first:mt-0 print:text-[15pt] print:mt-6">
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2 className="font-serif italic text-xl mt-7 mb-3 first:mt-0 print:text-[13.5pt] print:mt-6">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-medium text-lg mt-5 mb-2 print:text-[12pt] print:mt-4">
                  {children}
                </h3>
              ),
              p: ({ children }) => <p className="my-3">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-4 print:overflow-visible">
                  <table className="w-full border-collapse text-sm print:text-[11px]">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-pp-ink/15 px-3 py-2 text-left">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-pp-ink/15 px-3 py-2 align-top">{children}</td>
              ),
            }}
          >
            {relatorio.output_text}
          </ReactMarkdown>
        </section>

        {/* ── IDENTIFICAÇÃO PROFISSIONAL FINAL ──────────────────────── */}
        {/* Sem imagem, sem logo, sem assinatura digital: só o texto que o
            perfil sustenta. A clínica não se repete aqui — ela já abre o
            documento, e repetir viraria ruído em página curta. */}
        {(identidade.nome || identidade.credenciamento) && (
          <footer className="pp-professional-footer border-t border-pp-hairline pt-6 space-y-0.5 print:break-inside-avoid">
            {identidade.nome && (
              <p className="text-pp-ink text-sm font-medium">{identidade.nome}</p>
            )}
            {identidade.credenciamento && (
              <p className="text-pp-ink-soft text-sm">{identidade.credenciamento}</p>
            )}
          </footer>
        )}
      </article>
    </div>
  );
}

/** Campo do quadro de identificação. Valor ausente some inteiro — rótulo
 *  com traço ao lado sugere dado perdido, não dado não coletado. */
/** As respostas auxiliares, na tipografia do documento.
 *
 *  Seção curta e de leitura única: não deve ser partida entre páginas —
 *  separar a pergunta da resposta deixaria as duas ilegíveis. */
function AuxiliaresDoDocumento({
  respostas,
}: Readonly<{ respostas: RespostaAuxiliar[] | undefined }>) {
  const linhas = montarAuxiliares(respostas);
  if (linhas.length === 0) return null;

  return (
    <section className="space-y-3 print:break-inside-avoid">
      <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
        Respostas complementares
      </h2>
      <dl className="space-y-2 text-sm print:text-[11px]">
        {linhas.map((l) => (
          <div key={l.number} className="flex flex-wrap gap-x-2">
            <dt className="text-pp-ink-soft">{l.pergunta}</dt>
            <dd className="text-pp-ink font-medium">{l.resposta}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-pp-ink-soft">
        Respondido junto do protocolo. Não entra na pontuação nem na
        classificação.
      </p>
    </section>
  );
}

/** Os derivados do CONFIAS no documento impresso.
 *
 *  Lê do MESMO módulo que a tela e o histórico usam
 *  (`@/lib/corrigefacil/confias-derivado`) — o que muda aqui é só o estilo,
 *  para caber no papel. Duas versões do mesmo perfil divergiriam, e a que
 *  ficasse para trás sairia impressa.
 *
 *  A nota do nível acompanha o valor também no impresso, e aqui ela importa
 *  mais que na tela: o PDF circula sem o contexto do sistema, e é
 *  justamente ali que "Alfabética" corre o risco de ser lido como a
 *  hipótese de escrita que o profissional informou.
 *
 *  As dezesseis linhas não cabem sempre na mesma página, então o bloco NÃO
 *  é protegido inteiro contra quebra — só cada tarefa, para que código,
 *  acertos e classificação nunca se separem. */
function ConfiasDoDocumento({
  avaliacao,
}: Readonly<{ avaliacao: AvaliacaoDetalhe }>) {
  const derivado = derivadoConfias(avaliacao);
  if (!derivado) return null;

  const blocos = blocosDoPerfil(derivado);
  const nivel = derivado.nivel_equivalente_silaba;
  if (!nivel && blocos.length === 0) return null;

  return (
    <section className="space-y-5">
      {nivel && (
        <div className="space-y-1 print:break-inside-avoid">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {TITULO_NIVEL}
          </h2>
          <p className="text-pp-ink text-sm font-medium print:text-[11px]">
            {nivel}
          </p>
          <p className="text-[11px] text-pp-ink-soft leading-relaxed">
            {NOTA_NIVEL}
          </p>
        </div>
      )}

      {blocos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {TITULO_PERFIL}
          </h2>
          {blocos.map((bloco) => (
            <div key={bloco.titulo} className="space-y-1.5">
              <h3 className="text-[11px] text-pp-ink-soft print:break-after-avoid">
                {bloco.titulo}
              </h3>
              <dl className="space-y-1 text-sm print:text-[11px]">
                {bloco.linhas.map((l) => (
                  <div
                    key={l.code}
                    className="flex flex-wrap gap-x-2 print:break-inside-avoid"
                  >
                    <dt className="text-pp-ink-soft">{l.titulo}</dt>
                    <dd className="text-pp-ink font-medium">
                      {[l.acertos, l.percentual, l.classificacao]
                        .filter((p): p is string => !!p)
                        .join(' · ')}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** As dez medidas do FDT no documento impresso.
 *
 *  Lê do MESMO módulo que a tela e o histórico usam
 *  (`@/lib/corrigefacil/fdt-derivado`); o que muda aqui é só o estilo.
 *
 *  Bruto e z vêm do resultado congelado; faixa e classificação, do
 *  derivado congelado. Nada é recalculado, e não existe percentil
 *  interpolado — a V1 não o expõe. */
function FdtDoDocumento({
  avaliacao,
}: Readonly<{ avaliacao: AvaliacaoDetalhe }>) {
  const derivado = derivadoFdt(avaliacao);
  const blocos = blocosFdt(avaliacao.instrument, derivado, avaliacao.resultados);
  if (!blocos) return null;
  const ausentes = derivadasAusentes(derivado);

  return (
    <section className="space-y-4">
      {blocos.map((bloco) => (
        <div key={bloco.titulo} className="space-y-2 print:break-inside-avoid">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {bloco.titulo}
          </h2>
          <ul className="space-y-1">
            {bloco.linhas.map((linha) => (
              <li
                key={linha.code}
                className="text-pp-ink text-sm print:text-[11px]"
              >
                <span className="font-medium">{linha.nome}</span>
                {linha.indisponivel ? (
                  <span className="text-pp-ink-soft"> — {linha.indisponivel}</span>
                ) : (
                  <span className="tabular-nums">
                    {linha.bruto !== null && ` — bruto ${linha.bruto}`}
                    {linha.z !== null && ` · z ${zFormatado(linha.z)}`}
                    {linha.faixa && ` · ${linha.faixa}`}
                    {linha.classificacao && ` · ${linha.classificacao}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-pp-ink-soft leading-relaxed">
            {bloco.nota}
          </p>
        </div>
      ))}

      {ausentes.length > 0 && (
        <p className="text-[11px] text-pp-ink-soft leading-relaxed">
          Não calculadas por falta de componente: {ausentes.join(', ')}.
        </p>
      )}
    </section>
  );
}

/** O rastreamento e o alerta do item 9 no documento impresso.
 *
 *  Lê do MESMO módulo que a tela e o histórico usam
 *  (`@/lib/corrigefacil/phq9-derivado`); o que muda aqui é só o estilo.
 *
 *  Bloco curto e de leitura única: não deve ser partido entre páginas —
 *  separar o alerta do rótulo dele deixaria os dois ilegíveis, e é o pedaço
 *  do documento em que isso menos pode acontecer. */
function Phq9DoDocumento({
  avaliacao,
}: Readonly<{ avaliacao: AvaliacaoDetalhe }>) {
  const derivado = derivadoPhq9(avaliacao);
  if (!derivado) return null;

  return (
    <section className="space-y-4">
      {derivado.rastreamento && (
        <div className="space-y-1 print:break-inside-avoid">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {TITULO_RASTREAMENTO}
          </h2>
          <p className="text-pp-ink text-sm font-medium print:text-[11px]">
            {derivado.rastreamento}
          </p>
          <p className="text-[11px] text-pp-ink-soft leading-relaxed">
            {NOTA_RASTREAMENTO}
          </p>
        </div>
      )}

      {derivado.alerta_item_9 && (
        <div className="space-y-1 border border-pp-ink/25 rounded-block p-4 print:break-inside-avoid">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {TITULO_ALERTA}
          </h2>
          <p className="text-pp-ink text-sm leading-relaxed print:text-[11px]">
            {derivado.alerta_item_9}
          </p>
        </div>
      )}
    </section>
  );
}

/** A nota de MÉTODO, na tipografia do documento.
 *
 *  O texto vem do mesmo lugar que a tela usa
 *  (`@/lib/corrigefacil/metricas-instrumento`) — o que muda aqui é só o
 *  estilo, para caber no papel. Duas versões do texto divergiriam, e a que
 *  ficasse para trás sairia impressa. */
function MetodoDoDocumento({
  instrumento,
}: Readonly<{ instrumento: string | undefined }>) {
  const metodo = metodoDeCorrecao(instrumento);
  if (!metodo) return null;

  return (
    <section className="space-y-2 print:break-inside-avoid">
      <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
        {metodo.titulo}
      </h2>
      <p className="text-[11px] text-pp-ink-soft leading-relaxed whitespace-pre-line">
        {metodo.texto}
      </p>
    </section>
  );
}

/** Os tempos de execução no documento impresso.
 *
 *  Lê do MESMO módulo que a tela e o histórico usam
 *  (`@/lib/corrigefacil/tempos-execucao`) — o que muda aqui é só o estilo,
 *  para caber no papel. A nota acompanha o número também no impresso: o PDF
 *  circula sem o contexto da tela, e é justamente ali que "55 segundos"
 *  corre mais risco de ser lido como classificação.
 *
 *  Bloco pequeno e de leitura única: cabe inteiro numa página e não deve
 *  ser partido. */
function TemposDoDocumento({
  instrumento,
  meta,
}: Readonly<{
  instrumento: string | undefined;
  meta: Record<string, unknown> | null | undefined;
}>) {
  const tempos = lerTempos(instrumento, meta);
  if (tempos.length === 0) return null;

  return (
    <section className="space-y-2 print:break-inside-avoid">
      <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
        {TITULO_TEMPOS}
      </h2>
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
        {tempos.map((t) => (
          <Campo key={t.rotulo} rotulo={t.rotulo} valor={`${t.segundos} segundos`} />
        ))}
      </dl>
      <p className="text-[11px] text-pp-ink-soft leading-relaxed">{NOTA_TEMPOS}</p>
    </section>
  );
}

function Campo({ rotulo, valor }: Readonly<{ rotulo: string; valor: string | null }>) {
  if (!valor) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-pp-ink-soft shrink-0">{rotulo}:</dt>
      <dd className="text-pp-ink">{valor}</dd>
    </div>
  );
}

/** Célula numérica. `null` fica VAZIA — nunca 0, nunca travessão: os dois
 *  seriam afirmações que ninguém fez. */
function Celula({ valor }: Readonly<{ valor: number | string | null }>) {
  return (
    <td className="border border-pp-ink/15 px-3 py-2 text-pp-ink tabular-nums">
      {valor === null ? '' : valor}
    </td>
  );
}
