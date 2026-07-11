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
    title: 'Feito pra sua rotina',
    description: 'Documentos do dia a dia, prontos pra preencher.',
  },
  {
    icon: PencilLine,
    title: 'Campos guiados',
    description: 'Preencha e veja a folha se montar ao lado.',
  },
  {
    icon: BadgeCheck,
    title: 'Cabeçalho profissional',
    description: 'Seu nome e registro em cada documento.',
  },
  {
    icon: Printer,
    title: 'Copiar ou imprimir',
    description: 'Folha pronta pra copiar ou imprimir em A4/PDF.',
  },
  {
    icon: FilePlus,
    title: 'Documento em branco',
    description: 'Modelo livre pra escrever fora dos padrões.',
  },
  {
    icon: Save,
    title: 'Rascunho local',
    description: 'Salvo no navegador, sem nuvem, é seu.',
  },
];

const STEPS = [
  'Escolha a profissão e o modelo',
  'Preencha os campos guiados',
  'Acompanhe o documento montado ao lado',
  'Copie ou imprima em A4/PDF',
];

// Sanfonas "Feito para a sua profissão". Nomes copiados VERBATIM do catálogo real
// (src/app/app/doc-studio/templates.ts). Só as 3 profissões com catálogo próprio;
// Psicopedagogia e Neuropsicopedagogia compartilham o MESMO catálogo (psychopedagogy).
// Cada sanfona lista os modelos PRÓPRIOS e depois os COMUNS. Nada inventado.

// 7 universais (professionCategories: ALL_PROFESSIONS) — comuns a todas as profissões.
const COMMON_MODELS = [
  'Documento em branco',
  'Declaração de comparecimento',
  'Recibo / declaração de pagamento',
  'Encaminhamento profissional',
  'Contrato / termo de prestação de serviço',
  'Autorização simples',
  'TCLE simplificado',
];

// 15 modelos da linha `psychopedagogy` (Psicopedagogia + Neuropsicopedagogia).
const PSYCHOPEDAGOGY_MODELS = [
  'Devolutiva psicopedagógica para família',
  'Relatório de acompanhamento psicopedagógico',
  'Registro de sessão psicopedagógica',
  'Encaminhamento orientativo',
  'Anamnese psicopedagógica inicial',
  'Entrevista com família',
  'Entrevista com aprendente',
  'Entrevista com professor/escola',
  'Observação escolar',
  'Observação lúdica',
  'Devolutiva para escola',
  'Relatório de observação escolar',
  'Relatório individual AEE',
  'Plano de apoio escolar / PEI simplificado',
  'Autorização / contrato / declaração simples',
];

// 15 modelos ATIVOS da linha `psychology` (o 16º do catálogo é status: 'hidden').
const PSYCHOLOGY_MODELS = [
  'Síntese psicológica descritiva',
  'Relatório psicológico estruturado',
  'Registro de evolução / acompanhamento',
  'Encaminhamento orientativo',
  'Anamnese psicológica adulto',
  'Anamnese psicológica infantil/adolescente',
  'Planejamento terapêutico inicial',
  'Parecer psicológico orientativo',
  'Devolutiva clínica em linguagem acessível',
  'Orientação à família/responsáveis',
  'Contrato terapêutico',
  'Autorização para atendimento de menor',
  'Protocolo de atendimento online',
  'Declaração de comparecimento / recibo',
  'TCLE simplificado',
];

const PROFESSION_ACCORDIONS: { title: string; own: string[] }[] = [
  { title: 'Psicopedagogia', own: PSYCHOPEDAGOGY_MODELS },
  { title: 'Psicologia / Neuropsicologia', own: PSYCHOLOGY_MODELS },
  { title: 'Neuropsicopedagogia', own: PSYCHOPEDAGOGY_MODELS },
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
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
            <div className="text-pp-ink"><Icon className="w-[22px] h-[22px]" aria-hidden="true" /></div>
            <strong className="text-pp-ink block text-sm font-medium">{title}</strong>
            <p className="text-xs text-pp-ink-soft leading-relaxed">{description}</p>
          </div>
        ))}
      </section>

      {/* Feito para a sua profissão — sanfonas nativas com o catálogo real por área */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium text-pp-ink">Feito para a sua profissão</h2>
          <p className="text-sm text-pp-ink-soft mt-1">Abra a sua área e veja os modelos disponíveis — os próprios da profissão e os comuns a todas.</p>
        </div>
        <div className="space-y-3">
          {PROFESSION_ACCORDIONS.map(({ title, own }) => (
            <details
              key={title}
              name="doc-profession"
              className="group bg-white border border-pp-hairline rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-4 py-3.5 text-pp-ink font-medium text-sm hover:bg-pp-hairline-soft transition">
                <span>{title}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0 text-pp-ink-soft transition-transform duration-200 group-open:rotate-180"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="px-4 pb-4 pt-3 border-t border-pp-hairline-soft space-y-3">
                <ul className="space-y-1">
                  {own.map((model) => (
                    <li key={model} className="text-xs text-pp-ink-soft leading-relaxed">{model}</li>
                  ))}
                </ul>
                <div>
                  <p className="text-[11px] font-semibold text-pp-ink uppercase tracking-wide">
                    Comuns a todas as profissões
                  </p>
                  <ul className="space-y-1 mt-1">
                    {COMMON_MODELS.map((model) => (
                      <li key={model} className="text-xs text-pp-ink-soft leading-relaxed">{model}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
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
