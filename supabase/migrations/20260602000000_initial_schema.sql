-- ==========================================
-- PSICOPLANILHAS 2.0 INITIAL SCHEMA MIGRATION
-- Created: 2026-06-02
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Create Tables
-- ==========================================

-- profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique not null,
  phone text,
  role text not null default 'customer',
  profile_type text not null default 'unknown',
  status text not null default 'active',
  activation_status text not null default 'pending_activation',
  source text,
  imported_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_login_at timestamp with time zone
);

-- products Table (spreadsheets, assistants, bundles, external products)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null,
  audience text not null default 'all',
  category text,
  description text,
  image_url text,
  access_url text,
  tutorial_url text,
  video_url text,
  checkout_url text,
  price numeric(10,2),
  billing_type text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- purchases Table (for one_time purchases like lifetime spreadsheet access)
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  purchase_code text,
  payment_status text not null default 'paid',
  payment_reference text,
  source text,
  purchased_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- subscriptions Table (for recurrent yearly subscriptions like Assistente IA Pro)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  plan_slug text not null,
  status text not null default 'active',
  started_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  renewed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  payment_reference text,
  source text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- activation_tokens Table (Fallback & auditing tokens)
create table public.activation_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  token_hash text not null,
  purpose text not null default 'account_activation',
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- promo_banners Table (Commercial video-banners segmentable by profile)
create table public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  audience text not null default 'all',
  position text not null default 'dashboard_middle',
  image_url text,
  video_url text,
  button_text text,
  button_url text,
  secondary_button_text text,
  secondary_button_url text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ai_reports Table (IA generated report history)
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  report_type text,
  input_text text,
  input_image_url text,
  output_text text not null,
  created_at timestamp with time zone default now()
);

-- email_templates Table (Editable transactional email templates)
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event text not null,
  subject text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- admin_logs Table (Auditing of admin actions)
create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- ==========================================
-- 2. Create Indexes for Performance
-- ==========================================

create index idx_profiles_email on public.profiles(email);
create index idx_profiles_profile_type on public.profiles(profile_type);
create index idx_profiles_activation_status on public.profiles(activation_status);
create index idx_profiles_status on public.profiles(status);

create index idx_products_slug on public.products(slug);
create index idx_products_type on public.products(type);
create index idx_products_audience on public.products(audience);

create index idx_purchases_user_id on public.purchases(user_id);
create index idx_purchases_product_id on public.purchases(product_id);
create index idx_purchases_payment_status on public.purchases(payment_status);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_product_id on public.subscriptions(product_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_expires_at on public.subscriptions(expires_at);

create index idx_activation_tokens_user_id on public.activation_tokens(user_id);
create index idx_activation_tokens_token_hash on public.activation_tokens(token_hash);

create index idx_promo_banners_audience on public.promo_banners(audience);
create index idx_promo_banners_position on public.promo_banners(position);

create index idx_ai_reports_user_id on public.ai_reports(user_id);
create index idx_admin_logs_admin_id on public.admin_logs(admin_id);

-- ==========================================
-- 3. Helper Functions & Triggers
-- ==========================================

-- Automatic updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at to tables
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute procedure public.handle_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute procedure public.handle_updated_at();
create trigger set_promo_banners_updated_at before update on public.promo_banners for each row execute procedure public.handle_updated_at();
create trigger set_email_templates_updated_at before update on public.email_templates for each row execute procedure public.handle_updated_at();

-- Trigger to sync auth.users with public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, profile_type, status, activation_status, source)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    'customer',
    'unknown',
    'active',
    'pending_activation',
    coalesce(new.raw_user_meta_data->>'source', 'signup')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 4. SQL Functions for Access Control
-- ==========================================

-- Function: has_lifetime_access
create or replace function public.has_lifetime_access(user_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.purchases pu
    join public.products p on p.id = pu.product_id
    where pu.user_id = user_uuid
      and p.slug = 'psicoplanilhas-vitalicio'
      and pu.payment_status in ('paid', 'manual')
  );
$$;

-- Function: has_active_assistant
create or replace function public.has_active_assistant(user_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.products p on p.id = s.product_id
    where s.user_id = user_uuid
      and p.slug = 'assistente-ia-pro'
      and s.status in ('active', 'manual')
      and s.expires_at >= now()
  );
$$;

-- ==========================================
-- 5. Views
-- ==========================================

-- view: user_access_status
create or replace view public.user_access_status with (security_invoker = true) as
select
  pr.id as user_id,
  pr.name,
  pr.email,
  pr.profile_type,
  pr.status,
  pr.activation_status,
  pr.last_login_at,
  public.has_lifetime_access(pr.id) as has_lifetime_access,
  public.has_active_assistant(pr.id) as has_active_assistant,
  (
    select max(s.expires_at)
    from public.subscriptions s
    join public.products p on p.id = s.product_id
    where s.user_id = pr.id
      and p.slug = 'assistente-ia-pro'
  ) as assistant_expires_at
from public.profiles pr;

-- ==========================================
-- 6. Row Level Security (RLS) Policies
-- ==========================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activation_tokens enable row level security;
alter table public.promo_banners enable row level security;
alter table public.ai_reports enable row level security;
alter table public.email_templates enable row level security;
alter table public.admin_logs enable row level security;

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Profiles Policies
create policy "Admins have full access on profiles" on public.profiles
  for all using (public.is_admin());
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update non-role fields of own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and (role = (select role from public.profiles where id = auth.uid())));

-- Products Policies
create policy "Admins have full access on products" on public.products
  for all using (public.is_admin());
create policy "Anyone can read active products" on public.products
  for select using (is_active = true);

-- Purchases Policies
create policy "Admins have full access on purchases" on public.purchases
  for all using (public.is_admin());
create policy "Users can read own purchases" on public.purchases
  for select using (auth.uid() = user_id);

-- Subscriptions Policies
create policy "Admins have full access on subscriptions" on public.subscriptions
  for all using (public.is_admin());
create policy "Users can read own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Activation Tokens Policies
create policy "Admins have full access on activation_tokens" on public.activation_tokens
  for all using (public.is_admin());

-- Promo Banners Policies
create policy "Admins have full access on promo_banners" on public.promo_banners
  for all using (public.is_admin());
create policy "Anyone can read active banners" on public.promo_banners
  for select using (is_active = true);

-- AI Reports Policies
create policy "Admins have full access on ai_reports" on public.ai_reports
  for all using (public.is_admin());
create policy "Users can read own ai_reports" on public.ai_reports
  for select using (auth.uid() = user_id);
create policy "Users can insert own ai_reports" on public.ai_reports
  for insert with check (auth.uid() = user_id and public.has_active_assistant(auth.uid()));

-- Email Templates Policies
create policy "Admins have full access on email_templates" on public.email_templates
  for all using (public.is_admin());

-- Admin Logs Policies
create policy "Admins can read admin_logs" on public.admin_logs
  for select using (public.is_admin());
create policy "Admins can insert admin_logs" on public.admin_logs
  for insert with check (public.is_admin());

-- ==========================================
-- 7. Seed Mandatory Products
-- ==========================================

insert into public.products (name, slug, type, price, billing_type, audience, description, is_active)
values 
(
  'PsicoPlanilhas Vitalício', 
  'psicoplanilhas-vitalicio', 
  'bundle', 
  97.00, 
  'one_time', 
  'all', 
  'Acesso vitalício à biblioteca de planilhas profissionais de apoio operacional e ao assistente GPT Builder externo.', 
  true
),
(
  'Assistente IA Pro', 
  'assistente-ia-pro', 
  'assistant', 
  50.00, 
  'yearly', 
  'all', 
  'Assinatura anual de acesso ao Assistente IA Pro para geração de relatórios profissionais de apoio operacional.', 
  true
);
