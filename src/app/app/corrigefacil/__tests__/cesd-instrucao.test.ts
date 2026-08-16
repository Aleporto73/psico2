// =====================================================================
// CES-D · o enunciado dos 20 itens, e só isso.
//
// O CES-D pergunta sobre a ÚLTIMA SEMANA, e é esse período que dá sentido
// às quatro alternativas — de "menos de 1 dia" a "5 a 7 dias". A fonte
// escreve isso uma vez, antes dos 20 itens; sem o enunciado, quem preenche
// lê 20 afirmações sem janela de tempo.
//
// A entrada é no mecanismo que JÁ EXISTE: `INSTRUCAO_DOS_ITENS`, o mapa
// fechado por código de instrumento que o PHQ-9 estreou. Nenhuma coluna,
// nenhuma migration, nenhuma mudança de contrato da Edge — o catálogo não
// transporta `instrument.instruction`, e levá-lo até a tela custaria isso
// tudo por um texto fixo que não entra em cálculo.
//
// O que este arquivo trava, além do texto:
//
//   · o PHQ-9 continua com o enunciado DELE, palavra por palavra;
//   · instrumento fora do mapa continua com `null`;
//   · o enunciado é do BLOCO: `montarModelo` devolve os itens como o
//     catálogo os mandou, e o texto novo não entra em item nenhum;
//   · o enunciado aparece UMA vez, fora da lista numerada;
//   · nada de gráfico foi tocado.
//
// O QUE ELE NÃO PROVA, e é bom dizer em voz alta: os enunciados REAIS dos
// 20 itens. Eles não moram neste repositório — vêm do catálogo, e quem os
// trava é o CorrigeFacil, contra o JSON do instrumento. Os textos usados
// aqui são marcadores; o que se prova com eles é que a tela não mexe no
// que recebe. Copiar os 20 enunciados para cá criaria uma segunda fonte
// da verdade sobre o conteúdo do instrumento, que é justamente o que a
// arquitetura evita.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import { INSTRUCAO_DOS_ITENS, montarModelo } from '../avaliar/[code]/form-model';

const INSTRUCAO_CESD =
  'Para responder, considere como a pessoa se sentiu ou se comportou ' +
  'durante a última semana.';

const INSTRUCAO_PHQ9 =
  'Durante os últimos 14 dias, com que frequência você foi afetado(a) ' +
  'por algum dos seguintes problemas?';

/** As quatro alternativas do CES-D, na forma curta — que é a que o
 *  profissional escolhe. A forma com dias fica na fonte. */
const ALTERNATIVAS = [
  { label: 'Raramente', value: 0 },
  { label: 'Durante pouco tempo', value: 1 },
  { label: 'Durante um tempo moderado', value: 2 },
  { label: 'Durante a maior parte do tempo', value: 3 },
];

/** Vinte itens com texto MARCADOR. O enunciado real de cada um é do
 *  catálogo e é travado lá; aqui eles precisam apenas ser 20 e distintos,
 *  porque o que se prova é o trajeto — o que entra em `montarModelo` sai
 *  igual do outro lado. */
const ITENS = Array.from({ length: 20 }, (_, i) => ({
  numero: i + 1,
  texto: `Item marcador ${i + 1}`,
}));

function detalheCesd(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  return {
    code: 'CES-D',
    name: 'CES-D — Escala de Rastreamento Populacional para Depressão',
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [],
    itens: ITENS,
    opcoes_resposta: ALTERNATIVAS,
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

const CESD = montarModelo(detalheCesd());

const fonte = (...caminho: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...caminho), 'utf8');

// =====================================================================
// A · o enunciado
// =====================================================================

describe('A · a CES-D ganhou o enunciado da última semana', () => {
  it('o texto é EXATAMENTE este', () => {
    expect(CESD.instrucaoItens).toBe(INSTRUCAO_CESD);
    // literal, sem depender da constante deste arquivo: se alguém
    // reescrever o mapa, é este teste que decide quem está certo
    expect(CESD.instrucaoItens).toBe(
      'Para responder, considere como a pessoa se sentiu ou se comportou ' +
        'durante a última semana.',
    );
  });

  it('o enunciado sai do mapa fechado, pelo código do instrumento', () => {
    expect(INSTRUCAO_DOS_ITENS['CES-D']).toBe(INSTRUCAO_CESD);
    expect(Object.keys(INSTRUCAO_DOS_ITENS)).toEqual(['PHQ-9', 'CES-D']);
  });

  it('instrumento por bruto não recebe enunciado de item', () => {
    const bruto = montarModelo(
      detalheCesd({ entry_mode: 'bruto', itens: [], escalas: [] }),
    );
    expect(bruto.instrucaoItens).toBeNull();
  });
});

// =====================================================================
// B · o PHQ-9 e os outros
// =====================================================================

describe('B · nada vazou para os outros instrumentos', () => {
  it('o PHQ-9 continua com o enunciado dele, palavra por palavra', () => {
    expect(INSTRUCAO_DOS_ITENS['PHQ-9']).toBe(INSTRUCAO_PHQ9);
    expect(montarModelo(detalheCesd({ code: 'PHQ-9' })).instrucaoItens).toBe(
      INSTRUCAO_PHQ9,
    );
    expect(INSTRUCAO_DOS_ITENS['PHQ-9']).not.toBe(INSTRUCAO_CESD);
  });

  it('instrumento fora do mapa continua com null', () => {
    for (const code of ['DASS-21', 'SDQ-POR', 'C-TRF_1.5-5', 'BPA-2', 'ESDM']) {
      expect(montarModelo(detalheCesd({ code })).instrucaoItens).toBeNull();
    }
  });
});

// =====================================================================
// C · o enunciado não mexe nos itens
//
// Os enunciados REAIS são do catálogo e são travados no CorrigeFacil. O
// que se prova aqui é o trajeto: o que o catálogo manda chega à tela sem
// alteração, e o texto novo fica fora dele.
// =====================================================================

describe('C · os itens atravessam `montarModelo` sem alteração', () => {
  it('vinte entram, vinte saem, na ordem e com o mesmo texto', () => {
    expect(CESD.itens).toHaveLength(20);
    expect(CESD.itens.map((i) => i.numero)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(CESD.itens.map((i) => i.texto)).toEqual(ITENS.map((i) => i.texto));
  });

  it('o enunciado é do BLOCO: não entrou em item nenhum', () => {
    for (const item of CESD.itens) {
      expect(item.texto).not.toBe(INSTRUCAO_CESD);
      expect(item.texto).not.toContain('última semana');
      expect(item.texto).toBe(ITENS[item.numero - 1].texto);
      // e nenhum item virou seção com o enunciado por título
      expect(item.secao).toBeNull();
    }
  });

  it('as alternativas chegam ao item como vieram, item a item', () => {
    for (const item of CESD.itens) {
      expect(item.opcoes).toEqual(ALTERNATIVAS);
      expect(item.auxiliar).toBe(false);
    }
  });
});

// =====================================================================
// D · a tela desenha uma vez, e nada mais mudou
// =====================================================================

describe('D · onde o enunciado aparece, e o que não foi tocado', () => {
  it('a tela mostra `instrucaoItens` uma vez, fora da lista numerada', () => {
    const src = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    // uma única leitura, e ela é anterior ao <ol> dos itens
    expect(src.match(/m\.instrucaoItens/g) ?? []).toHaveLength(2); // guarda + texto
    expect(src.indexOf('{m.instrucaoItens && (')).toBeLessThan(
      src.indexOf('<ol className='),
    );
    // o texto não está escrito na tela: quem o guarda é o mapa
    expect(src).not.toContain('última semana');
  });

  it('gráfico não entra nesta mudança', () => {
    for (const arquivo of ['graph-config.ts', 'graph-model.ts']) {
      const src = fonte('app', 'app', 'corrigefacil', 'graphs', arquivo);
      expect(src).not.toContain(INSTRUCAO_CESD);
      expect(src).not.toContain('instrucaoItens');
    }
  });

  it('o enunciado não vai ao servidor: é apresentação', () => {
    const src = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'form-state.ts');
    expect(src).not.toContain('instrucaoItens');
    expect(src).not.toContain('última semana');
  });
});
