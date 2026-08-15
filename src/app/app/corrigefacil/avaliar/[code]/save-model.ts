// Identificação do avaliado e montagem do POST /avaliacao. Puro.
import type { PedidoAvaliacao } from '@/lib/corrigefacil/api';
import { metaDeTempos } from '@/lib/corrigefacil/tempos-execucao';
import { numeroPtBr } from '@/lib/report/format-age';
import type { IdadeManual, ModeloFormulario } from './form-model';
import { montarPedido, type EstadoFormulario } from './form-state';

export type IdadeCalculada = {
  years: number;
  months: number;
  days: number;
  corrected: boolean;
};

/** Identificação mínima coletada antes da correção.
 *
 *  Nos instrumentos que resolvem norma por data, a idade calculada vem do
 *  servidor e `idadeAnos` fica vazio. Nos demais, o profissional informa a
 *  idade em anos — sem inventar precisão de meses/dias que não foi coletada.
 *  Quanto vale "em anos" (inteiro ou decimal, e de quanto a quanto) é do
 *  instrumento, e está em IDADE_MANUAL. */
export type IdentificacaoAvaliado = {
  nome: string;
  idadeAnos: string;
  idadeCalculada: IdadeCalculada | null;
  respondente: string;
  /** Tempos de execução, como TEXTO do campo — a conversão é de quem grava.
   *
   *  Indexado pela chave do `subject_meta` para não haver um segundo lugar
   *  dizendo quais tempos existem: quem declara é TEMPOS_POR_INSTRUMENTO.
   *  OPCIONAL: os 19 instrumentos que não declaram tempo nenhum nunca a
   *  preenchem, e quem monta identificação sem saber que tempos existem
   *  continua compilando. */
  tempos?: Record<string, string>;
};

export function identificacaoInicial(): IdentificacaoAvaliado {
  return {
    nome: '',
    idadeAnos: '',
    idadeCalculada: null,
    respondente: '',
    tempos: {},
  };
}

export type ErroIdentificacao = 'nome_vazio' | 'idade_vazia' | 'idade_invalida';

/** O que a tela precisa saber sobre o instrumento para cobrar identificação.
 *
 *  É o `ModeloFormulario` recortado, e recebê-lo inteiro seria o mesmo —
 *  mas um booleano solto não: passar `exigeDataNascimento` sozinho deixava
 *  a regra de idade de fora, e quem esquecesse dela validava 1,5 contra a
 *  faixa genérica sem o compilador dizer nada. */
export type RegraDeIdentificacao = Pick<
  ModeloFormulario,
  'exigeDataNascimento' | 'idadeManual'
>;

/** O texto do campo -> a idade, ou null se não serve.
 *
 *  É a ÚNICA leitura de idade manual do produto: validação, mensagem e
 *  persistência chamam esta função. Duas leituras divergentes deixariam
 *  gravar uma idade que a validação recusaria, ou o contrário.
 *
 *  Recusa vazio, texto, NaN e Infinity; recusa fração onde a regra não
 *  admite decimal; e recusa fora de [min, max]. Não arredonda nada: 1.5
 *  entra 1.5 ou não entra. */
export function idadeManualValida(
  texto: string,
  regra: IdadeManual,
): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const idade = Number(limpo);
  if (!Number.isFinite(idade)) return null;
  if (!regra.decimal && !Number.isInteger(idade)) return null;
  if (idade < regra.min || idade > regra.max) return null;
  return idade;
}

export function validarIdentificacao(
  dados: IdentificacaoAvaliado,
  regra: RegraDeIdentificacao,
): ErroIdentificacao[] {
  const erros: ErroIdentificacao[] = [];
  if (!dados.nome.trim()) erros.push('nome_vazio');

  if (!regra.exigeDataNascimento) {
    if (!dados.idadeAnos.trim()) {
      erros.push('idade_vazia');
    } else if (idadeManualValida(dados.idadeAnos, regra.idadeManual) === null) {
      erros.push('idade_invalida');
    }
  }

  return erros;
}

/** A faixa da regra, escrita como o profissional lê: "de 1,5 a 5". */
export function faixaDaIdadeManual(regra: IdadeManual): string {
  return `de ${numeroPtBr(regra.min)} a ${numeroPtBr(regra.max)}`;
}

/** Ajuda embaixo do campo de idade. */
export function textoDoCampoIdade(regra: IdadeManual): string {
  return regra.decimal
    ? `Idade em anos — ${faixaDaIdadeManual(regra)}.`
    : 'Anos completos.';
}

/** A mensagem de erro sai da MESMA regra que recusou o valor.
 *
 *  Onde o decimal é aceito, "anos completos" seria uma instrução falsa: o
 *  profissional apagaria o ",5" que o instrumento pede. */
export function textoErroIdentificacao(
  erro: ErroIdentificacao,
  regra: IdadeManual,
): string {
  if (erro === 'nome_vazio') return 'Informe o nome do avaliado.';
  if (erro === 'idade_vazia') return 'Informe a idade do avaliado.';
  return regra.decimal
    ? `Informe a idade em anos, ${faixaDaIdadeManual(regra)}.`
    : 'Informe uma idade válida em anos completos.';
}

export function podeSalvar(
  dados: IdentificacaoAvaliado,
  regra: RegraDeIdentificacao,
  salvando: boolean,
  jaSalvo: boolean,
): boolean {
  if (salvando || jaSalvo) return false;
  if (validarIdentificacao(dados, regra).length > 0) return false;
  if (regra.exigeDataNascimento && dados.idadeCalculada === null) return false;
  return true;
}

/** Reaproveita respostas, brutos e norm_selector já preenchidos e acrescenta
 *  apenas identificação. `subject_label` recebe o nome; a idade fica em
 *  `subject_meta.age_at_evaluation` para o histórico/Relatório Pró.
 *
 *  Para idade manual, salva só `{ years }` — com a precisão informada. No
 *  C-TRF, 1,5 é gravado 1.5: arredondar para 1 seria trocar a idade do
 *  avaliado no histórico. Para idade calculada por data, preserva
 *  exatamente years/months/days/corrected devolvidos pelo servidor. */
export function montarPedidoAvaliacao(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
  dados: IdentificacaoAvaliado,
): PedidoAvaliacao {
  const meta: Record<string, unknown> = {};
  const respondente = dados.respondente.trim();
  if (respondente) meta.respondent_name = respondente;

  if (modelo.exigeDataNascimento) {
    if (dados.idadeCalculada) {
      meta.age_at_evaluation = { ...dados.idadeCalculada };
    }
  } else {
    const idade = idadeManualValida(dados.idadeAnos, modelo.idadeManual);
    if (idade !== null) meta.age_at_evaluation = { years: idade };
  }

  // Tempos de execução: REGISTRO DESCRITIVO. Entram no mesmo `subject_meta`
  // que já carrega respondente e idade — nenhuma coluna, nenhuma tabela,
  // nenhuma migration.
  //
  // Só o instrumento que DECLARA tempo grava tempo: valor digitado e depois
  // trocado para outro instrumento não viaja junto. E campo vazio não vira
  // chave — `subject_meta` sem a chave é "não informado", que é diferente
  // de zero segundo.
  // MESMA regra que a tela do resultado usa para mostrar os tempos antes de
  // salvar: o que aparece lá é exatamente o que é gravado aqui.
  Object.assign(meta, metaDeTempos(modelo.code, dados.tempos));

  return {
    // a MESMA idade que a correção usou para resolver a faixa: o que é
    // gravado tem de ser o que foi corrigido, e não uma segunda leitura
    ...montarPedido(modelo, estado, dados.idadeAnos),
    subject_label: dados.nome.trim(),
    subject_meta: meta,
  };
}
