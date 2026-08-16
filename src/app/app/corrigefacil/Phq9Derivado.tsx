// =====================================================================
// PHQ-9 · RASTREAMENTO E ALERTA DO ITEM 9.
//
// Recebe SOMENTE o `derived` que o servidor devolveu, e imprime as strings
// que vieram. Não compara total com corte, não lê resposta de item e não
// monta frase: a Edge fez as três coisas.
//
// Por que fica FORA do card de resultado:
//
//   o card do TOTAL carrega a CLASSIFICAÇÃO — uma das cinco faixas do
//   instrumento. O rastreamento é outra leitura do mesmo número, com um
//   corte só. Dentro do card, as duas apareceriam lado a lado como se
//   fossem a mesma coisa, e a segunda seria lida como correção da
//   primeira.
//
// O ALERTA é o motivo de este bloco ser determinístico. Ele aparece porque
// o item 9 foi respondido positivamente, não porque alguém decidiu
// mencioná-lo — e não some quando o total é baixo, que é justamente quando
// o escore não o denunciaria.
//
// Ele NÃO afirma risco: o texto do servidor diz que houve resposta positiva
// e que cabe investigação adicional. Nada aqui acrescenta juízo a isso.
// =====================================================================

import { TriangleAlert } from 'lucide-react';
import type { DerivadoPhq9 } from '@/lib/corrigefacil/api';
import {
  NOTA_RASTREAMENTO,
  TITULO_ALERTA,
  TITULO_RASTREAMENTO,
} from '@/lib/corrigefacil/phq9-derivado';

export function Phq9Derivado({
  derivado,
}: Readonly<{ derivado: DerivadoPhq9 | null | undefined }>) {
  if (!derivado) return null;
  const { rastreamento, alerta_item_9: alerta } = derivado;
  if (!rastreamento && !alerta) return null;

  return (
    <section className="border border-pp-hairline bg-white/40 rounded-block p-6 sm:p-7 space-y-5">
      {rastreamento && (
        <div className="space-y-1">
          <h3 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {TITULO_RASTREAMENTO}
          </h3>
          <p className="text-pp-ink text-base font-medium leading-snug">
            {rastreamento}
          </p>
          <p className="text-pp-ink-soft text-xs leading-relaxed">
            {NOTA_RASTREAMENTO}
          </p>
        </div>
      )}

      {alerta && (
        /* `role="note"`, não `alert`: o conteúdo já está na página quando
           ela é lida, e um live region anunciaria fora de hora. O destaque
           visual é sóbrio de propósito — vermelho de emergência num
           documento clínico empurra para conclusão que o texto não faz. */
        <div
          role="note"
          className="flex gap-3 border border-pp-ink/20 bg-pp-block-lilac/30 rounded-block p-4"
        >
          <TriangleAlert
            className="w-4 h-4 mt-0.5 shrink-0 text-pp-ink"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h3 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
              {TITULO_ALERTA}
            </h3>
            <p className="text-pp-ink text-sm leading-relaxed">{alerta}</p>
          </div>
        </div>
      )}
    </section>
  );
}
