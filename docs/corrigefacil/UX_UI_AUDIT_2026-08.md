# CorrigeFácil — Auditoria UX/UI

Agosto de 2026. Base: `eb6fff5` (norma por data de BAYLEY-III e DCDQ recém-integrada).

## 1. Escopo

Toda a árvore `src/app/app/corrigefacil/` — catálogo, aplicação (itens, bruto,
componentes, norma por data), resultado, salvamento, histórico, detalhe e tela
de acesso bloqueado — mais o `AppShell` no que toca a descoberta do módulo.

Nada de psicometria entrou no escopo: fórmula, norma, classificação, percentil,
intervalo, `norm_selector`, Edge `corrigir`, `resolver-norma-data`, banco e
migrations continuam como estavam. O cálculo de idade e a seleção normativa
seguem no servidor.

## 2. Achados

| ID | tela/fluxo | sev | problema | impacto | decisão |
|----|-----------|-----|----------|---------|---------|
| A1 | catálogo → todas | **P0** | "Avaliações salvas" era um link de texto pequeno abaixo do subtítulo, só no catálogo | quem terminava uma avaliação voltava ao catálogo e concluía que não havia onde abrir as salvas — a rota existia, a navegação não | corrigido: barra de seções em todas as telas |
| A2 | aplicação (itens) | **P1** | nenhum sinal de progresso e botão só no fim do protocolo | em 10 dos 21 instrumentos o protocolo passa de 15 itens (C-TRF tem 100); responder o último exigia rolar até o fim para achar o botão | corrigido: contador + barra de ação fixa acima de 15 itens |
| A3 | aplicação (itens) | **P1** | alternativas eram `button` com `aria-pressed`, sem grupo nem nome acessível | leitor de tela anunciava botão de alternância solto; a relação com o enunciado se perdia | corrigido: `radiogroup`/`radio` + `aria-checked` + `aria-labelledby` |
| A4 | acesso bloqueado | **P1** | a tela de venda anunciava "Comparação entre aplicações" | recurso não implementado em lugar nenhum do módulo — promessa que a compra não entrega | corrigido: trocado pelo histórico, que existe |
| A5 | norma por data | **P1** | nascimento posterior à avaliação só era recusado pelo servidor | ida e volta de requisição para um engano visível na tela | corrigido: checagem de ORDEM das duas datas no cliente (não calcula idade) |
| A6 | aplicação (itens) | **P1** | pendência dizia "12 item(ns) sem resposta" sem dizer quais | em protocolo longo, mandava procurar sem dizer por onde | corrigido: cita os 6 primeiros números |
| A7 | salvamento | **P1** | "Avaliado" é obrigatório e nada dizia isso | botão desabilitado sem explicar qual campo faltava | corrigido: rótulo "(obrigatório)" + `aria-required` |
| A8 | erros (envio e salvamento) | **P1** | mensagens de erro apareciam sem `role` | leitor de tela não anunciava a falha | corrigido: `role="alert"` |
| A9 | aplicação (componentes) | **P2** | `capitalize` sobre a chave crua imprimia "Omissoes" | rótulo errado em português numa tela clínica | corrigido: mapa de rótulos, chaves do payload intactas |
| A10 | aplicação (componentes) | **P2** | inputs sem `min` aceitavam contagem negativa | acertos/erros/omissões são contagens; negativo é sempre engano | corrigido: `min={0}` `step={1}` |
| A11 | aplicação (bruto) | **P2** | o intervalo aceito da escala não era exibido | digitar, enviar e receber recusa em vez de saber antes | corrigido: "bruto de X a Y" sob o nome da escala |
| A12 | catálogo | **P2** | cartões com nome longo desalinhavam o CTA na mesma linha da grade | leitura irregular; o botão "pula" de altura entre vizinhos | corrigido: cartão em coluna com CTA no rodapé |
| A13 | catálogo | **P2** | duas colunas em `max-w-4xl` com 21 instrumentos | rolagem longa com canvas vazio nas laterais em desktop | corrigido: `max-w-5xl` + 3 colunas em `lg` |
| A14 | histórico | **P2** | lista sem busca, com até 100 registros | achar uma avaliação específica virava rolagem | corrigido: busca por avaliado, instrumento ou respondente |
| A15 | aplicação (itens sem enunciado) | **P2** | itens sem texto renderizavam "12. Item 12" | rótulo redundante e ambíguo | corrigido: número + "sem enunciado neste instrumento" |
| A16 | aplicação (itens) | **P2** | alvos de toque abaixo de 44px de altura | erro de toque em protocolo longo no celular | corrigido: `min-h-11` nas alternativas |
| A17 | catálogo e histórico | **P2** | busca com largura fixa `w-64` | estourava a linha no celular | corrigido: `w-full` no mobile |
| A18 | catálogo, histórico | **P3** | "nenhum resultado" sem `role="status"` | mudança silenciosa para leitor de tela | corrigido |
| A19 | resultado salvo | **P3** | "Avaliação salva." não dizia onde ela foi parar | fechava o ciclo sem indicar o caminho de volta | corrigido: "Ela já aparece em Avaliações salvas." |
| A20 | norma por data | **P3** | nada distinguia Bayley (com prematuridade) de DCDQ (sem) | mesma caixa, expectativas diferentes | corrigido: texto de ajuda condicional |
| A21 | módulo inteiro | **P1** | `/app/corrigefacil` não aparecia na sidebar do PsicoPlanilhas | só se chegava por URL direta, mesmo tendo direito | corrigido: item condicionado ao direito — ver §4 |

**Contagem:** 21 achados — 1 P0, 8 P1, 9 P2, 3 P3. **Todos corrigidos.**

## 3. Correções executadas

**Navegação (A1).** `nav-model.ts` (puro) + `CorrigeFacilNav.tsx` (componente
único) desenham `[ Instrumentos ] [ Avaliações salvas ]` com as pills do
design system — ativa em `pp-ink` sólido, igual ao item ativo da sidebar. A
barra é montada nas quatro telas: catálogo, aplicação, histórico e detalhe.
A aba ativa sai de `abaAtiva()`, que compara por SEGMENTO de caminho: um
`startsWith` marcaria "Avaliações salvas" durante `/avaliar/CES-D`, porque
`avaliar` e `avaliacoes` compartilham prefixo. Nas telas mais fundas (aplicação
e detalhe) a barra convive com o retorno de um nível, que continua existindo.

**Protocolo longo (A2, A6).** `progresso()` conta respondidos sobre total —
contagem de preenchimento, não escore. Acima de 15 itens a área de ação vira
`sticky bottom-0`; abaixo disso continua rodapé comum, porque a página inteira
já cabe na tela e a barra só ocuparia espaço. O limiar não é arbitrário: separa
os 10 instrumentos de protocolo longo (DCDQ 15 … C-TRF 100) dos 6 curtos.

**Acessibilidade (A3, A7, A8, A16).** Alternativas viraram `radiogroup` com
`aria-labelledby` no enunciado; erros ganharam `role="alert"`; o campo
obrigatório do salvamento se declara obrigatório; alvos de toque chegaram a
44px.

**Datas (A5, A20).** `erroOrdemDatas()` compara duas strings `yyyy-mm-dd`, que
são ordenáveis lexicograficamente. Não calcula idade, não escolhe norma, não
duplica o resolver: só impede o envio quando o nascimento é posterior à
avaliação. Entrou em `podeEnviar()` e **não** em `pendencias()`, de propósito —
o contrato de `pendencias()` está travado por teste de regressão da norma por
data e não foi tocado.

**Tela de venda (A4).** O card de comparação saiu. No lugar entrou o histórico,
que é rota real e é o que o comprador usa depois de aplicar.

## 4. A21 — CorrigeFácil na sidebar: decisão revista

**A primeira versão desta auditoria manteve o módulo fora da sidebar apoiada
numa premissa errada** — a de que os 21 instrumentos estariam com
`is_active = false`. Eles estão **ativos**. O estado real de produção
(`wxiyfudloyyxmnaddljx`, leitura em 2026-08-07):

| objeto | estado |
|---|---|
| `public.instruments` | 21 registros, **21 com `is_active = true`** |
| `public.products` slug `corrigefacil` | **`is_active = false`**, `access_url` null, `checkout_url` null |
| `public.assessments` | **3** — há uso real |

Ou seja: o módulo está **funcional** para quem tem direito (admin ou compra
liberada), e três avaliações já foram salvas — mas a única porta de entrada era
digitar a URL. O que está inativo é o **produto comercial**, não o catálogo.

Com os fatos corretos, as três opções:

| opção | efeito | veredito |
|---|---|---|
| A) mostrar para todos | quem não tem direito cai em `CorrigeFacilLocked`, que hoje exibe "Disponibilização em preparação" — sem `checkout_url` não há o que comprar. Item de menu que leva a um beco. | **recusada** |
| B) mostrar só para quem tem direito | quem usa ganha descoberta persistente; quem não tem direito não vê item nenhum | **adotada** |
| C) continuar fora | mantém o problema para quem já usa o módulo em produção | **recusada** |

**Por que B não acopla mal.** O `AppLayout` já resolvia um direito no servidor
para decidir a sidebar (`has_doc_studio_access`); resolver um segundo é o mesmo
padrão, não um novo. A regra não é reescrita: o layout chama
`temAcessoCorrigeFacil`, o mesmo helper das páginas, e a decisão continua em
`has_corrigefacil_access` no banco. As duas resoluções vão em `Promise.all`,
então não somam latência em série. `authenticated` tem EXECUTE na função
(ACL: `postgres | service_role | authenticated`), então a chamada funciona com a
sessão do usuário; `anon` não tem, e continua sem.

**Aparecer no menu não é autorização.** O gate real segue no Server Component de
cada rota (`page.tsx` do catálogo e da aplicação). Esconder o item é cosmético e
é fail-closed: erro na resolução deixa `hasCorrigeFacilAccess = false`.

**Onde ficou.** No grupo "Ferramentas upgrade", ao lado dos outros add-ons
pagos. Os vizinhos aparecem para todos porque têm checkout; quando o
`corrigefacil` tiver o dele, basta remover a condição — está comentado no
código.

O teste 40 do `estrutura.test.ts` foi revisto: ele travava "o AppShell não
conhece o CorrigeFácil", regra escrita quando o módulo não estava operacional.
Agora trava a **condição** — o item não pode aparecer incondicionalmente, o
direito tem de vir do helper único e o caminho de erro tem de ser fail-closed.

## 4b. Decisões deliberadamente não alteradas

**Cálculo no cliente.** Nenhum. Idade, norma, escore, percentil e classificação
continuam no servidor. A única conta nova é `respondidos / total`.

**Enunciados ausentes.** C-TRF, ERA-F, ERA-A, EPQ-J, ETPC e CONFIAS não têm
texto de item no banco — são **seis**, não três. Nada foi completado, importado
ou inventado: a tela passou a se apoiar no número do item, que é como o
profissional acompanha pelo caderno impresso.

**Comparação entre avaliações.** Continua não implementada. Saiu da tela de
venda em vez de ser construída — construí-la não era o escopo.

**Largura das telas.** Aplicação e detalhe seguem em `max-w-3xl`. Medida curta
é o que sustenta a leitura de texto clínico; só o catálogo, que é grade,
ganhou largura.

**Ordenação e filtro por instrumento no histórico.** A ordem vem da Edge
(`completed_at desc`) e foi preservada. Só a busca por texto entrou: um seletor
de instrumento e um controle de ordenação seriam três controles para uma lista
que a busca já resolve.

## 5. Matriz dos 21 instrumentos

Lida do catálogo real em produção (`wxiyfudloyyxmnaddljx`), somente leitura.
Coberta por `__tests__/matriz-21-instrumentos.test.ts`, que passa cada linha
pelo modelo do catálogo e pelo modelo do formulário.

| código | entrada | dim. normativas | dim. escolhidas | data | premat. | itens | s/ enunciado | render | UX | observação |
|---|---|---:|---:|---|---|---:|---:|---|---|---|
| BAYLEY-III | bruto | 1 | 0 | sim | sim | 0 | 0 | OK | OK | dimensão calculada pelas datas; 16 escalas |
| BPA-2 | componentes | 3 | 3 | não | não | 0 | 0 | OK | OK | três selects em cascata |
| C-TRF_1.5-5 | itens | 1 | 1 | não | não | 100 | 100 | OK | OK | maior protocolo; barra fixa |
| CES-D | itens | 0 | 0 | não | não | 20 | 0 | OK | OK | 4 itens invertidos (servidor) |
| CHECK-DIS | itens | 0 | 0 | não | não | 39 | 0 | OK | OK | barra fixa |
| CONFIAS | itens | 1 | 1 | não | não | 70 | 70 | OK | OK | sem enunciado |
| DASS-21 | itens | 0 | 0 | não | não | 21 | 0 | OK | OK | barra fixa |
| DCDQ | itens | 1 | 0 | sim | não | 15 | 0 | OK | OK | idade pelo servidor; sem prematuridade |
| EPQ-J | itens | 1 | 1 | não | não | 60 | 60 | OK | OK | sem enunciado |
| ERA-A | itens | 0 | 0 | não | não | 75 | 75 | OK | OK | sem enunciado |
| ERA-F | itens | 0 | 0 | não | não | 34 | 34 | OK | OK | sem enunciado |
| ETPC | itens | 1 | 1 | não | não | 30 | 30 | OK | OK | sem enunciado |
| PHQ-9 | itens | 0 | 0 | não | não | 9 | 0 | OK | OK | protocolo curto, sem barra fixa |
| QA-ADULTO | itens | 0 | 0 | não | não | 50 | 0 | OK | OK | 4 alternativas, 2 pontos (servidor) |
| SCARED-C | itens | 0 | 0 | não | não | 41 | 0 | OK | OK | 5 escalas + total |
| SDQ-POR | itens | 0 | 0 | não | não | 25 | 0 | OK | OK | — |
| SNAP-IV-18 | itens | 0 | 0 | não | não | 18 | 0 | OK | OK | — |
| SNAP-IV-26 | itens | 0 | 0 | não | não | 26 | 0 | OK | OK | — |
| TDF | bruto | 1 | 1 | não | não | 0 | 0 | OK | OK | select de idade |
| TRACO-ANSIEDADE | itens | 0 | 0 | não | não | 34 | 0 | OK | OK | barra fixa |
| TRILHAS_PRE | bruto | 1 | 1 | não | não | 0 | 0 | OK | OK | 4 subtestes |

ESDM é instrumento técnico (nº 22) e não está no catálogo comercial — o teste
verifica a ausência dele.

Combinações cobertas: os 3 modos de entrada; dimensão escolhida (0, 1 e 3) e
dimensão calculada por data; com e sem data de nascimento; com e sem
prematuridade; com e sem enunciado; de 0 a 100 itens; de 1 a 16 escalas.
Nenhuma das 21 linhas cai fora.

## 6. Evidências de teste

| Verificação | Resultado |
|---|---|
| `npx vitest run` (suíte geral) | **22 arquivos, 346 testes, 0 falhas** (antes: 21 / 275) |
| `npx tsc --noEmit` | **PASS** |
| `npx eslint src/app/app/corrigefacil src/lib/corrigefacil` | **0 problemas** |
| `npx eslint` (repo inteiro) | 118 problemas — **idêntico ao baseline de `main`**, nenhum novo |
| `npx next build` | **PASS**, as 4 rotas do módulo compiladas |

Testes novos: `nav-model.test.ts` (navegação e aba ativa, incluindo a armadilha
`avaliar`/`avaliacoes`), `matriz-21-instrumentos.test.ts` (os 21 pelo catálogo e
pelo formulário), `ux-form.test.ts` (progresso, ordem de datas, texto de
pendência, itens sem enunciado), `filtro-historico.test.ts` (busca).
`estrutura.test.ts` teve o teste 39 evoluído — de "o catálogo tem um link" para
"as quatro telas montam a mesma barra e nenhuma duplica os links".

Regressões conferidas por teste: CES-D, BPA-2, TDF, BAYLEY-III e DCDQ passam na
matriz nos seus modos reais; a ordem das pendências da norma por data continua
travada por `sonar-regression.test.ts`, intocado.

## 7. Pendências reais

1. **Ativação comercial do produto `corrigefacil`.** O produto segue
   `is_active = false`, sem `access_url` e sem `checkout_url`. Enquanto isso,
   ninguém compra o módulo — só admin e direito concedido usam. Quando ativar,
   remover a condição do item de menu (uma linha, comentada no `AppShell`).
2. **Comparação entre aplicações.** Não implementada; saiu da tela de venda até
   que seja.
3. **Sem teste de DOM.** O Vitest deste repositório roda em `node`: as provas de
   interface são de função pura e de leitura do próprio arquivo. Foco, ordem de
   tabulação e contraste foram revisados por leitura de código, não medidos em
   navegador.
4. **Enunciados de seis instrumentos.** Ausentes por decisão anterior. Se algum
   dia forem licenciados, `semEnunciado` já é o ponto único de mudança na tela.
