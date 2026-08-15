// Identificação do avaliado e montagem do POST /avaliacao. Puro.
import type { PedidoAvaliacao } from '@/lib/corrigefacil/api';
import { metaDeTempos } from '@/lib/corrigefacil/tempos-execucao';
import type { ModeloFormulario } from './form-model';
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
 *  servidor e `idadeAnos` fica vazio. Nos demais, o profissional informa só
 *  anos completos — sem inventar precisão de meses/dias que não foi coletada. */
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

export function validarIdentificacao(
  dados: IdentificacaoAvaliado,
  exigeDataNascimento: boolean,
): ErroIdentificacao[] {
  const erros: ErroIdentificacao[] = [];
  if (!dados.nome.trim()) erros.push('nome_vazio');

  if (!exigeDataNascimento) {
    const idadeTexto = dados.idadeAnos.trim();
    if (!idadeTexto) {
      erros.push('idade_vazia');
    } else {
      const idade = Number(idadeTexto);
      if (!Number.isInteger(idade) || idade < 0 || idade > 130) {
        erros.push('idade_invalida');
      }
    }
  }

  return erros;
}

export const TEXTO_ERRO_IDENTIFICACAO: Record<ErroIdentificacao, string> = {
  nome_vazio: 'Informe o nome do avaliado.',
  idade_vazia: 'Informe a idade do avaliado.',
  idade_invalida: 'Informe uma idade válida em anos completos.',
};

export function podeSalvar(
  dados: IdentificacaoAvaliado,
  exigeDataNascimento: boolean,
  salvando: boolean,
  jaSalvo: boolean,
): boolean {
  if (salvando || jaSalvo) return false;
  if (validarIdentificacao(dados, exigeDataNascimento).length > 0) return false;
  if (exigeDataNascimento && dados.idadeCalculada === null) return false;
  return true;
}

/** Reaproveita respostas, brutos e norm_selector já preenchidos e acrescenta
 *  apenas identificação. `subject_label` recebe o nome; a idade fica em
 *  `subject_meta.age_at_evaluation` para o histórico/Relatório Pró.
 *
 *  Para idade manual, salva só `{ years }`. Para idade calculada por data,
 *  preserva exatamente years/months/days/corrected devolvidos pelo servidor. */
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
    const idade = Number(dados.idadeAnos.trim());
    if (Number.isInteger(idade) && idade >= 0 && idade <= 130) {
      meta.age_at_evaluation = { years: idade };
    }
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
    ...montarPedido(modelo, estado),
    subject_label: dados.nome.trim(),
    subject_meta: meta,
  };
}
