import { describe, expect, it } from 'vitest';
import {
  formatCredential,
  getCredentialLabel,
  getProfessionLabel,
} from '../professional-identity';

describe('identidade profissional — profissão flexionada', () => {
  it('flexiona no feminino', () => {
    expect(getProfessionLabel('psicologo', 'F')).toBe('Psicóloga');
  });

  it('flexiona no masculino', () => {
    expect(getProfessionLabel('psicologo', 'M')).toBe('Psicólogo');
  });

  // Gênero ausente é o caso comum de perfil incompleto: precisa produzir a
  // forma neutra publicável, não string vazia nem exceção.
  it('sem gênero cai na forma neutra, nas três formas de ausência', () => {
    expect(getProfessionLabel('psicologo', null)).toBe('Psicólogo(a)');
    expect(getProfessionLabel('psicologo', undefined)).toBe('Psicólogo(a)');
    expect(getProfessionLabel('psicologo', '')).toBe('Psicólogo(a)');
  });

  it('categoria ausente ou "outro" não recebe rótulo', () => {
    expect(getProfessionLabel(null, 'F')).toBe('');
    expect(getProfessionLabel('outro', 'F')).toBe('');
  });

  // A regra que motivou o bloco: código de banco nunca pode vazar como texto.
  it('categoria desconhecida sai vazia em vez de devolver o código cru', () => {
    expect(getProfessionLabel('categoria_que_nao_existe', 'F')).toBe('');
  });
});

describe('identidade profissional — credencial', () => {
  it('traduz a sigla', () => {
    expect(getCredentialLabel('crp')).toBe('CRP');
    expect(getCredentialLabel('crfa')).toBe('CRFa');
  });

  it('ausência declarada não vira sigla', () => {
    expect(getCredentialLabel('outro')).toBe('');
    expect(getCredentialLabel('nao_informado')).toBe('');
    expect(getCredentialLabel(null)).toBe('');
  });

  it('formata sigla e número juntos', () => {
    expect(formatCredential('crp', '06/12345')).toBe('CRP 06/12345');
  });

  // TRAVA DO COMPORTAMENTO LEGADO DO DOC STUDIO. Não "corrigir" para string
  // vazia: lá a credencial aparece ao lado do nome de quem assina, e o número
  // sozinho ainda informa. Quem precisa da SIGLA para publicar a linha é o
  // prompt do CorrigeFácil, e esse gate mora em `professionalText` — não aqui.
  it('sem sigla publicável sobra só o número, sem o código cru', () => {
    expect(formatCredential('outro', '12345')).toBe('12345');
  });

  it('sem número sobra só a sigla', () => {
    expect(formatCredential('crp', null)).toBe('CRP');
    expect(formatCredential('crp', '   ')).toBe('CRP');
  });

  it('sem nada devolve vazio, para quem chama omitir a linha', () => {
    expect(formatCredential(null, null)).toBe('');
  });
});
