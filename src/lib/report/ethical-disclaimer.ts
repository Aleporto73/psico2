// =====================================================================
// NOTA DE RESPONSABILIDADE PROFISSIONAL · o fechamento do documento.
//
// Ela é um PADRÃO PRUDENTE, não uma trava. Quem assina o relatório é o
// profissional, e o documento é dele: relatório novo nasce com a nota, e o
// editor permite mantê-la, reescrevê-la ou removê-la.
//
// O que mudou e por quê: o texto anterior chamava o documento de "rascunho
// de apoio operacional" que "não substitui avaliação clínica". Isso servia
// enquanto a saída era um rascunho para colar no Word — e passou a
// contradizer o produto no momento em que ele virou documento profissional
// impresso, com cabeçalho, tabela, gráfico e assinatura. Um laudo que se
// declara provisório não é entregável.
//
// As travas CLÍNICAS não moram aqui e não mudaram: sem diagnóstico, sem
// laudo definitivo, sem recálculo, sem escolha de norma — tudo isso segue
// no prompt e no motor.
// =====================================================================

/** O fechamento padrão dos relatórios novos. */
export const NOTA_PROFISSIONAL =
  'Nota de responsabilidade profissional: Este relatório deve ser interpretado em conjunto com os demais dados disponíveis e com o julgamento técnico do profissional responsável. As informações apresentadas devem observar os procedimentos, critérios e normas técnicas aplicáveis aos instrumentos utilizados.';

/** O texto que os relatórios ANTERIORES a esta mudança carregam no fim.
 *
 *  Existe só para o editor RECONHECÊ-LO como nota final e oferecê-lo no
 *  campo editável — nunca para reescrevê-lo automaticamente. Quem tem um
 *  relatório antigo decide se mantém, ajusta ou apaga. Migrar o texto por
 *  conta própria seria reescrever documento que já circulou. */
export const NOTA_LEGADA =
  'Observação: este texto é um rascunho de apoio operacional elaborado a partir dos dados fornecidos. Ele deve ser revisado, complementado e validado pelo profissional responsável. Não substitui avaliação clínica, manual técnico, aplicação padronizada, teste original ou interpretação profissional.';

/** As duas formas reconhecidas como nota final ao abrir a edição. */
export const NOTAS_RECONHECIDAS = [NOTA_PROFISSIONAL, NOTA_LEGADA] as const;
