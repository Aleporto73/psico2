import Link from 'next/link';
import {
  FileText,
  ArrowRight,
  ExternalLink,
  Files,
  PencilLine,
  BadgeCheck,
  Printer,
  FilePlus,
  Save,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

// Tela comercial do Doc Studio para quem ainda NÃO tem acesso. É um Server
// Component: não monta o DocStudioClient nem o useDocStudioState. Lê o produto
// da view sanitizada products_public (sem access_url) pelo slug. Preço e texto
// vêm do banco; só caem no fallback fixo se a consulta falhar (fail-closed já
// garantido no page.tsx). checkout_url pode ainda ser null — ver CTA abaixo.
// Estrutura de marketing (vídeo, benefícios, "como funciona") espelha a tela
// de venda do Flow (src/app/app/flow/page.tsx), sem copiar a lógica de acesso.

const SLUG = 'psicoplanilhas-doc-studio';
// Fallback quando ainda não há checkout_url: manda para o card na vitrine.
const FALLBACK_CTA = '/app/produtos#psicoplanilhas-doc-studio';

// PLACEHOLDER temporário: reutiliza o vídeo do Flow enquanto o vídeo real do
// Doc Studio não existe. Trocar por /videos/doc-studio-demo.mp4 quando houver.
const DEMO_VIDEO_SRC = '/videos/flow-demo.mp4';

const BENEFITS = [
  {
    icon: Files,
    title: '22 modelos prontos',
    description: 'Anamneses, devolutivas, declarações e relatórios, organizados por profissão.',
  },
  {
    icon: PencilLine,
    title: 'Campos guiados',
    description: 'Preencha os blocos e veja o documento profissional se montar ao lado, na hora.',
  },
  {
    icon: BadgeCheck,
    title: 'Cabeçalho profissional',
    description: 'Seu nome, registro e identidade em todo documento.',
  },
  {
    icon: Printer,
    title: 'Copiar ou imprimir',
    description: 'Folha pronta para colar onde quiser ou imprimir em A4/PDF.',
  },
  {
    icon: FilePlus,
    title: 'Documento em branco',
    description: 'Modelo livre para escrever qualquer conteúdo fora dos padrões.',
  },
  {
    icon: Save,
    title: 'Rascunho local',
    description: 'Salvo no seu navegador, sem nuvem, sob seu controle.',
  },
];

const STEPS = [
  'Escolha a profissão e o modelo',
  'Preencha os campos guiados',
  'Acompanhe o documento montado ao lado',
  'Copie ou imprima em A4/PDF',
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

      {/* Bloco comercial — preço, licença e CTA */}
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
            Acesso vitalício — pague uma vez
          </span>
        </div>

        <p className="text-pp-ink-soft text-base leading-relaxed max-w-2xl">
          Crie documentos profissionais direto no PsicoPlanilhas: escolha um modelo, preencha os
          campos guiados e veja a folha pronta se montar ao lado. Sem instalar nada.
        </p>

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

      {/* Demonstração — vídeo (placeholder temporário do Flow) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium text-pp-ink">Veja o Doc Studio funcionando</h2>
          <p className="text-sm text-pp-ink-soft mt-1">Uma demonstração rápida da escolha de modelo, preenchimento guiado e documento montado ao lado.</p>
        </div>
        <video
          src={DEMO_VIDEO_SRC}
          controls
          muted
          playsInline
          preload="metadata"
          className="w-full rounded-xl border border-pp-hairline shadow-sm"
        />
      </section>

      {/* Cards de benefícios */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
            <div className="text-pp-ink"><Icon className="w-[22px] h-[22px]" aria-hidden="true" /></div>
            <strong className="text-pp-ink block text-sm font-medium">{title}</strong>
            <p className="text-xs text-pp-ink-soft leading-relaxed">{description}</p>
          </div>
        ))}
      </section>

      {/* Como funciona */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-pp-ink">Como funciona</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 bg-white border border-pp-hairline rounded-xl p-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-pp-ink text-pp-canvas flex items-center justify-center text-sm font-medium">
                {i + 1}
              </span>
              <p className="text-sm text-pp-ink leading-relaxed pt-1.5">{step}</p>
            </li>
          ))}
        </ol>
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
