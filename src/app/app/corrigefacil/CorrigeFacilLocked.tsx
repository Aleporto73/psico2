import Link from 'next/link';
import {
  ArrowRight,
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
  montarVitrine,
  SLUG_CORRIGEFACIL,
  TEXTO_SELO,
  type ProdutoBloqueado,
} from './locked-product';

// Página INTERNA de venda do CorrigeFácil — o que quem ainda não comprou vê
// em /app/corrigefacil. Estrutura irmã da de /app/flow.
//
// A ORDEM das seções é decisão comercial, não estética: a vitrine dos 21
// vem logo depois do preço, antes do vídeo. Quem chega aqui decide a compra
// por uma pergunta só — os instrumentos que eu aplico estão na lista? — e
// enterrar a resposta abaixo de um vídeo de 9 MB é perder a venda por
// ordem de parágrafo.
//
// Duas coisas que esta tela NÃO faz, e que são o motivo de ela existir
// separada do catálogo:
//
// 1. Não libera nada. Ela é o ramo `!temAcesso` do Server Component, e a
//    lista de instrumentos aqui é vitrine: texto, sem link de aplicação.
// 2. Não inventa comércio. Preço, nome, descrição e checkout do
//    CorrigeFácil vêm SÓ de `products_public`. Sem `checkout_url` real não
//    existe botão de compra — ver a regra inteira em locked-product.ts.
//
// POSICIONAMENTO: as planilhas continuam sendo produto do ecossistema. Esta
// página vende o CorrigeFácil pelo que ele entrega, nunca por comparação
// com a planilha — nenhuma frase aqui diz "no lugar de", "sem depender de"
// ou equivalente.

const BENEFICIOS = [
  {
    icone: ListChecks,
    titulo: 'Correção integrada',
    texto:
      'Registre as respostas e receba o resultado calculado pelo CorrigeFácil ' +
      'dentro do próprio sistema.',
  },
  {
    icone: ClipboardCheck,
    titulo: 'Resultado organizado',
    texto:
      'Consulte escore, classificação e informações relevantes reunidas de ' +
      'forma clara.',
  },
  {
    icone: ChartColumn,
    titulo: 'Representação gráfica',
    texto:
      'Nos instrumentos compatíveis, visualize também o resultado em formato ' +
      'gráfico.',
  },
];

/** Fora da lista acima de propósito: o histórico é o benefício que sustenta
 *  o acesso vitalício, e ganha cartão próprio, maior e em pastel. */
const BENEFICIO_HISTORICO = {
  icone: History,
  titulo: 'Histórico das aplicações',
  texto:
    'Salve suas avaliações no sistema e consulte posteriormente os resultados ' +
    'registrados.',
};

/** Rota comercial do Relatórios Pró — a MESMA que o menu, o dashboard e a
 *  página de produtos já usam. O checkout daquele produto mora lá dentro e
 *  não é reimplementado aqui: esta página só aponta para o fluxo existente. */
const ROTA_RELATORIOS_PRO = '/app/assistente-pro';

const PASSOS = [
  'Escolha o instrumento',
  'Registre as respostas',
  // "quando disponível" virou asterisco: inteiro na etapa, ele era a única
  // que quebrava em duas linhas no desktop. A ressalva não sumiu — ela desce
  // para a nota logo abaixo da grade, porque nem os 21 instrumentos têm
  // gráfico e a etapa não pode dar a entender que têm.
  'Receba resultado, classificação e gráfico*',
  'Salve a avaliação no histórico',
];

/** Montada uma vez, no módulo: não depende de request. */
const VITRINE = montarVitrine(CODIGOS_DOS_21);
/** Contados, não escritos: a linha comercial não pode divergir dos selos. */
const TOTAL = VITRINE.length;
const NOVIDADES = VITRINE.filter((item) => item.selo === 'novo').length;

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
    <div className="max-w-4xl mx-auto space-y-10">
      {/* 1 · Hero */}
      <header className="space-y-3 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">
          {visao.nome}
        </h1>
        <p className="text-pp-ink-soft text-base md:text-lg max-w-2xl">
          Corrija instrumentos diretamente no PsicoPlanilhas, obtenha resultados
          organizados e mantenha suas avaliações salvas no sistema.
        </p>
      </header>

      {/* 2 · Oferta — preço e checkout vêm do catálogo, nunca do componente.
          O id é o alvo do CTA do card do Relatórios Pró: existe UM ponto de
          compra do CorrigeFácil nesta página, e é este. */}
      <section
        id="oferta-corrigefacil"
        className="bg-pp-block-lilac rounded-block p-8 md:p-10 space-y-6 scroll-mt-6"
      >
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

        {/* `visao.descricao` NÃO é renderizada aqui.
            O texto cadastrado hoje em products_public.description ainda diz
            "no lugar das planilhas", que contradiz o posicionamento vigente —
            as planilhas continuam sendo produto do ecossistema — e repetia em
            cinza o que a linha abaixo já diz melhor. O campo continua sendo
            consultado e continua no contrato de `montarVisaoBloqueada`, com
            teste próprio: quem precisar dele em outro contexto acha pronto.
            Ele só não fala nesta caixa. */}
        <p className="text-pp-ink text-base leading-relaxed max-w-2xl">
          Tenha acesso a {TOTAL} instrumentos com correção digital integrada ao
          PsicoPlanilhas. Registre respostas, consulte resultados e mantenha suas
          avaliações organizadas e salvas no sistema.
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

      {/* 3 · Vitrine COMPLETA dos instrumentos — o argumento central.
          Todos visíveis de uma vez: sem amostra, sem carrossel, sem "ver
          mais", sem link de aplicação. Os badges são <li> de texto. */}
      <section className="space-y-5">
        <div className="space-y-2 text-center max-w-3xl mx-auto">
          <h2 className="font-serif italic text-3xl md:text-4xl text-pp-ink leading-tight">
            {TOTAL} instrumentos disponíveis no CorrigeFácil
          </h2>
          <p className="text-pp-ink text-base font-medium">
            {TOTAL} instrumentos no total — incluindo {NOVIDADES} novidades no
            PsicoPlanilhas e o BPA-2 agora com referência Brasil.
          </p>
          <p className="text-pp-ink-soft text-sm leading-relaxed">
            Com uma única compra, você libera os {TOTAL} instrumentos para correção
            digital dentro do PsicoPlanilhas, com resultados organizados e
            avaliações salvas no sistema.
          </p>
        </div>

        <ul className="flex flex-wrap justify-center gap-2.5">
          {VITRINE.map(({ codigo, rotulo, selo, tom }) => (
            <li
              key={codigo}
              className={`${tom} inline-flex items-center gap-2 rounded-pill px-4 py-2.5 text-sm font-medium text-pp-ink`}
            >
              <span className="tracking-wide">{rotulo}</span>
              {selo && (
                <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]">
                  {TEXTO_SELO[selo]}
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Legenda obrigatória: sem ela, "Novo" é lido como "instrumento
            recém-criado", que não é o que o selo diz. */}
        <div className="space-y-1 text-center">
          <p className="text-xs text-pp-ink-soft">
            <strong className="font-medium text-pp-ink">Novo</strong> = novidade no
            catálogo PsicoPlanilhas.
          </p>
          <p className="text-xs text-pp-ink-soft">
            <strong className="font-medium text-pp-ink">Brasil</strong> = o BPA-2
            agora também com referência Brasil no CorrigeFácil.
          </p>
        </div>
      </section>

      {/* 4 · Demonstração */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium text-pp-ink">
            Veja o CorrigeFácil funcionando
          </h2>
          <p className="text-sm text-pp-ink-soft mt-1">
            Uma demonstração rápida da aplicação, correção, resultado e
            representação gráfica.
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

      {/* 5 · Benefícios */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>

        <div className="bg-pp-block-mint rounded-xl p-6 flex items-start gap-4">
          <BENEFICIO_HISTORICO.icone
            className="w-6 h-6 text-pp-ink shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <strong className="text-pp-ink block text-base font-medium">
              {BENEFICIO_HISTORICO.titulo}
            </strong>
            <p className="text-sm text-pp-ink-soft leading-relaxed">
              {BENEFICIO_HISTORICO.texto}
            </p>
          </div>
        </div>
      </section>

      {/* 6 · Como funciona */}
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
        {/* Nota do asterisco do passo 3. Precisa ficar logo abaixo da grade:
            é ela que impede a etapa de sugerir gráfico nos 21. */}
        <p className="text-xs text-pp-ink-soft">
          *Gráfico nos instrumentos compatíveis.
        </p>
      </section>

      {/* 7 · Relatórios Pró — continuidade do fluxo, PRODUTO SEPARADO.
          NENHUM comércio novo nasce aqui:
          · "Quero o CorrigeFácil" é âncora para o card de oferta lá em cima.
            Não repete checkout, não repete preço e — o ponto — não tem como
            burlar o fail-closed: se o produto está `em_preparacao`, o que o
            usuário encontra ao chegar lá é o aviso, não um botão de compra.
          · "Quero Relatórios Pró" leva a /app/assistente-pro, a MESMA rota que
            o menu, o dashboard e a página de produtos já usam para esse
            produto — inclusive para quem ainda não assina. O checkout do
            Relatórios Pró mora lá e continua morando só lá.
          O preço citado é o do Relatórios Pró e continua na mesma caixa da
          frase que diz que ele é contratado à parte: separá-las transformaria
          o número em promessa de inclusão. */}
      <section className="bg-pp-block-cream rounded-block p-6 md:p-8 space-y-4">
        <div className="space-y-2">
          <h2 className="text-pp-ink text-lg font-medium">
            Potencialize o CorrigeFácil com Relatórios Pró
          </h2>
          <p className="text-pp-ink text-base leading-relaxed max-w-2xl">
            Corrija no CorrigeFácil e transforme o resultado em relatório
            profissional.
          </p>
          <p className="text-pp-ink text-base font-medium">
            Por apenas R$ 57, você libera 50 relatórios por mês durante 12 meses.
          </p>
          <p className="text-pp-ink-soft text-sm">
            Todo mês, sua franquia volta para 50.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="#oferta-corrigefacil"
            className="inline-flex items-center justify-center gap-2 bg-pp-ink text-pp-canvas px-6 py-3 rounded-pill text-sm font-medium hover:bg-pp-ink-soft transition"
          >
            Quero o CorrigeFácil
          </a>
          <Link
            href={ROTA_RELATORIOS_PRO}
            className="inline-flex items-center justify-center gap-2 border border-pp-ink/25 text-pp-ink px-6 py-3 rounded-pill text-sm font-medium hover:border-pp-ink/50 transition"
          >
            Quero Relatórios Pró
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="text-pp-ink-soft text-xs">
          Relatórios Pró é opcional e contratado à parte.
        </p>
      </section>

      {/* 8 · Aviso profissional */}
      <p className="text-xs text-pp-ink-soft leading-relaxed border-t border-pp-ink/10 pt-6">
        O CorrigeFácil calcula e organiza resultados. Ele não substitui a
        avaliação profissional: a interpretação, a decisão clínica e a
        responsabilidade pelo documento continuam sendo do profissional
        responsável.
      </p>
    </div>
  );
}
