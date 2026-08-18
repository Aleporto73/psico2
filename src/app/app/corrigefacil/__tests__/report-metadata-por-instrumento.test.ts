// O gate dos METADADOS do Relatório Pró (hotfix), no padrão de leitura de
// fonte já usado em documento-relatorio.test.ts e fdt-free-foundation.test.ts.
//
// O INCIDENTE que estas guardas trancam: usuário com Relatórios Pró ativo e
// sem o CorrigeFácil completo aplicava o FDT gratuito, salvava, pedia o
// relatório e recebia "Avaliação salva não encontrada" — com a avaliação
// existindo. As policies de metadados exigiam o produto INTEIRO, a RLS
// escondia a linha do FDT, e o embed `!inner` levava a linha PAI junto.
//
// O que o vitest consegue provar aqui é o CONTRATO do arquivo: qual gate as
// policies passam a usar, que a regra comercial não foi copiada para dentro
// delas, e que nenhum grant foi ampliado.
//
// O que ele NÃO prova é o comportamento da RLS — isso se prova contra o
// Postgres, e foi provado: a migration foi aplicada numa transação contra o
// banco de produção e revertida, com os seis casos medidos como
// `authenticated`. O resultado está no corpo do PR.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(caminho: string) {
  return readFileSync(join(process.cwd(), caminho), 'utf8');
}

function semComentarios(sql: string) {
  return sql.replace(/^\s*--.*$/gm, '');
}

const CAMINHO =
  'supabase/migrations/20260817230000_corrigefacil_report_metadata_por_instrumento.sql';

const MIGRATION = source(CAMINHO);
const SQL = semComentarios(MIGRATION).toLowerCase();

/** Só o corpo do helper — entre `as $$` e o `$$;` seguinte. */
const CORPO_HELPER = (() => {
  const inicio = SQL.indexOf('create or replace function public.can_access_corrigefacil_scale');
  const abre = SQL.indexOf('as $$', inicio);
  const fecha = SQL.indexOf('$$;', abre + 5);
  return SQL.slice(abre + 5, fecha);
})();

describe('hotfix · as duas policies passam a usar o gate por instrumento', () => {
  it('recria as MESMAS policies, pelo nome', () => {
    // Nome novo deixaria as antigas vivas, e duas policies SELECT se somam
    // por OR — é assim que uma regra revogada continua valendo.
    for (const nome of [
      'corrigefacil_report_metadata_instruments',
      'corrigefacil_report_metadata_scales',
    ]) {
      expect(SQL, nome).toContain(`drop policy if exists "${nome}"`);
      expect(SQL, nome).toContain(`create policy "${nome}"`);
    }
  });

  it('instruments decide pelo código da própria linha', () => {
    expect(SQL).toContain(
      'public.can_access_corrigefacil_instrument(auth.uid(), code)',
    );
  });

  it('scales decide pelo helper, e não por subconsulta a instruments', () => {
    // Expressão de policy roda com os privilégios de quem consulta, então um
    // subselect aqui sofreria a RLS de `instruments` e amarraria as duas
    // policies. Medido em produção: `exists (select 1 from instruments
    // where code='FDT')` devolve false para o usuário do incidente.
    expect(SQL).toContain('public.can_access_corrigefacil_scale(auth.uid(), id)');

    const policyScales = SQL.slice(
      SQL.indexOf('create policy "corrigefacil_report_metadata_scales"'),
    );
    expect(policyScales).not.toContain('from public.instruments');
    expect(policyScales).not.toContain('exists (');
  });

  it('Relatórios Pró continua exigido nas duas', () => {
    expect((SQL.match(/public\.has_active_assistant\(auth\.uid\(\)\)/g) ?? []))
      .toHaveLength(2);
  });

  it('o gate ANTIGO do produto inteiro sai das duas policies', () => {
    expect(SQL).not.toContain('has_corrigefacil_access(auth.uid())');
  });
});

describe('hotfix · o helper é estreito e não vaza', () => {
  it('existe, é SECURITY DEFINER e tem search_path fixo', () => {
    expect(SQL).toContain(
      'create or replace function public.can_access_corrigefacil_scale',
    );
    expect(SQL).toContain('security definer');
    expect(SQL).toContain('set search_path = public');
    expect(SQL).toContain('stable');
    expect(SQL).toContain('returns boolean');
  });

  it('devolve booleano e nada mais', () => {
    // Um `exists`, sem select de coluna: não há dado de escala, instrumento
    // ou norma saindo por aqui.
    expect(CORPO_HELPER).toContain('select exists (');
    expect(CORPO_HELPER).toContain('select 1');
    for (const proibido of ['s.name', 'i.name', 'raw_', 'norm', 'percentil']) {
      expect(CORPO_HELPER, proibido).not.toContain(proibido);
    }
  });

  it('DELEGA a decisão, não a reimplementa', () => {
    expect(CORPO_HELPER).toContain(
      'public.can_access_corrigefacil_instrument(user_uuid, i.code)',
    );
    for (const proibido of [
      'purchases',
      'payment_status',
      'products',
      'subscriptions',
      'is_free_demo',
      "role = 'admin'",
      "status = 'active'",
    ]) {
      expect(CORPO_HELPER, proibido).not.toContain(proibido);
    }
  });

  it('menor privilégio, como as funções irmãs', () => {
    const alvo = 'public.can_access_corrigefacil_scale(uuid, uuid)';
    expect(SQL).toContain(`revoke all on function ${alvo} from public`);
    expect(SQL).toContain(`revoke all on function ${alvo} from anon`);
    expect(SQL).toContain(`grant execute on function ${alvo} to authenticated`);
    expect(SQL).toContain(`grant execute on function ${alvo} to service_role`);
  });
});

describe('hotfix · o que ele NÃO pode ter feito', () => {
  it('não amplia grant de coluna nem libera tabela nova', () => {
    for (const proibido of [
      'grant select',
      'revoke select',
      'norm_sets',
      'norm_entries',
      'norm_stats',
      'classification_bands',
      'items',
      'option_sets',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não toca o gate do FDT gratuito nem a flag', () => {
    for (const proibido of [
      'create or replace function public.can_access_corrigefacil_instrument',
      'alter table public.instruments',
      'is_free_demo =',
      'create or replace function public.has_corrigefacil_access',
      'create or replace function public.has_active_assistant',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não implementa relatório gratuito', () => {
    for (const proibido of [
      'billing_origin',
      'free_demo_report',
      'reservar_relatorio',
      'ai_reports',
      'promotional',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('entra em ordem: depois de tudo que existia antes dela', () => {
    // Supabase aplica por ordem lexical do nome. O que precisa ser verdade é
    // o hotfix não entrar ANTES das migrations que ele pressupõe aplicadas —
    // ele RECRIA policies nascidas lá atrás. Ser a ÚLTIMA nunca foi a regra,
    // e deixou de ser o fato: a fundação de billing_origin veio depois.
    // Mesma checagem do irmão em fdt-free-foundation.test.ts.
    const todas = readdirSync(join(process.cwd(), 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const eu = '20260817230000_corrigefacil_report_metadata_por_instrumento.sql';
    const anteriores = todas.filter((f) => f < eu);
    expect(anteriores).toContain(
      '20260817120000_corrigefacil_free_demo_instrument.sql',
    );
    expect(todas.indexOf(eu)).toBe(anteriores.length);
  });
});

describe('hotfix · o gerador não foi contornado', () => {
  const GERADOR = source('src/lib/corrigefacil/report-generator.ts');
  const ROTA = source('src/app/api/assistant/generate/route.ts');

  it('continua lendo com o client do USUÁRIO, sem service_role', () => {
    // A correção é de policy. Contornar a RLS com service_role resolveria o
    // sintoma e removeria a rede de proteção que hoje garante a posse.
    for (const fonte of [GERADOR, ROTA]) {
      expect(fonte).not.toContain('createAdminClient');
      expect(fonte).not.toContain('service_role');
      expect(fonte).not.toContain('SERVICE_ROLE');
    }
  });

  it('a posse do assessment continua filtrada na query', () => {
    expect(GERADOR).toContain(".eq('user_id', userId)");
  });

  it('Relatórios Pró continua sendo o gate da rota', () => {
    // `not.toContain('billing_origin')` valia enquanto a coluna existia sem
    // caminho de código. O PR3 ligou o caminho, e a garantia que importa
    // deixou de ser "a rota não conhece a origem" e passou a ser "a rota
    // DECIDE a origem, e o cliente não opina" — verificada logo abaixo.
    expect(ROTA).toContain('has_active_assistant');
  });

  it('a origem é decidida no servidor, nunca pelo corpo do request', () => {
    expect(ROTA).toMatch(
      /hasActivePro\s*\?\s*'subscription'\s*:\s*'free_demo'/,
    );
    expect(ROTA).not.toContain('body.billing_origin');
    expect(ROTA).not.toContain('body.billingOrigin');
  });

  it('os embeds seguem pedindo só metadado de apresentação', () => {
    expect(GERADOR).toContain('instruments!inner(code, name)');
    expect(GERADOR).toContain('scales!inner(code, name, ordinal)');
  });
});
