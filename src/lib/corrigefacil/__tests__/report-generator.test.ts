import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCorrigeFacilSystemPrompt,
  formatAgeAtEvaluation,
  formatClosedResults,
  professionalText,
} from '../report-generator';

const motor = readFileSync(
  join(process.cwd(), 'src/lib/corrigefacil/report-generator.ts'),
  'utf8',
);

/** Só o `userText`: é o que efetivamente vai ao modelo, e é sobre ele que as
 *  guardas de minimização falam. */
const userText = motor.slice(
  motor.indexOf('const userText = `'),
  motor.indexOf('Preserve integralmente os dados fechados acima.'),
);

describe('CorrigeFácil report generator', () => {
  it('preserva somente a precisão disponível da idade manual', () => {
    expect(formatAgeAtEvaluation({ years: 8 })).toBe('8 anos');
  });

  it('preserva idade calculada completa e marca idade corrigida', () => {
    expect(
      formatAgeAtEvaluation({
        years: 1,
        months: 7,
        days: 12,
        corrected: true,
      }),
    ).toBe('1 ano, 7 meses e 12 dias (idade corrigida)');
  });

  it('formata somente resultados persistidos sem incluir metadados internos', () => {
    const texto = formatClosedResults([
      {
        raw: 22,
        score: null,
        percentile: 95,
        z_score: 1.64,
        classification: 'Elevado',
        ci95: null,
        available: true,
        message: null,
        flags: ['internal_norm_row_42'],
        scales: {
          code: 'ANS',
          name: 'Ansiedade',
          kind: 'domain',
          ordinal: 1,
        },
      },
    ]);

    expect(texto).toContain('Ansiedade (ANS)');
    expect(texto).toContain('- bruto: 22');
    expect(texto).toContain('- percentil: 95');
    expect(texto).toContain('- classificação: Elevado');
    expect(texto).not.toContain('internal_norm_row_42');
    expect(texto).not.toContain('- tipo:');
    expect(texto).not.toContain('domain');
  });

  it('manda profissão flexionada e sigla ao prompt, nunca o código do banco', () => {
    const texto = professionalText({
      display_name: 'Ana Souza',
      gender: 'F',
      profession_category: 'psicologo',
      credential_type: 'crp',
      credential_number: '06/12345',
    });

    expect(texto).toContain('Profissão: Psicóloga');
    expect(texto).toContain('Registro/credencial: CRP 06/12345');
    expect(texto).not.toContain('psicologo');
    expect(texto).not.toContain('crp 06/12345');
  });

  it('sem gênero usa a forma neutra e não quebra o bloco', () => {
    const texto = professionalText({
      display_name: 'Alex Lima',
      profession_category: 'fonoaudiologo',
      credential_type: 'crfa',
      credential_number: '1234',
    });

    expect(texto).toContain('Nome: Alex Lima');
    expect(texto).toContain('Profissão: Fonoaudiólogo(a)');
    expect(texto).toContain('Registro/credencial: CRFa 1234');
  });

  it('categoria sem rótulo publicável omite a linha em vez de vazar o código', () => {
    const texto = professionalText({
      display_name: 'Chris Reis',
      profession_category: 'outro',
      credential_type: 'nao_informado',
      credential_number: null,
    });

    expect(texto).toBe('Nome: Chris Reis');
    expect(texto).not.toContain('Profissão:');
    expect(texto).not.toContain('outro');
    expect(texto).not.toContain('nao_informado');
  });

  // O caso que passou batido na primeira versão: `credential_number` PRESENTE
  // com tipo sem sigla publicável. `formatCredential` devolve o número sozinho
  // — certo para o Doc Studio, errado no prompt, onde "Registro/credencial:
  // 12345" é um registro sem órgão que a IA pode redigir como se fosse.
  it('registro sem sigla publicável não vai ao prompt, mesmo com número preenchido', () => {
    const texto = professionalText({
      display_name: 'Teste',
      credential_type: 'outro',
      credential_number: '12345',
    });

    expect(texto).not.toContain('Registro/credencial:');
    expect(texto).not.toContain('12345');
    expect(texto).toBe('Nome: Teste');
  });

  it('vale para nao_informado, tipo desconhecido e tipo vazio', () => {
    for (const credential_type of ['nao_informado', 'sigla_que_nao_existe', '']) {
      const texto = professionalText({
        display_name: 'Teste',
        credential_type,
        credential_number: '12345',
      });

      expect(texto, credential_type || '(vazio)').toBe('Nome: Teste');
    }
  });

  it('perfil ausente continua declarado como ausente', () => {
    expect(professionalText(null)).toBe('Perfil profissional: não incluído.');
  });

  it('trava recálculo, corte, norma e diagnóstico no prompt CorrigeFácil', () => {
    const prompt = buildCorrigeFacilSystemPrompt(
      'technical',
      'AVISO FINAL TESTE',
    );

    expect(prompt).toContain('Não recalcule escores');
    expect(prompt).toContain('não selecione normas');
    expect(prompt).toContain('Não faça diagnóstico');
    expect(prompt).toContain('AVISO FINAL TESTE');
  });
});

describe('prompt CorrigeFácil — estrutura editorial (Bloco 8)', () => {
  const destinos = ['family', 'school', 'technical', 'internal'] as const;

  it('exige exatamente as quatro seções, na ordem', () => {
    for (const destino of destinos) {
      const prompt = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      const posicoes = [
        prompt.indexOf('## Síntese dos resultados'),
        prompt.indexOf('## Análise e interpretação'),
        prompt.indexOf('## Pontos de atenção'),
        prompt.indexOf('## Orientações'),
      ];

      for (const p of posicoes) expect(p, destino).toBeGreaterThan(-1);
      expect([...posicoes].sort((a, b) => a - b), destino).toEqual(posicoes);
    }
  });

  it('proíbe as seções que pertencem ao documento ou ao laudo', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    const proibidas = prompt.slice(prompt.indexOf('Não crie outras seções'));

    for (const secao of [
      'Introdução',
      'Identificação',
      'Dados do paciente',
      'Metodologia',
      'Hipótese diagnóstica',
      'Conclusão diagnóstica',
      'Prognóstico',
      'CID',
      'DSM',
    ]) {
      expect(proibidas, secao).toContain(secao);
    }
  });

  // O defeito observado em produção: a narrativa reabria com nome, idade,
  // data e respondente, que o documento já mostra fora do output_text.
  it('manda não repetir o cabeçalho que o documento já monta', () => {
    const prompt = buildCorrigeFacilSystemPrompt('family', 'AVISO');
    expect(prompt).toContain('O QUE VOCÊ NÃO PRECISA ESCREVER');
    expect(prompt).toContain('Não abra o texto recontando nome, idade, data, respondente ou profissional');
    expect(prompt).toContain('Não repita a tabela linha por linha');
    expect(prompt).toContain('Não assine');
    expect(prompt).toContain('Nunca escreva códigos internos do sistema');
  });

  it('proíbe causalidade e afirmação absoluta em todos os destinos', () => {
    for (const destino of destinos) {
      const prompt = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(prompt, destino).toContain(
        'É proibido explicar POR QUE a pessoa obteve o resultado',
      );
      expect(prompt, destino).toContain('atribuir causa');
      expect(prompt, destino).toContain('o resultado sugere');
      expect(prompt, destino).toContain('Evite "apresenta", "demonstra", "confirma", "comprova"');
    }
  });

  // A escola é onde o salto causal é mais tentador: o resultado emocional
  // vira "explicação" do rendimento. A regra do destino ataca isso
  // nominalmente, além da proibição geral acima.
  it('a regra da escola barra o salto de resultado para causa escolar', () => {
    const prompt = buildCorrigeFacilSystemPrompt('school', 'AVISO');
    expect(prompt).toContain('NÃO é causa de desempenho escolar');
    expect(prompt).toContain('não transforme um no outro');
    expect(prompt).toContain(
      'Não afirme dificuldade de aprendizagem, problema de comportamento ou queda de rendimento que não tenha sido fornecido',
    );
  });

  it('exige classificação reproduzida ao pé da letra', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(prompt).toContain('reproduza o rótulo exatamente como recebido');
    expect(prompt).toContain('sem sinônimo');
  });

  it('impede item inventado e "aspecto preservado" sem base', () => {
    const prompt = buildCorrigeFacilSystemPrompt('family', 'AVISO');
    expect(prompt).toContain('Não crie itens para encher');
    expect(prompt).toContain('não invente "aspectos preservados" sem dado que os sustente');
    expect(prompt).toContain('não trate ausência de elevação como habilidade preservada');
  });

  it('mantém as orientações prudentes e ligadas ao resultado', () => {
    const prompt = buildCorrigeFacilSystemPrompt('family', 'AVISO');
    expect(prompt).toContain('Não prescreva medicamento');
    expect(prompt).toContain('Não escreva recomendação genérica desconectada do resultado');
  });

  it('a extensão acompanha a informação, não o contrário', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(prompt).toContain('Qualidade acima de tamanho');
    expect(prompt).toContain('nunca produza volume inventando conteúdo');
  });

  it('o aviso ético fecha o texto, uma vez, sem título', () => {
    const prompt = buildCorrigeFacilSystemPrompt('internal', 'AVISO FINAL TESTE');
    expect(prompt).toContain('uma única vez, sem título acima dele');
    expect(prompt.indexOf('AVISO FINAL TESTE')).toBeGreaterThan(
      prompt.indexOf('## Orientações'),
    );
    // uma ocorrência só: dois disclaimers no mesmo documento seria ruído
    expect(prompt.match(/AVISO FINAL TESTE/g)).toHaveLength(1);
  });
});

describe('prompt CorrigeFácil — regra de evidência (Bloco 9A)', () => {
  const destinos = ['family', 'school', 'technical', 'internal'] as const;

  it('lista as cinco fontes que autorizam falar de um assunto', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(prompt).toContain('REGRA DE EVIDÊNCIA');
    expect(prompt).toContain('nome do instrumento');
    expect(prompt).toContain('nome da escala');
    expect(prompt).toContain('classificação persistida');
    expect(prompt).toContain('valores persistidos');
    expect(prompt).toContain('contexto escrito pelo profissional');
    expect(prompt).toContain('o conceito NÃO ENTRA');
  });

  // O defeito real de produção: a classificação virava descrição clínica.
  it('classificação não autoriza inferir sintoma nem domínio funcional', () => {
    for (const destino of destinos) {
      const prompt = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(prompt, destino).toContain(
        'NÃO derive deles sintoma, manifestação ou domínio funcional',
      );
      expect(prompt, destino).toContain(
        'A classificação é RESULTADO DE RASTREIO, não descrição clínica da pessoa',
      );
    }
  });

  it('nomeia os domínios que apareceram indevidamente em produção', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    for (const dominio of [
      'sofrimento emocional',
      'bem-estar',
      'humor',
      'sono',
      'funcionamento cotidiano',
      'participação em atividades',
      'rendimento',
      'comportamento',
      'relações familiares',
    ]) {
      expect(prompt, dominio).toContain(dominio);
    }
    // e diz que são exemplos de trava, não um cardápio a preencher
    expect(prompt).toContain('não são uma lista a ser preenchida nem substituída por sinônimos');
  });

  it('contexto do profissional libera o domínio que ele mencionou', () => {
    const prompt = buildCorrigeFacilSystemPrompt('school', 'AVISO');
    expect(prompt).toContain(
      'o domínio que ele mencionou fica liberado para a redação',
    );
    expect(prompt).toContain('sem convertê-lo em resultado do instrumento');
  });

  it('a escola não antecipa o que vai encontrar', () => {
    const prompt = buildCorrigeFacilSystemPrompt('school', 'AVISO');
    expect(prompt).toContain('NÃO nomeie o que a escola deve observar');
    expect(prompt).toContain('Você não sabe o que a escola vai encontrar');
    expect(prompt).toContain(
      'integrar o resultado às observações disponíveis no contexto escolar',
    );
  });
});

describe('prompt CorrigeFácil — antirrepetição (Bloco 9A)', () => {
  it('cada seção tem função distinta, declarada', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(prompt).toContain('CADA SEÇÃO CUMPRE UMA FUNÇÃO DIFERENTE');
    expect(prompt).toContain('Dizer a mesma coisa quatro vezes empobrece o documento');
  });

  it('a análise não reescreve a síntese', () => {
    const prompt = buildCorrigeFacilSystemPrompt('family', 'AVISO');
    expect(prompt).toContain('Não reescreva a síntese com outras palavras');
    expect(prompt).toContain('refira-se a ela como "esse resultado"');
  });

  it('pontos de atenção não repetem a classificação para preencher', () => {
    const prompt = buildCorrigeFacilSystemPrompt('family', 'AVISO');
    expect(prompt).toContain('Não use como item a classificação que a síntese já enunciou');
    expect(prompt).toContain('um item verdadeiro vale mais que três repetidos');
  });

  it('orientações não repetem cautela já dita e são processuais sem contexto', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(prompt).toContain('Não repita aqui a classificação, o alerta de que não é diagnóstico');
    expect(prompt).toContain('as orientações devem ser PROCESSUAIS');
    expect(prompt).toContain('observar humor');
    expect(prompt).toContain('monitorar participação');
  });

  // Princípio editorial herdado do Relatório Pró das planilhas: a estrutura
  // organiza a leitura, não vira sequência mecânica de campos.
  it('proíbe transformar o relatório em checklist burocrático', () => {
    for (const destino of ['family', 'school', 'technical', 'internal'] as const) {
      const prompt = buildCorrigeFacilSystemPrompt(destino, 'AVISO');
      expect(prompt, destino).toContain(
        'NÃO transforme o relatório em checklist burocrático',
      );
      expect(prompt, destino).toContain('não para produzir uma sequência mecânica de campos');
      expect(prompt, destino).toContain('Escreva texto que se lê, não formulário preenchido');
    }
  });

  // Antes a regra dizia "não repetidamente", o que licenciava usar uma ou
  // duas vezes, e nomeava só uma das três formulações.
  it('manda omitir a ausência, sem marcá-la com nenhuma das três formulações', () => {
    const prompt = buildCorrigeFacilSystemPrompt('technical', 'AVISO');

    expect(prompt).toContain(
      'Omita informação ausente quando ela não for necessária para compreender o relatório',
    );
    for (const marcador of ['"não informado"', '"não disponível"', '"não avaliado"']) {
      expect(prompt, marcador).toContain(marcador);
    }
    expect(prompt).toContain('Não preencha ausência com');
    // a brecha do advérbio não pode voltar
    expect(prompt).not.toContain('"não informado" repetidamente');
  });

  it('seção obrigatória não significa volume obrigatório', () => {
    const prompt = buildCorrigeFacilSystemPrompt('internal', 'AVISO');
    expect(prompt).toContain('Seção obrigatória NÃO significa volume obrigatório');
    expect(prompt).toContain('seções curtas, poucos itens e orientação curta');
    expect(prompt).toContain('pede uma análise CURTA');
  });

  // O que o 9A NÃO podia afrouxar.
  it('as quatro seções e as travas do 8 continuam de pé', () => {
    for (const destino of ['family', 'school', 'technical', 'internal'] as const) {
      const prompt = buildCorrigeFacilSystemPrompt(destino, 'AVISO FINAL');
      for (const secao of [
        '## Síntese dos resultados',
        '## Análise e interpretação',
        '## Pontos de atenção',
        '## Orientações',
      ]) {
        expect(prompt, `${destino} ${secao}`).toContain(secao);
      }
      expect(prompt, destino).toContain('Não recalcule escores');
      expect(prompt, destino).toContain('não selecione normas');
      expect(prompt, destino).toContain('Não faça diagnóstico');
      expect(prompt, destino).toContain('AVISO FINAL');
    }
  });
});

describe('payload enviado ao modelo — minimização', () => {
  // `escore_bruto` chegou a aparecer na narrativa em produção: é código
  // interno e não sustenta nenhuma decisão de redação, já que os resultados
  // fechados dizem quais métricas existem.
  it('não manda o tipo de escore interno', () => {
    expect(userText).not.toContain('Tipo de escore');
    expect(userText).not.toContain('score_type');
  });

  it('não manda a identidade do profissional', () => {
    expect(userText).not.toContain('PROFISSIONAL RESPONSÁVEL');
    expect(userText).not.toContain('professionalText');
  });

  it('o motor deixou de ler profiles para gerar a narrativa', () => {
    expect(motor).not.toContain("from('profiles')");
  });

  it('mantém instrumento por código e nome', () => {
    expect(userText).toContain('Código: ${instrument.code}');
    expect(userText).toContain('Nome: ${instrument.name}');
  });

  it('a identificação segue no payload, mas marcada como contexto', () => {
    expect(userText).toContain('o documento já a apresenta — não a reconte');
    expect(userText).toContain('Nome do avaliado:');
    expect(userText).toContain('Idade na avaliação:');
  });

  // Observação subjetiva e dado quantitativo não podem entrar com o mesmo
  // peso de evidência.
  it('separa contexto do profissional de resultado do instrumento', () => {
    expect(motor).toContain('CONTEXTO FORNECIDO PELO PROFISSIONAL');
    expect(motor).toContain('não é resultado do instrumento');
  });

  // O formatter compartilhado continua vivo e testado: quem o usa agora é o
  // documento, não o prompt.
  it('professionalText permanece exportado e correto', () => {
    expect(
      professionalText({
        display_name: 'Ana Souza',
        gender: 'F',
        profession_category: 'psicologo',
        credential_type: 'crp',
        credential_number: '06/12345',
      }),
    ).toContain('Profissão: Psicóloga');
  });
});

describe('prompt CorrigeFácil — regra por destino', () => {
  it('cada destino recebe a própria voz, e nenhum recebe a do outro', () => {
    const marcas: Record<string, string> = {
      family: 'Não responsabilize pais ou cuidadores',
      school: 'NÃO é causa de desempenho escolar',
      technical: 'destaque convergências e diferenças entre as escalas',
      internal: 'Registro operacional do próprio profissional',
    };

    for (const [destino, marca] of Object.entries(marcas)) {
      const prompt = buildCorrigeFacilSystemPrompt(
        destino as 'family' | 'school' | 'technical' | 'internal',
        'AVISO',
      );
      expect(prompt, destino).toContain(marca);

      for (const [outro, marcaAlheia] of Object.entries(marcas)) {
        if (outro === destino) continue;
        expect(prompt, `${destino} não deve receber a regra de ${outro}`).not.toContain(
          marcaAlheia,
        );
      }
    }
  });

  it('o registro interno mantém a mesma estrutura, só mais curto', () => {
    const prompt = buildCorrigeFacilSystemPrompt('internal', 'AVISO');
    expect(prompt).toContain('MESMA estrutura de quatro seções');
    expect(prompt).toContain('## Síntese dos resultados');
    expect(prompt).toContain('## Orientações');
  });
});
