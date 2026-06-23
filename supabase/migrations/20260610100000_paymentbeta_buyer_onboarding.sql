-- ==========================================
-- PAYMENTBETA BUYER ONBOARDING
-- Created: 2026-06-10
-- Depends on: 20260610090000_create_paymentbeta_webhook_events.sql
-- ==========================================
-- A) Unique constraints to make entitlement grants idempotent (B1).
--    Terreno confirmado SEM duplicatas antes da aplicação.
--    Índices parciais para payment_reference (constraint UNIQUE não suporta WHERE).

create unique index if not exists purchases_payment_reference_uidx
  on public.purchases (payment_reference)
  where payment_reference is not null;

create unique index if not exists subscriptions_payment_reference_uidx
  on public.subscriptions (payment_reference)
  where payment_reference is not null;

create unique index if not exists purchases_user_product_uidx
  on public.purchases (user_id, product_id);

create unique index if not exists subscriptions_user_product_uidx
  on public.subscriptions (user_id, product_id);

-- B) Audit columns on paymentbeta_webhook_events, filled by the handler on processing.

alter table public.paymentbeta_webhook_events
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

alter table public.paymentbeta_webhook_events
  add column if not exists user_created boolean;

alter table public.paymentbeta_webhook_events
  add column if not exists onboarding_email_status text;

alter table public.paymentbeta_webhook_events
  add column if not exists onboarding_email_sent_at timestamptz;

create index if not exists idx_paymentbeta_webhook_events_user_id
  on public.paymentbeta_webhook_events (user_id);
