import { createClient } from '@/utils/supabase/server';
import { temAcessoCorrigeFacil, type ClienteDeAcesso } from './access';
import { CorrigeFacilCatalogClient } from './CorrigeFacilCatalogClient';
import { CorrigeFacilLocked } from './CorrigeFacilLocked';

// Server Component: trava REAL de acesso do CorrigeFácil. Fail-closed —
// qualquer erro na consulta OU acesso não confirmado mostra a tela de venda.
// Espelha o padrão do Doc Studio, com uma diferença: o direito vem da função
// has_corrigefacil_access no banco, não de uma coluna de view.
//
// A consulta acontece AQUI e só aqui. Não entra no layout: uma verificação
// global sobrecarregaria todas as páginas de /app para atender uma rota.
//
// A rota não aparece no AppShell nesta etapa. Ela existe, responde e é
// navegável por URL, mas não é anunciada enquanto a Edge não estiver em
// produção, o produto não estiver cadastrado e as telas de aplicação não
// estiverem integradas.
export default async function CorrigeFacilPage() {
  const supabase = await createClient();
  const temAcesso = await temAcessoCorrigeFacil(
    supabase as unknown as ClienteDeAcesso,
  );

  if (!temAcesso) {
    return <CorrigeFacilLocked />;
  }

  return <CorrigeFacilCatalogClient />;
}
