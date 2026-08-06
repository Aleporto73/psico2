import { ClipboardCheck, ExternalLink, GitCompare, ListChecks } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import {
  montarVisaoBloqueada,
  SLUG_CORRIGEFACIL,
  type ProdutoBloqueado,
} from './locked-product';

// Tela mostrada a quem ainda não tem direito ao CorrigeFácil.
//
// Lê SÓ `products_public` — a view sanitizada, sem access_url — pelo slug.
// Preço, nome e descrição vêm de lá quando existirem; se o produto ainda não
// estiver cadastrado (que é o estado de hoje em produção) ou a consulta
// falhar, cai no fallback seguro definido em locked-product.ts.
//
// É curta de propósito: o Doc Studio tem uma página comercial longa com
// catálogo de modelos; aqui basta dizer o que a ferramenta faz e como obtê-la.

const RECURSOS = [
  {
    icone: ListChecks,
    titulo: 'Correção no servidor',
    texto:
      'Você responde o protocolo e o escore, a classificação e a faixa vêm ' +
      'calculados. Nenhuma tabela normativa passa pelo navegador.',
  },
  {
    icone: ClipboardCheck,
    titulo: 'Registro que não se altera',
    texto:
      'O resultado é congelado na conclusão. Reabrir uma avaliação antiga ' +
      'mostra o que foi gravado, não um recálculo.',
  },
  {
    icone: GitCompare,
    titulo: 'Comparação entre aplicações',
    texto:
      'Duas avaliações do mesmo instrumento lado a lado, com a diferença ' +
      'entre elas.',
  },
];

export async function CorrigeFacilLocked() {
  let produto: ProdutoBloqueado | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('products_public')
      .select('name, description, price, billing_type, checkout_url')
      .eq('slug', SLUG_CORRIGEFACIL)
      .maybeSingle();
    produto = (data as ProdutoBloqueado) ?? null;
  } catch {
    // Falha de consulta NUNCA libera conteúdo: só muda o texto exibido.
    produto = null;
  }

  const visao = montarVisaoBloqueada(produto);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          {visao.nome}
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg">{visao.descricao}</p>
      </header>

      <section className="bg-pp-block-lilac rounded-block p-8 md:p-10 space-y-6">
        <div className="flex items-center gap-2 text-pp-ink-soft">
          <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          <p className="font-serif italic text-sm">Ferramenta interna PsicoPlanilhas</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-pp-ink text-3xl md:text-4xl font-medium">
            {visao.precoLabel}
            {visao.pagamentoUnico && (
              <span className="text-pp-ink-soft text-base font-normal ml-2">
                pagamento único
              </span>
            )}
          </p>
          <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
            Acesso vitalício — pague uma vez
          </span>
        </div>

        {visao.modoCta === 'checkout' && visao.checkoutUrl ? (
          <div>
            <a
              href={visao.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
            >
              Comprar por {visao.precoLabel}
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <p className="text-xs text-pp-ink-soft mt-2">
              Você será levado ao checkout seguro.
            </p>
          </div>
        ) : (
          <div>
            <span className="inline-flex items-center gap-2 bg-white/60 text-pp-ink px-6 py-3 rounded-pill text-base font-medium">
              Disponibilização em preparação
            </span>
            <p className="text-xs text-pp-ink-soft mt-2">
              Assim que a compra estiver liberada, o botão aparece aqui.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
          <div key={titulo} className="space-y-2">
            <Icone className="w-5 h-5 text-pp-ink-soft" aria-hidden="true" />
            <h2 className="text-pp-ink font-medium">{titulo}</h2>
            <p className="text-pp-ink-soft text-sm leading-relaxed">{texto}</p>
          </div>
        ))}
      </section>

      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        O CorrigeFácil calcula e organiza resultados. Ele não substitui a
        avaliação profissional: a interpretação, a decisão clínica e a
        responsabilidade pelo laudo continuam sendo de quem aplica.
      </p>
    </div>
  );
}
