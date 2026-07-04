# PsicoPlanilhas Doc Studio - Spec de Refatoracao Segura v1.5

Status: spec executavel corrigida apos auditoria Opus
Projeto: Psico2 / PsicoPlanilhas 2.0
Repo GitHub: https://github.com/Aleporto73/psico2
Pasta local Windows: C:\Users\evera\Projetos\psico2
Produto: PsicoPlanilhas Doc Studio
Base conceitual: Spec Executavel v1.3
Base tecnica de referencia: branch feature/doc-studio-lab

---

## 0. Aviso De Separacao

Este arquivo e uma SPEC DE EXECUCAO.

Ele NAO contem prompt de auditoria.

Se voce recebeu instrucoes de "auditar" junto com este texto, PARE e peca para separar os dois.

Executar e auditar sao tarefas distintas.

---

## 1. Contexto Critico

O projeto Psico2 esta em producao, com clientes reais.

A branch `main` e producao.

Regra absoluta:

```txt
NUNCA mexer na main sem autorizacao literal do usuario:
"pode colocar na main"
```

Proibido nesta fase:

```txt
merge
deploy
abrir PR
git add
git commit
git push
mexer em banco
mexer em Supabase
mexer em migrations
mexer em pagamento
mexer em checkout
mexer em Asaas
mexer em webhook
mexer em login
mexer em clientes
mexer em admin
mexer em compras
mexer em scripts/
```

A pasta local `scripts/` esta untracked e nao deve ser tocada.

Silencio nao e autorizacao.

---

## 2. Erro Anterior Que Nao Pode Se Repetir

O Doc Studio ja foi colocado na main por engano via merge do PR #21.

Depois foi feito revert seguro na main:

```txt
7d4d6aa Revert "Merge pull request #21 from Aleporto73/feature/doc-studio-lab"
```

Estado esperado da main:

```txt
branch: main
ultimo commit: 7d4d6aa
status: ## main...origin/main
untracked local: ?? scripts/
```

Regra operacional:

```txt
"Create pull request" NAO e merge.
"Merge pull request" COLOCA NA MAIN.
Se o usuario nao disser literalmente "pode colocar na main", NAO orientar merge.
```

---

## 3. Estrategia Segura De Branch

A branch antiga:

```txt
feature/doc-studio-lab
```

deve ser tratada apenas como:

```txt
referencia tecnica e visual
laboratorio antigo
material bruto
```

Ela NAO deve ser usada para merge direto.

Ela NAO deve ser usada com cherry-pick.

Reaproveitar codigo da branch antiga deve ser feito somente por copia seletiva de conteudo.

Para criar a branch nova, use exatamente:

```powershell
Set-Location C:\Users\evera\Projetos\psico2
git fetch origin
git switch -c feature/doc-studio-refactor-lab origin/main
```

Nesta fase, NUNCA rode:

```txt
git checkout main
git switch main
git merge
git cherry-pick
git pull
git push
gh pr create
```

Branch nova sugerida:

```txt
feature/doc-studio-refactor-lab
```

---

## 4. Objetivo Da v1.5

Refatorar o Doc Studio para transformar o laboratorio atual em uma fundacao limpa, escalavel e segura.

O objetivo NAO e reduzir a ambicao do produto.

O objetivo e:

```txt
manter muitos modelos
manter busca
manter personalizacao visual
preparar IA revisora
preparar regras por linha profissional
reduzir acoplamento
reduzir duplicacao
baixar risco Sonar
deixar page.tsx pequeno e legivel
```

Principio central:

```txt
Muitos recursos por baixo.
Poucas decisoes por vez na tela.
```

---

## 5. Produto-Alvo

O Doc Studio sera um studio guiado para profissionais criarem documentos, formularios e folhas profissionais com:

```txt
cabecalho profissional vindo de Minha Conta
assinatura profissional em texto
catalogo de modelos
busca por modelo
filtros simples
preview premium
impressao bonita
copia de texto profissional
rascunho local
IA revisora segura em etapa futura
```

Regra de produto:

```txt
O sistema estrutura.
A IA revisa.
O profissional decide.
```

O Doc Studio nao deve virar:

```txt
Canva interno
Google Docs com outro nome
gerador automatico de laudo
editor livre com arrastar e soltar
produto que promete diagnostico
```

---

## 6. Linhas Profissionais

Nao usar a divisao:

```txt
Educacional x Clinica
```

Usar:

```txt
Psicopedagogia / Neuropsicopedagogia
Psicologia / Neuropsicologia
```

Motivo:

```txt
psicopedagogia tambem pode atuar em contexto clinico
neuropsicopedagogia tambem pode atuar em contexto clinico
a divisao correta do produto e por linha profissional, nao por "clinico vs educacional"
```

---

## 7. Fundacao Existente No Psico2

O Doc Studio deve reaproveitar dados existentes.

Campos de perfil:

```txt
profile_type
display_name
gender
profession_category
credential_type
credential_number
```

Regras:

```txt
profile_type ordena e segmenta a experiencia
profile_type nao define o cabecalho do documento
cabecalho vem dos dados profissionais da Minha Conta
nao criar cadastro duplicado de cabecalho
assinatura e texto, nao imagem
nao implementar upload de logo ou assinatura nesta fase
```

Valores esperados de `profession_category`, conforme Minha Conta:

```txt
psicologo
psicopedagogo
neuropsicopedagogo
fonoaudiologo
terapeuta_ocupacional
medico
pediatra
outro
```

Nao inventar enum paralelo para profissao.

Saida esperada:

```txt
Nome profissional
Profissao flexionada · Sigla numero
```

Exemplo:

```txt
Clinica Aprender Mais
Neuropsicopedagoga · CBO 2394-40
```

---

## 8. Problema Tecnico Atual

Na branch `feature/doc-studio-lab`, o laboratorio esta funcional, mas nasceu grande demais:

```txt
src/app/app/doc-studio/page.tsx = 1370 linhas
src/app/app/layout.tsx = alterado para menu compacto do Doc Studio
templates, tipos, helpers, estado e UI estao misturados
```

Riscos:

```txt
duplicacao no Sonar
manutencao dificil
componentes pouco testaveis
catalogo dificil de expandir
IA futura ficaria acoplada na tela
```

Decisao:

```txt
nao descartar o laboratorio
nao levar cru para producao
refatorar em branch nova
```

---

## 9. Arquitetura-Alvo

Estrutura sugerida:

```txt
src/app/app/doc-studio/
  page.tsx
  types.ts
  templates.ts
  template-catalog.ts
  ai-rules.ts
  lib/
    profile.ts
    copy.ts
    storage.ts
    format.ts
  hooks/
    useDocStudioState.ts
  components/
    DocStudioShell.tsx
    DocStudioCatalog.tsx
    DocStudioFields.tsx
    DocStudioPreview.tsx
    DocStudioAppearance.tsx
    DocStudioHeaderStatus.tsx
  __tests__/
    copy.test.ts
    storage.test.ts
    profile.test.ts
```

Fronteira dos arquivos:

```txt
types.ts = tipos e enums do Doc Studio
templates.ts = dados dos modelos
template-catalog.ts = busca, filtro, ordenacao e indice sobre templates.ts
ai-rules.ts = regras futuras de IA como dados, sem chamada de API
lib/profile.ts = cabecalho e assinatura a partir do perfil
lib/copy.ts = composicao de texto para copia
lib/storage.ts = rascunho local versionado
lib/format.ts = normalizacao de busca, acentos, caixa e helpers puros
hooks/useDocStudioState.ts = estado e efeitos da tela
components/* = UI pequena e nomeada
page.tsx = apenas orquestracao
```

Meta tecnica:

```txt
page.tsx abaixo de 250-350 linhas, se possivel
templates separados da UI
helpers puros separados
estado extraido para hook
copy/print/storage separados
componentes pequenos e nomeados
```

---

## 10. Layout Global

Regra desta refatoracao:

```txt
NAO alterar src/app/app/layout.tsx.
```

A casca compacta do Doc Studio deve ser renderizada dentro da propria rota.

Se isso for impossivel, PARE e peca autorizacao antes de tocar em qualquer arquivo de layout global.

Motivo:

```txt
layout global aumenta risco em producao
Doc Studio ainda e laboratorio
alteracao visual global deve ser evitada nesta fase
```

---

## 11. Catalogo De Modelos

A ambicao e ter muitos modelos.

Isso deve ser tratado como catalogo estruturado, nao como lista solta dentro da pagina.

Schema minimo:

```ts
type DocStudioLine = 'psychopedagogy' | 'psychology';

type DocStudioDocumentKind =
  | 'formal_document'
  | 'structured_form'
  | 'record'
  | 'referral'
  | 'family_orientation'
  | 'school_orientation'
  | 'psychological_report';

type DocStudioTemplateStatus = 'active' | 'hidden';

type DocStudioTemplate = {
  id: string;
  schemaVersion: number;
  status: DocStudioTemplateStatus;
  line: DocStudioLine;
  title: string;
  category: string;
  description: string;
  documentKind: DocStudioDocumentKind;
  searchTerms: string[];
  recommendedForProfileTypes: Array<'psychologist' | 'psychopedagogue' | 'both' | 'unknown'>;
  allowedProfessionCategories: string[];
  riskLevel: 'low' | 'medium' | 'restricted';
  requiresHeader: boolean;
  fields: DocStudioField[];
  sections: DocStudioSection[];
  ethicalFooter?: string;
  aiRulesProfile: 'psychopedagogy_safe' | 'psychology_cfp_06_2019' | 'general_safe';
};
```

Campos:

```ts
type DocStudioField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
};
```

Secoes:

```ts
type DocStudioSection = {
  id: string;
  title: string;
  body: string;
  sourceField?: string;
  requiredForDocumentKind?: boolean;
  showWhen?: {
    field: string;
    equals: string;
  };
};
```

---

## 12. Busca E Filtros

Como o catalogo sera grande, a tela precisa ter busca.

Obrigatorio:

```txt
busca por titulo
busca por categoria
busca por termos comuns
busca sem acento
busca sem diferenciar maiuscula/minuscula
filtro por linha profissional
filtro por tipo de documento
modelos recomendados primeiro
```

Desejavel depois:

```txt
recentes
favoritos
mais usados
```

Regra de UX:

```txt
catalogo grande pode existir
a usuaria nao pode sentir que precisa entender tudo de uma vez
```

---

## 13. Aparencia

Nao remover personalizacao visual.

Manter:

```txt
cor principal
fonte
densidade
modo preto e branco
mostrar cabecalho
mostrar assinatura
```

Regra:

```txt
as opcoes devem existir, mas nao dominar a tela
```

Sugestao de UI:

```txt
aparencia fica em painel compacto
padrao vem pronto
usuario muda apenas se quiser
```

---

## 14. IA Revisora

Nao implementar IA real nesta refatoracao.

Mas preparar a arquitetura.

Conceito:

```txt
a IA nao cria documento do zero
a IA revisa texto preenchido pelo profissional
a IA transforma linguagem bruta em linguagem profissional
o profissional revisa antes de usar
```

Arquivo:

```txt
ai-rules.ts
```

Deve conter regras como dados:

```ts
type AiRuleProfile = {
  id: 'psychopedagogy_safe' | 'psychology_cfp_06_2019' | 'general_safe';
  allowedOperations: string[];
  forbiddenOperations: string[];
  requiredDisclaimer: string;
  toneRules: string[];
};
```

Trava obrigatoria:

```txt
A IA revisa REGISTRO e TOM de texto ja escrito pelo profissional.
A IA NUNCA: cria documento do zero, preenche o documento final sozinha,
emite diagnostico, cita CID/DSM, conclui hipotese clinica, nem substitui
o julgamento profissional. Toda saida exige aceite humano explicito.
```

Exemplo de entrada:

```txt
menino nao presta atencao, fica olhando para o lado
```

Saida psicopedagogica esperada:

```txt
Durante a atividade, observou-se oscilacao na manutencao da atencao, com desvios frequentes do foco visual e necessidade de retomadas para continuidade da tarefa.
```

Saida psicologica esperada:

```txt
Observou-se variacao atencional durante a situacao descrita, com deslocamentos frequentes do foco visual. A informacao deve ser compreendida de forma contextualizada, sem finalidade diagnostica isolada.
```

---

## 15. Regras De IA Por Linha

### Psicopedagogia / Neuropsicopedagogia

Tom:

```txt
funcional
acolhedor
orientativo
descritivo
focado em aprendizagem, apoio, familia e escola
```

Evitar:

```txt
diagnostico fechado
patologizacao
afirmacoes clinicas fortes
inferencias sem dado
```

### Psicologia / Neuropsicologia

Tom:

```txt
tecnico
descritivo
cauteloso
alinhado a documentos psicologicos
sem extrapolar dado observado
```

Para documentos psicologicos, considerar a Resolucao CFP n. 06/2019 como referencia normativa principal:

```txt
https://site.cfp.org.br/wp-content/uploads/2019/09/Resolu%C3%A7%C3%A3o-CFP-n-06-2019-comentada.pdf
```

Pontos estruturais importantes:

```txt
documento psicologico e comunicacao escrita decorrente do exercicio profissional
deve seguir principios eticos, tecnicos e de linguagem
relatorio psicologico e descritivo e circunstanciado
relatorio psicologico nao tem finalidade de produzir diagnostico psicologico
relatorio psicologico possui estrutura propria quando aplicavel:
identificacao
descricao da demanda
procedimento
analise
conclusao
```

---

## 16. Modalidade Documental E Trava CFP

O catalogo deve diferenciar documentos por tipo.

Exemplos:

```txt
devolutiva
relatorio psicologico
relatorio psicopedagogico
registro de sessao
encaminhamento
orientacao para familia
orientacao para escola
ficha de observacao
formulario
folha estruturada
```

Trava obrigatoria:

```txt
Na linha Psicologia, um template so pode se chamar "relatorio psicologico"
se contiver as secoes do CFP 06/2019:
identificacao, demanda, procedimento, analise, conclusao
e o rodape etico.

Declaracao, atestado e parecer sao instrumentos distintos:
ou sao implementados com estrutura propria, ou NAO sao oferecidos.

Nunca rotular um texto livre como documento formal do CFP.
```

Regra:

```txt
nome do template precisa corresponder ao tipo de documento.
```

---

## 17. Preview E Impressao

Prioridade alta.

O produto precisa entregar sensacao premium.

Obrigatorio:

```txt
preview em formato de folha
hierarquia visual clara
boa legibilidade
modo preto e branco funcional
impressao bonita via navegador
cabecalho profissional correto
assinatura opcional
rodape etico quando aplicavel
```

Nao fazer:

```txt
visual infantil
excesso de icones
excesso de cor
layout com cara de formulario bruto
```

---

## 18. Blocos De Execucao

### Bloco 0 - Confirmacao De Estado

Objetivo: confirmar que main esta limpa e que branch antiga e apenas referencia.

Nao editar nada.

Entregar:

```txt
branch atual
ultimo commit da main
status da main
status da feature/doc-studio-lab
lista de arquivos alterados na branch antiga
plano de arquivos a criar/alterar
riscos
```

### Bloco 1 - Criar Branch Nova Segura

Usar exatamente:

```powershell
Set-Location C:\Users\evera\Projetos\psico2
git fetch origin
git switch -c feature/doc-studio-refactor-lab origin/main
```

Nao puxar merge da branch antiga.

Nao usar cherry-pick.

Reaproveitar codigo apenas por copia seletiva de conteudo.

### Bloco 2 - Fundacao De Arquivos

Criar estrutura:

```txt
types.ts
templates.ts
template-catalog.ts
ai-rules.ts
lib/
hooks/
components/
__tests__/
```

Mover logica pura antes de mexer em UI.

### Bloco 3 - Page Pequena

Refatorar `page.tsx` para virar orquestrador.

Meta:

```txt
page.tsx abaixo de 250-350 linhas se possivel
sem templates inline
sem helpers longos inline
sem copia textual longa inline
estado principal em hook
```

### Bloco 4 - Catalogo E Busca

Implementar catalogo estruturado.

Manter os modelos existentes se estiverem bons, mas em arquivo separado.

Adicionar:

```txt
busca sem acento
busca sem diferenciar caixa
filtro por linha
filtro por tipo
ordenacao por perfil
status active/hidden
```

### Bloco 5 - Preview, Copia E Impressao

Estabilizar:

```txt
preview
copiar texto
imprimir
modo preto e branco
cabecalho
assinatura
rodape etico
```

### Bloco 6 - Regras De IA Sem IA Real

Criar `ai-rules.ts`.

Sem chamar API.
Sem implementar endpoint.
Sem custo.
Sem IA real ainda.

Somente preparar perfis de revisao:

```txt
psychopedagogy_safe
psychology_cfp_06_2019
general_safe
```

### Bloco 7 - Testes E Validacao Local

Rodar, se existirem no projeto:

```txt
npm run lint
npm run build
npm run test
```

Validar visualmente:

```txt
/app/doc-studio
perfil psychopedagogue
perfil psychologist
perfil both
perfil unknown
preview desktop
preview mobile
impressao
modo preto e branco
busca
filtros
```

### Bloco 8 - Somente Depois

Somente depois de build/lint/visual OK:

```txt
discutir PR
discutir preview
discutir liberacao controlada
```

Nao orientar merge.

---

## 19. Checklist De Aceite Da Refatoracao

A refatoracao so esta pronta se:

```txt
main nao foi alterada
scripts/ nao foi tocado
branch nova foi criada a partir de origin/main
nao houve merge
nao houve cherry-pick
page.tsx foi reduzido
templates sairam da page
helpers sairam da page
estado principal saiu da page
catalogo ficou estruturado
busca funciona
filtros funcionam
busca ignora acentos e caixa
profile_type ordena a experiencia
cabecalho vem da Minha Conta
assinatura usa dados profissionais em texto
preview esta premium
impressao esta boa
modo preto e branco funciona
IA real nao foi implementada ainda
regras de IA ficaram preparadas como dados
documento psicologico respeita trava CFP
lint passa
build passa
nenhum arquivo de banco/pagamento/webhook/admin/login foi alterado
src/app/app/layout.tsx nao foi alterado
```

---

## 20. Trava De Commit, Push E PR

Nenhum destes comandos pode ser executado sem autorizacao literal:

```txt
git add
git commit
git push
gh pr create
git merge
```

Frases de autorizacao:

```txt
"pode commitar" = autoriza commit, se o escopo estiver claro
"pode abrir PR" = autoriza abrir PR, mas NAO autoriza merge
"pode colocar na main" = unica frase que autoriza merge/main
```

Na duvida:

```txt
PARE e pergunte.
Silencio = nao autorizado.
```

---

## 21. Proximo Passo Humano

O proximo passo nao e implementar tudo de uma vez.

O proximo passo e:

```txt
usar esta spec v1.5 com o executor escolhido
mandar executar apenas o Bloco 0
receber plano e riscos
so entao autorizar Bloco 1
```

Regra de ouro:

```txt
Uma etapa por vez.
Sem main.
Sem merge.
Sem pressa burra.
```
