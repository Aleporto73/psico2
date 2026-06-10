create table if not exists public.paymentbeta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null,
  transaction_id text not null,
  event text not null,
  event_version text,
  entitlement_code text,
  customer_email text,
  payment_status text,
  raw_payload jsonb,
  status text not null default 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists paymentbeta_webhook_events_delivery_uidx
  on public.paymentbeta_webhook_events (delivery_id);

create unique index if not exists paymentbeta_webhook_events_tx_event_uidx
  on public.paymentbeta_webhook_events (transaction_id, event);

create index if not exists idx_paymentbeta_webhook_events_customer_email
  on public.paymentbeta_webhook_events (customer_email);

create index if not exists idx_paymentbeta_webhook_events_status
  on public.paymentbeta_webhook_events (status);

alter table public.paymentbeta_webhook_events enable row level security;

drop policy if exists "Admins can read paymentbeta webhook events"
  on public.paymentbeta_webhook_events;
