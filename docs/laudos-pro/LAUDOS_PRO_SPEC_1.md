# LAUDOS PRO — SPEC 1.0

**Produto:** PsicoPlanilhas 2.0  
**Status:** contrato funcional + arquitetura de produto  
**Data:** 18/08/2026  
**Fase:** documentação e organização; **não implementar ainda**

---

## 1. Definição

**Laudos Pro é um ambiente assistido para organizar um caso de avaliação psicológica e construir o laudo psicológico com apoio de IA.**

Ele recebe aquilo que o psicólogo já possui, organiza as informações, identifica lacunas objetivas, estrutura o documento, auxilia na redação, mantém ligação entre fontes e texto, revisa inconsistências, preserva versões e permite finalizar/exportar.

Não é chatbot, prontuário, corretor de testes, gerador automático de diagnóstico ou biblioteca de laudos fictícios.

---

## 2. Regras controladoras

1. **Laudos Pro começa no CASO, não no teste.**
2. **Laudos Pro organiza as fontes registradas pelo psicólogo e auxilia na construção do documento; não substitui a decisão profissional.**
3. **A complexidade pertence ao sistema, não ao psicólogo.**
4. **O novo Laudos Pro nunca pode exigir mais esforço para começar um laudo do que exigia o antigo Assistente Laudos.**

Se uma implementação quebrar qualquer uma delas, está errada mesmo que tecnicamente funcione.

---

## 3. Benchmark de UX

O antigo Assistente Laudos era simples porque conduzia o profissional por etapas. O novo produto deve preservar essa sensação de rapidez e eliminar a fragilidade do fluxo externo.

### Cenário controlador — Bariátrica

```text
+ Novo Laudo
    ↓
Pré-operatório / Bariátrica
    ↓
"Cole o que você já tem"
    ↓
Psicólogo cola as informações
    ↓
Sistema organiza
    ↓
Pergunta apenas o que realmente faltar
    ↓
Construir Laudo
    ↓
Documento estruturado
    ↓
Revisar
    ↓
Finalizar
```

### Meta UX

Se as informações fornecidas permitirem iniciar o documento, do dashboard até a primeira versão devem existir **no máximo 4 decisões principais do usuário**.

Salvamentos automáticos, snapshots e classificações internas não contam como ações do usuário.

---

## 4. Progressive disclosure

A arquitetura é sofisticada; a experiência padrão não deve ser.

### Camada simples — padrão

- Caso
- Informações
- Laudo
- Revisar
- Finalizar

### Camada avançada — sob demanda

- fontes relacionadas;
- origem;
- versões importadas;
- histórico;
- rastreabilidade;
- versões do documento.

**Rastreabilidade existe sempre; administração manual da rastreabilidade não.**

---

## 5. Público

### Disponível

**Psicólogos.**

### Não oferecido na jornada normal

- Psicopedagogos;
- Neuropsicopedagogos;
- demais perfis.

A ausência de oferta é preferível a mensagens do tipo “você não pode comprar”.

### Gate de uso

Servidor deve verificar:

```text
usuário autenticado
+
perfil elegível para Psicologia
+
dados profissionais mínimos
+
acesso Laudos Pro ativo
```

Para emissão documental, exigir ao menos nome profissional e CRP informado. A V0 não deve alegar validação externa do registro se essa validação não existir.

---

## 6. Modelo comercial

**Preço:** R$57 por 12 meses.  
**Pagamento:** único.  
**Franquia:** 20 novos casos assistidos por mês.

Não são 20 seções, prompts, revisões ou PDFs.

> **1 caso assistido = no máximo 1 unidade.**

---

## 7. Consumo

Não consome:

- criar caso;
- preencher/colar manualmente;
- adicionar fontes;
- importar CorrigeFácil;
- editar manualmente;
- abrir;
- imprimir/PDF/copiar.

### Primeiro processamento bem-sucedido por IA

Consome **1 unidade**.

Depois disso, aquele `case_id` nunca consome outra unidade, mesmo que haja refinamentos, revisões, novas seções ou novas versões.

### Invariante

`laudo_usage.case_id` deve ser único.

### Falha

Falha antes de entrega útil: **não consome**.

### Primeiro uso

Mostrar uma única vez:

> Este novo caso utilizará 1 dos seus 20 casos assistidos deste mês. Depois disso, você poderá continuar trabalhando nele sem consumir outra unidade.

---

## 8. Tela inicial

Rota conceitual:

`/app/laudos-pro`

### Com acesso

**Laudos Pro**  
*Organize o caso. Construa o laudo. Revise antes de finalizar.*

CTA: **+ Novo Laudo**

### Meus Laudos

Filtros:

- Em elaboração;
- Em revisão;
- Finalizados;
- Arquivados.

Busca por nome.

Card mostra somente o essencial:

- avaliado;
- finalidade;
- última alteração;
- status.

---

## 9. Tela comercial interna

Para psicólogo elegível sem acesso:

### Laudos Pro

> **Do caso ao laudo, com tudo organizado em um só lugar.**

> Reúna as informações que você já possui, organize o caso e construa seu laudo por etapas com apoio de IA.

**20 novos casos assistidos/mês · 12 meses · R$57**

CTA: **Liberar Laudos Pro**

---

## 10. Novo Laudo — contexto

Rota conceitual:

`/app/laudos-pro/novo`

Pergunta inicial:

# Para qual contexto você está preparando este laudo?

Mostrar grupos, não 26 cards simultâneos:

- Clínica;
- Neuropsicológica;
- Infantil / desenvolvimento;
- Escolar / educacional;
- Pré-operatória / cirúrgica;
- Ocupacional / seleção;
- Outra finalidade.

Também permitir **Começar em branco**.

---

## 11. Catálogo de estruturas

Arquitetura suporta **até 26 estruturas orientadoras**.

A SPEC 1 congela o motor, não o conteúdo das 26 estruturas.

Cada estrutura terá conceitualmente:

```text
slug
nome
grupo
versão
descrição curta
campos orientadores
seções
perguntas contextuais
regras de revisão
status
base normativa/documental
updated_at
```

### Estrutura orientadora não contém

- diagnóstico pronto;
- conclusão pronta;
- hipótese pronta;
- lista obrigatória de testes;
- prescrição automática de instrumentos.

### Snapshot

Ao criar o caso, a versão da estrutura é congelada naquele caso. Atualizar o catálogo não altera casos anteriores silenciosamente.

---

## 12. Entrada principal — “Cole o que você já tem”

Esta é a tela mais importante da UX.

Título:

# Conte o que você já tem sobre este caso

Subtexto:

> **Pode colar tudo junto. O Laudos Pro organiza para você.**

O profissional pode inserir, no mesmo campo:

- anamnese;
- entrevista;
- observações;
- histórico;
- procedimentos;
- resultados;
- hipóteses;
- análise profissional;
- orientações;
- informações fornecidas por terceiros.

Abaixo:

**Adicionar resultado do CorrigeFácil**

### V0

Texto + integração CorrigeFácil.

Arquivos complexos ficam fora da V0 até que fluxo de privacidade, leitura e validação esteja maduro.

---

## 13. Regra UX fundamental

A entrada padrão **não** será um formulário longo com dezenas de campos.

O sistema não deve exigir que o profissional cadastre manualmente fonte por fonte se puder organizar o material com segurança.

> **O psicólogo entrega informação; o Laudos Pro faz o trabalho de organizá-la.**

---

## 14. Intake bruto

O conteúdo original fornecido é preservado de forma imutável.

Conceito:

`laudo_intakes`

Exemplo:

```text
INTAKE #1
texto original fornecido pelo psicólogo
18/08/2026 12:30
```

Nunca substituir silenciosamente o intake original por texto reorganizado.

---

## 15. Organizador de caso

Primeiro contrato de IA.

Ele **não escreve o laudo**.

Transforma material misturado em estrutura:

```text
identificação
demanda
entrevista/anamnese
procedimentos
observações
instrumentos/resultados
análise profissional
informações complementares
```

### Não pode

- inventar;
- completar lacuna por inferência;
- interpretar teste por conta própria;
- diagnosticar;
- converter suspeita em fato;
- alterar escore;
- criar referência.

### Saída estruturada

Conceitualmente:

```json
{
  "identified_case_data": [],
  "proposed_sources": [],
  "missing_critical": [],
  "uncertainties": []
}
```

Saída passa por schema de validação antes de persistir estrutura derivada.

---

## 16. Confirmação simples

Após organização:

### Organizei as informações do caso

- Identificação ✓
- Demanda ✓
- Anamnese / entrevista ✓
- Procedimentos ✓
- Resultados informados ✓
- Observações ✓

Se tudo estiver organizado para iniciar o documento:

**Construir Laudo**

Não exigir abertura item por item.

### Se houver dúvida material

> **Preciso confirmar duas informações antes de continuar.**

Perguntar apenas essas informações.

### Regra

Máximo ideal: **3 perguntas obrigatórias por tela**.

Ausências opcionais não devem virar interrogatório.

---

## 17. Organização não é suficiência clínica

Nunca mostrar:

- “94% completo”;
- “material suficiente”;
- “caso pronto para diagnóstico”.

Pode mostrar apenas organização factual:

- Demanda registrada ✓
- Anamnese adicionada ✓
- 3 procedimentos ✓
- 4 fontes ✓
- Conclusão profissional ○

---

## 18. Fontes

Tipos conceituais iniciais:

```text
professional_information
anamnesis_interview
observation
procedure
external_instrument_result
corrigefacil_result
professional_analysis
reference_document
other
```

O usuário não precisa escolher enum a cada ação. O organizador propõe; o profissional pode corrigir.

---

## 19. Duas classificações internas

### A. Proveniência

```text
manual
intake
corrigefacil
external
derived
```

### B. Papel profissional

```text
fundamental
complementary
reference
unclassified
```

A segunda classificação é avançada e não deve virar formulário obrigatório.

O sistema não deve confundir classificação interna com certificação de adequação profissional de um instrumento ao caso.

---

## 20. CorrigeFácil → Laudos Pro

Dentro de avaliação salva, para psicólogo:

**Adicionar a um Laudo Pro**

Opções:

- Novo caso;
- Caso existente.

Importar snapshot de dados persistidos pertinentes, como:

- instrumento;
- data;
- escores;
- classificações;
- resultados estruturados.

### Regra absoluta

**Laudos Pro não recalcula resultados do CorrigeFácil.**

Importar um resultado significa somente que o psicólogo adicionou esse resultado ao caso; não significa que o sistema certificou sua adequação à avaliação.

---

## 21. Snapshot de fonte importada

Exemplo:

```text
FDT
Origem: CorrigeFácil
Importado: 18/08/2026 12:40
Versão: 1
```

Se a origem mudar depois:

> **Há uma versão mais recente deste resultado.**

Ações:

- Ver alteração;
- Atualizar.

Atualização cria nova versão; não sobrescreve a antiga.

---

## 22. Relatórios Pro

Relatórios Pro é produto independente.

Quando integrado:

**Adicionar como documento de referência**

Deve ser identificado como **material derivado**.

Se a fonte original estiver disponível, favorecer a fonte original.

Evitar arquitetura:

```text
resultado → IA → relatório → IA → laudo
```

---

## 23. Construir Laudo — uma ação

A arquitetura é por seções, mas o usuário não precisa gerar seis seções manualmente.

CTA principal:

# Construir Laudo

O backend orquestra a criação inicial das seções.

Cada seção continua independente, editável, versionável e rastreável.

---

## 24. Estrutura-base do laudo

1. Identificação;
2. Descrição da demanda;
3. Procedimento;
4. Análise;
5. Conclusão;
6. Referências.

Estruturas orientadoras podem adaptar campos e perguntas sem transformar-se em protocolo automático de avaliação.

---

## 25. Tela do caso

Rota conceitual:

`/app/laudos-pro/casos/[caseId]`

Desktop:

```text
┌──────── INFORMAÇÕES ────────┐  ┌──────────── LAUDO ───────────┐
│ Anamnese                     │  │ Identificação                │
│ Entrevista                   │  │ Descrição da demanda         │
│ Observação                   │  │ Procedimentos                │
│ FDT                          │  │ Análise                      │
│ ...                          │  │ Conclusão                    │
│ + Adicionar                  │  │ Referências                  │
└──────────────────────────────┘  └──────────────────────────────┘
```

A coluna de informações pode começar recolhida; o foco visual inicial é o documento.

### Mobile

Alternância simples:

`Laudo` | `Informações`

---

## 26. Edição e ações por seção

Ações:

- Editar;
- Melhorar redação;
- Mais objetiva;
- Mais técnica;
- Reduzir repetições;
- Reorganizar;
- Nova versão.

Edição manual não consome nova unidade.

---

## 27. IA por nível

### Nível 1 — Organização

Identificação e procedimentos. Baixa liberdade.

### Nível 2 — Estruturação

Descrição da demanda. Organiza conteúdo existente.

### Nível 3 — Elaboração assistida

Análise. Pode desenvolver texto usando somente fontes autorizadas daquele caso.

### Nível 4 — Conclusão protegida

A IA não cria conclusão clínica do zero apenas olhando dados.

Se faltar orientação profissional, perguntar de forma simples:

> **Em poucas palavras, qual é sua conclusão profissional sobre este caso?**

> Pode escrever em 1–3 frases. Eu organizo a redação.

---

## 28. Diagnóstico

A IA não cria diagnóstico por conta própria.

O produto também não deve impedir o psicólogo de registrar hipótese, diagnóstico, prognóstico, encaminhamento ou conclusão profissional quando pertinente.

Se o psicólogo forneceu explicitamente sua decisão profissional, a IA pode ajudá-lo a organizar e redigir aquilo que foi informado.

Nunca converter automaticamente resultado X em diagnóstico Y.

---

## 29. DSM/CID

Não usar DSM/CID como gerador automático de interpretação.

Podem entrar quando:

- o psicólogo os utilizar explicitamente;
- forem pertinentes ao conteúdo fornecido;
- houver informação profissional correspondente.

---

## 30. Referências

A IA **nunca inventa referência bibliográfica**.

Pode:

- organizar referência fornecida;
- formatar referência existente;
- futuramente usar biblioteca interna previamente verificada.

Não pode criar autor, obra, edição ou norma plausível por conta própria.

---

## 31. Contratos de prompt

Não usar um prompt gigante único.

Previstos:

- **P1 ORGANIZER** — organiza intake;
- **P2 SECTION BUILDER** — constrói seção com fontes autorizadas;
- **P3 REFINER** — altera somente seção solicitada;
- **P4 REVIEWER** — procura inconsistências sem decidir clinicamente.

Conclusão possui comportamento protegido próprio.

O prompt literal será definido em documento separado: `LAUDOS_PRO_PROMPT_CONTRACT_V1.md`.

---

## 32. Regra absoluta de contexto

> **Fonte fora do caso não entra.**

E:

> **Fonte não selecionada para determinada geração não entra naquela geração.**

Nunca enviar automaticamente todo o histórico do usuário à IA.

---

## 33. Rastreabilidade

### Fontes relacionadas

Aquilo que o profissional relacionou à seção.

### Fontes usadas pela IA

Exatamente as versões de fonte enviadas à geração daquela versão do texto.

São conceitos diferentes e devem permanecer diferentes no domínio.

---

## 34. Registro de geração

Conceitualmente registrar:

```text
case_id
section_id
action
prompt_version
model
source_version_ids
input_hash
output
created_at
usage metadata
```

A UX principal não precisa mostrar isso, mas o produto deve conseguir responder:

> **Em que essa geração estava baseada?**

---

## 35. Revisor — duas camadas

### A. Checklist estrutural determinístico

Verifica presença/estrutura objetiva, como:

- identificação;
- demanda;
- procedimento;
- análise;
- conclusão;
- referências;
- identificação profissional.

### B. Revisor de consistência assistido

Procura pontos para verificar:

- nome divergente;
- idade divergente;
- datas incompatíveis;
- valor diferente da fonte;
- instrumento citado sem fonte;
- contradição textual;
- repetição;
- trecho sem origem identificável;
- fonte atualizada ainda não incorporada.

---

## 36. Bloqueio x alerta

### Bloqueio

Falha objetiva que impede finalização, por exemplo ausência de identificação profissional necessária.

### Alerta

Questão que requer julgamento profissional, por exemplo trecho sem fonte relacionada.

Ações:

- Revisar;
- Manter.

Nunca dizer “seu laudo está errado” ou atribuir nota de qualidade clínica.

---

## 37. Finalização

CTA:

**Revisar e finalizar**

Confirmação:

> **Revisei este documento e confirmo que as informações, análises e conclusões foram avaliadas por mim.**

Depois:

**Finalizar versão**

---

## 38. Finalização não é assinatura

Finalizar no Laudos Pro significa criar uma versão imutável do conteúdo.

Não significa assinatura eletrônica realizada pelo sistema.

V0 prepara documento com identificação profissional, CRP informado, local/data e área destinada à assinatura.

Assinatura digital fica fora da V0.

---

## 39. Documento em elaboração

Se exportar/imprimir antes de finalizar, o documento deve ser identificado discretamente como:

**EM ELABORAÇÃO**

Depois de finalizado, versão limpa.

Não usar “rascunho” como posicionamento comercial.

---

## 40. Versionamento

```text
Versão 1 — Finalizada
```

Não edita diretamente.

Para alterar:

**Criar nova versão**

```text
V1 Finalizada
    ↓
V2 Em elaboração
```

V1 permanece intacta.

---

## 41. Arquitetura de dados

Laudos Pro possui domínio próprio e **não deve ser tratado como extensão de `ai_reports`**.

Modelo conceitual:

```text
laudo_cases
laudo_intakes
laudo_sources
laudo_source_versions
laudo_sections
laudo_section_sources
laudo_generations
laudo_generation_sources
laudo_document_versions
laudo_usage
laudo_review_items
```

---

## 42. Entidades principais

### `laudo_cases`

Identidade e estado do caso.

Campos conceituais:

```text
id
user_id
subject_name
subject_birth_date
context_slug
structure_slug
structure_snapshot
status
first_ai_used_at
created_at
updated_at
archived_at
```

Status:

`draft | review | finalized | archived`

### `laudo_intakes`

Preserva texto original informado.

### `laudo_sources`

Entidade lógica da fonte.

### `laudo_source_versions`

Snapshots imutáveis por versão.

### `laudo_sections`

Conteúdo atual das seções.

### `laudo_section_sources`

Relação profissional seção ↔ fonte.

### `laudo_generations`

Auditoria das ações assistidas.

### `laudo_generation_sources`

Versões exatas de fonte entregues à IA.

### `laudo_document_versions`

Snapshots finais imutáveis.

### `laudo_usage`

Reserva/consumo idempotente por caso.

### `laudo_review_items`

Itens de revisão e seus estados.

---

## 43. Uso idempotente

Fluxo conceitual:

```text
VALIDA
↓
RESERVA
↓
IA
↓
SUCESSO
↓
CONSOME
```

Se falhar:

`RELEASE`

Um mesmo caso nunca pode consumir mais de uma unidade.

---

## 44. RLS e ownership

Desde a primeira migration futura.

Regra base:

`auth.uid() = user_id`

ou posse derivada de `case_id`.

Nenhum usuário pode acessar caso, intake, fonte, seção, geração ou versão de outro usuário.

Cross-user tests são obrigatórios antes do lançamento.

---

## 45. Dados sensíveis

Princípios:

- não colocar conteúdo clínico integral em logs;
- não enviar nomes/conteúdo para analytics comuns;
- service role somente server-side;
- minimizar contexto enviado à IA;
- ownership em todas as operações;
- revisar política de privacidade/tratamento antes da produção.

---

## 46. Guarda, arquivamento e exclusão

A ação normal do produto será:

**Arquivar caso**

Não criar botão casual de exclusão definitiva.

Antes de produção deve existir política explícita para:

- retenção;
- exclusão;
- encerramento de conta;
- backups;
- solicitações relacionadas a dados;
- obrigações profissionais aplicáveis.

---

## 47. Expiração dos 12 meses

Sem renovação, usuário continua podendo:

- abrir casos existentes;
- abrir versões finalizadas;
- copiar;
- imprimir;
- salvar PDF.

Bloqueia:

- novo caso assistido;
- edição;
- adicionar fontes;
- nova versão;
- IA;
- revisor assistido.

> **Documentos não são sequestrados. A ferramenta de trabalho expira.**

Renovou: edição volta.

---

## 48. Entitlement próprio

Não compartilhar contador com Relatórios Pro.

Estado conceitual:

```text
has_active_laudos_pro
laudos_pro_expires_at
```

Produto conceitual:

```text
slug: laudos-pro
audience: psychologist
price: 57
access_duration: 12 months
```

Reaproveitar infraestrutura comercial existente quando apropriado, sem refatorar o ecossistema inteiro apenas para este produto.

---

## 49. OpenAI

Reutilizar infraestrutura server-side existente de chamada ao modelo quando apropriado.

Não reutilizar o prompt universal do Relatórios Pro como “modo laudo”.

Laudos Pro terá contratos próprios de prompt e domínio próprio.

---

## 50. Rotas conceituais V0

Frontend:

```text
/app/laudos-pro
/app/laudos-pro/novo
/app/laudos-pro/casos/[caseId]
/app/laudos-pro/casos/[caseId]/versoes/[versionId]
```

API conceitual:

```text
POST /api/laudos/cases
GET  /api/laudos/cases
GET  /api/laudos/cases/[id]
PATCH /api/laudos/cases/[id]
POST /api/laudos/cases/[id]/organize
POST /api/laudos/cases/[id]/sources
POST /api/laudos/cases/[id]/sources/corrigefacil
POST /api/laudos/cases/[id]/sources/[sourceId]/refresh
POST /api/laudos/cases/[id]/build
POST /api/laudos/cases/[id]/sections/[sectionId]/generate
POST /api/laudos/cases/[id]/sections/[sectionId]/refine
POST /api/laudos/cases/[id]/review
POST /api/laudos/cases/[id]/finalize
POST /api/laudos/cases/[id]/new-version
```

Servidor decide ownership, entitlement, profissão, quota e fontes autorizadas.

---

## 51. Assistente Laudos legado

O Assistente Laudos antigo é legado externo.

### Regra de transição

Não remover antes de o Laudos Pro estar funcional e validado.

Depois:

- remover comunicação do GPT externo;
- redirecionar `/app/assistente-laudos` para `/app/laudos-pro`;
- remover URL externa;
- não inventar migração de histórico que o sistema antigo não armazenava localmente.

---

## 52. Fora da V0

Não desenvolver agora:

- Google Docs;
- colaboração entre profissionais;
- prontuário;
- agenda;
- assinatura digital;
- OCR complexo;
- leitura automática de grandes conjuntos de PDFs;
- marketplace;
- protocolo automático de testes;
- recomendação automática de instrumentos;
- biblioteca diagnóstica autônoma;
- aplicativo mobile próprio;
- equipe multiusuário;
- automações externas.

---

## 53. QA obrigatório

### Q1 — Bariátrica sem CorrigeFácil

Cola informações → organiza → pergunta só lacunas → constrói.

**PASS:** produto funciona sem CorrigeFácil.

### Q2 — CorrigeFácil

Importa resultado → snapshot → laudo.

**PASS:** não recalcula.

### Q3 — Fonte mudou

Origem muda depois.

**PASS:** caso não atualiza silenciosamente.

### Q4 — Duplo clique

Primeira IA recebe requests concorrentes.

**PASS:** um consumo.

### Q5 — Falha IA

**PASS:** zero consumo.

### Q6 — Muitas melhorias

Vários refinamentos no mesmo caso.

**PASS:** continua uma unidade.

### Q7 — Conclusão sem orientação profissional

**PASS:** pede orientação curta; não inventa conclusão clínica.

### Q8 — Psicopedagogo

**PASS:** não vê oferta normal e não usa via URL direta.

### Q9 — Cross-user

Usuário A tenta `case_id` de B.

**PASS:** sem acesso e sem vazamento de existência/conteúdo.

### Q10 — Expiração

**PASS:** documento segue legível/exportável; edição/IA bloqueadas.

### Q11 — Finalizado

**PASS:** V1 imutável.

### Q12 — Nova versão

**PASS:** V2 não destrói V1.

---

## 54. Critério UX de lançamento

Falha QA se:

- bariátrica exigir formulário longo;
- usuário precisar cadastrar fonte por fonte;
- usuário precisar classificar tecnicamente tudo;
- usuário precisar gerar cada seção separadamente;
- snapshot exigir confirmação constante;
- rastreabilidade dominar a tela;
- usuário repetir dados profissionais que o sistema já conhece;
- produto parecer mais trabalhoso que o antigo GPT.

---

## 55. Critério técnico de lançamento

Não lançar sem:

### Acesso

- gate psicólogo;
- entitlement;
- expiração.

### Dados

- domínio próprio;
- RLS;
- snapshots;
- versões.

### IA

- organizer validado;
- fonte limitada ao caso;
- conclusão protegida;
- referências não inventadas;
- quota idempotente.

### UX

- fluxo rápido;
- Build Laudo em uma ação;
- editor simples.

### Documento

- estrutura;
- revisão;
- finalização;
- PDF/impressão;
- versão imutável.

### Privacidade

- isolamento entre usuários;
- logs limpos;
- política de retenção definida.

---

## 56. Ordem futura de implementação

Não executar nesta fase.

Quando o desenvolvimento começar:

1. **Bloco 0 — Fundação:** banco, entitlement, profissão, RLS.
2. **Bloco 1 — Caso + intake:** novo caso + “Cole o que você já tem”.
3. **Bloco 2 — Organizador:** intake → informação estruturada.
4. **Bloco 3 — Documento:** seções + edição + Construir Laudo.
5. **Bloco 4 — IA controlada:** builder + refinamentos + conclusão protegida.
6. **Bloco 5 — CorrigeFácil:** import + snapshot + atualização explícita.
7. **Bloco 6 — Rastreabilidade:** relacionadas × usadas pela IA.
8. **Bloco 7 — Revisor:** checklist + consistência.
9. **Bloco 8 — Versão final:** finalização + V1/V2 + A4/PDF.
10. **Bloco 9 — Comercial:** checkout + 20/mês + expiração.
11. **Bloco 10 — Transição:** desativar Assistente Laudos legado.

---

## 57. Congelado nesta SPEC

### Produto

- nome Laudos Pro;
- exclusivo para psicólogos;
- R$57 por 12 meses;
- 20 novos casos assistidos/mês;
- 1 caso consome no máximo 1 unidade.

### UX

- começar pela finalidade;
- “Cole o que você já tem”;
- organizar automaticamente;
- perguntar somente lacunas;
- máximo ideal de 3 perguntas obrigatórias por tela;
- construir documento inicial em uma ação;
- complexidade por progressive disclosure.

### Domínio

- caso;
- intake;
- fontes;
- snapshots;
- seções;
- gerações;
- versões;
- uso próprio.

### IA

- não inventa;
- não recalcula;
- não prescreve testes;
- não cria diagnóstico;
- pode organizar decisão profissional informada;
- não inventa referências;
- conclusão protegida.

### Ecossistema

- funciona sozinho;
- CorrigeFácil opcional;
- Relatórios Pro independente;
- contadores independentes.

### Documento

- revisão;
- finalização;
- versão imutável;
- nova versão;
- leitura/exportação após vencimento.

---

## 58. Não congelado ainda

### A. Conteúdo das até 26 estruturas

Próximo documento:

`LAUDOS_PRO_CATALOGO_ESTRUTURAS_V1.md`

### B. Prompts literais

Próximo documento técnico de IA:

`LAUDOS_PRO_PROMPT_CONTRACT_V1.md`

### C. Plano executor

Somente depois dos dois documentos acima:

`LAUDOS_PRO_IMPLEMENTATION_PLAN_V1.md`

---

# VEREDITO

**SPEC 1.0 — CONGELADA COMO DIREÇÃO FUNCIONAL E ARQUITETURAL DO PRODUTO.**

A combinação controladora é:

> **Por dentro: rastreável, estruturado, versionado e seguro.**

> **Por fora: “cole o que você tem e eu organizo”.**

Regra para qualquer implementação futura:

> **Se houver escolha entre expor complexidade técnica ao psicólogo ou absorvê-la no sistema, o sistema deve absorvê-la.**
