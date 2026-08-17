-- ==========================================
-- FUNDAÇÃO DO INSTRUMENTO GRATUITO NO CORRIGEFÁCIL
-- Created: 2026-08-17
-- ==========================================
-- Primeira etapa da liberação do FDT como experiência real do CorrigeFácil
-- para quem ainda não comprou o produto.
--
-- Esta migration é SOMENTE fundação de banco. Nada nela é consumido ainda: a
-- rota de avaliação, a página de venda e a Edge Function `corrigir` continuam
-- decidindo por `has_corrigefacil_access`, exatamente como hoje. Aplicá-la
-- não muda o comportamento de nenhuma tela nem de nenhuma rota — quem passa a
-- consumir a função nova são os PRs seguintes.
--
-- DUAS PEÇAS, COM PAPÉIS DIFERENTES
--
--   instruments.is_free_demo                      -> o DADO
--   can_access_corrigefacil_instrument(uuid,text) -> a INTERFACE
--
-- A flag mora no catálogo porque é lá que o instrumento já mora: trocar ou
-- acrescentar um instrumento gratuito passa a ser UPDATE, e não deploy de
-- Edge. A decisão mora numa função porque ela precisa ser a MESMA para o
-- Server Component e para a Edge, que vivem em repositórios diferentes —
-- duas cópias de um `code = 'FDT'` divergiriam no primeiro dia em que a
-- lista mudasse, e divergiriam em silêncio.
--
-- O QUE ESTA MIGRATION NÃO FAZ, de propósito:
--
--   - não altera `has_corrigefacil_access`. A regra comercial do produto
--     (admin, purchases, paid/manual, produto ativo) continua com um dono
--     só, e este arquivo não a reescreve nem a copia;
--   - não cria purchase, subscription nem entitlement de espécie alguma. Um
--     instrumento gratuito NÃO é uma compra parcial do CorrigeFácil, e
--     modelá-lo como compra apagaria a diferença entre experimentar e ter;
--   - não toca RLS, policy, nem grant de tabela;
--   - não mexe em `is_active`, norma, escala, item, scoring ou catálogo do
--     FDT. O instrumento continua exatamente o que era.
-- ==========================================


-- ------------------------------------------------------------------
-- 1 · O DADO
-- ------------------------------------------------------------------
-- `not null default false`: o padrão é o comportamento de hoje. Os outros
-- vinte instrumentos nascem com a coluna preenchida e fechados, e um
-- instrumento novo entra fechado sem ninguém precisar lembrar disso.

alter table public.instruments
  add column if not exists is_free_demo boolean not null default false;

comment on column public.instruments.is_free_demo is
  'Instrumento que pode ser aplicado por usuário autenticado sem o direito completo do CorrigeFácil. Lido apenas por can_access_corrigefacil_instrument(); não participa de cálculo, norma, escala nem da listagem do catálogo.';


-- ------------------------------------------------------------------
-- 2 · O ÚNICO INSTRUMENTO MARCADO
-- ------------------------------------------------------------------
-- Registro alvo (Psico2 / wxiyfudloyyxmnaddljx):
--   id   = 392f962d-0f67-48a7-8545-6a57897cd1f5
--   code = FDT
--   name = Teste dos Cinco Dígitos
--
-- `instruments.code` é UNIQUE, então a cláusula alcança no máximo uma linha.
-- As duas guardas abaixo existem porque uma marcação errada aqui liberaria
-- um instrumento pago para a base inteira, e falharia calada:
--
--   1. row_count <> 1  -> o FDT sumiu, mudou de código, ou a cláusula pegou
--                         mais de um registro;
--   2. conjunto final  -> alguém já havia marcado outro instrumento antes
--                         desta migration.
--
-- As duas abortam a transação inteira. Mesmo padrão de
-- 20260816120000_deactivate_fdt_spreadsheet.sql.
--
-- Reversível: `update public.instruments set is_free_demo = false`.

do $$
declare
  v_rows      integer;
  v_free_demo text[];
begin
  update public.instruments
     set is_free_demo = true
   where code = 'FDT';

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception
      'FDT gratuito: esperava marcar exatamente 1 instrumento, mas marcou %.',
      v_rows;
  end if;

  select coalesce(array_agg(i.code order by i.code), '{}'::text[])
    into v_free_demo
    from public.instruments i
   where i.is_free_demo;

  if v_free_demo <> array['FDT']::text[] then
    raise exception
      'FDT gratuito: ao final o conjunto is_free_demo deveria ser {FDT}, mas é %.',
      v_free_demo;
  end if;
end
$$;


-- ------------------------------------------------------------------
-- 3 · A INTERFACE
-- ------------------------------------------------------------------
-- Autorização de UM instrumento, para UM usuário.
--
-- COMPOSIÇÃO, NÃO REESCRITA. O primeiro operando é a chamada literal a
-- `has_corrigefacil_access`. Nada de admin, purchases, payment_status ou
-- products aparece aqui: quem sabe disso é aquela função, e ela continua
-- sendo o único lugar onde a regra comercial mora. O dia em que a regra
-- mudar — um produto novo, um status de pagamento novo —, ela muda num
-- arquivo só e esta função acompanha sem ser tocada.
--
-- CONTRATO DE COMPATIBILIDADE, e é o ponto mais importante deste arquivo:
--
--   can_access_corrigefacil_instrument(u, null) = has_corrigefacil_access(u)
--
-- para todo u. `instrument_code is not null` devolve FALSE (nunca null)
-- quando o código é nulo, o `and` inteiro vira false, e `X or false` é X —
-- byte por byte o direito de hoje. É isso que permite trocar a consulta nas
-- rotas que não têm código (GET /catalogo, a lista) sem mudar nada, e é o
-- que os PRs seguintes vão se apoiar.
--
-- PERFIL BLOQUEADO. `has_corrigefacil_access` exige `pr.status = 'active'`
-- dentro da própria regra; o caminho gratuito precisa exigir o mesmo, senão
-- a exceção do FDT afrouxaria o bloqueio de perfil como efeito colateral —
-- hoje uma conta bloqueada não corrige nada, e depois desta migration ela
-- continua não corrigindo nada. Repetir `status = 'active'` aqui não é
-- duplicar a regra comercial: é a guarda de identidade, e ela não tem
-- helper próprio no schema (só existe `is_admin()`, que é outra coisa).
--
-- NULL: nenhum caminho devolve null. `exists` nunca é null, `is not null`
-- nunca é null, e o `or` de dois booleanos não-nulos é não-nulo. Quem
-- consome pode comparar com `= true` estrito — que é o que a Edge faz.
--
-- Espelha `has_corrigefacil_access` em tudo o que é forma: language sql,
-- stable, security definer, search_path fixo, mesmos grants.

create or replace function public.can_access_corrigefacil_instrument(
  user_uuid       uuid,
  instrument_code text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- (1) direito completo do produto: libera qualquer instrumento
    public.has_corrigefacil_access(user_uuid)
    -- (2) exceção do instrumento gratuito: só com código, só com perfil
    --     ativo, só com instrumento publicado e marcado
    or (
      instrument_code is not null
      and exists (
        select 1
          from public.profiles pr
         where pr.id     = user_uuid
           and pr.status = 'active'
      )
      and exists (
        select 1
          from public.instruments i
         where i.code         = instrument_code
           and i.is_active    = true
           and i.is_free_demo = true
      )
    );
$$;

comment on function public.can_access_corrigefacil_instrument(uuid, text) is
  'Direito de aplicar UM instrumento do CorrigeFácil. Com instrument_code nulo devolve exatamente has_corrigefacil_access(user_uuid). Com código informado, acrescenta a esse direito os instrumentos ativos marcados is_free_demo, e somente para perfil ativo. Não substitui, não altera e não duplica has_corrigefacil_access.';

-- Menor privilégio, idêntico ao de has_corrigefacil_access: `authenticated`
-- para o Server Component, `service_role` para a Edge Function `corrigir`,
-- que abre a conexão como service_role. `anon` não entra — instrumento
-- gratuito continua exigindo conta.
revoke all on function public.can_access_corrigefacil_instrument(uuid, text) from public;
revoke all on function public.can_access_corrigefacil_instrument(uuid, text) from anon;
grant execute on function public.can_access_corrigefacil_instrument(uuid, text) to authenticated;
grant execute on function public.can_access_corrigefacil_instrument(uuid, text) to service_role;
