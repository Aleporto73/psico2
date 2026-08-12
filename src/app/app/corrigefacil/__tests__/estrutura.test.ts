import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Provas ESTRUTURAIS. O Vitest deste repositório roda em `node`, sem DOM, e
// há invariantes que não vivem em função pura nenhuma — "o botão só existe
// depois do resultado", "não há salvamento automático", "o menu não mudou".
// Ler o próprio arquivo é o jeito honesto de travá-las: se alguém violar a
// regra, o teste cai, e a mensagem diz exatamente qual regra era.

const RAIZ = join(process.cwd(), 'src');

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');

/** Sem comentários. As provas abaixo são sobre o que o arquivo FAZ; explicar
 *  por que uma consulta NÃO acontece é justamente o tipo de comentário que
 *  vale manter, e ele não pode derrubar o teste. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const AVALIAR = semComentarios(ler('app/app/corrigefacil/avaliar/[code]/AvaliarClient.tsx'));
const CATALOGO = semComentarios(ler('app/app/corrigefacil/CorrigeFacilCatalogClient.tsx'));
const HISTORICO_PAGE = semComentarios(ler('app/app/corrigefacil/avaliacoes/page.tsx'));
const DETALHE_PAGE = semComentarios(ler('app/app/corrigefacil/avaliacoes/[id]/page.tsx'));
const DETALHE_CLIENT = semComentarios(ler('app/app/corrigefacil/avaliacoes/[id]/DetalheClient.tsx'));
const APPSHELL = semComentarios(ler('app/app/AppShell.tsx'));
const NAV = semComentarios(ler('app/app/corrigefacil/CorrigeFacilNav.tsx'));
const NAV_MODEL = semComentarios(ler('app/app/corrigefacil/nav-model.ts'));
const HISTORICO_CLIENT = semComentarios(
  ler('app/app/corrigefacil/avaliacoes/HistoricoClient.tsx'),
);
const LOCKED = semComentarios(ler('app/app/corrigefacil/CorrigeFacilLocked.tsx'));
const LAYOUT = semComentarios(ler('app/app/layout.tsx'));

describe('salvamento: invariantes de tela', () => {
  it('16) o botão de salvar vive dentro do bloco de resultado', () => {
    // ResultadoCorrecao só é montado no ramo `resultado ? ... : ...`,
    // então o rótulo não pode aparecer fora dele.
    const antesDoResultado = AVALIAR.split('function ResultadoCorrecao')[0];
    expect(antesDoResultado).not.toContain('Salvar sem relatório');
    expect(AVALIAR).toContain('Salvar sem relatório');
  });

  it('24) não há salvamento automático: salvarAvaliacao nunca é chamada em efeito', () => {
    const efeitos = AVALIAR.match(/useEffect\([\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
    expect(efeitos.length).toBeGreaterThan(0);
    for (const efeito of efeitos) {
      expect(efeito).not.toContain('salvarAvaliacao');
      expect(efeito).not.toContain('salvar(');
    }
  });

  it('22) falha ao salvar não apaga o resultado', () => {
    const catchDoSalvar = AVALIAR.split('async function salvar()')[1]?.split('\n  }')[0] ?? '';
    expect(catchDoSalvar).toContain('catch');
    // o catch mexe só no estado de salvamento
    expect(catchDoSalvar).not.toContain('setResultado(null)');
  });

  it('23) só o 201 da Edge marca como salvo', () => {
    const corpoSalvar = AVALIAR.split('async function salvar()')[1]?.split('\n  }')[0] ?? '';
    // a fase 'salvo' aparece depois do await de salvarAvaliacao
    const posAwait = corpoSalvar.split('await salvarAvaliacao')[1] ?? '';
    expect(posAwait).toContain("fase: 'salvo'");
    expect(corpoSalvar.split('await salvarAvaliacao')[0]).not.toContain("fase: 'salvo'");
  });

  it('25) nenhuma persistência local paralela', () => {
    for (const fonte of [AVALIAR, DETALHE_CLIENT, CATALOGO]) {
      expect(fonte).not.toContain('localStorage');
      expect(fonte).not.toContain('sessionStorage');
      expect(fonte).not.toContain('indexedDB');
    }
  });
});

describe('histórico e detalhe: acesso', () => {
  it('26 e 34) nem o histórico nem o detalhe consultam o gate comercial', () => {
    for (const fonte of [HISTORICO_PAGE, DETALHE_PAGE, DETALHE_CLIENT]) {
      expect(fonte).not.toContain('temAcessoCorrigeFacil');
      expect(fonte).not.toContain('has_corrigefacil_access');
      expect(fonte).not.toContain('CorrigeFacilLocked');
    }
  });

  it('27 e 33) a autenticação é a do middleware: nenhuma checagem duplicada', () => {
    for (const fonte of [HISTORICO_PAGE, DETALHE_PAGE]) {
      expect(fonte).not.toContain('auth.getUser');
      expect(fonte).not.toContain('redirect(');
    }
  });

  it('38) o detalhe não oferece editar, excluir, recalcular nem comparar', () => {
    for (const proibido of ['Editar', 'Excluir', 'Recalcular', 'Comparar', 'Salvar']) {
      expect(DETALHE_CLIENT).not.toContain(proibido);
    }
    // e não existe rota de escrita chamada de lá
    expect(DETALHE_CLIENT).not.toContain('salvarAvaliacao');
    expect(DETALHE_CLIENT).not.toContain('corrigirInstrumento');
  });

  it('a comparação não foi implementada nesta etapa', () => {
    for (const fonte of [AVALIAR, CATALOGO, DETALHE_CLIENT, HISTORICO_PAGE]) {
      expect(fonte.toLowerCase()).not.toContain('/comparar');
    }
  });
});

describe('navegação', () => {
  // 39) evoluiu: o link solto do catálogo virou uma barra de seções montada
  // em TODAS as telas do módulo. A prova deixa de ser "o catálogo tem um
  // link" e passa a ser "as quatro telas montam a mesma barra" — que é o
  // que resolve a descoberta das avaliações salvas.
  it('39) a barra de seções é o lugar único das duas rotas', () => {
    // as rotas e os rótulos moram no modelo puro; o componente só desenha
    expect(NAV_MODEL).toContain('ROTA_HISTORICO');
    expect(NAV_MODEL).toContain('Avaliações salvas');
    expect(NAV_MODEL).toContain('Instrumentos');
    expect(NAV).toContain('montarAbas');
    // estado anunciado, não só colorido
    expect(NAV).toContain('aria-current');
  });

  it('39b) catálogo, aplicação, histórico e detalhe montam a mesma barra', () => {
    for (const tela of [CATALOGO, AVALIAR, HISTORICO_CLIENT, DETALHE_CLIENT]) {
      expect(tela).toContain('<CorrigeFacilNav />');
    }
  });

  it('39c) nenhuma tela duplica os links à mão', () => {
    // Se alguém recriar o par de links fora do componente, a barra deixa de
    // ser a fonte única e as telas divergem em silêncio.
    for (const tela of [CATALOGO, AVALIAR, HISTORICO_CLIENT]) {
      expect(tela).not.toContain('ROTA_HISTORICO');
    }
  });

  // 40) O produto está em FASE DE TESTES e o menu volta a ser condicionado ao
  // direito: quem não tem `has_corrigefacil_access` não vê o item. A página
  // interna de venda existe e é boa, mas ela é para teste e para a venda
  // futura — não para descoberta pública ainda. Esta guarda é o que impede
  // que uma limpeza de código "solte" o item sem decisão comercial.
  it('40) o CorrigeFácil no menu depende do direito durante a fase de testes', () => {
    expect(APPSHELL).toContain('hasCorrigeFacilAccess');
    // o item vive dentro do spread condicional, não solto na lista
    const semCondicional = APPSHELL.replace(
      /\.\.\.\(hasCorrigeFacilAccess[\s\S]*?: \[\]\),/g,
      '',
    );
    expect(semCondicional).not.toContain("path: '/app/corrigefacil'");
  });

  it('40a) quando aparece, fica em Ferramentas upgrade depois de Pró e Flow', () => {
    const grupo = APPSHELL.slice(
      APPSHELL.indexOf("label: 'Ferramentas upgrade'"),
      APPSHELL.indexOf('{ separatorBefore: true, items: ['),
    );
    const pro = grupo.indexOf("path: '/app/assistente-pro'");
    const flow = grupo.indexOf("path: '/app/flow'");
    const corrige = grupo.indexOf("path: '/app/corrigefacil'");
    expect(pro).toBeGreaterThan(-1);
    expect(flow).toBeGreaterThan(pro);
    expect(corrige).toBeGreaterThan(flow);
  });

  it('40b) o direito vem do helper único, não de regra reescrita no layout', () => {
    expect(LAYOUT).toContain('temAcessoCorrigeFacil');
    // nada de consultar compra ou entitlement à mão
    expect(LAYOUT).not.toContain("from('purchases')");
    expect(LAYOUT).not.toContain('has_corrigefacil_access =');
    // e o Doc Studio continua sendo resolvido do lado dele
    expect(LAYOUT).toContain('has_doc_studio_access');
  });

  it('40c) o layout é fail-closed: erro não revela o item', () => {
    const captura = LAYOUT.split('catch (err)')[1] ?? '';
    expect(captura).toContain('hasCorrigeFacilAccess = false');
    expect(captura).toContain('hasDocStudioAccess = false');
    expect(captura).toContain('unstable_rethrow');
  });

  it('40d) o gate real de /app/corrigefacil não foi afrouxado', () => {
    // Menu é cosmético; a ROTA é o gate. As duas telas que exigem direito
    // comercial continuam consultando o helper único e caindo na página de
    // venda quando ele diz não.
    const PAGE = semComentarios(ler('app/app/corrigefacil/page.tsx'));
    const AVALIAR_PAGE = semComentarios(
      ler('app/app/corrigefacil/avaliar/[code]/page.tsx'),
    );
    for (const fonte of [PAGE, AVALIAR_PAGE]) {
      expect(fonte).toContain('temAcessoCorrigeFacil');
    }
    expect(PAGE).toContain('if (!temAcesso)');
    expect(PAGE).toContain('<CorrigeFacilLocked />');
    // o catálogo funcional segue atrás do gate
    expect(PAGE).toContain('<CorrigeFacilCatalogClient />');
  });
});

describe('a tela de venda não promete o que não existe', () => {
  it('a comparação entre aplicações saiu da lista de recursos', () => {
    expect(LOCKED).not.toContain('Comparação entre aplicações');
    expect(LOCKED).not.toContain('GitCompare');
  });

  it('os recursos anunciados existem no módulo', () => {
    // histórico é rota real; correção no servidor e resultado congelado são
    // comportamento da Edge já implantada.
    expect(LOCKED).toContain('Histórico das aplicações');
  });

  it('nenhuma promessa de comparação, evolução ou laudo incluído', () => {
    const texto = LOCKED.toLowerCase();
    for (const proibido of [
      'comparação entre aplicações',
      'compare aplicações',
      'evolução automática',
      'evolução do paciente',
      'laudo incluído',
      'laudo automático',
      'diagnóstico',
    ]) {
      expect(texto, proibido).not.toContain(proibido);
    }
  });
});

// ── Página INTERNA de venda (/app/corrigefacil sem direito) ────────────
describe('página interna de venda do CorrigeFácil', () => {
  const LOCKED_PRODUCT = semComentarios(
    ler('app/app/corrigefacil/locked-product.ts'),
  );

  /** Recorte da seção da vitrine: do título até o vídeo. */
  const vitrine = () =>
    LOCKED.slice(
      LOCKED.indexOf('instrumentos disponíveis no CorrigeFácil'),
      LOCKED.indexOf('Veja o CorrigeFácil funcionando'),
    );

  /** Recorte do bloco do Relatórios Pró. */
  const relatoriosPro = () =>
    LOCKED.slice(
      LOCKED.indexOf('Quer transformar o resultado em um relatório profissional?'),
      LOCKED.indexOf('O CorrigeFácil calcula e organiza resultados'),
    );

  it('lê products_public com as cinco colunas de sempre', () => {
    expect(LOCKED).toContain("from('products_public')");
    expect(LOCKED).toContain(
      "select('name, description, price, billing_type, checkout_url')",
    );
    expect(LOCKED).toContain("eq('slug', SLUG_CORRIGEFACIL)");
    // e nada além da view sanitizada
    expect(LOCKED).not.toContain('access_url');
    expect(LOCKED).not.toContain("from('products')");
    expect(LOCKED).not.toContain('SERVICE_ROLE');
  });

  it('nenhum preço de CorrigeFácil escrito no componente', () => {
    // ESCOPADO ao card de oferta de propósito. O bloco do Relatórios Pró
    // cita o preço DELE, que é outro produto e é copy fixa aprovada; varrer
    // o arquivo inteiro proibiria o certo junto com o errado.
    const oferta = LOCKED.slice(
      LOCKED.indexOf("from('products_public')"),
      LOCKED.indexOf('instrumentos disponíveis no CorrigeFácil'),
    );
    expect(oferta).toContain('visao.precoLabel');
    expect(oferta).not.toMatch(/R\$\s*\d/);
    expect(oferta).not.toContain('57');
    expect(LOCKED_PRODUCT).not.toMatch(/price:\s*\d/);
    // description continua sendo EXIBIDA, não só selecionada
    expect(LOCKED).toContain('{visao.descricao}');
  });

  it('nenhum checkout escrito no componente', () => {
    expect(LOCKED).toContain('visao.checkoutUrl');
    expect(LOCKED).not.toContain('payment.eng.br');
    expect(LOCKED).not.toContain('product=');
    expect(LOCKED).not.toContain('price=');
  });

  it('sem checkout_url não existe link de compra, e o botão vira aviso', () => {
    // o <a> de compra vive DENTRO do ramo que exige checkoutUrl
    expect(LOCKED).toContain("visao.modoCta === 'checkout' && visao.checkoutUrl ?");
    expect(LOCKED).toContain('Disponibilização em preparação');
    // e o href do CTA é a URL do catálogo, não uma constante
    expect(LOCKED).toContain('href={visao.checkoutUrl}');
    const links = LOCKED.match(/href=\{?["']?https?:/g) ?? [];
    expect(links).toHaveLength(0);
  });

  it('referencia o vídeo e o poster da demonstração', () => {
    expect(LOCKED).toContain('/videos/corrigefacil-demo.mp4');
    expect(LOCKED).toContain('/videos/corrigefacil-poster.jpg');
    // mesmo padrão do Flow: sem autoplay, sem download antecipado
    expect(LOCKED).toContain('preload="none"');
    expect(LOCKED).toContain('playsInline');
    expect(LOCKED).toContain('muted');
    expect(LOCKED).not.toContain('autoPlay');
  });

  // A ORDEM é decisão comercial: a vitrine dos 21 responde a pergunta que
  // fecha a compra, e não pode voltar para depois do vídeo.
  it('a vitrine vem depois do preço e ANTES do vídeo', () => {
    const oferta = LOCKED.indexOf("from('products_public')");
    const iVitrine = LOCKED.indexOf('instrumentos disponíveis no CorrigeFácil');
    const iVideo = LOCKED.indexOf('Veja o CorrigeFácil funcionando');
    // âncoras de JSX, não das constantes declaradas no topo do arquivo
    const iBeneficios = LOCKED.indexOf('BENEFICIOS.map(');
    const iComoFunciona = LOCKED.indexOf('PASSOS.map(');
    const iPro = LOCKED.indexOf('Quer transformar o resultado em um relatório');
    const iAviso = LOCKED.indexOf('O CorrigeFácil calcula e organiza resultados');

    expect(oferta).toBeGreaterThan(-1);
    expect(iVitrine).toBeGreaterThan(oferta);
    expect(iVideo).toBeGreaterThan(iVitrine);
    expect(iBeneficios).toBeGreaterThan(iVideo);
    expect(iComoFunciona).toBeGreaterThan(iBeneficios);
    expect(iPro).toBeGreaterThan(iComoFunciona);
    expect(iAviso).toBeGreaterThan(iPro);
  });

  it('o Relatórios Pró é declarado opcional e à parte, sem checkout próprio', () => {
    const bloco = relatoriosPro();
    expect(bloco).toContain(
      'Relatórios Pró é um recurso opcional, contratado à parte.',
    );
    // a oferta do outro produto é descrita, nunca vendida daqui
    expect(bloco).not.toContain('href=');
    expect(bloco).not.toContain('precoLabel');
    expect(bloco).not.toContain('checkout');
    // e em nenhuma hipótese ele é anunciado como incluso
    expect(bloco).not.toContain('incluído no');
    expect(bloco).not.toContain('já vem');
    expect(bloco).not.toContain('sem custo');
  });

  it('a oferta do Relatórios Pró está completa e na mesma caixa do aviso', () => {
    const bloco = relatoriosPro();
    expect(bloco).toContain(
      '50 relatórios por mês durante 12 meses por R$ 57 em pagamento único.',
    );
    // sem a renovação dita, "50 por mês" fica ambíguo
    expect(bloco).toContain('liberados novamente 50 relatórios');
    expect(bloco).toContain('12');
    // o preço é do OUTRO produto: separá-lo da frase "à parte" transformaria
    // o número em promessa de inclusão
    const iPreco = bloco.indexOf('50 relatórios por mês');
    const iAParte = bloco.indexOf('contratado à parte');
    expect(iPreco).toBeGreaterThan(-1);
    expect(iAParte).toBeGreaterThan(iPreco);
  });

  it('mantém o aviso de responsabilidade profissional', () => {
    expect(LOCKED).toContain('não substitui a');
    expect(LOCKED).toContain('avaliação profissional');
    expect(LOCKED).toContain('responsabilidade pelo documento');
  });

  it('a vitrine não vira caminho de aplicação', () => {
    // badges são <li> de texto: sem Link, sem href, sem rota de aplicação
    expect(vitrine()).not.toContain('<Link');
    expect(vitrine()).not.toContain('href');
    expect(vitrine()).not.toContain('/avaliar/');
    expect(vitrine()).not.toContain('Aplicar');
    // e a tela inteira não importa Link nem monta rota do módulo
    expect(LOCKED).not.toContain("from 'next/link'");
    expect(LOCKED).not.toContain('/app/corrigefacil/avaliar');
  });

  it('a lista de instrumentos vem da fonte soberana, não de cópia local', () => {
    expect(LOCKED).toContain("import { CODIGOS_DOS_21 } from './graphs/graph-config'");
    expect(LOCKED).toContain('montarVitrine(CODIGOS_DOS_21)');
    // nenhum código de instrumento escrito à mão no componente
    for (const codigo of ['BAYLEY-III', 'PHQ-9', 'DASS-21', 'TRILHAS_PRE']) {
      expect(LOCKED, codigo).not.toContain(`'${codigo}'`);
    }
    expect(LOCKED).not.toContain('.slice(0,');
    expect(LOCKED).not.toContain('entre outros');
  });

  // Os números da linha comercial são CONTADOS da vitrine. Escritos à mão,
  // o texto continuaria dizendo 21 no dia em que a fonte tivesse 22.
  it('total e novidades são derivados, não digitados', () => {
    expect(LOCKED).toContain('const TOTAL = VITRINE.length');
    expect(LOCKED).toContain("VITRINE.filter((item) => item.selo === 'novo').length");
    expect(vitrine()).toContain('{TOTAL} instrumentos');
    expect(vitrine()).toContain('{NOVIDADES} novidades');
    // e nenhum número de catálogo escrito na copy
    expect(vitrine()).not.toMatch(/\b21 instrumentos/);
    expect(vitrine()).not.toMatch(/\b10 novidades/);
  });

  it('os selos têm legenda, e ela diz que a novidade é do catálogo', () => {
    expect(vitrine()).toContain('= novidade no');
    expect(vitrine()).toContain('catálogo PsicoPlanilhas');
    expect(vitrine()).toContain('referência Brasil no CorrigeFácil');
    // "novo" jamais pode ser afirmado sobre o INSTRUMENTO em si
    const texto = vitrine().toLowerCase();
    expect(texto).not.toContain('instrumento novo');
    expect(texto).not.toContain('recém-criado');
    expect(texto).not.toContain('lançamento');
  });

  it('o rótulo de exibição não vaza para o código técnico', () => {
    // o componente exibe `rotulo`; quem decide o texto é o modelo
    expect(LOCKED).toContain('{rotulo}');
    expect(LOCKED_PRODUCT).toContain("'TRACO-ANSIEDADE': 'Traço - Ansiedade'");
    // e a chave técnica continua sendo a do registro, em todo lugar
    expect(ler('app/app/corrigefacil/graphs/graph-config.ts')).toContain(
      "'TRACO-ANSIEDADE'",
    );
  });

  // As planilhas continuam sendo produto do ecossistema. Vender o
  // CorrigeFácil depreciando a planilha canibaliza a própria casa.
  it('não posiciona o CorrigeFácil contra as planilhas', () => {
    for (const texto of [LOCKED.toLowerCase(), LOCKED_PRODUCT.toLowerCase()]) {
      for (const proibido of [
        'sem depender de planilha',
        'no lugar das planilha',
        'no lugar da planilha',
        'substitua suas planilha',
        'substitui as planilha',
        'abandone as planilha',
        'planilhas soltas',
        'mais fácil que planilha',
        'melhor que planilha',
        'chega de planilha',
      ]) {
        expect(texto, proibido).not.toContain(proibido);
      }
    }
  });

  it('os tons dos badges saem da paleta existente, sem hexadecimal novo', () => {
    expect(LOCKED).toContain('${tom}');
    expect(LOCKED_PRODUCT).toContain('tomDoInstrumento');
    expect(LOCKED_PRODUCT).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const tom of [
      'bg-pp-block-lilac',
      'bg-pp-block-mint',
      'bg-pp-block-cream',
      'bg-pp-block-coral',
      'bg-pp-block-pink',
      'bg-pp-block-lime',
    ]) {
      expect(LOCKED_PRODUCT, tom).toContain(tom);
    }
  });
});

describe('travas do produto', () => {
  it('nenhum service_role e nenhum acesso a purchases no cliente', () => {
    for (const fonte of [AVALIAR, CATALOGO, DETALHE_CLIENT]) {
      expect(fonte).not.toContain('SERVICE_ROLE');
      expect(fonte).not.toContain("from('purchases')");
    }
  });
});
