import {
  lerTempos,
  NOTA_TEMPOS,
  TITULO_TEMPOS,
} from '@/lib/corrigefacil/tempos-execucao';

// Os tempos de execução anotados durante a aplicação, mostrados abaixo dos
// resultados.
//
// Mora FORA dos cards de resultado pelo mesmo motivo que as respostas
// auxiliares: um card carrega escore, faixa e classificação, e o tempo não
// tem nenhuma das três. Entre os cards, ele seria lido como desempenho — e
// tempo é exatamente o dado que mais convida a essa leitura ("55 segundos,
// isso é lento?"). A nota vai junto, sempre, e é ela que responde.
//
// Não classifica, não colore, não compara com nada e não entra no gráfico.
// Tempo não informado não vira linha: quem não anotou não recebe um zero
// inventado. Avaliação salva antes deste campo existir simplesmente não traz
// as chaves e não renderiza seção nenhuma.
export function TemposDeExecucao({
  instrumento,
  meta,
}: Readonly<{
  instrumento: string | undefined;
  meta: Record<string, unknown> | null | undefined;
}>) {
  const tempos = lerTempos(instrumento, meta);
  if (tempos.length === 0) return null;

  return (
    <section className="space-y-2 border-t border-pp-ink/10 pt-6">
      <h2 className="text-pp-ink text-sm font-medium">{TITULO_TEMPOS}</h2>
      <div className="space-y-1">
        {tempos.map((t) => (
          <p key={t.rotulo} className="text-pp-ink text-sm">
            {t.rotulo}: <span className="font-medium">{t.segundos} segundos</span>
          </p>
        ))}
      </div>
      <p className="text-pp-ink-soft text-xs leading-relaxed">{NOTA_TEMPOS}</p>
    </section>
  );
}
