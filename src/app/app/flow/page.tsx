'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ExternalLink, Workflow, Calendar, Users, ListChecks, Wand2, Download, Printer, Image as ImageIcon, ArrowRight } from 'lucide-react';

const FLOW_URL = 'https://flow.psicoplanilha.com';

const BENEFITS = [
  { icon: Calendar, title: 'Plano semanal visual', description: 'Veja a semana toda organizada em um só lugar.' },
  { icon: Users, title: 'Cadastro de aprendentes', description: 'Mantenha os dados de cada aprendente organizados.' },
  { icon: ListChecks, title: '81 atividades organizadas', description: 'Banco de atividades pronto para usar no dia a dia.' },
  { icon: Wand2, title: 'Prompts e roteiros para IA externa', description: 'Roteiros prontos para usar com assistentes de IA externos.' },
  { icon: Download, title: 'Backup manual dos dados', description: 'Exporte uma cópia dos seus dados quando quiser.' },
  { icon: Printer, title: 'Impressão/PDF do plano', description: 'Gere o plano em PDF ou imprima quando precisar.' },
];

const STEPS = [
  'Acesse o Flow',
  'Cadastre seus aprendentes',
  'Monte planos e registre atividades',
  'Faça backup quando quiser',
];

const SCREENS = ['Dashboard', 'Aprendentes', 'Plano semanal', 'Atividades', 'Prompts/Roteiros', 'Meus dados/backup'];

export default function AppFlowPage() {
  const [hasFlowAccess, setHasFlowAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setHasFlowAccess(false);
          return;
        }
        const { data, error } = await supabase
          .from('user_access_status')
          .select('has_flow_access')
          .eq('user_id', user.id)
          .single();
        if (cancelled) return;
        if (error) {
          setHasFlowAccess(false);
          return;
        }
        setHasFlowAccess(Boolean(data?.has_flow_access));
      } catch {
        if (!cancelled) setHasFlowAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header editorial */}
      <header className="space-y-2 pt-4">
        <h1 className="font-serif italic text-4xl md:text-5xl text-pp-ink leading-tight">PsicoPlanilhas Flow</h1>
        <p className="text-pp-ink-soft text-base md:text-lg">
          Organize aprendentes, planos semanais, atividades e prompts em uma ferramenta simples para o dia a dia psicopedagógico.
        </p>
      </header>

      {/* Bloco principal — preço, licença, explicação e CTA */}
      <section className="bg-pp-block-lilac rounded-block p-8 md:p-10 space-y-6">
        <div className="flex items-center gap-2 text-pp-ink-soft">
          <Workflow className="w-5 h-5" aria-hidden="true" />
          <p className="font-serif italic text-sm">Ferramenta externa</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-pp-ink text-3xl md:text-4xl font-medium">
            R$47,00
            <span className="text-pp-ink-soft text-base font-normal ml-2">pagamento único</span>
          </p>
          <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
            Licença vitalícia por computador
          </span>
        </div>

        <p className="text-pp-ink-soft text-sm font-medium">Pague uma vez e use Vitalício.</p>

        <p className="text-pp-ink-soft text-base leading-relaxed max-w-2xl">
          O Flow é um aplicativo separado do Psico2. Suas informações ficam guardadas no seu próprio computador.
        </p>

        <div>
          {hasFlowAccess === null ? (
            <div className="h-[52px] w-72 max-w-full rounded-pill bg-pp-ink/10 animate-pulse" />
          ) : hasFlowAccess === true ? (
            <>
              <a
                href={FLOW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
              >
                Acessar PsicoPlanilhas Flow
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
              <p className="text-xs text-pp-ink-soft mt-2">Abre em uma nova aba.</p>
            </>
          ) : (
            <>
              <Link
                href="/app/produtos#psicoplanilhas-flow"
                className="inline-flex items-center gap-2 bg-pp-ink text-pp-canvas px-8 py-3.5 rounded-pill text-base font-medium hover:bg-pp-ink-soft transition"
              >
                Comprar por R$47,00
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <p className="text-xs text-pp-ink-soft mt-2">Você será levado até a vitrine de produtos.</p>
            </>
          )}
        </div>
      </section>

      {/* Cards de benefícios */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-white border border-pp-hairline rounded-xl p-4 space-y-2">
            <div className="text-pp-ink"><Icon className="w-[22px] h-[22px]" aria-hidden="true" /></div>
            <strong className="text-pp-ink block text-sm font-medium">{title}</strong>
            <p className="text-xs text-pp-ink-soft leading-relaxed">{description}</p>
          </div>
        ))}
      </section>

      {/* Como funciona */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium text-pp-ink">Como funciona</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 bg-white border border-pp-hairline rounded-xl p-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-pp-ink text-pp-canvas flex items-center justify-center text-sm font-medium">
                {i + 1}
              </span>
              <p className="text-sm text-pp-ink leading-relaxed pt-1.5">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Telas do Flow — placeholders elegantes, sem imagem ainda */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium text-pp-ink">Telas do Flow</h2>
          <p className="text-sm text-pp-ink-soft mt-1">Em breve, uma prévia visual de cada parte do Flow.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SCREENS.map((label) => (
            <div
              key={label}
              className="aspect-video rounded-xl border-2 border-dashed border-pp-hairline bg-pp-hairline-soft/60 flex flex-col items-center justify-center gap-2 text-pp-ink-soft"
            >
              <ImageIcon className="w-6 h-6" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Rodapé */}
      <footer className="pt-4 border-t border-pp-hairline-soft">
        <p className="text-center text-xs text-pp-ink-soft max-w-3xl mx-auto leading-relaxed">
          <strong className="font-medium">Aviso:</strong> O PsicoPlanilhas Flow é uma ferramenta de organização profissional. Revise os registros antes de usar em documentos formais.
        </p>
      </footer>

    </div>
  );
}
