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

/**
 * O que responder quando a reserva NÃO foi concedida. Nenhum destes caminhos
 * chega perto da OpenAI.
 */
const FREE_DEMO_DENIAL: Record<string, { message: string; status: number }> = {
  already_used: {
    message:
      'Você já utilizou a demonstração gratuita do Relatório Pró desta conta.',
    status: 403,
  },
  in_progress: {
    message:
      'Já existe uma geração da demonstração gratuita em andamento. Aguarde alguns instantes.',
    status: 409,
  },
  use_subscription: {
    message:
      'Esta conta possui Relatório Pró ativo e não utiliza a demonstração gratuita.',
    status: 403,
  },
  ineligible: {
    message:
      'Esta avaliação não está elegível para a demonstração gratuita do Relatório Pró.',
    status: 403,
  },
};

/**
 * Devolve a chance quando nada foi entregue. Falhar aqui não é fatal: a
 * reserva órfã é recuperada pelo TTL de 30 minutos na próxima tentativa.
 */
type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: unknown }>;
};

/** Só o que a confirmação usa: `from(...).select(...).eq(...).maybeSingle()`. */
interface FiltroDemo {
  eq: (coluna: string, valor: unknown) => FiltroDemo;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: unknown;
  }>;
}

interface LeitorDemo {
  from: (tabela: string) => { select: (colunas: string) => FiltroDemo };
}

/**
 * A confirmação tem três respostas possíveis, e a diferença entre as duas
 * últimas é o que este PR corrige: "o banco respondeu e não há relatório" é
 * MUITO diferente de "não consegui perguntar ao banco".
 */
type ConfirmacaoDemo =
  | { estado: 'confirmado'; report: Record<string, unknown> }
  | { estado: 'ausente' }
  | { estado: 'indeterminado' };

/** Tentativas da releitura e o intervalo entre elas. Curto de propósito:
 *  isto roda dentro de um request que o usuário está esperando. */
const CONFIRM_TENTATIVAS = 3;
const CONFIRM_INTERVALO_MS = 150;

/**
 * Uma linha só é relatório pronto se ela DIZ que é. Os três atributos são
 * conferidos aqui, na linha que voltou, além de irem como filtro na query:
 * depender apenas da policy de SELECT seria transformar a RLS em
 * pós-condição, e bastaria uma policy administrativa ou permissiva devolver
 * a reserva para o código chamar de "relatório" uma linha de texto vazio.
 */
function relatorioDemoValido(linha: Record<string, unknown> | null): boolean {
  if (!linha) return false;

  const texto = linha.output_text;

  return (
    linha.generation_status === 'completed' &&
    linha.billing_origin === 'free_demo' &&
    typeof texto === 'string' &&
    texto.trim() !== ''
  );
}

async function confirmarDemoConcluida(
  supabase: LeitorDemo,
  reportId: string | null,
): Promise<ConfirmacaoDemo> {
  if (!reportId) return { estado: 'ausente' };

  for (let tentativa = 1; tentativa <= CONFIRM_TENTATIVAS; tentativa++) {
    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('id', reportId)
      .eq('billing_origin', 'free_demo')
      .eq('generation_status', 'completed')
      .maybeSingle();

    if (error) {
      // ERRO NÃO É AUSÊNCIA. Um timeout de rede aqui não diz nada sobre a
      // linha: `complete` pode ter commitado do outro lado.
      console.error(
        `CorrigeFácil free demo confirm error (tentativa ${tentativa}):`,
        error,
      );

      if (tentativa < CONFIRM_TENTATIVAS) {
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIRM_INTERVALO_MS),
        );
      }
      continue;
    }

    // O banco RESPONDEU. A resposta é definitiva — para os dois lados.
    return relatorioDemoValido(data)
      ? { estado: 'confirmado', report: data as Record<string, unknown> }
      : { estado: 'ausente' };
  }

  return { estado: 'indeterminado' };
}

async function releaseFreeDemo(
  supabase: RpcClient,
  reportId: string | null,
) {
  if (!reportId) return;

  const { error } = await supabase.rpc(
    'release_corrigefacil_free_demo_report',
    { report_uuid: reportId },
  );

  if (error) {
    console.error('CorrigeFácil free demo release error:', error);
  }
}

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

/** O PERFIL INTERPRETATIVO do CONFIAS — segundo piloto da mesma arquitetura
 *  do FDT: um bloco de VOCABULÁRIO e ORDEM DE LEITURA, colado na trava que
 *  já fecha o dado, sem abrir nenhuma permissão nova.
 *
 *  A causa do texto burocrático é a mesma do FDT, com a forma trocada. O
 *  FDT tinha dez medidas em duas dimensões; o CONFIAS tem DUAS escalas
 *  principais (Sílaba e Fonema, mais o Total) e DEZESSEIS tarefas em dois
 *  grupos. Sem mapa, o modelo trata as dezesseis como lista plana — e
 *  lista plana só comporta recitar ou generalizar. Recitar vira "S1:
 *  Consolidada, S2: Consolidada, S3: Em desenvolvimento..." dezesseis
 *  vezes; generalizar vira "houve variação entre as habilidades".
 *
 *  Entra colado na REGRA_DERIVADOS e sob o MESMO sinalizador: os dois só
 *  existem quando a avaliação traz o snapshot do CONFIAS. Com `comDerivado`
 *  false o prompt dos outros instrumentos continua byte a byte o que era —
 *  o teste do FDT já provava isso por sha256, e o novo teste do CONFIAS usa
 *  a mesma prova.
 *
 *  Nenhum corte entra aqui. Os cortes de 0,75 e 0,50 que separam as três
 *  faixas do perfil não chegam ao browser (é a mesma trava de
 *  `confias-derivado.ts`), e este bloco não os reconstrói: fala de
 *  CLASSIFICAÇÃO recebida, nunca de percentual comparado com nada. */
const PERFIL_INTERPRETATIVO_CONFIAS = `
COMO LER O CONFIAS — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não afrouxa a REGRA_DERIVADOS acima: nada aqui autoriza recalcular, reclassificar, comparar percentual com corte ou concluir sobre a criança fora do que as tarefas deste protocolo sustentam. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não percorra as dezesseis tarefas e não acrescente cautela nova.

O QUE CADA NÍVEL DE INFORMAÇÃO REPRESENTA (vocabulário do instrumento, não característica da criança):
- Sílaba, Fonema e Total são as ESCALAS PRINCIPAIS, e chegam a você já calculadas e classificadas na tabela de resultados por escala — este bloco não repete os números delas, só ensina a ler o conjunto. Sílaba representa o desempenho agregado nas tarefas silábicas do instrumento; Fonema, o desempenho agregado nas tarefas fonêmicas; Total, o resultado agregado do protocolo inteiro. NÃO converta Sílaba baixa em "déficit silábico", Fonema baixo em "déficit fonológico" nem Total baixo em "transtorno de aprendizagem": a classificação continua pertencendo ao CONFIAS, não à criança.
- O PERFIL POR HABILIDADE traz as tarefas silábicas (S1 a S9) e fonêmicas (F1 a F7), cada uma já classificada como Consolidada, Em desenvolvimento ou Ainda não consolidada. Ele serve para identificar quais tarefas ficaram em cada classificação, a concentração das classificações, heterogeneidade, contraste e agrupamento entre o grupo silábico e o fonêmico — sempre com os rótulos recebidos. NÃO transforme "Síntese fonêmica — Ainda não consolidada" em "a criança não consegue sintetizar fonemas no cotidiano" nem em "há déficit fonêmico": o que se pode dizer é que, nesta tarefa, o desempenho foi classificado como Ainda não consolidada.
- O NÍVEL EQUIVALENTE (escore sílaba), quando vier, é leitura ADICIONAL do escore de Sílaba — não é a hipótese de escrita informada pelo profissional para a seleção normativa, mesmo usando a mesma nomenclatura de escrita. Nunca chame o nível de hipótese observada, nunca diga que ele corrige a hipótese informada e nunca trate divergência entre os dois como erro: se houver divergência, ela é estrutural — as duas informações têm natureza diferente — e não inconsistência a resolver.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. ESCALAS PRINCIPAIS — como Sílaba, Fonema e Total se distribuem: convergem entre si, ou há diferença entre Sílaba e Fonema? Descreva a distribuição; não explique por que ela existe.
2. DISTRIBUIÇÃO DAS HABILIDADES — quantas e quais tarefas aparecem como Consolidadas, Em desenvolvimento ou Ainda não consolidadas. Não vire contagem mecânica no texto: use para perceber o padrão, não para listar.
3. SILÁBICAS × FONÊMICAS — verifique se há diferença REALMENTE sustentada entre os dois grupos. É permitido dizer que há maior concentração de habilidades consolidadas num grupo, maior número de tarefas em desenvolvimento no outro, ou distribuição semelhante entre os dois — somente se os dados mostrarem isso. Não explique por quê.
4. CONTRASTES INTERNOS — procure tarefa específica que destoe do restante do grupo dela (por exemplo, um grupo majoritariamente consolidado com uma tarefa ainda não consolidada). Quando existir, pode ser destacada como particularidade do perfil. Não a transforme em diagnóstico nem em causa.
5. NÍVEL EQUIVALENTE — quando existir, use-o como leitura adicional do escore de Sílaba, na forma da nota que já veio com ele. Não o use para diagnosticar estágio de alfabetização.
6. MENSAGEM CENTRAL — escolha UMA configuração principal para organizar Síntese e Análise: perfil homogêneo, predomínio de habilidades consolidadas, predomínio de habilidades em desenvolvimento, heterogeneidade, diferença silábico × fonêmico ou presença de habilidade específica destoante. Só o que os dados realmente sustentarem.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal deste CONFIAS?" priorizando Sílaba, Fonema e Total, o padrão geral do Perfil por Habilidade e o contraste realmente importante — não as dezesseis tarefas em prosa. Perfil homogêneo pede síntese CURTA: diga a homogeneidade e pare, sem inventar diferença para produzir texto.
- Na Análise e interpretação, relacione as escalas principais com o Perfil por Habilidade, aprofunde o padrão silábico e fonêmico, destaque tarefa específica só quando ela acrescentar algo, integre o Nível equivalente quando existir, diga o que o perfil permite afirmar NO ÂMBITO DO CONFIAS e delimite a extrapolação. Não recite as dezesseis tarefas e não reescreva a síntese.
- Nas Considerações para o contexto, use a mensagem central. Um perfil heterogêneo pode justificar orientar que o resultado não seja resumido só pelo Total; um perfil homogêneo não precisa de preocupação inventada. Não diga o que a escola ou a família devem trabalhar (rimas, fonemas, intervenção) a menos que isso venha de contexto escrito pelo profissional.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste aplicado nos outros pilotos: ele existe POR CAUSA deste perfil CONFIAS? Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra. Cabem, quando o perfil os sustentar: integrar separadamente o domínio silábico e o fonêmico se houver contraste real entre eles; considerar habilidade específica destoante quando o perfil não for uniforme; confrontar o Perfil por Habilidade com outras informações disponíveis da avaliação; preservar a diferença entre a hipótese informada e o Nível equivalente quando os dois vierem juntos. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica pode ser suficiente, e perfil homogêneo não pede uma segunda para completar.
- Nas Considerações finais, feche a MENSAGEM CENTRAL. Não repita a tabela, não repita as dezesseis habilidades, não repita as recomendações e não escreva um segundo aviso.

O QUE NUNCA SE FAZ COM O PERFIL DO CONFIAS, mesmo com classificação extrema:
Não crie habilidade que não esteja nas linhas recebidas e não invente agrupamento que ninguém forneceu. Não converta "Ainda não consolidada" em déficit, nem qualquer classificação do CONFIAS em diagnóstico. Não infira dislexia, transtorno de aprendizagem, dificuldade escolar ou prognóstico a partir de nenhuma classificação — do perfil, das escalas principais ou do nível equivalente. Não afirme que a criança "não sabe" determinada habilidade fora do contexto da tarefa avaliada: a classificação descreve o desempenho NESTA tarefa, NESTE protocolo, não uma capacidade geral.
Ancore as afirmações com "neste protocolo", "no CONFIAS", "nas tarefas avaliadas" ou "no perfil observado".
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

/** O PERFIL INTERPRETATIVO do FDT — o que a REGRA_FDT acima não faz.
 *
 *  As travas dizem ao modelo o que ele NÃO pode fazer com dez medidas
 *  fechadas, e fazem isso bem. Nenhuma delas diz o que ele PODE fazer, e o
 *  resultado é um texto seguro e burocrático: repete classificação, escreve
 *  "houve variação entre condições", enfileira cautela e produz
 *  recomendação que serviria para qualquer instrumento.
 *
 *  A causa é estrutural. Nos outros 20 instrumentos a leitura conjunta é
 *  quase automática — poucas escalas, um construto. No FDT há dez medidas
 *  em duas dimensões (tempo e erro) e três conjuntos com significados
 *  diferentes, e sem um mapa o modelo trata as dez como uma lista plana.
 *  Lista plana só comporta duas saídas: recitar a tabela ou generalizar.
 *
 *  O que este bloco acrescenta é VOCABULÁRIO e ORDEM DE LEITURA, não
 *  permissão: o que era proibido continua proibido, e nada aqui abre
 *  cálculo, classificação, causa, sintoma ou conclusão sobre a pessoa.
 *  Ele também não pede texto mais longo — o pedido é raciocínio melhor
 *  dentro do mesmo limite editorial, e por isso ele repete o teto em vez
 *  de afrouxá-lo.
 *
 *  Entra colado na REGRA_FDT e sob o MESMO sinalizador: os dois só existem
 *  quando a avaliação traz o snapshot do FDT. Com `comFdt` false o prompt
 *  dos outros instrumentos continua byte a byte o que era — há sha256 dos
 *  quatro destinos no teste provando isso.
 *
 *  Nenhum número entra aqui: nenhuma faixa etária, nenhum ponto empírico,
 *  nenhum corte e nenhum valor de caso real. O mapa é semântico, e os
 *  resultados continuam vindo só do bloco congelado. */
const PERFIL_INTERPRETATIVO_FDT = `
COMO LER O FDT — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não afrouxa nenhuma trava acima: nada aqui autoriza recalcular, reclassificar, estimar posição, explicar causa ou concluir sobre a pessoa. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não percorra a tabela e não acrescente cautela nova.

O QUE CADA CONDIÇÃO REPRESENTA (vocabulário do instrumento, não característica do avaliado):
- Leitura e Contagem são as condições mais AUTOMÁTICAS do FDT. Dentro do instrumento elas se relacionam a velocidade de processamento simples e a componentes atencionais automáticos. NÃO converta isso em "atenção prejudicada", "lentidão cognitiva", "problema de processamento", "dificuldade de leitura" nem "dificuldade matemática". O que cabe dizer é que as condições mais automáticas apresentaram determinada classificação, ou que o desempenho nelas se situou em determinada faixa.
- Escolha é a condição que introduz INTERFERÊNCIA e demanda de controle inibitório. Ela serve para discutir o padrão do FDT: "na condição que introduz demanda de controle inibitório, o resultado situou-se...". NÃO escreva "possui bom controle inibitório" nem "o controle inibitório está preservado" como característica geral da pessoa.
- Alternância é a condição que introduz MUDANÇA ENTRE REGRAS e demanda de flexibilidade cognitiva. Prefira "na condição de alternância entre regras...". NÃO transforme a tarefa em afirmação global do tipo "é cognitivamente flexível".
- Inibição e Flexibilidade são ÍNDICES DERIVADOS calculados pelo servidor, e não tarefas cronometradas independentes. Dentro do FDT elas permitem observar o custo relativo associado, respectivamente, à condição que exige controle inibitório e à alternância entre regras. Não as recalcule, não explique por que ficaram altas ou baixas e não as converta em descrição de personalidade, adaptação ou funcionamento cotidiano.
- Os ERROS são a SEGUNDA dimensão de desempenho do instrumento e são lidos EM PARALELO ao tempo, nunca no lugar dele. É permitido apontar convergência entre as classificações de tempo e de erro, divergência entre elas e distribuição diferente entre as condições. É proibido EXPLICAR a discrepância: nada de "trade-off velocidade-precisão", "impulsividade", "desatenção", "priorizou velocidade", "perdeu precisão" ou "respondeu sem cuidado" — isso é causalidade inventada.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. DISTRIBUIÇÃO — como as classificações recebidas se distribuem: homogêneas, predominantemente baixas, predominantemente médias, predominantemente altas ou heterogêneas. Use somente as classificações existentes.
2. AGRUPAMENTOS — verifique se os resultados se agrupam entre as condições mais automáticas (Leitura e Contagem), as condições com maior demanda de controle (Escolha e Alternância) e os índices derivados (Inibição e Flexibilidade). NÃO force agrupamento que os resultados não sustentem.
3. CONTRASTES — procure contraste realmente visível entre esses conjuntos. Quando ele estiver nos dados, é permitido nomeá-lo: "perfil contrastante", "distribuição heterogênea", "diferença marcada entre grupos de condições". Sem evidência adicional é PROIBIDO chamá-lo de compensação, preservação, superação, estratégia ou mecanismo, e é proibido explicar POR QUE o contraste apareceu.
4. TEMPO E ERROS — leia as duas dimensões juntas: elas apontam na mesma direção? Há diferença de classificação entre tempo e erro? Em quais condições essa diferença ocorre? Descreva a ESTRUTURA e não atribua mecanismo.
5. MENSAGEM CENTRAL — escolha UMA leitura central do protocolo e deixe que ela organize a Síntese e a Análise. Ela pode ser a heterogeneidade entre as condições, a homogeneidade do conjunto ou a concentração das classificações numa região da régua — o que os dados realmente mostrarem, e nada além disso.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal deste FDT?" — e responda com CONFIGURAÇÃO, não com a tabela: como as medidas se agrupam, onde está o contraste quando houver e em que direção as classificações se distribuem. Um ou dois parágrafos curtos, sem percorrer as dez medidas uma a uma. A FAIXA PERCENTÍLICA ESTÁ DISPONÍVEL, MAS NÃO É OBRIGATÓRIA NO TEXTO: ela veio no bloco congelado e o documento já a imprime ao lado de cada medida, então enfileirá-la na narrativa é escrever a tabela em prosa. Cite faixa ou classificação exata SÓ onde ela sustentar uma distinção que a prosa não faria sozinha — e aí reproduza o rótulo como veio. Conjunto homogêneo pede síntese CURTA: diga a homogeneidade e pare, sem construir contraste, agrupamento ou hierarquia que as classificações recebidas não mostrem.
- Na Análise e interpretação, que é a seção mais densa do FDT, explique o padrão encontrado, relacione com cuidado as condições automáticas, as condições com maior demanda de controle, os índices derivados e os erros, diga o que o padrão permite afirmar NO ÂMBITO DO FDT e delimite o que não pode ser extrapolado. Não reescreva a síntese e não recite os números outra vez.
- Nas Considerações para o contexto, use a mensagem central para explicar como INTEGRAR este perfil, em lugar de acumular avisos abstratos. Um protocolo com diferenças importantes entre condições, por exemplo, pede que a utilização preserve essa heterogeneidade e evite resumir o resultado a um rótulo único. Continua proibido nomear o que o destinatário deve observar na pessoa.
- Nas Recomendações e acompanhamento, cada item passa por UM teste: ele existe POR CAUSA da configuração deste protocolo? Se a mesma frase caberia em qualquer outro instrumento, ela não entra — comunicar com cuidado, guardar com confidencialidade e integrar ao acompanhamento são verdades genéricas, não recomendações deste FDT. APLIQUE O TESTE ITEM A ITEM, ANTES DE ESCREVER: troque FDT por PHQ-9, SNAP-IV ou SCARED — se a recomendação continuaria praticamente igual, ela não é deste protocolo e não entra. Reprovam nesse teste comunicar com a família ou a equipe, preservar a confidencialidade, evitar rotulação, registrar informações, manter acompanhamento e discutir com outros profissionais: esses temas já têm lugar nas Considerações para o contexto e no parágrafo final de responsabilidade, e não precisam virar item aqui. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica vale mais que três genéricas, e três específicas não pedem uma quarta para completar — e num perfil homogêneo UMA recomendação específica é resposta certa e completa, não item faltando. Quando o perfil real os sustentar, cabem itens como integrar o padrão às demais informações da avaliação sem reduzi-lo a uma medida única, considerar separadamente as condições automáticas, as controladas e os índices derivados, ou confrontar a distribuição de tempo e erros com as outras fontes disponíveis — e só quando ele os sustentar. Não repita a mesma recomendação em sinônimos diferentes.
- Nas Considerações finais, feche a MENSAGEM CENTRAL. Não resuma a tabela, não repita as recomendações e não escreva um segundo aviso.

O FDT NÃO TEM RESULTADO ÚNICO:
Este produto não devolve escore global, índice composto, pontuação total nem síntese numérica única do FDT: as medidas são dez, e o que existe entre elas é CONFIGURAÇÃO, não soma. Por isso não escreva "resultado global do FDT", "escore global do FDT", "resultado total do FDT", "índice global do FDT" nem "pontuação global do FDT" quando a expressão sugerir uma medida única que não existe — e a regra é SEMÂNTICA: qualquer outra formulação que leve o leitor a esperar um número único do FDT tem o mesmo defeito.
Diga o que existe, conforme o caso: o conjunto dos resultados do FDT, o perfil observado no FDT, a configuração dos resultados, o conjunto das condições avaliadas ou o padrão observado no protocolo.

DESEMPENHO NO TESTE NÃO É CARACTERÍSTICA DA PESSOA, e isso vale mesmo com classificação extrema:
Não escreva "possui excelente flexibilidade cognitiva", "apresenta déficit de processamento", "há prejuízo executivo", "possui dificuldade atencional", "o controle inibitório está preservado", "o desempenho indica TDAH" nem "o padrão sugere transtorno". Não infira, a partir de nenhuma classificação do FDT, sintoma, funcionamento cotidiano, dificuldade escolar, rendimento, comportamento em sala de aula ou transtorno.
Prefira "o resultado da condição...", "o desempenho observado nesta condição...", "o índice derivado situou-se...", "a configuração encontrada...", e ancore as afirmações com "neste protocolo", "nesta avaliação", "no FDT" ou "nas condições avaliadas".
Havendo observação escrita pelo profissional, ela pode enriquecer bastante a leitura, desde que o texto distinga o RESULTADO DO FDT do CONTEXTO INFORMADO — "segundo a observação registrada pelo profissional", "no contexto adicional informado" — e nunca converta a observação em dado psicométrico.
`;

/** O código do BPA-2 no catálogo. Comparado direto contra `instrumentCode`
 *  — ver o parâmetro em `buildCorrigeFacilSystemPrompt`. */
const CODIGO_BPA2 = 'BPA-2';

/** O PERFIL INTERPRETATIVO do BPA-2 — terceiro piloto da mesma
 *  arquitetura do FDT e do CONFIAS, com uma diferença estrutural: o
 *  BPA-2 NÃO TEM SNAPSHOT.
 *
 *  CONFIAS, PHQ-9 e FDT precisam de um bloco `DADOS DERIVADOS CONGELADOS`
 *  porque cada um carrega alguma leitura que só existe fora da tabela de
 *  resultados por escala — o perfil de habilidades, o rastreamento, a
 *  classificação por faixa etária. O BPA-2 não: as quatro medidas (AA,
 *  AC, AD, AG) chegam com bruto, percentil e classificação já na tabela
 *  de resultados de sempre, pelo mesmo caminho que qualquer outro
 *  instrumento usa. Não há nada para congelar, e por isso não há
 *  REGRA_BPA2 — só o mapa de como LER as quatro medidas juntas.
 *
 *  O que falta ao prompt não é dado; é IDENTIDADE. Ele precisa saber que
 *  o instrumento desta chamada é o BPA-2 para saber que este mapa se
 *  aplica. É para isso que existe o parâmetro `instrumentCode`, e não um
 *  quarto booleano `comBpa2`: o próximo instrumento sem snapshot reusa o
 *  MESMO parâmetro, comparando com o próprio código — sem abrir posição
 *  nova na assinatura da função a cada instrumento novo.
 *
 *  Entra sozinho, sem REGRA para acompanhar, mas do mesmo jeito que os
 *  outros três: condicionado, e byte a byte ausente quando o instrumento
 *  não é este. */
const PERFIL_INTERPRETATIVO_BPA2 = `
COMO LER O BPA-2 — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não abre nenhuma exceção à REGRA CENTRAL: nada aqui autoriza recalcular, reclassificar, reselecionar norma ou concluir sobre a pessoa fora do que estas quatro medidas sustentam. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não percorra AA, AC, AD e AG como tabela em prosa e não acrescente cautela nova.

O QUE CADA MEDIDA REPRESENTA (vocabulário do instrumento, não característica da pessoa):
- AA (Atenção Alternada), AC (Atenção Concentrada) e AD (Atenção Dividida) são três medidas ESPECÍFICAS e independentes entre si. NÃO escreva "possui boa atenção alternada", "tem déficit de atenção concentrada" nem "não consegue dividir a atenção" como traço da pessoa. Prefira "no BPA-2, a medida de Atenção Alternada foi classificada como..." ou "neste protocolo, Atenção Concentrada e Atenção Dividida apresentaram classificações...".
- AG (Atenção Geral) é RESULTADO COMPOSTO, calculado pelo servidor a partir de AA, AC e AD — não é uma quarta tarefa independente, e não deve ser tratada como equivalente às três anteriores. Não a recalcule, não some os brutos de novo para conferir, não derive percentil ou classificação dela a partir das outras três e não a explique como se fosse uma função cognitiva própria, diferente das três que a compõem. Interpretativamente, AG pode ser usada como MEDIDA DE SÍNTESE do conjunto: quando ela convergir com AA, AC e AD, diga que convergiu; quando destoar de alguma das três, descreva a configuração — nunca explique a causa da diferença. Não escreva "a atenção geral está preservada" como conclusão sobre a pessoa.
- O BRUTO PODE SER NEGATIVO. Cada medida combina acertos, erros e omissões, e por isso um bruto negativo é RESULTADO VÁLIDO, não erro de digitação nem falha de sistema. Não corrija para zero, não trate como bug, não diga que o resultado é impossível e não substitua nem reinterprete o valor: use apenas o percentil e a classificação que já vieram prontos, exatamente como vieram.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. DISTRIBUIÇÃO — como AA, AC e AD se distribuem: homogêneas, predominantemente inferiores, predominantemente médias, predominantemente superiores ou heterogêneas. Use somente as classificações recebidas.
2. CONTRASTE ENTRE MODALIDADES — existe diferença realmente relevante entre AA, AC e AD? Quando existir, pode ser nomeada — "as medidas específicas apresentaram distribuição heterogênea, com classificação mais elevada em uma e inferior em outra", por exemplo, só quando os dados sustentarem. Não explique por quê.
3. ATENÇÃO GERAL — como AG se posiciona em relação ao padrão observado nas três medidas componentes. Lembre-se de que ela é composta e pode funcionar como síntese do conjunto; não é tarefa independente.
4. CONVERGÊNCIA — as três medidas específicas apontam para direção semelhante? AG acompanha essa configuração, ou há uma medida destoante?
5. MENSAGEM CENTRAL — escolha UMA leitura central para organizar Síntese e Análise: homogeneidade, heterogeneidade, predomínio numa região classificatória, uma modalidade destoante ou convergência das três medidas com AG. Só o que os dados realmente sustentarem.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal deste BPA-2?" priorizando a configuração das três modalidades, o contraste quando existir e a posição de AG no conjunto — não AA, AC, AD e AG como tabela em prosa. Perfil homogêneo pede síntese CURTA. Perfil heterogêneo destaca só o contraste relevante. O percentil exato não precisa aparecer se a classificação e a configuração já comunicarem o ponto.
- Na Análise e interpretação, relacione AA, AC e AD entre si e depois integre AG como medida composta — não como quarta condição. É permitido descrever distribuição semelhante, diferença entre modalidades, medida específica destoante, convergência ou heterogeneidade. NÃO é permitido explicar causa, inferir estratégia, inferir esforço, inferir desatenção cotidiana, inferir funcionamento escolar ou transformar classificação em traço da pessoa. Não escreva "o indivíduo é mais capaz de...", "tem dificuldade para..." nem "possui capacidade preservada..." sem contexto escrito pelo profissional que sustente a frase.
- Nas Considerações para o contexto, use a configuração encontrada. Perfil heterogêneo pode justificar orientar que o resultado não seja resumido somente pela AG; perfil homogêneo não precisa de contraste ou preocupação inventada. O destino (Escola, Família, Técnico, Interno) ajusta a LINGUAGEM, nunca a interpretação psicométrica. Não prescreva adaptação escolar, treino atencional, intervenção ou encaminhamento só a partir do BPA-2, a menos que isso venha de contexto escrito pelo profissional.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste dos outros pilotos: ele existe POR CAUSA desta configuração do BPA-2? Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra. Cabem, quando o perfil os sustentar: considerar separadamente AA, AC e AD quando houver heterogeneidade entre as medidas; evitar resumir o perfil apenas pela AG quando uma modalidade específica destoar; integrar a configuração das medidas com outras fontes da avaliação. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica pode ser suficiente. Não fabrique intervenção.
- Nas Considerações finais, feche a MENSAGEM CENTRAL. Não repita os quatro resultados, não repita todos os percentis, não repita as recomendações e não escreva um segundo aviso.

O QUE NUNCA SE FAZ COM O PERFIL DO BPA-2, mesmo com classificação extrema:
Classificação inferior — "Muito inferior" ou "Inferior" — não vira "déficit de atenção" como conclusão sobre a pessoa. Classificação superior — "Superior" ou "Muito superior" — não vira "atenção preservada" nem "atenção excelente" como característica geral. Não infira TDAH, transtorno, funcionamento cotidiano ou desempenho escolar a partir de nenhuma classificação — de AA, AC, AD ou AG. Não explique a causa de nenhum contraste entre as medidas.
Ancore as afirmações com "no BPA-2", "neste protocolo" ou "nas medidas avaliadas".
`;

/** O código da DASS-21 no catálogo. Comparado direto contra
 *  `instrumentCode`, o mesmo parâmetro que o BPA-2 já usa. */
const CODIGO_DASS21 = 'DASS-21';

/** O PERFIL INTERPRETATIVO da DASS-21 — quarto piloto da mesma
 *  arquitetura, e o segundo (depois do BPA-2) a reusar `instrumentCode`
 *  em vez de abrir um `comDass21` na assinatura.
 *
 *  MESMA FAMÍLIA ESTRUTURAL DO BPA-2: a DASS-21 também não tem snapshot.
 *  As três escalas — Depressão, Ansiedade, Estresse — chegam com bruto,
 *  percentil (quando houver) e classificação já na tabela de resultados
 *  de sempre. Não há REGRA_DASS21 pelo mesmo motivo que não há
 *  REGRA_BPA2: nada para congelar.
 *
 *  A DIFERENÇA QUE IMPORTA AQUI NÃO É ESTRUTURAL, É SEMÂNTICA: a DASS-21
 *  não soma. O controlador registra isso como CORREÇÃO deliberada — "não
 *  há escore total: as três escalas são independentes e a planilha não
 *  soma uma na outra" — e é exatamente o tipo de ausência que um modelo
 *  de linguagem tende a preencher sozinho, inventando "resultado geral"
 *  ou "gravidade global" a partir de três números que estão lado a lado.
 *  O bloco entra dizendo isso ANTES do mapa, não depois, porque foi
 *  precisar de um commit de correção para o FDT aprender essa lição
 *  (PERFIL_INTERPRETATIVO_FDT ganhou "O FDT NÃO TEM RESULTADO ÚNICO"
 *  só depois de um relatório real produzir "resultado global do FDT").
 *  Aqui a mesma trava nasce dentro do primeiro commit. */
const PERFIL_INTERPRETATIVO_DASS21 = `
COMO LER A DASS-21 — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não abre nenhuma exceção à REGRA CENTRAL: nada aqui autoriza recalcular, reclassificar, somar escalas ou concluir sobre a pessoa fora do que estas três dimensões sustentam. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não escreva Depressão, Ansiedade e Estresse como tabela em prosa e não acrescente cautela nova.

A DASS-21 NÃO TEM ESCORE TOTAL. Depressão, Ansiedade e Estresse são escalas INDEPENDENTES: o instrumento não soma uma na outra, não produz gravidade global, não produz classificação geral e não produz índice composto das três. NÃO escreva "resultado global da DASS-21", "gravidade global", "escore total da DASS-21", "perfil geral severo" nem "quadro geral moderado" quando a expressão sugerir soma ou classificação única — e a regra é SEMÂNTICA: qualquer formulação que leve o leitor a esperar um número único da DASS-21 tem o mesmo defeito. Diga o que existe, conforme o caso: o conjunto dos resultados, a configuração das três dimensões, o perfil observado nas escalas ou a distribuição entre as dimensões.

O QUE CADA ESCALA REPRESENTA (vocabulário do instrumento, não característica da pessoa):
Depressão, Ansiedade e Estresse são dimensões SEPARADAS dentro da DASS-21, cada uma com sua própria classificação — Normal, Leve, Moderado, Severo ou Extremamente severo. O rótulo pertence À ESCALA, não à pessoa. NÃO escreva "tem depressão", "apresenta transtorno de ansiedade", "está severamente estressado", "quadro depressivo" nem "transtorno ansioso". Prefira "na escala de Depressão da DASS-21, o resultado foi classificado como..." ou "neste protocolo, a dimensão de Ansiedade apresentou classificação...". "Severo" e "Extremamente severo" são classificação da dimensão NESTE instrumento — não significam automaticamente transtorno severo, quadro grave, risco, urgência ou incapacidade funcional, e o rótulo recebido deve ser preservado exatamente como veio, sem gradação própria.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. DISTRIBUIÇÃO — como Depressão, Ansiedade e Estresse se distribuem: mesma classificação, classificações próximas, heterogêneas, uma dimensão claramente mais elevada ou uma claramente mais baixa. Use somente as classificações recebidas.
2. CONVERGÊNCIA — as três dimensões apontam para região classificatória semelhante? Se sim, a convergência pode ser nomeada, sem inventar significado além disso.
3. DIVERGÊNCIA — existe contraste real? Quando existir, é permitido dizer que as três dimensões apresentam distribuição heterogênea, com maior elevação relativa numa delas — só quando os dados sustentarem. NÃO diga que uma dimensão está causando outra, nem escreva qualquer explicação causal entre elas.
4. DIMENSÃO DE DESTAQUE — se uma escala realmente destoar das outras duas, ela pode ser destacada, sempre ancorada em "no instrumento", "nesta escala" ou "neste protocolo". Não a transforme em característica global da pessoa.
5. MENSAGEM CENTRAL — escolha UMA configuração para organizar Síntese e Análise: homogênea, heterogênea, concentração nas faixas inferiores, concentração nas faixas superiores ou uma dimensão destacada. Só o que os dados realmente mostrarem.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal desta DASS-21?" priorizando convergência, divergência e direção das classificações — não "Depressão = X, Ansiedade = Y, Estresse = Z" como tabela em prosa. Perfil homogêneo pede síntese CURTA; perfil contrastante destaca só o contraste principal. As pontuações exatas não precisam ser repetidas quando a tabela já as apresenta.
- Na Análise e interpretação, relacione as três dimensões entre si — comparar classificações, destacar concentração, destacar diferença relativa, nomear a dimensão mais elevada ou mais baixa. NÃO é permitido explicar causa, inferir diagnóstico, inferir duração, inferir etiologia, inferir funcionamento cotidiano, inferir risco, inferir prejuízo escolar ou profissional, nem afirmar transtorno. Não reescreva a síntese.
- Nas Considerações para o contexto, use a configuração real. Havendo heterogeneidade, pode orientar que as três dimensões sejam consideradas SEPARADAMENTE; perfil homogêneo não inventa diferença. O destino ajusta a LINGUAGEM, nunca a interpretação psicométrica. Não prescreva psicoterapia, psiquiatria, medicação, afastamento, intervenção escolar ou protocolo clínico só a partir da classificação da DASS-21, a menos que isso venha de contexto escrito pelo profissional.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste dos outros pilotos: ele existe POR CAUSA desta configuração da DASS-21? Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra. Cabem, quando o perfil os sustentar: considerar separadamente as três dimensões quando houver heterogeneidade; evitar resumir a DASS-21 numa única gravidade; integrar a dimensão de maior elevação com outras fontes da avaliação. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica pode ser suficiente. Não fabrique conduta clínica.
- Nas Considerações finais, feche a MENSAGEM CENTRAL. Não crie escore global, não crie diagnóstico, não resuma as três linhas de novo e não escreva um segundo aviso.

O QUE NUNCA SE FAZ COM AS ESCALAS DA DASS-21, mesmo com classificação extrema:
Não infira depressão clínica, transtorno de ansiedade ou transtorno relacionado ao estresse a partir de nenhuma classificação. Não infira risco, urgência, funcionamento cotidiano nem causalidade entre as dimensões — "Extremamente severo" não vira conclusão de urgência, e uma classificação elevada numa escala não explica a de outra. A DASS-21 tem 21 itens, mas este perfil trabalha com as três escalas já calculadas: não crie leitura item a item, não destaque conteúdo de item específico e não invente regra de item para a DASS-21 — este instrumento não tem nenhuma nesta arquitetura.
Ancore as afirmações com "na DASS-21", "neste protocolo" ou "nesta escala".
`;

/** Os dois códigos da família SNAP-IV no catálogo. Comparados direto
 *  contra `instrumentCode`, o mesmo parâmetro que o BPA-2 e a DASS-21
 *  já usam. */
const CODIGO_SNAP18 = 'SNAP-IV-18';
const CODIGO_SNAP26 = 'SNAP-IV-26';

/** O PERFIL INTERPRETATIVO do SNAP-IV — quinto piloto da mesma
 *  arquitetura, e o primeiro que cobre DUAS versões de um instrumento com
 *  UM bloco só.
 *
 *  MESMA FAMÍLIA ESTRUTURAL DO BPA-2 E DA DASS-21: o SNAP-IV também não
 *  tem snapshot. Os domínios chegam com bruto, contagem e classificação
 *  já na tabela de resultados de sempre — `metricasDaEscala` já nomeia as
 *  duas medidas ("Pontuação bruta" e "Sintomas presentes") desde antes
 *  desta fase, e as DUAS chegam ao Relatório Pró: a auditoria confirmou
 *  contra `formatClosedResults` que nenhuma das duas fica de fora. Não há
 *  REGRA_SNAPIV pelo mesmo motivo que não há REGRA_BPA2: nada a congelar.
 *
 *  POR QUE É UMA FUNÇÃO, E NÃO UM CONST. SNAP-IV-18 e SNAP-IV-26
 *  compartilham Desatenção e Hiperatividade/Impulsividade byte a byte; o
 *  26 soma TOD. Duplicar o bloco inteiro em dois consts quase idênticos
 *  criaria dois textos livres para divergir sem ninguém notar — o mesmo
 *  risco que motivou `metricasDaEscala` a ler de um mapa único em vez de
 *  um `if` por instrumento. Em vez disso, o conteúdo COMPARTILHADO é um
 *  só, e só os trechos sobre TOD entram ou saem por parâmetro. `comTod`
 *  decide isso, e só ele: o resto do texto é idêntico nas duas versões,
 *  byte a byte — é o que os testes de família provam.
 *
 *  MÉDIA POR ITEM NÃO ENTRA AQUI. Ela já existe — implementada, para o
 *  SNAP-IV-18 — em `METRICAS_POR_INSTRUMENTO` e chega ao modelo pela
 *  `orientacaoText` que `orientacaoParaIA` já monta (userText, não system
 *  prompt; `snap18-metricas.test.ts` prova a separação). Repeti-la aqui
 *  seria uma segunda fonte da mesma regra — exatamente o padrão que este
 *  módulo evita em todo o resto do arquivo. */
function perfilInterpretativoSnapIv(comTod: boolean): string {
  const dominios = comTod
    ? 'Desatenção, Hiperatividade/Impulsividade e TOD'
    : 'Desatenção e Hiperatividade/Impulsividade';
  const versao = comTod ? '26' : '18';
  // as quatro inserções do TOD, cada uma isolada no ponto exato da frase
  // que ela completa — nenhuma reaproveita a lógica de outra
  const naoSignificaTod = comTod ? ', diagnóstico de TOD' : '';
  const nomeDaDimensaoTod = comTod
    ? ' Mesmo o domínio chamado "Transtorno Opositivo-Desafiador" é NOME DA DIMENSÃO neste instrumento: atingir o limiar nele não confirma TOD.'
    : '';
  const preferenciaTod = comTod
    ? ', ou "na dimensão TOD do SNAP-IV-26..."'
    : '';
  const proibicaoEscreverTod = comTod ? ' nem "apresenta TOD"' : '';
  const naoInferirTod = comTod ? ', inferir TOD' : '';

  return `
COMO LER O SNAP-IV — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não abre nenhuma exceção à REGRA CENTRAL: nada aqui autoriza recalcular, reclassificar, comparar Pontuação bruta com corte ou concluir diagnóstico a partir de nenhum domínio. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não repita Pontuação bruta, Sintomas presentes e classificação por domínio se a tabela já os apresenta, e não acrescente cautela nova.

Este protocolo é o SNAP-IV-${versao}, com os domínios ${dominios}. Nenhum outro domínio existe neste protocolo.

DUAS MEDIDAS, NÃO UMA (vocabulário do instrumento, não característica da pessoa):
- Pontuação bruta descreve a INTENSIDADE agregada das respostas do domínio — quanto foi marcado nos itens. Sintomas presentes descreve a CONTAGEM de itens que atingiram o critério de presença do instrumento — quantos itens, não quanto. NÃO derive uma da outra: são medidas diferentes e podem divergir sem contradição — um domínio com Pontuação bruta relativamente alta pode ficar abaixo do limiar de Sintomas presentes, e dois domínios com Pontuação bruta parecida podem ter classificações diferentes.
- A CLASSIFICAÇÃO sai da CONTAGEM de Sintomas presentes, nunca da Pontuação bruta. NÃO compare a Pontuação bruta com nenhum corte, não infira limiar pela intensidade, não recalcule a classificação e não a reinterprete: reproduza o rótulo recebido — "Atinge o limiar de sintomas deste domínio" ou "Não atinge o limiar de sintomas deste domínio" — exatamente como veio.

LIMIAR NÃO É DIAGNÓSTICO. "Atinge o limiar de sintomas deste domínio" NÃO significa diagnóstico de TDAH, apresentação desatenta, apresentação hiperativa/impulsiva${naoSignificaTod}, transtorno confirmado, quadro clínico confirmado ou indicação diagnóstica suficiente.${nomeDaDimensaoTod} Prefira "no domínio de Desatenção do SNAP-IV..." ou "o domínio de Hiperatividade/Impulsividade atingiu o limiar de sintomas definido pelo instrumento..."${preferenciaTod}, e nunca "o avaliado apresenta TDAH"${proibicaoEscreverTod}.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. DOMÍNIOS DESTE PROTOCOLO — ${dominios}, e só estes. Nenhum outro domínio existe neste protocolo.
2. DISTRIBUIÇÃO DOS LIMIARES — quais domínios atingem o limiar do próprio instrumento, quais não atingem.
3. CONFIGURAÇÃO — existe convergência entre os domínios, contraste, um domínio isoladamente acima do limiar, múltiplos domínios acima, ou nenhum acima?
4. INTENSIDADE E CONTAGEM — há diferença relevante entre a Pontuação bruta e os Sintomas presentes de um mesmo domínio, ou entre domínios? Descreva a diferença sem corrigir nada e sem explicar a causa dela.
5. MENSAGEM CENTRAL — escolha UMA leitura central do protocolo: nenhum domínio atingiu o limiar, o limiar foi atingido em um domínio só, múltiplos domínios atingiram o limiar, ou configuração contrastante entre os domínios. Só o que os dados realmente sustentarem, e sem transformar isso em diagnóstico.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal deste SNAP-IV?" priorizando quais domínios atingiram ou não o limiar, o padrão de distribuição e o contraste relevante — não repita Pontuação bruta, Sintomas presentes e classificação de cada domínio se a tabela já os apresenta. Nenhum domínio acima do limiar pede síntese CURTA; um ou mais domínios acima pedem destacar essa configuração.
- Na Análise e interpretação, relacione os domínios deste protocolo. É permitido descrever convergência, divergência, diferença de configuração e diferença entre intensidade e contagem quando houver. NÃO é permitido diagnosticar, inferir apresentação de TDAH${naoInferirTod}, inferir causa, inferir prejuízo funcional, inferir desempenho escolar, inferir funcionamento familiar, inferir necessidade medicamentosa nem inferir prognóstico.
- Nas Considerações para o contexto, o destino muda a LINGUAGEM, nunca o fato de que o resultado é rastreio/levantamento de sintomas do instrumento — nunca diagnóstico. Não escreva automaticamente "deve procurar neurologista", "precisa de medicação" nem "necessita avaliação para TDAH" só porque um domínio atingiu o limiar; integrar com outras fontes da avaliação é aceitável quando houver contexto escrito pelo profissional.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste dos outros pilotos: ele existe POR CAUSA desta configuração do SNAP-IV? Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra. Cabem, quando o perfil os sustentar: considerar separadamente os domínios quando houver contraste; não resumir todo o SNAP-IV a um único rótulo; integrar um domínio que atingiu o limiar com as demais informações disponíveis da avaliação. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica pode ser suficiente. Não produza protocolo diagnóstico nem de tratamento.
- Nas Considerações finais, feche a configuração — por exemplo, "neste protocolo, o limiar de sintomas foi atingido em um domínio, mas não no outro", sem repetir a tabela inteira — e delimite que isso NÃO constitui diagnóstico isoladamente. Não escreva um segundo aviso: o parágrafo obrigatório vem depois e basta.

O QUE NUNCA SE FAZ COM OS DOMÍNIOS DO SNAP-IV, mesmo com todos os domínios acima do limiar:
Não use rótulo que não esteja no resultado recebido — em especial "Risco de TDAH", "Limiar de Risco" ou "Sem Risco": são um esquema antigo que a correção do controlador retirou de carga, e nenhum resultado real os produz. Usá-los inventaria uma classificação que o sistema não calculou. O SNAP-IV tem itens individuais, mas este perfil trabalha com os domínios já calculados: não crie leitura item a item, e não use resposta isolada para afirmar comportamento frequente real, dificuldade escolar, impulsividade cotidiana, oposição, agressividade ou transtorno.
Ancore as afirmações com "no SNAP-IV", "neste protocolo" ou "neste domínio".
`;
}

/** O código da Bayley-III no catálogo. Comparado direto contra
 *  `instrumentCode`, o mesmo parâmetro que BPA-2, DASS-21 e a família
 *  SNAP-IV já usam. */
const CODIGO_BAYLEY3 = 'BAYLEY-III';

/** O PERFIL INTERPRETATIVO da Bayley-III — sexto piloto da mesma
 *  arquitetura, e o instrumento mais estruturalmente rico coberto até
 *  aqui: cinco domínios, dois deles com dois componentes, um com
 *  múltiplas subescalas, e DUAS réguas normativas por domínio (escalonada
 *  e composta) em vez de uma.
 *
 *  A AUDITORIA MUDOU O QUE ESTE BLOCO PODE AFIRMAR. `data/bayley3.json`,
 *  no CorrigeFacil, é controlador de NORMA — dezesseis códigos de
 *  subteste/subescala (Cog, CR, CE, MF, MG, SE, Com, FA, AD, LZ, Soc, VC,
 *  VD, SS, AC, MO), quatro tabelas de conversão escalonado→composto
 *  cobrindo cinco domínios, sete `composite_bands` ("Muito acima da
 *  média" a "Extremamente baixa"), e as tabelas de idade/prematuridade/IC
 *  que resolvem a norma no servidor. O JSON não tem uma string de nome —
 *  nenhum subteste, subescala ou domínio tem nome próprio ALI — mas os
 *  nomes existem no loader que o carrega. Os dos CINCO DOMÍNIOS vieram de
 *  `graph-config.ts` (`DOM_Cognitivo`, `DOM_Linguagem`, `DOM_Motora`,
 *  `DOM_Socioemocional`, `DOM_Adaptativo` — "os cinco domínios do Bayley,
 *  na métrica composta"), já escalas reais e aprovadas no gráfico. Os dos
 *  SEIS SUBTESTES/SUBESCALAS DE UM CÓDIGO SÓ estão em
 *  `engine/loader.py::NAMES` — Cog "Cognitivo (subteste)", CR "Comunicação
 *  receptiva", CE "Comunicação expressiva", MF "Motricidade fina", MG
 *  "Motricidade grossa", SE "Socioemocional (subteste)" —, conferido
 *  numa segunda auditoria depois da primeira versão deste bloco. Este
 *  bloco continua tratando os quatro por CÓDIGO no texto do prompt (CR,
 *  CE, MF, MG), e a glosa entre parênteses ("receptivo"/"expressivo",
 *  "fino"/"grosso") é a mesma raiz semântica do nome confirmado no
 *  loader, resumida para o prompt.
 *
 *  DUAS CAMADAS, NÃO UMA. A tabela de conversão do controlador confirma:
 *  subteste/subescala só tem `scaled` (banda 1–19) — nunca `percentile`
 *  nem classificação. Só o COMPOSTO do domínio tem `percentile`, IC
 *  (quando o servidor o publica) e cai em `composite_bands`. Não é
 *  estilo; é estrutura, e o bloco ensina a lê-la como tal.
 *
 *  ADAPTATIVO TAMBÉM PODE TER IC95 — a primeira versão deste bloco dizia
 *  o contrário, apoiada só no comentário de `graph-config.ts`
 *  ("Adaptativo não tem IC95 publicado"), que descrevia o gráfico
 *  aprovado e não o controlador inteiro. `engine/loader.py` mostra a
 *  fonte: os outros quatro domínios trazem o IC95 já escrito na própria
 *  linha da tabela `composites`, mas o Comportamento Adaptativo (CAG) é o
 *  ÚNICO cujo IC95 depende da IDADE — o loader monta essa margem a partir
 *  de `ic_bands` (`CAG95` por faixa etária em meses) e grava
 *  `composite ± margem` como o `ci95` da linha de `DOM_Adaptativo`, pelo
 *  mesmo campo que os outros quatro usam. A ORIGEM do número muda por
 *  domínio; o que o Relatório Pró recebe não muda: um `ci95` pronto,
 *  quando o servidor o envia, tratado igual em qualquer dos cinco. Por
 *  isso o texto do prompt nunca precisou dizer "Adaptativo não tem IC" —
 *  só a nota de auditoria deste comentário dizia, e é ela que está
 *  corrigida agora.
 *
 *  NÃO HÁ REGRA_BAYLEY3 pelo mesmo motivo que não há REGRA_BPA2: nenhuma
 *  das duas camadas é snapshot — as duas chegam pelos resultados por
 *  escala de sempre, e nada aqui precisa ser congelado. */
const PERFIL_INTERPRETATIVO_BAYLEY3 = `
COMO LER A BAYLEY-III — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não abre nenhuma exceção à REGRA CENTRAL: nada aqui autoriza recalcular, reclassificar, converter uma régua na outra, escolher faixa etária, decidir correção de prematuridade ou concluir diagnóstico a partir de nenhum domínio. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não percorra os cinco domínios e os subtestes como tabela em prosa, e não acrescente cautela nova.

CAMADAS DIFERENTES, NUNCA UMA VIRA A OUTRA (vocabulário do instrumento, não característica da criança):
- ESCORE ESCALONADO é o resultado normativo de CADA SUBTESTE OU SUBESCALA, numa régua própria. Ele NÃO vem com classificação nem com percentil — só o número escalonado.
- ESCORE COMPOSTO é o resultado normativo de CADA DOMÍNIO, numa régua diferente da do subteste, e é ele que vem acompanhado de PERCENTIL e, quando o servidor o publicou, de INTERVALO DE CONFIANÇA. É neste nível que existe CLASSIFICAÇÃO — não no subteste.
- NÃO converta um escalonado em composto, não some escalonados para reconstruir um composto, e não estime percentil, IC ou classificação para um subteste: ele não tem essas três coisas, e inventá-las cria dado que o sistema não calculou. NÃO compare o número de um subteste com o número de um composto como se fossem a mesma régua — "o subteste está abaixo do composto" mistura duas escalas diferentes e não pode aparecer no texto.
- Onde o IC vier, trate-o como o intervalo já calculado para aquela estimativa. Não recalcule, não use o limite inferior nem o superior para criar uma segunda classificação, e não escolha "a classificação mais provável" dentro do intervalo — a classificação já veio pronta, ao lado do composto.

OS CINCO DOMÍNIOS (vocabulário do instrumento, não característica da criança):
- Cognitivo é composto por um subteste só. Não o transforme em inteligência global, QI, deficiência intelectual, capacidade intelectual geral nem prognóstico cognitivo. Prefira "no domínio Cognitivo da Bayley-III, o resultado...".
- Linguagem integra dois componentes, receptivo (CR) e expressivo (CE). Quando os dois chegarem, é permitido comparar: distribuição semelhante, diferença entre os componentes, um relativamente mais elevado ou mais baixo. NÃO conclua transtorno de linguagem, atraso de linguagem, dificuldade de compreensão cotidiana nem dificuldade de fala cotidiana sem outras informações.
- Motora integra dois componentes, fino (MF) e grosso (MG). Mesma regra: comparação permitida quando os dois chegarem, sem virar atraso motor diagnosticado, alteração neurológica, dificuldade funcional real ou etiologia motora. Ancore sempre em "nas tarefas/subtestes avaliados".
- Socioemocional é composto por uma medida só. Use somente a estrutura fornecida: não infira transtorno emocional, TEA, vínculo, regulação emocional global nem comportamento social cotidiano a partir do escore ou da classificação isolados.
- Adaptativo pode integrar múltiplas subescalas. Quando várias chegarem, observe homogeneidade, heterogeneidade, subescala destoante ou agrupamento realmente visível entre elas — nunca um agrupamento que os dados não sustentem. Uma classificação inferior aqui não vira incapacidade funcional, dependência nem prejuízo adaptativo clínico.

A BAYLEY-III NÃO TEM RESULTADO GLOBAL. Os cinco domínios são compostos DISTINTOS: não existe soma, média nem composto único dos cinco. NÃO escreva "escore global Bayley", "resultado global Bayley", "desenvolvimento global de X", "classificação global", "pontuação total" nem "índice geral" quando a expressão sugerir uma medida composta única que não existe — a regra é SEMÂNTICA: qualquer formulação que leve o leitor a esperar um número único da Bayley-III tem o mesmo defeito. Diga o que existe, conforme o caso: o conjunto dos resultados, o perfil entre os domínios, a configuração observada ou a distribuição dos resultados.

A BAYLEY-III NÃO TEM IDADE EQUIVALENTE NESTA IMPLEMENTAÇÃO. Não converta nenhum resultado — escalonado, composto, percentil ou classificação — em idade de desenvolvimento, idade equivalente, idade mental, "funciona como uma criança de X meses", "está X meses atrasado" nem "tem atraso de X meses", a menos que um campo explícito com esse significado tenha sido entregue pelo sistema. Nenhum destes é derivável do que este bloco descreve.

IDADE E PREMATURIDADE JÁ FORAM RESOLVIDAS PELO SISTEMA. A idade na avaliação, quando corrigida por prematuridade, já chega identificada como tal; isso é dado factual do protocolo, e pode ser mencionado como tal. NÃO calcule idade corrigida, não decida se a prematuridade deveria ser corrigida, não aplique semanas × dias, não escolha nem revise faixa etária: a seleção normativa é do sistema, não sua.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. MAPEAR O QUE EXISTE — quais domínios, subtestes e componentes realmente estão presentes neste protocolo. Não complete medida ausente.
2. DISTRIBUIÇÃO ENTRE DOMÍNIOS — os compostos estão homogêneos, predominantemente na média, predominantemente abaixo, predominantemente acima, ou heterogêneos? Use somente as classificações recebidas.
3. CONTRASTES ENTRE DOMÍNIOS — existe domínio realmente destoante dos demais? Quando existir, pode ser nomeado. Não explique a causa.
4. CONTRASTES INTERNOS — quando um domínio tiver mais de um componente (Linguagem, Motora) ou múltiplas subescalas (Adaptativo), verifique diferença interna realmente sustentada. Não a transforme em mecanismo causal.
5. SUBTESTE × COMPOSTO — o composto já integra os subtestes daquele domínio; não interprete o composto como uma tarefa nova, e não conte a mesma informação duas vezes. Os componentes servem para mostrar a configuração INTERNA, não para duplicar o resultado do domínio.
6. MENSAGEM CENTRAL — escolha UMA leitura principal: perfil homogêneo, perfil heterogêneo, domínio específico destoante, contraste interno num domínio, ou distribuição predominante numa região classificatória. Só o que os dados realmente sustentarem.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal desta Bayley-III?" priorizando a distribuição entre os domínios e o principal contraste, quando houver — não percorra os cinco domínios e os subtestes como tabela em prosa. Perfil homogêneo pede síntese CURTA; perfil heterogêneo destaca só os contrastes realmente úteis.
- Na Análise e interpretação, articule os domínios, aprofunde o contraste relevante, use os componentes internos SÓ quando acrescentarem informação, e diferencie subteste de composto o tempo todo. Diga o que o padrão mostra DENTRO da Bayley-III. NÃO explique causa, não diagnostique atraso, não infira TEA, deficiência intelectual, transtorno do desenvolvimento, prognóstico ou funcionamento cotidiano além do dado, e não crie idade equivalente.
- Nas Considerações para o contexto, é permitido orientar integração com observação, história do desenvolvimento e outras fontes profissionais, quando pertinente. NÃO prescreva terapia, estimulação, intervenção, encaminhamento ou frequência terapêutica só a partir da Bayley-III.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste dos outros pilotos: ele existe POR CAUSA desta configuração da Bayley-III? Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra. Cabem, quando o perfil os sustentar: considerar separadamente dois componentes de um domínio quando houver contraste relevante; não resumir o perfil a um único domínio quando houver heterogeneidade; preservar a diferença entre resultado composto e configuração interna dos subtestes. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica pode ser suficiente. Não fabrique intervenção.
- Nas Considerações finais, feche a mensagem central. Não repita todos os escores, não crie um "nível global", não repita recomendações, não crie diagnóstico, não crie idade de desenvolvimento e não escreva um segundo aviso.

RESULTADOS INFERIORES NÃO AUTORIZAM, mesmo com todos os domínios abaixo da média: atraso global do desenvolvimento, atraso do desenvolvimento, deficiência intelectual, TEA, transtorno de linguagem, transtorno motor, transtorno do neurodesenvolvimento nem incapacidade adaptativa. RESULTADOS SUPERIORES NÃO AUTORIZAM, mesmo com todos os domínios acima da média: desenvolvimento avançado global, superdotação nem altas habilidades, sem fonte específica adicional. A classificação da Bayley-III é resultado do instrumento — não é diagnóstico, em nenhuma direção.
Ancore as afirmações com "na Bayley-III", "neste protocolo" ou "neste domínio".
`;

/** O código do SDQ-POR no catálogo. Comparado direto contra
 *  `instrumentCode`, o mesmo parâmetro que BPA-2, DASS-21, SNAP-IV e a
 *  Bayley-III já usam. */
const CODIGO_SDQ_POR = 'SDQ-POR';

/** O PERFIL INTERPRETATIVO do SDQ-POR — sétimo piloto da mesma
 *  arquitetura. Mesma família estrutural do BPA-2 e da DASS-21: sem
 *  snapshot, sem REGRA_SDQ_POR — as sete escalas (EMO, CON, HIP, PAR,
 *  PRO, IMPACTO e o composto TOTAL) chegam pelos resultados por escala
 *  de sempre.
 *
 *  A ASSIMETRIA QUE IMPORTA AQUI: só DUAS das sete escalas têm
 *  classificação. `data/sdq_por.json`, no CorrigeFacil, tem
 *  `classification_bands` no nível raiz (as quatro faixas do TOTAL) e
 *  dentro da escala IMPACTO (as quatro faixas dela) — e em NENHUM outro
 *  lugar. EMO, CON, HIP, PAR e PRO não têm campo de faixa nenhum.
 *  `graph-config.ts` confirma isso já em produção: as quatro escalas de
 *  dificuldade saem do gráfico do TOTAL com o motivo "subescala sem
 *  faixa publicada", e PRO sai com dois motivos — "direção OPOSTA
 *  (competência preservada, não dificuldade)" e "única das cinco que não
 *  entra no TOTAL". As duas frases vieram de lá, não foram inferidas
 *  aqui.
 *
 *  O GATE DO IMPACTO é servidor, confirmado em `engine/calc.py::GATES`:
 *  a pergunta de porta fecha a escala em zero, abre para a soma de três
 *  itens, ou — faltando a porta ou algum dos três — tira a escala do
 *  resultado inteiramente. Este módulo não vê a porta: o Relatório Pró
 *  recebe RESULTADO por escala, nunca resposta item a item — confirmado
 *  contra `formatClosedResults` e contra a ausência de qualquer query de
 *  `assessment_responses` no gerador. Por isso o bloco proíbe reconstruir
 *  a pergunta que abre a seção, e não a nomeia por número: não há
 *  necessidade de o modelo saber que ela existe.
 *
 *  NÃO HÁ REGRA_SDQ_POR pelo mesmo motivo que não há REGRA_BPA2: nenhuma
 *  das sete escalas é snapshot. */
const PERFIL_INTERPRETATIVO_SDQ_POR = `
COMO LER O SDQ-POR — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não abre nenhuma exceção à REGRA CENTRAL: nada aqui autoriza recalcular, reclassificar, somar escalas ou concluir diagnóstico a partir de nenhuma delas. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não percorra as sete escalas como tabela em prosa, e não acrescente cautela nova.

O TOTAL É COMPOSTO, NÃO É UMA SEXTA MEDIDA. O Total de Dificuldades já chega calculado a partir de quatro escalas — Dificuldades Emocionais, Dificuldades de Conduta, Hiperatividade e Problemas com Pares —, e SÓ dessas quatro: Pró-Social não entra no Total, e o Escore de Impacto também não. NÃO some as quatro escalas para conferir o Total, não o trate como uma quinta dificuldade e não o recalcule: ele já veio fechado, e a soma pertence ao servidor.

CLASSIFICAÇÃO: SÓ O TOTAL E O IMPACTO TÊM. Dificuldades Emocionais, Dificuldades de Conduta, Hiperatividade, Problemas com Pares e Pró-Social chegam SEM classificação — o servidor não publica faixa normativa para nenhuma delas nesta implementação. NÃO invente uma: não escreva "Emocional alto", "Conduta elevada", "Hiperatividade moderada", "Problemas com Pares muito altos" nem "Pró-Social baixo" se esse rótulo não veio do sistema. É permitido descrever DIFERENÇA NUMÉRICA entre as quatro escalas de dificuldade quando os dados realmente sustentarem — algo como "entre as quatro escalas que compõem o Total, a pontuação de Dificuldades Emocionais foi numericamente maior..." —, mas isso NÃO é classificação, e não deve soar como uma.

PRÓ-SOCIAL TEM DIREÇÃO ESTRUTURALMENTE OPOSTA às quatro escalas de dificuldade: ela mede competência preservada, não dificuldade, e por isso fica fora do Total. NÃO a leia como "quinta dificuldade", não trate pontuação de Pró-Social mais alta como mais problema nem mais baixa como transtorno social, e não a apresente como fator protetivo comprovado nem como algo que "compensa" um Total elevado. Havendo contraste entre Pró-Social e o conjunto de dificuldades, descreva a coexistência das duas medidas — nunca o mecanismo entre elas, e nunca como compensação ou proteção.

O ESCORE DE IMPACTO É CAMADA SEPARADA — não é componente do Total, não é uma quinta escala de dificuldade e não é diagnóstico. Ele só existe no resultado quando o protocolo o produziu; sem ele, não há linha de Impacto para comentar. Quando existir, use exatamente a classificação recebida — "Sem Impacto", "Impacto Leve", "Impacto Moderado" ou "Impacto Grave" — sem gradação própria. NÃO reconstrua a origem desse resultado: o Impacto vem de uma pergunta de porta que este relatório não recebe, e "Sem Impacto" NÃO autoriza escrever que "o respondente informou que não há dificuldade" nem qualquer frase que presuma a resposta daquela pergunta. A única afirmação segura é "o Escore de Impacto foi classificado como Sem Impacto", ou equivalente ancorado no protocolo — não a origem dela.

TOTAL E IMPACTO PODEM DIVERGIR, E ISSO NÃO É CONTRADIÇÃO. Um Total Muito Alto ao lado de um Impacto Sem Impacto — ou o inverso — são configurações legítimas, porque as duas medem aspectos diferentes. NÃO escreva que isso é erro, contradição, inconsistência ou falha de preenchimento, e não explique a causa da diferença: descreva que as duas medidas apresentaram configurações diferentes, e pare aí. Da mesma forma, um Total menos elevado ao lado de um Impacto mais elevado não autoriza concluir que "o impacto é desproporcional" — descreva as duas camadas, sem julgar uma pela ótica da outra.

ITENS INDIVIDUAIS NÃO CHEGAM A VOCÊ. Você recebe os resultados por escala — nunca as respostas item a item do SDQ-POR. Em especial, você NÃO recebe a resposta que abre a Seção de Impacto, a duração das dificuldades nem o peso que elas representam para quem respondeu: não infira nenhuma delas, e não presuma o que qualquer uma diz. Não escreva "impacto nas amizades", "impacto escolar" nem "impacto no aprendizado" a partir do Escore de Impacto agregado — o número não diz qual pergunta específica produziu os pontos.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. TOTAL — qual classificação ele recebeu?
2. CONFIGURAÇÃO DAS QUATRO DIFICULDADES — Dificuldades Emocionais, de Conduta, Hiperatividade e Problemas com Pares apresentam distribuição semelhante? Há alguma pontuação numericamente destoante? Sem criar classificação para nenhuma delas.
3. PRÓ-SOCIAL — considere separadamente; nunca some ao Total; nunca leia na mesma direção das dificuldades.
4. IMPACTO — existe resultado? Se existir, qual classificação veio? Como ele se relaciona DESCRITIVAMENTE com o Total? Nunca reconstrua a origem dele.
5. CONTRASTES — Total × componentes, Total × Impacto, dificuldades × Pró-Social — só quando forem reais.
6. MENSAGEM CENTRAL — escolha UMA configuração principal. Só o que os dados realmente sustentarem.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal deste SDQ-POR?" priorizando a classificação do Total, o padrão relevante entre as quatro escalas de dificuldade, o Impacto quando existir e acrescentar informação, e a Pró-Social só quando for relevante para a configuração — não liste cada escala como tabela em prosa. Perfil homogêneo pede síntese CURTA.
- Na Análise e interpretação, relacione as quatro escalas de dificuldade como componentes do Total, integre o Total como síntese composta delas, e separe Pró-Social e Impacto como dimensões fora do Total. NÃO explique causa, não diagnostique, não infira prognóstico, funcionamento cotidiano, desempenho escolar ou prejuízo específico, e não explique nenhuma discrepância entre as camadas.
- Nas Considerações para o contexto, o destino muda a linguagem, nunca a interpretação. Não transforme automaticamente Hiperatividade numericamente elevada em TDAH, Conduta numericamente elevada em transtorno de conduta, Dificuldades Emocionais numericamente elevadas em transtorno emocional, Problemas com Pares numericamente elevados em problema social clínico, Pró-Social numericamente reduzida em déficit social, Total Muito Alto em psicopatologia global nem Impacto Grave em incapacidade funcional geral.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste dos outros pilotos: ele existe POR CAUSA desta configuração do SDQ-POR? Se a mesma frase caberia igual em qualquer outro instrumento do catálogo, ela não entra. Cabem, quando o perfil os sustentar: considerar separadamente os componentes do Total quando houver heterogeneidade importante; não resumir toda a configuração ao Total quando uma escala componente destoar; integrar separadamente Total e Impacto quando apresentarem configurações diferentes; preservar a leitura independente da Pró-Social, sem incorporá-la ao Total. NÃO EXISTE QUANTIDADE MÍNIMA: uma recomendação específica pode bastar. Não fabrique encaminhamento, terapia, medicação, adaptação escolar nem protocolo diagnóstico.
- Nas Considerações finais, feche a mensagem central. Não repita todas as escalas, não crie diagnóstico, não repita recomendações e não escreva um segundo aviso.

O QUE NUNCA SE FAZ COM O SDQ-POR, mesmo com o Total em Muito Alto ou o Impacto em Grave: não infira TDAH, transtorno de conduta, transtorno emocional, transtorno de ansiedade, transtorno depressivo, TEA nem transtorno opositor a partir de nenhuma escala ou classificação. Não escreva "psicopatologia global", "déficit global" nem "problema comportamental global". Não trate o Total como diagnóstico global, a Pró-Social como fator protetivo comprovado nem o Impacto como prova de prejuízo específico em amizade ou escola. Não explique causa nem preveja prognóstico.
Ancore as afirmações com "no SDQ-POR", "neste protocolo" ou "nesta escala".
`;

/** O código do C-TRF 1½-5 no catálogo. Comparado direto contra
 *  `instrumentCode`, o mesmo parâmetro que os sete pilotos anteriores já
 *  usam. */
const CODIGO_CTRF = 'C-TRF_1.5-5';

/** O PERFIL INTERPRETATIVO do C-TRF 1½-5 — oitavo piloto da mesma
 *  arquitetura, mesma família estrutural do BPA-2, da DASS-21, do
 *  SNAP-IV, da Bayley-III e do SDQ-POR: sem snapshot, sem REGRA_CTRF — as
 *  nove escalas (seis síndromes, Internalização, Externalização e Total
 *  de Problemas) chegam pelos resultados por escala de sempre. Reusa
 *  `instrumentCode` — mais um `const comCtrf` local, nenhuma mudança de
 *  assinatura.
 *
 *  A HIERARQUIA QUE ESTE MAPA ENSINA: o C-TRF não é nove medidas soltas.
 *  `data/ctrf_1.5-5.json`, no CorrigeFácil, declara em `scales` seis
 *  escalas `type: "syndrome"` (I a VI) e três `type: "broadband"` — INT
 *  (`composed_of: ["I","II","III","IV"]`), EXT (`composed_of:
 *  ["V","VI"]`) e TOT (`composed_of: "ALL_ITEMS"`). TOT NÃO é INT+EXT: o
 *  controlador tem itens fora das seis síndromes (`items[].scale: null`)
 *  que só entram no Total. Um modelo sem este mapa lê as três bandas
 *  largas como "mais duas síndromes" e tenta reconstruir o Total somando
 *  INT e EXT — e erraria, porque a soma delas não fecha o Total real.
 *
 *  NENHUM CORTE NUMÉRICO ENTRA AQUI. `cutoffs.syndrome` (65/70) e
 *  `cutoffs.broadband` (60/64) existem no controlador e já resolveram a
 *  classificação no servidor; este bloco não os reproduz — a
 *  classificação chega FEITA na tabela de resultados, e repetir os
 *  números convidaria o modelo a comparar T com corte por conta própria,
 *  exatamente o que a REGRA CENTRAL já proíbe.
 *
 *  Entra sozinho, sem REGRA para acompanhar — do mesmo jeito que BPA-2,
 *  DASS-21, SNAP-IV, Bayley-III e SDQ-POR — e byte a byte ausente quando
 *  o instrumento não é este. */
const PERFIL_INTERPRETATIVO_CTRF = `
COMO LER O C-TRF 1½-5 — PERFIL INTERPRETATIVO:
Este bloco diz como ORGANIZAR os resultados fechados que você recebeu. Ele não abre nenhuma exceção à REGRA CENTRAL: nada aqui autoriza recalcular T, aplicar corte, reclassificar, converter T em percentil, estimar percentil ou reconstruir qualquer escala. O ganho pedido é de RACIOCÍNIO, não de tamanho — não alongue o texto, não percorra as nove escalas como tabela em prosa, e não acrescente cautela nova.

TRÊS CAMADAS, NÃO NOVE MEDIDAS SOLTAS:
- CAMADA 1 — seis escalas específicas (síndromes): Reatividade Emocional, Ansiedade/Depressão, Queixas Somáticas, Isolamento, Problemas de Atenção e Comportamento Agressivo.
- CAMADA 2 — dois eixos amplos: Internalização agrega Reatividade Emocional, Ansiedade/Depressão, Queixas Somáticas e Isolamento; Externalização agrega Problemas de Atenção e Comportamento Agressivo. Cada eixo é a leitura combinada das escalas que o compõem, não uma sétima e oitava síndrome independentes.
- CAMADA 3 — Total de Problemas, calculado sobre TODOS os itens do protocolo, não só sobre os que compõem as seis síndromes. NÃO trate o Total como Internalização mais Externalização e NÃO tente conferir, somar ou reconstruir essa soma: há itens do instrumento fora das seis escalas de síndrome que só entram no Total, e a soma de INT com EXT não fecha o valor real dele. Use somente o Total fechado que veio na tabela de resultados.

T-SCORE E CLASSIFICAÇÃO SÃO DADOS FECHADOS. Preserve exatamente o T e a classificação recebidos de cada escala. Não recalcule T a partir do bruto, não aplique corte, não reclassifique, não verifique se a classificação "bate" com o T, não converta T em percentil, não estime percentil, não use distribuição normal e não trate T como diagnóstico. As nove escalas usam réguas diferentes entre síndromes e bandas largas — a diferença já está resolvida na classificação que você recebeu; você não precisa e não deve saber onde o corte fica.

NOMES DE ESCALA NÃO SÃO DIAGNÓSTICO, mesmo com classificação clínica: Ansiedade/Depressão não é diagnóstico de ansiedade nem de depressão; Problemas de Atenção não é TDAH; Comportamento Agressivo não é transtorno de conduta nem TOD; Isolamento não é TEA nem transtorno social; Queixas Somáticas não é transtorno somático; Reatividade Emocional não é transtorno emocional; Internalização não é transtorno internalizante; Externalização não é transtorno externalizante; Total de Problemas não é psicopatologia global, gravidade clínica global nem diagnóstico global. Nenhuma dessas conversões é permitida em nenhum destino, mesmo diante de classificação Clínica.

O CONTROLADOR TEM DESCRIÇÕES CONCEITUAIS de cada escala — o que ela tipicamente capta. Uma descrição conceitual NÃO é prova de manifestação específica: uma classificação elevada em Problemas de Atenção não autoriza escrever que "a criança apresenta impulsividade, agitação e baixa persistência" se esses comportamentos não vieram nos resultados ou no contexto escrito pelo profissional. A escala é uma dimensão avaliada, e o nome da dimensão não prova cada manifestação da sua descrição conceitual.

INFORMANTE: o C-TRF é respondido por Professor/Cuidador. Ancore a leitura na fonte do protocolo — "no protocolo respondido pelo professor/cuidador...", "nos resultados deste C-TRF..." — em vez de escrever automaticamente "a criança é...". Você recebe um único respondente por avaliação: não invente comparação, concordância ou discrepância entre informantes que não foram fornecidos.

CONTRASTES ENTRE ESCALAS PODEM SER DESCRITOS quando os dados realmente sustentarem — Internalização mais elevada que Externalização, uma escala específica destoando das demais dentro do mesmo eixo. Descreva a configuração observada ("na configuração observada, os resultados do eixo de Internalização apresentaram maior elevação...") e não explique a causa do contraste. Evite rótulos que soem categoria clínica não fornecida pelo sistema, como "predomínio internalizante".

TOTAL ELEVADO NÃO APAGA A CONFIGURAÇÃO DAS ESCALAS ESPECÍFICAS: um Total elevado pode coexistir com perfil interno heterogêneo, e o Total não substitui a leitura das camadas 1 e 2. Não escreva "índice global de psicopatologia", "gravidade global", "nível geral de transtorno", "quadro global" nem "comprometimento global" para o Total.

ANTES DE ESCREVER, ORGANIZE OS RESULTADOS (raciocínio interno: NÃO imprima esta lista, não a numere no texto e não crie seção para ela):
1. TOTAL DE PROBLEMAS — qual classificação ele recebeu?
2. INTERNALIZAÇÃO E EXTERNALIZAÇÃO — como os dois eixos se distribuem entre si?
3. AS SEIS ESCALAS ESPECÍFICAS — como elas se distribuem dentro de cada eixo?
4. CONTRASTES REAIS — Internalização × Externalização; dentro de Internalização; dentro de Externalização — só os que os dados sustentarem.
5. O QUE O TOTAL ACRESCENTA — ele confirma a configuração dos eixos, ou traz informação que eles sozinhos não mostrariam? Não repita os outros resultados só para preencher a seção.
6. MENSAGEM CENTRAL — escolha UMA configuração principal para organizar Síntese e Análise.

COMO ISSO ENTRA NAS CINCO SEÇÕES:
- Na Síntese dos resultados, responda "qual é a configuração principal deste C-TRF?" priorizando o Total, os dois eixos amplos e o contraste realmente relevante — não enumere as nove escalas em sequência mecânica. Perfil homogêneo pede síntese CURTA.
- Na Análise e interpretação, integre as seis escalas específicas aos dois eixos amplos e ao Total, SEM dizer que as escalas específicas "causam" os eixos ou o Total — são camadas de agregação, não relação causal. Não recite todas as seis escalas se estiverem homogêneas; dê atenção às diferenças que realmente mudem a leitura da configuração.
- Nas Considerações para o contexto, trate Família, Escola, Equipe técnica e Registro interno como destinos NARRATIVOS: eles mudam a voz, nunca a psicometria. Não transforme resultado em afirmação automática de prejuízo escolar, prejuízo familiar, dificuldade de aprendizagem, problema de relacionamento, incapacidade funcional ou necessidade de tratamento sem dado contextual correspondente escrito pelo profissional.
- Nas Recomendações e acompanhamento, cada item passa pelo mesmo teste dos pilotos anteriores: ele existe POR CAUSA desta configuração do C-TRF? NÃO recomende automaticamente psicoterapia, psiquiatria, neurologia, medicação, adaptação escolar, avaliação diagnóstica, tratamento ou encaminhamento só porque uma escala ou o Total veio elevado ou Clínico. NÃO EXISTE QUANTIDADE MÍNIMA.
- Nas Considerações finais, feche a MENSAGEM CENTRAL sem repetir as nove escalas nem as recomendações.

O QUE NUNCA SE FAZ COM O C-TRF, mesmo com classificação Clínica em qualquer escala: não infira ansiedade, depressão, TDAH, transtorno de conduta, TOD, TEA, transtorno social, transtorno somático nem transtorno emocional a partir do NOME de uma escala. Não trate Internalização como transtorno internalizante, Externalização como transtorno externalizante nem o Total como psicopatologia, gravidade ou diagnóstico global. Não recalcule T, não aplique corte, não converta T em percentil e não reconstrua o Total a partir de Internalização e Externalização.
Ancore as afirmações com "no C-TRF", "neste protocolo" ou "nos resultados deste C-TRF respondido pelo professor/cuidador".
`;

export function buildCorrigeFacilSystemPrompt(
  reportType: ReportType,
  avisoFinal: string,
  /** true só quando a avaliação traz o derivado do CONFIAS. O padrão
   *  mantém o prompt dos outros instrumentos byte a byte como estava.
   *
   *  Como em `comFdt`, este sinalizador liga DOIS blocos: a REGRA_DERIVADOS,
   *  que fecha o dado, e o PERFIL_INTERPRETATIVO_CONFIAS, que diz como
   *  lê-lo. Não há sinalizador novo para o mapa — ele nasce preso à mesma
   *  trava que já condicionava o dado. */
  comDerivado = false,
  /** idem, para o derivado do PHQ-9. São dois sinalizadores e não um: cada
   *  regra só entra quando o bloco dela existe, e um relatório de PHQ-9 não
   *  tem por que receber instrução sobre perfil de habilidade. */
  comPhq9 = false,
  /** idem, para o derivado do FDT. Três sinalizadores e não um: cada regra
   *  só entra quando o bloco dela existe, e um relatório de FDT não tem por
   *  que receber instrução sobre perfil de habilidade nem sobre item 9.
   *
   *  Este é o único dos três que liga DOIS blocos: a REGRA_FDT, que fecha o
   *  dado, e o PERFIL_INTERPRETATIVO_FDT, que diz como lê-lo. São um par —
   *  mapa sem trava vira extrapolação, trava sem mapa vira burocracia — e
   *  por isso saem juntos do mesmo sinalizador. */
  comFdt = false,
  /** O código do instrumento no catálogo (ex.: "BPA-2"), para os
   *  perfis interpretativos que NÃO dependem de snapshot algum — o
   *  BPA-2 é o primeiro caso. Ele chega calculado e classificado pelos
   *  resultados por escala de sempre; não há nada para congelar, e por
   *  isso não há um `comBpa2` pareado com REGRA nenhuma.
   *
   *  É um parâmetro, não um booleano por instrumento: o próximo
   *  instrumento sem snapshot compara o MESMO `instrumentCode` com o
   *  próprio código, sem abrir posição nova na assinatura. Vazio por
   *  padrão — quem chama sem passar nada mantém o prompt de sempre. */
  instrumentCode = '',
): string {
  const comBpa2 = instrumentCode === CODIGO_BPA2;
  const comDass21 = instrumentCode === CODIGO_DASS21;
  const comSnap18 = instrumentCode === CODIGO_SNAP18;
  const comSnap26 = instrumentCode === CODIGO_SNAP26;
  const comBayley3 = instrumentCode === CODIGO_BAYLEY3;
  const comSdqPor = instrumentCode === CODIGO_SDQ_POR;
  const comCtrf = instrumentCode === CODIGO_CTRF;

  return `Você redige rascunhos profissionais de apoio a partir de resultados já calculados pelo CorrigeFácil.

Responda exclusivamente em português brasileiro.

REGRA CENTRAL — DADOS FECHADOS:
Os resultados fornecidos foram calculados e classificados pelo CorrigeFácil. Trate-os como dados fechados. Preserve exatamente os valores e classificações recebidos. Não recalcule escores, percentis, z, IC95 ou classificações. Não determine pontos de corte, não selecione normas, não reconstrua tabelas normativas e não altere valores.

${comDerivado ? REGRA_DERIVADOS + PERFIL_INTERPRETATIVO_CONFIAS : ''}${comPhq9 ? REGRA_PHQ9 : ''}${comFdt ? REGRA_FDT + PERFIL_INTERPRETATIVO_FDT : ''}${comBpa2 ? PERFIL_INTERPRETATIVO_BPA2 : ''}${comDass21 ? PERFIL_INTERPRETATIVO_DASS21 : ''}${(comSnap18 || comSnap26) ? perfilInterpretativoSnapIv(comSnap26) : ''}${comBayley3 ? PERFIL_INTERPRETATIVO_BAYLEY3 : ''}${comSdqPor ? PERFIL_INTERPRETATIVO_SDQ_POR : ''}${comCtrf ? PERFIL_INTERPRETATIVO_CTRF : ''}
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
  /**
   * DECIDIDO PELA ROTA, no servidor. Não vem do body, não vem do cliente e
   * não é inferido aqui: 'subscription' quando há Relatório Pró ativo,
   * 'free_demo' quando não há. O banco revalida tudo na RPC de reserva.
   */
  billingOrigin: 'subscription' | 'free_demo';
}) {
  const {
    supabase,
    userId,
    body,
    currentMonthlyCount,
    monthlyLimit,
    avisoFinal,
    billingOrigin,
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

  // ==================================================================
  // A RESERVA — ANTES DA IA, e só para a demonstração gratuita.
  //
  // Ela vem AQUI, e não no começo da função, de propósito: tudo que podia
  // falhar por dado já falhou acima — avaliação carregada, posse conferida,
  // nome e idade presentes, instrumento resolvido, resultados existentes,
  // prompt montado. Reservar antes disso gastaria a única chance da conta
  // num erro de preenchimento.
  //
  // Daqui para baixo vale a regra que sustenta o produto inteiro: quem não
  // ganhou a reserva NÃO chama a OpenAI.
  // ==================================================================
  let reservedReportId: string | null = null;

  if (billingOrigin === 'free_demo') {
    const { data: reservation, error: reserveError } = await supabase.rpc(
      'reserve_corrigefacil_free_demo_report',
      { assessment_uuid: assessmentId },
    );

    if (reserveError) {
      console.error('CorrigeFácil free demo reserve error:', reserveError);
      return NextResponse.json(
        { message: 'Não foi possível iniciar a demonstração gratuita.' },
        { status: 500 },
      );
    }

    const reserved = Array.isArray(reservation) ? reservation[0] : reservation;
    const reservationStatus: string | null =
      reserved?.reservation_status ?? null;

    if (reservationStatus !== 'reserved') {
      // Inclui `use_subscription`: se o banco disser que esta conta tem Pró
      // ativo, a demonstração não acontece — falha fechada, sem gerar nada.
      const negativa =
        FREE_DEMO_DENIAL[reservationStatus ?? ''] ?? FREE_DEMO_DENIAL.ineligible;
      return NextResponse.json(
        { message: negativa.message },
        { status: negativa.status },
      );
    }

    reservedReportId = reserved?.report_id ?? null;

    if (!reservedReportId) {
      return NextResponse.json(
        { message: 'Não foi possível iniciar a demonstração gratuita.' },
        { status: 500 },
      );
    }
  }

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
          instrument.code,
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
    // Nenhum valor foi entregue ao usuário: a chance volta.
    await releaseFreeDemo(supabase, reservedReportId);
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

  if (billingOrigin === 'free_demo') {
    // Finaliza a MESMA linha que foi reservada. Nenhuma linha nova nasce
    // aqui: se nascesse, a conta teria duas demonstrações.
    const { error: completeError } = await supabase.rpc(
      'complete_corrigefacil_free_demo_report',
      {
        report_uuid: reservedReportId,
        new_title: reportTitle,
        new_report_type: reportType,
        new_input_text: savedInput,
        new_output_text: generatedText,
      },
    );

    if (completeError) {
      console.error('CorrigeFácil free demo complete error:', completeError);
    }

    // A VERDADE é a releitura, não a resposta da RPC — e ela é EXPLÍCITA,
    // não herdada da RLS. É por isso que o `completeError` acima é só
    // registrado: ele não decide nada sozinho, nos dois sentidos.
    const confirmacao = await confirmarDemoConcluida(
      supabase,
      reservedReportId,
    );

    if (confirmacao.estado === 'indeterminado') {
      // AMBÍGUO: nenhuma tentativa conseguiu ler a linha. `complete` pode
      // ter commitado, e apagar uma linha cujo estado não conseguimos ver
      // seria destruir um relatório possivelmente entregue.
      //
      // Por isso NÃO se devolve a chance aqui. Se a linha estiver completed,
      // ela já está no histórico; se estiver pending, o TTL de 30 minutos a
      // recupera na próxima tentativa. Esperar é reversível, apagar não é.
      console.error(
        'CorrigeFácil free demo: confirmação indeterminada para',
        reservedReportId,
      );
      return NextResponse.json(
        {
          message:
            'Não foi possível confirmar a conclusão da demonstração gratuita. Confira seu histórico em instantes antes de tentar novamente.',
        },
        { status: 503 },
      );
    }

    if (confirmacao.estado === 'ausente') {
      // O banco RESPONDEU e não há relatório concluído: não finalizou.
      // Devolve a chance e NÃO entrega o texto — entregar seria dar o valor
      // e cobrar a demonstração assim mesmo.
      await releaseFreeDemo(supabase, reservedReportId);
      return NextResponse.json(
        {
          message:
            'Não foi possível concluir a demonstração gratuita. Tente novamente.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Relatório gerado com sucesso.',
      report: confirmacao.report,
      // A demonstração NÃO entra na cota mensal: o contador da assinatura
      // volta exatamente como estava.
      monthly_count: currentMonthlyCount,
      monthly_limit: monthlyLimit,
      daily_count: currentMonthlyCount,
      daily_limit: monthlyLimit,
    });
  }

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