import { RelatorioDocumentClient } from './RelatorioDocumentClient';

// Documento profissional de UM relatório de UMA avaliação.
//
// A rota carrega os DOIS ids porque uma avaliação tem N relatórios, e
// `/avaliacoes/[id]/relatorio` no singular não diria qual. O cliente ainda
// exige que o relatório aponte para esta avaliação — ver o comentário de
// `carregarRelatorio`: posse do relatório sozinha não impede montar o par
// "avaliação A + relatório da avaliação B".
//
// EXIGE apenas autenticação (middleware), como o detalhe da avaliação. Não
// passa pelo gate comercial: gerar relatório novo consome assinatura, abrir
// um relatório já gerado não. Quem pagou e deixou vencer continua lendo o
// que já produziu.
export default async function DocumentoRelatorioPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await params;
  return (
    <RelatorioDocumentClient
      assessmentId={decodeURIComponent(id)}
      reportId={decodeURIComponent(reportId)}
    />
  );
}
