import { describe, expect, it } from 'vitest';
import type { ResultadoEscala } from '@/lib/corrigefacil/api';
import {
  colunasVisiveis,
  formatarDataDocumento,
  montarIdentidade,
  montarLinhas,
  resolverDataAvaliacao,
  rotuloDestino,
  rotuloInstrumento,
} from '../document-model';

function resultado(over: Partial<ResultadoEscala> = {}): ResultadoEscala {
  return {
    raw: null,
    score: null,
    percentile: null,
    z: null,
    classification: null,
    available: true,
    message: null,
    flags: [],
    ...over,
  };
}

describe('tabela determinística — linhas', () => {
  it('usa somente o resultado persistido, sem recalcular nada', () => {
    const linhas = montarLinhas({
      ANS: resultado({
        raw: 22,
        score: 70,
        percentile: 95,
        z: 1.64,
        ci95: '65-75',
        classification: 'Elevado',
      }),
    });

    expect(linhas).toEqual([
      {
        escala: 'ANS',
        bruto: 22,
        escore: 70,
        percentil: 95,
        z: 1.64,
        ci95: '65-75',
        classificacao: 'Elevado',
        disponivel: true,
        mensagem: null,
      },
    ]);
  });

  it('preserva a ordem em que o servidor devolveu as escalas', () => {
    const linhas = montarLinhas({
      TOT: resultado({ score: 3 }),
      INT: resultado({ score: 1 }),
      EXT: resultado({ score: 2 }),
    });
    expect(linhas.map((l) => l.escala)).toEqual(['TOT', 'INT', 'EXT']);
  });

  // available=false não tem valor quantitativo NENHUM — nem o número que
  // por acaso tenha vindo junto. Mesma regra que o gráfico já aplica.
  it('indisponível não carrega número, só a mensagem do servidor', () => {
    const [linha] = montarLinhas({
      ESC: resultado({
        raw: 10,
        score: 99,
        percentile: 50,
        available: false,
        message: 'não há norma publicada para esta idade neste domínio',
      }),
    });

    expect(linha.disponivel).toBe(false);
    expect(linha.bruto).toBeNull();
    expect(linha.escore).toBeNull();
    expect(linha.percentil).toBeNull();
    expect(linha.classificacao).toBeNull();
    expect(linha.mensagem).toBe(
      'não há norma publicada para esta idade neste domínio',
    );
  });

  it('null continua null e nunca vira zero', () => {
    const [linha] = montarLinhas({ ESC: resultado({ score: 12 }) });
    expect(linha.percentil).toBeNull();
    expect(linha.z).toBeNull();
    expect(linha.ci95).toBeNull();
    expect(linha.percentil).not.toBe(0);
  });

  // `flags` é metadado técnico de revisão; o documento profissional não o
  // exibe neste bloco, então nem entra no modelo.
  it('não expõe flags técnicas', () => {
    const [linha] = montarLinhas({
      ESC: resultado({ score: 1, flags: ['ambiguous', 'internal_norm_row_42'] }),
    });
    expect(JSON.stringify(linha)).not.toContain('ambiguous');
    expect(JSON.stringify(linha)).not.toContain('internal_norm_row_42');
  });
});

describe('tabela determinística — colunas', () => {
  it('só existe coluna que tem ao menos um valor', () => {
    const colunas = colunasVisiveis(
      montarLinhas({
        A: resultado({ raw: 5, score: 50, classification: 'Médio' }),
        B: resultado({ raw: 7, score: 60, classification: 'Alto' }),
      }),
    );

    expect(colunas.bruto).toBe(true);
    expect(colunas.escore).toBe(true);
    expect(colunas.classificacao).toBe(true);
    expect(colunas.percentil).toBe(false);
    expect(colunas.z).toBe(false);
    expect(colunas.ci95).toBe(false);
  });

  it('uma escala com o campo já basta para a coluna existir', () => {
    const colunas = colunasVisiveis(
      montarLinhas({
        A: resultado({ score: 50 }),
        B: resultado({ score: 60, ci95: '55-65' }),
      }),
    );
    expect(colunas.ci95).toBe(true);
  });

  it('tabela vazia não produz coluna nenhuma', () => {
    const colunas = colunasVisiveis(montarLinhas({}));
    expect(Object.values(colunas).every((v) => v === false)).toBe(true);
  });

  // Este caso é a PREMISSA de um bug real: com todas as escalas
  // indisponíveis não sobra coluna quantitativa nenhuma, e o compositor
  // não tem por onde esticar a mensagem com colSpan. O modelo está certo
  // — quem precisa tratar o zero é a tela, e há guarda para isso em
  // corrigefacil/__tests__/documento-relatorio.test.ts.
  it('todas as escalas indisponíveis zeram as colunas, mas preservam a mensagem', () => {
    const linhas = montarLinhas({
      TOTAL: resultado({
        available: false,
        message: 'não há norma publicada para esta idade neste domínio',
      }),
    });
    const colunas = colunasVisiveis(linhas);

    expect(Object.values(colunas).every((v) => v === false)).toBe(true);
    expect(linhas[0].mensagem).toBe(
      'não há norma publicada para esta idade neste domínio',
    );
    expect(linhas[0].disponivel).toBe(false);
  });
});

describe('data da avaliação', () => {
  // Mesma precedência que report-generator.ts já aplica para o prompt.
  it('prefere eval_date, depois completed_at, depois created_at', () => {
    expect(resolverDataAvaliacao('2026-08-01', '2026-08-05', '2026-08-09')).toBe('2026-08-01');
    expect(resolverDataAvaliacao(null, '2026-08-05', '2026-08-09')).toBe('2026-08-05');
    expect(resolverDataAvaliacao(null, null, '2026-08-09')).toBe('2026-08-09');
  });

  it('sem nenhuma das três, devolve null em vez de inventar data', () => {
    expect(resolverDataAvaliacao(null, null, null)).toBeNull();
    expect(resolverDataAvaliacao('', '  ', undefined)).toBeNull();
  });

  it('formata dd/mm/aaaa a partir de date ou timestamp', () => {
    expect(formatarDataDocumento('2026-08-01')).toBe('01/08/2026');
    expect(formatarDataDocumento('2026-08-01T13:45:00.000Z')).toBe('01/08/2026');
    expect(formatarDataDocumento(null)).toBeNull();
    expect(formatarDataDocumento('data qualquer')).toBeNull();
  });
});

describe('identidade profissional do documento', () => {
  it('usa os formatters compartilhados para profissão e credencial', () => {
    const id = montarIdentidade({
      clinic_name: 'Clínica Horizonte',
      display_name: 'Ana Souza',
      gender: 'F',
      profession_category: 'psicologo',
      credential_type: 'crp',
      credential_number: '06/12345',
    });

    expect(id.clinica).toBe('Clínica Horizonte');
    expect(id.nome).toBe('Ana Souza');
    expect(id.credenciamento).toBe('Psicóloga · CRP 06/12345');
    expect(id.temAlgo).toBe(true);
  });

  it('clínica ausente fica vazia, e o resto continua', () => {
    const id = montarIdentidade({
      display_name: 'Ana Souza',
      gender: 'F',
      profession_category: 'psicologo',
      credential_type: 'crp',
      credential_number: '06/12345',
    });

    expect(id.clinica).toBe('');
    expect(id.nome).toBe('Ana Souza');
    expect(id.temAlgo).toBe(true);
  });

  // Mesma cautela do prompt: número sem sigla publicável não é registro.
  it('credencial sem sigla publicável não aparece, mesmo com número', () => {
    const id = montarIdentidade({
      display_name: 'Teste',
      credential_type: 'outro',
      credential_number: '12345',
    });

    expect(id.credenciamento).toBe('');
    expect(id.nome).toBe('Teste');
  });

  it('só profissão, sem credencial, não deixa separador órfão', () => {
    const id = montarIdentidade({
      display_name: 'Teste',
      gender: 'M',
      profession_category: 'pediatra',
    });
    expect(id.credenciamento).toBe('Pediatra');
  });

  it('perfil nulo ou vazio não produz identidade', () => {
    expect(montarIdentidade(null).temAlgo).toBe(false);
    expect(montarIdentidade({}).temAlgo).toBe(false);
  });

  it('nunca lê nome de conta, e-mail ou telefone', () => {
    const id = montarIdentidade({
      display_name: '',
      clinic_name: '',
      // campos que não pertencem ao documento, ainda que chegassem juntos
      ...({ name: 'Nome de cadastro', email: 'a@b.c', phone: '11999999999' } as object),
    });
    expect(JSON.stringify(id)).not.toContain('Nome de cadastro');
    expect(JSON.stringify(id)).not.toContain('a@b.c');
    expect(JSON.stringify(id)).not.toContain('11999999999');
  });
});

describe('rótulo do instrumento', () => {
  it('junta código e nome do catálogo', () => {
    expect(
      rotuloInstrumento('CES-D', 'Escala de Rastreamento Populacional para Depressão'),
    ).toBe('CES-D — Escala de Rastreamento Populacional para Depressão');
  });

  it('sem nome, o código sozinho continua valendo', () => {
    expect(rotuloInstrumento('CES-D')).toBe('CES-D');
    expect(rotuloInstrumento('CES-D', null)).toBe('CES-D');
    expect(rotuloInstrumento('CES-D', '   ')).toBe('CES-D');
  });

  it('nome igual ao código não vira repetição', () => {
    expect(rotuloInstrumento('PHQ-9', 'PHQ-9')).toBe('PHQ-9');
  });

  // Catálogo que já devolve o código no nome não pode gerar
  // "CES-D — CES-D — Escala…".
  it('não duplica o código quando o nome já o traz', () => {
    expect(
      rotuloInstrumento('CES-D', 'CES-D — Escala de Rastreamento'),
    ).toBe('CES-D — Escala de Rastreamento');
    expect(rotuloInstrumento('CES-D', 'CES-D - Escala')).toBe('CES-D - Escala');
    expect(rotuloInstrumento('CES-D', 'CES-D Escala')).toBe('CES-D Escala');
  });

  // Prefixo só conta com separador: um nome que começa com as mesmas letras
  // sem delimitar o código não é duplicação, é outra palavra.
  it('prefixo sem separador não é tratado como duplicação', () => {
    expect(rotuloInstrumento('TDF', 'TDFusão de Fonemas')).toBe(
      'TDF — TDFusão de Fonemas',
    );
  });

  it('não carrega nome de instrumento algum embutido', () => {
    // a função só devolve o que recebeu — nada de mapa interno
    expect(rotuloInstrumento('XYZ-1')).toBe('XYZ-1');
    expect(rotuloInstrumento('XYZ-1', 'Nome Qualquer')).toBe('XYZ-1 — Nome Qualquer');
  });
});

describe('destino', () => {
  it('traduz os quatro destinos aprovados', () => {
    expect(rotuloDestino('family')).toBe('Família');
    expect(rotuloDestino('school')).toBe('Escola');
    expect(rotuloDestino('technical')).toBe('Equipe multiprofissional');
    expect(rotuloDestino('internal')).toBe('Registro interno');
  });

  it('destino ausente ou desconhecido não vira rótulo inventado', () => {
    expect(rotuloDestino(null)).toBeNull();
    expect(rotuloDestino('destino_novo')).toBeNull();
  });
});
