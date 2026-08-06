import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import { montarModelo } from '../form-model';
import { estadoInicial } from '../form-state';
import {
  identificacaoInicial,
  montarPedidoAvaliacao,
  podeSalvar,
  validarIdentificacao,
} from '../save-model';

const detalhe: InstrumentoDetalhe = {
  code: 'PHQ-9',
  name: 'PHQ-9',
  entry_mode: 'itens',
  score_type: 'escore_bruto',
  requires_birthdate: false,
  supports_prematurity: false,
  escalas: [],
  itens: [
    { numero: 1, texto: 'a' },
    { numero: 2, texto: 'b' },
  ],
  opcoes_resposta: [
    { label: 'Não', value: 0 },
    { label: 'Sim', value: 3 },
  ],
  dimensoes: [],
  arvore: {},
  faixas_classificacao: [],
};

const modelo = montarModelo(detalhe);
const preenchido = { ...estadoInicial(), respostas: { 1: 0, 2: 3 } };
const identificado = { rotulo: 'A.B.C.', respondente: 'Auto-relato', profissional: '' };

describe('salvamento da avaliação', () => {
  it('19) rótulo vazio bloqueia o salvamento', () => {
    expect(validarIdentificacao(identificacaoInicial())).toEqual(['rotulo_vazio']);
    expect(validarIdentificacao({ ...identificado, rotulo: '   ' })).toEqual(['rotulo_vazio']);
    expect(podeSalvar(identificacaoInicial(), false, false)).toBe(false);
  });

  it('17) identificação válida libera o salvamento', () => {
    expect(validarIdentificacao(identificado)).toEqual([]);
    expect(podeSalvar(identificado, false, false)).toBe(true);
  });

  it('18) o payload reaproveita respostas e norm_selector já preenchidos', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, identificado);

    expect(pedido.instrument_code).toBe('PHQ-9');
    expect(pedido.respostas).toEqual({ '1': 0, '2': 3 });
    expect(pedido.norm_selector).toEqual({});
    expect(pedido.subject_label).toBe('A.B.C.');
    expect(pedido.subject_meta).toEqual({ respondent_name: 'Auto-relato' });
  });

  it('20) o zero continua preservado no salvamento', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, identificado);
    expect(pedido.respostas!['1']).toBe(0);
  });

  it('21) duplo envio é bloqueado enquanto salva e depois de salvo', () => {
    expect(podeSalvar(identificado, true, false)).toBe(false);   // salvando
    expect(podeSalvar(identificado, false, true)).toBe(false);   // já salvo
  });

  it('campo opcional em branco não vira string vazia no subject_meta', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, {
      rotulo: 'X',
      respondente: '   ',
      profissional: '',
    });
    expect(pedido.subject_meta).toEqual({});
  });

  it('profissional preenchido entra no subject_meta', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, {
      ...identificado,
      profissional: 'Dra. Ana',
    });
    expect(pedido.subject_meta).toEqual({
      respondent_name: 'Auto-relato',
      profissional: 'Dra. Ana',
    });
  });

  it('25) o módulo não persiste nada localmente nem calcula escore', () => {
    const serial = JSON.stringify(montarPedidoAvaliacao(modelo, preenchido, identificado));
    for (const proibido of ['score', 'classification', 'percentile', 'localStorage']) {
      expect(serial.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
  });
});
