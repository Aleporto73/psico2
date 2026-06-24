-- ==========================================
-- HERO BANNERS SYSTEM (Sistema B)
-- Created: 2026-06-24
-- ==========================================
-- Sistema simples de banners visuais Canva exibidos no componente
-- HeroBanner, gerenciaveis via /admin/banners-canva sem deploy.
-- Independente de promo_banners (Sistema A), que continua intacto.
--
-- Convencoes seguidas do schema existente (20260602000000_initial_schema):
--   - Admin = profiles.role = 'admin', verificado via public.is_admin().
--     NAO existe tabela "admins" neste projeto.
--   - updated_at via funcao compartilhada public.handle_updated_at().
--   - RLS no padrao promo_banners: "for all using (is_admin())" para
--     admin + "for select using (is_active = true)" para leitura publica.
-- ==========================================

-- ---- 1. Tabela hero_banners ----

create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link_url text,
  position text not null check (position in ('dashboard', 'planilhas', 'produtos')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  audience text not null default 'all' check (audience in ('all', 'psychologist', 'psychopedagogue', 'both')),
  alt_text text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

comment on table public.hero_banners is 'Banners visuais Canva exibidos no componente HeroBanner. Gerenciaveis via /admin/banners-canva sem deploy.';
comment on column public.hero_banners.position is 'Onde o banner aparece: dashboard (topo), planilhas (sticky), produtos (topo)';
comment on column public.hero_banners.audience is 'Segmentacao por perfil profissional. all = todos.';
comment on column public.hero_banners.sort_order is 'Ordem entre banners da mesma posicao. Menor = primeiro.';

create index if not exists idx_hero_banners_position_active on public.hero_banners(position, is_active);
create index if not exists idx_hero_banners_audience on public.hero_banners(audience);

-- ---- 2. Trigger updated_at (reusa funcao compartilhada existente) ----

drop trigger if exists set_hero_banners_updated_at on public.hero_banners;
create trigger set_hero_banners_updated_at
  before update on public.hero_banners
  for each row execute procedure public.handle_updated_at();

-- ---- 3. RLS ----

alter table public.hero_banners enable row level security;

-- Admin: acesso total (read all + insert + update + delete) via is_admin()
drop policy if exists "Admins have full access on hero_banners" on public.hero_banners;
create policy "Admins have full access on hero_banners" on public.hero_banners
  for all using (public.is_admin()) with check (public.is_admin());

-- Leitura: qualquer um pode ler banners ativos
drop policy if exists "Anyone can read active hero_banners" on public.hero_banners;
create policy "Anyone can read active hero_banners" on public.hero_banners
  for select using (is_active = true);

-- ---- 4. Storage bucket hero-banners ----

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-banners',
  'hero-banners',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Leitura publica (bucket public = true)
drop policy if exists "hero_banners_storage_read" on storage.objects;
create policy "hero_banners_storage_read" on storage.objects
  for select
  using (bucket_id = 'hero-banners');

-- Admin: upload
drop policy if exists "hero_banners_storage_admin_insert" on storage.objects;
create policy "hero_banners_storage_admin_insert" on storage.objects
  for insert
  with check (bucket_id = 'hero-banners' and public.is_admin());

-- Admin: update (necessario para upsert de arquivos)
drop policy if exists "hero_banners_storage_admin_update" on storage.objects;
create policy "hero_banners_storage_admin_update" on storage.objects
  for update
  using (bucket_id = 'hero-banners' and public.is_admin())
  with check (bucket_id = 'hero-banners' and public.is_admin());

-- Admin: delete
drop policy if exists "hero_banners_storage_admin_delete" on storage.objects;
create policy "hero_banners_storage_admin_delete" on storage.objects
  for delete
  using (bucket_id = 'hero-banners' and public.is_admin());
