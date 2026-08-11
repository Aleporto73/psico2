// =====================================================================
// O AVISO ÉTICO OBRIGATÓRIO · uma constante, um texto.
//
// Ele nasceu dentro de `api/assistant/generate/route.ts`. Saiu de lá porque
// passou a ter um segundo dono: o editor de narrativa precisa RETIRÁ-LO da
// área editável, e a RPC precisa REANEXÁ-LO ao salvar. Três lugares
// comparando a mesma frase é onde uma vírgula divergente vira aviso
// duplicado no documento — ou, pior, nenhum.
//
// Este módulo não tem dependência de servidor: é string. Backend, cliente e
// migration falam do mesmo texto.
//
// NÃO transformar em configuração, template ou tabela. É um parágrafo
// jurídico-profissional fixo, e é assim que ele deve permanecer.
// =====================================================================

export const AVISO_FINAL =
  'Observação: este texto é um rascunho de apoio operacional elaborado a partir dos dados fornecidos. Ele deve ser revisado, complementado e validado pelo profissional responsável. Não substitui avaliação clínica, manual técnico, aplicação padronizada, teste original ou interpretação profissional.';
