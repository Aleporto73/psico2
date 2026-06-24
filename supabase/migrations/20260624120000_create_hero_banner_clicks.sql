-- ==========================================
-- HERO BANNER CLICKS (tracking — Sistema B)
-- Created: 2026-06-24
-- Depends on: 20260624000000_create_hero_banners.sql
-- ==========================================
-- Registra cliques nos banners do componente HeroBanner para análise.
-- Tabela append-only (imutável): sem updated_at, sem trigger, sem created_by.
-- position e audience_at_click são SNAPSHOTS no momento do clique, então
-- preservam a informação mesmo que o banner seja editado ou deletado.
--
-- Convencoes seguidas (20260624000000_create_hero_banners):
--   - Admin = profiles.role = 'admin', via public.is_admin().
--   - FKs para public.profiles(id) / public.hero_banners(id).
-- ==========================================

-- ---- 1. Tabela hero_banner_clicks ----

create table if not exists public.hero_banner_clicks (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.hero_banners(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  position text not null,
  audience_at_click text,
  clicked_at timestamp with time zone not null default now()
);

comment on table public.hero_banner_clicks is 'Cliques nos banners do componente HeroBanner (Sistema B). Append-only para análise. Gerado pela Fase 8.';
comment on column public.hero_banner_clicks.position is 'Snapshot da posicao do banner no clique (dashboard/planilhas/produtos). Preservado mesmo se o banner mudar/for deletado.';
comment on column public.hero_banner_clicks.audience_at_click is 'Snapshot do audience do banner no momento do clique.';

create index if not exists idx_hero_banner_clicks_banner_time on public.hero_banner_clicks(banner_id, clicked_at desc);
create index if not exists idx_hero_banner_clicks_position_time on public.hero_banner_clicks(position, clicked_at desc);

-- ---- 2. RLS ----

alter table public.hero_banner_clicks enable row level security;

-- INSERT: usuario autenticado registra clique proprio (ou anonimo via null).
-- with check impede forjar clique com user_id de outra pessoa.
drop policy if exists "hero_banner_clicks_insert_own" on public.hero_banner_clicks;
create policy "hero_banner_clicks_insert_own"
  on public.hero_banner_clicks
  for insert
  to authenticated
  with check (user_id = auth.uid() or user_id is null);

-- SELECT: somente admin ve os cliques (analise).
drop policy if exists "hero_banner_clicks_admin_read" on public.hero_banner_clicks;
create policy "hero_banner_clicks_admin_read"
  on public.hero_banner_clicks
  for select
  using (public.is_admin());

-- UPDATE/DELETE: nenhuma policy — ninguem via API. Limpeza so via service role / SQL manual.
