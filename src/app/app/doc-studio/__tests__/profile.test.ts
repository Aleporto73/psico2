import { describe, expect, it } from 'vitest';
import type { ReportProfile } from '../types';
import { buildHeader, getProfessionalSignature } from '../lib/profile';
import { lineFromProfessionCategory, lineFromProfile, lineFromProfileType } from '../templates';

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

describe('lineFromProfessionCategory', () => {
  it('psicologo mapeia para psychology', () => {
    expect(lineFromProfessionCategory('psicologo')).toBe('psychology');
  });

  it('psicopedagogo e neuropsicopedagogo mapeiam para psychopedagogy', () => {
    expect(lineFromProfessionCategory('psicopedagogo')).toBe('psychopedagogy');
    expect(lineFromProfessionCategory('neuropsicopedagogo')).toBe('psychopedagogy');
  });

  it('profissões sem catálogo v1 retornam null (sem promessa Fono/TO)', () => {
    expect(lineFromProfessionCategory('fonoaudiologo')).toBeNull();
    expect(lineFromProfessionCategory('terapeuta_ocupacional')).toBeNull();
    expect(lineFromProfessionCategory('medico')).toBeNull();
    expect(lineFromProfessionCategory('pediatra')).toBeNull();
    expect(lineFromProfessionCategory('outro')).toBeNull();
    expect(lineFromProfessionCategory(null)).toBeNull();
    expect(lineFromProfessionCategory(undefined)).toBeNull();
  });
});

describe('lineFromProfile — prioridade profession_category > profile_type > fallback', () => {
  it('usa profession_category quando definido', () => {
    expect(lineFromProfile({ profession_category: 'psicologo', profile_type: 'psychopedagogue' })).toBe(
      'psychology',
    );
    expect(lineFromProfile({ profession_category: 'psicopedagogo', profile_type: 'psychologist' })).toBe(
      'psychopedagogy',
    );
    expect(lineFromProfile({ profession_category: 'neuropsicopedagogo', profile_type: null })).toBe(
      'psychopedagogy',
    );
  });

  it('cai em profile_type quando profession_category está ausente', () => {
    expect(lineFromProfile({ profession_category: null, profile_type: 'psychologist' })).toBe('psychology');
    expect(lineFromProfile({ profession_category: null, profile_type: 'psychopedagogue' })).toBe(
      'psychopedagogy',
    );
  });

  it('fono/TO/outro caem no fallback seguro sem quebrar (usa profile_type ou default)', () => {
    // profissão sem catálogo, mas com profile_type -> respeita o profile_type
    expect(lineFromProfile({ profession_category: 'fonoaudiologo', profile_type: 'psychologist' })).toBe(
      'psychology',
    );
    // profissão sem catálogo e sem profile_type -> default seguro psychopedagogy
    expect(lineFromProfile({ profession_category: 'terapeuta_ocupacional', profile_type: null })).toBe(
      'psychopedagogy',
    );
    expect(lineFromProfile({ profession_category: 'outro', profile_type: null })).toBe('psychopedagogy');
  });

  it('perfil nulo mantém comportamento seguro', () => {
    expect(lineFromProfile(null)).toBe('psychopedagogy');
    expect(lineFromProfile(undefined)).toBe('psychopedagogy');
  });
});
