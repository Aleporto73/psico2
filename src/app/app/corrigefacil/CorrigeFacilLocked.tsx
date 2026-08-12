import {
  ChartColumn,
  ClipboardCheck,
  ExternalLink,
  History,
  ListChecks,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { CODIGOS_DOS_21 } from './graphs/graph-config';
import {
  montarVisaoBloqueada,
  ordenarInstrumentos,
  SLUG_CORRIGEFACIL,
  tomDoInstrumento,
  type ProdutoBloqueado,
} from './locked-product';

// Página INTERNA de venda do CorrigeFácil — o que quem ainda não comprou vê
// em /app/corrigefacil. Segue a estrutura já validada em /app/flow: header
// editorial, bloco comercial em pastel, demonstração, benefícios, como
// funciona e aviso.
//
// Duas coisas que esta tela NÃO faz, e que são o motivo de ela existir
// separada do catálogo:
//
// 1. Não libera nada. Ela é o ramo `!temAcesso` do Server Component, e a
//    lista de instrumentos aqui é vitrine: texto, sem link de aplicação.
// 2. Não inventa comércio. Preço, nome, descrição e checkout vêm SÓ de
//    `products_public`. Sem `checkout_url` real não existe botão de compra —
//    ver a regra inteira em locked-product.ts.
//
// Aparecer no menu do AppShell não afrouxou nada disto: o menu é cosmético,
// o gate é o Server Component da rota.

const BENEFICIOS = [
  {
    icone: ListChecks,
    titulo: 'Correção automática',
    texto:
      'Registre as respostas e receba o resultado calculado pelo motor do ' +
      'CorrigeFácil. Nenhuma tabela normativa passa pelo navegador.',
  },
  {
    icone: ClipboardCheck,
    titulo: 'Resultado organizado',
    texto:
      'Escore, classificação e as informações relevantes do instrumento ' +
      'reunidos em uma tela única.',
  },
  {
    icone: ChartColumn,
    titulo: 'Representação gráfica',
    texto:
      'Os instrumentos compatíveis exibem o resultado também em formato ' +
      'gráfico, para facilitar a leitura.',
  },
  {
    icone: History,
    titulo: 'Histórico das aplicações',
    texto:
      'As avaliações salvas ficam disponíveis para consulta posterior, com ' +
      'o resultado que foi registrado.',
  },
];

const PASSOS = [
  'Escolha o instrumento',
  'Registre as respostas',
  'Receba resultado, classificação e gráfico quando disponível',
  'Salve a avaliação no histórico',
];

/** Ordenado uma vez, no módulo: a lista é estável e não depende de request. */
const INSTRUMENTOS = ordenarInstrumentos(CODIGOS_DOS_21);

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
      {/* Header editorial */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          {visao.nome}
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg">
          Corrija instrumentos e obtenha resultados, classificações e gráficos
          diretamente no PsicoPlanilhas.
        </p>
      </header>

      {/* Bloco principal — preço, licença e CTA. Tudo vem do catálogo. */}
      <section className="bg-pp-block-lilac rounded-block p-8 md:p-10 space-y-6">
        <div className="flex items-center gap-2 text-pp-ink-soft">
          <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          <p className="font-serif italic text-sm">Ferramenta interna PsicoPlanilhas</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {visao.precoLabel && (
            <p className="text-pp-ink text-3xl md:text-4xl font-medium">
              {visao.precoLabel}
              {visao.pagamentoUnico && (
                <span className="text-pp-ink-soft text-base font-normal ml-2">
                  pagamento único
                </span>
              )}
            </p>
          )}
          <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
            Acesso vitalício — pague uma vez
          </span>
        </div>

        <p className="text-pp-ink-soft text-base leading-relaxed max-w-2xl">
          {visao.descricao}
        </p>

        {visao.modoCta === 'checkout' && visao.checkoutUrl ? (
          <div>
            <a
              href={visao.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
            >
              {visao.precoLabel ? `Comprar por ${visao.precoLabel}` : 'Comprar'}
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

      {/* Demonstração */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium text-pp-ink">
            Veja o CorrigeFácil funcionando
          </h2>
          <p className="text-sm text-pp-ink-soft mt-1">
            Uma demonstração rápida da aplicação, correção automática, resultado
            e representação gráfica.
          </p>
        </div>
        <video
          src="/videos/corrigefacil-demo.mp4"
          poster="/videos/corrigefacil-poster.jpg"
          controls
          muted
          playsInline
          preload="none"
          aria-label="Demonstração do CorrigeFácil: aplicação, correção, resultado e gráfico"
          className="w-full rounded-xl border border-pp-hairline shadow-sm"
        />
      </section>

      {/* Benefícios */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
          <div
            key={titulo}
            className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2"
          >
            <div className="text-pp-ink">
              <Icone className="w-[22px] h-[22px]" aria-hidden="true" />
            </div>
            <strong className="text-pp-ink block text-sm font-medium">{titulo}</strong>
            <p className="text-xs text-pp-ink-soft leading-relaxed">{texto}</p>
          </div>
        ))}
      </section>

      {/* Instrumentos — vitrine COMPLETA, sem amostra e sem link de aplicação.
          Quem chega aqui está decidindo a compra, e a pergunta é uma só: "o
          meu instrumento está na lista?". Esconder parte dela transforma essa
          pergunta em trabalho. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium text-pp-ink">Instrumentos disponíveis</h2>
          <p className="text-sm text-pp-ink-soft mt-1">
            {INSTRUMENTOS.length} instrumentos atualmente disponíveis no
            CorrigeFácil.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {INSTRUMENTOS.map((codigo, i) => (
            <li
              key={codigo}
              className={`${tomDoInstrumento(i)} rounded-pill px-3 py-1.5 font-mono text-xs tracking-wide text-pp-ink`}
            >
              {codigo}
            </li>
          ))}
        </ul>
      </section>

      {/* Como funciona */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-pp-ink">Como funciona</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PASSOS.map((passo, i) => (
            <li
              key={passo}
              className="flex items-start gap-3 bg-white border border-pp-hairline rounded-xl p-4"
            >
              <span className="shrink-0 w-8 h-8 rounded-full bg-pp-ink text-pp-canvas flex items-center justify-center text-sm font-medium">
                {i + 1}
              </span>
              <p className="text-sm text-pp-ink leading-relaxed pt-1.5">{passo}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Relatórios Pro — separação comercial.
          Sem preço e sem checkout aqui de propósito: são duas compras, e esta
          página vende UMA. A frase de "contratado à parte" é o que impede o
          comprador de sair daqui achando que o relatório vem junto. */}
      <section className="border border-pp-hairline rounded-block p-6 space-y-2">
        <h2 className="text-pp-ink font-medium">
          Precisa transformar o resultado em um relatório?
        </h2>
        <p className="text-pp-ink-soft text-sm leading-relaxed">
          O CorrigeFácil entrega a correção, o resultado e a representação
          gráfica. Para gerar um relatório profissional completo a partir da
          avaliação, você pode usar o Relatórios Pro.
        </p>
        <p className="text-pp-ink text-sm font-medium">
          Relatórios Pro é um recurso opcional, contratado à parte.
        </p>
      </section>

      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        O CorrigeFácil calcula e organiza resultados. Ele não substitui a
        avaliação profissional: a interpretação, a decisão clínica e a
        responsabilidade pelo documento continuam sendo do profissional
        responsável.
      </p>
    </div>
  );
}
