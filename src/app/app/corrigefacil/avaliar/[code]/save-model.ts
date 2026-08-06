// Identificação do avaliado e montagem do POST /avaliacao. Puro.
import type { PedidoAvaliacao } from '@/lib/corrigefacil/api';
import type { ModeloFormulario } from './form-model';
import { montarPedido, type EstadoFormulario } from './form-state';

/** O que a tela coleta antes de gravar.
 *
 *  A Edge NÃO exige nenhum destes: `subject_label` vira null e `subject_meta`
 *  vira {} quando ausentes. O rótulo é exigido AQUI, por decisão de tela — um
 *  histórico inteiro de "Sem nome" é inútil para quem precisa reabrir um
 *  registro depois. É regra de UX, não de contrato. */
export type IdentificacaoAvaliado = {
  rotulo: string;
  respondente: string;
  profissional: string;
};

export function identificacaoInicial(): IdentificacaoAvaliado {
  return { rotulo: '', respondente: '', profissional: '' };
}

export type ErroIdentificacao = 'rotulo_vazio';

export function validarIdentificacao(
  dados: IdentificacaoAvaliado,
): ErroIdentificacao[] {
  const erros: ErroIdentificacao[] = [];
  if (!dados.rotulo.trim()) erros.push('rotulo_vazio');
  return erros;
}

export const TEXTO_ERRO_IDENTIFICACAO: Record<ErroIdentificacao, string> = {
  rotulo_vazio: 'Informe as iniciais ou um código para identificar o avaliado.',
};

export function podeSalvar(
  dados: IdentificacaoAvaliado,
  salvando: boolean,
  jaSalvo: boolean,
): boolean {
  if (salvando || jaSalvo) return false;  // trava de duplo envio
  return validarIdentificacao(dados).length === 0;
}

/** Reaproveita respostas, brutos e norm_selector JÁ preenchidos — nada é
 *  perguntado de novo — e acrescenta só a identificação.
 *
 *  As chaves de `subject_meta` seguem as que a tela original do CorrigeFácil
 *  usa (`ui/tela.html`): profissional e respondent_name. Campo em branco não
 *  entra: gravar string vazia sujaria o registro. */
export function montarPedidoAvaliacao(
  modelo: ModeloFormulario,
  estado: EstadoFormulario,
  dados: IdentificacaoAvaliado,
): PedidoAvaliacao {
  const meta: Record<string, unknown> = {};
  const respondente = dados.respondente.trim();
  const profissional = dados.profissional.trim();
  if (respondente) meta.respondent_name = respondente;
  if (profissional) meta.profissional = profissional;

  return {
    ...montarPedido(modelo, estado),
    subject_label: dados.rotulo.trim(),
    subject_meta: meta,
  };
}
