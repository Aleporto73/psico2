# PsicoPlanilhas Doc Studio - Spec de Refatoracao Segura v1.6

Status: substitui a v1.5 para remover conflito de produto/IA/preco
Projeto: Psico2 / PsicoPlanilhas 2.0
Repo GitHub: https://github.com/Aleporto73/psico2
Pasta local Windows: C:\Users\evera\Projetos\psico2
Produto: PsicoPlanilhas Doc Studio
Modelo comercial: R$49,00 vitalicio
IA na v1: nao
Base tecnica de referencia: branch feature/doc-studio-refactor-lab

---

## 0. Aviso De Separacao

Este arquivo e uma SPEC DE EXECUCAO.

Ele nao e prompt.

Ele nao autoriza mexer na main.

Ele nao autoriza merge.

---

## 1. Contexto Critico

O projeto Psico2 esta em producao, com clientes reais.

A branch `main` e producao.

Regra absoluta:

```txt
NUNCA mexer na main sem autorizacao literal do usuario:
"pode colocar na main"
```

Proibido sem autorizacao especifica:

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

## 3. Decisao De Produto Que Manda Nesta Spec

Fonte de produto:

```txt
PSICOPLANILHAS_DOC_STUDIO_SPEC_PRODUTO_v1.1.md
```

Decisoes travadas:

```txt
Produto: PsicoPlanilhas Doc Studio
Preco: R$49,00 vitalicio
IA: fora da v1
Catalogo v1: documentos premium por profissao
```

Nao usar nesta execucao:

```txt
Doc Pro como nome do produto
assinatura anual
IA revisora na v1
API de IA
limite diario de IA
```

---

## 4. Objetivo Da Refatoracao

Transformar o laboratorio do Doc Studio em fundacao limpa, testavel e expansivel.

Objetivo:

```txt
manter visual premium
manter catalogo
manter busca
manter preview
manter impressao
manter rascunho local
manter cabecalho profissional
preparar catalogo por profession_category
reduzir acoplamento
baixar risco de manutencao
deixar page.tsx pequeno
```

Nao e objetivo desta spec:

```txt
IA
checkout
webhook
migration
banco novo
historico persistente
DOCX
```

---

## 5. Produto-Alvo Da v1

O Doc Studio sera um produto vitalicio de entrada, com custo baixo e alta utilidade.

Ele entrega:

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
```

Regra de produto:

```txt
O sistema estrutura.
O profissional escreve.
O Doc Studio entrega bonito.
```

---

## 6. Catalogo Por Profissao

Nao limitar a duas linhas para sempre.

Na v1, entregar bem:

```txt
Psicopedagogia / Neuropsicopedagogia
Psicologia / Neuropsicologia
```

Preparar arquitetura para:

```txt
Fonoaudiologia
Terapia Ocupacional
Medicina / Pediatria
Outros
```

Campo de referencia:

```txt
profession_category
```

Valores esperados:

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

Regra:

```txt
profession_category define catalogo inicial.
profile_type pode ajudar segmentacao comercial.
cabecalho vem de display_name, gender, profession_category, credential_type e credential_number.
```

---

## 7. Catalogo v1

A v1 deve mirar 30 documentos:

```txt
15 psicopedagogia/neuropsicopedagogia
15 psicologia/neuropsicologia
```

O catalogo deve morar em arquivo de dados, nao dentro da page.

Obrigatorio:

```txt
status active/hidden
professionCategories
documentKind
searchTerms
riskLevel
requiresHeader
sections
fields
ethicalFooter quando aplicavel
```

---

## 8. Psicologia E Trava CFP

O documento "Relatorio psicologico estruturado CFP" entra na v1.

Ele deve ter estrutura propria:

```txt
identificacao
descricao da demanda
procedimento
analise
conclusao
rodape etico
```

Trava:

```txt
texto solto nao pode ser chamado de relatorio psicologico.
declaracao, atestado e parecer sao documentos distintos.
laudo psicologico nao entra na v1.
```

---

## 9. Arquitetura-Alvo

Estrutura:

```txt
src/app/app/doc-studio/
  page.tsx
  types.ts
  templates.ts
  template-catalog.ts
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
    catalog.test.ts
    copy.test.ts
    storage.test.ts
    profile.test.ts
```

Nao criar `ai-rules.ts` como arquivo obrigatorio na v1.

Se ja existir na branch atual, pode:

```txt
remover
ou manter como arquivo inativo/backlog, desde que nao apareca na UI e nao prometa IA
```

Preferencia:

```txt
remover referencias de IA do produto v1 para nao gerar duas verdades.
```

---

## 10. Busca E Filtros

Obrigatorio:

```txt
busca por titulo
busca por categoria
busca por termos comuns
busca sem acento
busca sem diferenciar maiuscula/minuscula
filtro por profissao/linha
filtro por tipo de documento
modelos recomendados primeiro
```

UX:

```txt
catalogo pode ser grande.
a tela precisa continuar simples.
```

---

## 11. Aparencia

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
aparencia existe, mas nao domina a tela.
padrao vem pronto.
usuario muda so se quiser.
```

---

## 12. Layout Global

Regra:

```txt
Nao alterar layout global sem autorizacao explicita.
```

Excecao ja discutida no laboratorio:

```txt
menu compacto apenas em /app/doc-studio
print:hidden no menu para impressao limpa
```

Qualquer nova alteracao em `src/app/app/layout.tsx` deve ser justificada e autorizada antes.

---

## 13. Blocos De Execucao

### Bloco 0 - Confirmacao De Estado

Read-only.

Confirmar:

```txt
branch atual
ultimo commit da main
status da main
status da branch de laboratorio
scripts/ untracked e ignorado
arquivos alterados
plano
riscos
```

### Bloco 1 - Branch Segura

Criar branch nova a partir de `origin/main`.

Sem merge.
Sem cherry-pick.

### Bloco 2 - Alinhar Produto

Remover conflito:

```txt
Doc Pro -> Doc Studio
anual -> vitalicio
IA na v1 -> sem IA na v1
```

### Bloco 3 - Catalogo v1

Expandir ou ajustar modelos:

```txt
15 psicopedagogia/neuropsicopedagogia
15 psicologia/neuropsicologia
```

### Bloco 4 - Catalogo Por Profissao

Usar `profession_category` para ordenar/filtrar catalogo inicial.

Preparar suporte futuro para Fono e TO sem prometer na UI se nao houver modelos.

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

### Bloco 6 - Testes E Validacao

Rodar:

```txt
npm run test -- --run
npx tsc --noEmit
npm run build
eslint escopado quando necessario
```

Validar visualmente:

```txt
/app/doc-studio
desktop
mobile
impressao
modo preto e branco
busca
filtros
catalogo por profession_category
```

---

## 14. Checklist De Aceite

Pronto quando:

```txt
main nao foi alterada
scripts/ nao foi tocado
sem merge
sem cherry-pick
produto chama Doc Studio
preco/documentacao indica R$49 vitalicio
nao ha promessa de IA na v1
page.tsx pequeno
templates fora da page
helpers fora da page
estado em hook
busca funciona
filtros funcionam
cabecalho vem da Minha Conta
catalogo usa profession_category
preview premium
impressao limpa
modo preto e branco funciona
Relatorio psicologico estruturado CFP tem estrutura correta
quarentena fora da vitrine
testes passam
build passa
```

---

## 15. Trava De Commit, Push E PR

Nenhum destes comandos pode ser executado sem autorizacao literal:

```txt
git add
git commit
git push
gh pr create
git merge
```

Frases:

```txt
"pode commitar" = autoriza commit
"pode abrir PR" = autoriza PR, mas nao merge
"pode colocar na main" = unica frase que autoriza main/merge
```

Na duvida:

```txt
PARE e pergunte.
```

---

## 16. Veredito

A refatoracao deve servir ao produto atual:

```txt
Doc Studio vitalicio
R$49
sem IA na v1
catalogo premium por profissao
base tecnica limpa para crescer depois
```
