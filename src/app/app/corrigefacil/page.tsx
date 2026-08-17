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
// A rota é anunciada no AppShell para TODO usuário autenticado e tem card
// próprio no Dashboard. Isso é descoberta, não autorização: a decisão entre
// catálogo e página de venda continua sendo tomada aqui, no servidor, a cada
// requisição.
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
