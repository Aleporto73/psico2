import { describe, expect, it } from 'vitest';
import type { ReportProfile } from '../types';
import { buildHeader, getProfessionalSignature } from '../lib/profile';
import { catalogForCategory, categoryFromProfile } from '../templates';

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

describe('categoryFromProfile — profession_category é o eixo central', () => {
  it('usa profession_category quando reconhecível', () => {
    expect(categoryFromProfile({ profession_category: 'psicologo' })).toBe('psicologo');
    expect(categoryFromProfile({ profession_category: 'psicopedagogo' })).toBe('psicopedagogo');
    expect(categoryFromProfile({ profession_category: 'neuropsicopedagogo' })).toBe('neuropsicopedagogo');
    expect(categoryFromProfile({ profession_category: 'fonoaudiologo' })).toBe('fonoaudiologo');
    expect(categoryFromProfile({ profession_category: 'terapeuta_ocupacional' })).toBe('terapeuta_ocupacional');
    expect(categoryFromProfile({ profession_category: 'medico' })).toBe('medico');
    expect(categoryFromProfile({ profession_category: 'pediatra' })).toBe('pediatra');
  });

  it('cai em "outro" quando ausente ou desconhecido (sem fallback silencioso)', () => {
    expect(categoryFromProfile({ profession_category: 'outro' })).toBe('outro');
    expect(categoryFromProfile({ profession_category: null })).toBe('outro');
    expect(categoryFromProfile({ profession_category: 'inexistente' })).toBe('outro');
    expect(categoryFromProfile(null)).toBe('outro');
    expect(categoryFromProfile(undefined)).toBe('outro');
  });
});

describe('catalogForCategory', () => {
  it('categorias com catálogo apontam para a linha certa', () => {
    expect(catalogForCategory('psicologo')).toBe('psychology');
    expect(catalogForCategory('psicopedagogo')).toBe('psychopedagogy');
    expect(catalogForCategory('neuropsicopedagogo')).toBe('psychopedagogy');
  });

  it('categorias sem catálogo retornam null (linha em preparação)', () => {
    expect(catalogForCategory('fonoaudiologo')).toBeNull();
    expect(catalogForCategory('terapeuta_ocupacional')).toBeNull();
    expect(catalogForCategory('medico')).toBeNull();
    expect(catalogForCategory('pediatra')).toBeNull();
    expect(catalogForCategory('outro')).toBeNull();
    expect(catalogForCategory(null)).toBeNull();
  });
});
