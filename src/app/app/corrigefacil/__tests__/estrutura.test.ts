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

  // 40) REVISTO. A regra antiga era "o AppShell não conhece o CorrigeFácil",
  // escrita quando o módulo ainda não estava operacional. Hoje ele está: 21
  // instrumentos publicados e avaliações sendo salvas em produção. O item
  // entrou no menu — mas CONDICIONADO ao direito, porque o produto comercial
  // continua sem checkout e um item que leva a "compra indisponível" é pior
  // que item nenhum. O que o teste trava agora é a condição.
  it('40) o CorrigeFácil no menu depende do direito, nunca é incondicional', () => {
    expect(APPSHELL).toContain('hasCorrigeFacilAccess');
    // o item vive dentro do spread condicional, não solto na lista
    const semCondicional = APPSHELL.replace(
      /\.\.\.\(hasCorrigeFacilAccess[\s\S]*?: \[\]\),/g,
      '',
    );
    expect(semCondicional).not.toContain("path: '/app/corrigefacil'");
  });

  it('40b) o direito vem do helper único, não de regra reescrita no layout', () => {
    expect(LAYOUT).toContain('temAcessoCorrigeFacil');
    // nada de consultar compra ou entitlement à mão
    expect(LAYOUT).not.toContain("from('purchases')");
    expect(LAYOUT).not.toContain('has_corrigefacil_access');
  });

  it('40c) o layout é fail-closed: erro não revela o item', () => {
    const captura = LAYOUT.split('catch (err)')[1] ?? '';
    expect(captura).toContain('hasCorrigeFacilAccess = false');
    expect(captura).toContain('unstable_rethrow');
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
});

describe('travas do produto', () => {
  it('nenhum service_role e nenhum acesso a purchases no cliente', () => {
    for (const fonte of [AVALIAR, CATALOGO, DETALHE_CLIENT]) {
      expect(fonte).not.toContain('SERVICE_ROLE');
      expect(fonte).not.toContain("from('purchases')");
    }
  });
});
