import { describe, expect, it } from 'vitest';
import { estadoInicial, pendencias } from '../form-state';
import { montarModelo } from '../form-model';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';

function detalhe(): InstrumentoDetalhe {
  return {
    code: 'DCDQ',
    name: 'DCDQ',
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: true,
    supports_prematurity: false,
    escalas: [],
    itens: [{ numero: 1, texto: 'Item' }],
    opcoes_resposta: [{ label: '1', value: 1 }],
    dimensoes: [{ code: 'idade', label: 'Idade', manual: false, opcoes: [] }],
    arvore: {},
    faixas_classificacao: [],
  };
}

describe('regressão da norma por data', () => {
  it('mantém a ordem das pendências: datas antes dos itens', () => {
    const modelo = montarModelo(detalhe());
    const lista = pendencias(modelo, estadoInicial());
    expect(lista[0]).toEqual({
      tipo: 'datas',
      faltam: ['Nascimento', 'Data da avaliação'],
    });
    expect(lista[1]).toEqual({ tipo: 'itens', faltam: [1] });
  });

  it('datas preenchidas removem só a pendência de datas', () => {
    const modelo = montarModelo(detalhe());
    const estado = {
      ...estadoInicial(),
      birthDate: '2018-08-08',
      evaluationDate: '2026-08-07',
    };
    expect(pendencias(modelo, estado)).toEqual([{ tipo: 'itens', faltam: [1] }]);
  });
});
