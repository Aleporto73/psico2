// =====================================================================
// PHQ-9 · rastreamento e alerta do item 9, na apresentação.
//
// A Edge devolve, só para o PHQ-9:
//
//   derived.phq9.rastreamento     frase pronta, com o corte já aplicado
//   derived.phq9.alerta_item_9    frase pronta, ou null
//
// O que este arquivo trava:
//
//   A. o CONTRATO e o LEITOR — `derived.phq9` (Edge) e
//      `_corrigefacil.phq9` (banco, para o Relatório Pró)
//   B. NÃO EXISTE CÁLCULO no frontend: nenhum `>= 10`, nenhuma leitura de
//      `respostas[9]`, nenhum rótulo de faixa reconstruído
//   C. resultado imediato · o alerta aparece e some pelo payload
//   D. histórico · usa o snapshot congelado
//   E. documento · imprime os dois, fora da narrativa e fora da tabela
//   F. Relatório Pró · o bloco entra no prompt, com as proibições certas
//   G. instrumento sem `derived.phq9` permanece idêntico
//
// Como o Vitest daqui roda em `node`, sem DOM, a fiação dos `.tsx` é
// conferida no FONTE — mesma técnica dos vizinhos. O que é lógica mora em
// módulo puro e é exercitado de verdade.
// =====================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  AvaliacaoCriada,
  AvaliacaoDetalhe,
  DerivadoPhq9,
  RespostaCorrecao,
} from '@/lib/corrigefacil/api';
import {
  derivadoPhq9,
  derivadoPhq9DoMeta,
  NOTA_RASTREAMENTO,
  phq9ParaTexto,
  TITULO_ALERTA,
  TITULO_RASTREAMENTO,
} from '@/lib/corrigefacil/phq9-derivado';
import { CHAVE_RESERVADA } from '@/lib/corrigefacil/confias-derivado';
import { buildCorrigeFacilSystemPrompt } from '@/lib/corrigefacil/report-generator';

const ABAIXO = 'Rastreamento: Abaixo do ponto de corte';
const ACIMA = 'Rastreamento: Igual ou acima do ponto de corte';
const ALERTA =
  'ATENÇÃO: resposta positiva no item 9. Recomenda-se investigação ' +
  'clínica adicional sobre pensamentos de morte/autolesão e risco suicida.';

const COM_ALERTA: DerivadoPhq9 = {
  rastreamento: ACIMA,
  alerta_item_9: ALERTA,
};
const SEM_ALERTA: DerivadoPhq9 = {
  rastreamento: ABAIXO,
  alerta_item_9: null,
};

const fonte = (...caminho: string[]) =>
  readFileSync(join(process.cwd(), 'src', ...caminho), 'utf8');

// =====================================================================
// A · CONTRATO E LEITOR
// =====================================================================

describe('A · contrato: `derived.phq9` é aceito nas três rotas', () => {
  it('POST /corrigir', () => {
    const r: RespostaCorrecao = {
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: {},
      derived: { phq9: COM_ALERTA },
    };
    expect(derivadoPhq9(r)).toBe(COM_ALERTA);
  });

  it('POST /avaliacao', () => {
    const c: AvaliacaoCriada = {
      assessment_id: 'av-1',
      instrument: 'PHQ-9',
      norm_selector: {},
      status: 'concluida',
      resultados: {},
      derived: { phq9: SEM_ALERTA },
    };
    expect(derivadoPhq9(c)?.rastreamento).toBe(ABAIXO);
  });

  it('GET /avaliacao/:id', () => {
    const d: AvaliacaoDetalhe = {
      assessment_id: 'av-1',
      instrument: 'PHQ-9',
      status: 'concluida',
      norm_selector: {},
      subject_meta: {},
      subject_label: null,
      created_at: '2026-08-16T11:00:00Z',
      completed_at: '2026-08-16T12:00:00Z',
      resultados: {},
      derived: { phq9: COM_ALERTA },
    };
    expect(derivadoPhq9(d)).toBe(COM_ALERTA);
  });

  it('o snapshot congelado é lido pela MESMA chave reservada do CONFIAS', () => {
    const meta = {
      respondent_name: 'Ana',
      [CHAVE_RESERVADA]: { phq9: COM_ALERTA },
    };
    expect(derivadoPhq9DoMeta(meta)).toEqual(COM_ALERTA);
    // e é o mesmo objeto que a Edge promove em `derived`
    expect(derivadoPhq9DoMeta(meta)).toEqual(
      derivadoPhq9({ derived: { phq9: COM_ALERTA } }),
    );
  });

  it('as ausências viram null, e não bloco vazio', () => {
    expect(derivadoPhq9(null)).toBeNull();
    expect(derivadoPhq9(undefined)).toBeNull();
    expect(derivadoPhq9({ derived: {} })).toBeNull();
    // protocolo incompleto: a Edge omite a chave
    expect(derivadoPhq9({ instrument: 'PHQ-9' } as RespostaCorrecao)).toBeNull();
    // derivado sem nenhuma das duas leituras não é bloco
    expect(
      derivadoPhq9({ derived: { phq9: { rastreamento: null, alerta_item_9: null } } }),
    ).toBeNull();
    expect(derivadoPhq9DoMeta(null)).toBeNull();
    expect(derivadoPhq9DoMeta({})).toBeNull();
    expect(derivadoPhq9DoMeta({ [CHAVE_RESERVADA]: 'texto' })).toBeNull();
  });

  it('o CONFIAS e o PHQ-9 coexistem na mesma chave reservada', () => {
    // uma entrada por instrumento; ler um não pode achar o outro
    const meta = { [CHAVE_RESERVADA]: { confias: { foo: 1 } } };
    expect(derivadoPhq9DoMeta(meta)).toBeNull();
  });
});

// =====================================================================
// B · NÃO EXISTE CÁLCULO NO FRONTEND
// =====================================================================

describe('B · o corte e o item 9 não são reconstruídos no cliente', () => {
  /** Os arquivos que tocam o derivado do PHQ-9, sem comentários — a
   *  varredura é sobre CÓDIGO, e os comentários citam o corte de propósito
   *  para explicar por que ele NÃO é reconstruído. */
  const semComentarios = (texto: string) =>
    texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const MODULO = semComentarios(fonte('lib', 'corrigefacil', 'phq9-derivado.ts'));
  const COMPONENTE = semComentarios(
    fonte('app', 'app', 'corrigefacil', 'Phq9Derivado.tsx'),
  );

  it('a varredura enxerga o código, e não só os comentários', () => {
    expect(MODULO).toContain('export function derivadoPhq9');
    expect(COMPONENTE).toContain('export function Phq9Derivado');
  });

  it('nenhum corte aparece no código', () => {
    for (const alvo of [MODULO, COMPONENTE]) {
      expect(alvo).not.toMatch(/>=\s*10\b/);
      expect(alvo).not.toMatch(/\b10\s*<=/);
      expect(alvo).not.toMatch(/corte\s*[<>]=?/i);
    }
  });

  it('nenhuma leitura de resposta de item aparece no código', () => {
    for (const alvo of [MODULO, COMPONENTE]) {
      expect(alvo).not.toMatch(/respostas/);
      expect(alvo).not.toMatch(/item\s*9\s*[<>]/i);
      expect(alvo).not.toMatch(/\[\s*9\s*\]/);
    }
  });

  it('nenhuma frase do servidor é escrita no cliente', () => {
    // as três saem PRONTAS da Edge; tê-las aqui seria uma segunda fonte
    for (const alvo of [MODULO, COMPONENTE]) {
      expect(alvo).not.toContain('Abaixo do ponto de corte');
      expect(alvo).not.toContain('Igual ou acima do ponto de corte');
      expect(alvo).not.toContain('resposta positiva no item 9');
    }
  });

  it('nenhum rótulo de faixa do PHQ-9 é reconstruído', () => {
    for (const rotulo of [
      'Mínima ou nenhuma depressão',
      'Leve',
      'Moderadamente grave',
      'Grave',
    ]) {
      expect(MODULO).not.toContain(rotulo);
      expect(COMPONENTE).not.toContain(rotulo);
    }
  });

  it('a nota separa rastreamento de classificação', () => {
    expect(NOTA_RASTREAMENTO).toContain('Não substitui a classificação');
    expect(NOTA_RASTREAMENTO).toContain('nem constitui diagnóstico');
  });

  it('os rótulos são do produto; o TEXTO do alerta é do servidor', () => {
    // o título é nosso e pode mudar de estilo sem tocar em dado nenhum
    expect(TITULO_RASTREAMENTO).toBe('Rastreamento');
    expect(TITULO_ALERTA).toBe('Item 9');
    // e nenhum dos dois carrega a frase, que é o que vem pronto da Edge
    for (const rotulo of [TITULO_RASTREAMENTO, TITULO_ALERTA]) {
      expect(ALERTA).not.toContain(rotulo);
      expect(rotulo.length).toBeLessThan(30);
    }
  });
});

// =====================================================================
// C · RESULTADO IMEDIATO
// =====================================================================

describe('C · resultado imediato', () => {
  const tela = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');

  it('renderiza a partir da resposta do servidor', () => {
    expect(tela).toContain('<Phq9Derivado derivado={derivadoPhq9(resposta)} />');
  });

  it('vem depois dos cards normativos', () => {
    expect(tela.indexOf('<Phq9Derivado')).toBeGreaterThan(
      tela.indexOf('metricasDaEscala(detalhe.code, escala'),
    );
  });

  it('o componente recebe SÓ o derivado', () => {
    const c = fonte('app', 'app', 'corrigefacil', 'Phq9Derivado.tsx');
    expect(c).toContain('derivado');
    expect(c).not.toContain('resultados');
    expect(c).not.toContain('detalhe');
  });

  it('o alerta aparece quando presente e some quando null', () => {
    const c = fonte('app', 'app', 'corrigefacil', 'Phq9Derivado.tsx');
    // as duas leituras são independentes: cada uma tem a guarda dela
    expect(c).toContain('{rastreamento && (');
    expect(c).toContain('{alerta && (');
    expect(c).toContain('if (!derivado) return null;');
    // e o texto do alerta é o do payload, nunca um literal
    expect(c).toContain('{alerta}');
  });

  it('as duas leituras são independentes no leitor', () => {
    expect(derivadoPhq9({ derived: { phq9: SEM_ALERTA } })?.alerta_item_9).toBeNull();
    expect(derivadoPhq9({ derived: { phq9: COM_ALERTA } })?.alerta_item_9).toBe(ALERTA);
    // só alerta, sem rastreamento, continua sendo bloco
    const soAlerta = { rastreamento: null, alerta_item_9: ALERTA };
    expect(derivadoPhq9({ derived: { phq9: soAlerta } })).toEqual(soAlerta);
  });
});

// =====================================================================
// D · HISTÓRICO
// =====================================================================

describe('D · histórico usa o snapshot congelado', () => {
  const detalhe = fonte(
    'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'DetalheClient.tsx',
  );

  it('lê `AvaliacaoDetalhe.derived` pelo mesmo leitor', () => {
    expect(detalhe).toContain('<Phq9Derivado derivado={derivadoPhq9(d)} />');
  });

  it('é o MESMO componente da tela de correção', () => {
    const tela = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'AvaliarClient.tsx');
    for (const arquivo of [detalhe, tela]) {
      expect(arquivo).toContain("import { Phq9Derivado } from");
      expect(arquivo).toContain(
        "import { derivadoPhq9 } from '@/lib/corrigefacil/phq9-derivado';",
      );
    }
  });

  it('não recalcula nada: segue com uma chamada de rede só', () => {
    expect(detalhe.match(/buscar[A-Z]\w+\(/g)).toEqual(['buscarAvaliacao(']);
    expect(detalhe).not.toContain('d.derived!');
  });
});

// =====================================================================
// E · DOCUMENTO
// =====================================================================

describe('E · documento imprime os dois, sem depender da IA', () => {
  const doc = fonte(
    'app', 'app', 'corrigefacil', 'avaliacoes', '[id]', 'relatorios',
    '[reportId]', 'RelatorioDocumentClient.tsx',
  );

  it('os dados vêm de `avaliacao.derived`', () => {
    expect(doc).toContain('<Phq9DoDocumento avaliacao={avaliacao} />');
    expect(doc).toContain('const derivado = derivadoPhq9(avaliacao);');
  });

  it('imprime rastreamento e alerta', () => {
    expect(doc).toContain('TITULO_RASTREAMENTO');
    expect(doc).toContain('TITULO_ALERTA');
    expect(doc).toContain('NOTA_RASTREAMENTO');
    expect(doc).toContain('{derivado.rastreamento}');
    expect(doc).toContain('{derivado.alerta_item_9}');
  });

  it('vem ANTES da narrativa da IA', () => {
    expect(doc.indexOf('<Phq9DoDocumento')).toBeLessThan(doc.indexOf('<ReactMarkdown'));
  });

  it('vem depois da tabela e não dentro dela', () => {
    expect(doc.indexOf('<Phq9DoDocumento')).toBeGreaterThan(
      doc.indexOf('montarLinhas(avaliacao.resultados'),
    );
    const corpoDaTabela = doc.slice(doc.indexOf('<tbody'), doc.indexOf('</tbody>'));
    expect(corpoDaTabela).not.toContain('Phq9DoDocumento');
    expect(corpoDaTabela).not.toContain('alerta_item_9');
  });

  it('o componente não olha para a narrativa', () => {
    const inicio = doc.indexOf('function Phq9DoDocumento');
    const corpo = doc.slice(inicio, doc.indexOf('\n/**', inicio));
    expect(corpo).not.toContain('output_text');
    expect(corpo).not.toContain('narrativa');
    expect(corpo).not.toContain('rascunho');
  });

  it('sem snapshot não imprime seção nenhuma', () => {
    const inicio = doc.indexOf('function Phq9DoDocumento');
    expect(doc.slice(inicio, inicio + 400)).toContain('if (!derivado) return null;');
  });
});

// =====================================================================
// F · RELATÓRIO PRÓ
// =====================================================================

describe('F · o snapshot entra no prompt, com as proibições certas', () => {
  const motor = fonte('lib', 'corrigefacil', 'report-generator.ts');

  it('lê o snapshot do subject_meta, sem query nova', () => {
    expect(motor).toContain('phq9ParaTexto(derivadoPhq9DoMeta(subjectMeta))');
    expect(motor.match(/\.from\('assessments'\)/g)).toHaveLength(1);
  });

  it('o bloco entra nos dados fechados', () => {
    expect(motor).toContain('DADOS DERIVADOS CONGELADOS DO PHQ-9');
    expect(motor).toContain('${resultsText}${derivadoText}${phq9Text}');
  });

  it('o texto leva rastreamento e alerta, inteiros', () => {
    const texto = phq9ParaTexto(COM_ALERTA)!;
    expect(texto).toContain(`${TITULO_RASTREAMENTO}: ${ACIMA}`);
    expect(texto).toContain(ALERTA);

    const semAlerta = phq9ParaTexto(SEM_ALERTA)!;
    expect(semAlerta).toContain(ABAIXO);
    expect(semAlerta).not.toContain('ATENÇÃO');

    expect(phq9ParaTexto(null)).toBeNull();
  });

  it('a regra diz que rastreamento é dado fechado', () => {
    const p = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true);
    expect(p).toContain('DADOS DERIVADOS CONGELADOS DO PHQ-9');
    expect(p).toContain('Não recalcule o ponto de corte');
    expect(p).toContain('não recompare a pontuação total com ele');
  });

  it('a regra separa rastreamento de classificação e de diagnóstico', () => {
    const p = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true);
    expect(p).toContain('O rastreamento NÃO é a classificação');
    expect(p).toContain('Rastreamento NÃO é diagnóstico');
  });

  it('a regra exige mencionar o alerta e PROÍBE declarar risco suicida', () => {
    const p = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true);
    expect(p).toContain('ele deve ser mencionado');
    expect(p).toContain('cabe investigação clínica adicional');
    expect(p).toContain('NÃO declare risco suicida');
    expect(p).toContain('não prescreva conduta');
    // e o silêncio não vira avaliação negativa
    expect(p).toContain('não afirme ausência de ideação');
  });

  it('sem snapshot o prompt fica byte a byte igual', () => {
    const semNada = buildCorrigeFacilSystemPrompt('technical', 'AVISO');
    expect(semNada).toBe(
      buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, false),
    );
    expect(semNada).not.toContain('PHQ-9');
    expect(semNada).not.toContain('risco suicida');
    for (const destino of ['family', 'school', 'technical', 'internal'] as const) {
      expect(buildCorrigeFacilSystemPrompt(destino, 'AVISO')).not.toContain('PHQ-9');
    }
  });

  it('as duas regras são independentes: uma não arrasta a outra', () => {
    const soConfias = buildCorrigeFacilSystemPrompt('technical', 'AVISO', true, false);
    expect(soConfias).toContain('DADOS DERIVADOS CONGELADOS');
    expect(soConfias).not.toContain('PHQ-9');

    const soPhq9 = buildCorrigeFacilSystemPrompt('technical', 'AVISO', false, true);
    expect(soPhq9).toContain('PHQ-9');
    expect(soPhq9).not.toContain('Perfil por Habilidade');
  });
});

// =====================================================================
// G · O QUE NÃO PODE TER MUDADO
// =====================================================================

describe('G · instrumento sem `derived.phq9` permanece idêntico', () => {
  it('payload sem a chave não vira bloco', () => {
    const outro: RespostaCorrecao = {
      instrument: 'CES-D',
      norm_selector: {},
      resultados: {},
    };
    expect(derivadoPhq9(outro)).toBeNull();
    // e um CONFIAS não é lido como PHQ-9
    expect(
      derivadoPhq9({ derived: { confias: { nivel_equivalente_silaba: 'X' } } } as never),
    ).toBeNull();
  });

  it('os gráficos não conhecem o derivado do PHQ-9', () => {
    for (const arquivo of ['ResultGraph.tsx', 'graph-model.ts', 'graph-config.ts']) {
      const g = fonte('app', 'app', 'corrigefacil', 'graphs', arquivo);
      expect(g).not.toContain('phq9-derivado');
      expect(g).not.toContain('alerta_item_9');
      expect(g).not.toContain('rastreamento');
    }
  });

  it('o formulário dos 9 itens e o impacto não foram tocados', () => {
    const modelo = fonte('app', 'app', 'corrigefacil', 'avaliar', '[code]', 'form-model.ts');
    expect(modelo).not.toContain('phq9-derivado');
    expect(modelo).not.toContain('rastreamento');
    expect(modelo).not.toContain('alerta');
    // o enunciado dos nove continua vindo do mapa fechado de sempre
    expect(modelo).toContain("'PHQ-9':");
    expect(modelo).toContain('Durante os últimos 14 dias');
  });

  it('as respostas auxiliares seguem em componente próprio', () => {
    const aux = fonte('app', 'app', 'corrigefacil', 'RespostasAuxiliares.tsx');
    expect(aux).not.toContain('phq9-derivado');
    expect(aux).not.toContain('rastreamento');
  });
});
