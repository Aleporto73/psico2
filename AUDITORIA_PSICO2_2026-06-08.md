# AUDITORIA TÉCNICA — PsicoPlanilhas 2.0

**Data:** 2026-06-08
**Branch:** `main` (último commit `f379824 ux(assistant): remove gerar tres versoes do IA Pro`)
**Tipo:** Auditoria read-only. Nenhum arquivo foi alterado.
**Domínio em produção:** https://app.psicoplanilha.com
**Stack:** Next.js 16.2.7 + React 19 + TypeScript 5 + Supabase (SSR + service role) + Tailwind 4 + OpenAI direto via fetch.

---

## 1. Estado Geral do Sistema

O sistema está **funcional para piloto controlado**, com fluxos principais implementados ponta-a-ponta:

| Área | Estado |
| --- | --- |
| Auth (login, ativação, reset, definir senha) | OK, com `middleware.ts` protegendo `/app` e `/admin`. |
| Admin (dashboard, clientes, produtos, banners, CSV, manual) | OK funcionalmente. Riscos de UX e validação. |
| Área do cliente (dashboard, planilhas, produtos, conta, GPT Free, IA Pro) | OK funcionalmente. **Risco crítico de vazamento de `access_url`**. |
| IA Pro (texto / prints / texto+prints, 4 tipos de relatório) | OK. Limite diário 20/dia, paid-gate server-side correto. |
| Supabase schema + RLS + funções | OK. `user_access_status` + `has_lifetime_access` + `has_active_assistant` consistentes. |
| Asaas (checkout + webhook) | **Implementado mas marcado como "não mexer" — será substituído pelo PaymentBeta.** |
| Build / TypeScript / ESLint | TypeScript passa (`tsc --noEmit` sem erros). `npm run lint` sem erros. Build local (`next build`) crashou no sandbox (bus error de ambiente, não código). |
| Histórico Git | Limpo, 14 commits, sem WIP/pendências locais. |

A **"Gerar 3 versões" foi removida com sucesso** — busca por `3 versões|gerar 3|variants|numVersions` em `src/` retorna apenas o comentário `HACK` em `assistant/generate/route.ts` (sem código residual de variantes).

Documentação em `PSICOPLANILHAS_*.md` (12 documentos) está alinhada com o código atual em ~80% — alguns desvios serão listados abaixo.

---

## 2. Riscos por Severidade

### P0 — Crítico (bloqueia operação ou expõe dados)

| # | Risco | Arquivo | Detalhe |
| --- | --- | --- | --- |
| P0-1 | **Vazamento dos 101 `access_url` (links Google `/copy`) para qualquer usuário logado, mesmo sem vitalício** | `src/app/app/produtos/page.tsx:67` e `src/app/app/planilhas/page.tsx:88` | `produtos` faz `select('*')` da tabela `products` com a anon key. RLS atual: "Anyone can read active products" → o JSON com `access_url` chega ao browser de TODO usuário logado. UI não mostra o campo, mas DevTools/Network expõe. **A guarda `has_lifetime_access` é puramente cosmética nesse caminho.** Risco direto sobre o produto pago. |
| P0-2 | **CSV de importação usa parser ingênuo** | `src/app/admin/importacao/page.tsx:80-103` | `split(',')` quebra em nomes como `"Silva, Maria"`, aspas, multiline. Vai corromper dados em massa. |
| P0-3 | **Geração de senha insegura no CSV** | `src/app/api/admin/import-csv/route.ts:109-112` | `Math.random().toString(36).slice(-8) x4` não é criptograficamente seguro. Não é o ataque mais provável (usuários resetam antes do uso), mas é uma falha óbvia de segurança. |
| P0-4 | **Endpoint `/api/asaas/*` existe mas será trocado** | `src/app/api/asaas/create-checkout/route.ts`, `src/app/api/asaas/webhook/route.ts` | Por ordem do usuário não mexer agora. Citado para clareza. Webhook está bem feito (idempotência, payment_events, recovery de desync), mas precisa de migração para PaymentBeta. |

### P1 — Importante (bug, validação ou UX que trava o cliente)

| # | Risco | Arquivo | Detalhe |
| --- | --- | --- | --- |
| P1-1 | **Detail de cliente filtra slug em join incorretamente** | `src/app/admin/clientes/[id]/page.tsx:123-139` | `.eq('products.slug', 'psicoplanilhas-vitalicio')` não filtra a relação no supabase-js — filtra a linha-pai. Status de vitalício/Pro pode aparecer errado para usuários com múltiplas compras. |
| P1-2 | **Tela de sucesso do "Cadastro manual" sempre mostra "Liberado"** | `src/app/admin/importacao/page.tsx:667,679` | `manualResult.client.has_lifetime_access !== 'não liberado'` compara boolean com string → sempre truthy. Admin acha que liberou vitalício quando NÃO marcou a opção. |
| P1-3 | **Status de subscription Pro divergente** | `manual-client/route.ts:273,292` vs `action/route.ts:218` vs `webhook/route.ts:286` | Algumas rotas gravam `status='active'`, outras `'manual'`. Dashboard admin (`page.tsx:83`) só conta `'manual'` → contador subestima. View `user_access_status` exige `status in ('active','manual')` — funciona, mas valor canônico precisa ser decidido. |
| P1-4 | **URLs sem validação de protocolo** | `produtos/route.ts`, `banners/route.ts`, `produtos/page.tsx` admin, `banners/page.tsx` admin | `image_url`, `video_url`, `button_url`, `checkout_url`, `access_url`, `tutorial_url` aceitos como `type="text"` sem allowlist de `https?:`. Risco de **stored XSS** via `javascript:` por admin malicioso ou bug. |
| P1-5 | **Janela do limite diário do IA Pro é UTC, não BRT** | `assistant/generate/route.ts:237-264` | Contador reseta às 21:00 hora local. Confunde o público. |
| P1-6 | **`report_type` da `ai_reports` guarda área, não tipo (família/escola/técnico/interno)** | `assistant/generate/route.ts:503-510` | O tipo escolhido vira só tag em `input_text`. Impede filtros/analytics. |
| P1-7 | **Body-size sem cap explícito em `/api/assistant/generate`** | `assistant/generate/route.ts` | 4 imagens × 5 MB base64 ≈ 27 MB. Next pode rejeitar com erro genérico antes da rota responder. |
| P1-8 | **Crash potencial no dashboard `/app`** | `src/app/app/page.tsx:178` | `profile?.email.split('@')[0]` — se `profile=null` (fetch falhou) o optional chaining para em `profile?.email`, mas dentro do JSX há também `profile?.name || profile?.email.split('@')[0]` — quando `email=undefined`, `.split` quebra. Só acontece em fetch fail, mas é uma tela branca para o usuário. |
| P1-9 | **Erros Supabase em PT-BR ruim** | `minha-conta/page.tsx:76,103`, várias outras páginas client-side | Mensagens cruas do Supabase em inglês ("JWT expired", "Failed to fetch") vão para o usuário sem tradução. |
| P1-10 | **Admin pode bloquear/cancelar outro admin (ou a si mesmo)** | `api/admin/clientes/[id]/action/route.ts` | Não há verificação `target.role !== 'admin'` antes de ações destrutivas. |
| P1-11 | **Ações destrutivas sem confirmação consistente** | `admin/clientes/[id]/page.tsx` | "Liberar vitalício", "Ativar Pro", "Alterar vencimento", "Desbloquear", "Enviar reset", "Reenviar ativação" disparam direto. Só block / cancel vitalício / cancel Pro mostram modal. |
| P1-12 | **`access_url` exposto até no fetch admin** | mesmo `select('*')` aparece em vários lugares | Não é vazamento ao cliente final, mas é desnecessário e amplia superfície. |
| P1-13 | **Dashboard admin perde contagem de subs Pro `active`** | `admin/page.tsx:83` | Filtro `.eq('status','manual')` apenas. |

### P2 — Melhoria (não trava, mas precisa antes de escalar)

| # | Ponto | Detalhe |
| --- | --- | --- |
| P2-1 | Falta paginação em lista de clientes, lista de logs, lista de produtos. | A partir de ~2k linhas o tempo de carga vai degradar. |
| P2-2 | `admin_logs.action` em texto livre PT-BR ("bloquear usuário"). Impede análise. | Padronizar enum `BLOCK_USER`, `GRANT_LIFETIME`, etc. |
| P2-3 | Sem CSRF / rate limit em `/api/admin/*` e `/api/assistant/generate`. | Mitigação parcial pelo cookie `SameSite=Lax`, mas falta defesa explícita. |
| P2-4 | Sem rastreamento de IP/user-agent em `admin_logs`. | |
| P2-5 | "Minha conta" só edita `profile_type`. Sem editar nome, telefone, senha, e-mail. | |
| P2-6 | Mobile nav só com ícone (sem label visível < `sm:`). Ruim para 50+. | `layout.tsx:188-197` |
| P2-7 | Race condition no limite diário IA Pro (count → insert). | Baixa probabilidade, baixo impacto. |
| P2-8 | Sem persistência local do rascunho no IA Pro. Recarregar = perder texto. | |
| P2-9 | Idempotência ausente no `/api/assistant/generate`. Double-submit consome 2 cotas. | |
| P2-10 | `lib/supabase.ts` cria um cliente anon legacy nunca usado nas rotas atuais (todas usam `utils/supabase/*`). Arquivo candidato a remoção. | |
| P2-11 | `redirectTo` do password reset usa `request.url` origin — vulnerável a host header spoofing se proxy mal configurado. Trocar por env var `NEXT_PUBLIC_APP_URL`. | `api/admin/clientes/[id]/action/route.ts:37` |
| P2-12 | CSV import faz N×4 queries sequenciais (sem batch). Vai estourar timeout de 10s em CSV grande. | |
| P2-13 | Textos para público 50+ com jargão: "GPT Builder externo", "Ver oferta anual", "(cópia)", "external_product", pill "Público: Psicologia". | |
| P2-14 | Banner sem live preview no admin; sem DELETE em banners e produtos (só toggle). | |
| P2-15 | Disclaimer repetido em 4 páginas — extrair componente. | |
| P2-16 | Sem link "Falar com suporte" em nenhuma tela do cliente. | |
| P2-17 | Sem auto-dismiss em banners de sucesso/erro (acumulam). | |
| P2-18 | `lib/openai.ts`: detecção de "modelo sem visão" é heurística por string. Frágil. | |
| P2-19 | `Math.random` na geração de senha (não-criptográfico) — já listado em P0-3 por ser mass. | |
| P2-20 | Componente `Button` (`src/components/ui/button.tsx`) com `TODO` (único TODO do código). | Não-blocker. |

### P3 — Futuro (depois do PaymentBeta)

| # | Ponto |
| --- | --- |
| P3-1 | Impersonação ("ver como usuário X") para suporte. |
| P3-2 | Exportação CSV da base de clientes. |
| P3-3 | Filtros avançados na lista de clientes (status, profile_type, sub state). |
| P3-4 | Favoritar/marcar planilhas usadas (entre 101 itens). |
| P3-5 | Tutorial guiado de primeiro uso (Google "Make a copy" confunde 50+). |
| P3-6 | Telemetria/analytics para mensurar gargalos no funil. |
| P3-7 | Modo "fonte grande" / acessibilidade. |
| P3-8 | Componentização do design system (atualmente Tailwind colado inline em todas as páginas). |
| P3-9 | Tests automatizados (não existem). |
| P3-10 | Renomear `report_type` ou adicionar `audience_type` na `ai_reports`. |
| P3-11 | Política de retenção / consentimento explícito para dados sensíveis em `ai_reports.input_text`. |

---

## 3. Pendências ANTES da integração com PaymentBeta

São os itens que **precisam ser resolvidos antes** de plugar o PaymentBeta para não introduzir bug de liberação ou vazamento.

1. **P0-1** — Proteger `access_url`. Opções (escolher uma):
   - View `products_public` sem `access_url` + RLS aberta. View interna `products_full` para admin/RPC.
   - Migrar `access_url` para uma RPC `get_my_spreadsheets()` que internamente cheque `has_lifetime_access(auth.uid())`.
   - Column-level privilege: `REVOKE SELECT (access_url) ON products FROM anon, authenticated;` + RPC dedicada.
   Sem isso, o webhook do PaymentBeta libera acesso que **já estava vazado**.
2. **P1-3** — Padronizar `subscriptions.status` para um único valor canônico (recomendo `'active'`). Ajustar dashboard, view e cancelamento. PaymentBeta vai gravar nesse campo; precisa de um valor único combinado.
3. **P1-1** — Corrigir filtro `eq('products.slug', ...)` no detail de cliente. Sem isso, admin verá status errado após o webhook do PaymentBeta gravar uma segunda compra.
4. **P1-2** — Corrigir comparação `has_lifetime_access !== 'não liberado'` (bug de UI no cadastro manual). É a tela de fallback caso o PaymentBeta esteja fora do ar e o admin precise liberar Pix manual.
5. **P1-13** — Corrigir contador de Pro no dashboard admin para considerar `status='active'`. Vai virar a métrica de saúde do PaymentBeta.
6. **P1-10** — Bloquear ações destrutivas contra contas com `role='admin'` e contra o próprio admin logado.
7. **Definir contrato do webhook PaymentBeta** (ver seção 7).
8. **Campos faltando no schema** (ver seção 7).
9. **Decisão sobre destino do código `/api/asaas/*`** — manter como fallback, deletar ou substituir. Já há `payment_events` modelado de forma genérica suficiente para PaymentBeta reusar.

## 4. Pendências que PODEM ESPERAR

Todos os P2 e P3. Em especial:

- Mobile nav com labels (P2-6).
- Editar nome/telefone em "Minha conta" (P2-5).
- Paginação (P2-1).
- CSRF/rate limit (P2-3).
- Persistência de rascunho IA Pro (P2-8).
- Race condition do limite diário (P2-7).
- Janela BRT do limite diário (P1-5 pode ir para depois se piloto for restrito).
- Mensagens de erro Supabase em PT-BR (P1-9) — manter no curto prazo, refatorar depois.

---

## 5. Arquivos Principais Auditados

```
src/middleware.ts
src/utils/supabase/
  ├── server.ts
  ├── client.ts
  ├── middleware.ts
  ├── admin.ts
  └── admin-auth.ts
src/lib/
  ├── supabase.ts        (legacy, candidato a remoção)
  ├── openai.ts
  └── utils.ts
src/app/
  ├── layout.tsx
  ├── page.tsx           (landing-debug com rotas internas)
  ├── login/page.tsx
  ├── ativar-acesso/page.tsx
  ├── definir-senha/page.tsx
  ├── esqueci-senha/page.tsx
  ├── api/auth/
  │   ├── ativar-acesso/route.ts
  │   └── esqueci-senha/route.ts
  ├── admin/
  │   ├── page.tsx
  │   ├── clientes/page.tsx
  │   ├── clientes/[id]/page.tsx
  │   ├── produtos/page.tsx
  │   ├── banners/page.tsx
  │   └── importacao/page.tsx
  ├── api/admin/
  │   ├── banners/route.ts
  │   ├── clientes/[id]/action/route.ts
  │   ├── import-csv/route.ts
  │   ├── manual-client/route.ts
  │   └── produtos/route.ts
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx
  │   ├── planilhas/page.tsx
  │   ├── produtos/page.tsx
  │   ├── minha-conta/page.tsx
  │   ├── assistente-gpt/page.tsx
  │   └── assistente-pro/page.tsx
  ├── api/assistant/generate/route.ts
  └── api/asaas/             ← NÃO MEXIDO (será substituído pelo PaymentBeta)
      ├── create-checkout/route.ts
      └── webhook/route.ts
supabase/migrations/
  ├── 20260602000000_initial_schema.sql
  └── 20260603000000_payment_events.sql
```

Total: ~9.1k linhas TS/TSX. Estrutura limpa, sem arquivos órfãos óbvios além de `src/lib/supabase.ts`.

---

## 6. Recomendações Objetivas de Próximos Patches

### Patch A — Proteção de `access_url` (BLOQUEADOR)
- Criar migration que adiciona view `public.products_public` sem `access_url`.
- Atualizar `RLS` para anon/authenticated lerem `products_public`, não `products`.
- Trocar `produtos/page.tsx:67` e `planilhas/page.tsx:88` para `products_public`.
- Criar RPC `get_my_spreadsheets()` em `security definer` que retorna `access_url` apenas quando `has_lifetime_access(auth.uid()) = true`.

### Patch B — Bugfix bloco "Cadastro manual"
- Corrigir `importacao/page.tsx:667,679` (boolean vs string).
- Corrigir filtro `eq('products.slug', ...)` em `clientes/[id]/page.tsx:123-139` usando `select('id, payment_status, products!inner(slug)').eq('products.slug', ...)` OU duas queries separadas.

### Patch C — Padronização de subscription status
- Decidir valor canônico (`'active'`) e atualizar 3 rotas + dashboard.
- Adicionar migration `UPDATE subscriptions SET status='active' WHERE status='manual';` se quiser limpar o histórico.

### Patch D — Hardening admin
- Bloquear ações destrutivas contra `role='admin'`.
- Adicionar `audience`/`type`/`position` allowlist nas rotas POST.
- Validar protocolo de URLs (regex `^https?://`).
- Substituir `Math.random` por `crypto.randomBytes` na geração de senha CSV.
- Adicionar confirmação consistente em **todas** as ações destrutivas do detail de cliente.

### Patch E — Hardening IA Pro
- Janela diária em BRT.
- Cap explícito `bodyParser.sizeLimit: '30mb'` + check agregado de payload.
- Salvar `audience_type` em coluna própria (ou renomear `report_type`).
- Idempotency key opcional no `POST` (header `Idempotency-Key`).

### Patch F — UX 50+
- Mobile nav com labels.
- Editar nome, telefone, senha em "Minha conta".
- Textos: "Abrir minha cópia no Google Sheets", "Assistente IA Pro (assinatura anual)", "Bônus incluso", "Conhecer o IA Pro".
- Link "Falar com suporte" no rodapé do sidebar.
- Auto-dismiss em toasts de sucesso.
- Loading skeletons em vez de spinner inteiro.

### Patch G — Preparar terreno para PaymentBeta (sem implementar)
- Adicionar campos no schema (ver seção 7).
- Documentar contrato `POST /api/payment/webhook` esperado.
- Manter Pix manual operacional via `manual-client/route.ts` (já existe).

---

## 7. Preparação para PaymentBeta

### 7.1 Endpoints que vão precisar existir
| Endpoint | Método | Função |
| --- | --- | --- |
| `/api/payment/create-checkout` | POST | Cria sessão/cobrança no PaymentBeta a partir de `{product_slug, email, name}`. Retorna `checkoutUrl`. |
| `/api/payment/webhook` | POST | Recebe eventos do PaymentBeta. Valida token. Insere em `payment_events`. Aplica liberação/revogação. |
| `/api/payment/reprocess` | POST (admin) | Reprocessar evento por `payment_id` em caso de falha. |
| `/api/payment/status` (opcional) | GET (cliente logado) | Permite ao app perguntar "minha compra X já foi confirmada?" |

### 7.2 Tabelas que vão precisar ser atualizadas
- `payment_events` (já existe, schema genérico — só ajustar `event_type` e payload se PaymentBeta usar nomes diferentes).
- `purchases` (já existe — campos `payment_reference`, `payment_status`, `source`).
- `subscriptions` (já existe — campos `payment_reference`, `status`, `expires_at`, `plan_slug`, `source`).
- `profiles` (já existe — `email` é o pivô para criação on-the-fly via webhook).
- `products` (slug fixo `psicoplanilhas-vitalicio` e `assistente-ia-pro` — já seedados).

### 7.3 Campos que JÁ existem (não precisam migração)

```
profiles            → id, email, name, role, status, activation_status, source
products            → slug, price, billing_type, is_active
purchases           → user_id, product_id, payment_status, payment_reference, source, purchased_at
subscriptions       → user_id, product_id, plan_slug, status, started_at, expires_at, payment_reference, source, renewed_at, cancelled_at
payment_events      → event_id, payment_id, event_type, product_slug, user_email, payload, processed, error_message
ai_reports          → user_id, report_type, input_text, output_text
activation_tokens   → user_id, email, token_hash, purpose, expires_at
```

### 7.4 Campos que possivelmente FALTAM (avaliar antes do contrato)
- `purchases.provider` (TEXT) — para distinguir `asaas`, `paymentbeta`, `manual_pix`, etc. **Hoje só existe `source`** que vem misturando "origem comercial" com "provedor de pagamento". Convém separar.
- `purchases.gross_amount` / `purchases.net_amount` / `purchases.fee_amount` — se PaymentBeta retornar valor líquido e taxa.
- `subscriptions.provider` — mesma razão.
- `subscriptions.next_charge_at` — se PaymentBeta gerenciar recorrência (hoje renovação é manual via webhook PAYMENT_RECEIVED).
- `payment_events.provider` (TEXT) — para diferenciar de Asaas legado se ambos coexistirem.
- `profiles.last_purchase_at` / `profiles.lifetime_value` — métricas comerciais úteis, opcional.
- `products.checkout_provider` (TEXT) — se quiser produtos diferentes em provedores diferentes (planilhas Vitalício no PaymentBeta, Pro no Asaas legado, etc).

### 7.5 Como liberar `psicoplanilhas-vitalicio` (vitalício)
- Webhook recebe `PAYMENT_CONFIRMED` (ou equivalente).
- Resolve `profile` pelo e-mail (cria se não existir, igual ao webhook Asaas atual em `asaas/webhook/route.ts:142-235`).
- INSERT em `purchases` com `payment_status='paid'`, `source/provider='paymentbeta'`, `payment_reference=<payment_id>`.
- Função `has_lifetime_access()` já cobre `payment_status in ('paid','manual')` → liberação automática.
- Enviar e-mail de ativação (`auth.resetPasswordForEmail` com `redirectTo=/definir-senha`).

### 7.6 Como liberar `assistente-ia-pro` (anual)
- Webhook recebe `PAYMENT_CONFIRMED`.
- Resolve `profile` (idem).
- UPSERT em `subscriptions`: `status='active'`, `started_at=now()`, `expires_at=now() + 1 year`, `plan_slug='assistente-ia-pro'`, `provider='paymentbeta'`, `payment_reference=<payment_id>`.
- Função `has_active_assistant()` já cobre `status in ('active','manual') AND expires_at >= now()` → liberação automática.
- Para **renovação anual**: ao receber novo `PAYMENT_CONFIRMED` com mesmo email+produto, fazer `UPDATE subscriptions SET expires_at = greatest(expires_at, now()) + interval '1 year', status='active', renewed_at=now() WHERE id = <existing>`.

### 7.7 Como manter Pix manual como emergência
- **Já está implementado** em `src/app/api/admin/manual-client/route.ts` (rota `/admin/importacao` aba "Cadastro manual").
- Aceita liberar vitalício e/ou Pro com `pro_expires_at` customizado.
- Grava `source` em `manual_pix|manual_deposito|manual_cortesia|manual_outro`.
- **Não tocar.** Funciona como fallback total caso PaymentBeta esteja fora.
- Sugestão: depois do PaymentBeta, padronizar a flag (`provider='manual'` vs `source='manual_pix'`) para que dashboards distingam manual de automático.

---

## 8. Qualidade Geral

### TypeScript
`npx tsc --noEmit` → sem erros.
`strict: true` ativado.
Alguns `any` em `confirmModal` (`admin/clientes/[id]/page.tsx:89`) e em `payment_events.payload` — aceitáveis.

### Build
`npm run build` no sandbox: bus error (problema de ambiente, não do código). Recomendo rodar localmente para confirmar.

### Lint
`npm run lint` → sem erros nem warnings.

### Arquivos mortos / duplicações
- `src/lib/supabase.ts` (cliente anon legacy) — não é importado por nenhuma rota usada em produção. Candidato a remoção. Verificar antes.
- Boilerplate de fetch do produto `psicoplanilhas-vitalicio` repetido em 4 rotas e 3 páginas. Extrair `lib/products.ts`.
- Disclaimer "recurso de apoio operacional…" repetido em 6 telas. Extrair componente.
- Ícones inline SVG em `src/app/page.tsx`. Sem padronização (não usa `lucide-react` que está em `package.json`).
- `src/components/ui/button.tsx` existe mas é usado apenas pelo design system embrionário (`shadcn` já no package.json). Há classes Tailwind coladas inline em ~30 botões pelo código. **Falta um sistema de componentes consistente.**

### Textos confusos para público 50+
- "GPT Builder externo" (assistente-gpt e dashboard).
- "(cópia)" no botão de planilha.
- "Ver oferta anual" no cadeado do IA Pro.
- "external_product", "assistant" (vazamento de slugs internos em UI admin).
- "Público: Psicologia" pill em banners.
- Mensagens de erro Supabase em inglês.

### Pontos de UX que podem travar cliente
- Lock screen do IA Pro / GPT confunde quando fetch falha (mostra cadeado de "expirado" quando na verdade é erro de rede).
- "Minha conta" não permite trocar nome ou senha.
- Mobile nav só com ícones.
- Sem link de suporte.
- Banner de erro/sucesso não desaparece sozinho.

---

## 9. Ordem Sugerida de Execução

**Fase 0 — Fix de segurança (urgente, antes do PaymentBeta):**
1. Patch A — proteger `access_url` (P0-1).
2. Patch B — bugfix `importacao` e `clientes/[id]` (P1-1, P1-2).
3. Patch C — padronizar `subscriptions.status` (P1-3, P1-13).
4. Patch D — hardening admin (P1-4, P1-10, P0-3).

**Fase 1 — Preparar terreno para PaymentBeta:**
5. Migration adicionando `provider` e campos comerciais opcionais em `purchases`, `subscriptions`, `payment_events`.
6. Documentar contrato `POST /api/payment/webhook` e `POST /api/payment/create-checkout`.
7. Confirmar que Pix manual segue intacto.

**Fase 2 — PaymentBeta (não escopo desta auditoria):**
8. Plugar PaymentBeta (em outro projeto, conforme instrução).

**Fase 3 — UX 50+:**
9. Patch E — hardening IA Pro (P1-5, P1-6, P1-7).
10. Patch F — UX 50+ (P2-5, P2-6, P2-13, P2-15, P2-16, P2-17).

**Fase 4 — Escala:**
11. Paginação (P2-1).
12. CSRF / rate limit (P2-3).
13. `admin_logs.action` padronizado (P2-2).
14. Tests automatizados (P3-9).
15. Telemetria (P3-6).

---

## 10. Lista "NÃO MEXER AGORA"

Conforme instrução explícita do escopo da auditoria:

- `src/app/api/asaas/create-checkout/route.ts`
- `src/app/api/asaas/webhook/route.ts`
- Qualquer arquivo referente a Asaas / checkout / Payment / cobrança.
- `.env.local` (chaves de Asaas, Supabase, OpenAI).
- `supabase/migrations/20260603000000_payment_events.sql` — manter, é reutilizável pelo PaymentBeta.

A `tabela payment_events` é genérica o suficiente para o PaymentBeta reusar sem migração breaking — recomendo apenas **adicionar** campo `provider`.

---

## Resumo Executivo

O sistema **roda e atende ao piloto**. Antes do PaymentBeta entrar, **três correções são bloqueadoras**:

1. **Proteger `access_url`** dos 101 links — hoje qualquer usuário logado lê via DevTools.
2. **Padronizar `subscriptions.status`** — divergência atual vai confundir o webhook novo.
3. **Corrigir os dois bugs do admin** (filtro de slug em join, comparação booleana errada no cadastro manual).

O resto (UX 50+, hardening de admin, race conditions, telemetria, testes) **pode esperar** o pós-PaymentBeta.

Nenhum código foi alterado nesta auditoria.
