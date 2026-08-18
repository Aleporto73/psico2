// PR4 · A DECISÃO DA TELA, caso a caso.
//
// O painel é client component com hooks, e este repositório não tem jsdom
// nem renderer — por isso a decisão mora num módulo puro. O que se prova
// aqui não é que uma string existe no JSX: é que, dado um estado, a tela
// escolhe o bloco certo. Os testes de fiação (quem passa a prop, qual copy
// entra) ficam em free-demo-ux.test.ts.

import { describe, expect, it } from 'vitest';
import {
  acaoAposFalhaDaDemo,
  decidirCabecalho,
  decidirOferta,
  estadoAposReconsultaSemPro,
  freeDemoStateFromRpc,
  podeGerarDemo,
  precisaRecarregarRelatorios,
  precisaReconsultarGate,
  type AccessState,
  type FreeDemoState,
  type OfertaModo,
} from '../free-demo-view';

/** O caso base: avaliação salva, gate já respondeu "sem Pró". */
function semPro(demo: FreeDemoState, composerOpen = false) {
  return decidirOferta({
    access: 'inactive',
    composerOpen,
    freeDemoContext: true,
    demo,
  });
}

const TODOS_OS_DEMO: FreeDemoState[] = [
  'idle',
  'checking',
  'indeterminado',
  'available',
  'already_used',
  'in_progress',
  'use_subscription',
  'ineligible',
  'error',
];

describe('a tradução da RPC é fail closed', () => {
  it('aceita os cinco estados do contrato', () => {
    for (const s of [
      'available',
      'already_used',
      'in_progress',
      'use_subscription',
      'ineligible',
    ]) {
      expect(freeDemoStateFromRpc(s), s).toBe(s);
    }
  });

  it('qualquer outra coisa vira error, nunca available', () => {
    // null e undefined acontecem quando a RPC falha; os demais são o dia em
    // que alguém acrescentar um estado novo no banco e esquecer da tela.
    for (const bruto of [null, undefined, '', 'AVAILABLE', 'livre', 42, {}, []]) {
      const estado = freeDemoStateFromRpc(bruto);
      expect(estado, JSON.stringify(bruto)).toBe('error');
      expect(estado).not.toBe('available');
    }
  });
});

describe('quem tem Relatório Pró ativo nunca vê a demonstração', () => {
  it('nenhum estado de demo muda o que o assinante vê', () => {
    // Mesmo que a RPC devolvesse 'available' por engano, o gate pago manda.
    for (const demo of TODOS_OS_DEMO) {
      expect(
        decidirOferta({ access: 'active', composerOpen: false, freeDemoContext: true, demo }),
        demo,
      ).toBe('padrao');
      expect(
        decidirCabecalho({ access: 'active', freeDemoContext: true, demo }),
        demo,
      ).toBe('padrao');
    }
  });

  it('o compositor do assinante continua abrindo como sempre', () => {
    expect(
      decidirOferta({ access: 'active', composerOpen: true, freeDemoContext: true, demo: 'idle' }),
    ).toBe('composer');
  });
});

describe('fora da avaliação salva, nada muda', () => {
  it('sem freeDemoContext o painel é exatamente o de antes', () => {
    // É esta a garantia de que a tela do resultado recém-corrigido e
    // qualquer outro consumidor do painel não ganharam comportamento novo.
    for (const demo of TODOS_OS_DEMO) {
      expect(
        decidirOferta({ access: 'inactive', composerOpen: false, freeDemoContext: false, demo }),
        demo,
      ).toBe('checkout');
      expect(
        decidirCabecalho({ access: 'inactive', freeDemoContext: false, demo }),
        demo,
      ).toBe('padrao');
    }
  });

  const OUTROS: AccessState[] = ['idle', 'checking', 'error'];
  it('gate que ainda não disse "sem acesso" mantém o bloco padrão', () => {
    for (const access of OUTROS) {
      expect(
        decidirOferta({ access, composerOpen: false, freeDemoContext: false, demo: 'idle' }),
        access,
      ).toBe('padrao');
    }
  });
});

describe('sem Pró, na avaliação salva', () => {
  const esperado: Array<[FreeDemoState, OfertaModo]> = [
    ['available', 'demo_disponivel'],
    ['in_progress', 'demo_andamento'],
    ['indeterminado', 'demo_indeterminado'],
    ['checking', 'demo_verificando'],
    ['error', 'demo_erro'],
    // Os dois caem na oferta paga, e é proposital: a tela não conta POR QUE
    // o profissional não pode. Dizer "instrumento não elegível" ou "perfil
    // bloqueado" transformaria a UX num oráculo de autorização.
    ['already_used', 'checkout'],
    ['ineligible', 'checkout'],
    // Contradição (o gate disse 403 e a RPC diz que há Pró): fail closed.
    ['use_subscription', 'checkout'],
    ['idle', 'checkout'],
  ];

  for (const [demo, modo] of esperado) {
    it(`${demo} → ${modo}`, () => {
      expect(semPro(demo)).toBe(modo);
    });
  }

  it('só available promete relatório grátis', () => {
    const prometem = TODOS_OS_DEMO.filter((d) => semPro(d) === 'demo_disponivel');
    expect(prometem).toEqual(['available']);
  });

  it('o compositor da demonstração é o MESMO, e só com available', () => {
    expect(semPro('available', true)).toBe('composer');
    for (const demo of TODOS_OS_DEMO.filter((d) => d !== 'available')) {
      expect(semPro(demo, true), demo).not.toBe('composer');
    }
  });
});

describe('os títulos', () => {
  it('cada estado tem o seu, e o resto fica no padrão', () => {
    const casos: Array<[FreeDemoState, string]> = [
      ['available', 'demo_disponivel'],
      ['already_used', 'demo_ja_usada'],
      ['in_progress', 'demo_andamento'],
      ['ineligible', 'padrao'],
      ['error', 'padrao'],
      ['checking', 'padrao'],
      ['indeterminado', 'padrao'],
      ['use_subscription', 'padrao'],
    ];
    for (const [demo, modo] of casos) {
      expect(decidirCabecalho({ access: 'inactive', freeDemoContext: true, demo }), demo).toBe(modo);
    }
  });
});

describe('depois de uma geração que falhou', () => {
  it('503 é indeterminado — o relatório PODE ter ficado pronto', () => {
    // Reconsultar aqui poderia devolver 'available' e a tela convidaria a
    // gerar de novo algo que talvez já esteja no histórico.
    expect(acaoAposFalhaDaDemo(503)).toBe('indeterminado');
  });

  it('todo o resto é reconsultável', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500, 502, 504]) {
      expect(acaoAposFalhaDaDemo(status), String(status)).toBe('reconsultar');
    }
  });

  it('o estado indeterminado tira a CTA de gerar da tela', () => {
    expect(semPro('indeterminado')).toBe('demo_indeterminado');
    expect(podeGerarDemo('indeterminado')).toBe(false);
  });
});

describe('a contradição do use_subscription', () => {
  it('só ele manda perguntar ao gate de novo', () => {
    // Repergunta em qualquer outro estado viraria consulta em cascata.
    for (const demo of TODOS_OS_DEMO) {
      expect(precisaReconsultarGate(demo), demo).toBe(demo === 'use_subscription');
    }
  });

  it('gate agora ATIVO: quem acabou de assinar não vê checkout', () => {
    // O caminho de sucesso é o painel gravar acesso ativo — provado na
    // fiação. Aqui fica a outra metade: as duas respostas negativas.
    expect(estadoAposReconsultaSemPro('sem_acesso')).toBe('use_subscription');
    expect(semPro('use_subscription')).toBe('checkout');
  });

  it('gate com ERRO: fail closed, sem inventar Pró nem prometer demo', () => {
    const estado = estadoAposReconsultaSemPro('erro');
    expect(estado).toBe('error');
    expect(estado).not.toBe('available');
    expect(semPro(estado)).toBe('demo_erro');
  });

  it('a segunda resposta é final — nenhum estado dela repergunta', () => {
    // É isto que fecha o laço: nem 'use_subscription' nem 'error' saem daqui
    // pedindo uma terceira consulta... e 'use_subscription' só voltaria a
    // reperguntar se o profissional clicasse de novo, o que é uma ação dele.
    expect(precisaReconsultarGate(estadoAposReconsultaSemPro('erro'))).toBe(false);
  });
});

describe('recarregar a lista depois de verificar', () => {
  it('só quando a chance já foi usada', () => {
    for (const demo of TODOS_OS_DEMO) {
      expect(precisaRecarregarRelatorios(demo), demo).toBe(demo === 'already_used');
    }
  });

  it('nem available, nem in_progress, nem indeterminado recarregam', () => {
    // Nesses três não existe relatório novo para aparecer.
    for (const demo of ['available', 'in_progress', 'indeterminado'] as FreeDemoState[]) {
      expect(precisaRecarregarRelatorios(demo), demo).toBe(false);
    }
  });
});

describe('quando a tela pode disparar a geração', () => {
  it('só com a demonstração disponível', () => {
    for (const demo of TODOS_OS_DEMO) {
      expect(podeGerarDemo(demo), demo).toBe(demo === 'available');
    }
  });

  it('em andamento não gera de novo', () => {
    // Um segundo POST duplicaria trabalho em curso — e o backend, que é quem
    // decide, devolveria in_progress de qualquer modo.
    expect(podeGerarDemo('in_progress')).toBe(false);
  });
});
