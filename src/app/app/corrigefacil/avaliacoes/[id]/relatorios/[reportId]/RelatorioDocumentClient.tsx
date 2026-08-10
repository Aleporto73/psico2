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
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/utils/supabase/client';
import {
  buscarAvaliacao,
  CorrigeFacilError,
  type AvaliacaoDetalhe,
} from '@/lib/corrigefacil/api';
import { formatAgeAtEvaluation } from '@/lib/report/format-age';
import {
  colunasVisiveis,
  formatarDataDocumento,
  montarIdentidade,
  montarLinhas,
  resolverDataAvaliacao,
  rotuloDestino,
  type PerfilDocumento,
} from '@/lib/report/document-model';

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

  const voltar = (
    <Link
      href={`/app/corrigefacil/avaliacoes/${encodeURIComponent(assessmentId)}`}
      className="inline-flex items-center gap-2 text-pp-ink-soft text-sm hover:text-pp-ink transition print:hidden"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Voltar à avaliação
    </Link>
  );

  if (estado.fase === 'carregando') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <output className="block text-pp-ink-soft text-sm">
          Montando o documento…
        </output>
      </div>
    );
  }

  if (estado.fase === 'erro') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {voltar}
        <section className="bg-pp-block-lilac rounded-block p-8">
          <p className="text-pp-ink text-base">{estado.mensagem}</p>
        </section>
      </div>
    );
  }

  const { avaliacao, relatorio, perfil, evalDate } = estado.dados;
  const identidade = montarIdentidade(perfil);
  const linhas = montarLinhas(avaliacao.resultados);
  const colunas = colunasVisiveis(linhas);
  const destino = rotuloDestino(relatorio.report_type);

  const meta = avaliacao.subject_meta ?? {};
  const idade = formatAgeAtEvaluation(meta.age_at_evaluation);
  const respondente =
    typeof meta.respondent_name === 'string' ? meta.respondent_name.trim() : '';
  const dataAvaliacao = formatarDataDocumento(
    resolverDataAvaliacao(evalDate, avaliacao.completed_at, avaliacao.created_at),
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pt-4">
      {voltar}

      <article className="bg-white border border-pp-hairline rounded-block p-8 sm:p-10 space-y-8 print:border-0 print:p-0">
        {/* ── CABEÇALHO ─────────────────────────────────────────────── */}
        <header className="space-y-4 border-b border-pp-hairline pb-6">
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
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Identificação
          </h2>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm">
            <Campo rotulo="Avaliado" valor={avaliacao.subject_label?.trim() || null} />
            <Campo rotulo="Idade na avaliação" valor={idade} />
            <Campo rotulo="Data da avaliação" valor={dataAvaliacao} />
            <Campo rotulo="Respondente" valor={respondente || null} />
            {/* Código do instrumento, não nome por extenso: o nome exigiria
                `instruments`, cuja leitura depende de assinatura ativa. */}
            <Campo rotulo="Instrumento" valor={avaliacao.instrument} />
          </dl>
        </section>

        {/* ── RESULTADOS ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            Resultados
          </h2>

          {linhas.length === 0 ? (
            <p className="text-pp-ink-soft text-sm">
              Esta avaliação não possui resultados registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-pp-ink-soft">
                    <th className="border border-pp-ink/15 px-3 py-2 font-medium">Escala</th>
                    {colunas.bruto && <th className="border border-pp-ink/15 px-3 py-2 font-medium">Bruto</th>}
                    {colunas.escore && <th className="border border-pp-ink/15 px-3 py-2 font-medium">Escore</th>}
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
                            {colunas.bruto && <Celula valor={l.bruto} />}
                            {colunas.escore && <Celula valor={l.escore} />}
                            {colunas.percentil && <Celula valor={l.percentil} />}
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
        </section>

        {/* ── NARRATIVA ─────────────────────────────────────────────── */}
        {/* `output_text` como está: renderizado, nunca reescrito. O aviso
            ético já vem embutido nele pelo motor — acrescentar outro aqui
            duplicaria o disclaimer. */}
        <section className="text-[15px] leading-[1.7] text-pp-ink break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="font-serif italic text-2xl mt-7 mb-3 first:mt-0">{children}</h2>
              ),
              h2: ({ children }) => (
                <h2 className="font-serif italic text-xl mt-7 mb-3 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => <h3 className="font-medium text-lg mt-5 mb-2">{children}</h3>,
              p: ({ children }) => <p className="my-3">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="w-full border-collapse text-sm">{children}</table>
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
          <footer className="border-t border-pp-hairline pt-6 space-y-0.5">
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
