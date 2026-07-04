import { describe, expect, it } from 'vitest';
import type { ReportProfile } from '../types';
import { buildHeader, getProfessionalSignature } from '../lib/profile';
import { lineFromProfileType } from '../templates';

const fullProfile: ReportProfile = {
  profile_type: 'psychopedagogue',
  display_name: 'Clínica Aprender Mais',
  gender: 'F',
  profession_category: 'neuropsicopedagogo',
  credential_type: 'cbo_2394_40',
  credential_number: '',
};

describe('buildHeader', () => {
  it('monta nome e subtítulo com profissão flexionada', () => {
    const header = buildHeader(fullProfile);
    expect(header.name).toBe('Clínica Aprender Mais');
    expect(header.subtitle).toContain('Neuropsicopedagoga');
    expect(header.subtitle).toContain('CBO 2394-40');
  });

  it('usa placeholders quando o perfil é nulo', () => {
    const header = buildHeader(null);
    expect(header.name).toBe('Nome profissional');
    expect(header.subtitle).toBe('Identificação profissional');
  });
});

describe('getProfessionalSignature', () => {
  it('marca itens faltantes quando não há nome', () => {
    const signature = getProfessionalSignature({ ...fullProfile, display_name: null });
    expect(signature.missingItems).toContain('nome profissional');
    expect(signature.hasAny).toBe(true);
  });

  it('não tem itens faltantes com perfil completo', () => {
    const signature = getProfessionalSignature({ ...fullProfile, credential_number: '12345' });
    expect(signature.missingItems).toHaveLength(0);
    expect(signature.credential).toContain('CBO 2394-40 12345');
  });
});

describe('lineFromProfileType', () => {
  it('mapeia psychologist para a linha de psicologia', () => {
    expect(lineFromProfileType('psychologist')).toBe('psychology');
  });

  it('cai em psicopedagogia por padrão', () => {
    expect(lineFromProfileType('psychopedagogue')).toBe('psychopedagogy');
    expect(lineFromProfileType(null)).toBe('psychopedagogy');
    expect(lineFromProfileType('unknown')).toBe('psychopedagogy');
  });
});
