import { describe, expect, it } from 'vitest';
import type { DocStudioTemplate, DraftFields, ReportProfile } from '../types';
import { initialDraft, templates } from '../templates';
import { composePlainText } from '../lib/copy';

const template = templates.find((item) => item.id === 'family-feedback') as DocStudioTemplate;

const profile: ReportProfile = {
  profile_type: 'psychopedagogue',
  display_name: 'Clínica Aprender Mais',
  gender: 'F',
  profession_category: 'neuropsicopedagogo',
  credential_type: 'cbo_2394_40',
  credential_number: '12345',
};

const fields: DraftFields = {
  ...initialDraft,
  subjectName: 'Fulano',
  subjectAge: '8 anos',
  documentPurpose: 'Devolutiva à família',
  context: 'Contexto de teste',
};

describe('composePlainText', () => {
  it('inclui cabeçalho quando showHeader e perfil presentes', () => {
    const text = composePlainText(profile, template, fields, true, false);
    expect(text.startsWith('Clínica Aprender Mais')).toBe(true);
    expect(text).toContain('Neuropsicopedagoga');
  });

  it('omite cabeçalho quando showHeader é false', () => {
    const text = composePlainText(profile, template, fields, false, false);
    expect(text.startsWith('Clínica Aprender Mais')).toBe(false);
    expect(text.startsWith(template.title)).toBe(true);
  });

  it('inclui título, campos guiados preenchidos e rodapé ético', () => {
    const text = composePlainText(profile, template, fields, true, false);
    expect(text).toContain(template.title);
    expect(text).toContain('Avaliado(a): Fulano');
    expect(text).toContain('Contexto de teste');
    expect(text).toContain('Observação ética');
    expect(text).toContain(template.ethicalFooter);
  });

  it('adiciona bloco de assinatura quando showSignature é true', () => {
    const text = composePlainText(profile, template, fields, true, true);
    expect(text).toContain('Assinatura');
    expect(text).toContain('Registro: CBO 2394-40 12345');
  });

  it('sinaliza dados profissionais ausentes na assinatura', () => {
    const bareProfile: ReportProfile = {
      profile_type: null,
      display_name: null,
      gender: null,
      profession_category: null,
      credential_type: null,
      credential_number: null,
    };
    const text = composePlainText(bareProfile, template, fields, false, true);
    expect(text).toContain('Dados profissionais não informados');
  });
});
