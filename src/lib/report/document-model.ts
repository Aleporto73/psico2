// =====================================================================
// MODELO DO DOCUMENTO PROFISSIONAL · o que o compositor desenha.
//
// Puro: sem React, sem rede, sem banco, sem `server-only`. Recebe o que
// já está persistido e devolve o que é desenhável. É aqui que mora tudo
// o que precisa de teste, e é por isso que a tela acima fica burra.
//
// O QUE ESTE ARQUIVO NÃO FAZ, e é o ponto dele: não pontua, não
// classifica, não escolhe corte, não escolhe norma, não converte bruto em
// escore, não recalcula percentil, z ou IC95. Cada número que sai daqui
// entrou vindo de `assessment_results`, calculado pelo servidor na
// conclusão da avaliação. O compositor é de APRESENTAÇÃO.
//
// A regra que atravessa o arquivo: null nunca vira zero, e ausência nunca
// vira coluna. Um percentil que não existe não é "percentil 0" — é uma
// coluna que não deveria estar na tabela.
// =====================================================================

import type { ResultadoEscala } from '@/lib/corrigefacil/api';
import {
  formatCredential,
  getCredentialLabel,
  getProfessionLabel,
} from './professional-identity';

// ---------------------------------------------------------------------
// TABELA DE RESULTADOS
// ---------------------------------------------------------------------

/** Uma linha da tabela. Os campos são exatamente os de `ResultadoEscala`,
 *  sem acréscimo: o que o servidor não mandou não aparece.
 *
 *  `escala` é o CÓDIGO da escala, não o nome por extenso. Não é omissão:
 *  o nome vive em `public.scales`, cuja policy de leitura exige
 *  `has_active_assistant`, e o documento precisa abrir para quem já não
 *  tem o Relatório Pró ativo. Preferimos o código honesto a uma tabela
 *  que esvazia em silêncio quando a assinatura vence. */
export type LinhaResultado = {
  escala: string;
  bruto: number | null;
  escore: number | null;
  percentil: number | null;
  z: number | null;
  ci95: string | null;
  classificacao: string | null;
  disponivel: boolean;
  mensagem: string | null;
};

/** Quais colunas numéricas têm ao menos um valor em toda a tabela.
 *  Coluna inteira vazia não é desenhada — cabeçalho sem dado embaixo
 *  sugere que algo foi perdido. */
export type ColunasVisiveis = {
  bruto: boolean;
  escore: boolean;
  percentil: boolean;
  z: boolean;
  ci95: boolean;
  classificacao: boolean;
};

/** `Object.entries` preserva a ordem de inserção para chaves não
 *  numéricas, e a Edge devolve os resultados já ordenados por
 *  `scales.ordinal`. Então a ordem da tabela é a ordem do instrumento,
 *  sem reordenar nada aqui — reordenar seria decidir uma leitura que o
 *  catálogo já decidiu. */
export function montarLinhas(
  resultados: Record<string, ResultadoEscala>,
): LinhaResultado[] {
  return Object.entries(resultados).map(([escala, r]) => ({
    escala,
    // indisponível não tem valor quantitativo NENHUM: nem o número que
    // por acaso tenha vindo junto. Mesma regra que o gráfico já aplica.
    bruto: r.available ? r.raw : null,
    escore: r.available ? r.score : null,
    percentil: r.available ? r.percentile : null,
    z: r.available ? r.z : null,
    ci95: r.available ? (r.ci95 ?? null) : null,
    classificacao: r.available ? r.classification : null,
    disponivel: r.available,
    mensagem: r.message,
  }));
}

export function colunasVisiveis(linhas: LinhaResultado[]): ColunasVisiveis {
  return {
    bruto: linhas.some((l) => l.bruto !== null),
    escore: linhas.some((l) => l.escore !== null),
    percentil: linhas.some((l) => l.percentil !== null),
    z: linhas.some((l) => l.z !== null),
    ci95: linhas.some((l) => l.ci95 !== null && l.ci95 !== ''),
    classificacao: linhas.some((l) => Boolean(l.classificacao)),
  };
}

// ---------------------------------------------------------------------
// DATA DA AVALIAÇÃO
// ---------------------------------------------------------------------

/** A data que o documento chama de "Data da avaliação".
 *
 *  A precedência `eval_date -> completed_at -> created_at` é a MESMA que
 *  `report-generator.ts` já aplica para o prompt; repeti-la aqui mantém o
 *  documento e a narrativa falando da mesma data. Ela é explícita de
 *  propósito: `created_at` é quando a linha foi gravada, e rotular isso
 *  como data da avaliação sem passar antes por `eval_date` seria afirmar
 *  algo que ninguém informou.
 *
 *  Devolve null quando nenhuma das três existe — cabe a quem chama omitir
 *  a linha, e não escrever uma data inventada. */
export function resolverDataAvaliacao(
  evalDate: string | null | undefined,
  completedAt: string | null | undefined,
  createdAt: string | null | undefined,
): string | null {
  for (const candidato of [evalDate, completedAt, createdAt]) {
    if (typeof candidato === 'string' && candidato.trim()) return candidato;
  }
  return null;
}

/** dd/mm/aaaa a partir de date ou timestamp. Só a data: hora de gravação
 *  não é informação clínica e polui o cabeçalho. */
export function formatarDataDocumento(iso: string | null): string | null {
  if (!iso) return null;
  const somenteData = iso.slice(0, 10);
  const m = somenteData.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// ---------------------------------------------------------------------
// IDENTIDADE PROFISSIONAL
// ---------------------------------------------------------------------

/** Só os campos de `profiles` que o documento imprime. E-mail, telefone,
 *  role e qualquer dado comercial ficam de fora por desenho: o documento
 *  circula, e o cadastro é de login e cobrança. */
export type PerfilDocumento = {
  display_name?: string | null;
  clinic_name?: string | null;
  gender?: string | null;
  profession_category?: string | null;
  credential_type?: string | null;
  credential_number?: string | null;
};

export type IdentidadeDocumento = {
  /** Nome da clínica/consultório. Vazio = a linha não existe. */
  clinica: string;
  /** Nome do PROFISSIONAL. Nunca recebe o nome da clínica. */
  nome: string;
  /** "Psicopedagoga · SBNPp 99/99999", já formatado e sem separador órfão. */
  credenciamento: string;
  /** Há algo publicável? Falso = o bloco inteiro é omitido. */
  temAlgo: boolean;
};

export function montarIdentidade(
  perfil: PerfilDocumento | null,
): IdentidadeDocumento {
  const clinica = perfil?.clinic_name?.trim() ?? '';
  const nome = perfil?.display_name?.trim() ?? '';
  const profissao = getProfessionLabel(
    perfil?.profession_category,
    perfil?.gender,
  );
  // Mesma cautela do prompt: sem SIGLA publicável a credencial inteira
  // some, mesmo com número preenchido. Número sem órgão não é registro.
  const credencial = getCredentialLabel(perfil?.credential_type)
    ? formatCredential(perfil?.credential_type, perfil?.credential_number)
    : '';

  const credenciamento = [profissao, credencial].filter(Boolean).join(' · ');

  return {
    clinica,
    nome,
    credenciamento,
    temAlgo: Boolean(clinica || nome || credenciamento),
  };
}

// ---------------------------------------------------------------------
// DESTINO
// ---------------------------------------------------------------------

/** Os mesmos quatro do produto. Rótulos iguais aos do painel, para o
 *  documento não inventar um quinto nome para a mesma coisa. */
const DESTINO_LABEL: Record<string, string> = {
  family: 'Família',
  school: 'Escola',
  technical: 'Equipe multiprofissional',
  internal: 'Registro interno',
};

export function rotuloDestino(reportType: string | null): string | null {
  if (!reportType) return null;
  return DESTINO_LABEL[reportType] ?? null;
}
