# Prompt Executor - Doc Studio Bloco 0

Cole este prompt junto com a spec:

```txt
Voce esta no projeto Psico2 / PsicoPlanilhas 2.0.

Antes de qualquer coisa, leia a spec:
PSICOPLANILHAS_DOC_STUDIO_SPEC_REFATORACAO_v1.5.md

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

Historico critico:
- A branch feature/doc-studio-lab foi merged por engano na main e depois revertida.
- O commit esperado na main e:
  7d4d6aa Revert "Merge pull request #21 from Aleporto73/feature/doc-studio-lab"
- A branch feature/doc-studio-lab agora e apenas referencia tecnica/visual.
- Ela NAO deve ser usada para merge direto.
- Ela NAO deve ser usada com cherry-pick.

Tarefa deste bloco:
Fazer apenas auditoria read-only e devolver:

1. Estado atual
- branch atual
- ultimo commit da main
- status da main
- status da feature/doc-studio-lab
- confirmar se scripts/ esta untracked e ignorado

2. Inspecao tecnica read-only
- listar arquivos alterados na feature/doc-studio-lab em relacao a main
- confirmar se src/app/app/doc-studio/page.tsx existe apenas na branch lab
- confirmar tamanho aproximado do page.tsx
- confirmar se src/app/app/layout.tsx foi alterado na branch lab
- identificar onde Minha Conta guarda:
  display_name
  gender
  profession_category
  credential_type
  credential_number
  profile_type

3. Plano de refatoracao
- arquivos que pretende criar
- arquivos que pretende alterar
- arquivos que NAO pretende alterar
- riscos principais
- ordem sugerida dos blocos

4. Parada obrigatoria
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
3. RISCOS
4. PLANO
5. ARQUIVOS
6. AGUARDANDO AUTORIZACAO
```
