'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { ModeloFormulario } from './form-model';
import type { EstadoFormulario } from './form-state';

export function DateNormFields({
  modelo,
  estado,
  setEstado,
}: {
  modelo: ModeloFormulario;
  estado: EstadoFormulario;
  setEstado: Dispatch<SetStateAction<EstadoFormulario>>;
}) {
  if (!modelo.exigeDataNascimento) return null;

  const atualizar = (patch: Partial<EstadoFormulario>) =>
    setEstado((s) => ({ ...s, ...patch, selector: {} }));

  return (
    <section className="bg-pp-block-lilac rounded-block p-6 space-y-4">
      <div>
        <p className="text-pp-ink text-sm font-medium">Idade para seleção da norma</p>
        <p className="text-pp-ink-soft text-xs mt-1">
          A idade normativa é calculada no servidor a partir das datas abaixo.
        </p>
      </div>

      <div className={`grid gap-3 ${modelo.suportaPrematuridade ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}>
        <label className="text-xs text-pp-ink-soft space-y-1">
          <span className="block">Nascimento</span>
          <input
            type="date"
            value={estado.birthDate}
            onChange={(e) => atualizar({ birthDate: e.target.value })}
            className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
          />
        </label>

        <label className="text-xs text-pp-ink-soft space-y-1">
          <span className="block">Data da avaliação</span>
          <input
            type="date"
            value={estado.evaluationDate}
            onChange={(e) => atualizar({ evaluationDate: e.target.value })}
            className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
          />
        </label>

        {modelo.suportaPrematuridade && (
          <>
            <label className="text-xs text-pp-ink-soft space-y-1">
              <span className="block">Prematuridade (semanas)</span>
              <input
                type="number"
                min={0}
                max={20}
                step={1}
                value={estado.prematurityWeeks}
                onChange={(e) =>
                  atualizar({ prematurityWeeks: e.target.value === '' ? 0 : Number(e.target.value) })
                }
                className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
              />
            </label>

            <label className="text-xs text-pp-ink-soft space-y-1">
              <span className="block">Regra de correção</span>
              <select
                value={estado.prematurityRule}
                onChange={(e) =>
                  atualizar({
                    prematurityRule: e.target.value as EstadoFormulario['prematurityRule'],
                  })
                }
                className="w-full rounded-pill border border-pp-ink/15 bg-white/60 px-4 py-2 text-sm text-pp-ink"
              >
                <option value="ate_24_meses">Até 24 meses (padrão do manual)</option>
                <option value="sempre">Sempre (qualquer idade)</option>
                <option value="nao_corrigir">Não corrigir</option>
              </select>
            </label>
          </>
        )}
      </div>
    </section>
  );
}
