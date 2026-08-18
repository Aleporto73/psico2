# Laudos Pro — documentação do subprojeto

Este diretório é a **fonte de verdade documental do Laudos Pro** dentro do PsicoPlanilhas 2.0.

## Status

- Produto: **Laudos Pro**
- Tipo: produto de esteira / upgrade interno
- Público: **exclusivo para psicólogos**
- Situação atual: **organização e especificação; não implementar ainda**
- Código de aplicação: **fora de escopo nesta fase**

## Regra de leitura para agentes

Ao trabalhar no Laudos Pro, começar por este diretório e ler apenas o necessário.

Não varrer automaticamente:

- `docs/corrigefacil/`
- `docs/doc-studio/`
- código do CorrigeFácil
- migrations não relacionadas
- especificações históricas soltas na raiz

Só consultar outro subprojeto quando a tarefa exigir uma integração específica e o motivo estiver claro.

## Documentos controladores

1. `LAUDOS_PRO_SPEC_1.md` — contrato funcional e arquitetura de produto congelável.
2. `CLAUDE.md` — regras de escopo para Claude Code e outros agentes trabalhando neste subprojeto.

## Próximos documentos planejados

Ainda não criar código. A sequência documental prevista é:

1. `LAUDOS_PRO_CATALOGO_ESTRUTURAS_V1.md`
2. `LAUDOS_PRO_PROMPT_CONTRACT_V1.md`
3. `LAUDOS_PRO_IMPLEMENTATION_PLAN_V1.md`
4. somente depois, prompts executores por bloco.

## Quatro regras controladoras

1. **Laudos Pro começa no CASO, não no teste.**
2. **Laudos Pro organiza as fontes registradas pelo psicólogo e auxilia na construção do documento; não substitui a decisão profissional.**
3. **A complexidade pertence ao sistema, não ao psicólogo.**
4. **O novo Laudos Pro nunca pode exigir mais esforço para começar um laudo do que exigia o antigo Assistente Laudos.**

## Relação com outros produtos

- **CorrigeFácil:** fonte opcional de resultados estruturados; não é dependência.
- **Relatórios Pro:** produto independente; eventualmente pode fornecer documento derivado/de referência, sem virar evidência primária automática.
- **Studio DOC:** produto independente; pode compartilhar padrões documentais, não domínio.
- **Assistente Laudos antigo:** legado externo; só será descontinuado depois de o Laudos Pro estar funcional e validado.

## Regra de segurança organizacional

Enquanto houver trabalho paralelo no CorrigeFácil, mudanças documentais do Laudos Pro devem permanecer em branch própria e não devem mover, renomear ou editar arquivos do CorrigeFácil sem necessidade explícita.
