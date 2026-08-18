// Fundação de banco do instrumento gratuito (PR0), no padrão de leitura de
// fonte já usado em documento-relatorio.test.ts.
//
// A verificação mais forte desta migration NÃO está aqui: está dentro dela.
// O bloco `do $$` conta as linhas que marcou e recusa a transação inteira se
// não for exatamente uma, e depois confere o conjunto final. Quem executa
// aquilo é o Postgres, contra o banco de verdade — nenhuma asserção de texto
// chega perto disso.
//
// O que sobra para cá é o que só se perde por edição humana: a COMPOSIÇÃO
// (a função chama has_corrigefacil_access em vez de reescrevê-la), o
// contrato de NULL, a guarda de perfil bloqueado, e a lista do que esta
// migration não pode ter passado a fazer. São invariantes de arquitetura, e
// falhar aqui é a forma barata de perceber que uma delas caiu.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/** Fonte sem comentários.
 *
 *  As guardas de "não faz X" precisam olhar CÓDIGO. Os comentários desta
 *  migration citam `purchases`, `payment_status` e `admin` de propósito —
 *  para explicar por que ela NÃO os consulta —, e uma busca ingênua leria
 *  a explicação como se fosse a implementação. */
function semComentarios(sql: string) {
  return sql.replace(/^\s*--.*$/gm, '');
}

const CAMINHO =
  'supabase/migrations/20260817120000_corrigefacil_free_demo_instrument.sql';

const MIGRATION = source(CAMINHO);
const SQL = semComentarios(MIGRATION);
const sql = SQL.toLowerCase();

/** Só o corpo da função — o que está entre `as $$` e o `$$;` seguinte.
 *
 *  A migration tem DOIS blocos `$$`: o `do $$` que marca o FDT e o corpo da
 *  função. Guardas sobre a decisão de autorização precisam olhar o segundo
 *  isolado, senão leem o `raise exception` do primeiro (que é legítimo) e o
 *  `or` de `create or replace` (que é sintaxe). */
const CORPO_FUNCAO = (() => {
  const inicio = sql.indexOf('create or replace function');
  const abre = sql.indexOf('as $$', inicio);
  const fecha = sql.indexOf('$$;', abre + 5);
  return sql.slice(abre + 5, fecha);
})();

describe('PR0 · a flag é o dado', () => {
  it('cria is_free_demo em instruments, fechada por padrão', () => {
    expect(sql).toContain('alter table public.instruments');
    expect(sql).toContain('add column if not exists is_free_demo boolean not null default false');
  });

  it('o padrão fechado é o ponto: instrumento novo não nasce gratuito', () => {
    // `not null default false` sem o `default false` seria coluna nula, e
    // `is_free_demo = true` num null é false — funcionaria por acidente.
    // Com o default explícito, os outros vinte ficam gravados como fechados
    // e a intenção fica legível no schema.
    expect(sql).toContain('not null default false');
    expect(sql).not.toContain('default true');
  });

  it('documenta a coluna sem copy comercial', () => {
    expect(sql).toContain('comment on column public.instruments.is_free_demo');
    for (const copy of ['grátis', 'gratis', 'experimente', 'promoção', 'promocao', 'demonstração']) {
      expect(MIGRATION.toLowerCase().split('comment on column')[1] ?? '', copy)
        .not.toContain(copy);
    }
  });
});

describe('PR0 · um instrumento marcado, e a migration prova isso sozinha', () => {
  it('marca o FDT pelo código canônico', () => {
    expect(sql).toContain('update public.instruments');
    expect(sql).toContain('set is_free_demo = true');
    expect(sql).toContain("where code = 'fdt'");
  });

  it('nenhum outro instrumento é marcado', () => {
    // Um `set is_free_demo = true` só, e uma cláusula de código só.
    expect(sql.match(/set is_free_demo = true/g)).toHaveLength(1);
    const codigos = sql.match(/code\s*=\s*'[^']+'/g) ?? [];
    expect(codigos).toEqual(["code = 'fdt'"]);
  });

  it('aborta se não marcar exatamente uma linha', () => {
    expect(sql).toContain('get diagnostics v_rows = row_count');
    expect(sql).toContain('if v_rows <> 1 then');
    expect(sql).toContain('raise exception');
  });

  it('aborta se o conjunto final não for exatamente {FDT}', () => {
    // A primeira guarda pega "o FDT sumiu". Esta pega "alguém já tinha
    // marcado outro antes", que a primeira não veria.
    expect(sql).toContain('array_agg');
    expect(sql).toContain("array['fdt']::text[]");
    expect(sql).toContain('v_free_demo <> ');
  });
});

describe('PR0 · a função é a interface', () => {
  it('cria can_access_corrigefacil_instrument(uuid, text) com code opcional', () => {
    expect(sql).toContain('create or replace function public.can_access_corrigefacil_instrument');
    expect(sql).toContain('user_uuid       uuid');
    expect(sql).toContain('instrument_code text default null');
    expect(sql).toContain('returns boolean');
  });

  it('COMPÕE com has_corrigefacil_access em vez de reescrevê-la', () => {
    expect(sql).toContain('public.has_corrigefacil_access(user_uuid)');
  });

  it('NÃO duplica a regra comercial do produto', () => {
    // Este é o teste que mais importa do arquivo. No dia em que alguém
    // "otimizar" a função inlinando o join de purchases, a regra comercial
    // passa a ter dois donos e eles divergem na primeira mudança de
    // pagamento. Nada disso pode aparecer no CÓDIGO da migration.
    for (const proibido of [
      'purchases',
      'payment_status',
      'subscriptions',
      'products',
      'expires_at',
      "'paid'",
      "'manual'",
      "role = 'admin'",
      'is_admin()',
    ]) {
      expect(sql, proibido).not.toContain(proibido);
    }
  });

  it('contrato de compatibilidade: code nulo devolve has_corrigefacil_access', () => {
    // `instrument_code is not null` devolve FALSE (nunca null) quando o
    // código é nulo; o `and` inteiro vira false; e `X or false` é X. É o que
    // permite trocar a consulta nas rotas sem código sem mudar nada.
    expect(CORPO_FUNCAO).toContain('instrument_code is not null');
    // UM `or` só no corpo: dois operandos, direito completo e exceção do
    // gratuito. Um terceiro operando aqui seria uma regra que ninguém
    // documentou.
    expect(CORPO_FUNCAO.match(/\bor\b/g)).toHaveLength(1);
    // e o `or` vem DEPOIS da chamada ao direito completo, não antes: é essa
    // ordem que faz `X or false` colapsar em X quando o código é nulo.
    expect(CORPO_FUNCAO.indexOf('has_corrigefacil_access')).toBeLessThan(
      CORPO_FUNCAO.indexOf(' or ('),
    );
  });

  it('a exceção gratuita exige perfil ativo — bloqueado continua sem nada', () => {
    expect(sql).toContain('from public.profiles pr');
    expect(sql).toContain("pr.status = 'active'");
    expect(sql).toContain('pr.id     = user_uuid');
  });

  it('a exceção gratuita exige instrumento publicado E marcado', () => {
    expect(sql).toContain('from public.instruments i');
    expect(sql).toContain('i.code         = instrument_code');
    expect(sql).toContain('i.is_active    = true');
    expect(sql).toContain('i.is_free_demo = true');
  });

  it('código inexistente não levanta erro: é só um exists que não casa', () => {
    // Dois `exists`: perfil ativo e instrumento marcado. Nenhum `raise` no
    // corpo — a função é uma expressão booleana, e código inexistente
    // simplesmente não casa. Quem consome recebe false, nunca exceção.
    expect(CORPO_FUNCAO.match(/exists \(/g)).toHaveLength(2);
    expect(CORPO_FUNCAO).not.toContain('raise');
    expect(CORPO_FUNCAO).not.toContain('coalesce');
  });
});

describe('PR0 · forma e privilégio, espelhando has_corrigefacil_access', () => {
  it('security definer com search_path fixo', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path = public');
  });

  it('stable e language sql, como a função irmã', () => {
    expect(sql).toContain('language sql');
    expect(sql).toContain('stable');
    expect(sql).not.toContain('volatile');
  });

  it('menor privilégio: authenticated e service_role, nunca anon', () => {
    expect(sql).toContain('revoke all on function public.can_access_corrigefacil_instrument(uuid, text) from public');
    expect(sql).toContain('revoke all on function public.can_access_corrigefacil_instrument(uuid, text) from anon');
    expect(sql).toContain('grant execute on function public.can_access_corrigefacil_instrument(uuid, text) to authenticated');
    expect(sql).toContain('grant execute on function public.can_access_corrigefacil_instrument(uuid, text) to service_role');
    expect(sql).not.toContain('to anon');
  });

  it('a função é documentada', () => {
    expect(sql).toContain('comment on function public.can_access_corrigefacil_instrument(uuid, text)');
  });
});

describe('PR0 · o que esta migration NÃO pode fazer', () => {
  it('não altera has_corrigefacil_access', () => {
    expect(sql).not.toContain('create or replace function public.has_corrigefacil_access');
    expect(sql).not.toContain('drop function public.has_corrigefacil_access');
    expect(sql).not.toContain('alter function public.has_corrigefacil_access');
  });

  it('não toca RLS, policy ou grant de tabela', () => {
    for (const proibido of [
      'create policy',
      'alter policy',
      'drop policy',
      'row level security',
      'grant select',
      'revoke select',
      'grant insert',
      'grant update',
      'grant all on table',
    ]) {
      expect(sql, proibido).not.toContain(proibido);
    }
  });

  it('não cria compra, assinatura nem entitlement', () => {
    for (const proibido of [
      'insert into public.purchases',
      'insert into public.subscriptions',
      'insert into public.products',
      'entitlement',
      'promo',
      'credit',
    ]) {
      expect(sql, proibido).not.toContain(proibido);
    }
  });

  it('não mexe no instrumento além da flag', () => {
    for (const proibido of [
      'is_active =',
      'norm_',
      'scales',
      'items',
      'score_type',
      'delete from',
      'drop table',
      'drop column',
    ]) {
      expect(sql, proibido).not.toContain(proibido);
    }
  });

  it('não toca ai_reports nem billing_origin — isso é PR2/PR3', () => {
    for (const proibido of ['ai_reports', 'billing_origin', 'free_demo_report', 'assessments']) {
      expect(sql, proibido).not.toContain(proibido);
    }
  });
});

describe('PR0 · a migration é a única fonte destas peças', () => {
  const TODAS = readdirSync(join(process.cwd(), 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  it('nenhuma outra migration DEFINE is_free_demo ou a função', () => {
    // CONSUMIR as duas é esperado — a policy de metadados do Relatório Pró
    // chama a função, e é assim que a regra fica com um dono só. O que não
    // pode existir é uma segunda DEFINIÇÃO: aí passariam a ser duas regras
    // com o mesmo nome, e a última a rodar venceria em silêncio.
    const outras = TODAS.filter(
      (f) => f !== '20260817120000_corrigefacil_free_demo_instrument.sql',
    );
    for (const arquivo of outras) {
      const corpo = semComentarios(
        source(join('supabase/migrations', arquivo)),
      ).toLowerCase();
      expect(corpo, arquivo).not.toContain('add column if not exists is_free_demo');
      expect(corpo, arquivo).not.toContain('set is_free_demo');
      expect(corpo, arquivo).not.toContain(
        'create or replace function public.can_access_corrigefacil_instrument',
      );
      expect(corpo, arquivo).not.toContain(
        'drop function public.can_access_corrigefacil_instrument',
      );
    }
  });

  it('entra em ordem: depois de tudo que existia antes dela', () => {
    // Supabase aplica por ordem lexical do nome. Um timestamp menor que o de
    // uma migration anterior entraria fora de ordem e poderia nem rodar.
    // Migrations posteriores podem existir — e existem: o hotfix das
    // policies de metadados veio depois e consome a função criada aqui.
    const eu = '20260817120000_corrigefacil_free_demo_instrument.sql';
    const anteriores = TODAS.filter((f) => f < eu);
    expect(anteriores).toContain('20260816120000_deactivate_fdt_spreadsheet.sql');
    expect(TODAS.indexOf(eu)).toBe(anteriores.length);
  });
});
