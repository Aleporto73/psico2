// =====================================================================
// FDT · TESTE DOS CINCO DÍGITOS · as dez medidas, em dois blocos.
//
// Recebe SOMENTE o que o servidor devolveu — `resultados` (bruto e z) e
// `derived.fdt` (faixa percentílica e classificação) — e imprime. Não
// subtrai Escolha menos Leitura, não divide por DP, não compara com P95 e
// não escolhe rótulo: a Edge fez as quatro coisas.
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
// A ORDEM é a do controlador, e a separação em tempo e erros é do próprio
// instrumento: as duas réguas são diferentes — cinco faixas nos tempos,
// três nos erros, com pontos próprios.
//
// INIBIÇÃO E FLEXIBILIDADE APARECEM AQUI COMO RESULTADO, nunca como campo.
// Elas são a diferença entre duas condições, calculada no servidor, e o
// formulário não as pede (ver ESCALAS_CALCULADAS em form-model).
// =====================================================================

import type { DerivadoFdt, ResultadoEscala } from '@/lib/corrigefacil/api';
import { blocosFdt, derivadasAusentes } from '@/lib/corrigefacil/fdt-derivado';

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

  return (
    <div className="space-y-4">
      {blocos.map((bloco) => (
        <section
          key={bloco.titulo}
          className="border border-pp-hairline bg-pp-block-lilac/15 rounded-block p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-1">
            <h3 className="text-pp-ink text-base font-medium">{bloco.titulo}</h3>
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
                <h4 className="text-pp-ink text-sm font-medium">{linha.nome}</h4>

                {linha.indisponivel ? (
                  <p className="text-pp-ink-soft text-sm">{linha.indisponivel}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-x-10 gap-y-3">
                      {linha.bruto !== null && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                            bruto
                          </p>
                          <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
                            {linha.bruto}
                          </p>
                        </div>
                      )}
                      {linha.z !== null && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                            z
                          </p>
                          <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
                            {linha.z}
                          </p>
                        </div>
                      )}
                      {linha.faixa && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                            faixa percentílica
                          </p>
                          <p className="text-pp-ink text-2xl font-medium tabular-nums leading-tight">
                            {linha.faixa}
                          </p>
                        </div>
                      )}
                    </div>

                    {linha.classificacao && (
                      <span className="inline-block max-w-full break-words bg-pp-block-lilac text-pp-ink px-4 py-2 rounded-pill text-sm font-medium print:border print:border-pp-ink">
                        {linha.classificacao}
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
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
