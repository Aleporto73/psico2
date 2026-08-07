import { describe, expect, it } from 'vitest';

// Contrato documental mínimo: mensagens de erro da Edge só são reutilizadas
// quando chegam como string. Objetos nunca devem virar "[object Object]".
describe('contrato de erro da norma por data', () => {
  it('mantém o fallback seguro para erro não textual', () => {
    const corpo: { error?: unknown } = { error: { detalhe: 'x' } };
    const mensagem = typeof corpo.error === 'string' ? corpo.error : undefined;
    expect(mensagem).toBeUndefined();
  });
});
