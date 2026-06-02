import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 font-sans text-slate-100 p-6">
      <main className="w-full max-w-3xl p-8 space-y-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl text-center md:text-left">
        <div className="space-y-3">
          <div className="inline-block px-3 py-1 text-xs font-semibold text-amber-500 bg-amber-500/10 rounded-full border border-amber-500/20">
            Fase 0 &amp; Fase 1 Concluídas
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            PsicoPlanilhas 2.0
          </h1>
          <p className="text-lg text-slate-400">
            Área de membros para planilhas profissionais, apoio operacional e assistente inteligente.
          </p>
        </div>

        <div className="border-t border-slate-800 my-6"></div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-300">Rotas Base do Sistema</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="/login"
              className="flex flex-col p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 text-left"
            >
              <span className="font-semibold text-white">/login</span>
              <span className="text-xs text-slate-500 mt-1">Formulário de acesso padrão com e-mail e senha.</span>
            </Link>

            <Link 
              href="/ativar-acesso"
              className="flex flex-col p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 text-left"
            >
              <span className="font-semibold text-white">/ativar-acesso</span>
              <span className="text-xs text-slate-500 mt-1">Fluxo seguro de ativação por e-mail para clientes antigos.</span>
            </Link>

            <Link 
              href="/esqueci-senha"
              className="flex flex-col p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 text-left"
            >
              <span className="font-semibold text-white">/esqueci-senha</span>
              <span className="text-xs text-slate-500 mt-1">Formulário de recuperação de senha por e-mail.</span>
            </Link>

            <Link 
              href="/definir-senha"
              className="flex flex-col p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 text-left"
            >
              <span className="font-semibold text-white">/definir-senha</span>
              <span className="text-xs text-slate-500 mt-1">Página de cadastro de nova senha.</span>
            </Link>

            <Link 
              href="/app"
              className="flex flex-col p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 text-left"
            >
              <span className="font-semibold text-white">/app (Área do Cliente)</span>
              <span className="text-xs text-slate-500 mt-1">Dashboard com planilhas e Assistente IA Pro.</span>
            </Link>

            <Link 
              href="/admin"
              className="flex flex-col p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 text-left"
            >
              <span className="font-semibold text-white">/admin (Administração)</span>
              <span className="text-xs text-slate-500 mt-1">Painel para controle de acessos, importação e logs.</span>
            </Link>
          </div>
        </div>

        <div className="pt-4 text-center text-xs text-slate-600">
          Esta plataforma é um recurso de apoio operacional. Exige o uso do manual original e não substitui avaliação ou interpretação clínica.
        </div>
      </main>
    </div>
  );
}
