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
const identificado = {
  nome: 'Ana Beatriz Costa',
  idadeAnos: '8',
  idadeCalculada: null,
  respondente: 'Mãe',
};

describe('salvamento da avaliação', () => {
  it('nome e idade vazios bloqueiam a identificação manual', () => {
    expect(validarIdentificacao(identificacaoInicial(), modelo)).toEqual([
      'nome_vazio',
      'idade_vazia',
    ]);
    expect(podeSalvar(identificacaoInicial(), modelo, false, false)).toBe(false);
  });

  it('idade manual inválida é recusada', () => {
    expect(validarIdentificacao({ ...identificado, idadeAnos: '-1' }, modelo)).toEqual([
      'idade_invalida',
    ]);
    expect(validarIdentificacao({ ...identificado, idadeAnos: '8.5' }, modelo)).toEqual([
      'idade_invalida',
    ]);
  });

  it('identificação válida libera o salvamento', () => {
    expect(validarIdentificacao(identificado, modelo)).toEqual([]);
    expect(podeSalvar(identificado, modelo, false, false)).toBe(true);
  });

  it('payload usa nome como subject_label e guarda só anos quando idade é manual', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, identificado);

    expect(pedido.instrument_code).toBe('PHQ-9');
    expect(pedido.respostas).toEqual({ '1': 0, '2': 3 });
    expect(pedido.norm_selector).toEqual({});
    expect(pedido.subject_label).toBe('Ana Beatriz Costa');
    expect(pedido.subject_meta).toEqual({
      respondent_name: 'Mãe',
      age_at_evaluation: { years: 8 },
    });
  });

  it('zero continua preservado no salvamento', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, identificado);
    expect(pedido.respostas!['1']).toBe(0);
  });

  it('duplo envio é bloqueado enquanto salva e depois de salvo', () => {
    expect(podeSalvar(identificado, modelo, true, false)).toBe(false);
    expect(podeSalvar(identificado, modelo, false, true)).toBe(false);
  });

  it('respondente em branco não vira string vazia no subject_meta', () => {
    const pedido = montarPedidoAvaliacao(modelo, preenchido, {
      ...identificado,
      respondente: '   ',
    });
    expect(pedido.subject_meta).toEqual({ age_at_evaluation: { years: 8 } });
  });

  it('instrumento por data não exige idade manual, mas só salva após idade calculada', () => {
    const modeloData = montarModelo({
      ...detalhe,
      code: 'DCDQ',
      requires_birthdate: true,
    });
    const semCalculo = { ...identificado, idadeAnos: '', idadeCalculada: null };

    expect(validarIdentificacao(semCalculo, modeloData)).toEqual([]);
    expect(podeSalvar(semCalculo, modeloData, false, false)).toBe(false);

    const comCalculo = {
      ...semCalculo,
      idadeCalculada: { years: 8, months: 4, days: 12, corrected: false },
    };
    expect(podeSalvar(comCalculo, modeloData, false, false)).toBe(true);

    const pedido = montarPedidoAvaliacao(modeloData, preenchido, comCalculo);
    expect(pedido.subject_meta).toEqual({
      respondent_name: 'Mãe',
      age_at_evaluation: { years: 8, months: 4, days: 12, corrected: false },
    });
  });

  it('o módulo não persiste nada localmente nem calcula escore', () => {
    const serial = JSON.stringify(montarPedidoAvaliacao(modelo, preenchido, identificado));
    for (const proibido of ['score', 'classification', 'percentile', 'localStorage']) {
      expect(serial.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
  });
});
