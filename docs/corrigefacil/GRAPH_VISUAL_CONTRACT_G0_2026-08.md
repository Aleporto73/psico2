# CorrigeFácil — Contrato visual dos 21 instrumentos (G0)

Agosto de 2026. Base: `54b2bdb`. **Fase de auditoria e desenho. Nenhum código,
componente, chart ou CSS foi escrito.**

## 0. Método e fontes

Tudo abaixo foi lido em consulta **somente leitura** ao Postgres de produção
(`wxiyfudloyyxmnaddljx`), em `begin transaction read only`: `instruments`,
`scales`, `norm_sets`, `norm_entries`, `norm_stats`, `classification_bands`,
`scale_components`. O motor (`supabase/functions/corrigir/index.ts`) e
`src/lib/corrigefacil/api.ts` foram lidos apenas para entender o **formato** do
resultado. Nada foi alterado.

### Como o resultado se forma (necessário para decidir o gráfico)

Cada escala devolve `{ raw, score, percentile, z, classification, ci95,
available, message, flags }`. De onde vem cada campo:

| campo | origem |
|---|---|
| `raw` | a soma/bruto enviado — sempre presente |
| `score`, `percentile`, `ci95` | a linha de `norm_entries` que casou com o bruto |
| `z` | `norm_stats` (média/DP) — só onde existe |
| `classification` | a linha de `norm_entries` **se ela trouxer**; senão, `classification_bands` na `basis` do `score_type` |

O mapa `BASIS` do motor: `escore_t`, `pontuacao_padrao`, `escalonada`,
`composta` e `escore_bruto` → `score`; `percentil` → `percentil`; `escore_z` →
`z`.

### Duas restrições de contrato que valem para TODOS os instrumentos

**R1 — os cortes só chegam ao cliente via `classification_bands`.**
`GET /catalogo/:code` devolve `faixas_classificacao`, que é exatamente essa
tabela. Instrumento **sem** linhas ali (BPA-2, DCDQ, EPQ-J, ETPC) não entrega
corte nenhum ao browser: a classificação vem pronta como texto, e a linha de
corte **não existe como dado no cliente**. Nenhum gráfico pode desenhar um
corte que ele não recebeu — inventá-lo seria criar interpretação.

**R2 — a tela de avaliação salva não recebe faixa alguma.**
`AvaliacaoDetalhe` (`GET /avaliacao/:id`) tem `resultados` e **não tem**
`faixas_classificacao`. Qualquer gráfico com banda funciona hoje só na tela de
resultado logo após a correção. Para valer também no detalhe salvo, G1 precisa
decidir entre buscar o catálogo naquela tela ou incluir as faixas no payload da
avaliação. **Isto é pré-requisito de G1, não decisão de G0.**

---

## 1. Matriz por instrumento

Legenda de disponibilidade: **S** = sim, **N** = não, **P** = parcial.

---

### BAYLEY-III

| campo | conteúdo |
|---|---|
| nome | Bayley-III |
| entry_mode | `bruto` |
| score_type | `composta` |
| escalas | 21 — 16 primárias + 5 compostas |
| escala.kind | 16 `primaria`, 5 `composta` |
| resultado final | subtestes: escalonada; domínios: composta + percentil (+ IC95) |
| raw / score / percentile / z / ci95 / classification | S / S / P / N / P / S (só domínios) |
| métrica graficável | **composta dos 5 domínios**, 40–160 |
| métrica NÃO graficável | escalonada dos 16 subtestes (1–19) — outra métrica |
| escalas comparáveis | **parcial**: os 5 domínios entre si, sim; subtestes com domínios, **não** |
| direção homogênea | S — em toda a métrica composta, maior = melhor |
| cortes / faixas | S / S — 7 faixas **globais** em `basis score` (130,120,110,90,80,70,0) |
| componente | **DomainProfileChart** |
| escalas incluídas | DOM_Cognitivo, DOM_Linguagem, DOM_Motora, DOM_Socioemocional, DOM_Adaptativo |
| escalas excluídas | os 16 subtestes (Cog, CR, CE, MF, MG, SE, Com, FA, AD, LZ, Soc, VC, VD, SS, AC, MO) |
| risco | juntar 1–19 com 40–160 num eixo só é erro de categoria; o subteste também **não recebe classificação** (o motor só classifica escala de 2º estágio) |
| decisão G0 | **APROVADO** |

**Prova exigida, feita.** Consulta a `norm_entries`: `stage='bruto_para_escore'`
→ score entre **1 e 19** (16 subtestes); `stage='soma_para_composta'` → score
entre **40 e 160** (5 domínios). Por domínio:

| domínio | linhas | composta | percentil | IC95 |
|---|---:|---|---:|---:|
| DOM_Cognitivo | 19 | 55–145 | 19/19 | 19/19 |
| DOM_Linguagem | 37 | 47–153 | 35/37 | 37/37 |
| DOM_Motora | 37 | 46–154 | 25/37 | 37/37 |
| DOM_Socioemocional | 19 | 55–145 | 19/19 | 19/19 |
| DOM_Adaptativo | 112 | 40–160 | 101/112 | **0/112** |

Os 5 partilham a métrica e as mesmas 7 faixas globais → comparáveis. **IC95 é
opcional por domínio**: DOM_Adaptativo nunca tem. O gráfico deve tratar IC95 e
percentil como ausentes sem quebrar, e nunca desenhar barra de erro inventada.

---

### BPA-2

| campo | conteúdo |
|---|---|
| entry_mode | `componentes` · score_type `percentil` |
| escalas | AA, AC, AD (`primaria`) + AG (`composta`, soma das três) |
| resultado final | percentil + classificação, ambos da linha de norma |
| raw / score / percentile / z / ci95 / classification | S / **N** / S / N / N / S |
| métrica graficável | **percentil** (0–100) |
| métrica NÃO graficável | bruto (A−E−O, pode ser negativo, sem teto declarado) |
| escalas comparáveis | S entre AA/AC/AD — mesma métrica percentílica |
| direção homogênea | S |
| cortes / faixas | **N / N** — `classification_bands` vazio; a classificação vem na linha |
| componente | **StandardizedProfileChart** |
| escalas incluídas | AA, AC, AD |
| escalas excluídas | AG (composta das outras três — barra ao lado dos componentes sugere 4ª dimensão independente) |
| risco | percentil é **NULL** abaixo do primeiro corte (25.247 de 27.191 linhas têm percentil); barra ausente ≠ barra zero |
| decisão G0 | **APROVADO** — sem linhas de corte (R1); o eixo percentílico 0–100 já é a escala |

---

### C-TRF_1.5-5

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_t` |
| escalas | 6 síndromes (I–VI) + INT, EXT, TOT |
| escala.kind | 6 `primaria`, 3 `composta` |
| resultado final | escore T + classificação por faixa |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | **escore T**, idêntico nas 9 |
| métrica NÃO graficável | bruto (raw_max de 14 a 200) |
| escalas comparáveis | S na métrica — **mas com cortes diferentes** |
| direção homogênea | S — maior T = mais sintoma |
| cortes / faixas | S / S — 27 faixas, **todas presas à escala** (3 por escala) |
| componente | **StandardizedProfileChart em DOIS blocos** |
| escalas incluídas | bloco 1: I, II, III, IV, V, VI · bloco 2: INT, EXT, TOT |
| escalas excluídas | nenhuma |
| **display range** | **29..100** — o mesmo eixo nos dois blocos |
| risco | os cortes das síndromes são 65/70 e os das bandas largas 60/64; uma linha de corte única sobre as 9 classificaria errado metade |
| decisão G0 | **APROVADO**, obrigatoriamente separado nos dois blocos |

**DISPLAY RANGE = 29..100 — o domínio efetivamente coberto pelas tabelas
normativas implementadas neste acervo.**

**Não é declaração de domínio universal do C-TRF nem do sistema ASEBA.** É o
intervalo que as nove tabelas `norms_T` deste acervo produzem, medido linha a
linha.

**50..100 seria incorreto para o instrumento inteiro.** As seis síndromes têm
piso **50** — mas as bandas largas descem abaixo disso, e um eixo começando em
50 jogaria resultados reais para fora do gráfico:

| bloco | escala | raw | T |
|---|---|---|---|
| síndromes | I, II, III, IV, V, VI | 0..14 a 0..50 | **50..100** |
| bandas largas | INT | 0..64 | **34..100** |
| bandas largas | EXT | 0..68 | **36..100** |
| bandas largas | **TOT** | 0..200 | **29..100** |

O piso global é o **29** do TOT; o teto é **100** nas nove. Por isso 29..100
cobre as nove tabelas — e nenhum resultado pode cair fora dele: as tabelas são
**completas e contíguas** (todo bruto de 0 a `max_raw` tem linha, em M e F), de
modo que todo T produzível já está dentro da janela. É por isso que este eixo
**não precisa de `overflow`**, ao contrário do TDF e do TRILHAS_PRE, cuja
métrica tem extremos abertos.

O que este eixo **não** faz:

- **não usa bruto.** Os `raw_max` vão de 14 a 200 e nunca entram no eixo; o que
  se plota é o **escore T já calculado pelo servidor**;
- **não converte bruto em T no cliente**, e **não recalcula classificação** — a
  classificação continua sendo a que o servidor devolveu;
- **não junta os nove num bloco só.** O eixo é comum porque a métrica é a
  mesma; os **cortes não são** — 65/70 nas síndromes, 60/64 nas bandas largas.
  Os dois blocos continuam obrigatórios.

---

### CES-D · CHECK-DIS · PHQ-9 · QA-ADULTO · TRACO-ANSIEDADE

Cinco instrumentos de escala única, tratados juntos porque o contrato é o mesmo.

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_bruto` |
| escalas | 1 (`TOTAL`), `primaria` |
| resultado final | `score` = o próprio bruto + classificação por faixa |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | **score (= bruto)** dentro do intervalo declarado da escala |
| métrica NÃO graficável | nada além disso |
| escalas comparáveis | não se aplica — uma só |
| cortes / faixas | S / S — presas à escala |
| componente | **ScoreBandChart** |
| risco | nenhum de comparação; ver a nota de direção abaixo |
| decisão G0 | **APROVADO** para os cinco |

| código | escala | faixas | direção |
|---|---|---:|---|
| CES-D | TOTAL 0–60 | 3 | maior = mais indício |
| CHECK-DIS | TOTAL **39–195** | 3 | **INVERTIDA — maior = melhor** (39–78 "Risco Alto", 113+ "Risco Baixo") |
| PHQ-9 | TOTAL 0–27 | 5 | maior = mais indício |
| QA-ADULTO | TOTAL 0–50 | 2 | maior = mais indício |
| TRACO-ANSIEDADE | TOTAL 0–102 | 2 | maior = mais indício |

**CHECK-DIS é a exceção que proíbe qualquer regra global de cor por
magnitude.** O piso é 39 (39 itens valendo 1 no mínimo) e não 0.

---

### CONFIAS

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_z` |
| escalas | Sílaba, Fonema (`primaria`) + Total (`composta` das duas) |
| resultado final | **z** calculado de `norm_stats` (média/DP), 12 linhas |
| raw / score / percentile / z / ci95 / classification | S / **N** / N / S / N / S |
| métrica graficável | **z** |
| métrica NÃO graficável | bruto (Sílaba 0–40, Fonema 0–30, Total 0–70) |
| escalas comparáveis | S — z é comparável por construção |
| direção homogênea | S |
| cortes / faixas | S / S — 6 faixas **globais**, em `basis z` e `percentual_acerto` |
| componente | **StandardizedProfileChart** |
| escalas incluídas | Sílaba, Fonema |
| escalas excluídas | Total (composta das duas — dupla contagem visual) |
| risco | z não tem intervalo fechado; o eixo precisa de domínio fixo declarado (ex.: −3 a +3) e **marcar o que escapa**, não cortar em silêncio. As faixas em `percentual_acerto` são de tarefa e **não** se aplicam a este gráfico |
| decisão G0 | **APROVADO** para Sílaba+Fonema; Total como síntese separada |

---

### DASS-21

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_bruto` |
| escalas | DEPRESSAO, ANSIEDADE, ESTRESSE — 3 `primaria`, sem Total |
| resultado final | score (= bruto ×2, peso em `item_scales`) + classificação |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | score, **por escala** |
| métrica NÃO graficável | as três lado a lado num eixo comum |
| escalas comparáveis | **N** — ver abaixo |
| direção homogênea | S |
| cortes / faixas | S / S — 15 faixas, 5 por escala, **presas à escala** |
| componente | **CategoricalProfileChart** (três band charts pequenos, um por domínio) |
| escalas incluídas | as três, cada uma na própria escala de faixas |
| escalas excluídas | nenhuma |
| risco | **as três têm o MESMO intervalo (0–42) e cortes DIFERENTES.** Um escore 20 é "Moderado" em Depressão, "Moderado" em Estresse e "Extremamente severo" em Ansiedade. Barras de mesma altura lado a lado dizem "igual" quando a leitura clínica é oposta |
| decisão G0 | **APROVADO como categórico.** Pizza **proibida** (as três não são partes de um todo). A classificação textual continua obrigatória ao lado de cada domínio |

---

### DCDQ

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_bruto` · exige data de nascimento |
| escalas | 1 (`TOTAL`, 15–75) |
| resultado final | score (= bruto) + classificação **vinda da linha de norma**, por faixa etária |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | score |
| cortes / faixas | **N / N** — `classification_bands` vazio (0 linhas) |
| componente | **ScoreBandChart sem banda** — só a posição do escore |
| **display range** | **15..75** |
| risco | o corte muda com a idade (47 / 56 / 58) e mora em `norm_entries`, uma linha por bruto dentro de cada faixa etária. O cliente **não recebe** esse corte: recebe só o valor e o rótulo. Desenhar banda exigiria o frontend adivinhar o corte da faixa etária aplicada — exatamente o que o princípio central proíbe. A direção ainda é **invertida** (maior = melhor) |
| decisão G0 | **APROVADO** — posição do escore no domínio 15..75, **sem corte visual** |

**DISPLAY RANGE = 15..75 — domínio real do escore, não convenção.**

Neste instrumento `score` **é** o bruto por identidade explícita: `load_dcdq`
emite, para cada faixa etária, uma linha por bruto de 15 a 75 com **score = raw**
(`engine/loader.py` · `norm_entries`, `(…, r, r, r, …)`). Logo os
`raw_min`/`raw_max` declarados — 15 e 75 — **estão na mesma métrica que o
gráfico plota**, e 15..75 é o domínio do próprio escore. O piso 15 não é
arbitrário: são os 15 itens valendo 1 no mínimo.

**O gráfico não desenha corte, e isso é o ponto.** A régua mostra **apenas a
posição** do escore total:

- **nenhuma banda, nenhuma linha de corte, `segments` vazio**;
- **47, 56 e 58 não existem no frontend** — nem como número, nem como fronteira;
- o cliente **não calcula idade**, **não escolhe faixa etária**, **não infere
  cutoff** e **não recalcula classificação**;
- a **classificação exibida é exatamente a que o servidor devolveu**, texto
  pronto, ao lado da régua.

Por isso o tom é `neutro`: sem faixa disponível no cliente, **não há de onde
tirar semântica de cor** — e derivá-la da magnitude é proibido nos 21 (§2.4). A
direção continua `ascendente_favoravel`, com a inversão dita em voz alta:
**pontuação alta é o resultado favorável**.

Se um dia o servidor passar a enviar o corte da norma resolvida, uma linha de
corte poderá ser avaliada **separadamente**. Não faz parte desta decisão, e o
gráfico acima **não depende disso** para existir.

---

### EPQ-J

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `percentil` |
| escalas | P, E, N (`primaria`) + **S (`validade`)** |
| resultado final | percentil + classificação, ambos da linha de norma |
| raw / score / percentile / z / ci95 / classification | S / **N** / S / N / N / S |
| métrica graficável | **percentil** |
| métrica NÃO graficável | bruto (raw_max 14, 12, 18, 16) |
| escalas comparáveis | S entre P/E/N |
| direção homogênea | S entre P/E/N |
| cortes / faixas | **N / N** |
| componente | **StandardizedProfileChart ×2** — perfil principal + bloco complementar |
| escalas incluídas | P, E, N no bloco **Perfil de traços**; **S** no bloco **Escala de Sinceridade**, abaixo e separado |
| escalas excluídas | **S do PERFIL PRINCIPAL** — e só dele. S não sai da tela |
| risco | S é escala de **validade**, não traço: `kind='validade'` no banco. Percentil alto em S não é "mais sinceridade" na mesma leitura de "mais neuroticismo" — é indicador da qualidade do protocolo. Como quarta barra ao lado de P/E/N vira quarta dimensão clínica falsa. **Separá-la em bloco próprio resolve o risco sem escondê-la**: o profissional continua vendo percentil e classificação de S, mas fora da régua comparativa dos traços |
| decisão G0 | **APROVADO**. P/E/N = **Perfil de traços**. S = **Escala de Sinceridade**, apresentada **separadamente**, em bloco complementar próprio, na mesma métrica percentílica (0–100), `neutro`/`nao_avaliativa`. O título nomeia a **escala**, nunca um veredito: "Validade do protocolo" **não** é título autorizado |

---

### ERA-A e ERA-F

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `percentil` |
| escalas | ERA-A: 4 fatores + Escore Geral · ERA-F: 4 fatores + Escore Geral (`composta`) |
| resultado final | percentil + classificação por faixa |
| raw / score / percentile / z / ci95 / classification | S / **N** / S / N / N / S |
| métrica graficável | **percentil** |
| métrica NÃO graficável | bruto (ERA-A: 60 a 120 por fator; ERA-F: 20 a 80) |
| escalas comparáveis | S entre os fatores |
| direção homogênea | S |
| cortes / faixas | S / S — 2 faixas **globais** em `basis percentil` (≤59 / ≥60) |
| componente | **StandardizedProfileChart** |
| escalas incluídas | os 4 fatores |
| escalas excluídas | Escore Geral (composta dos quatro) |
| risco | os fatores de ERA-A e ERA-F são **homônimos mas normativamente distintos** (linhas separadas no banco): nunca comparar um com o outro. Regra de resolução de percentil documentada em `notes` — bruto com mais de um percentil resolve pelo maior |
| decisão G0 | **APROVADO** para ambos |

---

### ETPC

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `quartil` |
| escalas | Psicoticismo, Extroversão, Neuroticismo, Sociabilidade — 4 `primaria` |
| resultado final | `score` ∈ {25, 50, 75} + classificação da linha |
| raw / score / percentile / z / ci95 / classification | S / S (ordinal) / N / N / N / S |
| métrica graficável | **a classificação** (rótulo do quartil) |
| métrica NÃO graficável | o `score` 25/50/75 como barra contínua |
| escalas comparáveis | S — todas no mesmo esquema de quartil |
| direção homogênea | N — traço de personalidade não tem polo "melhor" |
| cortes / faixas | **N / N** |
| componente | **CategoricalProfileChart** |
| escalas incluídas | as quatro |
| risco | 25/50/75 são **marcadores de quartil**, não pontuação. Barra de altura 75 ao lado de 25 sugere "três vezes mais", quando são duas categorias ordinais vizinhas. E personalidade não tem direção de gravidade |
| decisão G0 | **APROVADO como categórico**, cor **ordinal neutra** — proibida cor semântica |

---

### SCARED-C

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_bruto` |
| escalas | PANICO, GENERALIZADA, SEPARACAO, SOCIAL, ESCOLAR + TOTAL (`composta` das cinco) |
| resultado final | score (= bruto) + classificação por faixa |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | score, **por escala** |
| escalas comparáveis | **N** |
| direção homogênea | S |
| cortes / faixas | S / S — 13 faixas presas à escala (2 por subescala, 3 no TOTAL) |
| componente | **CategoricalProfileChart** (small multiples) + ScoreBandChart para o TOTAL |
| risco | os `raw_max` são **26, 18, 16, 14, 8** e cada um tem corte próprio. Um 8 em ESCOLAR é o teto da escala; um 8 em PANICO é menos de um terço. Barras de mesma altura significam coisas opostas |
| **display range do TOTAL** | **0..82** |
| decisão G0 | **APROVADO como categórico**; TOTAL em band chart próprio |

**DISPLAY RANGE TOTAL = 0..82.** O TOTAL usa **escore bruto**, e neste
instrumento `score` **é** o bruto por identidade explícita — não por coincidência
de nome: `engine/loader.py` materializa o TOTAL com `_identidade("TOTAL", 82)`,
uma linha por ponto de 0 a 82 com `score = raw`. Logo `raw_max = 82`
(`data/scared_c.json` · `instrument.total.max_raw`) **está na mesma métrica que o
gráfico plota**, e a proibição de G1A §5.2 — que recai sobre usar
`raw_min`/`raw_max` em métrica **transformada** — não se aplica aqui.

O domínio não foi somado dos tetos das subescalas. Ele é declarado no campo
`max_raw` e confirmado por dois artefatos independentes: as 83 linhas de norma de
0 a 82, e as `total_bands` `0–24 / 25–30 / 31–82`, contíguas e **fechadas nas duas
pontas**. É o mesmo caso que G1A §5.2 item 4 chama de coincidência **provada**.

---

### SDQ-POR

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_bruto` |
| escalas | EMO, CON, HIP, PAR, **PRO** (todas 0–10) + TOTAL (`composta` de **quatro**) |
| resultado final | score (= bruto); classificação **só no TOTAL** |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / **P — só TOTAL** |
| métrica graficável | score do **TOTAL** |
| métrica NÃO graficável | as 5 subescalas comparadas entre si |
| escalas comparáveis | **N** |
| direção homogênea | **N** |
| cortes / faixas | S / S — 4 faixas, **todas presas ao TOTAL**; as subescalas têm **zero** |
| componente | **ScoreBandChart** |
| escalas incluídas | TOTAL |
| escalas excluídas | EMO, CON, HIP, PAR, **PRO** |
| risco | **PRO (Pró-Social) tem direção OPOSTA** — pontuação alta é competência preservada, enquanto alta em EMO/CON/HIP/PAR é dificuldade. É também a única das cinco que **não** entra no TOTAL (`scale_components` tem 4 filhos, PRO fora). Cinco barras iguais diriam que PRO é mais uma dificuldade. E nenhuma subescala tem faixa: sem corte, não há o que representar além do número |
| decisão G0 | **APROVADO** só para o TOTAL. As subescalas ficam em tabela, com PRO rotulada na direção dela |

---

### SNAP-IV-18 e SNAP-IV-26

| campo | conteúdo |
|---|---|
| entry_mode | `itens` · score_type `escore_bruto` |
| escalas | 18: DESATENCAO, HIPERATIVIDADE (0–9) · 26: as duas + TOD (0–8) |
| resultado final | score = **contagem de sintomas**, não soma de intensidade + classificação |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | contagem, **por escala** |
| escalas comparáveis | **N** |
| direção homogênea | S |
| cortes / faixas | S / S — 2 faixas por escala, presas à escala |
| componente | **CategoricalProfileChart** |
| risco | o motor **conta itens marcados "Bastante" ou "Demais"** (`score_value` 0,0,1,1), não soma a intensidade 0–3. Contagem 4 em TOD (teto 8, corte 4) **atinge** o critério; contagem 4 em DESATENCAO (teto 9, corte 6) **não atinge**. Mesma altura de barra, decisões opostas. "Mais contagem = mais grave" é falso entre escalas |
| decisão G0 | **APROVADO como categórico** para as duas versões |

---

### TDF

| campo | conteúdo |
|---|---|
| entry_mode | `bruto` · score_type `pontuacao_padrao` |
| escalas | 1 `primaria` |
| resultado final | pontuação padrão + classificação por faixa |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | **score padronizado** |
| métrica NÃO graficável | bruto |
| cortes / faixas | S / S — 5 faixas **globais** |
| componente | **ScoreBandChart** |
| **display window** | **40..160**, com excedente |
| risco | há idade sem norma publicada (cobertura irregular): `available=false` é estado legítimo e o gráfico **não pode** desenhar nada nesse caso |
| decisão G0 | **APROVADO** |

**DISPLAY WINDOW = 40..160 — CONVENÇÃO VISUAL FIXA, não domínio normativo.**

A pontuação padrão do TDF tem **extremos abertos**: a primeira faixa é
"MUITO BAIXA" abaixo de 70 e a última é "MUITO ALTA" de 130 para cima. Não
existe teto nem piso psicométrico, e esta janela **não inventa um**. Ela é a
extensão do eixo desenhado, e nada mais.

A janela é centrada em **100**, que é o centro declarado da métrica
(`data/tdf.json` · `score_mean`), com meia-largura de 60 — os ±4 DP da
convenção de pontuação padrão (DP 15). **O arquivo-fonte não declara DP**: 15 é
a convenção adotada aqui para desenhar, e é por isso que este número é
registrado como decisão de G0 e não como fato do acervo.

O que a janela **não** faz:

- **não é domínio normativo** e não pode ser citada como intervalo do teste;
- **não redefine as `classification_bands`** — elas continuam vindo do
  servidor, inclusive a "MUITO ALTA" que se estende além de 160;
- **não altera pontuação, norma nem classificação**;
- **não trunca valor**. Escore < 40 ou > 160 continua **verdadeiro**, aparece
  por extenso e é marcado como **excedente**. O acervo produz esses casos de
  fato: as tabelas de conversão do TDF chegam a 229. Prender o marcador na
  borda **sem dizer** que o valor a ultrapassou seria esconder exatamente o
  caso extremo;
- **não muda `available=false`**: idade sem norma continua sem ponto
  quantitativo, com a mensagem do servidor no lugar do gráfico.

---

### TRILHAS_PRE

| campo | conteúdo |
|---|---|
| entry_mode | `bruto` · score_type `pontuacao_padrao` |
| escalas | A-SEQ, A-CON, B-SEQ, B-CON — 4 `primaria` |
| resultado final | pontuação padrão + classificação por faixa |
| raw / score / percentile / z / ci95 / classification | S / S / N / N / N / S |
| métrica graficável | **score padronizado** |
| métrica NÃO graficável | **bruto — os `raw_min/raw_max` são 1–5, 1–4, 1–10, 1–9** |
| escalas comparáveis | **S na métrica padronizada** |
| direção homogênea | S |
| cortes / faixas | S / S — 5 faixas **globais**, valendo para as quatro |
| componente | **StandardizedProfileChart** |
| escalas incluídas | as quatro |
| **display window** | **40..160**, com excedente — **a mesma para as quatro** |
| risco | comparar bruto seria absurdo (um 4 é teto em A-CON e 40% em B-SEQ). É a padronização — e o fato de as 5 faixas serem globais — que torna as quatro comparáveis. A tabela tem buracos: bruto 0 e acima do teto ficam sem norma, e `available=false` não desenha |
| decisão G0 | **APROVADO** |

**DISPLAY WINDOW = 40..160, `overflow` — CONVENÇÃO VISUAL FIXA, não domínio
normativo.**

**Uma janela só para as quatro escalas.** A-SEQ, A-CON, B-SEQ e B-CON estão na
**mesma métrica padronizada** e partilham as **mesmas 5 faixas globais** — é
exatamente isso que as torna comparáveis, e é o que autoriza o eixo comum. Não
há `rangePorEscala` aqui: réguas separadas destruiriam a comparação que o
gráfico existe para permitir.

A janela é a **mesma convenção já adotada para pontuação padrão centrada em
100** neste contrato. `data/trilhas.json` declara `score_mean: 100` e **não
declara DP** — 40..160 é decisão de contrato visual, tomada para manter uma
única convenção entre os instrumentos de pontuação padrão, e **não** um
intervalo normativo do teste.

O que a janela **não** faz:

- **não é domínio normativo** e não pode ser citada como intervalo do TRILHAS;
- **não vem dos extremos das faixas.** O `1` e o `999` das
  `classification_bands` são **sentinelas técnicas**, não limites de eixo;
- **não vem do bruto.** Os `raw_min`/`raw_max` são 1–5, 1–4, 1–10 e 1–9: o
  bruto **nunca** entra neste eixo;
- **não vem dos extremos observados** nas tabelas de conversão;
- **não trunca valor.** Escore fora da janela continua **verdadeiro** e é
  marcado como **excedente**. O acervo produz esses casos: **B-SEQ chega a
  183** na idade 4. O 183 continua 183 — só a posição encosta na borda;
- **não muda `available=false`**: bruto 0 e bruto acima do teto ficam sem
  norma, e aí não há ponto quantitativo nenhum.

---

## 2. Cor — três propriedades independentes, sem paleta

Nenhuma cor é definida aqui. A versão anterior desta seção usava uma "classe"
única por instrumento, e quatro instrumentos (BAYLEY-III, TDF, TRILHAS_PRE,
ETPC) apareciam ao mesmo tempo como neutros **e** ordinais — o que tornava a
palavra "classe" ambígua. Ela não era ambígua por acidente: são **três coisas
diferentes**, e um instrumento tem um valor em cada uma.

### 2.1 As três propriedades

**TOM VISUAL** — de onde a semântica pode vir.

| valor | significado |
|---|---|
| `neutro` | nenhuma carga de valor. A cor distingue escalas, não julga resultado |
| `semantico_por_faixa` | a semântica pode vir **da faixa/classificação que o servidor devolveu**, e de nada mais |

**ORDINALIDADE** — se as categorias têm ordem declarada.

| valor | significado |
|---|---|
| `ordinal` | as faixas/categorias têm ordem declarada na fonte (podem receber intensidade visual crescente) |
| `nao_ordinal` | não há ordem entre as categorias |

**DIREÇÃO** — o que o extremo alto do eixo representa, na lógica do próprio
instrumento.

| valor | significado |
|---|---|
| `ascendente_favoravel` | o extremo alto corresponde à direção **favorável segundo a lógica do próprio instrumento** — maior desempenho, ou menor risco |
| `ascendente_sinalizador` | o extremo alto corresponde a **maior presença, intensidade ou indício do construto** que aquela escala representa |
| `especifica_por_escala` | a orientação **muda entre escalas do mesmo instrumento** |
| `nao_avaliativa` | não existe polo favorável nem desfavorável — posição ou traço, sem valência |

O que esses dois nomes **não** significam:

- `ascendente_favoravel` **não** quer dizer "pessoa melhor", "resultado bom" nem
  verde automático. Quer dizer apenas em que ponta do eixo mora a direção
  favorável daquele instrumento.
- `ascendente_sinalizador` **não** quer dizer risco, **não** quer dizer
  diagnóstico e **não** autoriza cor por magnitude. Vários instrumentos aqui
  medem sintoma, intensidade, indício ou presença de construto sem que "alto"
  seja "risco" — e o nome precisa comportar isso sem induzir G1 a transformar
  todo valor alto em alerta.

**Nota de nomenclatura.** A especificação de entrada de G0 listava
`higher_better`/`lower_better`. `lower_better` é geometricamente idêntico a
`ascendente_sinalizador` — o extremo favorável é o baixo nos dois — e manter
dois nomes para o mesmo eixo reintroduziria a ambiguidade que esta seção existe
para eliminar. Ficou um nome só. Os casos que tentariam usá-lo (CHECK-DIS e
DCDQ) estão marcados `ascendente_favoravel` com a inversão dita em voz alta.

**Estes quatro valores são metadados técnicos internos.** Não são texto de
interface: nenhum deles aparece ao profissional. Servem para G1 decidir
orientação de eixo e ordem de leitura — e não para gerar rótulo, mensagem ou
cor.

### 2.2 A regra fundamental

`semantico_por_faixa` **NÃO** significa "valor alto = vermelho, valor baixo =
verde".

Significa: a semântica visual pode vir **somente da faixa/classificação já
determinada pelo instrumento**, nunca da magnitude numérica isolada. O gráfico
lê o rótulo que o servidor mandou e colore por ele. Um mesmo número em duas
escalas do DASS-21 cai em faixas diferentes e portanto recebe cores diferentes —
é a faixa que manda, não a altura da barra.

Corolário que vale para os 21: **cor derivada de magnitude é proibida**, mesmo
onde a direção parece "óbvia".

### 2.3 Matriz de cor

| instrumento | tom_visual | ordinalidade | direção | observação obrigatória |
|---|---|---|---|---|
| BAYLEY-III | `neutro` | `ordinal` | `ascendente_favoravel` | as 7 faixas têm ordem, mas **"Média" não é "bom" e "Abaixo da média" não é "ruim"** — é posição na amostra normativa. Verde/vermelho automático é proibido |
| BPA-2 | `neutro` | `ordinal` | `ascendente_favoravel` | percentil de desempenho atencional; percentil **NULL** abaixo do primeiro corte não recebe cor nenhuma |
| C-TRF_1.5-5 · bloco I–VI | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | cortes 65/70, próprios do bloco |
| C-TRF_1.5-5 · bloco INT/EXT/TOT | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | cortes 60/64 — **outra régua**, não reaproveitar a do bloco de síndromes |
| CES-D | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | — |
| **CHECK-DIS** | `semantico_por_faixa` | `ordinal` | **`ascendente_favoravel`** | **invertido em relação aos instrumentos de risco usuais.** As faixas dizem risco ("Risco Alto" 39–78, "Risco Moderado" 79–112, "Risco Baixo" 113–195), mas **maior escore = MENOR risco**. ScoreBandChart aprovado; a semântica sai **exclusivamente da faixa recebida**. Qualquer regra por magnitude pinta o melhor resultado como o pior |
| CONFIAS | `neutro` | `ordinal` | `ascendente_favoravel` | faixas em `basis z`; as faixas em `percentual_acerto` são de tarefa e não entram |
| DASS-21 | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **a faixa é por escala.** O mesmo escore recebe cor diferente em Depressão, Ansiedade e Estresse — e é assim que tem de ser |
| **DCDQ** | `neutro` | `nao_ordinal` | **`ascendente_favoravel`** | **invertido em relação aos instrumentos de risco usuais: pontuação alta é o resultado favorável.** O corte não chega ao cliente (R1), então o gráfico **não desenha faixa nenhuma** — e sem faixa não há de onde tirar cor semântica. `neutro` aqui não é preferência estética: é a consequência de não haver régua. Cor por magnitude continua proibida |
| EPQ-J | `neutro` | `ordinal` | `nao_avaliativa` | percentil tem ordem, mas P/E/N são **traços**: não há polo bom. **S fica fora do perfil** e ganha bloco próprio; mesmo separada é `neutro`/`nao_avaliativa` — validade **não recebe cor clínica de gravidade** |
| ERA-A | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | 2 faixas globais (≤59 / ≥60) |
| ERA-F | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | idem; fatores homônimos aos de ERA-A **não** são comparáveis entre instrumentos |
| ETPC | `neutro` | `ordinal` | `nao_avaliativa` | **o quartil é ordinal** (Q25 < Q50 < Q75) e ainda assim o visual é **neutro**: traço de personalidade não representa bom/ruim. É o caso que mostra que ordinalidade e tom são eixos independentes |
| PHQ-9 | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | 5 faixas |
| QA-ADULTO | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | — |
| SCARED-C | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | corte próprio por subescala; a cor sai da faixa daquela escala, nunca da altura comparada |
| **SDQ-POR** | `semantico_por_faixa` (só TOTAL) | `ordinal` | **`especifica_por_escala`** | **TOTAL** pode ter semântica por faixa (`ascendente_sinalizador`). **PRO continua fora do gráfico** e é `ascendente_favoravel` — direção **oposta**. **Nunca aplicar a direção nem a cor do TOTAL a PRO.** EMO/CON/HIP/PAR não têm faixa: sem faixa, sem cor semântica |
| SNAP-IV-18 | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | 2 faixas por escala, corte próprio |
| SNAP-IV-26 | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | TOD corta em 4 e as outras em 6 — a cor sai da faixa da escala |
| TDF | `neutro` | `ordinal` | `ascendente_favoravel` | desempenho; `available=false` não recebe cor |
| TRACO-ANSIEDADE | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | — |
| TRILHAS_PRE | `neutro` | `ordinal` | `ascendente_favoravel` | 5 faixas globais valendo para os 4 subtestes |

### 2.4 Proibições que sobrevivem a qualquer paleta

- **Cor por magnitude é proibida nos 21.** A cor sai da **faixa recebida** —
  nunca da magnitude e **nunca da direção**. `ascendente_sinalizador` não é
  autorização para pintar valor alto de alerta: ele diz apenas para que lado
  cresce o construto. CHECK-DIS é a prova viva: lá o escore alto é o bom
  resultado.
- **Os quatro valores de direção não vão à tela.** São metadados técnicos
  internos, para orientar eixo e ordem de leitura. Nenhum deles vira rótulo,
  mensagem ou legenda para o profissional.
- **`nao_avaliativa` nunca recebe cor de gravidade** — ETPC e EPQ-J (P/E/N).
- **EPQ-J/S** é validade de protocolo, não traço nem gravidade. Ela aparece
  **separada**, no bloco **Escala de Sinceridade** — nunca como quarta barra de
  P/E/N, e nunca sob o título "Validade do protocolo", que julgaria o protocolo
  em vez de nomear a escala.
- **SDQ-POR/PRO** nunca recebe a cor nem a direção das escalas de dificuldade.
- **DCDQ não recebe cor semântica**: o gráfico dele não tem faixa, e cor só pode
  sair de faixa recebida. O corte etário (47/56/58) **nunca** vai ao frontend.
- Nenhum verde/amarelo/vermelho é assumido em lugar nenhum: no Bayley, "Média"
  é média — não é "bom".
- Escala sem faixa (subescalas do SDQ-POR) e resultado com `available=false` não
  recebem cor semântica: não há faixa de onde tirá-la.

---

## 3. Matriz-resumo

| Instrumento | Componente | Métrica | Escalas no gráfico | tom_visual | ordinalidade | direção | Status |
|---|---|---|---|---|---|---|---|
| BAYLEY-III | DomainProfileChart | composta 40–160 | 5 domínios (16 subtestes fora) | `neutro` | `ordinal` | `ascendente_favoravel` | **APROVADO** |
| BPA-2 | StandardizedProfileChart | percentil | AA, AC, AD (AG fora) | `neutro` | `ordinal` | `ascendente_favoravel` | **APROVADO** |
| C-TRF_1.5-5 | StandardizedProfileChart ×2 | escore T | bloco I–VI; bloco INT/EXT/TOT | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| CES-D | ScoreBandChart | score (=bruto) 0–60 | TOTAL | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| CHECK-DIS | ScoreBandChart | score 39–195 | TOTAL | `semantico_por_faixa` | `ordinal` | **`ascendente_favoravel`** (invertido) | **APROVADO** |
| CONFIAS | StandardizedProfileChart | z | Sílaba, Fonema (Total à parte) | `neutro` | `ordinal` | `ascendente_favoravel` | **APROVADO** |
| DASS-21 | CategoricalProfileChart | score por escala | DEP, ANS, EST | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| DCDQ | ScoreBandChart **sem banda** | score 15–75 (invertida) | TOTAL | `neutro` | `nao_ordinal` | `ascendente_favoravel` | **APROVADO** |
| EPQ-J | StandardizedProfileChart ×2 | percentil | Perfil de traços: P, E, N · Escala de Sinceridade: S (bloco separado) | `neutro` | `ordinal` | `nao_avaliativa` | **APROVADO** |
| ERA-A | StandardizedProfileChart | percentil | 4 fatores (Geral fora) | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| ERA-F | StandardizedProfileChart | percentil | 4 fatores (Geral fora) | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| ETPC | CategoricalProfileChart | classificação de quartil | 4 fatores | `neutro` | `ordinal` | `nao_avaliativa` | **APROVADO** |
| PHQ-9 | ScoreBandChart | score 0–27 | TOTAL | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| QA-ADULTO | ScoreBandChart | score 0–50 | TOTAL | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| SCARED-C | CategoricalProfileChart + band | score por escala | 5 subescalas + TOTAL | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| SDQ-POR | ScoreBandChart | score 0–40 | TOTAL (5 subescalas fora) | `semantico_por_faixa` (só TOTAL) | `ordinal` | **`especifica_por_escala`** | **APROVADO** |
| SNAP-IV-18 | CategoricalProfileChart | contagem por escala | DES, HIP | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| SNAP-IV-26 | CategoricalProfileChart | contagem por escala | DES, HIP, TOD | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| TDF | ScoreBandChart | pontuação padrão | escala única | `neutro` | `ordinal` | `ascendente_favoravel` | **APROVADO** |
| TRACO-ANSIEDADE | ScoreBandChart | score 0–102 | TOTAL | `semantico_por_faixa` | `ordinal` | `ascendente_sinalizador` | **APROVADO** |
| TRILHAS_PRE | StandardizedProfileChart | pontuação padrão | 4 subtestes | `neutro` | `ordinal` | `ascendente_favoravel` | **APROVADO** |

**Contagem: 21/21 classificados** — 8 ScoreBandChart, 7 StandardizedProfileChart,
1 DomainProfileChart, 5 CategoricalProfileChart, 0 PENDENTE, 0 SEM GRÁFICO.

---

## NÃO AUTORIZADOS PARA IMPLEMENTAÇÃO

**Nenhum instrumento fica sem representação.** O DCDQ era o único PENDENTE e
saiu: ele não precisava da Edge para existir — precisava **parar de tentar
desenhar o corte**. A régua sem banda representa a posição do escore em 15..75 e
deixa a classificação ser o que sempre foi, texto pronto do servidor. O corte
etário continua fora do cliente, e continua proibido lá.

**O que segue proibido no DCDQ:** desenhar 47/56/58, calcular idade, escolher
faixa etária, inferir cutoff ou recalcular classificação. Uma linha de corte só
volta à mesa se o servidor passar a enviar o corte da norma resolvida — e aí
como decisão nova, não como retomada desta.

**Bloqueios transversais que G1 tem de resolver antes de qualquer código:**

1. **R2 — a tela de avaliação salva não recebe `faixas_classificacao`.** Todo
   band chart hoje só funciona na tela de resultado pós-correção. Sem decidir
   isso, metade dos gráficos aprovados não existe no histórico.
2. **BPA-2, EPQ-J e ETPC não têm `classification_bands`.** Foram aprovados
   justamente por não dependerem de corte desenhado — percentil e quartil se
   explicam sozinhos. Se G1 quiser linha de corte neles, precisa de mudança de
   contrato, e aí voltam a PENDENTE.
3. **`available=false` é estado de primeira classe.** TDF, TRILHAS_PRE e
   BAYLEY-III têm cobertura normativa irregular. O gráfico não desenha, e a
   mensagem do servidor é o que aparece.
4. **`flags: ['ambiguous']`** existe no contrato (bruto que cai em duas linhas
   de norma; adota-se o menor escore). G1 precisa decidir como o gráfico marca
   isso — omitir a flag seria esconder incerteza que o servidor declarou.
5. **IC95 é opcional.** Só Bayley tem, e nem em todos os domínios. Barra de erro
   só onde `ci95` vier preenchido.

---

## Escopo desta fase

Nenhum JSX, componente, chart, CSS, teste ou código de extração foi criado.
Nenhuma alteração em banco, Edge, scoring, normas, classificações ou
instrumentos. Todas as consultas foram `begin transaction read only` seguidas de
`rollback`. Este documento é o único arquivo do commit.
