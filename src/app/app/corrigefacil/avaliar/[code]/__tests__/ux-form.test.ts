import { describe, expect, it } from 'vitest';
import { montarModelo } from '../form-model';
import {
  erroOrdemDatas,
  estadoInicial,
  podeEnviar,
  progresso,
  textoIntervaloBruto,
  textoPendencia,
  type EstadoFormulario,
} from '../form-state';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';

// Comportamentos de UX acrescentados na auditoria. Nada aqui pontua: são
// contagem de preenchimento, ordem de duas datas e texto de pendência.

function porItens(quantos: number, comTexto = true): InstrumentoDetalhe {
  return {
    code: 'X',
    name: 'X',
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [],
    itens: Array.from({ length: quantos }, (_, i) => ({
      numero: i + 1,
      texto: comTexto ? `Enunciado ${i + 1}` : null,
    })),
    opcoes_resposta: [
      { label: 'Não', value: 0 },
      { label: 'Sim', value: 1 },
    ],
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
  };
}

function comDatas(): InstrumentoDetalhe {
  return { ...porItens(1), code: 'DCDQ', requires_birthdate: true };
}

describe('progresso do protocolo', () => {
  it('conta respondidos sobre o total', () => {
    const m = montarModelo(porItens(20));
    expect(progresso(m, estadoInicial())).toEqual({ respondidos: 0, total: 20 });

    const estado: EstadoFormulario = {
      ...estadoInicial(),
      respostas: { 1: 1, 2: 0, 3: 1 },
    };
    expect(progresso(m, estado)).toEqual({ respondidos: 3, total: 20 });
  });

  it('zero é resposta e entra na contagem', () => {
    const m = montarModelo(porItens(2));
    const estado: EstadoFormulario = { ...estadoInicial(), respostas: { 1: 0 } };
    expect(progresso(m, estado)?.respondidos).toBe(1);
  });

  it('não existe progresso fora do modo por itens', () => {
    const bruto = montarModelo({
      ...porItens(0),
      entry_mode: 'bruto',
      itens: [],
      escalas: [{ code: 'T', name: 'Total', kind: 'primaria', bruto_min: 0, bruto_max: 10 }],
    } as unknown as InstrumentoDetalhe);
    expect(progresso(bruto, estadoInicial())).toBeNull();
  });
});

describe('ordem das datas', () => {
  it('nascimento depois da avaliação é recusado antes de sair a requisição', () => {
    const estado: EstadoFormulario = {
      ...estadoInicial(),
      birthDate: '2026-08-07',
      evaluationDate: '2018-01-01',
    };
    expect(erroOrdemDatas(estado)).toMatch(/posterior/);
    expect(podeEnviar(montarModelo(comDatas()), { ...estado, respostas: { 1: 1 } }, false)).toBe(
      false,
    );
  });

  it('datas na ordem certa passam, inclusive no mesmo dia', () => {
    const base = { ...estadoInicial(), respostas: { 1: 1 } };
    expect(erroOrdemDatas({ ...base, birthDate: '2018-01-01', evaluationDate: '2026-08-07' })).toBeNull();
    expect(erroOrdemDatas({ ...base, birthDate: '2026-08-07', evaluationDate: '2026-08-07' })).toBeNull();
    expect(
      podeEnviar(
        montarModelo(comDatas()),
        { ...base, birthDate: '2018-01-01', evaluationDate: '2026-08-07' },
        false,
      ),
    ).toBe(true);
  });

  it('data faltando é pendência, não erro de ordem', () => {
    expect(erroOrdemDatas({ ...estadoInicial(), birthDate: '2018-01-01' })).toBeNull();
    expect(erroOrdemDatas(estadoInicial())).toBeNull();
  });

  it('a checagem não calcula idade: instrumento sem data não é afetado', () => {
    const m = montarModelo(porItens(1));
    const estado: EstadoFormulario = {
      ...estadoInicial(),
      respostas: { 1: 1 },
      birthDate: '2026-08-07',
      evaluationDate: '2018-01-01',
    };
    expect(podeEnviar(m, estado, false)).toBe(true);
  });
});

describe('texto de pendência', () => {
  it('cita os primeiros itens em vez de só contar', () => {
    const m = montarModelo(porItens(20));
    const texto = textoPendencia([
      { tipo: 'itens', faltam: [3, 7, 9, 11, 14, 18, 19, 20] },
    ]);
    expect(texto).toContain('8 itens sem resposta');
    expect(texto).toContain('3, 7, 9, 11, 14, 18');
    expect(texto).toContain('…');
    expect(m.itens).toHaveLength(20);
  });

  it('não põe reticência quando cabe tudo, e usa singular', () => {
    expect(textoPendencia([{ tipo: 'itens', faltam: [4] }])).toBe(
      '1 item sem resposta: 4',
    );
  });

  it('junta pendências de tipos diferentes', () => {
    const texto = textoPendencia([
      { tipo: 'datas', faltam: ['Nascimento'] },
      { tipo: 'dimensoes', faltam: ['Grupo normativo'] },
    ]);
    expect(texto).toBe('preencha: Nascimento · escolha: Grupo normativo');
  });
});

describe('intervalo de entrada da escala', () => {
  it('diz os dois limites quando existem', () => {
    expect(textoIntervaloBruto(0, 27)).toBe('bruto de 0 a 27');
    expect(textoIntervaloBruto(39, 195)).toBe('bruto de 39 a 195');
  });

  it('diz só o limite que existe', () => {
    expect(textoIntervaloBruto(1, null)).toBe('bruto mínimo 1');
    expect(textoIntervaloBruto(null, 60)).toBe('bruto máximo 60');
  });

  it('sem limite declarado não inventa frase', () => {
    expect(textoIntervaloBruto(null, null)).toBeNull();
  });

  it('zero é limite válido, não ausência', () => {
    expect(textoIntervaloBruto(0, null)).toBe('bruto mínimo 0');
    expect(textoIntervaloBruto(null, 0)).toBe('bruto máximo 0');
  });
});

describe('instrumento sem enunciado', () => {
  it('marca o item e não inventa texto', () => {
    const m = montarModelo(porItens(3, false));
    for (const item of m.itens) {
      expect(item.semEnunciado).toBe(true);
      // o fallback é a referência ao número, nunca um enunciado plausível
      expect(item.texto).toBe(`Item ${item.numero}`);
    }
  });

  it('item com enunciado real não é marcado', () => {
    const m = montarModelo(porItens(2));
    expect(m.itens.every((i) => i.semEnunciado === false)).toBe(true);
    expect(m.itens[0].texto).toBe('Enunciado 1');
  });

  it('texto só com espaço conta como ausente', () => {
    const detalhe = porItens(1);
    detalhe.itens = [{ numero: 1, texto: '   ' }];
    expect(montarModelo(detalhe).itens[0].semEnunciado).toBe(true);
  });

  it('sem enunciado o protocolo continua respondível e enviável', () => {
    const m = montarModelo(porItens(2, false));
    const estado: EstadoFormulario = { ...estadoInicial(), respostas: { 1: 0, 2: 1 } };
    expect(m.bloqueio).toBeNull();
    expect(podeEnviar(m, estado, false)).toBe(true);
  });
});
