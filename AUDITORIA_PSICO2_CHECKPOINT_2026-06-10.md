# CHECKPOINT DE AUDITORIA — PSICO2 / PSICOPLANILHAS

Data: 2026-06-10  
Escopo: auditoria fora de Asaas, com foco em RLS, access_url, grants e banners comerciais.  
Status do repo antes do registro: working tree limpo.

---

## 1. Decisões confirmadas

### 1.1. Estrutura documental encontrada

Confirmado no repositório:

- Não existe pasta `.claude`.
- Existe pasta `docs/sql`.
- Existe arquivo raiz `AUDITORIA_PSICO2_2026-06-08.md`.
- Este checkpoint foi criado como registro complementar, sem editar a auditoria anterior.

---

## 2. Auditoria de `access_url`

### Confirmado no banco vivo

- A tabela `public.products` está com RLS ativo.
- A policy pública permissiva para leitura de produtos ativos não existe mais no banco vivo.
- A policy atual de `products` permite acesso completo apenas via `is_admin()`.
- A view `public.products_public` não possui coluna `access_url`.
- A RPC `public.get_my_spreadsheets()` retorna `access_url`, mas exige:
  - `auth.uid()` presente;
  - `public.has_lifetime_access(auth.uid()) = true`.
- `public.get_my_spreadsheets()` não possui grant para `anon`.
- `public.get_my_spreadsheets()` possui grant para `authenticated` e `service_role`.

### Veredito

O risco de vazamento de `products.access_url` via PostgREST, view pública ou RPC foi refutado pelas checagens no banco vivo.

---

## 3. Hardening aplicado manualmente no Supabase

### Problema confirmado

As funções abaixo estavam executáveis por `anon`/`public`:

- `public.has_lifetime_access(uuid)`
- `public.has_active_assistant(uuid)`
- `public.get_active_assistant_expires_at(uuid)`

A view `public.user_access_status` também possuía grant para `anon`.

### Risco

Não havia vazamento de `access_url`, mas havia risco lateral de consulta de status por UUID conhecido:

- verificar se um usuário possui acesso vitalício;
- verificar se possui Assistente IA Pro ativo;
- verificar data de expiração do Assistente IA Pro.

### Correção aplicada no banco vivo

Foram removidos os grants de `anon`/`public` onde não eram necessários.

Estado final confirmado:

- `public.user_access_status`: acesso para `postgres`, `authenticated`, `service_role`.
- `public.has_lifetime_access(uuid)`: execução para `postgres`, `authenticated`, `service_role`.
- `public.has_active_assistant(uuid)`: execução para `postgres`, `authenticated`, `service_role`.
- `public.get_active_assistant_expires_at(uuid)`: execução para `postgres`, `authenticated`, `service_role`.

---

## 4. Banners comerciais

### Confirmado em teste funcional

- O cadastro de banner no admin funcionou.
- O banner apareceu no painel do cliente em `/app`.
- `position = dashboard_middle` funcionou.
- Segmentação `all / Todos` funcionou.
- Botão principal apareceu.
- Modal de vídeo funcionou quando `video_url` foi preenchido.

### Limitação confirmada pelo código/uso

- O campo `image_url` existe no admin/API.
- Porém, no painel do cliente, o card atual não renderiza `image_url`.
- O banner atual funciona como card textual com CTA e vídeo opcional.

### Veredito

Funcionalidade aprovada tecnicamente. Visual comercial pode melhorar depois.

---

## 5. Pendências reais

### P1 — validar após hardening de grants

Testar no navegador, com usuário autenticado:

- `/app`
- `/app/planilhas`
- `/app/produtos`
- `/app/minha-conta`
- `/app/assistente-pro`

Testar com admin:

- `/admin`
- `/admin/clientes`

Objetivo: confirmar que a remoção de `anon` não quebrou fluxo autenticado.

### P1 — commitar este checkpoint

Este arquivo e o SQL em `docs/sql` precisam ser commitados para que a alteração manual no Supabase não vire “correção fantasma”.

### P2 — melhorar banners visuais

Implementar renderização de `image_url` no card comercial do painel cliente.

Sugestão futura:

- imagem no topo do card;
- proporção 16:9;
- `object-cover`;
- `rounded-xl`;
- fallback para card textual quando `image_url` estiver vazio.

### P2 — revisar copy “assinatura” vs “acesso anual”

Existe desalinhamento textual possível entre “assinatura” e “acesso anual”. Não foi tratado neste checkpoint.

### P2 — avaliar migração `middleware` para `proxy`

Next.js avisou que `middleware` está deprecated em favor de `proxy`. Não quebra hoje, mas deve entrar em melhoria futura.

---

## 6. Não verificado neste checkpoint

- Não foi feita auditoria completa linha a linha de todos os arquivos.
- Não foi validado fluxo completo de todos os perfis após o hardening.
- Não foi mexido em Asaas neste bloco de auditoria/documentação.
- Não foi alterado código de produção neste checkpoint.

---

## 7. Regra de continuidade

Ao retomar:

1. Confirmar `git status --short`.
2. Testar as rotas listadas em P1.
3. Commitar documentação se o diff estiver correto.
4. Só depois abrir novas melhorias.