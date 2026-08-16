-- Retira a planilha FDT da biblioteca do PsicoPlanilhas.
--
-- A tela /app/planilhas lista via public.get_my_spreadsheets(), que filtra
-- p.type = 'spreadsheet' and p.is_active = true. Desativar o registro remove
-- o card e o acesso pela biblioteca sem apagar nada.
--
-- Registro alvo (Psico2 / wxiyfudloyyxmnaddljx):
--   id   = 45c48fe4-6913-44e9-87f3-a786e40ef295
--   name = FDT
--   slug = fdt
--
-- Reversível: basta reativar (is_active = true) o mesmo registro.
-- access_url, name, slug, category e sort_order são preservados.
-- Nenhuma outra planilha é tocada.

do $$
declare
  v_rows integer;
begin
  update public.products
  set is_active = false,
      updated_at = now()
  where type = 'spreadsheet'
    and slug = 'fdt'
    and name = 'FDT';

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception
      'Desativação do FDT: esperava atualizar exatamente 1 registro, mas atualizou %.',
      v_rows;
  end if;
end
$$;
