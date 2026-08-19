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

import type {
  RespostaAuxiliar,
  ResultadoEscala,
} from '@/lib/corrigefacil/api';
import {
  metricasDaEscala,
  textoDePercentil,
} from '@/lib/corrigefacil/metricas-instrumento';
// O MESMO formatador do FDT — não um segundo. `zFormatado` já é a régua
// de duas casas do produto para z ("como o produto já escreve os outros
// decimais", no comentário dela); duas cópias divergiriam no
// arredondamento, e a mesma avaliação sairia com um z aqui e outro no FDT.
import { zFormatado } from '@/lib/corrigefacil/fdt-derivado';
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
  /** O bruto e o escore como o documento IMPRIME.
   *
   *  Nos 20 instrumentos em que as duas medidas são a mesma conta, é o
   *  número e nada mais — "12". No SNAP-IV-26, em que `raw` é intensidade
   *  (0 a 3) e `score` é contagem de sintomas, sai com a régua junto —
   *  "12 / 27" e "4 / 9" —, porque os tetos são diferentes e o número
   *  sozinho não diz qual das duas medidas está ali.
   *
   *  Nada é calculado: o teto é metadado do instrumento e o valor é o que
   *  o servidor gravou. Ver `@/lib/corrigefacil/metricas-instrumento`, que
   *  é o MESMO lugar de onde as telas tiram esses nomes. */
  brutoTexto: string | null;
  escoreTexto: string | null;
  /** A Média por item, quando o instrumento a declara — hoje só o
   *  SNAP-IV-18: "1,67 / 3".
   *
   *  É DERIVAÇÃO DE APRESENTAÇÃO, e por isso só existe como texto. Não há
   *  `media: number` aqui de propósito: um número neste tipo pareceria ter
   *  vindo do servidor, e ele não veio — não está em `assessment_results`,
   *  não é norma, não é escala e não classifica nada. Quem divide é
   *  `metricas-instrumento`, uma vez só. */
  mediaTexto: string | null;
  percentil: number | null;
  /** O percentil COMO ele é impresso. Igual ao número em quase todos os
   *  casos; no BPA-2, "< 1" onde o bruto fica abaixo do primeiro ponto
   *  tabelado e o servidor gravou `percentile: null`.
   *
   *  Existe ao lado de `percentil` pelo mesmo motivo de `mediaTexto`: o
   *  número é o que o servidor gravou e continua sendo, e o texto é como
   *  ele se escreve. Quem decide é `textoDePercentil`, uma vez só. */
  percentilTexto: string | null;
  z: number | null;
  /** `z` como o documento IMPRIME: duas casas, vírgula — a mesma régua
   *  que o FDT já usa (`zFormatado`).
   *
   *  Mesmo par de `brutoTexto`/`escoreTexto`/`percentilTexto` — `z`
   *  continua `number` para quem precisa do valor exato (nenhum lugar
   *  precisa hoje), e `zTexto` é só apresentação. */
  zTexto: string | null;
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
  media: boolean;
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
  instrumento?: string,
): LinhaResultado[] {
  return Object.entries(resultados).map(([escala, r]) => {
    // indisponível não tem valor quantitativo NENHUM: nem o número que
    // por acaso tenha vindo junto. Mesma regra que o gráfico já aplica.
    const bruto = r.available ? r.raw : null;
    const escore = r.available ? r.score : null;
    const met = metricasDaEscala(instrumento, escala, bruto, escore);
    return {
      escala,
      bruto,
      escore,
      brutoTexto: met.bruto?.texto ?? null,
      escoreTexto: met.escore?.texto ?? null,
      // a média sai da MESMA derivação central. Nenhuma divisão por 9 é
      // escrita aqui nem no componente do documento.
      mediaTexto: met.media?.texto ?? null,
      percentil: r.available ? r.percentile : null,
      percentilTexto: textoDePercentil(instrumento, r),
      z: r.available ? r.z : null,
      zTexto: r.available ? zFormatado(r.z) : null,
      ci95: r.available ? (r.ci95 ?? null) : null,
      classificacao: r.available ? r.classification : null,
      disponivel: r.available,
      mensagem: r.message,
    };
  });
}

/** Os cabeçalhos das duas colunas numéricas do documento.
 *
 *  Reexportado do módulo compartilhado de propósito: o documento, o PDF, a
 *  tela de correção, o histórico e o prompt do Relatório Pró leem a mesma
 *  tabela. Um segundo mapa de rótulos aqui divergiria no primeiro ajuste. */
export { rotulosDasColunas } from '@/lib/corrigefacil/metricas-instrumento';

/** Uma resposta auxiliar como o DOCUMENTO a imprime. */
export type LinhaAuxiliar = {
  number: number;
  pergunta: string;
  resposta: string;
};

/** As respostas auxiliares prontas para o documento.
 *
 *  O documento imprime isto DETERMINISTICAMENTE: o valor sai aqui porque
 *  foi respondido, e não porque a narrativa resolveu citá-lo. A IA pode
 *  interpretar o dado no texto; alterá-lo ela não pode, porque não é ela
 *  quem o imprime.
 *
 *  Nada é calculado nem reclassificado: `label` é o rótulo que o servidor
 *  devolveu para o valor respondido. Sem rótulo, o valor cru — nunca um
 *  texto inventado no cliente. Sem rótulo E sem valor, a linha não existe:
 *  imprimir a pergunta com a resposta em branco diria que ela ficou sem
 *  resposta, que é outra afirmação. */
export function montarAuxiliares(
  respostas: RespostaAuxiliar[] | undefined,
): LinhaAuxiliar[] {
  return (respostas ?? []).flatMap((r) => {
    const resposta = r.label ?? (r.value !== null ? String(r.value) : null);
    if (resposta === null || resposta === '') return [];
    return [{ number: r.number, pergunta: r.text, resposta }];
  });
}

export function colunasVisiveis(linhas: LinhaResultado[]): ColunasVisiveis {
  return {
    bruto: linhas.some((l) => l.bruto !== null),
    // a coluna da média existe só onde o instrumento a declara. Nos outros
    // 20 nenhuma linha tem `mediaTexto`, então ela não é desenhada — e o
    // documento deles sai com as mesmas colunas de sempre.
    media: linhas.some((l) => l.mediaTexto !== null),
    escore: linhas.some((l) => l.escore !== null),
    // o TEXTO manda: no BPA-2 a coluna existe com percentil nulo, porque
    // "< 1" é o valor daquela linha. Sem isso a coluna sumiria justamente
    // onde ela tem o que dizer.
    percentil: linhas.some((l) => l.percentilTexto !== null),
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
// INSTRUMENTO
// ---------------------------------------------------------------------

/** "CES-D — Escala de Rastreamento Populacional para Depressão".
 *
 *  O código sozinho não diz nada a quem recebe o documento; o nome completo
 *  vem do catálogo e é melhoria de APRESENTAÇÃO — sem ele, o código continua
 *  valendo, e é por isso que `nome` é opcional.
 *
 *  Nada aqui é tabelado: não há mapa de instrumentos, não há nome escrito no
 *  código. O que entra é o que o catálogo devolveu. */
export function rotuloInstrumento(
  code: string,
  nome?: string | null,
): string {
  const codigo = code.trim();
  const completo = nome?.trim() ?? '';

  if (!completo || completo === codigo) return codigo;

  // Catálogo que já devolve "CES-D — Escala…" não pode virar
  // "CES-D — CES-D — Escala…". A checagem é por PREFIXO seguido de
  // separador ou espaço: um nome que apenas contenha as letras do código no
  // meio da frase não conta como duplicação.
  const semPrefixo = completo.slice(codigo.length);
  if (completo.startsWith(codigo) && /^[\s—–-]/.test(semPrefixo)) {
    return completo;
  }

  return `${codigo} — ${completo}`;
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
