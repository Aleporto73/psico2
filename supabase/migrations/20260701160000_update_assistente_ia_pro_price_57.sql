-- ============================================================
-- Atualização comercial — preço do Assistente IA Pro: R$50 → R$57
-- Created: 2026-07-01
-- ============================================================
-- Motivo:
--   Reajuste comercial da assinatura anual Assistente IA Pro
--   (Assistente de Relatórios IA). Os textos visíveis já exibem
--   R$57/ano; a página /app/produtos lê products.price dinamicamente
--   do banco. Esta migration sincroniza o catálogo para que os textos
--   e o card dinâmico mostrem o mesmo valor.
--
--   Altera SOMENTE a coluna price da linha slug = 'assistente-ia-pro'.
--   NÃO toca em billing_type, checkout_url, access_url nem is_active,
--   e não afeta nenhum outro produto (WHERE por slug). Não mexe em
--   pagamento/webhook/Flow/frontend.
-- ============================================================

begin;

update public.products
   set price = 57.00
 where slug = 'assistente-ia-pro';

commit;
