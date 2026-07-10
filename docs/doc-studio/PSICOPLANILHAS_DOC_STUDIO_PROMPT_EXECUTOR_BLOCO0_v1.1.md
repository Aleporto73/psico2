# Prompt Executor - Doc Studio Bloco 0 v1.1

Cole este prompt junto com as specs:

```txt
Voce esta no projeto Psico2 / PsicoPlanilhas 2.0.

Leia primeiro, nesta ordem:
1. PSICOPLANILHAS_DOC_STUDIO_SPEC_PRODUTO_v1.1.md
2. PSICOPLANILHAS_DOC_STUDIO_SPEC_REFATORACAO_v1.6.md

Execute SOMENTE o Bloco 0 - Confirmacao De Estado.

Contexto critico:
- O projeto esta em producao.
- A branch main e producao.
- Nao mexa na main.
- Nao faca merge.
- Nao abra PR.
- Nao faca deploy.
- Nao faca git add.
- Nao faca commit.
- Nao faca push.
- Nao toque em banco, Supabase, migrations, pagamento, checkout, Asaas, webhook, login, clientes, admin, compras ou scripts/.
- A pasta scripts/ esta untracked e deve ser ignorada.

Decisao de produto atual:
- Produto: PsicoPlanilhas Doc Studio.
- Preco: R$49,00 vitalicio.
- IA: fora da v1.
- Nao usar Doc Pro como nome do produto.
- Nao implementar IA.
- Nao criar API de IA.
- Nao criar limite diario de IA.
- Nao criar assinatura anual para este produto na v1.

Historico critico:
- A branch feature/doc-studio-lab foi merged por engano na main e depois revertida.
- O commit esperado na main e:
  7d4d6aa Revert "Merge pull request #21 from Aleporto73/feature/doc-studio-lab"
- A branch feature/doc-studio-lab agora e apenas referencia tecnica/visual.
- Ela NAO deve ser usada para merge direto.
- Ela NAO deve ser usada com cherry-pick.

Branch segura atual, se existir:
- feature/doc-studio-refactor-lab

Tarefa deste bloco:
Fazer apenas auditoria read-only e devolver:

1. Estado atual
- branch atual
- ultimo commit da main
- status da main
- status da branch de laboratorio/refatoracao
- confirmar se scripts/ esta untracked e ignorado

2. Inspecao tecnica read-only
- listar arquivos alterados na branch de refatoracao em relacao a main
- confirmar se src/app/app/doc-studio/page.tsx existe apenas na branch lab/refactor
- confirmar se src/app/app/layout.tsx foi alterado e por qual motivo
- identificar onde Minha Conta guarda:
  display_name
  gender
  profession_category
  credential_type
  credential_number
  profile_type

3. Checagem de alinhamento de produto
- procurar referencias a Doc Pro
- procurar referencias a IA na v1
- procurar referencias a assinatura anual/R$49 por ano
- apontar o que precisa mudar para ficar:
  Doc Studio / R$49 vitalicio / sem IA na v1

4. Plano de refatoracao
- arquivos que pretende criar
- arquivos que pretende alterar
- arquivos que NAO pretende alterar
- riscos principais
- ordem sugerida dos blocos

5. Parada obrigatoria
Depois de responder, PARE.
Nao crie branch.
Nao edite arquivo.
Nao rode git add.
Nao rode commit.
Nao rode push.
Nao abra PR.
Nao faca merge.

Formato da resposta:
Use secoes curtas:

1. ESTADO
2. ACHADOS
3. CONFLITOS DE PRODUTO
4. RISCOS
5. PLANO
6. ARQUIVOS
7. AGUARDANDO AUTORIZACAO
```
