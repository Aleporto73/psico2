// Estado das respostas, validação de UX e montagem do payload. Puro.
//
// A validação daqui existe só para não mandar protocolo pela metade ao
// servidor. Quem calcula idade, escolhe norma, pontua e classifica é o servidor.
import type { PedidoCorrecao } from '@/lib/corrigefacil/api';
import type { RegraPrematuridade } from '@/lib/corrigefacil/date-norm-api';
import {
  brutoValido,
  estadoDoGate,
  faixaPelaIdade,
  itensVisiveis,
  resolvidaPelaIdade,
  type ModeloFormulario,
} from './form-model';

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
  | { tipo: 'escalas_invalidas'; faltam: string[] }
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

/** Os números de item que o envio EXIGE, já com a regra do gate aplicada.
 *
 *  A base é a regra do servidor (`_itens_sem_resposta` no engine, e a gêmea
 *  da Edge): só item que PONTUA pode segurar o envio, porque item auxiliar
 *  não entra em soma nenhuma e exigi-lo travaria o formulário por um campo
 *  que não move escore.
 *
 *  Sobre ela, o gate muda dois pontos — os mesmos dois de `store._com_gate`
 *  e de `comGate` na Edge:
 *
 *    o item do GATE passa a ser obrigatório mesmo sendo auxiliar. Sem ele o
 *    servidor não tem como distinguir "impacto zero" de "seção não
 *    respondida", e recusa a conclusão;
 *
 *    as parcelas da seção deixam de ser obrigatórias enquanto a porta não
 *    estiver aberta. Elas nem estão na tela nesse estado, e exigir o que
 *    não se vê deixaria o botão desligado sem dizer por quê.
 *
 *  O gate só é exigido se o item existir no modelo: quem manda o que existe
 *  é o catálogo, e a tela não inventa campo que o servidor não declarou. */
export function itensExigidos(
  modelo: ModeloFormulario,
  respostas: RespostasItens,
): number[] {
  const exigidos = new Set(
    modelo.itens.filter((i) => !i.auxiliar).map((i) => i.numero),
  );
  const gate = modelo.gate;
  if (gate) {
    if (modelo.itens.some((i) => i.numero === gate.item)) exigidos.add(gate.item);
    if (estadoDoGate(modelo, respostas) !== 'aberto') {
      for (const n of gate.exigidos) exigidos.delete(n);
    }
  }
  return [...exigidos].sort((a, b) => a - b);
}

function pendenciaItens(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  if (modelo.entryMode !== 'itens') return [];
  const faltam = itensExigidos(modelo, estado.respostas).filter(
    (n) => !temValor(estado.respostas[n]),
  );
  return faltam.length ? [{ tipo: 'itens', faltam }] : [];
}

function pendenciaEscalas(modelo: ModeloFormulario, estado: EstadoFormulario): Pendencia[] {
  if (modelo.entryMode !== 'bruto') return [];
  const faltam = modelo.escalas
    .filter((e) => !temValor(estado.brutos[e.code]))
    .map((e) => e.code);
  // Preenchido mas fora da régua do campo é OUTRA pendência, com outra
  // frase: "preencha" manda procurar um campo vazio que não existe.
  //
  // Isto é UX e SÓ UX. A validação que vale é a do servidor, e ela roda de
  // novo lá aconteça o que acontecer aqui — o que se ganha é o profissional
  // ver o engano antes do clique, em vez de receber 422 depois.
  const invalidos = modelo.escalas
    .filter((e) => temValor(estado.brutos[e.code]))
    .filter((e) => !brutoValido(estado.brutos[e.code], e.entrada))
    .map((e) => e.code);
  return [
    ...(faltam.length ? [{ tipo: 'escalas' as const, faltam }] : []),
    ...(invalidos.length
      ? [{ tipo: 'escalas_invalidas' as const, faltam: invalidos }]
      : []),
  ];
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
    // dimensão que a idade resolve não está na tela, e exigir o que não se
    // vê deixaria o botão desligado sem dizer por quê. A idade em si já é
    // exigida por `validarIdentificacao`, que é quem cobra o campo certo.
    .filter((d) => !resolvidaPelaIdade(modelo, estado.selector, d.code))
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

/** O intervalo de entrada da escala, em uma frase — ou null quando o catálogo
 *  não declara limite nenhum.
 *
 *  Vive aqui, e não na tela, porque a alternativa era um ternário aninhado no
 *  meio do JSX. `bruto_min`/`bruto_max` são limites de ENTRADA declarados no
 *  catálogo; nada a ver com `raw_min`/`raw_max` de linha de norma, que não
 *  chegam ao browser. */
export function textoIntervaloBruto(
  min: number | null,
  max: number | null,
): string | null {
  if (min !== null && max !== null) return `bruto de ${min} a ${max}`;
  if (min !== null) return `bruto mínimo ${min}`;
  if (max !== null) return `bruto máximo ${max}`;
  return null;
}

/** Quantos números de item a mensagem de pendência cita antes de resumir.
 *  Em C-TRF (100 itens) listar tudo faria uma parede de números. */
const ITENS_CITADOS = 6;

/** O que falta, em uma frase. Vive aqui, e não na tela, para ser testável sem
 *  DOM — e porque é a mesma frase em qualquer lugar que precise dela.
 *
 *  Cita os primeiros números: "12 itens sem resposta" manda procurar; "12
 *  itens sem resposta: 3, 7, 9…" diz por onde começar. */
export function textoPendencia(lista: Pendencia[]): string {
  return lista
    .map((p) => {
      if (p.tipo === 'itens') {
        const citados = p.faltam.slice(0, ITENS_CITADOS).join(', ');
        const reticencia = p.faltam.length > ITENS_CITADOS ? '…' : '';
        const plural = p.faltam.length === 1 ? 'item' : 'itens';
        return `${p.faltam.length} ${plural} sem resposta: ${citados}${reticencia}`;
      }
      if (p.tipo === 'dimensoes') return `escolha: ${p.faltam.join(', ')}`;
      if (p.tipo === 'escalas_invalidas') return `corrija: ${p.faltam.join(', ')}`;
      return `preencha: ${p.faltam.join(', ')}`;
    })
    .join(' · ');
}

/** Quanto do protocolo já foi respondido. Só faz sentido em `entry_mode
 *  itens`; nos demais devolve null e a tela não mostra contador.
 *
 *  Existe porque protocolos longos (C-TRF tem 100 itens, ERA-A 75, CONFIAS
 *  70) não davam nenhum sinal de quanto faltava até a rolagem chegar ao fim.
 *  É contagem de preenchimento, não escore: nada aqui pontua. */
export function progresso(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
): { respondidos: number; total: number } | null {
  if (modelo.entryMode !== 'itens' || modelo.itens.length === 0) return null;
  // o contador conta EXATAMENTE o que o envio exige. Incluir o auxiliar
  // faria o PHQ-9 dizer "9 de 10" com o protocolo inteiro respondido, e o
  // profissional procuraria um item que não falta; no SDQ, contar as
  // parcelas do impacto com a porta fechada faria "26 de 29" travar num
  // número que nunca fecha. Por isso o total é dinâmico: abrir a porta
  // acrescenta as três parcelas ao denominador, que é o que passa a faltar.
  const exigidos = itensExigidos(modelo, estado.respostas);
  if (exigidos.length === 0) return null;
  const respondidos = exigidos.filter((n) =>
    temValor(estado.respostas[n]),
  ).length;
  return { respondidos, total: exigidos.length };
}

/** Data de nascimento posterior à data da avaliação.
 *
 *  É a única checagem de data feita no cliente, e ela NÃO calcula idade: só
 *  compara duas strings `yyyy-mm-dd`, que são ordenáveis lexicograficamente.
 *  Quem calcula idade e escolhe norma continua sendo o servidor. Serve para
 *  o profissional ver o engano antes de a requisição sair. */
export function erroOrdemDatas(estado: EstadoFormulario): string | null {
  const { birthDate, evaluationDate } = estado;
  if (!birthDate || !evaluationDate) return null;
  if (birthDate <= evaluationDate) return null;
  return 'A data de nascimento é posterior à data da avaliação.';
}

export function podeEnviar(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
  enviando: boolean,
): boolean {
  if (enviando) return false;
  if (modelo.bloqueio) return false;
  if (modelo.exigeDataNascimento && erroOrdemDatas(estado) !== null) return false;
  return pendencias(modelo, estado).length === 0;
}

/** Estado -> corpo do POST /corrigir. O norm_selector derivado de datas já
 * chega preenchido no estado depois da chamada ao resolver server-side. */
/** O `norm_selector` que VAI no corpo.
 *
 *  Igual ao estado em todos os instrumentos, menos onde a idade resolve
 *  uma dimensão (ver FAIXA_PELA_IDADE). Ali acontecem duas coisas, e as
 *  duas importam:
 *
 *    a dimensão SAI do corpo mesmo que tenha sobrado no estado. Trocar a
 *    conversão já limpa a escolha seguinte, mas uma faixa antiga que
 *    escapasse viajaria como se fosse desta correção — e o servidor a
 *    obedeceria, porque selector explícito manda;
 *
 *    a idade CRUA entra como chave numérica. Nenhuma faixa é calculada
 *    aqui: esta tela não tem a tabela de faixas e não deve ter. Quem
 *    resolve 25 -> 21-30 são os ranges dos `norm_sets`, no servidor.
 *
 *  Idade em branco ou fora de formato não vira chave: o corpo sai sem ela
 *  e o servidor responde que não consegue escolher a norma, que é a
 *  verdade. Inventar 0 seria pior — 0 é uma idade. */
export function selectorDoEnvio(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
  idadeAnos?: string,
): Record<string, string | number> {
  const selector: Record<string, string | number> = { ...estado.selector };
  const regra = faixaPelaIdade(modelo, estado.selector);
  if (!regra) return selector;

  delete selector[regra.dimensao];
  const texto = (idadeAnos ?? '').trim();
  if (!texto) return selector;
  const anos = Number(texto);
  if (Number.isInteger(anos) && anos >= 0) selector[regra.chave] = anos;
  return selector;
}

export function montarPedido(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
  idadeAnos?: string,
): PedidoCorrecao {
  const pedido: PedidoCorrecao = {
    instrument_code: modelo.code,
    norm_selector: selectorDoEnvio(modelo, estado, idadeAnos),
  };

  if (modelo.entryMode === 'itens') {
    const respostas: Record<string, number> = {};
    // só o que está NA TELA agora. Com a porta fechada, uma resposta antiga
    // de 28-30 continua no estado (fechar a porta não apaga o que o
    // profissional já digitou, e reabri-la traz tudo de volta), mas ela não
    // vale mais para este protocolo e não pode ser gravada como se valesse.
    // O servidor zera o IMPACTO de qualquer jeito — o gate dele é a
    // autoridade —, e o que se ganha aqui é o registro coerente: não fica
    // gravado "atrapalha Muito" numa avaliação que diz não haver dificuldade.
    for (const item of itensVisiveis(modelo, estado.respostas)) {
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
      // `modelo.escalas` já exclui a que o servidor calcula: Inibição e
      // Flexibilidade não são digitadas e não viajam daqui. O servidor as
      // monta, e descarta o que o cliente mandar com esses nomes.
      if (temValor(v) && brutoValido(v, escala.entrada)) brutos[escala.code] = v;
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
