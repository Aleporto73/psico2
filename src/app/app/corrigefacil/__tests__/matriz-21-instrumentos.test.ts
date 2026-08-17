import { describe, expect, it } from 'vitest';
import { montarCartao, linkAplicar } from '../catalog-view';
import {
  brutoValido,
  escalaCalculada,
  montarModelo,
} from '../../corrigefacil/avaliar/[code]/form-model';
import {
  estadoInicial,
  pendencias,
  podeEnviar,
  progresso,
} from '../../corrigefacil/avaliar/[code]/form-state';
import type { CampoEscala } from '../../corrigefacil/avaliar/[code]/form-model';
import type { InstrumentoDetalhe, InstrumentoResumo } from '@/lib/corrigefacil/api';

// MATRIZ DOS 21 INSTRUMENTOS PUBLICADOS · o catálogo ATIVO
//
// A tela é a mesma para todos, e é justamente por isso que este teste existe:
// "usa componente compartilhado" não prova que nenhum dos 21 cai numa
// combinação que a tela não desenha. Aqui cada um passa pelo modelo do
// catálogo e pelo modelo do formulário, e as invariantes de render são
// verificadas uma a uma.
//
// A forma de cada linha foi lida do catálogo REAL em produção
// (wxiyfudloyyxmnaddljx) — entry_mode, score_type, requires_birthdate,
// supports_prematurity, número de itens, itens sem enunciado, dimensões e
// dimensões com opções. Nada foi inventado, e nenhum enunciado é reproduzido:
// o que importa aqui é a FORMA, não o conteúdo clínico.
//
// O QUE ESTA MATRIZ FOTOGRAFA É `is_active = true`, e não "tudo que existe
// na tabela". O TDF saiu daqui porque saiu do catálogo publicado
// (`is_active = false`), e o FDT entrou no lugar dele. Os dois são
// instrumentos DIFERENTES, com formas diferentes — o TDF é uma pontuação
// padrão de uma escala só, o FDT são dez medidas de tempo e erro —, e
// trocar um pelo outro por semelhança de sigla teria deixado a fotografia
// errada de um jeito que nenhum teste pegaria. A forma abaixo foi lida do
// mesmo banco, instrumento por instrumento.

type Linha = {
  code: string;
  entryMode: 'itens' | 'bruto' | 'componentes';
  scoreType: string;
  nasc: boolean;
  prem: boolean;
  /** dimensões declaradas no banco */
  dims: number;
  /** dimensões que o profissional escolhe (as demais saem das datas) */
  dimsComOpcoes: number;
  itens: number;
  semTexto: number;
  /** escalas DECLARADAS no catálogo */
  escalas: number;
  /** os códigos REAIS das escalas, quando o código muda o que a tela faz.
   *  Só o FDT precisa: `ESCALAS_CALCULADAS` casa por código, e com
   *  `E1..E10` genéricos o filtro não rodaria — o teste passaria sem
   *  exercer a regra que ele existe para guardar. */
  codigosEscala?: readonly string[];
  /** escalas que o profissional DIGITA. Difere de `escalas` só onde o
   *  servidor calcula alguma: no FDT, Inibição e Flexibilidade são
   *  subtrações e não viram campo. */
  escalasDigitadas?: number;
};

/** As escalas que o formulário deve pedir nesta linha. */
function escalasDigitadas(l: Linha): number {
  return l.escalasDigitadas ?? l.escalas;
}

const MATRIZ: Linha[] = [
  { code: 'BAYLEY-III', entryMode: 'bruto', scoreType: 'composta', nasc: true, prem: true, dims: 1, dimsComOpcoes: 0, itens: 0, semTexto: 0, escalas: 16 },
  { code: 'BPA-2', entryMode: 'componentes', scoreType: 'percentil', nasc: false, prem: false, dims: 3, dimsComOpcoes: 3, itens: 0, semTexto: 0, escalas: 3 },
  { code: 'C-TRF_1.5-5', entryMode: 'itens', scoreType: 'escore_t', nasc: false, prem: false, dims: 1, dimsComOpcoes: 1, itens: 100, semTexto: 100, escalas: 6 },
  { code: 'CES-D', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 20, semTexto: 0, escalas: 1 },
  { code: 'CHECK-DIS', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 39, semTexto: 0, escalas: 1 },
  { code: 'CONFIAS', entryMode: 'itens', scoreType: 'escore_z', nasc: false, prem: false, dims: 1, dimsComOpcoes: 1, itens: 70, semTexto: 70, escalas: 2 },
  { code: 'DASS-21', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 21, semTexto: 0, escalas: 3 },
  { code: 'DCDQ', entryMode: 'itens', scoreType: 'escore_bruto', nasc: true, prem: false, dims: 1, dimsComOpcoes: 0, itens: 15, semTexto: 0, escalas: 1 },
  { code: 'EPQ-J', entryMode: 'itens', scoreType: 'percentil', nasc: false, prem: false, dims: 1, dimsComOpcoes: 1, itens: 60, semTexto: 60, escalas: 4 },
  { code: 'ERA-A', entryMode: 'itens', scoreType: 'percentil', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 75, semTexto: 75, escalas: 4 },
  { code: 'ERA-F', entryMode: 'itens', scoreType: 'percentil', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 34, semTexto: 34, escalas: 4 },
  { code: 'ETPC', entryMode: 'itens', scoreType: 'quartil', nasc: false, prem: false, dims: 1, dimsComOpcoes: 1, itens: 30, semTexto: 30, escalas: 4 },
  // FDT · dez escalas no catálogo, OITO campos na tela: Inibição e
  // Flexibilidade são subtrações feitas no servidor. A dimensão 'idade'
  // existe e NÃO tem opções — os `norm_sets` do FDT são faixas contíguas
  // (range_min/range_max) e a idade crua as resolve, então não há seletor
  // a desenhar. É o que a separa do TDF, cuja dimensão de mesmo nome tinha
  // uma opção por ano.
  { code: 'FDT', entryMode: 'bruto', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 1, dimsComOpcoes: 0, itens: 0, semTexto: 0, escalas: 10, escalasDigitadas: 8,
    codigosEscala: ['T_LEITURA', 'T_CONTAGEM', 'T_ESCOLHA', 'T_ALTERNANCIA', 'E_LEITURA', 'E_CONTAGEM', 'E_ESCOLHA', 'E_ALTERNANCIA', 'INIBICAO', 'FLEXIBILIDADE'] },
  { code: 'PHQ-9', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 9, semTexto: 0, escalas: 1 },
  { code: 'QA-ADULTO', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 50, semTexto: 0, escalas: 1 },
  { code: 'SCARED-C', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 41, semTexto: 0, escalas: 5 },
  { code: 'SDQ-POR', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 25, semTexto: 0, escalas: 5 },
  { code: 'SNAP-IV-18', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 18, semTexto: 0, escalas: 2 },
  { code: 'SNAP-IV-26', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 26, semTexto: 0, escalas: 3 },
  { code: 'TRACO-ANSIEDADE', entryMode: 'itens', scoreType: 'escore_bruto', nasc: false, prem: false, dims: 0, dimsComOpcoes: 0, itens: 34, semTexto: 0, escalas: 1 },
  { code: 'TRILHAS_PRE', entryMode: 'bruto', scoreType: 'pontuacao_padrao', nasc: false, prem: false, dims: 1, dimsComOpcoes: 1, itens: 0, semTexto: 0, escalas: 4 },
];

/** Detalhe sintético com a FORMA da linha. Enunciados são marcadores neutros
 *  ("i1", "i2"): o teste é de render, e reproduzir item de instrumento
 *  psicométrico aqui não teria propósito nenhum. */
function detalheDe(l: Linha): InstrumentoDetalhe {
  const comTexto = l.itens - l.semTexto;
  return {
    code: l.code,
    name: l.code,
    entry_mode: l.entryMode,
    score_type: l.scoreType,
    requires_birthdate: l.nasc,
    supports_prematurity: l.prem,
    escalas: Array.from({ length: l.escalas }, (_, i) => ({
      code: l.codigosEscala?.[i] ?? `E${i + 1}`,
      name: l.codigosEscala?.[i] ?? `Escala ${i + 1}`,
      kind: 'primaria',
      bruto_min: 0,
      bruto_max: 100,
    })),
    itens: Array.from({ length: l.itens }, (_, i) => ({
      numero: i + 1,
      texto: i < comTexto ? `i${i + 1}` : null,
    })),
    opcoes_resposta: [
      { label: '0', value: 0 },
      { label: '1', value: 1 },
    ],
    dimensoes: Array.from({ length: l.dims }, (_, i) => ({
      code: `d${i + 1}`,
      label: `Dimensão ${i + 1}`,
      manual: true,
      // dimensão SEM opções é a calculada a partir das datas
      opcoes: i < l.dimsComOpcoes ? ['A', 'B'] : [],
    })),
    arvore: {},
    faixas_classificacao: [],
  } as unknown as InstrumentoDetalhe;
}

/** O MENOR valor que a régua deste campo aceita.
 *
 *  Zero em quase todo lugar — e é de propósito que ele seja a primeira
 *  escolha, porque zero ser recusado como se fosse campo vazio é
 *  exatamente o engano que a matriz existe para pegar. Onde o piso é
 *  ABERTO, porém, zero é inválido de verdade: os quatro tempos do FDT são
 *  cronômetro, e ninguém lê cinquenta dígitos em zero segundo. Pedir o
 *  valor à mesma `entrada` que a tela usa evita a matriz afirmar que um
 *  protocolo passa quando a tela o recusaria.  */
function valorAceito(entrada: CampoEscala['entrada']): number {
  if (!entrada) return 0;
  return entrada.pisoAberto ? entrada.minimo + 1 : entrada.minimo;
}

describe('matriz dos 21 instrumentos publicados', () => {
  it('a matriz cobre exatamente 21 códigos distintos', () => {
    expect(MATRIZ).toHaveLength(21);
    expect(new Set(MATRIZ.map((l) => l.code)).size).toBe(21);
    // ESDM é técnico e não entra no catálogo comercial
    expect(MATRIZ.some((l) => l.code === 'ESDM')).toBe(false);
  });

  it.each(MATRIZ.map((l) => [l.code, l] as const))(
    '%s: cartão do catálogo tem rota e nada de faixa etária inventada',
    (_code, l) => {
      const cartao = montarCartao({
        code: l.code,
        name: l.code,
        entry_mode: l.entryMode,
        requires_birthdate: l.nasc,
        supports_prematurity: l.prem,
      } as unknown as InstrumentoResumo);

      expect(cartao.acaoDisponivel).toBe(true);
      expect(cartao.href).toBe(linkAplicar(l.code));
      // códigos com ponto e barra precisam sobreviver à URL
      expect(cartao.href).not.toContain(' ');
      expect(cartao.meta.join(' ')).not.toMatch(/\d+\s*a\s*\d+\s*anos/);
    },
  );

  it.each(MATRIZ.map((l) => [l.code, l] as const))(
    '%s: o formulário monta sem bloqueio e com os campos do modo certo',
    (_code, l) => {
      const m = montarModelo(detalheDe(l));

      expect(m.bloqueio).toBeNull();
      expect(m.entryMode).toBe(l.entryMode);
      expect(m.exigeDataNascimento).toBe(l.nasc);
      expect(m.suportaPrematuridade).toBe(l.prem);

      if (l.entryMode === 'itens') {
        expect(m.itens).toHaveLength(l.itens);
        expect(m.escalas).toHaveLength(0);
        expect(progresso(m, estadoInicial())).toEqual({
          respondidos: 0,
          total: l.itens,
        });
      } else {
        expect(m.itens).toHaveLength(0);
        // o que a TELA pede, que não é o que o catálogo declara onde o
        // servidor calcula alguma escala
        expect(m.escalas).toHaveLength(escalasDigitadas(l));
        expect(m.escalas.every((e) => !escalaCalculada(l.code, e.code))).toBe(
          true,
        );
        expect(progresso(m, estadoInicial())).toBeNull();
      }

      // só as dimensões COM opções viram select; a calculada sai das datas
      expect(m.dimensoes).toHaveLength(l.dimsComOpcoes);
    },
  );

  it.each(MATRIZ.filter((l) => l.semTexto > 0).map((l) => [l.code, l] as const))(
    '%s: itens sem enunciado são marcados e nenhum texto é inventado',
    (_code, l) => {
      const m = montarModelo(detalheDe(l));
      const sem = m.itens.filter((i) => i.semEnunciado);
      expect(sem).toHaveLength(l.semTexto);
      for (const item of sem) {
        expect(item.texto).toBe(`Item ${item.numero}`);
      }
    },
  );

  it.each(MATRIZ.map((l) => [l.code, l] as const))(
    '%s: protocolo vazio bloqueia o envio e protocolo cheio libera',
    (_code, l) => {
      const m = montarModelo(detalheDe(l));
      expect(podeEnviar(m, estadoInicial(), false)).toBe(false);

      const estado = estadoInicial();
      for (const item of m.itens) estado.respostas[item.numero] = 0;
      for (const e of m.escalas) {
        if (l.entryMode === 'bruto') estado.brutos[e.code] = valorAceito(e.entrada);
        else estado.componentes[e.code] = { acertos: 0, erros: 0, omissoes: 0 };
      }
      for (const d of m.dimensoes) estado.selector[d.code] = d.opcoes[0];
      if (l.nasc) {
        estado.birthDate = '2018-01-01';
        estado.evaluationDate = '2026-08-07';
      }

      expect(pendencias(m, estado)).toEqual([]);
      expect(podeEnviar(m, estado, false)).toBe(true);
    },
  );

  it('zero é resposta válida nos três modos de entrada', () => {
    // O protocolo do teste acima é preenchido com o MENOR valor aceito, e
    // ele é zero em toda parte menos nos campos de piso aberto. Se zero
    // fosse tratado como vazio em qualquer modo, aquele bloco falharia — e
    // este caso deixa a intenção explícita.
    const modos = new Set(MATRIZ.map((l) => l.entryMode));
    expect([...modos].sort()).toEqual(['bruto', 'componentes', 'itens']);

    for (const l of MATRIZ) {
      for (const e of montarModelo(detalheDe(l)).escalas) {
        // sem régua declarada, zero passa — que é o caso dos outros 20
        if (!e.entrada) expect(valorAceito(e.entrada)).toBe(0);
        expect(brutoValido(valorAceito(e.entrada), e.entrada)).toBe(true);
      }
    }
  });

  it('só o FDT recusa zero, e só nos quatro campos de tempo', () => {
    // A exceção é do INSTRUMENTO, não da tela: tempo de cronômetro tem
    // piso aberto e contagem de erro não. Se um dia a régua dos erros
    // virasse aberta junto, este caso cai — e é o que se quer, porque não
    // errar é o desempenho normal em várias faixas etárias.
    const recusamZero = MATRIZ.flatMap((l) =>
      montarModelo(detalheDe(l))
        .escalas.filter((e) => !brutoValido(0, e.entrada))
        .map((e) => `${l.code}/${e.code}`),
    );
    expect(recusamZero.sort()).toEqual([
      'FDT/T_ALTERNANCIA',
      'FDT/T_CONTAGEM',
      'FDT/T_ESCOLHA',
      'FDT/T_LEITURA',
    ]);
  });
});
