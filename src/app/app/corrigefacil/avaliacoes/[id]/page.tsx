import { DetalheClient } from './DetalheClient';

// Detalhe de uma avaliação salva. EXIGE apenas autenticação (middleware), e
// NÃO passa pelo gate comercial — mesma razão do histórico.
//
// Posse é da Edge: GET /avaliacao/:id filtra por user_id e responde 404 tanto
// para inexistente quanto para avaliação de outro usuário. A tela não tenta
// distinguir os dois casos, e é assim que a existência de um registro alheio
// não vaza.
export default async function DetalheAvaliacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalheClient id={decodeURIComponent(id)} />;
}
