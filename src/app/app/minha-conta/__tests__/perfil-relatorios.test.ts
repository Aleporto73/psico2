// Guarda do "Perfil para relatórios" de Minha Conta, no mesmo padrão de
// leitura de fonte já usado em corrigefacil/__tests__/report-ux.test.ts.
//
// A regressão que este arquivo existe para pegar não é o campo novo — é o
// contrário: um campo ANTIGO cair do payload de update sem ninguém notar.
// `handleUpdateReportProfile` grava um objeto literal, então esquecer uma
// linha ali faz o campo parar de persistir em silêncio, sem erro de tipo e
// sem erro em runtime.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(
  join(process.cwd(), 'src/app/app/minha-conta/page.tsx'),
  'utf8',
);

/** Só o corpo do update do perfil para relatórios: as asserções abaixo falam
 *  do que é PERSISTIDO, e não do que aparece em qualquer lugar do arquivo. */
const updateBody = (() => {
  const inicio = page.indexOf('const handleUpdateReportProfile');
  const fim = page.indexOf('const formatDate', inicio);
  return page.slice(inicio, fim);
})();

describe('Minha Conta — perfil para relatórios', () => {
  it('persiste os cinco campos que já existiam', () => {
    expect(updateBody).toContain('display_name: displayName.trim() || null');
    expect(updateBody).toContain('gender: gender || null');
    expect(updateBody).toContain('profession_category: professionCategory || null');
    expect(updateBody).toContain('credential_type: credentialType || null');
    expect(updateBody).toContain('credential_number: credentialNumber.trim() || null');
  });

  it('persiste a clínica, e campo vazio vira null em vez de string vazia', () => {
    expect(updateBody).toContain('clinic_name: clinicName.trim() || null');
  });

  it('carrega a clínica do perfil tratando null como vazio', () => {
    expect(page).toContain("setClinicName(prof.clinic_name || '')");
  });

  it('oferece os dois campos separados na tela', () => {
    expect(page).toContain('Nome profissional');
    expect(page).toContain('Clínica / consultório (opcional)');
    expect(page).toContain('id="clinic_name"');
  });

  // A frase que dizia que o nome de exibição "pode ser seu nome ou o nome
  // fantasia da clínica" era a própria ambiguidade que este bloco desfaz.
  it('não volta a dizer que um campo só serve para pessoa e clínica', () => {
    expect(page).not.toContain('nome fantasia da clínica');
  });

  // Trava de escopo do Bloco 6: a clínica é cadastral por enquanto.
  it('não introduz contato, endereço nem logo', () => {
    expect(page).not.toContain('clinic_logo');
    expect(page).not.toContain('professional_email');
    expect(page).not.toContain('professional_phone');
  });
});
