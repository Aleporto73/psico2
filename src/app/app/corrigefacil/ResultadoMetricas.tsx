// =====================================================================
// AS MÉTRICAS DE UM RESULTADO, NUMA LINHA SÓ — rótulos em cima, valores
// embaixo, e a CLASSIFICAÇÃO como última coluna do mesmo bloco.
//
// POR QUE A CLASSIFICAÇÃO ENTRA AQUI, e não num bloco abaixo:
//
//   ela é a leitura do número que está ao lado dela. Separada num bloco
//   próprio, com rótulo próprio, ela parecia um segundo resultado — e o
//   olho precisava descer para saber o que "31" queria dizer. Como última
//   célula, escore e significado se leem juntos, que é como o profissional
//   os usa.
//
// ESTE COMPONENTE NÃO SABE NADA DE CLÍNICA. Não classifica, não formata
// número, não escolhe rótulo e não decide o que aparece: recebe células
// PRONTAS e desenha. Quem decide as colunas é `celulasDoResultado` nos 20
// instrumentos comuns e `blocosFdt` no FDT. É de propósito que não há um
// `code` de instrumento neste arquivo.
//
// POR QUE OS TRÊS CHAMADORES COMPARTILHAM ISTO: tela de correção,
// histórico e FDT mostravam a mesma coisa com três desenhos diferentes.
// O que se compartilha é a APRESENTAÇÃO; cada um continua dono do seu
// modelo — o FDT não virou instrumento comum por desenhar igual.
//
// COLUNA VAZIA NÃO EXISTE: célula sem valor não é passada, e classificação
// nula não vira coluna.
// =====================================================================

import type { CelulaResultado } from '@/lib/corrigefacil/resultado-celulas';

export function ResultadoMetricas({
  metricas,
  classificacao,
}: Readonly<{
  metricas: readonly CelulaResultado[];
  classificacao?: string | null;
}>) {
  const classe = classificacao?.trim() ? classificacao : null;
  if (metricas.length === 0 && !classe) return null;

  return (
    // `flex-wrap`, e não largura fixa: em tela larga as colunas ficam lado
    // a lado; em tela estreita elas quebram inteiras, em vez de espremer
    // "Abaixo do ponto de corte para rastreamento" numa coluna de números.
    // `items-start` mantém os rótulos alinhados no topo quando a
    // classificação ocupa duas linhas.
    <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
      {metricas.map((m) => (
        <div key={m.rotulo} className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {m.rotulo}
          </p>
          <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
            {m.texto}
            {/* o IC95% é a margem DAQUELE número: fica colado nele, em tipo
                menor, e não vira coluna própria */}
            {m.complemento && (
              <span className="text-pp-ink-soft text-sm font-normal">
                {' '}
                ({m.complemento})
              </span>
            )}
          </p>
        </div>
      ))}

      {classe && (
        // A classificação ganha um respiro extra só a partir de telas
        // médias. Assim escore e significado continuam no mesmo bloco,
        // mas não parecem colados; no mobile o espaço adicional desaparece
        // e o wrap segue natural. `min-w-0` + `break-words` impedem overflow.
        <div className="min-w-0 md:ml-4">
          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            classificação
          </p>
          <span className="inline-block max-w-full break-words bg-pp-block-lilac text-pp-ink px-4 py-2 rounded-pill text-sm font-medium print:border print:border-pp-ink">
            {classe}
          </span>
        </div>
      )}
    </div>
  );
}
