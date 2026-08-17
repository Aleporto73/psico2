import { describe, expect, it } from 'vitest';
import {
  CODIGOS_COM_ROTULO,
  CODIGOS_COM_SELO,
  CODIGOS_SUBSTITUIDOS,
  codigosDaVitrine,
  DESCRICAO_FALLBACK,
  montarVisaoBloqueada,
  montarVitrine,
  NOME_FALLBACK,
  ordenarInstrumentos,
  SLUG_CORRIGEFACIL,
  TEXTO_SELO,
  tomDoInstrumento,
  TONS_VITRINE,
  type ProdutoBloqueado,
} from '../locked-product';
import { CODIGOS_DOS_21 } from '../graphs/graph-config';

const completo: ProdutoBloqueado = {
  name: 'CorrigeFácil',
  description: 'Correção de instrumentos dentro do sistema.',
  price: 57,
  billing_type: 'one_time',
  checkout_url: 'https://www.payment.eng.br/checkout?product=XPTO&price=ABC',
};

describe('tela bloqueada do CorrigeFácil', () => {
  it('o slug consultado é corrigefacil', () => {
    expect(SLUG_CORRIGEFACIL).toBe('corrigefacil');
  });

  it('8) produto ausente: fallback seguro e NENHUM link de compra', () => {
    const visao = montarVisaoBloqueada(null);

    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
    expect(visao.nome).toBe(NOME_FALLBACK);
    expect(visao.descricao).toBe(DESCRICAO_FALLBACK);
    expect(visao.precoLabel).toBeNull();
  });

  it('9) checkout_url null: sem link de compra, mesmo com o produto cadastrado', () => {
    const visao = montarVisaoBloqueada({ ...completo, checkout_url: null });

    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
    // o produto existe, então nome e preço vêm dele
    expect(visao.nome).toBe('CorrigeFácil');
    expect(visao.precoLabel).toContain('57');
  });

  it('9b) checkout_url em branco conta como ausente', () => {
    const visao = montarVisaoBloqueada({ ...completo, checkout_url: '   ' });
    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
  });

  it('10) checkout_url presente: CTA aponta exatamente para ela', () => {
    const visao = montarVisaoBloqueada(completo);

    expect(visao.modoCta).toBe('checkout');
    expect(visao.checkoutUrl).toBe(completo.checkout_url);
  });

  it('11) preço exibido vem somente do catálogo', () => {
    expect(montarVisaoBloqueada({ ...completo, price: 97 }).precoLabel).toContain('97');
    expect(montarVisaoBloqueada({ ...completo, price: null }).precoLabel).toBeNull();
    expect(montarVisaoBloqueada(null).precoLabel).toBeNull();
  });

  it('11b) preço zero é preço real, não ausência', () => {
    expect(montarVisaoBloqueada({ ...completo, price: 0 }).precoLabel).toContain('0,00');
  });

  it('12) falha de consulta (produto nulo) NÃO libera conteúdo nem inventa checkout', () => {
    const visao = montarVisaoBloqueada(null);

    // nada que pareça um caminho de compra
    expect(visao.checkoutUrl).toBeNull();
    expect(visao.modoCta).not.toBe('checkout');
    expect(visao.precoLabel).toBeNull();
    // e nenhum campo carrega access_url disfarçada de checkout
    expect(JSON.stringify(visao)).not.toContain('/app/');
    expect(JSON.stringify(visao)).not.toContain('http');
  });

  it('billing_type diferente de one_time não promete pagamento único', () => {
    expect(montarVisaoBloqueada({ ...completo, billing_type: 'yearly' }).pagamentoUnico).toBe(
      false,
    );
    expect(montarVisaoBloqueada(null).pagamentoUnico).toBe(true);
  });

  // O fallback aparece justamente quando o catálogo está fora do ar — a hora
  // em que menos se pode prometer tela que não existe.
  it('o fallback de descrição não promete comparação entre aplicações', () => {
    const texto = DESCRICAO_FALLBACK.toLowerCase();
    expect(texto).not.toContain('comparação');
    expect(texto).not.toContain('comparar');
    expect(texto).not.toContain('evolução');
    // e continua descrevendo o que existe
    expect(texto).toContain('correção');
    expect(texto).toContain('avaliações salvas');
  });

  // Este texto aparece justamente quando o catálogo está fora do ar. Se ele
  // depreciar a planilha, deprecia no pior momento possível — e as planilhas
  // continuam sendo produto da casa.
  it('o fallback não posiciona o CorrigeFácil contra as planilhas', () => {
    const texto = DESCRICAO_FALLBACK.toLowerCase();
    expect(texto).not.toContain('no lugar da');
    expect(texto).not.toContain('sem depender');
    expect(texto).not.toContain('substitu');
    // o posicionamento é de ecossistema, não de troca
    expect(texto).toContain('psicoplanilhas');
  });
});

describe('vitrine de instrumentos da tela de venda', () => {
  const exibidos = codigosDaVitrine(CODIGOS_DOS_21);
  /** A fonte soberana COM a troca de vitrine aplicada. É contra esta
   *  lista que a exibição é conferida — escrita aqui à mão de propósito,
   *  para o teste afirmar a expectativa em vez de repetir a implementação. */
  const esperados = CODIGOS_DOS_21.map((c) => (c === 'TDF' ? 'FDT' : c));

  it('exibe exatamente os 21, sem faltar nem sobrar', () => {
    expect(CODIGOS_DOS_21).toHaveLength(21);
    expect(exibidos).toHaveLength(21);
    // conjunto idêntico ao esperado, nos dois sentidos
    expect([...exibidos].sort()).toEqual([...esperados].sort());
    for (const codigo of esperados) {
      expect(exibidos, codigo).toContain(codigo);
    }
    expect(new Set(exibidos).size).toBe(21);
  });

  // A troca é comercial e é só da vitrine: o registro visual continua com
  // o TDF, porque lá o assunto é gráfico, não catálogo de venda.
  it('o FDT entra no lugar do TDF e o total continua 21', () => {
    expect(exibidos).toContain('FDT');
    expect(exibidos).not.toContain('TDF');
    expect(exibidos).toHaveLength(21);

    // um-para-um: os outros vinte continuam exatamente como estavam
    const outros = CODIGOS_DOS_21.filter((c) => c !== 'TDF');
    expect(outros).toHaveLength(20);
    for (const codigo of outros) {
      expect(exibidos, codigo).toContain(codigo);
    }

    // e a fonte soberana não foi reescrita por causa de uma tela de venda
    expect(CODIGOS_DOS_21).toContain('TDF');
    expect(CODIGOS_DOS_21).not.toContain('FDT');
  });

  it('a ordem exibida é alfabética, não a ordem do registro', () => {
    const alfabetica = [...esperados].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(exibidos).toEqual(alfabetica);
    for (let i = 1; i < exibidos.length; i += 1) {
      expect(exibidos[i - 1].localeCompare(exibidos[i], 'pt-BR')).toBeLessThan(0);
    }
    // o registro é ordenado por FAMÍLIA de gráfico; se a exibição fosse igual
    // a ele, esta tela estaria mostrando a ordem errada
    expect(exibidos).not.toEqual([...CODIGOS_DOS_21]);
  });

  it('não muta a fonte soberana ao ordenar nem ao trocar', () => {
    const antes = [...CODIGOS_DOS_21];
    ordenarInstrumentos(CODIGOS_DOS_21);
    codigosDaVitrine(CODIGOS_DOS_21);
    expect([...CODIGOS_DOS_21]).toEqual(antes);
  });

  it('o tom cicla pela paleta e cobre os 21 sem estourar', () => {
    expect(TONS_VITRINE).toHaveLength(6);
    for (let i = 0; i < exibidos.length; i += 1) {
      expect(TONS_VITRINE).toContain(tomDoInstrumento(i));
    }
    expect(tomDoInstrumento(0)).toBe(tomDoInstrumento(TONS_VITRINE.length));
    // determinístico: mesma posição, mesmo tom
    expect(tomDoInstrumento(7)).toBe(tomDoInstrumento(7));
  });
});

describe('apresentação comercial da vitrine', () => {
  const itens = montarVitrine(CODIGOS_DOS_21);
  const por = (codigo: string) => itens.find((i) => i.codigo === codigo)!;

  it('monta os 21 na ordem alfabética, com tom e rótulo', () => {
    expect(itens).toHaveLength(21);
    expect(itens.map((i) => i.codigo)).toEqual(codigosDaVitrine(CODIGOS_DOS_21));
    for (const item of itens) {
      expect(item.rotulo.length).toBeGreaterThan(0);
      expect(TONS_VITRINE).toContain(item.tom);
    }
  });

  // Uma linha de metadado para um código que a vitrine não desenha não
  // quebra nada em runtime: o selo simplesmente nunca aparece. É o tipo
  // de erro que só um teste pega.
  it('nenhum metadado aponta para instrumento fora da vitrine', () => {
    const naVitrine = codigosDaVitrine(CODIGOS_DOS_21);
    for (const codigo of [...CODIGOS_COM_ROTULO, ...CODIGOS_COM_SELO]) {
      expect(naVitrine, codigo).toContain(codigo);
    }
    // e a troca só acontece se quem sai existir mesmo na fonte soberana:
    // um TDF digitado errado deixaria a substituição sem efeito nenhum
    for (const codigo of CODIGOS_SUBSTITUIDOS) {
      expect(CODIGOS_DOS_21, codigo).toContain(codigo);
    }
  });

  it('marca exatamente as 10 novidades do catálogo', () => {
    const novos = itens.filter((i) => i.selo === 'novo').map((i) => i.codigo);
    expect(novos).toEqual([
      'BAYLEY-III',
      'C-TRF_1.5-5',
      'CONFIAS',
      'DASS-21',
      'EPQ-J',
      'ERA-A',
      'ERA-F',
      'ETPC',
      'FDT',
      'SCARED-C',
    ]);
    expect(novos).toHaveLength(10);
    // o FDT é a novidade que entrou no lugar do TDF, e chega selado
    expect(por('FDT').selo).toBe('novo');
    expect(TEXTO_SELO.novo).toBe('Novo');
    expect(itens.find((i) => i.codigo === 'TDF')).toBeUndefined();
  });

  it('BPA-2 é o único com selo Brasil', () => {
    const brasil = itens.filter((i) => i.selo === 'brasil').map((i) => i.codigo);
    expect(brasil).toEqual(['BPA-2']);
    // e ele NÃO é "novidade no catálogo": a planilha São Paulo já existe.
    // O que é novo é a referência Brasil, e o selo diz isso.
    expect(por('BPA-2').selo).not.toBe('novo');
    expect(TEXTO_SELO.brasil).toBe('Brasil');
  });

  it('os 10 que já existem como planilha ficam sem selo', () => {
    const semSelo = itens.filter((i) => i.selo === null).map((i) => i.codigo);
    expect(semSelo).toEqual([
      'CES-D',
      'CHECK-DIS',
      'DCDQ',
      'PHQ-9',
      'QA-ADULTO',
      'SDQ-POR',
      'SNAP-IV-18',
      'SNAP-IV-26',
      'TRACO-ANSIEDADE',
      'TRILHAS_PRE',
    ]);
    expect(semSelo).toHaveLength(10);
  });

  it('10 + 10 + 1 cobre os 21, sem sobreposição', () => {
    const novos = itens.filter((i) => i.selo === 'novo');
    const brasil = itens.filter((i) => i.selo === 'brasil');
    const sem = itens.filter((i) => i.selo === null);
    expect(novos.length + brasil.length + sem.length).toBe(21);
  });

  // O rótulo é SÓ apresentação: a chave técnica não muda em lugar nenhum.
  it('TRACO-ANSIEDADE exibe "Traço - Ansiedade" sem trocar o código', () => {
    const item = por('TRACO-ANSIEDADE');
    expect(item.codigo).toBe('TRACO-ANSIEDADE');
    expect(item.rotulo).toBe('Traço - Ansiedade');
    // e a chave continua sendo a que o registro visual conhece
    expect(CODIGOS_DOS_21).toContain('TRACO-ANSIEDADE');
    expect(CODIGOS_DOS_21).not.toContain('Traço - Ansiedade');
  });

  it('quem não tem rótulo próprio exibe o código cru', () => {
    for (const item of itens) {
      if (CODIGOS_COM_ROTULO.includes(item.codigo)) continue;
      expect(item.rotulo).toBe(item.codigo);
    }
  });
});
