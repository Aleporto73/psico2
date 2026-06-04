/**
 * /api/assistant/generate/route.ts
 * Endpoint seguro para geração de relatórios com IA via OpenAI.
 *
 * Regras de segurança obrigatórias:
 * 1. Usuário precisa estar autenticado (sessão válida Supabase).
 * 2. Verificação server-side de has_active_assistant via user_access_status.
 * 3. Limite diário: 20 gerações por usuário por dia.
 * 4. Payload validado e higienizado (tamanho máximo dos campos).
 * 5. Chave OpenAI nunca exposta ao frontend.
 * 6. Imagens opcionais (PNG/JPG/JPEG/WEBP, até 5 MB cada, máximo 4 prints).
 * 7. Campo "Dados da planilha" é OBRIGATÓRIO apenas quando não há imagens.
 * 8. Tipo de relatório (reportType) ajusta linguagem; fallback seguro = 'technical'.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { callOpenAI, OpenAIContentPart, VISION_NOT_SUPPORTED } from '@/lib/openai';

// Limites de segurança
const DAILY_LIMIT = 20;
const MAX_PLANILHA_CHARS = 4000;
const MAX_OBSERVACOES_CHARS = 2000;
const MAX_OBJETIVO_CHARS = 500;

// Limites de imagem
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES = 4;
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const DATA_URL_REGEX = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/i;

// Aviso obrigatório final (hardcoded no backend — não pode ser removido pelo frontend)
const AVISO_FINAL =
  'Observação: este texto é um rascunho de apoio operacional elaborado a partir dos dados fornecidos. Ele deve ser revisado, complementado e validado pelo profissional responsável. Não substitui avaliação clínica, manual técnico, aplicação padronizada, teste original ou interpretação profissional.';

// Mensagem padrão devolvida pelo modelo quando o print não puder ser lido
const IMAGE_UNREADABLE_MSG =
  'Não consegui ler todos os dados do print. Envie uma imagem mais nítida ou transcreva os resultados principais.';

// ── Tipo de relatório ────────────────────────────────────────────────────────
type ReportType = 'family' | 'school' | 'technical' | 'internal' | 'three_versions';
const REPORT_TYPES: ReadonlySet<ReportType> = new Set([
  'family',
  'school',
  'technical',
  'internal',
  'three_versions',
]);

function normalizeReportType(raw: unknown): ReportType {
  if (typeof raw === 'string' && REPORT_TYPES.has(raw as ReportType)) {
    return raw as ReportType;
  }
  return 'technical';
}

const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  family: 'Pais / Família',
  school: 'Escola',
  technical: 'Técnico',
  internal: 'Registro interno',
  three_versions: 'Três versões (Pais / Família, Escola, Técnica)',
};

/**
 * Instruções específicas por tipo de relatório, inseridas no system prompt.
 */
function reportTypeBlock(type: ReportType): string {
  switch (type) {
    case 'family':
      return `TIPO DE RELATÓRIO: Pais / Família.
Escreva UM texto único, acolhedor, simples e explicativo, dirigido aos responsáveis. Mais completo que um rascunho genérico — deve realmente ajudar a família a entender e apoiar.

Estrutura obrigatória:
1. Resumo do que a planilha apresentou (classificação textual/faixa, sem inventar números).
2. O que esses dados podem significar no cotidiano, em linguagem simples e concreta.
3. Pontos de atenção observáveis em casa (sem prognóstico).
4. Como apoiar em casa — escolha as orientações que façam sentido aos dados:
   - rotina organizada e previsível;
   - reforço positivo;
   - brincadeiras ou atividades graduais;
   - acolhimento emocional;
   - acompanhamento das dificuldades sem pressão excessiva;
   - momentos de pausa, sono regular, organização do ambiente de estudo.
5. Quando vale procurar acompanhamento profissional para complementar a observação.

Linguagem: cotidiana, sem jargão. Quando um termo técnico aparecer nos dados, traduza em uma frase simples. Sem alarmismo.`;
    case 'school':
      return `TIPO DE RELATÓRIO: Escola.
Escreva UM texto único, objetivo, pedagógico e funcional, dirigido à equipe escolar (professor, coordenação, AEE). Mais útil que um rascunho genérico — a escola precisa sair com orientações práticas.

Estrutura obrigatória:
1. O que a planilha apresentou (sem transformar em diagnóstico escolar).
2. Impacto funcional escolar possível, com linguagem cautelosa ("pode repercutir", "merece acompanhamento", "sugere ponto de atenção funcional").
3. Como a escola pode observar o aluno no cotidiano (participação, sustentação atencional, organização, interação social, transições, tarefas com tempo).
4. Estratégias pedagógicas práticas — escolha as que façam sentido aos dados:
   - instruções curtas, claras e fracionadas;
   - rotina previsível com transições anunciadas;
   - apoio visual (cartões, pictogramas, agendas, recursos gráficos);
   - tempo adicional, quando os dados indicarem dificuldade de ritmo;
   - divisão de tarefas em etapas;
   - checagem de compreensão após cada instrução;
   - mediação ativa em mudanças de atividade;
   - redução de sobrecarga e número de estímulos simultâneos;
   - acompanhamento do desempenho em tarefas com tempo;
   - parceria contínua com a família.

NÃO transforme o resultado em diagnóstico escolar. NÃO afirme presença/ausência de transtornos.`;
    case 'technical':
      return `TIPO DE RELATÓRIO: Técnico (apoio profissional).
Escreva UM texto único, profissional, cauteloso e organizado. Padrão de qualidade: superior a um rascunho genérico, com estrutura completa de relatório descritivo de apoio operacional.

ESTRUTURA OBRIGATÓRIA — siga TODAS as seções, omitindo apenas as que não tiverem dado suficiente:

1. **Dados extraídos dos prints / texto**
   Listar (use o gabarito da ANÁLISE DE IMAGEM quando houver prints):
   - Instrumento/planilha:
   - Faixa etária:
   - Pontuação total (se houver):
   - Classificação geral (se houver):
   - Percentil / T-score / indicadores visíveis:
   - Dados não legíveis:

2. **Tabela de resultados**
   Sempre que houver pelo menos 3 resultados (subescalas, processos, domínios), gere uma TABELA em MARKDOWN.
   Colunas sugeridas (adapte às colunas que os dados sustentam):
   | Área / Processo | Resultado | Percentil / Escore | Classificação | Observação |
   - Copie os números EXATAMENTE como aparecem na planilha ou no texto.
   - Se faltar algum dado, preencha com [não informado].
   - NUNCA invente valores.

3. **Análise por domínios / processos**
   Separe a análise conforme o instrumento. Use APENAS domínios que aparecem nos dados. Exemplos possíveis (escolha os relevantes ao caso):
   - Processos automáticos; Processos controlados;
   - Atenção; Velocidade de processamento;
   - Inibição; Flexibilidade;
   - Linguagem; Aprendizagem; Comunicação;
   - Comportamento adaptativo; Aspectos socioemocionais.

4. **Análise dos erros** (apenas se houver quantidade/categorização de erros)
   Comente: onde houve maior quantidade de erros; onde houve menor; se a planilha já apresentou uma classificação dos erros (ex.: "prejuízo de inibição"), reproduza essa classificação como informada; possíveis impactos funcionais (sem diagnóstico).

5. **Impacto funcional possível**
   Traduza os dados para o cotidiano: sala de aula, execução de tarefas, tempo para finalizar atividades, necessidade de apoio visual, adaptação a mudanças, organização, fluência, atenção sustentada, alternância de estratégias, autorregulação.
   Use linguagem cautelosa: "pode repercutir", "pode indicar necessidade de observação", "merece acompanhamento", "sugere ponto de atenção funcional".

6. **Recomendações profissionais**
   - Integrar com entrevista;
   - Observar em contexto natural;
   - Correlacionar com outros instrumentos;
   - Revisar manual técnico;
   - Monitorar evolução;
   - Planejar intervenção conforme os dados.

7. **Síntese final**
   Curta, útil e cautelosa. Exemplo de tom: "O perfil observado sugere pontos de atenção em <X> e <Y>, com melhor desempenho relativo em <Z>. A interpretação final deve integrar os dados da planilha, entrevista, observação clínica/escolar e julgamento do profissional responsável."

NÃO feche diagnóstico, NÃO afirme presença/ausência de transtornos, NÃO recalcule escores, NÃO converta gráfico em número se o número não estiver escrito.`;
    case 'internal':
      return `TIPO DE RELATÓRIO: Registro interno (prontuário/anotação do profissional).
Escreva UM texto CURTO, direto, estilo registro de evolução interna.
- Vocabulário: técnico abreviado, telegráfico quando útil.
- Tom: factual, sem floreio.
- Profundidade técnica: alta na densidade dos dados, baixa em narrativa.
- Estrutura sugerida: dados aplicados/informados (com mini-tabela se houver 3+ resultados); indicadores principais visíveis; análise breve por domínio quando couber; conduta atual; próximos passos / hipóteses descritivas a observar.
- NÃO produza um texto longo voltado a família ou escola. NÃO emita diagnóstico fechado.`;
    case 'three_versions':
      return `TIPO DE RELATÓRIO: Três versões em um único output (modo benchmark — qualidade superior ao Assistente GPT Free).

PADRÃO DE QUALIDADE OBRIGATÓRIO:
- Organize os dados com mais clareza que um rascunho genérico.
- Separe REALMENTE os públicos: linguagem, profundidade, foco e recomendações devem mudar entre os blocos.
- Fidelidade absoluta aos números (copie como aparecem; não recalcule).
- Cada versão tem FINALIDADE DIFERENTE — não repita o mesmo texto nos três blocos.

FORMATO OBRIGATÓRIO — gere EXATAMENTE estes blocos, na ordem, com cabeçalhos em negrito e linha em branco entre eles:

**Dados extraídos dos prints / texto**
(Use o gabarito da ANÁLISE DE IMAGEM. Se houver pelo menos 3 resultados, inclua aqui também uma TABELA MARKDOWN com Área/Processo, Resultado, Percentil/Escore, Classificação, Observação. Marque [dado não legível no print] ou [não informado] quando aplicável.)

**Versão para Pais / Família**
Deve explicar: o que foi observado; o que isso pode significar no cotidiano; como apoiar em casa (rotina organizada, reforço positivo, atividades graduais, acolhimento emocional, acompanhamento sem pressão); sem termos técnicos em excesso; sem alarmismo.
EVITE: "não há evidências clínicas", "descarta TEA/TDAH", "diagnóstico", "a criança não tem".
PREFIRA: "a planilha apresentou classificação de…", "os dados indicam baixa/alta intensidade de indicadores no instrumento utilizado", "algumas áreas podem ser acompanhadas no cotidiano".

**Versão para Escola**
Deve conter: impacto funcional escolar possível; estratégias pedagógicas (instruções curtas, rotina previsível, apoio visual, tempo adicional, divisão de tarefas, mediação em transições, redução de sobrecarga, acompanhamento de tarefas com tempo); observações para sala. Não transforme em diagnóstico escolar.

**Versão Técnica / Profissional**
Deve conter, na ordem:
1. Tabela ou organização dos dados principais.
2. Análise por domínio/processo (usando apenas o que os dados sustentam).
3. Análise dos erros, se houver.
4. Impacto funcional cauteloso.
5. Recomendações profissionais de continuidade.
6. Síntese cautelosa.

REGRAS específicas para este modo:
- Mantenha cada bloco objetivo e útil; sem inflar texto, sem repetir frases entre blocos.
- O fechamento ético obrigatório aparece UMA ÚNICA VEZ ao final do output completo, e NÃO dentro de cada versão.`;
  }
}

interface ValidatedImage {
  dataUrl: string;
  mime: string;
  approxBytes: number;
}

function validateImage(
  raw: string
): { ok: true; image: ValidatedImage } | { ok: false; error: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Imagem vazia.' };
  }

  const match = trimmed.match(DATA_URL_REGEX);
  if (!match) {
    return { ok: false, error: 'Use imagens em PNG, JPG, JPEG ou WEBP.' };
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, error: 'Use imagens em PNG, JPG, JPEG ou WEBP.' };
  }

  const b64 = match[2];
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const approxBytes = Math.floor((b64.length * 3) / 4) - padding;

  if (approxBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Cada imagem deve ter no máximo 5 MB.' };
  }

  return { ok: true, image: { dataUrl: trimmed, mime, approxBytes } };
}

export async function POST(request: Request) {
  try {
    // ── 1. Autenticação ────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não autenticado.' },
        { status: 401 }
      );
    }

    // ── 2. Verificar assinatura ativa (server-side) ───────────────────────────
    const { data: accessData, error: accessError } = await supabase
      .from('user_access_status')
      .select('has_active_assistant, assistant_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (accessError || !accessData) {
      return NextResponse.json(
        { message: 'Não foi possível verificar o status de acesso.' },
        { status: 500 }
      );
    }

    if (!accessData.has_active_assistant) {
      return NextResponse.json(
        {
          message:
            'Acesso negado. O Assistente IA Pro requer uma assinatura ativa. Consulte a página do Assistente IA Pro para mais informações.',
        },
        { status: 403 }
      );
    }

    // ── 3. Verificar limite diário ─────────────────────────────────────────────
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('ai_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDay.toISOString());

    if (countError) {
      return NextResponse.json(
        { message: 'Erro ao verificar limite diário.' },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          message:
            'Você atingiu o limite de segurança diário. Tente novamente amanhã ou entre em contato com o suporte.',
          daily_count: count,
          daily_limit: DAILY_LIMIT,
        },
        { status: 429 }
      );
    }

    // ── 4. Validar e higienizar payload ───────────────────────────────────────
    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: 'Payload inválido. Envie um JSON válido.' },
        { status: 400 }
      );
    }

    const { nome, idade, area, objetivo, planilhaData, observacoes } = body;
    const reportType = normalizeReportType(body.reportType);

    let rawImages: string[] = [];
    if (Array.isArray(body.imageDataUrls)) {
      rawImages = body.imageDataUrls.filter((s: any) => typeof s === 'string' && s.trim() !== '');
    } else if (typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim() !== '') {
      rawImages = [body.imageDataUrl];
    }

    if (rawImages.length > MAX_IMAGES) {
      return NextResponse.json(
        { message: 'Envie no máximo 4 prints por relatório.' },
        { status: 400 }
      );
    }

    if (!nome?.trim() || !idade?.trim() || !area?.trim() || !objetivo?.trim()) {
      return NextResponse.json(
        {
          message:
            'Campos obrigatórios em falta: Nome/Identificação, Idade/Faixa etária, Área do Relatório e Objetivo.',
        },
        { status: 400 }
      );
    }

    const planilhaDataTrim = (planilhaData ?? '').toString().trim();
    if (rawImages.length === 0 && !planilhaDataTrim) {
      return NextResponse.json(
        { message: 'Envie um print da planilha ou cole os resultados no campo de dados.' },
        { status: 400 }
      );
    }

    const nomeClean = nome.trim().slice(0, 200);
    const idadeClean = idade.trim().slice(0, 50);
    const areaClean = area.trim().slice(0, 200);
    const objetivoClean = objetivo.trim().slice(0, MAX_OBJETIVO_CHARS);
    const planilhaDataClean = planilhaDataTrim.slice(0, MAX_PLANILHA_CHARS);
    const observacoesClean = ((observacoes ?? '') as string).trim().slice(0, MAX_OBSERVACOES_CHARS);

    const validatedImages: ValidatedImage[] = [];
    for (let i = 0; i < rawImages.length; i++) {
      const v = validateImage(rawImages[i]);
      if (!v.ok) {
        return NextResponse.json(
          { message: `Imagem ${i + 1}: ${v.error}` },
          { status: 400 }
        );
      }
      validatedImages.push(v.image);
    }
    const hasImages = validatedImages.length > 0;

    // ── 5. Construir prompt seguro ────────────────────────────────────────────
    const baseSystem = `Você é o Assistente IA Pro do PsicoPlanilhas — assistente de APOIO OPERACIONAL para psicólogos e psicopedagogos. Sua função é organizar os dados que o profissional já apresentou (texto e/ou prints da planilha) em um RASCUNHO DESCRITIVO MAIS COMPLETO, MAIS BEM ORGANIZADO E MAIS ÚTIL que um rascunho genérico de chatbot.

PADRÃO DE QUALIDADE — OBRIGATÓRIO:
- Quando houver dados de instrumentos, planilhas, tabelas ou gráficos, organize: tabela de resultados, separação por áreas/domínios/processos, identificação de pontos mais elevados e mais baixos, comentário dos erros (quando houver), tradução em impacto funcional, recomendações práticas e síntese cautelosa.
- Não entregue resposta curta demais, genérica ou apenas uma interpretação superficial. Entregue um texto profissional aplicável.
- Sempre que houver 3 ou mais resultados, monte uma TABELA em MARKDOWN no início do bloco técnico (ou no bloco "Dados extraídos" quando o tipo for "Gerar 3 versões").

REGRAS OBRIGATÓRIAS — VIOLAÇÃO NÃO É PERMITIDA:
1. NUNCA faça diagnósticos, hipóteses diagnósticas, sugestões de diagnóstico, conclusões clínicas ou fechamentos diagnósticos.
2. NUNCA invente pontos de corte, normas, percentis, T-escores ou classificações que não estejam no texto digitado ou visíveis em algum print.
3. NUNCA recalcule escores. NUNCA converta gráfico em número se o número não estiver escrito.
4. NUNCA substitua dado enviado pelo usuário por conhecimento externo.
5. NUNCA gere um laudo clínico ou psicológico formal.
6. Escreva em português brasileiro formal e cauteloso (adapte o registro conforme o TIPO DE RELATÓRIO solicitado).
7. Mantenha fidelidade absoluta aos números: copie como aparecem nos prints ou no texto digitado.

LINGUAGEM SEGURA — siga estas preferências em TODOS os tipos de relatório:
- EVITE termos fortes: "comprometimento", "déficit global", "prejuízo clínico", "transtorno de…", "diagnóstico", "diagnosticado", "paciente tem", "descarta", "confirma", "conclusão clínica definitiva", "não há evidências clínicas", "não sustenta suspeita clínica", "avaliação psicológica realizada", "controle de impulsos preservado" (a menos que o instrumento permita e o dado esteja explícito).
- PREFIRA termos funcionais: "desempenho reduzido", "ponto de atenção", "indicador funcional", "melhor desempenho relativo", "maior demanda cognitiva", "maior demanda executiva", "indicadores de maior lentificação", "pode repercutir", "merece acompanhamento", "sugere necessidade de observação", "deve ser integrado com outros dados", "a planilha apresentou classificação de…".

EXEMPLO DE FRASE SEGURA:
✔ "No material apresentado, a classificação da planilha indica baixa intensidade de indicadores relacionados ao construto avaliado. A interpretação final deve considerar entrevista, observação clínica, contexto familiar/escolar e julgamento do profissional responsável."
✘ "O paciente não apresenta TEA." / "Comprometimento global confirmado." / "Descarta-se TDAH."

INSTRUMENTOS SENSÍVEIS — quando aparecer CARS-2, WISC, WAIS, Raven, Vineland, VB-MAPP ou outros instrumentos técnicos, inclua SEMPRE a moldura abaixo, próxima aos dados:
"Os dados abaixo organizam as informações apresentadas na planilha enviada e não substituem manual técnico, aplicação padronizada ou interpretação profissional."

INSTRUMENTO ESPECÍFICO — FDT (Five Digits Test / Teste dos Cinco Dígitos):
Quando os dados forem do FDT, Five Digits Test ou Teste dos Cinco Dígitos:
- Use a nomenclatura correta: "FDT — Five Digits Test / Teste dos Cinco Dígitos". NÃO escreva "Teste de Fluência de Dados" nem variantes inventadas.
- Não chame genericamente de "subescalas" — separe a análise em:
  • Processos automáticos: Leitura; Contagem.
  • Processos controlados: Escolha; Alternância.
  • Índices / processos derivados (quando aparecerem): Inibição; Flexibilidade.
- Se houver erros por etapa, crie a seção "Análise dos erros" descrevendo onde houve maior e menor quantidade, e a classificação que a própria planilha apresentou para cada erro (reproduza fielmente, ex.: "prejuízo de inibição conforme classificação da planilha").
- EVITE para FDT: "comprometimento", "prejuízo clínico", "controle de impulsos preservado" (a menos que o dado esteja claro).
- PREFIRA para FDT: "indicadores de maior lentificação", "desempenho reduzido", "ponto de atenção funcional", "melhor desempenho relativo", "maior demanda executiva", "necessidade de integração com outros dados".

FECHAMENTO ÉTICO OBRIGATÓRIO — encerre o output completo com EXATAMENTE este parágrafo (uma única vez, ao final, mesmo no modo de três versões):
"${AVISO_FINAL}"`;

    const visionBlock = `

ANÁLISE DE IMAGEM — quando houver 1 ou mais prints anexados:
O profissional pode enviar até 4 prints da MESMA aplicação (tabela, gráfico, classificação, continuação). Trate todos como complementares e combine o que estiver visível em todos eles.

ANTES DE REDIGIR O RASCUNHO, gere SEMPRE este cabeçalho com os dados extraídos. É OBRIGATÓRIO em todos os tipos de relatório:

**Dados extraídos dos prints**
- Instrumento/planilha:
- Faixa etária:
- Pontuação total:
- Classificação apresentada pela planilha:
- Percentil:
- T-score:
- Subescalas / domínios / processos com pontuações mais elevadas:
- Subescalas / domínios / processos com pontuações mais baixas:
- Observações visuais do gráfico:
- Dados não legíveis:

Regras de leitura dos prints:
- Copie os números EXATAMENTE como aparecem.
- Se o dado vier do texto digitado pelo profissional, use o texto digitado. Se vier do print, use o print.
- Se houver divergência entre o texto digitado e o print, aponte a divergência e peça confirmação (salvo se as Observações já indicarem qual valor é o correto).
- Não converta gráfico em número se o número não estiver escrito.
- Não recalcule percentil, T-score ou classificação.
- Quando algum item não estiver visível, escreva [dado não legível no print]. Quando ausente em todos os prints e no texto, use [não informado].
- "Observações visuais do gráfico" deve descrever PADRÕES (ex.: "elevação em itens 5, 7 e 10"; "pontuações concentradas na faixa inferior") sem inventar valores.

Se TODOS os prints estiverem ilegíveis, inutilizáveis ou não contiverem dados de planilha/instrumento, responda EXATAMENTE com este texto e nada mais:
"${IMAGE_UNREADABLE_MSG}"

Depois do cabeçalho de extração, redija o rascunho conforme o TIPO DE RELATÓRIO solicitado.`;

    const reportBlock = `

${reportTypeBlock(reportType)}`;

    const systemPrompt = (hasImages ? baseSystem + visionBlock : baseSystem) + reportBlock;

    const printsLabel = hasImages
      ? `\nO profissional anexou ${validatedImages.length} ${validatedImages.length === 1 ? 'print' : 'prints'} da planilha/gráfico. Analise ${validatedImages.length === 1 ? 'a imagem em anexo' : 'todas as imagens em anexo'} seguindo as regras de ANÁLISE DE IMAGEM.`
      : '';

    const userText = `Tipo de relatório solicitado: ${REPORT_TYPE_LABEL[reportType]}

Profissional: ${nomeClean}
Idade/Faixa etária: ${idadeClean}
Área do relatório: ${areaClean}
Objetivo do relatório: ${objetivoClean}

${planilhaDataClean ? `Dados da planilha (digitados pelo profissional):\n${planilhaDataClean}` : 'Dados da planilha digitados: nenhum (o profissional escolheu enviar apenas os prints).'}
${observacoesClean ? `\nObservações adicionais:\n${observacoesClean}` : ''}${printsLabel}

Gere o rascunho descritivo de apoio conforme as instruções do sistema e o tipo de relatório solicitado. Lembre-se de incluir tabela em Markdown sempre que houver 3+ resultados, separar por domínios/processos, comentar erros se houver, traduzir em impacto funcional, listar recomendações práticas e fechar com síntese cautelosa.`;

    const userContent: string | OpenAIContentPart[] = hasImages
      ? [
          { type: 'text', text: userText },
          ...validatedImages.map<OpenAIContentPart>((img) => ({
            type: 'image_url',
            image_url: { url: img.dataUrl, detail: 'high' },
          })),
        ]
      : userText;

    // ── 6. Chamar a API da OpenAI ─────────────────────────────────────────────
    let generatedText: string;
    try {
      const result = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ]);
      generatedText = result.content;
    } catch (openaiErr: any) {
      console.error('OpenAI error:', openaiErr);

      if (openaiErr?.message === VISION_NOT_SUPPORTED) {
        return NextResponse.json(
          {
            message:
              'O modelo atual não conseguiu analisar imagem. Envie os resultados em texto ou ajuste o modelo para visão.',
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          message:
            'Erro ao conectar com o serviço de IA. Tente novamente em instantes.',
        },
        { status: 502 }
      );
    }

    if (hasImages && generatedText.trim() === IMAGE_UNREADABLE_MSG) {
      return NextResponse.json(
        {
          message: IMAGE_UNREADABLE_MSG,
          daily_count: count ?? 0,
          daily_limit: DAILY_LIMIT,
        },
        { status: 422 }
      );
    }

    if (!generatedText.includes(AVISO_FINAL)) {
      generatedText = `${generatedText}\n\n${AVISO_FINAL}`;
    }

    // ── 7. Salvar relatório em ai_reports ─────────────────────────────────────
    const reportTitle = `${areaClean} — ${nomeClean}`;
    const printsMarker = hasImages
      ? `\n\n[${validatedImages.length} ${validatedImages.length === 1 ? 'print anexado' : 'prints anexados'} pelo profissional]`
      : '';
    const savedInput =
      (planilhaDataClean || (hasImages ? '(sem dados digitados — apenas prints)' : '')) +
      `\n[Tipo de relatório: ${REPORT_TYPE_LABEL[reportType]}]` +
      printsMarker;

    const { data: savedReport, error: saveError } = await supabase
      .from('ai_reports')
      .insert({
        user_id: user.id,
        title: reportTitle,
        report_type: areaClean,
        input_text: savedInput,
        output_text: generatedText,
      })
      .select()
      .single();

    if (saveError || !savedReport) {
      console.error('Error saving report:', saveError);
      return NextResponse.json({
        message: 'Relatório gerado, mas não foi possível salvar no histórico.',
        report: {
          id: null,
          title: reportTitle,
          output_text: generatedText,
          created_at: new Date().toISOString(),
        },
        daily_count: (count ?? 0) + 1,
        daily_limit: DAILY_LIMIT,
      });
    }

    return NextResponse.json({
      message: 'Relatório gerado com sucesso.',
      report: savedReport,
      daily_count: (count ?? 0) + 1,
      daily_limit: DAILY_LIMIT,
    });
  } catch (err: any) {
    console.error('Unexpected error in /api/assistant/generate:', err);
    return NextResponse.json(
      { message: err.message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
