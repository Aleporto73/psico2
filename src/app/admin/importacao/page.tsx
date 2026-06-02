'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ParsedRecord {
  name: string;
  email: string;
  phone?: string;
  purchase_code?: string;
  purchase_date?: string;
  profile_type?: string;
  source?: string;
}

export default function AdminImportacaoPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // States for counts & data
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [validRecords, setValidRecords] = useState<ParsedRecord[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<Array<{ email: string; name: string; reason: string }>>([]);
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);
  
  const [validated, setValidated] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simple, robust client-side CSV Parser
  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(',').map((val) => val.trim().replace(/^["']|["']$/g, ''));
      if (currentline.length > 0) {
        const obj: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          if (currentline[j] !== undefined) {
            obj[headers[j]] = currentline[j];
          }
        }
        results.push(obj);
      }
    }
    return results;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setValidated(false);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleValidate = () => {
    if (!csvText.trim()) {
      setErrorMsg('Por favor, carregue ou cole um arquivo CSV primeiro.');
      return;
    }

    setValidating(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const parsed = parseCSV(csvText);
      setRawRecords(parsed);

      const valid: ParsedRecord[] = [];
      const invalid: Array<{ email: string; name: string; reason: string }> = [];
      const processedEmails = new Set<string>();
      const duplicates: string[] = [];

      parsed.forEach((record, index) => {
        const email = record.email?.trim() || '';
        const name = record.name?.trim() || '';

        // Validation 1: Check required email
        if (!email) {
          invalid.push({ email: 'Ausente', name: name || `Linha ${index + 2}`, reason: 'E-mail não informado.' });
          return;
        }

        const normalizedEmail = email.toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validation 2: Check email format
        if (!emailRegex.test(normalizedEmail)) {
          invalid.push({ email: normalizedEmail, name, reason: 'Formato de e-mail inválido.' });
          return;
        }

        // Validation 3: Check duplicates within the file
        if (processedEmails.has(normalizedEmail)) {
          duplicates.push(normalizedEmail);
          return;
        }
        processedEmails.add(normalizedEmail);

        // Record is valid
        valid.push({
          name: name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          phone: record.phone || undefined,
          purchase_code: record.purchase_code || undefined,
          purchase_date: record.purchase_date || record.purchased_at || undefined,
          profile_type: record.profile_type || undefined,
          source: record.source || undefined,
        });
      });

      setValidRecords(valid);
      setInvalidRecords(invalid);
      setDuplicateEmails(duplicates);
      setValidated(true);
    } catch (err) {
      console.error('Validation error:', err);
      setErrorMsg('Falha ao processar o CSV. Verifique a formatação das colunas.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (validRecords.length === 0) {
      setErrorMsg('Não há clientes válidos para importar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: validRecords }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Erro ao importar clientes.');
      }

      setImportResult(resData.stats);
      setValidated(false);
      setCsvText('');
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Ocorreu um erro fatal durante a importação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-slate-955 text-slate-100 pb-16">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-amber-500 transition">Admin</Link>
              <span>/</span>
              <span className="text-slate-300">Importação CSV</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Importar Base Antiga</h1>
            <p className="text-slate-400 text-sm mt-0.5">Suba a lista de e-mails para ativar clientes antigos com acesso vitalício.</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition duration-200"
          >
            Voltar ao Admin
          </Link>
        </header>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Steps Description */}
        <div className="p-5 bg-slate-900/40 rounded-xl border border-slate-800 space-y-3 text-sm leading-relaxed">
          <h3 className="font-bold text-slate-200">Como funciona a importação?</h3>
          <ul className="list-disc pl-5 text-slate-400 space-y-1">
            <li>Os clientes serão importados com o status <strong className="text-amber-500">Pendente de Ativação</strong>.</li>
            <li>A importação é <strong className="text-slate-200">idempotente</strong>: rodar o mesmo arquivo não cria compras duplicadas.</li>
            <li>Para cada cliente, será liberado o acesso vitalício às planilhas (<strong className="text-emerald-400">psicoplanilhas-vitalicio</strong>).</li>
            <li>O Assistente IA Pro permanecerá bloqueado por padrão até que comprem a assinatura.</li>
          </ul>
        </div>

        {/* Upload Control */}
        {!importResult && (
          <div className="p-8 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 text-center space-y-4">
            <div className="max-w-md mx-auto">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upload de arquivo CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-2">Formatos aceitos. Mínimo: `name,email`. Recomendado: `name,email,phone,purchase_code,profile_type`.</p>
            </div>

            {csvText && (
              <div className="pt-4">
                <button
                  type="button"
                  disabled={validating}
                  onClick={handleValidate}
                  className="px-6 py-2.5 text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition"
                >
                  {validating ? 'Validando...' : 'Validar CSV'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Validation Results Preview */}
        {validated && !importResult && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Resultados da Validação</h3>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Total de Linhas</span>
                <div className="text-2xl font-bold mt-1">{rawRecords.length}</div>
              </div>
              <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold text-emerald-400">Válidos para Importar</span>
                <div className="text-2xl font-bold mt-1 text-emerald-400">{validRecords.length}</div>
              </div>
              <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold text-amber-500">Duplicados no CSV</span>
                <div className="text-2xl font-bold mt-1 text-amber-500">{duplicateEmails.length}</div>
              </div>
              <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold text-red-400">E-mails Inválidos</span>
                <div className="text-2xl font-bold mt-1 text-red-400">{invalidRecords.length}</div>
              </div>
            </div>

            {/* List preview of valid clients */}
            {validRecords.length > 0 && (
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-900/80 font-bold border-b border-slate-800 flex justify-between items-center">
                  <span>Prévia dos clientes válidos (exibindo até 5)</span>
                  <button
                    disabled={loading}
                    onClick={handleImport}
                    className="px-5 py-2 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg transition"
                  >
                    {loading ? 'Importando...' : 'Confirmar e Importar Clientes'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-3">Nome</th>
                        <th className="p-3">E-mail</th>
                        <th className="p-3">Perfil</th>
                        <th className="p-3">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {validRecords.slice(0, 5).map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-900/20">
                          <td className="p-3 text-slate-200 font-medium">{rec.name}</td>
                          <td className="p-3 text-slate-400">{rec.email}</td>
                          <td className="p-3 text-slate-400">{rec.profile_type || 'psychologist'}</td>
                          <td className="p-3 text-slate-500">{rec.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* List of invalid records if any */}
            {invalidRecords.length > 0 && (
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl space-y-2">
                <h4 className="font-bold text-red-400 text-sm">Linhas ignoradas com erro (E-mails inválidos/ausentes)</h4>
                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-5">
                  {invalidRecords.map((rec, i) => (
                    <tr key={i}>
                      <li>
                        <strong>{rec.name}</strong> ({rec.email}): <span className="text-red-400">{rec.reason}</span>
                      </li>
                    </tr>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Final Importation Success Report */}
        {importResult && (
          <div className="p-8 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-850 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
                Importação Concluída com Sucesso!
              </div>
              <h2 className="text-2xl font-bold text-white">Relatório de Migração</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="p-4 bg-slate-950/60 rounded-lg text-center">
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Processados</span>
                <div className="text-xl font-bold mt-1 text-slate-300">{importResult.total}</div>
              </div>
              <div className="p-4 bg-slate-950/60 rounded-lg text-center">
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Novos Criados</span>
                <div className="text-xl font-bold mt-1 text-emerald-400">{importResult.imported}</div>
              </div>
              <div className="p-4 bg-slate-950/60 rounded-lg text-center">
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Atualizados/Duplicados</span>
                <div className="text-xl font-bold mt-1 text-amber-500">{importResult.updated + importResult.duplicates}</div>
              </div>
              <div className="p-4 bg-slate-950/60 rounded-lg text-center">
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Erros</span>
                <div className="text-xl font-bold mt-1 text-red-400">{importResult.errors.length}</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-4 bg-red-950/10 border border-red-500/20 rounded-lg space-y-2 text-xs">
                <h4 className="font-semibold text-red-400 text-sm">Falhas no processamento dos registros</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResult.errors.map((err: any, i: number) => (
                    <div key={i} className="text-slate-400">
                      • Email: <strong>{err.email}</strong> - <span className="text-red-400">{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-4">
              <button
                onClick={() => setImportResult(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
              >
                Subir Novo CSV
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
