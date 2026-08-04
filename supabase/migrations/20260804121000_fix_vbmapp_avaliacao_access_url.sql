-- Corrige somente o link da planilha VB-MAPP (Avaliação).
-- A planilha VB-MAPP (Coleta de Dados) não é alterada.

do $$
declare
  v_rows integer;
begin
  update public.products
  set access_url = 'https://docs.google.com/spreadsheets/d/1dOlKSFTa42Gpm1L8j9ZuTmL4bTrenH41/edit?usp=sharing&ouid=107122907926176886892&rtpof=true&sd=true'
  where type = 'spreadsheet'
    and name = 'VB-MAPP (Avaliação) – Avaliação de Marcos do Comportamento Verbal'
    and description ilike 'VB-MAPP (Avaliação) – Avaliação de Marcos do Comportamento Verbal%';

  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception
      'Correção VB-MAPP (Avaliação): esperava atualizar exatamente 1 registro, mas atualizou %.',
      v_rows;
  end if;
end
$$;
