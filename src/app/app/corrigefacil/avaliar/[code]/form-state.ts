// Estado das respostas, validação de UX e montagem do payload. Puro.
//
// A validação daqui existe só para não mandar protocolo pela metade ao
// servidor. Quem calcula idade, escolhe norma, pontua e classifica é o servidor.
import type { PedidoCorrecao } from '@/lib/corrigefacil/api';
import type { RegraPrematuridade } from '@/lib/corrigefacil/date-norm-api';
import type { ModeloFormulario } from './form-model';

export type RespostasItens = Record<number, number>;
export type BrutosEscalas = Record<string, number>;
export type ComponentesEscalas = Record<string, Record<string, number>>;

export const COMPONENTES = ['acertos', 'erros', 'omissoes'] as const;
export type NomeComponente = (typeof COMPONENTES)[number];

export type EstadoFormulario = {
  respostas: RespostasItens;
  brutos: BrutosEscalas;
  componentes: ComponentesEscalas;
  selector: Record<string, string>;
  birthDate: string;
  evaluationDate: string;
  prematurityWeeks: number;
  prematurityRule: RegraPrematuridade;
};

export function estadoInicial(): EstadoFormulario {
  return {
    respostas: {},
    brutos: {},
    componentes: {},
    selector: {},
    birthDate: '',
    evaluationDate: '',
    prematurityWeeks: 0,
    prematurityRule: 'ate_24_meses',
  };
}

export type Pendencia =
  | { tipo: 'itens'; faltam: number[] }
  | { tipo: 'escalas'; faltam: string[] }
  | { tipo: 'componentes'; faltam: string[] }
  | { tipo: 'dimensoes'; faltam: string[] }
  | { tipo: 'datas'; faltam: string[] };

function pendenciaDatas(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  if (!modelo.exigeDataNascimento) return [];
  const faltam = [
    !estado.birthDate ? 'Nascimento' : null,
    !estado.evaluationDate ? 'Data da avaliação' : null,
  ].filter((v): v is string => v !== null);
  return faltam.length ? [{ tipo: 'datas', faltam }] : [];
}

function pendenciaItens(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  if (modelo.entryMode !== 'itens') return [];
  const faltam = modelo.itens
    .filter((i) => !temValor(estado.respostas[i.numero]))
    .map((i) => i.numero);
  return faltam.length ? [{ tipo: 'itens', faltam }] : [];
}

function pendenciaEscalas(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  if (modelo.entryMode !== 'bruto') return [];
  const faltam = modelo.escalas
    .filter((e) => !temValor(estado.brutos[e.code]))
    .map((e) => e.code);
  return faltam.length ? [{ tipo: 'escalas', faltam }] : [];
}

function pendenciaComponentes(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  if (modelo.entryMode !== 'componentes') return [];
  const faltam = modelo.escalas
    .filter((e) => {
      const c = estado.componentes[e.code] ?? {};
      return COMPONENTES.some((nome) => !temValor(c[nome]));
    })
    .map((e) => e.code);
  return faltam.length ? [{ tipo: 'componentes', faltam }] : [];
}

function pendenciaDimensoes(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  const faltam = modelo.dimensoes
    .filter((d) => !estado.selector[d.code])
    .map((d) => d.label);
  return faltam.length ? [{ tipo: 'dimensoes', faltam }] : [];
}

/** O que ainda impede o envio. Lista vazia = pronto para corrigir. */
export function pendencias(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
): Pendencia[] {
  return [
    ...pendenciaDatas(modelo, estado),
    ...pendenciaItens(modelo, estado),
    ...pendenciaEscalas(modelo, estado),
    ...pendenciaComponentes(modelo, estado),
    ...pendenciaDimensoes(modelo, estado),
  ];
}

/** Zero É valor. Só `undefined`, `null` e NaN contam como vazio. */
function temValor(v: number | undefined): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

export function podeEnviar(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
  enviando: boolean,
): boolean {
  if (enviando) return false;
  if (modelo.bloqueio) return false;
  return pendencias(modelo, estado).length === 0;
}

/** Estado -> corpo do POST /corrigir. O norm_selector derivado de datas já
 * chega preenchido no estado depois da chamada ao resolver server-side. */
export function montarPedido(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
): PedidoCorrecao {
  const pedido: PedidoCorrecao = {
    instrument_code: modelo.code,
    norm_selector: { ...estado.selector },
  };

  if (modelo.entryMode === 'itens') {
    const respostas: Record<string, number> = {};
    for (const item of modelo.itens) {
      const v = estado.respostas[item.numero];
      if (temValor(v)) respostas[String(item.numero)] = v;
    }
    pedido.respostas = respostas;
    return pedido;
  }

  if (modelo.entryMode === 'bruto') {
    const brutos: Record<string, number> = {};
    for (const escala of modelo.escalas) {
      const v = estado.brutos[escala.code];
      if (temValor(v)) brutos[escala.code] = v;
    }
    pedido.brutos = brutos;
    return pedido;
  }

  if (modelo.entryMode === 'componentes') {
    const brutos: Record<string, Record<string, number>> = {};
    for (const escala of modelo.escalas) {
      const c = estado.componentes[escala.code];
      if (!c) continue;
      const preenchidos: Record<string, number> = {};
      for (const nome of COMPONENTES) {
        if (temValor(c[nome])) preenchidos[nome] = c[nome];
      }
      if (Object.keys(preenchidos).length) brutos[escala.code] = preenchidos;
    }
    pedido.brutos = brutos;
  }

  return pedido;
}

/** Opções válidas de uma dimensão, respeitando a árvore de combinações. */
export function opcoesDaDimensao(
  modelo: ModeloFormulario,
  arvore: Record<string, unknown> | undefined,
  indice: number,
  selector: Record<string, string>,
): string[] {
  const dimensao = modelo.dimensoes[indice];
  if (!dimensao) return [];
  if (!arvore || Object.keys(arvore).length === 0) return dimensao.opcoes;

  let no: unknown = arvore;
  for (let i = 0; i < indice; i++) {
    const escolhido = selector[modelo.dimensoes[i].code];
    if (!escolhido || typeof no !== 'object' || no === null) return [];
    no = (no as Record<string, unknown>)[escolhido];
  }
  if (typeof no !== 'object' || no === null) return [];
  return Object.keys(no as Record<string, unknown>);
}

/** Trocar uma dimensão invalida as seguintes — a cascata muda. */
export function escolherDimensao(
  modelo: ModeloFormulario,
  selector: Record<string, string>,
  indice: number,
  valor: string,
): Record<string, string> {
  const novo: Record<string, string> = {};
  for (let i = 0; i < indice; i++) {
    const code = modelo.dimensoes[i].code;
    if (selector[code]) novo[code] = selector[code];
  }
  if (valor) novo[modelo.dimensoes[indice].code] = valor;
  return novo;
}
