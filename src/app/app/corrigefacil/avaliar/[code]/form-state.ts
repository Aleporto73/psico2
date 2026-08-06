// Estado das respostas, validação de UX e montagem do payload. Puro.
//
// A validação daqui existe só para não mandar protocolo pela metade ao
// servidor: POST /corrigir aceita respostas parciais e devolve um bruto menor
// SEM avisar (a guarda de protocolo incompleto vive em POST /avaliacao, que
// não é desta etapa). Quem recusa de verdade continua sendo a Edge.
import type { PedidoCorrecao } from '@/lib/corrigefacil/api';
import type { ModeloFormulario } from './form-model';

/** Resposta por item: número do item -> valor bruto escolhido.
 *  Ausência da chave = não respondido. NUNCA usar 0 para "vazio": zero é
 *  alternativa legítima na maioria dos instrumentos. */
export type RespostasItens = Record<number, number>;

/** Bruto por escala. `componentes` guarda acertos/erros/omissões. */
export type BrutosEscalas = Record<string, number>;
export type ComponentesEscalas = Record<string, Record<string, number>>;

export const COMPONENTES = ['acertos', 'erros', 'omissoes'] as const;
export type NomeComponente = (typeof COMPONENTES)[number];

export type EstadoFormulario = {
  respostas: RespostasItens;
  brutos: BrutosEscalas;
  componentes: ComponentesEscalas;
  selector: Record<string, string>;
};

export function estadoInicial(): EstadoFormulario {
  return { respostas: {}, brutos: {}, componentes: {}, selector: {} };
}

export type Pendencia =
  | { tipo: 'itens'; faltam: number[] }
  | { tipo: 'escalas'; faltam: string[] }
  | { tipo: 'componentes'; faltam: string[] }
  | { tipo: 'dimensoes'; faltam: string[] };

/** O que ainda impede o envio. Lista vazia = pronto para corrigir. */
export function pendencias(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
): Pendencia[] {
  const lista: Pendencia[] = [];

  if (modelo.entryMode === 'itens') {
    const faltam = modelo.itens
      .filter((i) => !temValor(estado.respostas[i.numero]))
      .map((i) => i.numero);
    if (faltam.length) lista.push({ tipo: 'itens', faltam });
  }

  if (modelo.entryMode === 'bruto') {
    const faltam = modelo.escalas
      .filter((e) => !temValor(estado.brutos[e.code]))
      .map((e) => e.code);
    if (faltam.length) lista.push({ tipo: 'escalas', faltam });
  }

  if (modelo.entryMode === 'componentes') {
    const faltam = modelo.escalas
      .filter((e) => {
        const c = estado.componentes[e.code] ?? {};
        return COMPONENTES.some((nome) => !temValor(c[nome]));
      })
      .map((e) => e.code);
    if (faltam.length) lista.push({ tipo: 'componentes', faltam });
  }

  const dimensoesFaltando = modelo.dimensoes
    .filter((d) => !estado.selector[d.code])
    .map((d) => d.label);
  if (dimensoesFaltando.length) {
    lista.push({ tipo: 'dimensoes', faltam: dimensoesFaltando });
  }

  return lista;
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
  if (enviando) return false;          // trava de duplo clique
  if (modelo.bloqueio) return false;
  return pendencias(modelo, estado).length === 0;
}

/** Estado -> corpo do POST /corrigir, no contrato exato.
 *
 *  `respostas` é chaveada por NÚMERO DO ITEM em string (é o que a Edge lê em
 *  `Object.entries(respostas)`), e `brutos` por CÓDIGO DE ESCALA. Nenhum
 *  valor é transformado no caminho: o que o profissional escolheu é o que
 *  sobe. */
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

/** Opções válidas de uma dimensão, respeitando a árvore de combinações.
 *  Sem árvore, valem as opções da própria dimensão. */
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
