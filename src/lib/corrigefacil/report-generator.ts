import { NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openai';
import { formatAgeAtEvaluation } from '@/lib/report/format-age';
import {
  metricasDaEscala,
  orientacaoParaIA,
  rotulosDasColunas,
  textoDePercentil,
} from '@/lib/corrigefacil/metricas-instrumento';
import { temposParaTexto } from './tempos-execucao';
import { derivadoDoMeta, derivadoParaTexto } from './confias-derivado';
import { derivadoPhq9DoMeta, phq9ParaTexto } from './phq9-derivado';
import { derivadoFdtDoMeta, fdtParaTexto } from './fdt-derivado';
import {
  formatCredential,
  getCredentialLabel,
  getProfessionLabel,
} from '@/lib/report/professional-identity';

// A formatação da idade mudou de arquivo, não de comportamento: o
// documento profissional precisa dela no cliente e este módulo é
// server-only por causa de `@/lib/openai`. Continua exportada daqui para
// não quebrar quem já a importava.
export { formatAgeAtEvaluation };

type ReportType = 'family' | 'school' | 'technical' | 'internal';

const REPORT_TYPES: ReadonlySet<ReportType> = new Set([
  'family',
  'school',
  'technical',
  'internal',
]);

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  family: 'Pais / Família',
  school: 'Escola',
  technical: 'Equipe multiprofissional',
  internal: 'Registro interno',
};

/** O que muda por destino é a VOZ e a profundidade — nunca a estrutura nem
 *  o que pode ser afirmado. As cinco seções são as mesmas nos quatro. */
const DESTINATION_RULES: Record<ReportType, string> = {
  family:
    'Escreva para quem não é da área: linguagem acessível, respeitosa, sem jargão, e sem alarmismo. ' +
    'Traduza a classificação em termos compreensíveis, mantendo o rótulo exato ao mencioná-lo. ' +
    // Antes esta linha pedia "fale do que observar no cotidiano em nível
    // geral" — um convite direto a nomear domínios, e em contradição com a
    // regra geral que proíbe justamente isso. A família recebe PROCESSO.
    'Ajude a família a entender COMO usar este resultado: guardá-lo junto do acompanhamento já existente, ' +
    'conversar sobre ele com o profissional responsável e evitar decisões tomadas a partir de um resultado isolado. ' +
    'NÃO oriente a família a procurar sintomas, comportamentos ou mudanças que não tenham sido fornecidos: ' +
    'mandar observar o que ninguém relatou transforma o relatório em fonte de preocupação inventada. ' +
    'Não responsabilize pais ou cuidadores pelo resultado, não sugira diagnóstico e não antecipe evolução.',
  school:
    'Escreva para o contexto educacional: linguagem pedagógica e funcional, voltada a observação, ' +
    'acompanhamento e comunicação entre escola, família e equipe. ' +
    'Não afirme dificuldade de aprendizagem, problema de comportamento ou queda de rendimento que não tenha sido fornecido. ' +
    'Um resultado emocional ou comportamental NÃO é causa de desempenho escolar: não transforme um no outro. ' +
    'Sem contexto escrito pelo profissional, NÃO nomeie o que a escola deve observar — nada de participação nas atividades, ' +
    'rendimento, comportamento, atenção, interação social, rotina, engajamento ou bem-estar como objetos de acompanhamento. ' +
    'Você não sabe o que a escola vai encontrar, e antecipar isso inventa um domínio que ninguém forneceu. ' +
    'Correto: "integrar o resultado às observações disponíveis no contexto escolar". ' +
    'Incorreto: "acompanhar mudanças na participação nas atividades". ' +
    'O que a escola PODE receber são orientações de processo: integrar o resultado ao que já se observa, ' +
    'registrar informações pertinentes de modo objetivo, preservar confidencialidade, evitar exposição ou rotulação ' +
    'a partir de um resultado isolado e manter comunicação com família e equipe quando pertinente.',
  technical:
    'Escreva para outros profissionais: linguagem técnica e precisa. ' +
    'Integre os valores e classificações disponíveis, destaque convergências e diferenças entre as escalas ' +
    'e explicite os limites interpretativos do que foi aplicado. ' +
    'O texto deve facilitar a integração com entrevista, observação e outros instrumentos, sem substituí-los. ' +
    'Diferencie explicitamente achado de RASTREIO de conclusão clínica, e oriente o confronto com os dados que a equipe já tem. ' +
    'Não formule hipótese diagnóstica nova.',
  internal:
    'Registro operacional do próprio profissional: MESMA estrutura de cinco seções, porém curta e direta. ' +
    // "o que acompanhar" puxava para nomear domínio; o registro interno
    // organiza PROVIDÊNCIA, não sintoma a vigiar.
    'Evite prosa: achado, limite do que ele permite concluir, o que integrar, registrar ou revisar, e a próxima providência. ' +
    'Frases objetivas valem mais que parágrafos desenvolvidos.',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_NOTES_CHARS = 6000;

type ResultRow = {
  raw: number | string | null;
  score: number | string | null;
  percentile: number | string | null;
  z_score: number | string | null;
  classification: string | null;
  ci95: string | null;
  available: boolean;
  message: string | null;
  flags: unknown;
  scales: unknown;
};

type InstrumentData = {
  code?: string;
  name?: string;
};

type ScaleData = {
  code?: string;
  name?: string;
  ordinal?: number;
};

/** Os campos de `profiles` que o cabeçalho do relatório usa. `gender` só
 *  serve para flexionar a profissão; nenhum outro dado de conta entra. */
type ProfessionalProfile = {
  name?: string | null;
  display_name?: string | null;
  gender?: string | null;
  profession_category?: string | null;
  credential_type?: string | null;
  credential_number?: string | null;
};

function normalizeReportType(raw: unknown): ReportType {
  if (typeof raw === 'string' && REPORT_TYPES.has(raw as ReportType)) {
    return raw as ReportType;
  }
  return 'technical';
}

function oneRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  if (value && typeof value === 'object') return value as T;
  return null;
}

function cleanScalar(value: number | string | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

/** Os resultados fechados, no formato que o modelo recebe.
 *
 *  `instrumento` muda apenas os RÓTULOS das duas colunas numéricas, e só
 *  onde o instrumento separa as duas medidas: no SNAP-IV-26 elas viram
 *  "pontuação bruta" e "sintomas presentes", com o teto de cada régua
 *  junto. Sem isso chegam ao modelo como "bruto: 12" e "escore: 4", sem
 *  dizer que 12 é de 27 e 4 é de 9 — e a narrativa cruza as duas.
 *
 *  Os nomes saem de `metricas-instrumento`, o MESMO módulo que a tela, o
 *  histórico e o documento usam. Nada é recalculado: os números são os que
 *  o servidor gravou, e continuam saindo daqui como vieram. */
export function formatClosedResults(
  rows: ResultRow[],
  instrumento?: string,
): string {
  const rotulos = rotulosDasColunas(instrumento);
  return rows
    .map((row) => {
      const scale = oneRelation<ScaleData>(row.scales);
      const name = scale?.name?.trim() || scale?.code?.trim() || 'Escala';
      const code = scale?.code?.trim();
      const lines = [`${name}${code && code !== name ? ` (${code})` : ''}`];

      const raw = cleanScalar(row.raw);
      const score = cleanScalar(row.score);
      // O percentil que o servidor gravou, e — só quando ele é nulo — o
      // texto da regra central. No BPA-2 o bruto abaixo do primeiro ponto
      // tabelado chega aqui com `percentile: null` e classificação da
      // primeira faixa, e o que o modelo tem de receber é "< 1": mandar
      // `null` esconderia o achado, e mandar 0 ou 1 seria inventar um
      // número que a fonte não dá. Nenhuma linha com número muda: o
      // `??` só age onde não havia nada a escrever.
      const percentile =
        cleanScalar(row.percentile) ??
        textoDePercentil(instrumento, {
          available: row.available,
          percentile: row.percentile,
          classification: row.classification,
        });
      const z = cleanScalar(row.z_score);
      // o teto acompanha o número onde as duas réguas são diferentes; onde
      // não são, `metricasDaEscala` devolve o número puro, como sempre
      const met = metricasDaEscala(
        instrumento,
        code ?? '',
        raw === null ? null : Number(raw),
        score === null ? null : Number(score),
      );
      if (raw !== null) {
        lines.push(`- ${rotulos.bruto.toLowerCase()}: ${met.bruto?.texto ?? raw}`);
      }
      // A Média por item vai ao modelo como DADO já derivado — o texto sai
      // da mesma função que a tela usa, e nenhuma divisão acontece aqui. O
      // modelo não é convidado a calculá-la; ele a recebe pronta, como
      // recebe todo o resto.
      //
      // `row.available` é a guarda: a derivação funciona a partir de `raw`
      // sozinho, então uma linha indisponível que tenha trazido um número
      // junto renderia uma média com cara de resultado. O documento já
      // suprime os quantitativos nesse caso — `montarLinhas` zera tudo
      // quando `available` é false — e o prompt tem de dizer a mesma coisa.
      if (row.available && met.media && rotulos.media) {
        lines.push(`- ${rotulos.media.toLowerCase()}: ${met.media.texto}`);
      }
      if (score !== null) {
        lines.push(
          `- ${rotulos.escore.toLowerCase()}: ${met.escore?.texto ?? score}`,
        );
      }
      if (percentile !== null) lines.push(`- percentil: ${percentile}`);
      if (z !== null) lines.push(`- z: ${z}`);
      if (row.classification?.trim()) lines.push(`- classificação: ${row.classification.trim()}`);
      if (row.ci95?.trim()) lines.push(`- IC95: ${row.ci95.trim()}`);
      lines.push(`- disponível: ${row.available ? 'sim' : 'não'}`);
      if (row.message?.trim()) lines.push(`- mensagem: ${row.message.trim()}`);

      return lines.join('\n');
    })
    .join('\n\n');
}

/** A regra dos derivados congelados.
 *
 *  Entra no system prompt SÓ quando a avaliação tem snapshot. Sem isso ela
 *  viajaria em todo relatório dos outros 20 instrumentos falando de um
 *  bloco que não existe ali — e regra sobre dado ausente é a forma mais
 *  fácil de o modelo inventar o dado.
 *
 *  Os três "não recalcule" são o eco exato da REGRA CENTRAL, aplicados às
 *  três medidas que o bloco traz. A separação entre nível equivalente e
 *  hipótese de escrita está aqui porque os dois usam a MESMA nomenclatura
 *  de escrita: sem dizê-lo, a divergência entre eles é lida como erro do
 *  sistema, e o modelo "conserta" um pelo outro. */
const REGRA_DERIVADOS = `
DADOS DERIVADOS CONGELADOS:
O bloco "DADOS DERIVADOS CONGELADOS DO CONFIAS" tem exatamente a mesma força dos resultados por escala. Não recalcule o percentual de nenhuma habilidade, não recalcule a classificação de nenhuma habilidade e não recalcule o nível equivalente. Reproduza os rótulos exatamente como vieram, sem sinônimo e sem gradação própria.
"Nível equivalente (escore sílaba)" NÃO é a hipótese de escrita escolhida pelo profissional para a seleção normativa. Os dois usam a mesma nomenclatura e podem divergir sem que nenhum esteja errado: o nível é leitura adicional do escore de Sílaba. Não o apresente como a hipótese informada, não o corrija pela hipótese e não trate a diferença entre os dois como inconsistência.
O Perfil por Habilidade PODE ser usado para descrever o perfil observado — quais tarefas ficaram consolidadas, quais estão em desenvolvimento e quais ainda não se consolidaram —, sempre com os rótulos recebidos. Não nomeie habilidade que não esteja nas linhas recebidas, não crie categoria de agrupamento que ninguém forneceu e não converta o perfil em diagnóstico, causa ou prognóstico.
`;

/** A regra do derivado do PHQ-9.
 *
 *  Entra no system prompt SÓ quando a avaliação tem snapshot, pela mesma
 *  razão de REGRA_DERIVADOS: regra sobre dado ausente é a forma mais fácil
 *  de o modelo inventar o dado.
 *
 *  As três proibições do meio são o ponto todo desta regra. Um alerta de
 *  item 9 posto diante de um modelo de linguagem é um convite a escrever
 *  "risco suicida presente" — que é uma afirmação clínica que ninguém fez,
 *  que o instrumento não mede e que o texto do alerta explicitamente não
 *  faz. O que o dado diz é que houve resposta positiva e que cabe
 *  investigar; a diferença entre as duas frases é o que separa um
 *  rastreamento de um laudo. */
const REGRA_PHQ9 = `
DADOS DERIVADOS CONGELADOS DO PHQ-9:
O bloco "DADOS DERIVADOS CONGELADOS DO PHQ-9" tem exatamente a mesma força dos resultados por escala. Não recalcule o ponto de corte, não recompare a pontuação total com ele e não reescreva a frase de rastreamento — reproduza-a como veio.
O rastreamento NÃO é a classificação. As duas saem da mesma pontuação total e dizem coisas diferentes: a classificação é a faixa de intensidade, o rastreamento é uma leitura de triagem com um corte só. Apresente cada uma pelo que é e não trate a existência das duas como contradição.
Rastreamento NÃO é diagnóstico. Não converta "igual ou acima do ponto de corte" em depressão, transtorno, quadro depressivo ou caso confirmado.
ALERTA DO ITEM 9: quando o bloco trouxer o alerta, ele deve ser mencionado, e EXATAMENTE no que ele afirma — houve resposta positiva no item 9 e cabe investigação clínica adicional. NÃO declare risco suicida, ideação suicida ativa, gravidade ou urgência: o instrumento não mede nenhuma dessas coisas, e o item respondido positivamente é indicação de INVESTIGAR, não conclusão sobre risco. Não estime probabilidade, não classifique o risco e não prescreva conduta, encaminhamento ou protocolo específico. Quem avalia risco é o profissional, em entrevista.
Quando o alerta NÃO vier no bloco, não mencione o item 9, não afirme ausência de ideação e não escreva que não há risco: o silêncio ali é ausência de resposta positiva, e não avaliação negativa de risco.
`;

/** A regra do derivado do FDT.
 *
 *  Entra no system prompt SÓ quando a avaliação tem snapshot, pela mesma
 *  razão das duas de cima.
 *
 *  Aqui ela carrega mais peso do que nos outros dois: no FDT a
 *  CLASSIFICAÇÃO só existe neste bloco. Os resultados por escala trazem
 *  bruto e z e vêm com a classificação vazia — os cortes mudam a cada faixa
 *  etária, e a tabela de faixas do servidor não tem norm_set_id. Sem a
 *  regra, o modelo lê uma tabela sem classificação e um bloco com ela, e o
 *  caminho mais curto para "resolver" a diferença é reclassificar por conta
 *  própria. */
const REGRA_FDT = `
DADOS DERIVADOS CONGELADOS DO FDT:
O bloco "DADOS DERIVADOS CONGELADOS DO FDT" tem exatamente a mesma força dos resultados persistidos por escala. Faixa percentílica e classificação são dados FECHADOS: reproduza os rótulos exatamente como vieram, sem sinônimo e sem gradação própria.
No FDT a classificação vem NESTE bloco, e não na tabela por escala. A ausência dela na tabela não é resultado faltando nem inconsistência: não a preencha, não a deduza do z e não a recalcule.
Não recalcule Inibição nem Flexibilidade — elas são diferenças entre condições, já calculadas pelo servidor. Não recalcule o z. Não reconstrua P95, P75, P50, P25 ou P5. Não selecione faixa etária. Não crie percentil interpolado, nem estime posição percentílica a partir do z.
Classificação não é diagnóstico. Não converta "Deficitário", "Média inferior" ou qualquer outro rótulo em transtorno, déficit confirmado, quadro clínico ou conclusão sobre funcionamento executivo.
`;

export function buildCorrigeFacilSystemPrompt(
  reportType: ReportType,
  avisoFinal: string,
  /** true só quando a avaliação traz o derivado do CONFIAS. O padrão
   *  mantém o prompt dos outros instrumentos byte a byte como estava. */
  comDerivado = false,
  /** idem, para o derivado do PHQ-9. São dois sinalizadores e não um: cada
   *  regra só entra quando o bloco dela existe, e um relatório de PHQ-9 não
   *  tem por que receber instrução sobre perfil de habilidade. */
  comPhq9 = false,
  /** idem, para o derivado do FDT. Três sinalizadores e não um: cada regra
   *  só entra quando o bloco dela existe, e um relatório de FDT não tem por
   *  que receber instrução sobre perfil de habilidade nem sobre item 9. */
  comFdt = false,
): string {
  return `Você redige rascunhos profissionais de apoio a partir de resultados já calculados pelo CorrigeFácil.

Responda exclusivamente em português brasileiro.

REGRA CENTRAL — DADOS FECHADOS:
Os resultados fornecidos foram calculados e classificados pelo CorrigeFácil. Trate-os como dados fechados. Preserve exatamente os valores e classificações recebidos. Não recalcule escores, percentis, z, IC95 ou classificações. Não determine pontos de corte, não selecione normas, não reconstrua tabelas normativas e não altere valores.

${comDerivado ? REGRA_DERIVADOS : ''}${comPhq9 ? REGRA_PHQ9 : ''}${comFdt ? REGRA_FDT : ''}
Use somente:
- identificação persistida da avaliação;
- idade persistida na data da avaliação;
- instrumento (código e nome);
- resultados persistidos por escala;${comDerivado || comPhq9 || comFdt ? '\n- dados derivados congelados fornecidos abaixo;' : ''}
- observações adicionais escritas pelo profissional.

Não use respostas item a item, tabelas normativas, regras de pontuação, gráficos ou imagens como fonte de cálculo. Não faça diagnóstico. Não gere laudo formal definitivo. Não invente achados, contexto, funcionalidade, causalidade ou conclusão que não esteja sustentada pelos dados fornecidos.

Separe mentalmente três níveis de informação: (1) fatos do CorrigeFácil, que são imutáveis; (2) contexto fornecido pelo profissional; (3) sua redação/síntese. O nível 3 nunca pode contradizer nem inventar os níveis 1 e 2.

O QUE VOCÊ NÃO PRECISA ESCREVER:
O documento final já apresenta, fora do seu texto e de forma automática, o nome do avaliado, a idade, a data, o respondente, o instrumento, a identificação do profissional, a tabela completa dos resultados e o gráfico. Você escreve APENAS a parte interpretativa.
- Não abra o texto recontando nome, idade, data, respondente ou profissional.
- Não escreva parágrafo de identificação, de metodologia nem "rascunho de apoio destinado a...".
- Não repita a tabela linha por linha ("bruto: 29, escore: 29, percentil: ..."). Os números aparecem no texto só quando forem necessários para sustentar a leitura.
- Não assine: a identificação profissional já fecha o documento.
- O nome do avaliado pode aparecer pontualmente na análise, se melhorar a leitura.
- Nunca escreva códigos internos do sistema (por exemplo nomes de tipo de escore ou de campo).

REGRA DE EVIDÊNCIA — o que autoriza você a falar de um assunto:
Só pode entrar no texto o conceito sustentado por (1) nome do instrumento, (2) nome da escala, (3) classificação persistida, (4) valores persistidos ou (5) contexto escrito pelo profissional. Faltando isso, o conceito NÃO ENTRA — nem como exemplo, nem como possibilidade, nem como sugestão de observação.

O nome do instrumento e a classificação dizem QUE construto foi rastreado e em que faixa o resultado caiu. Não dizem como a pessoa se sente, se comporta, dorme, rende ou se relaciona. Portanto NÃO derive deles sintoma, manifestação ou domínio funcional.

Exemplo do erro a evitar: de "CES-D — Probabilidade MODERADA de depressão" é correto falar em resultado de rastreamento relacionado à depressão, na classificação recebida e na necessidade de integrá-la a outras informações. É INCORRETO acrescentar, sem contexto do profissional, sofrimento emocional, bem-estar, humor, sono, interesse, motivação, concentração, isolamento, ansiedade, funcionamento cotidiano, participação em atividades, rendimento, comportamento ou relações familiares. Esses termos são exemplos do que não se pode inventar — não são uma lista a ser preenchida nem substituída por sinônimos.

A classificação é RESULTADO DE RASTREIO, não descrição clínica da pessoa.

Quando houver contexto escrito pelo profissional, o domínio que ele mencionou fica liberado para a redação — mantendo clara a origem, sem convertê-lo em resultado do instrumento.

ESTRUTURA OBRIGATÓRIA — exatamente estas cinco seções, nesta ordem, em Markdown:

## Síntese dos resultados
Comece pelo RESULTADO, em poucas linhas. Dê a visão principal do que a avaliação mostrou. Ao mencionar uma classificação, reproduza o rótulo exatamente como recebido, sem sinônimo e sem gradação própria. Havendo várias escalas, sintetize o perfil conjunto sem criar hierarquia que os dados não sustentam.
Prefira "o rastreamento resultou na classificação X" ou "o resultado situou-se na classificação X". Não use "resultado positivo de rastreio" como fórmula.
PROXIMIDADE DE FAIXA NÃO É INTERPRETAÇÃO. Um valor perto do limite de outra faixa continua pertencendo à faixa que o servidor determinou. Não escreva "quase alta", "próximo da faixa alta", "imediatamente abaixo da faixa alta", "limítrofe" nem "próximo do corte", a menos que isso venha persistido na classificação ou na mensagem. Comparar o número com um corte é reclassificar.

## Análise e interpretação
Explique o PESO INTERPRETATIVO do resultado: o que a classificação permite afirmar, o que ela NÃO permite afirmar e, quando couber, a necessidade de integrar com outras fontes. Havendo mais de uma escala, é aqui que elas se articulam — e a relação precisa ser real, lida dos valores e classificações recebidos.
Não reescreva a síntese com outras palavras. A classificação já foi nomeada acima: refira-se a ela como "esse resultado" em vez de repetir o rótulo inteiro, salvo quando a repetição for realmente necessária.
É proibido explicar POR QUE a pessoa obteve o resultado, atribuir causa, presumir sintoma, comportamento, desempenho escolar, funcionalidade, dificuldade, repercussão, prognóstico ou dinâmica familiar que não tenham sido fornecidos, e usar conhecimento próprio de pontos de corte para acrescentar informação que não veio nos dados.
Não preencha a falta de dados com exemplos de sintomas ou de funcionalidade. Escala única e sem contexto do profissional pede uma análise CURTA — um ou dois parágrafos bem escritos bastam: conhecimento geral sobre o construto não vira fato sobre o avaliado.
Evite "apresenta", "demonstra", "confirma", "comprova". Prefira formulações proporcionais: "o resultado sugere", "o achado é compatível com", "esse resultado deve ser integrado a".

## Considerações para o contexto
Transforme o resultado em informação UTILIZÁVEL por quem vai receber o documento, sem inventar característica alguma do avaliado. Fale de PROCESSO — como usar, guardar, comunicar e integrar este resultado —, não do que se vai encontrar na pessoa.
Cabem aqui: integrar o resultado ao que já se observa e registra, tratar a informação com confidencialidade, evitar exposição ou rotulação a partir de um resultado isolado, manter comunicação entre os envolvidos quando pertinente e situar o rastreamento dentro do acompanhamento que já existe.
Não cabem: antecipar o que o destinatário vai encontrar, nomear domínios que ninguém forneceu nem sugerir que se procure sinal, sintoma ou mudança específica. A seção ganha valor pela utilidade do processo, não por descrever a pessoa.

## Recomendações e acompanhamento
Em lista de itens, para o documento ser prático. Cada item é uma ação de PROCESSO coerente com o destino — integrar, registrar, comunicar, discutir com os responsáveis, revisar quando houver informação nova.
Cada item precisa se apoiar num resultado persistido ou no contexto escrito pelo profissional. Não use como item a classificação que a síntese já enunciou. Não crie itens para encher, não invente "aspectos preservados" sem dado que os sustente e não trate ausência de elevação como habilidade preservada. Havendo um único item verdadeiro, escreva um: um item verdadeiro vale mais que três repetidos.
Não repita aqui a classificação, o alerta de que não é diagnóstico nem o pedido de cautela, se isso já foi dito antes.
Não recomende acompanhar, observar ou monitorar um domínio que ninguém forneceu — nada de "acompanhar queda de rendimento", "observar isolamento", "monitorar humor", "acompanhar sono", "observar mudança comportamental", "acompanhar participação". Não prescreva medicamento, psicoterapia específica, protocolo, intervenção padronizada ou encaminhamento obrigatório sem base explícita. Não escreva recomendação genérica desconectada do resultado só para alongar o texto.

## Considerações finais
Um parágrafo curto que fecha o raciocínio: como este resultado deve ser utilizado e qual o lugar dele no acompanhamento. Dois parágrafos só em instrumento realmente complexo.
Não repita pontuação, não repita a classificação inteira, não recapitule as recomendações, não introduza fato novo, não crie diagnóstico nem prognóstico e não escreva um segundo aviso ético — o parágrafo obrigatório vem depois e basta.

CADA SEÇÃO CUMPRE UMA FUNÇÃO DIFERENTE: a síntese diz o achado, a análise diz o alcance e o limite, as considerações para o contexto dizem como usar, as recomendações dizem o que fazer e as considerações finais fecham. Dizer a mesma coisa cinco vezes empobrece o documento.

MAIS COMPLETO NÃO É MAIS LONGO. A riqueza deste relatório vem de organização, clareza, transição entre as seções e utilidade prática — nunca de alongar o texto, repetir a classificação, acrescentar sintomas ou criar domínios funcionais. Densidade editorial, não densidade factual inventada.

NÃO transforme o relatório em checklist burocrático. A estrutura existe para organizar a leitura profissional, não para produzir uma sequência mecânica de campos nem frases padronizadas. Escreva texto que se lê, não formulário preenchido.

EXTENSÃO: proporcional à informação disponível. Instrumento de escala única pede texto conciso; instrumento com várias escalas comporta mais desenvolvimento. Seção obrigatória NÃO significa volume obrigatório: com dados pobres, seções curtas, poucos itens e orientação curta são a resposta certa. Qualidade acima de tamanho — nunca produza volume inventando conteúdo.

DESTINO: ${REPORT_TYPE_LABEL[reportType]}
${DESTINATION_RULES[reportType]}

Não crie outras seções. Em especial, não escreva Introdução, Identificação, Dados do paciente, Dados do profissional, Metodologia, Hipótese diagnóstica, Diagnóstico, Conclusão diagnóstica, Prognóstico, CID ou DSM. Também não crie seção de "Pontos fortes" ou "Habilidades preservadas": ausência de alteração não prova habilidade preservada.

Omita informação ausente quando ela não for necessária para compreender o relatório. Não preencha ausência com "não informado", "não disponível" nem "não avaliado": marcar o vazio não acrescenta nada e transforma o texto em formulário.

Depois da quinta seção, encerre o texto com EXATAMENTE este parágrafo, uma única vez, sem título acima dele:
"${avisoFinal}"`;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const datePart = value.slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value.trim().slice(0, 50);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** O bloco de profissional que vai ao prompt.
 *
 *  Manda RÓTULO, não código: `profiles` guarda `psicologo`/`crp`, e era
 *  isso que chegava à IA — que então redigia "psicologo" no lugar de
 *  "Psicóloga". A tradução é a mesma do Doc Studio e mora em
 *  `@/lib/report/professional-identity`.
 *
 *  Categoria ou credencial sem rótulo publicável (`outro`,
 *  `nao_informado`, valor desconhecido) sai como AUSÊNCIA: a linha some
 *  em vez de carregar o código cru. É o que o prompt já pede — omitir
 *  campo ausente em vez de preencher.
 *
 *  A credencial exige a SIGLA para existir, e é por isso que o gate é
 *  `getCredentialLabel` e não `formatCredential`. Sem sigla publicável,
 *  `formatCredential` devolveria o número sozinho — comportamento certo
 *  para o Doc Studio, que o mostra ao lado do nome de quem assina, e
 *  errado aqui: um "Registro/credencial: 12345" solto no prompt é um
 *  registro sem órgão, que a IA não tem como qualificar e pode redigir
 *  como se fosse. Número sem sigla não é registro; é dígito. */
export function professionalText(profile: ProfessionalProfile | null): string {
  if (!profile) return 'Perfil profissional: não incluído.';
  const name = (profile.display_name || profile.name || '').trim();
  const profession = getProfessionLabel(
    profile.profession_category,
    profile.gender,
  );
  const credential = getCredentialLabel(profile.credential_type)
    ? formatCredential(profile.credential_type, profile.credential_number)
    : '';

  const lines: string[] = [];
  if (name) lines.push(`Nome: ${name}`);
  if (profession) lines.push(`Profissão: ${profession}`);
  if (credential) lines.push(`Registro/credencial: ${credential}`);
  return lines.length ? lines.join('\n') : 'Perfil profissional: não incluído.';
}

export async function generateCorrigeFacilReport(args: {
  supabase: any;
  userId: string;
  body: Record<string, any>;
  currentMonthlyCount: number;
  monthlyLimit: number;
  avisoFinal: string;
}) {
  const {
    supabase,
    userId,
    body,
    currentMonthlyCount,
    monthlyLimit,
    avisoFinal,
  } = args;

  const assessmentId =
    typeof body.assessmentId === 'string' ? body.assessmentId.trim() : '';
  if (!UUID_REGEX.test(assessmentId)) {
    return NextResponse.json(
      { message: 'Avaliação CorrigeFácil inválida.' },
      { status: 400 },
    );
  }

  const reportType = normalizeReportType(body.reportType);
  const additionalNotes =
    typeof body.additionalNotes === 'string'
      ? body.additionalNotes.trim().slice(0, MAX_NOTES_CHARS)
      : '';

  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select(
      // `score_type` saiu: é código interno (`escore_bruto`) que vazava para o
      // texto do relatório, e nada na redação depende dele — os resultados
      // fechados já dizem quais métricas existem. Continua no banco e na
      // tabela do documento; só não vai mais ao modelo.
      'id, user_id, subject_label, subject_meta, eval_date, created_at, completed_at, status, instruments!inner(code, name)',
    )
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (assessmentError) {
    console.error('CorrigeFácil assessment lookup error:', assessmentError);
    return NextResponse.json(
      { message: 'Não foi possível carregar a avaliação salva.' },
      { status: 500 },
    );
  }
  if (!assessment) {
    return NextResponse.json(
      { message: 'Avaliação salva não encontrada.' },
      { status: 404 },
    );
  }

  const subjectName =
    typeof assessment.subject_label === 'string'
      ? assessment.subject_label.trim()
      : '';
  const subjectMeta =
    assessment.subject_meta && typeof assessment.subject_meta === 'object'
      ? assessment.subject_meta
      : {};
  const age = formatAgeAtEvaluation(subjectMeta.age_at_evaluation);

  if (!subjectName || !age) {
    return NextResponse.json(
      {
        message:
          'Esta avaliação não possui nome e idade completos para gerar o relatório.',
      },
      { status: 422 },
    );
  }

  const instrument = oneRelation<InstrumentData>(assessment.instruments);
  if (!instrument?.code || !instrument?.name) {
    return NextResponse.json(
      { message: 'Instrumento da avaliação não encontrado.' },
      { status: 422 },
    );
  }

  const { data: resultRows, error: resultsError } = await supabase
    .from('assessment_results')
    .select(
      'raw, score, percentile, z_score, classification, ci95, available, message, flags, scales!inner(code, name, ordinal)',
    )
    .eq('assessment_id', assessmentId);

  if (resultsError) {
    console.error('CorrigeFácil results lookup error:', resultsError);
    return NextResponse.json(
      { message: 'Não foi possível carregar os resultados salvos.' },
      { status: 500 },
    );
  }

  const rows = ((resultRows ?? []) as ResultRow[]).sort((a, b) => {
    const scaleA = oneRelation<ScaleData>(a.scales);
    const scaleB = oneRelation<ScaleData>(b.scales);
    return (scaleA?.ordinal ?? 9999) - (scaleB?.ordinal ?? 9999);
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { message: 'A avaliação salva não possui resultados disponíveis.' },
      { status: 422 },
    );
  }

  // O perfil profissional NÃO é mais lido aqui. O documento renderiza o
  // cabeçalho e a assinatura deterministicamente, e a narrativa não deve
  // assinar nem repetir o profissional — mandá-lo ao modelo só produzia
  // aberturas do tipo "elaborado a partir dos dados informados pela
  // profissional...". Nada na redação depende disso, então o dado deixa de
  // sair do banco para esta chamada. `professionalText` continua exportado e
  // testado: ele é o formatter compartilhado, e segue servindo ao documento.

  const evaluationDate =
    formatDate(assessment.eval_date) ||
    formatDate(assessment.completed_at) ||
    formatDate(assessment.created_at) ||
    'data não registrada';

  const respondent =
    typeof subjectMeta.respondent_name === 'string'
      ? subjectMeta.respondent_name.trim()
      : '';

  const resultsText = formatClosedResults(rows, instrument.code);
  // Orientação SEMÂNTICA, e só onde o instrumento tem duas medidas: diz
  // qual delas interpreta o limiar. Não autoriza nada — as travas de dado
  // fechado do system prompt continuam inteiras, e o modelo segue proibido
  // de recalcular, escolher corte ou reclassificar. Vazio nos outros 20, e
  // por isso o prompt deles não muda um caractere.
  const orientacao = orientacaoParaIA(instrument.code);
  const orientacaoText = orientacao
    ? `\n\nLEITURA DAS MÉTRICAS DESTE INSTRUMENTO (não recalcule nada; é só para nomear corretamente no texto)\n${orientacao}`
    : '';
  // Contexto do profissional NÃO é resultado do instrumento, e o rótulo diz
  // isso ao modelo: sem essa separação, observação subjetiva e dado
  // quantitativo entram no texto como se tivessem o mesmo peso de evidência.
  // Tempos de execução: REGISTRO DESCRITIVO do profissional, não resultado
  // do instrumento. Vai ao modelo com a nota colada — sem ela, "55 segundos
  // na Parte B" é exatamente o tipo de número que uma narrativa converte em
  // "desempenho lento", que é interpretação que ninguém mediu.
  //
  // Null quando não há tempo gravado, e por isso o prompt dos outros 19
  // instrumentos — e o de toda avaliação antiga — não muda um caractere.
  const tempos = temposParaTexto(instrument.code, subjectMeta);
  const temposText = tempos
    ? `

REGISTRO DESCRITIVO DE EXECUÇÃO (não é resultado normativo; não classifique, não compare com norma e não infira ritmo a partir dele)
${tempos}`
    : '';

  // Os derivados CONGELADOS do CONFIAS: o perfil das 16 tarefas e o nível
  // equivalente pelo escore de Sílaba. Saem do snapshot que a Edge gravou
  // em `subject_meta._corrigefacil` na conclusão — o mesmo objeto que a
  // tela e o documento mostram. Nada é recalculado aqui, e nenhuma query
  // nova é aberta: `subject_meta` já veio no SELECT acima.
  //
  // Vão como DADOS FECHADOS, com a mesma força dos resultados por escala:
  // acertos, percentual e classificação chegam juntos em cada linha, para
  // o modelo não ser convidado a classificar um percentual solto.
  //
  // Null nos outros 20 instrumentos e em toda avaliação CONFIAS anterior a
  // este campo — e por isso o prompt deles não muda um caractere.
  const derivado = derivadoParaTexto(derivadoDoMeta(subjectMeta));
  const derivadoText = derivado
    ? `

DADOS DERIVADOS CONGELADOS DO CONFIAS (calculados e classificados pelo CorrigeFácil; preserve exatamente como estão)
${derivado}`
    : '';

  // O mesmo caminho, para o PHQ-9: o rastreamento e o alerta do item 9,
  // lidos do MESMO snapshot `_corrigefacil` — nenhuma query nova, porque
  // `subject_meta` já veio no SELECT acima.
  //
  // O alerta vai INTEIRO. Recortá-lo deixaria o modelo escrever a parte que
  // falta, e é exatamente a parte em que ele não pode escrever nada.
  const phq9 = phq9ParaTexto(derivadoPhq9DoMeta(subjectMeta));
  const phq9Text = phq9
    ? `

DADOS DERIVADOS CONGELADOS DO PHQ-9 (calculados pelo CorrigeFácil; preserve exatamente como estão)
${phq9}`
    : '';

  // E o mesmo caminho para o FDT. Aqui ele carrega mais do que uma leitura
  // adicional: a CLASSIFICAÇÃO das dez medidas só existe no snapshot, e não
  // em `assessment_results` — os cortes do FDT mudam a cada faixa etária e
  // a tabela de faixas do servidor não tem norm_set_id. Sem este bloco, o
  // modelo receberia bruto e z e nenhuma classificação.
  //
  // Vai como TRANSCRIÇÃO, com os mesmos rótulos da tela e do documento. A
  // tabela normativa não entra: nem médias, nem DPs, nem os pontos
  // percentílicos. O que o modelo lê é o resultado, não a norma.
  const fdt = fdtParaTexto(derivadoFdtDoMeta(subjectMeta));
  const fdtText = fdt
    ? `

DADOS DERIVADOS CONGELADOS DO FDT (calculados pelo CorrigeFácil; preserve exatamente como estão)
${fdt}`
    : '';

  const notesText = additionalNotes
    ? `\n\nCONTEXTO FORNECIDO PELO PROFISSIONAL (não é resultado do instrumento; ao apoiar uma conclusão nele, deixe a origem clara no texto):\n${additionalNotes}`
    : '';

  const userText = `ORIGEM: CorrigeFácil
TIPO DE RELATÓRIO: ${REPORT_TYPE_LABEL[reportType]}

IDENTIFICAÇÃO DA AVALIAÇÃO (contexto para você; o documento já a apresenta — não a reconte)
Nome do avaliado: ${subjectName}
Idade na avaliação: ${age}
Data da avaliação/registro: ${evaluationDate}${respondent ? `\nRespondente: ${respondent}` : ''}

INSTRUMENTO
Código: ${instrument.code}
Nome: ${instrument.name}

RESULTADOS FECHADOS DO CORRIGEFÁCIL
${resultsText}${derivadoText}${phq9Text}${fdtText}${orientacaoText}${temposText}${notesText}

Redija as cinco seções para o destino solicitado. Preserve integralmente os dados fechados acima.`;

  let generatedText: string;
  try {
    const result = await callOpenAI([
      {
        role: 'system',
        content: buildCorrigeFacilSystemPrompt(
          reportType,
          avisoFinal,
          derivado !== null,
          phq9 !== null,
          fdt !== null,
        ),
      },
      { role: 'user', content: userText },
    ]);
    generatedText = result.content;

    console.info('[assistant_usage]', {
      user_id: userId,
      source: 'corrigefacil',
      assessment_id: assessmentId,
      instrument_code: instrument.code,
      model: result.model,
      prompt_tokens: result.usage?.prompt_tokens ?? null,
      completion_tokens: result.usage?.completion_tokens ?? null,
      total_tokens: result.usage?.total_tokens ?? null,
      image_count: 0,
      report_type: reportType,
    });
  } catch (error) {
    console.error('OpenAI CorrigeFácil error:', error);
    return NextResponse.json(
      { message: 'Erro ao conectar com o serviço de IA. Tente novamente em instantes.' },
      { status: 502 },
    );
  }

  if (!generatedText.includes(avisoFinal)) {
    generatedText = `${generatedText}\n\n${avisoFinal}`;
  }

  const reportTitle = `${instrument.code} — ${subjectName}`;
  const savedInput = [
    '[Origem: CorrigeFácil]',
    `[Avaliação: ${assessmentId}]`,
    `[Instrumento: ${instrument.code} — ${instrument.name}]`,
    `[Tipo de relatório: ${REPORT_TYPE_LABEL[reportType]}]`,
    additionalNotes ? `Observações do profissional:\n${additionalNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const { data: savedReport, error: saveError } = await supabase
    .from('ai_reports')
    .insert({
      user_id: userId,
      title: reportTitle,
      report_type: reportType,
      input_text: savedInput,
      output_text: generatedText,
      corrigefacil_assessment_id: assessmentId,
    })
    .select()
    .single();

  if (saveError || !savedReport) {
    console.error('Error saving CorrigeFácil report:', saveError);
    return NextResponse.json({
      message: 'Relatório gerado, mas não foi possível salvar no histórico.',
      report: {
        id: null,
        title: reportTitle,
        output_text: generatedText,
        created_at: new Date().toISOString(),
      },
      monthly_count: currentMonthlyCount + 1,
      monthly_limit: monthlyLimit,
      daily_count: currentMonthlyCount + 1,
      daily_limit: monthlyLimit,
    });
  }

  return NextResponse.json({
    message: 'Relatório gerado com sucesso.',
    report: savedReport,
    monthly_count: currentMonthlyCount + 1,
    monthly_limit: monthlyLimit,
    daily_count: currentMonthlyCount + 1,
    daily_limit: monthlyLimit,
  });
}