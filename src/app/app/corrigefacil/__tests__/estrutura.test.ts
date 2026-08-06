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

describe('salvamento: invariantes de tela', () => {
  it('16) o botão de salvar vive dentro do bloco de resultado', () => {
    // ResultadoCorrecao só é montado no ramo `resultado ? ... : ...`,
    // então o rótulo não pode aparecer fora dele.
    const antesDoResultado = AVALIAR.split('function ResultadoCorrecao')[0];
    expect(antesDoResultado).not.toContain('Salvar avaliação');
    expect(AVALIAR).toContain('Salvar avaliação');
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
  it('39) o catálogo aponta para o histórico', () => {
    expect(CATALOGO).toContain('ROTA_HISTORICO');
    expect(CATALOGO).toContain('Avaliações salvas');
  });

  it('40) o AppShell continua sem CorrigeFácil', () => {
    expect(APPSHELL.toLowerCase()).not.toContain('corrigefacil');
    expect(APPSHELL.toLowerCase()).not.toContain('corrigefácil');
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
