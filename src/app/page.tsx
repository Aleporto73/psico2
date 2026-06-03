import React from 'react';
import Link from 'next/link';

// ── SVG Icons minimalistas (stroke-width 1.5) ────────────────────────────────

function IconLogin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function IconActivate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 9-9" />
      <path d="m16 7 3 3" />
      <path d="m18 5 3 3" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6z" />
    </svg>
  );
}

export default function Home() {
  const routes = [
    { href: '/login',          icon: <IconLogin />,    label: '/login',                 desc: 'Formulário de acesso padrão com e-mail e senha.' },
    { href: '/ativar-acesso',  icon: <IconActivate />, label: '/ativar-acesso',         desc: 'Fluxo seguro de ativação por e-mail para clientes.' },
    { href: '/esqueci-senha',  icon: <IconKey />,      label: '/esqueci-senha',         desc: 'Formulário de recuperação de senha por e-mail.' },
    { href: '/definir-senha',  icon: <IconLock />,     label: '/definir-senha',         desc: 'Página de cadastro de nova senha.' },
    { href: '/app',            icon: <IconApp />,      label: '/app (Área do Cliente)', desc: 'Dashboard com planilhas e Assistente IA Pro.' },
    { href: '/admin',          icon: <IconAdmin />,    label: '/admin (Administração)', desc: 'Painel para controle de acessos, importação e logs.' },
  ];

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[#061923] font-sans text-[#F8FAFC] p-6">
      <main className="w-full max-w-3xl p-8 md:p-10 space-y-8 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] shadow-2xl text-center md:text-left">
        <div className="space-y-3">
          <div className="inline-block px-3 py-1 text-xs font-semibold text-[#7DD3FC] bg-[#7DD3FC]/10 rounded-full border border-[#7DD3FC]/20">
            Plataforma PsicoPlanilhas
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
            PsicoPlanilhas 2.0
          </h1>
          <p className="text-lg text-[#CBD5E1] leading-relaxed">
            Área de membros para planilhas profissionais, apoio operacional e assistente inteligente.
          </p>
        </div>

        <div className="border-t border-[#1F4D5C]"></div>

        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#CBD5E1] tracking-wide">Rotas do sistema</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {routes.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="flex items-start gap-3 p-4 bg-[#0E2A38] hover:bg-[#123340] rounded-xl border border-[#1F4D5C] hover:border-[#7DD3FC]/50 transition duration-200 text-left"
              >
                <span className="shrink-0 mt-0.5 text-[#7DD3FC]">{r.icon}</span>
                <div className="min-w-0">
                  <span className="block font-semibold text-[#F8FAFC]">{r.label}</span>
                  <span className="block text-xs text-[#94A3B8] mt-1 leading-relaxed">{r.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-[#94A3B8]/70 leading-relaxed">
          Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação ou interpretação clínica.
        </div>
      </main>
    </div>
  );
}
