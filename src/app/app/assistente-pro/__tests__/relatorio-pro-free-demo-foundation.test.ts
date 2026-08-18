// PR2 · FUNDACAO DE BANCO da demonstracao gratuita do Relatorio Pro.
//
// No padrao de leitura de fonte ja usado em fdt-free-foundation.test.ts e
// report-metadata-por-instrumento.test.ts.
//
// O que o vitest prova aqui e o CONTRATO da migration: qual coluna nasce,
// com que default, que valores o banco aceita, e — o ponto central — que a
// trava de uma demo por conta e um INDICE UNICO PARCIAL, e nao uma regra de
// aplicacao. Prova tambem o conjunto de NAO-acoes que define o escopo deste
// PR: nenhuma policy, nenhum grant, nenhuma RPC, nenhuma tabela nova,
// nenhuma linha de codigo ligada a coluna.
//
// O que ele NAO prova e o comportamento do Postgres — que a segunda linha
// 'free_demo' do mesmo usuario realmente estoura. Isso se prova contra o
// banco, e nesta etapa producao e READ-ONLY por decisao do PR: nenhuma DDL
// foi executada la, nem em transacao revertida. O SQL da prova esta no
// corpo do PR, para rodar quando a migration for aplicada.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(caminho: string) {
  return readFileSync(join(process.cwd(), caminho), 'utf8');
}

function semComentarios(sql: string) {
  return sql.replace(/^\s*--.*$/gm, '');
}

const CAMINHO = 'supabase/migrations/20260818120000_ai_reports_billing_origin.sql';

const MIGRATION = source(CAMINHO);

/** Só o SQL executável: o arquivo é majoritariamente comentário técnico. */
const SQL = semComentarios(MIGRATION).toLowerCase();

/** O `create unique index ...;` inteiro, isolado do resto. */
const INDICE = (() => {
  const inicio = SQL.indexOf('create unique index');
  return SQL.slice(inicio, SQL.indexOf(';', inicio) + 1);
})();

/** O `add constraint ... check (...);` inteiro. */
const CHECK = (() => {
  const inicio = SQL.indexOf('add constraint ai_reports_billing_origin_check');
  return SQL.slice(inicio, SQL.indexOf(';', inicio) + 1);
})();

describe('PR2 · a coluna billing_origin', () => {
  it('nasce em ai_reports, como text', () => {
    expect(SQL).toContain('alter table public.ai_reports');
    expect(SQL).toContain('add column if not exists billing_origin text');
  });

  it('é NOT NULL', () => {
    // Nullable abriria uma terceira origem — a origem desconhecida — e todo
    // consumidor futuro teria de decidir sozinho o que ela significa.
    expect(SQL).toContain('billing_origin text not null');
  });

  it('tem DEFAULT subscription', () => {
    // É o default que mantém os INSERTs de hoje corretos sem tocá-los.
    expect(SQL).toContain("default 'subscription'");
  });

  it('não é enum do Postgres', () => {
    // Enum só cresce por DDL e o valor antigo nunca sai.
    expect(SQL).not.toContain('create type');
    expect(SQL).not.toContain('as enum');
  });

  it('documenta os dois valores no próprio schema', () => {
    expect(SQL).toContain('comment on column public.ai_reports.billing_origin');
  });
});

describe('PR2 · o contrato de valores', () => {
  it('a CHECK é nomeada, e recriável', () => {
    // Sem nome, o Postgres inventa um e a migration deixa de ser idempotente.
    expect(SQL).toContain(
      'drop constraint if exists ai_reports_billing_origin_check',
    );
    expect(SQL).toContain('add constraint ai_reports_billing_origin_check');
  });

  it('aceita subscription e free_demo', () => {
    expect(CHECK).toContain("'subscription'");
    expect(CHECK).toContain("'free_demo'");
  });

  it('e rejeita QUALQUER outro valor', () => {
    // A prova aqui é de fechamento: a expressão é um `in (...)` com exatamente
    // dois literais. Um typo ('free-demo') não vira origem nova em silêncio —
    // e, o que importa mais, não escapa do índice único.
    expect(CHECK).toContain('check (billing_origin in (');
    const literais = CHECK.match(/'[^']*'/g) ?? [];
    expect(literais).toEqual(["'subscription'", "'free_demo'"]);
  });
});

describe('PR2 · registros existentes', () => {
  it('não são reescritos: o DEFAULT resolve', () => {
    // ADD COLUMN NOT NULL com DEFAULT constante não reescreve a tabela desde
    // o PG 11 (produção: 17.6). As 72 linhas passam a ler 'subscription'.
    expect(SQL).not.toContain('update public.ai_reports');
    expect(SQL).not.toContain('update ai_reports');
  });

  it('não perde nada: a tabela não é recriada', () => {
    expect(SQL).not.toContain('drop table');
    expect(SQL).not.toContain('create table');
    expect(SQL).not.toContain('drop column');
    expect(SQL).not.toContain('rename');
  });
});

describe('PR2 · a trava: uma demo por conta, garantida pelo banco', () => {
  it('é UNIQUE', () => {
    expect(INDICE).toContain('create unique index');
  });

  it('é POR USUÁRIO', () => {
    expect(INDICE).toContain('on public.ai_reports (user_id)');
  });

  it('o predicate é exatamente a origem free_demo', () => {
    expect(INDICE).toContain("where billing_origin = 'free_demo'");
  });

  it('NÃO filtra por relatório concluído', () => {
    // O ponto mais importante do desenho. No PR3 a reserva nasce ANTES da
    // chamada da IA; é a linha ainda sem texto entregue que precisa barrar a
    // requisição concorrente. Um predicate exigindo relatório pronto deixaria
    // os dois cliques passarem pela reserva — que é o bug que este índice
    // existe para impedir.
    for (const proibido of [
      'status',
      'completed',
      'output_text',
      'is not null',
    ]) {
      expect(INDICE, proibido).not.toContain(proibido);
    }
  });

  it('NÃO é único por avaliação', () => {
    // Um por assessment seria um por FDT — e a decisão é um por CONTA.
    expect(INDICE).not.toContain('corrigefacil_assessment_id');
    expect(INDICE).not.toContain('assessment');
  });

  it('NÃO é mensal, nem por tipo de relatório', () => {
    for (const proibido of [
      'created_at',
      'date_trunc',
      'month',
      'report_type',
    ]) {
      expect(INDICE, proibido).not.toContain(proibido);
    }
  });

  it('deixa subscription FORA do índice', () => {
    // Se 'subscription' entrasse, uma assinatura ficaria limitada a um único
    // relatório na vida. O predicate parcial é o que separa os dois mundos.
    expect(INDICE).not.toContain("'subscription'");
  });
});

describe('PR2 · o que a migration NÃO faz', () => {
  it('não mexe em RLS', () => {
    // A policy de INSERT continua exigindo has_active_assistant: hoje ninguém
    // sem Pró ativo insere linha alguma — nem 'free_demo'. A fundação entra
    // FECHADA, e é o PR3 que abrirá a superfície estreita.
    for (const proibido of [
      'create policy',
      'drop policy',
      'alter policy',
      'row level security',
      'has_active_assistant',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não mexe em grants', () => {
    expect(SQL).not.toContain('grant ');
    expect(SQL).not.toContain('revoke ');
  });

  it('não cria RPC de reserva', () => {
    expect(SQL).not.toContain('create function');
    expect(SQL).not.toContain('create or replace function');
    for (const proibido of [
      'reservar_relatorio',
      'consumir_demo',
      'gerar_demo',
      'claim_demo',
      'release_demo',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não cria tabela de créditos', () => {
    // A arquitetura aprovada não tem segundo lugar onde a verdade possa ficar
    // diferente: o relatório demo É o registro de uso.
    for (const proibido of [
      'report_credits',
      'demo_credits',
      'entitlements',
      'free_report_uses',
      'promotions',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não altera output_text', () => {
    // Continua NOT NULL. A representação segura da reserva é decisão do PR3.
    expect(SQL).not.toContain('output_text');
    expect(SQL).not.toContain('drop not null');
  });

  it('não toca FDT, CorrigeFácil nem seus gates', () => {
    for (const proibido of [
      'instruments',
      'is_free_demo',
      'assessments',
      'can_access_corrigefacil_instrument',
      'can_access_corrigefacil_scale',
      'has_corrigefacil_access',
      'update_corrigefacil_report_text',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });
});

describe('PR2 · a aplicação continua exatamente como antes', () => {
  const ROTA = source('src/app/api/assistant/generate/route.ts');
  const GERADOR = source('src/lib/corrigefacil/report-generator.ts');

  it('o CLIENTE nunca escolhe a origem', () => {
    // Enquanto o PR2 era só fundação, a garantia era "nenhum código menciona
    // a coluna". O PR3 ligou o caminho e a garantia ficou mais forte: o
    // código conhece a origem, mas ela é DECIDIDA no servidor. O que não
    // pode existir é o cliente mandando a própria origem no payload.
    for (const fonte of [ROTA, GERADOR]) {
      expect(fonte).not.toContain('body.billing_origin');
      expect(fonte).not.toContain('body.billingOrigin');
      expect(fonte).not.toContain("body['billing_origin']");
    }
    // A rota decide por has_active_assistant, e só por isso.
    expect(ROTA).toMatch(
      /hasActivePro\s*\?\s*'subscription'\s*:\s*'free_demo'/,
    );
  });

  it('os dois INSERTs continuam omitindo a coluna — e caem no default', () => {
    for (const fonte of [ROTA, GERADOR]) {
      expect(fonte).toContain(".from('ai_reports')");
      expect(fonte).toContain('output_text:');
    }
    expect(GERADOR).toContain('corrigefacil_assessment_id: assessmentId');
  });

  it('a cota mensal continua 50 e continua SEM filtro de origem', () => {
    // DEPENDÊNCIA OBRIGATÓRIA DO PR3, registrada aqui de propósito: hoje a
    // contagem não filtra origem, e não precisa — nenhuma linha 'free_demo'
    // pode existir. Antes de o PR3 permitir a primeira, GET e POST têm de
    // passar a contar somente billing_origin = 'subscription', ou a demo
    // gratuita comeria um dos 50 relatórios de quem assinar depois.
    expect(ROTA).toContain('const MONTHLY_LIMIT = 50;');
    const contagens =
      ROTA.match(/\.select\('id', \{ count: 'exact', head: true \}\)/g) ?? [];
    expect(contagens).toHaveLength(2);
  });

  it('o gate do Relatório Pró na rota não foi afrouxado', () => {
    expect(ROTA).toContain('has_active_assistant');
    expect(ROTA).not.toContain('createAdminClient');
    expect(ROTA).not.toContain('SERVICE_ROLE');
  });
});

describe('PR2 · a migration é a única fonte da coluna', () => {
  const TODAS = readdirSync(join(process.cwd(), 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const EU = '20260818120000_ai_reports_billing_origin.sql';

  it('nenhuma outra migration DEFINE billing_origin ou o índice', () => {
    // CONSUMIR a coluna é esperado — o PR3 a lê nas policies e nas RPCs, e é
    // assim que a regra fica com um dono só. O que não pode existir é uma
    // segunda DEFINIÇÃO: aí passariam a ser duas verdades sobre a mesma
    // coluna, e a última a rodar venceria em silêncio. Mesma distinção que
    // fdt-free-foundation.test.ts já faz para is_free_demo.
    for (const arquivo of TODAS.filter((f) => f !== EU)) {
      const corpo = semComentarios(
        source(join('supabase/migrations', arquivo)),
      ).toLowerCase();
      expect(corpo, arquivo).not.toContain('add column if not exists billing_origin');
      expect(corpo, arquivo).not.toContain('drop column billing_origin');
      expect(corpo, arquivo).not.toContain('add constraint ai_reports_billing_origin_check');
      expect(corpo, arquivo).not.toContain('create unique index if not exists ai_reports_user_free_demo_uidx');
      expect(corpo, arquivo).not.toContain('drop index ai_reports_user_free_demo_uidx');
    }
  });

  it('entra em ordem: depois de tudo que existia antes dela', () => {
    // Supabase aplica por ordem lexical do nome. Ela pressupõe aplicada a
    // migration que criou corrigefacil_assessment_id em ai_reports.
    const anteriores = TODAS.filter((f) => f < EU);
    expect(anteriores).toContain(
      '20260809214000_link_ai_reports_to_corrigefacil_assessments.sql',
    );
    expect(anteriores).toContain(
      '20260817230000_corrigefacil_report_metadata_por_instrumento.sql',
    );
    expect(TODAS.indexOf(EU)).toBe(anteriores.length);
  });
});
