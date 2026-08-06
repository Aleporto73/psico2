import { HistoricoClient } from './HistoricoClient';

// Histórico próprio. EXIGE apenas usuário autenticado — e essa exigência já é
// atendida pelo middleware, que redireciona /app/* sem sessão para /login.
//
// NÃO passa pelo gate comercial, de propósito: é a decisão de produto travada
// na Edge (has_corrigefacil_access não é consultada em GET /avaliacoes nem em
// GET /avaliacao/:id). Quem perdeu o acesso continua lendo o que já gravou —
// cortar isso apagaria na prática um laudo entregue.
//
// A posse é da Edge: a cláusula user_id em toda query. Aqui não se decide
// quem vê o quê.
export default function HistoricoPage() {
  return <HistoricoClient />;
}
