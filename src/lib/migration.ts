// Modo migração — liga durante a onda de ativação dos clientes legados (v1→v2).
// Uma única flag afrouxa as duas travas de tempo do fluxo de ativação. Para
// voltar ao normal, defina NEXT_PUBLIC_MIGRATION_MODE=false (ou remova a var)
// e rebuilde: os valores originais voltam sozinhos. As travas continuam
// existindo — só passam a ser controladas por esta flag.
//
// Precisa do prefixo NEXT_PUBLIC_ porque a trava client-side (ativar-acesso)
// roda no browser e só enxerga env vars inlined com esse prefixo. A mesma var
// é lida no server (route handler), então UMA variável controla os dois lados.
// (NEXT_PUBLIC_ é congelada no build; como o toggle já exige rebuild+deploy,
//  isso é aceitável aqui.)
export const MIGRATION_MODE = process.env.NEXT_PUBLIC_MIGRATION_MODE === 'true';

// Trava client-side: intervalo mínimo entre pedidos de link de ativação.
export const ACTIVATION_COOLDOWN_MS = MIGRATION_MODE ? 30_000 : 5 * 60_000;

// Trava server-side: janela de throttle registrada em activation_tokens.
export const ACTIVATION_THROTTLE_MS = MIGRATION_MODE ? 60_000 : 15 * 60_000;
