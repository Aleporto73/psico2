-- ============================================================
-- Atualização comercial — preço do PsicoPlanilhas Flow: R$39 → R$47
-- Created: 2026-07-01
-- ============================================================
-- Motivo:
--   Reajuste comercial do produto avulso PsicoPlanilhas Flow.
--   A página /app/flow já exibe R$47,00 em texto; a página
--   /app/produtos lê products.price dinamicamente do banco. Esta
--   migration sincroniza o catálogo para que as duas páginas mostrem
--   o mesmo valor.
--
--   Altera SOMENTE a coluna price da linha slug = 'psicoplanilhas-flow'.
--   NÃO toca em billing_type, access_url nem is_active, e não afeta
--   nenhum outro produto (WHERE por slug). Não mexe em
--   pagamento/webhook/token/frontend.
-- ============================================================

begin;

update public.products
   set price = 47.00
 where slug = 'psicoplanilhas-flow';

commit;
