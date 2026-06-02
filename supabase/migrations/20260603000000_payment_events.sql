-- Create payment_events table
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  payment_id text not null,
  event_type text not null,
  product_slug text,
  user_email text,
  payload jsonb not null,
  processed boolean not null default false,
  error_message text,
  created_at timestamp with time zone default now(),
  unique(payment_id, event_type)
);

-- Enable RLS
alter table public.payment_events enable row level security;

-- Policy for Select (Admins only)
create policy "Admins can read payment_events" on public.payment_events
  for select using (public.is_admin());

-- Indexes for performance
create index idx_payment_events_payment_id on public.payment_events(payment_id);
create index idx_payment_events_event_type on public.payment_events(event_type);
