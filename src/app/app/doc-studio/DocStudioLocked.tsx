import Link from 'next/link';
import { FileText, ArrowRight, ExternalLink, Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

// Tela comercial do Doc Studio para quem ainda NÃO tem acesso. É um Server
// Component: não monta o DocStudioClient nem o useDocStudioState. Lê o produto
// da view sanitizada products_public (sem access_url) pelo slug. Preço e texto
// vêm do banco; só caem no fallback fixo se a consulta falhar (fail-closed já
// garantido no page.tsx). checkout_url pode ainda ser null — ver CTA abaixo.

const SLUG = 'psicoplanilhas-doc-studio';
// Fallback quando ainda não há checkout_url: manda para o card na vitrine.
const FALLBACK_CTA = '/app/produtos#psicoplanilhas-doc-studio';

const HIGHLIGHTS = [
  'Modelos universais e por profissão prontos para usar',
  'Personalize cabeçalho, finalidade, seções e assinatura',
  'Documento em branco com título editável',
  'Impressão e PDF em A4 com um clique',
];

type LockedProduct = {
  name: string;
  description: string | null;
  price: number | null;
  billing_type: string | null;
  checkout_url: string | null;
};

export async function DocStudioLocked() {
  let product: LockedProduct | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('products_public')
      .select('name, description, price, billing_type, checkout_url')
      .eq('slug', SLUG)
      .maybeSingle();
    product = (data as LockedProduct) ?? null;
  } catch {
    product = null;
  }

  const name = product?.name ?? 'PsicoPlanilhas Doc Studio';
  const description =
    product?.description ??
    'Ferramenta para criação e personalização de documentos profissionais. Pagamento único com acesso vitalício.';
  const price = product?.price ?? 47;
  const priceLabel = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  const checkoutUrl = product?.checkout_url ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header editorial */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">{name}</h1>
        <p className="text-pp-ink-soft text-base md:text-lg">{description}</p>
      </header>

      {/* Bloco comercial — preço, licença, benefícios e CTA */}
      <section className="bg-pp-block-lilac rounded-block p-8 md:p-10 space-y-6">
        <div className="flex items-center gap-2 text-pp-ink-soft">
          <FileText className="w-5 h-5" aria-hidden="true" />
          <p className="font-serif italic text-sm">Ferramenta interna PsicoPlanilhas</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-pp-ink text-3xl md:text-4xl font-medium">
            {priceLabel}
            <span className="text-pp-ink-soft text-base font-normal ml-2">pagamento único</span>
          </p>
          <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
            Acesso vitalício
          </span>
        </div>

        <p className="text-pp-ink-soft text-sm font-medium">Pague uma vez e use para sempre.</p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-pp-ink-soft text-sm leading-relaxed">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-pp-ink" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div>
          {checkoutUrl ? (
            <>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
              >
                Comprar por {priceLabel}
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
              <p className="text-xs text-pp-ink-soft mt-2">Você será levado ao checkout seguro.</p>
            </>
          ) : (
            <>
              <Link
                href={FALLBACK_CTA}
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
              >
                Ver formas de compra
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <p className="text-xs text-pp-ink-soft mt-2">O checkout estará disponível em instantes.</p>
            </>
          )}
        </div>
      </section>

      {/* Rodapé */}
      <footer className="pt-4 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          <strong className="font-medium">Aviso:</strong> O PsicoPlanilhas Doc Studio é uma ferramenta de apoio à criação de documentos. Revise cada documento antes de usá-lo formalmente.
        </p>
      </footer>

    </div>
  );
}
