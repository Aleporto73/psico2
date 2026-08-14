import { metodoDeCorrecao } from '@/lib/corrigefacil/metricas-instrumento';

// A nota de MÉTODO do instrumento, mostrada UMA vez abaixo dos resultados.
//
// Existe para impedir uma conclusão errada específica: o SNAP-IV tem mais de
// um método de pontuação descrito na literatura — média por dimensão, soma
// bruta 0-3, contagem categórica de sintomas — e um profissional que compare
// este resultado com outra implementação sem saber qual método está em uso
// concluiria que o sistema está errado.
//
// É secundária de propósito, e não pode ser confundida com classificação:
// fica FORA dos cards, fora do gráfico e separada do aviso diagnóstico.
// Instrumento sem método declarado não renderiza nada — que é o caso dos 20.
export function MetodoDeCorrecao({
  instrumento,
}: Readonly<{ instrumento: string | undefined }>) {
  const metodo = metodoDeCorrecao(instrumento);
  if (!metodo) return null;

  return (
    <section className="space-y-2 border-t border-pp-ink/10 pt-6">
      <h2 className="text-pp-ink text-sm font-medium">{metodo.titulo}</h2>
      <p className="text-pp-ink-soft text-xs leading-relaxed whitespace-pre-line">
        {metodo.texto}
      </p>
    </section>
  );
}
