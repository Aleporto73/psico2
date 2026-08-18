# CLAUDE.md — Laudos Pro

## Escopo atual

Este diretório pertence ao subprojeto **Laudos Pro** do PsicoPlanilhas 2.0.

**FASE ATUAL: documentação e organização. NÃO implementar código.**

## Antes de qualquer tarefa

1. Ler `docs/laudos-pro/README.md`.
2. Ler somente o documento controlador necessário à tarefa.
3. Não fazer varredura ampla do repositório por padrão.
4. Não alterar código, banco, migrations, checkout, RLS ou navegação enquanto a tarefa estiver marcada como documental.

## Limites de leitura

### Permitido por padrão

- `docs/laudos-pro/**`
- arquivos diretamente citados pelo documento controlador ou pelo usuário

### Consultar somente se a tarefa exigir integração específica

- `docs/corrigefacil/**`
- `src/app/app/corrigefacil/**`
- `src/app/app/assistente-pro/**`
- `src/app/api/assistant/**`
- `docs/doc-studio/**`
- migrations relacionadas a entitlement/pagamentos/perfil

Ao abrir algo fora de `docs/laudos-pro/`, registrar mentalmente o motivo e manter a leitura mínima.

### Não fazer por iniciativa própria

- não ler todo o repositório;
- não reler especificações históricas soltas na raiz sem necessidade;
- não abrir todos os testes;
- não abrir todo o catálogo do CorrigeFácil;
- não analisar outras features do PsicoPlanilhas para “entender melhor” se não forem necessárias à tarefa;
- não refatorar arquitetura compartilhada durante implementação do Laudos Pro sem autorização explícita.

## Fronteira do produto

O Laudos Pro é um produto próprio, embora reutilize infraestrutura existente quando apropriado.

Não transformar Laudos Pro em:

- extensão de `ai_reports`;
- modo do Relatórios Pro;
- prontuário;
- agenda;
- corretor de testes;
- chatbot genérico;
- superapp que absorve CorrigeFácil/Studio DOC/Relatórios Pro.

## Regras controladoras

1. **Laudos Pro começa no CASO, não no teste.**
2. **Laudos Pro organiza as fontes registradas pelo psicólogo e auxilia na construção do documento; não substitui a decisão profissional.**
3. **A complexidade pertence ao sistema, não ao psicólogo.**
4. **Nunca tornar o início de um laudo mais trabalhoso do que era no Assistente Laudos legado.**

## Integrações

- CorrigeFácil = integração opcional e fonte por snapshot.
- Relatórios Pro = produto independente; material derivado somente quando explicitamente usado como referência.
- Perfil/autenticação/OpenAI/PaymentBeta = infraestrutura potencialmente reutilizável, não motivo para misturar domínios.

## Concorrência com outros trabalhos

Há/ pode haver trabalho paralelo em CorrigeFácil.

Durante esse período:

- usar branch própria para Laudos Pro;
- não mover/renomear arquivos de CorrigeFácil;
- não editar código compartilhado sem verificar o estado atual da `main` e branches/PRs relevantes;
- mudanças puramente documentais do Laudos Pro devem permanecer isoladas em `docs/laudos-pro/**`.

## Regra final

Se a tarefa puder ser concluída lendo apenas `docs/laudos-pro/**`, **pare ali**.
