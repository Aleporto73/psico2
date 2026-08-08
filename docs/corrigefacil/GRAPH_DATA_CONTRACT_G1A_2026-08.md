# CorrigeFácil — Contrato de dados dos gráficos (G1A)

Agosto de 2026. **Fase de auditoria arquitetural e decisão documental. Nenhuma
migration, Edge, type, JSX, gráfico, CSS ou teste de código.**

Bases auditadas:

| repositório | HEAD |
|---|---|
| `Aleporto73/psico2` | `116df23ee4b550e121382da5cb1f1b92fb4804d0` |
| `Aleporto73/CorrigeFacil` | `432de9b375308c9a8c108249c8072d75a8b19370` |

Fonte de verdade visual: `docs/corrigefacil/GRAPH_VISUAL_CONTRACT_G0_2026-08.md`,
congelado em main.

Todas as consultas ao Postgres de produção (`wxiyfudloyyxmnaddljx`) foram
`begin transaction read only` seguidas de `rollback`.

---

## 1. Estado atual

### 1.1 Onde cada coisa mora

| item | lugar |
|---|---|
| cálculo do `Resultado` | `corrigir/index.ts` · `resultado()`, `calcular()` |
| escolha do norm_set | `corrigir/index.ts` · `escolher()`, `setsDe()`, `casa()`, `naFaixa()` |
| classificação | `corrigir/index.ts` · da linha (`linha()`) **ou** de `faixaDe()` sobre `classification_bands` |
| persistência | `corrigir/index.ts` · `criarEConcluir()` |
| leitura do histórico | `corrigir/index.ts` · `carregar()` — nunca recalcula |
| catálogo | `corrigir/index.ts` · `catalogoDe()` — devolve `faixas_classificacao` |
| resolução por data | `resolver-norma-data/index.ts` · `resolverPedido()` — só BAYLEY-III e DCDQ |
| tipos do cliente | `psico2` · `src/lib/corrigefacil/api.ts` |
| DDL de `assessment_results` | `CorrigeFacil` · `schema/schema_instrumentos.sql:320` |

### 1.2 Correção de uma premissa do enunciado

O enunciado de G1A afirma que **"assessment_results já possui norm_set_id"**.
**Não possui.** Colunas reais, lidas de `information_schema`:

```
assessment_results   assessment_id, scale_id, raw, score, percentile, z_score,
                     classification, ci95, available, message, flags
assessments          id, user_id, instrument_id, norm_set_id, subject_label,
                     subject_meta, birthdate, eval_date, premature_weeks,
                     prematurity_rule, status, created_at, completed_at
```

`norm_set_id` existe em **`assessments`** — **um por avaliação inteira**, não por
escala. Isso não é detalhe: é o que derruba a Opção C, e está desenvolvido em §3.3.

### 1.3 O que o cliente recebe hoje, por tela

| tela | rota | traz resultado | traz faixa |
|---|---|---|---|
| resultado pós-correção | `POST /corrigir` | sim | **não** — mas a tela já tem `InstrumentoDetalhe` em memória, com `faixas_classificacao` |
| resultado pós-salvamento | `POST /avaliacao` | sim | idem (mesma tela, mesmo estado) |
| avaliação reaberta | `GET /avaliacao/:id` | sim | **não, e não há de onde tirar** |

`AvaliacaoDetalhe` = `{ assessment_id, instrument, status, norm_selector,
subject_meta, subject_label, created_at, completed_at, resultados }`. Nenhuma
faixa, nenhum corte, nenhum limite de escala.

### 1.4 Três famílias de origem da classificação

Medido no banco, instrumento a instrumento:

A classificação tem duas origens no acervo, mas o que importa para o snapshot é
**o que o gráfico precisa**, e isso dá **três** famílias — não duas:

| família | o que o gráfico precisa | `basis` | `segments` | instrumentos |
|---|---|---|---|---|
| **A — banda declarada** | a régua vem de `classification_bands` | `score` \| `z` | os segmentos daquela escala | BAYLEY-III, C-TRF, CES-D, CHECK-DIS, CONFIAS, DASS-21, ERA-A, ERA-F, PHQ-9, QA-ADULTO, SCARED-C, SDQ-POR, SNAP-IV-18, SNAP-IV-26, TDF, TRACO-ANSIEDADE, TRILHAS_PRE |
| **B — banda derivada da norma** | a régua **não existe** como banda e precisa ser **reduzida a segmentos numéricos** a partir de `norm_entries.classification` | `score` | corridas contíguas colapsadas | **DCDQ** |
| **C — autocontida** | **nenhuma régua**: o próprio campo do resultado basta | `percentile` ou `classification` | `[]` | BPA-2, EPQ-J *(percentil)* · **ETPC** *(classificação)* |

`classification_bands` está **vazio** em BPA-2, DCDQ, EPQ-J e ETPC. Mas só o
**DCDQ** precisa que a norma vire régua numérica — os outros três têm gráfico
aprovado em G0 que **não usa corte**.

**ETPC não é família B numérica.** Ele tem `classification` em `norm_entries`,
mas:

- `score_type = quartil`, que **não está no mapa `BASIS` numérico do motor**;
- G0 proíbe tratar 25/50/75 como eixo contínuo — são marcadores ordinais, e
  altura proporcional diria "três vezes mais" entre categorias vizinhas;
- o componente aprovado é **CategoricalProfileChart**;
- a informação visual necessária **já é a `classification` congelada** em
  `ResultadoEscala`.

Portanto:

```jsonc
// ETPC — as quatro escalas
{ "v": 1, "basis": "classification", "segments": [] }
```

O renderer usa **exclusivamente** `ResultadoEscala.classification`. Não cria
cutoff, não cria faixa numérica, não transforma 25/50/75 em altura proporcional
e não consulta `norm_entries`. O contrato continua uniforme — mesmo envelope,
mesmo `v: 1` — sem inventar régua onde não há.

---

## 2. Invariantes

**I1 — Avaliação salva é congelada.** Se norma, corte ou banda mudarem depois,
`score`, `classification` e **o significado do gráfico** não mudam.

**I2 — O frontend não interpreta.** Não consulta norma, não recalcula corte, não
infere faixa, não escolhe classificação, não reinterpreta idade, não reconstrói
DCDQ, não usa norma atual em avaliação antiga.

**I3 — A tabela normativa não vai ao browser.** Trava do projeto, anterior a esta
fase. O que sai é o necessário para representar um resultado já calculado.

**I4 — `null` nunca vira zero.** Vale para `score`, `percentile`, `z`, `ci95` e
para o gráfico inteiro.

---

## 3. Comparação A / B / C

### 3.1 Opção A — catálogo atual no histórico · **REJEITADA**

`AvaliacaoDetalhe` buscaria `InstrumentoDetalhe` e usaria as
`faixas_classificacao` **de hoje** para desenhar uma avaliação de ontem.

Provas contra:

1. **Viola I1 por construção.** A representação histórica passa a depender do
   presente. Corrigir um corte errado — coisa que este produto faz, e registra em
   `corrections` — mudaria retroativamente o desenho de laudos já entregues.
2. **Produz contradição visível.** `classification` salva diz "Moderada"; a
   banda atual põe o mesmo escore em "Leve". O gráfico contradiz o texto **na
   mesma tela**, e nada permite decidir qual está certo.
3. **Instrumento despublicado quebra a tela.** `catalogoDe()` filtra por
   `is_active`; despublicar devolve **404**. Um histórico legítimo perderia o
   gráfico por uma decisão comercial posterior.
4. **Não cobre a família B.** BPA-2, DCDQ, EPQ-J e ETPC têm
   `classification_bands` **vazio**: buscar o catálogo devolve `[]`. A opção não
   resolve nem o caso que motivou G1A.
5. **Custo sem retorno.** Uma requisição extra por avaliação aberta, para obter
   um dado que não se pode usar.

### 3.2 Opção B — snapshot visual persistido · **RECOMENDADA**

No momento da correção o servidor já sabe **tudo**: qual norm_set resolveu, qual
linha casou, qual faixa aplicou. Persistir uma redução mínima disso junto do
resultado faz resultado e representação congelarem **juntos**, que é exatamente
I1. Desenvolvida em §5.

### 3.3 Opção C — reconstrução pelo `norm_set_id` · **REJEITADA**

Respondendo item a item o que o enunciado pede:

| pergunta | resposta | evidência |
|---|---|---|
| `norm_sets` são imutáveis? | **Não garantido.** Sobrevivem a recarga (`on conflict (instrument_id, code) do nothing`), mas nada impede `update` | `engine/loader.py` · `norm_sets()` |
| `norm_entries` são imutáveis? | **NÃO.** Toda recarga do instrumento faz `delete ... using norm_sets where instrument_id = %s` e reinsere. **Os ids mudam** | `engine/loader.py` · `norm_entries()` |
| `classification_bands` são versionadas? | **NÃO.** `delete from classification_bands where instrument_id=%s` seguido de insert | `engine/loader.py` · `bands()` |
| podem ser editadas in-place? | **Sim**, e é o caminho normal de correção |  |
| exclusão/despublicação afeta histórico? | Despublicar não apaga norma, mas `catalogoDe()` passa a dar 404 | `corrigir/index.ts` · `catalogoDe()` |
| reconstrução futura é idêntica? | **Não há garantia estrutural nenhuma** | ver abaixo |

Nenhuma das três tabelas tem coluna temporal ou de versão — sem `updated_at`,
`version`, `valid_from`/`valid_to`. Confirmado no `information_schema`:

```
norm_sets             id, instrument_id, code, label, selector, range_min, range_max, ordinal
norm_entries          id, norm_set_id, scale_id, stage, raw_min, raw_max, score,
                      percentile, classification, ci95, extra
classification_bands  id, instrument_id, scale_id, basis, min_value, max_value,
                      label, severity, ordinal
```

**E há um problema anterior à imutabilidade: o dado não existe.**

- `assessment_results` **não tem** `norm_set_id` (§1.2). Não há por onde ligar
  uma escala ao conjunto normativo que a produziu.
- `assessments.norm_set_id` é **um só para a avaliação inteira** e vem de
  `resolverNormSet()`, que devolve id **apenas quando exatamente um conjunto
  casa** — `cands.length === 1 ? cands[0].id : null`.
- Em instrumentos multi-conjunto isso é `null` na prática. **BAYLEY-III** usa
  conjuntos diferentes por escala: `idade:*` para os subtestes, `se:*` para o
  socioemocional, `adapt:*` para o adaptativo e `composta` para o 2º estágio —
  são **82 norm_sets**. Um campo escalar não representa isso.

Conclusão: a Opção C não é apenas insegura por falta de versionamento — ela é
**estruturalmente incapaz**, porque o vínculo escala→norm_set nunca foi gravado.
Torná-la viável exigiria gravar o norm_set por escala **e** versionar as três
tabelas — muito mais invasivo que a Opção B, para um resultado pior.

---

## 4. Decisão recomendada

**Opção B — snapshot visual mínimo, por linha de resultado, persistido no momento
da correção.**

Motivo curto: é a única que satisfaz I1 sem versionar o acervo normativo, cobre
as famílias A e B com **uma estrutura só**, desbloqueia o DCDQ sem expor tabela,
e degrada de forma honesta para os registros legados.

---

## 5. Schema conceitual proposto

> Conceitual. G1B decide nomes finais. Nada aqui é migration.

### 5.1 As oito perguntas do enunciado

**1. Granularidade** → **por linha de resultado (escala)**. A régua muda entre
escalas do mesmo instrumento: DASS-21 tem cortes próprios por domínio, SCARED-C
tem `raw_max` de 8 a 26, C-TRF tem duas réguas (65/70 e 60/64). Um snapshot por
avaliação não representaria nenhum dos três.

**2. Tabela dona** → **`assessment_results`**, coluna nova. Mantém 1:1 com o
resultado, dispensa join e tabela nova, e o legado é simplesmente `null`.

**3. JSONB ou colunas tipadas** → **JSONB**, uma coluna anulável. `segments` é
lista de tamanho variável; em colunas tipadas viraria tabela filha, com join e
ordenação a manter. O conteúdo é pequeno e fechado.

**4. Campos mínimos**

```jsonc
{
  "v": 1,                       // versão do formato; sem isto, mudança futura
                                // reinterpreta silenciosamente linha antiga
  "basis": "score",             // "score" | "percentile" | "z" | "classification"
                                // QUAL CAMPO DE ResultadoEscala o renderer lê
  "segments": [                 // a régua JÁ RESOLVIDA para a norma aplicada
    { "from": 15, "to": 46, "label": "…", "ordinal": 0 },
    { "from": 47, "to": 75, "label": "…", "ordinal": 1 }
  ]
}
```

O exemplo acima é o **DCDQ factual**, na faixa etária resolvida: `15..46` e
`47..75`, **ambos fechados**. Não use este instrumento para ilustrar faixa
aberta — os dois segmentos dele têm teto.

Faixa aberta é outro caso, e o exemplo é separado de propósito:

```jsonc
// segmento aberto para cima — a forma real das 7 faixas do BAYLEY-III
{ "from": 70, "to": null, "label": "…", "ordinal": 2 }
```

**`basis` nomeia o campo do resultado, não a métrica normativa.** Os quatro
valores são exatamente nomes de `ResultadoEscala`: `score`, `percentile`, `z` e
`classification`. O renderer lê `resultado[visual_context.basis]` e pronto — não
existe tabela de tradução no cliente.

Isso obriga **o servidor** a normalizar: `classification_bands.basis` usa
`'percentil'` (nomenclatura normativa, em português) e o campo do resultado é
`percentile`. **A conversão `percentil` → `percentile` é responsabilidade do
motor**, na montagem do snapshot. O frontend nunca traduz nomenclatura
normativa — mesma razão pela qual ele não traduz `escore_t` em nada: não é
função dele saber o vocabulário do acervo.

**`from` e `to` aceitam `null`** — faixa aberta é fato do acervo, não exceção. As
7 faixas do BAYLEY-III têm `max_value` nulo; CONFIAS e C-TRF também têm abertas.

```
segments: Array<{
  from: number | null,   // null = aberto para baixo
  to:   number | null,   // null = aberto para cima
  label: string,
  ordinal: number
}>
```

`null` **nunca** vira zero, **nunca** vira sentinela, **nunca** define display
range e **nunca** é substituído pelo frontend. Um segmento aberto é desenhado
aberto — a seta que sai do eixo é a representação honesta. A ordenação continua
por `ordinal`, que é a ordem de avaliação do motor em `faixaDe()`.

**`range` saiu do conjunto obrigatório.** Ele é opcional e a recomendação é
**omiti-lo**. A auditoria que levou a isso está em §5.2 — é a correção mais
importante desta revisão, e não é cosmética: a versão anterior admitia derivar
`range` de `scales.raw_min/raw_max` ou dos extremos das faixas, e **as duas
fontes produzem eixo errado**.

`segments` vazio é válido e significa "métrica autoexplicativa, sem corte a
desenhar" — família C, seja com `basis: "percentile"` (BPA-2, EPQ-J) ou
`basis: "classification"` (ETPC).

**5. Deve guardar?**

| campo | guardar | por quê |
|---|---|---|
| `basis` | **sim** | é o **nome do campo de `ResultadoEscala` que o renderer deve usar** — `score`, `percentile`, `z` ou `classification` em v1. Sem ele o renderer não sabe o que ler. **Não é `BASIS[score_type]`**: aquele é vocabulário interno do motor, usa `percentil` em português e não contempla `classification`. Converter o vocabulário normativo interno no do contrato é responsabilidade do servidor |
| min/max da régua | **não** (opcional, recomendado omitir) | é **domínio visual**, não contexto normativo. Não é histórico, e nenhuma fonte normativa o produz com segurança — §5.2 |
| bands / cutoffs | **sim, como `segments`** | é a régua inteira. ScoreBandChart precisa dela, não só do nome da faixa atual |
| `scale_code` | **não** | `resultados` já é um mapa indexado pelo código da escala |
| metric value | **não** | é `score`/`percentile`/`z`, já em `ResultadoEscala` |
| `direction` | **não** | é estático por instrumento, congelado em G0, e **não muda com a norma**. Persistir duplicaria G0 no banco e criaria duas fontes de verdade |

**6. O que NÃO persistir porque já está em `ResultadoEscala`** — `raw`, `score`,
`percentile`, `z`, `classification`, `ci95`, `available`, `message`, `flags`.
O snapshot é **contexto**, não resultado. Em particular a faixa aplicada **não**
se repete: ela já é `classification`, e o renderer a localiza em `segments` pelo
rótulo.

**7. Como não duplicar a tabela normativa** — `segments` são **corridas
contíguas colapsadas**, não linhas:

- família A: as faixas daquela escala, na ordem de `ordinal` — de 2 a 7 segmentos;
- família B: as linhas de `norm_entries` do conjunto resolvido, agrupadas por
  `classification` contígua. **DCDQ: 61 linhas de norma viram 2 segmentos.**

O tamanho é limitado pelo número de rótulos distintos daquela escala — 2 a 7 no
acervo inteiro. Nenhum `raw_min/raw_max` linha a linha, nenhum escore de
conversão, nenhuma média/DP, nenhum id normativo.

**8. Avaliações anteriores à migration** → `visual_context` nulo. Política em §11.

### 5.2 `range` — dois conceitos que não podem se misturar

> **Apontamento P1 resolvido no commit `8dd71b5`, e esta decisão está fechada:**
> `range` é opcional; `raw_min`/`raw_max` é proibido em métrica transformada;
> extremos de banda são proibidos como display range; **DISPLAY RANGE** e
> **SEGMENTS** são conceitos separados. Não reabrir.

**SEGMENTS** e **DISPLAY RANGE** são coisas diferentes, e tratá-los como um só
campo foi o erro da versão anterior:

| conceito | o que é | natureza | onde vive |
|---|---|---|---|
| **SEGMENTS** | as fronteiras de classificação da norma **efetivamente aplicada** | **dado normativo histórico** | congelado no snapshot |
| **DISPLAY RANGE** | a extensão do eixo da métrica plotada | **convenção visual** | contrato estático (G0) |

`basis` declara a **métrica graficada** — `score`, `percentil` ou `z`.
`scales.raw_min/raw_max` descreve a **métrica bruta**. Quando a métrica plotada é
transformada, as duas não têm relação alguma.

**Auditoria das fontes candidatas** (lida do banco, escala a escala):

| instrumento · escala | `basis` | raw | métrica plotada (real) | extremos das faixas |
|---|---|---|---|---|
| TDF · TOTAL | score (pontuação padrão) | 0..23 | **0..229** | 0..**349** |
| TRILHAS_PRE · A-CON | score (pontuação padrão) | 1..4 | **66..122** | 1..**999** |
| TRILHAS_PRE · B-SEQ | score (pontuação padrão) | 1..10 | **83..183** | 1..**999** |
| C-TRF · I | score (T) | 0..14 | **50..100** | **65..69** + 1 aberta |
| BAYLEY-III · subteste | score (escalonada) | 0..91 | **1..19** | 0..**null** (7 abertas) |
| CONFIAS · Sílaba | z | 0..40 | **sem `norm_entries.score`** | −1..1 (4 abertas) |
| CES-D · TOTAL | score (= bruto) | 0..60 | **0..60** | **0..60** |
| DASS-21 · cada escala | score (= bruto) | 0..42 | **0..42** | **0..42** |
| SCARED-C · PANICO | score (= bruto) | 0..26 | **0..26** | **0..26** |

O que isso prova, fonte por fonte:

1. **`scales.raw_min/raw_max` é PROIBIDO** quando a métrica plotada não é o
   próprio bruto. Um eixo 1..4 para um resultado de 122 não é impreciso — é
   absurdo.
2. **Extremos de `classification_bands` também não servem.** `349` no TDF e
   `999` no TRILHAS são **sentinelas técnicas** da regra normativa, não teto de
   escala; e no C-TRF as faixas só cobrem a região clínica (65+), de modo que o
   eixo começaria em 65 e o resultado 50 cairia fora dele. No BAYLEY as sete
   faixas são **abertas** (`max_value` nulo em todas) e não têm teto nenhum.
3. **`min/max` de `norm_entries.score` também não serve** como regra geral: no
   CONFIAS é **nulo** (o z vem de `norm_stats`, não há linha de conversão), e no
   TDF traz 229, que é o mesmo artefato de sentinela.
4. **Onde `basis=score` é de fato o bruto, a coincidência é PROVADA**, não
   assumida pelo nome: nos quatro instrumentos `escore_bruto` medidos, raw,
   score e faixas coincidem exatamente, e nenhuma faixa é aberta.

**Regra final:**

> `range`, quando presente, **tem de estar na mesma métrica declarada por
> `basis`**. É **proibido** derivá-lo de `scales.raw_min/raw_max` quando `basis`
> representa métrica transformada (pontuação padrão, escore T, composta, z), e é
> **proibido** derivá-lo de extremos de faixa em qualquer família.

**Decisão: `range` é opcional, e a recomendação é omiti-lo** — alternativa (B) da
questão. Justificativa por família:

| família | domínio visual | de onde vem | precisa de `range` no snapshot? |
|---|---|---|---|
| percentil | 0..100 | **matemático**, independe de norma | **não** |
| z | **sem domínio fechado** | convenção visual explícita de G0 (ex.: −3..+3) **com comportamento de overflow declarado**; nunca inventar teto | **não** |
| escore_bruto (score = bruto) | o próprio intervalo da escala | **já implícito nos `segments` congelados** — eles cobrem o domínio inteiro, sem faixa aberta (provado acima) | **não** |
| pontuação padrão · escore T · composta | convenção da métrica (BAYLEY comprovadamente 40..160 nos domínios) | contrato estático G0, por instrumento e `basis` | **não** |
| quartil (ETPC) | não há eixo contínuo | — | **não** |

Em nenhuma família o domínio visual precisa ser congelado. É a solução com
**menor duplicação** — nada que já esteja em `segments` ou em G0 se repete — e
**menor risco de reinterpretar avaliação antiga**.

**Por que omitir o domínio visual não viola I1.** Mudar a extensão do eixo altera
o *enquadramento*, não a *interpretação*: a posição do resultado **em relação aos
segmentos congelados** permanece idêntica, porque os segmentos estão no snapshot.
Reenquadrar não reclassifica. O que violaria I1 seria mover as fronteiras — e
elas são exatamente o que fica congelado.

Se G1B concluir que precisa de `range` em algum caso específico, ele é aceito
**desde que na métrica de `basis`** e com a fonte declarada explicitamente no
código. O campo fica no formato como opcional para não exigir `v: 2` depois.

### 5.3 Onde o snapshot é produzido

Em `criarEConcluir()`, **na mesma transação** que grava `assessment_results`, a
partir do que o motor já resolveu. Em `POST /corrigir` (que não grava) a mesma
função é chamada e o contexto vai na resposta sem persistir. Uma implementação,
dois usos.

---

## 6. DCDQ

Como o desbloqueio acontece, sem violar nada:

1. o cliente manda datas → `resolver-norma-data` devolve
   `norm_selector: { idade: "7" }`. O **servidor** calculou a idade;
2. `POST /corrigir` usa esse selector; `escolher()` resolve **uma** faixa etária;
3. `linha()` casa o bruto e traz a `classification` **daquela** faixa;
4. o servidor colapsa as linhas daquele conjunto em **2 segmentos** e devolve;
5. o snapshot congela junto do resultado.

O frontend **não** calcula idade, **não** escolhe faixa etária, **não** conhece
a tabela, **não** infere 47/56/58 e **não** consulta `norm_entries`. Ele recebe
os segmentos **desta avaliação** — que por acaso têm fronteira em 47 — e desenha.

**A régua do DCDQ nunca é uma regra geral no cliente: é o contexto de uma
avaliação.** Duas avaliações de idades diferentes trazem segmentos diferentes, e
é isso que está correto.

Efeito em G0: **DCDQ deixa de ser PENDENTE assim que G1B entregar o snapshot** —
o componente passa a ser ScoreBandChart, `semantico_por_faixa` / `ordinal` /
`ascendente_favoravel`, com a inversão que G0 já registrou. **Até lá, continua
PENDENTE.**

---

## 7. classification_bands — o que devolver

**A régua inteira daquela escala, já resolvida — não só a faixa aplicada.**

ScoreBandChart precisa desenhar o eixo com todas as faixas para que a posição do
resultado signifique alguma coisa; só o rótulo atual não permite desenhar nada.
Mas "inteira" quer dizer **da escala em questão**, nunca do instrumento inteiro:

- faixa presa à escala → só as daquela escala. C-TRF devolveria 3 por escala,
  jamais as 27;
- faixa global (BAYLEY-III, TDF, TRILHAS_PRE, CONFIAS, ERA-A/F) → as globais
  aplicáveis àquela `basis`. **CONFIAS tem faixas em duas bases (`z` e
  `percentual_acerto`) e só as de `z` entram** — as de `percentual_acerto` são
  de tarefa e G0 já as excluiu;
- família C → `segments: []`, com `basis` apontando ao campo que basta:
  `percentile` em BPA-2 e EPQ-J, `classification` em ETPC.

Nada de `severity`, `instrument_id`, `scale_id` ou ids: `from`, `to`, `label`,
`ordinal`.

---

## 8. `available = false`

Já existe em `ResultadoEscala`. Contrato, sem campo novo:

- **nenhum marcador quantitativo** — sem barra, sem ponto, sem posição no eixo;
- **a `message` do servidor é o que aparece**, textual;
- `null` **jamais** desenhado como zero (I4);
- `visual_context` **pode vir nulo** nesse caso, e é coerente: sem norma
  aplicada, não há régua aplicada. O renderer trata os dois como o mesmo estado;
- num gráfico de perfil, a escala indisponível **falta** da série — não entra
  com valor zero nem com barra cinza de altura arbitrária.

Vale para TDF, TRILHAS_PRE e BAYLEY-III, que têm cobertura normativa irregular.

---

## 9. `flags: ["ambiguous"]`

A regra psicométrica **não muda**: bruto que casa em duas linhas adota o **menor**
escore, e o motor marca a flag. Comportamento visual futuro:

- **o resultado continua sendo mostrado**, com o valor adotado — a flag não é erro;
- **a flag não altera nada do cálculo nem da posição** no eixo;
- **sim, indicador textual discreto**, junto do resultado da escala — omitir
  seria esconder incerteza que o servidor declarou;
- o frontend pode dizer **apenas** que o bruto correspondeu a mais de uma linha
  normativa e que foi adotado o menor escore. **Não pode** dizer qual era o outro
  valor (não o recebe), estimar intervalo, sugerir revisão clínica ou insinuar
  erro de aplicação;
- nenhuma cor semântica extra: a cor continua saindo da faixa (G0 §2.4).

---

## 10. IC95

`ci95` já é opcional em `ResultadoEscala`. Contrato:

- **presente** → o gráfico pode representar o intervalo **somente se o componente
  daquele instrumento autorizar**. Hoje isso significa **só BAYLEY-III**;
- **ausente** → nada é desenhado. Não estimar, não derivar de DP, não inventar;
- **dentro do mesmo instrumento a presença varia**: `DOM_Adaptativo` **não tem
  IC95 em nenhuma das 112 linhas**, enquanto os outros quatro domínios têm em
  todas. O gráfico de domínios precisa conviver com quatro barras de erro e uma
  sem, **sem** desenhar a quinta;
- `ci95` é **texto** no acervo (formato de intervalo). G1B não converte em número
  no cliente: se precisar de extremos numéricos, quem os fornece é o servidor,
  em campo próprio, e isso é decisão de G1B — não deste documento.

---

## 11. Histórico e legado

Existem hoje **3 avaliações salvas**, sem snapshot: uma de BAYLEY-III (21 linhas
de resultado, **5 com classificação** — confirmando a separação subtestes/domínios
de G0), uma de CES-D e uma de DCDQ.

**Política — `visual_context IS NULL`:**

| situação | comportamento |
|---|---|
| gráfico depende de faixa (famílias A e B) | **sem gráfico.** A tabela de resultados atual permanece, íntegra |
| família C · percentil (BPA-2, EPQ-J) | **gráfico permitido.** A régua é o eixo 0–100 da própria métrica, não dado normativo — não há banda histórica a falsificar |
| família C · classificação (**ETPC**) | **gráfico permitido.** O CategoricalProfileChart lê apenas `ResultadoEscala.classification`, que **já está congelada** na linha de resultado desde sempre. Não há reconstrução normativa a fazer, nem antes nem depois da migration — o snapshot, quando existir, só torna explícito o que já era verdade |
| DCDQ | continua PENDENTE de qualquer modo |

**Proibido**: usar banda atual e apresentá-la como histórica. **Também proibido**:
usar banda atual com um aviso — o aviso não conserta um gráfico errado, só o
documenta.

**Backfill: não.** Seria preciso provar que as faixas não mudaram desde cada
avaliação, e não há como: as tabelas não têm coluna temporal (§3.3). Um backfill
"provavelmente correto" é exatamente a representação histórica dependente do
presente que I1 proíbe.

**Impacto prático, sem ambiguidade.** São **3 avaliações legadas** —
BAYLEY-III, CES-D e DCDQ. Destas, **apenas 2 perdem um gráfico que G0 havia
aprovado**: BAYLEY-III (DomainProfileChart) e CES-D (ScoreBandChart). **O DCDQ
não representa uma terceira perda**, porque ele já estava PENDENTE em G0 e nunca
teve gráfico aprovado a perder. As duas que perdem continuam com a tabela de
resultados íntegra.

O acervo legado é pequeno o bastante para que a política honesta custe quase
nada — e essa janela se fecha rápido.

Quando `visual_context` for nulo, a tela deve dizer que o gráfico não está
disponível para aquele registro, sem culpar o dado nem sugerir defeito.

---

## 12. Contrato único entre as três telas

**Sim — as três devem devolver a mesma estrutura.**

```
POST /corrigir        → resultados: Record<scale, ResultadoEscala & { visual_context }>
POST /avaliacao       → idem
GET  /avaliacao/:id   → idem
```

Em `/corrigir` o contexto é calculado e não persistido; em `/avaliacao` é
calculado, persistido e devolvido; em `GET /avaliacao/:id` é lido do que foi
gravado. **O renderer não sabe de qual das três veio** — é o objetivo declarado
em G1A, e elimina lógica especial por tela.

Consequência boa: `AvaliacaoDetalhe` **deixa de precisar** buscar
`InstrumentoDetalhe`. A Opção A morre também por desnecessidade.

---

## 13. Segurança e privacidade

O que o contexto **não** carrega: tabela normativa completa, amostras
normativas, médias/DP, `raw_min`/`raw_max` linha a linha, escores de conversão,
fórmulas, ids de `norm_sets`/`norm_entries`/`classification_bands`, selectors
além do que já vai em `norm_selector`, e nada de outro usuário.

O que carrega: `basis`, extensão da régua e os rótulos de faixa **daquela escala,
naquela avaliação** — que o profissional já vê como texto em `classification`.
Um segmento é a fronteira que o resultado dele atravessou, não a tabela.

`assessment_results` tem RLS com policy `own_results`
(`schema_instrumentos.sql:359`); a coluna nova herda a mesma proteção. A Edge
continua a única leitora, por `service_role`, com a cláusula `user_id` repetida
em toda query — `carregar()` a repete inclusive na segunda query, de propósito.

Ganho lateral: hoje `faixas_classificacao` manda ao browser **todas** as faixas
do instrumento (as 27 do C-TRF, por exemplo). O snapshot manda só as da escala
em questão — **menos** dado normativo no cliente, não mais.

---

## 14. Impacto estimado de implementação

**Baixo–médio.** Concentrado no motor; o cliente só ganha campo novo.

| frente | tamanho | risco |
|---|---|---|
| migration (1 coluna JSONB anulável) | trivial | baixo — aditiva, sem default, sem backfill |
| motor: montar `segments` nas duas famílias | **o grosso** | médio — é onde mora a lógica nova |
| motor: persistir e devolver nas 3 rotas | pequeno | baixo |
| tipos em `psico2` | pequeno | baixo |
| telas | **fora de G1A e de G1B** | — |

O ponto delicado é **um só**: colapsar corridas contíguas de `classification` em
`norm_entries` (família B) preservando a ordem e sem inventar fronteira onde há
buraco de norma. Tudo o mais é transporte.

Nada disso altera cálculo, norma, classificação ou resultado. O snapshot **lê** o
que o motor já decidiu.

---

## 15. Arquivos que G1B precisaria alterar

**`Aleporto73/CorrigeFacil`**

| arquivo | o quê |
|---|---|
| `supabase/functions/corrigir/index.ts` | montar `visual_context` (famílias A e B); devolvê-lo em `calcular()`; persistir em `criarEConcluir()`; devolvê-lo em `carregar()` |
| `schema/schema_instrumentos.sql` | a coluna nova, para que aplicação limpa nasça com ela |
| `supabase/functions/corrigir/vazamento_test.ts` | acrescentar as chaves proibidas do novo campo às sentinelas |

**`Aleporto73/psico2`**

| arquivo | o quê |
|---|---|
| `src/lib/corrigefacil/api.ts` | tipo `VisualContext`; campo em `ResultadoEscala` |
| `docs/corrigefacil/GRAPH_VISUAL_CONTRACT_G0_2026-08.md` | tirar DCDQ de PENDENTE **depois** de G1B entregue, não antes |

Nenhuma tela entra em G1B. Renderização é fase posterior.

## 15b. Migrations que G1B precisaria criar

**Uma**, em `CorrigeFacil/supabase/migrations/`:

```
alter table assessment_results add column if not exists visual_context jsonb;
```

Aditiva, anulável, sem default, **sem backfill** (§11). O `schema_instrumentos.sql`
muda junto, senão aplicação limpa nasce sem a coluna — foi exatamente o cuidado
tomado em `score_type_escore_bruto` e `option_sets`.

Nenhuma migration em `psico2`.

---

## 16. Testes exigidos em G1B

**Motor (Deno, sem banco — padrão de `vazamento_test.ts`)**

1. família A: uma escala com faixa própria produz `segments` só daquela escala;
2. família A global: BAYLEY-III produz as 7 faixas na ordem de `ordinal`;
3. CONFIAS: entram as faixas de `basis z`, **não** as de `percentual_acerto`;
4. família B: linhas contíguas de mesma `classification` colapsam num segmento —
   DCDQ, 61 linhas → 2 segmentos, fronteira em 47;
5. família B com buraco de norma: **não** inventar fronteira sobre o vazio;
6. família C · percentil: BPA-2 e EPQ-J produzem `basis: "percentile"` e
   `segments: []`, nunca `null` por engano;
6b. **família C · ETPC**: produz `basis: "classification"` e `segments: []`, e
   **nunca** consulta `norm_entries` nem gera segmento numérico de quartil. O
   teste falha se aparecer qualquer `from`/`to` com 25, 50 ou 75;
6c. **`basis` normalizado**: nenhum snapshot sai com `"percentil"` — a conversão
   para `"percentile"` acontece no servidor. O teste varre os 21 e exige que
   `basis` seja sempre um nome de campo de `ResultadoEscala`;
6d. **faixa aberta sobrevive como `null`**: BAYLEY-III (7 faixas com
   `max_value` nulo), CONFIAS e C-TRF produzem `to: null` — **nunca** 0, nunca
   349, nunca 999, nunca qualquer sentinela;
7. `available=false` não produz contexto quantitativo;
8. o contexto **não** repete `score`, `percentile`, `z`, `classification`, `ci95`;
9. **vazamento**: nenhum id normativo, nenhum `raw_min/raw_max` de linha, nenhuma
   média/DP no payload — sentinela igual à existente;
10. C-TRF: escala do bloco de síndromes traz 3 segmentos, **nunca** as 27 faixas;
11. **`range`**: se o snapshot trouxer `range`, ele está na métrica de `basis`.
    A trava direta — o teste falha se `range` de TDF, TRILHAS_PRE, C-TRF,
    BAYLEY-III ou CONFIAS coincidir com `scales.raw_min/raw_max`, e falha se
    coincidir com extremos de faixa (as sentinelas 349 e 999). É o teste que
    impede a regressão corrigida nesta revisão.

**Contrato entre as três rotas**

12. `POST /corrigir` e `POST /avaliacao` produzem contexto **idêntico** para a
    mesma entrada;
13. `GET /avaliacao/:id` devolve o **gravado**, e não um recálculo — o teste
    altera a banda depois de salvar e prova que o snapshot não mudou. **É o teste
    que prova I1**, e é o mais importante da lista;
14. legado: `visual_context` nulo atravessa as três rotas sem quebrar.

**Cliente (`psico2`, Vitest node)**

15. o tipo aceita `visual_context` ausente (legado) e presente, `range` ausente
    em qualquer caso, e `from`/`to` nulos; `basis` é uma união fechada dos
    **nomes de campo** de `ResultadoEscala` — `"percentil"` não compila;
16. nenhuma função pura de gráfico deriva corte, faixa, classificação **ou
    domínio de eixo a partir de dado normativo** — a trava equivalente à do
    `form-model.ts`, que já proíbe pontuar no cliente.

---

## Gate G1A

| pergunta | resposta |
|---|---|
| **HISTÓRICO FICA CONGELADO — COMO?** | snapshot visual mínimo persistido por linha de resultado, na mesma transação que grava o resultado. Resultado e régua congelam juntos; norma futura não os alcança |
| **DCDQ — CONTRATO PARA DESBLOQUEIO** | **DEFINIDO. Desbloqueável em G1B — não desbloqueado agora.** O servidor resolve a idade, resolve a faixa etária, colapsa as linhas daquele conjunto em 2 segmentos e congela. O cliente recebe a régua **desta** avaliação, nunca a tabela nem a regra. **G1A não desbloqueia produção: em produção o DCDQ segue PENDENTE até G1B implementar o contrato** |
| **`range`** | **opcional, recomendado omitir.** Quando presente, obrigatoriamente na métrica de `basis`; proibido derivar de `scales.raw_min/raw_max` em métrica transformada e proibido derivar de extremos de faixa — §5.2 |
| **NORMA COMPLETA VAI AO BROWSER** | **NÃO** — e vai **menos** que hoje: só as faixas da escala em questão, não as do instrumento |
| **FRONTEND CALCULA CORTE** | **NÃO** — recebe `segments` prontos |
| **AVAILABLE FALSE** | definido — §8 |
| **AMBIGUOUS** | definido — §9 |
| **IC95 OPCIONAL** | definido — §10 |
| **LEGACY** | definido — §11, sem backfill |
| **CONTRATO ÚNICO ENTRE AS 3 TELAS** | definido — §12 |

---

## Escopo desta fase

Nenhuma migration, Edge, type TS, JSX, gráfico, CSS ou teste de código. Nenhuma
alteração psicométrica, de banco ou de frontend. Este documento é o único arquivo
do commit.
