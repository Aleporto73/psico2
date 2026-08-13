// =====================================================================
// RESPOSTAS AUXILIARES · o que foi respondido e NÃO foi pontuado.
//
// Item auxiliar é item sem vínculo com escala nenhuma: o servidor o grava
// junto das outras respostas e o devolve em `auxiliary_responses`. Hoje o
// único é o impacto funcional do PHQ-9.
//
// Por que ele mora FORA dos cards de resultado, e não dentro:
//
//   um card de resultado carrega escore, faixa e classificação, e é lido
//   como leitura do instrumento. O auxiliar não tem nenhuma das três — ele
//   é uma RESPOSTA. Pô-lo entre os cards convidaria a lê-lo como parte do
//   escore, que é exatamente o erro da planilha de origem (ela somava o
//   impacto no total e empurrava o protocolo para a faixa seguinte).
//
// Este componente não calcula, não classifica e não formata número: mostra
// o rótulo que o servidor devolveu. Onde não houver rótulo, mostra o valor
// cru — e onde não houver nem valor, não mostra linha nenhuma.
// =====================================================================

import type { RespostaAuxiliar } from '@/lib/corrigefacil/api';

/** O texto que aparece ao lado da pergunta. `label` é o rótulo da
 *  alternativa escolhida, como o servidor o devolveu. Sem rótulo, o valor
 *  cru — nunca um texto inventado no cliente. */
function textoDaResposta(r: RespostaAuxiliar): string | null {
  if (r.label) return r.label;
  if (r.value !== null) return String(r.value);
  return null;
}

export function RespostasAuxiliares({
  respostas,
  titulo = 'Impacto no dia a dia',
}: Readonly<{
  respostas: RespostaAuxiliar[] | undefined;
  /** Título da seção. O padrão serve ao único auxiliar que existe hoje; um
   *  instrumento futuro com outra pergunta passa o dele. */
  titulo?: string;
}>) {
  const visiveis = (respostas ?? []).filter((r) => textoDaResposta(r) !== null);
  if (visiveis.length === 0) return null;

  return (
    <section className="border border-pp-hairline bg-white/40 rounded-block p-6 sm:p-7 space-y-4">
      <header className="space-y-1">
        <h3 className="text-pp-ink text-sm font-medium">{titulo}</h3>
        <p className="text-pp-ink-soft text-xs">
          Respondido junto do protocolo. Não entra na pontuação nem na
          classificação.
        </p>
      </header>

      <dl className="space-y-3">
        {visiveis.map((r) => (
          <div key={r.number} className="space-y-1">
            <dt className="text-pp-ink-soft text-xs">{r.text}</dt>
            <dd className="text-pp-ink text-sm">{textoDaResposta(r)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
