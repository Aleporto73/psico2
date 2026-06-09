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

  // Tab State
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');

  // CSV States
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [validRecords, setValidRecords] = useState<ParsedRecord[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<Array<{ email: string; name: string; reason: string }>>([]);
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);
  const [validated, setValidated] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Creation States
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    phone: '',
    profile_type: 'unknown',
    source: 'manual_pix',
    has_lifetime_access: false,
    activate_pro: false,
    pro_expires_at: '',
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualResult, setManualResult] = useState<any | null>(null);

  // Clipboard state
  const [copied, setCopied] = useState(false);

  // Date formatter helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return nextYear.toLocaleDateString('pt-BR');
    }
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return dateStr;
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://app.psicoplanilha.com/ativar-acesso');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

    setFileName(file.name);
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
      setFileName(null);
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Ocorreu um erro fatal durante a importação.');
    } finally {
      setLoading(false);
    }
  };

  // Manual Client Handlers
  const handleManualChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setManualForm((prev) => ({ ...prev, [name]: val }));
    setManualError(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    setManualError(null);
    setManualResult(null);

    try {
      const response = await fetch('/api/admin/manual-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualForm),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Erro ao cadastrar cliente manualmente.');
      }

      setManualResult(resData);
      
      setManualForm({
        name: '',
        email: '',
        phone: '',
        profile_type: 'unknown',
        source: 'manual_pix',
        has_lifetime_access: false,
        activate_pro: false,
        pro_expires_at: '',
      });
    } catch (err: any) {
      console.error('Manual submission error:', err);
      setManualError(err.message || 'Erro ao processar o cadastro manual.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-[#061923] text-[#F8FAFC] pb-16 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center pb-6 border-b border-[#1F4D5C]">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#94A3B8] mb-1 font-medium">
              <Link href="/admin" className="hover:text-[#7DD3FC] transition">Admin</Link>
              <span>/</span>
              <span className="text-[#94A3B8]">Clientes</span>
              <span>/</span>
              <span className="text-[#7DD3FC]">Adicionar</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Adicionar Clientes</h1>
            <p className="text-[#CBD5E1] text-sm mt-1">
              Importe clientes em massa por CSV ou cadastre manualmente clientes que pagaram por PIX, depósito ou cortesia.
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-xs font-bold bg-[#0B2430] hover:bg-[#0E2A38] text-[#F8FAFC] border border-[#1F4D5C] hover:border-[#7DD3FC] rounded-lg transition duration-200"
          >
            Voltar ao Admin
          </Link>
        </header>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-[#1F4D5C] space-x-2">
          <button
            onClick={() => {
              setActiveTab('csv');
              setErrorMsg(null);
              setManualError(null);
            }}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition duration-200 ${
              activeTab === 'csv'
                ? 'border-[#7DD3FC] text-[#7DD3FC] bg-[#0B2430]/40'
                : 'border-transparent text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#0B2430]/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar CSV
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              setErrorMsg(null);
              setManualError(null);
            }}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition duration-200 ${
              activeTab === 'manual'
                ? 'border-[#7DD3FC] text-[#7DD3FC] bg-[#0B2430]/40'
                : 'border-transparent text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#0B2430]/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Cadastro manual
          </button>
        </div>

        {/* ==========================================================
            TAB: IMPORTAR CSV
            ========================================================== */}
        {activeTab === 'csv' && (
          <div className="space-y-6">
            {/* Error Alert */}
            {errorMsg && (
              <div className="p-4 text-sm font-semibold text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Steps Description */}
            <div className="p-5 bg-[#0B2430] rounded-xl border border-[#1F4D5C] space-y-3 text-sm leading-relaxed">
              <h3 className="font-bold text-[#F8FAFC] flex items-center gap-2">
                <svg className="w-4 h-4 text-[#7DD3FC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Instruções para importação via CSV:
              </h3>
              <ul className="list-disc pl-5 text-[#CBD5E1] space-y-1">
                <li>Os clientes serão importados com o status <strong className="text-[#7DD3FC]">Pendente de Ativação</strong>.</li>
                <li>A importação é <strong className="text-[#F8FAFC]">idempotente</strong>: rodar o mesmo arquivo não cria compras duplicadas.</li>
                <li>Para cada cliente, será liberado o acesso vitalício às planilhas (<strong className="text-[#7DD3FC]">psicoplanilhas-vitalicio</strong>).</li>
                <li>O Assistente IA Pro permanecerá bloqueado por padrão até que comprem a assinatura.</li>
              </ul>
            </div>

            {/* Upload Control */}
            {!importResult && (
              <div className="p-8 bg-[#0B2430] rounded-xl border border-[#1F4D5C] space-y-6">
                <div className="max-w-xl mx-auto">
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3 text-center">
                    Upload de arquivo CSV
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-[#1F4D5C] border-dashed rounded-xl cursor-pointer bg-[#0E2A38] hover:bg-[#0E2A38]/80 hover:border-[#7DD3FC] transition-all duration-200">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                      <svg className="w-10 h-10 mb-3 text-[#7DD3FC] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {fileName ? (
                        <div className="space-y-1">
                          <p className="text-sm text-[#7DD3FC] font-bold truncate max-w-xs sm:max-w-md">
                            {fileName}
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            Clique ou arraste outro arquivo para substituir
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-sm text-[#F8FAFC] font-semibold">
                            Clique para selecionar ou arraste o CSV
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            Mínimo obrigatório: <code className="text-[#7DD3FC] font-mono">name,email</code>. Recomendado: <code className="text-[#CBD5E1] font-mono">phone,purchase_code,profile_type</code>.
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {csvText && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={validating}
                      onClick={handleValidate}
                      className="px-8 py-3 text-sm font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] disabled:border-[#1F4D5C] disabled:border rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15"
                    >
                      {validating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-[#061923]/30 border-t-[#061923] rounded-full animate-spin" />
                          Validando dados...
                        </span>
                      ) : (
                        'Validar CSV'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Validation Results Preview */}
            {validated && !importResult && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#7DD3FC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resultados da Validação
                </h3>

                {/* Metrics cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#0B2430] border border-[#1F4D5C] rounded-xl shadow-sm">
                    <span className="text-[#94A3B8] text-xs uppercase tracking-wider font-bold">Total de Linhas</span>
                    <div className="text-2xl font-bold mt-1 text-[#F8FAFC]">{rawRecords.length}</div>
                  </div>
                  <div className="p-4 bg-[#0B2430] border border-[#1F4D5C] rounded-xl shadow-sm">
                    <span className="text-[#7DD3FC] text-xs uppercase tracking-wider font-bold">Válidos para Importar</span>
                    <div className="text-2xl font-bold mt-1 text-[#7DD3FC]">{validRecords.length}</div>
                  </div>
                  <div className="p-4 bg-[#0B2430] border border-[#1F4D5C] rounded-xl shadow-sm">
                    <span className="text-[#FACC15] text-xs uppercase tracking-wider font-bold">Duplicados no CSV</span>
                    <div className="text-2xl font-bold mt-1 text-[#FACC15]">{duplicateEmails.length}</div>
                  </div>
                  <div className="p-4 bg-[#0B2430] border border-[#1F4D5C] rounded-xl shadow-sm">
                    <span className="text-[#FB7185] text-xs uppercase tracking-wider font-bold">E-mails Inválidos</span>
                    <div className="text-2xl font-bold mt-1 text-[#FB7185]">{invalidRecords.length}</div>
                  </div>
                </div>

                {/* List preview of valid clients */}
                {validRecords.length > 0 && (
                  <div className="bg-[#0B2430] border border-[#1F4D5C] rounded-xl overflow-hidden shadow-md">
                    <div className="p-4 bg-[#0E2A38] font-bold border-b border-[#1F4D5C] flex justify-between items-center flex-wrap gap-4">
                      <span className="text-sm text-[#F8FAFC]">Prévia dos clientes válidos (exibindo até 5)</span>
                      <button
                        disabled={loading}
                        onClick={handleImport}
                        className="px-5 py-2.5 text-xs font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] disabled:bg-[#0E2A38] disabled:text-[#94A3B8] disabled:border-[#1F4D5C] disabled:border rounded-lg transition duration-200 shadow-md shadow-[#7DD3FC]/10"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-[#061923]/30 border-t-[#061923] rounded-full animate-spin" />
                            Importando...
                          </span>
                        ) : (
                          'Confirmar e Importar Clientes'
                        )}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#1F4D5C] bg-[#0E2A38]/50 text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">
                            <th className="p-3.5">Nome</th>
                            <th className="p-3.5">E-mail</th>
                            <th className="p-3.5">Perfil</th>
                            <th className="p-3.5">Telefone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F4D5C]/40 bg-[#0E2A38]/10">
                          {validRecords.slice(0, 5).map((rec, i) => (
                            <tr key={i} className="hover:bg-[#0E2A38]/30 transition duration-150">
                              <td className="p-3.5 text-[#F8FAFC] font-semibold">{rec.name}</td>
                              <td className="p-3.5 text-[#CBD5E1]">{rec.email}</td>
                              <td className="p-3.5 text-[#CBD5E1]">{rec.profile_type || 'psychologist'}</td>
                              <td className="p-3.5 text-[#94A3B8]">{rec.phone || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* List of invalid records if any */}
                {invalidRecords.length > 0 && (
                  <div className="p-5 bg-[#FB7185]/5 border border-[#FB7185]/20 rounded-xl space-y-3">
                    <h4 className="font-bold text-[#FB7185] text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Linhas ignoradas com erro (E-mails inválidos/ausentes)
                    </h4>
                    <ul className="text-xs text-[#CBD5E1] space-y-1.5 list-disc pl-5">
                      {invalidRecords.map((rec, i) => (
                        <li key={i}>
                          <strong className="text-[#F8FAFC]">{rec.name}</strong> ({rec.email}) - <span className="text-[#FB7185] font-medium">{rec.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Final Importation Success Report */}
            {importResult && (
              <div className="p-8 bg-[#0B2430] border border-[#1F4D5C] rounded-xl space-y-6 shadow-lg">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full text-[#7DD3FC] text-xs font-bold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Importação Concluída com Sucesso!
                  </div>
                  <h2 className="text-2xl font-bold text-[#F8FAFC] pt-2">Relatório de Migração</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="p-4 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-center shadow-sm">
                    <span className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Processados</span>
                    <div className="text-2xl font-bold mt-1 text-[#F8FAFC]">{importResult.total}</div>
                  </div>
                  <div className="p-4 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-center shadow-sm">
                    <span className="text-[#7DD3FC] text-[10px] uppercase font-bold tracking-wider">Novos Criados</span>
                    <div className="text-2xl font-bold mt-1 text-[#7DD3FC]">{importResult.imported}</div>
                  </div>
                  <div className="p-4 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-center shadow-sm">
                    <span className="text-[#FACC15] text-[10px] uppercase font-bold tracking-wider">Atualizados</span>
                    <div className="text-2xl font-bold mt-1 text-[#FACC15]">{importResult.updated + importResult.duplicates}</div>
                  </div>
                  <div className="p-4 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-center shadow-sm">
                    <span className="text-[#FB7185] text-[10px] uppercase font-bold tracking-wider">Erros</span>
                    <div className="text-2xl font-bold mt-1 text-[#FB7185]">{importResult.errors.length}</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-5 bg-[#FB7185]/5 border border-[#FB7185]/20 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-[#FB7185] text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Falhas no processamento dos registros
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                      {importResult.errors.map((err: any, i: number) => (
                        <div key={i} className="text-[#CBD5E1] border-b border-[#1F4D5C]/30 pb-1 last:border-0 last:pb-0">
                          Email: <strong className="text-[#F8FAFC]">{err.email}</strong> - <span className="text-[#FB7185]">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-4">
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setFileName(null);
                    }}
                    className="px-6 py-2.5 bg-[#0E2A38] hover:bg-[#0E2A38]/70 text-[#F8FAFC] border border-[#1F4D5C] hover:border-[#7DD3FC] font-bold rounded-lg transition duration-200"
                  >
                    Subir Novo Arquivo CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================================
            TAB: CADASTRO MANUAL INDIVIDUAL
            ========================================================== */}
        {activeTab === 'manual' && (
          <div className="space-y-6">
            {/* Error Alert */}
            {manualError && (
              <div className="p-4 text-sm font-semibold text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{manualError}</span>
              </div>
            )}

            {/* Manual Creation Success Screen */}
            {manualResult && (
              <div className="p-8 bg-[#0B2430] border border-[#1F4D5C] rounded-2xl space-y-8 shadow-xl">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 rounded-full text-[#7DD3FC] text-xs font-bold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cliente criado/atualizado
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#F8FAFC] pt-1">Cliente cadastrado com sucesso</h2>
                  <p className="text-sm text-[#CBD5E1] max-w-md mx-auto">
                    Revise os acessos liberados e oriente o cliente sobre a ativação.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto bg-[#0E2A38] border border-[#1F4D5C] rounded-xl p-6 space-y-6 shadow-sm">
                  
                  {/* Bloco 1: Dados do Cliente */}
                  <div>
                    <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider border-b border-[#1F4D5C]/50 pb-2 mb-3">
                      Dados do cliente
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#CBD5E1]">Nome do Cliente</span>
                        <span className="text-[#F8FAFC] font-bold">{manualResult.client.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#CBD5E1]">E-mail</span>
                        <span className="text-[#F8FAFC] font-semibold">{manualResult.client.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#CBD5E1]">Status do perfil</span>
                        {manualResult.client.activation_status === 'active' ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 uppercase">
                            Ativado
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-bold rounded-full text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 uppercase">
                            Pendente de ativação
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Acessos Liberados */}
                  <div>
                    <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider border-b border-[#1F4D5C]/50 pb-2 mb-3">
                      Acessos liberados
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#CBD5E1]">Acesso vitalício às planilhas</span>
                        {manualResult.client.has_lifetime_access !== 'não liberado' ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 uppercase">
                            Liberado
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-bold rounded-full text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] uppercase">
                            Não liberado
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#CBD5E1]">Assistente IA Pro</span>
                        {manualResult.client.pro_status !== 'não ativado' ? (
                          <span className="px-3 py-1 text-xs font-bold rounded-full text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20 uppercase">
                            Liberado
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-bold rounded-full text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C] uppercase">
                            Não liberado
                          </span>
                        )}
                      </div>
                      {/* Vencimento do Pro, se existir */}
                      {manualResult.client.pro_status !== 'não ativado' && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#CBD5E1]">Vencimento do Pro</span>
                          <span className="text-[#F8FAFC] font-semibold">
                            {formatDate(manualResult.client.pro_expires_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Bloco Próximo passo */}
                <div className="max-w-2xl mx-auto p-5 bg-[#0E2A38] border-l-4 border-[#7DD3FC] rounded-r-xl rounded-l-md space-y-4 shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[#7DD3FC]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Próximo passo
                    </h4>
                    <p className="text-xs text-[#CBD5E1] mt-1.5">
                      Oriente o cliente a acessar a página de ativação e informar o e-mail cadastrado para definir a senha.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#061923] p-3 rounded-lg border border-[#1F4D5C]/50">
                    <code className="text-[#7DD3FC] text-xs font-mono select-all break-all flex-1 py-1">
                      https://app.psicoplanilha.com/ativar-acesso
                    </code>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 text-xs font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] rounded-md transition duration-200 shrink-0 flex items-center justify-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Copiado!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copiar link de ativação
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Botões finais */}
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => {
                      setManualResult(null);
                      setManualForm({
                        name: '',
                        email: '',
                        phone: '',
                        profile_type: 'unknown',
                        source: 'manual_pix',
                        has_lifetime_access: false,
                        activate_pro: false,
                        pro_expires_at: '',
                      });
                    }}
                    className="w-full sm:w-auto px-6 py-3 text-sm font-bold bg-[#7DD3FC] text-[#061923] hover:bg-[#67E8F9] rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15 text-center"
                  >
                    Cadastrar outro cliente
                  </button>
                  <Link
                    href="/admin/clientes"
                    className="w-full sm:w-auto px-6 py-3 text-sm font-bold bg-[#0E2A38] text-[#F8FAFC] border border-[#1F4D5C] hover:border-[#7DD3FC] rounded-xl transition duration-200 text-center"
                  >
                    Ver lista de clientes
                  </Link>
                  <Link
                    href="/admin"
                    className="w-full sm:w-auto px-6 py-3 text-sm font-bold bg-[#0E2A38] text-[#F8FAFC] border border-[#1F4D5C] hover:border-[#7DD3FC] rounded-xl transition duration-200 text-center"
                  >
                    Voltar ao Admin
                  </Link>
                </div>
              </div>
            )}

            {/* Cadastro Manual Form */}
            {!manualResult && (
              <form onSubmit={handleManualSubmit} className="p-6 md:p-8 bg-[#0B2430] border border-[#1F4D5C] rounded-2xl space-y-6 shadow-xl">
                <div>
                  <h3 className="text-xl font-bold text-[#F8FAFC]">Cadastrar cliente manualmente</h3>
                  <p className="text-xs text-[#CBD5E1] mt-1.5">
                    Use esta opção para pagamentos por fora, como PIX direto, depósito, cortesia ou atendimento manual.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Nome */}
                  <div className="space-y-2">
                    <label htmlFor="manual_name" className="block text-xs font-bold text-[#CBD5E1] uppercase tracking-wide">
                      Nome do Cliente <span className="text-[#FB7185]">*</span>
                    </label>
                    <input
                      id="manual_name"
                      name="name"
                      type="text"
                      required
                      value={manualForm.name}
                      onChange={handleManualChange}
                      placeholder="Ex: Dra. Maria Silva"
                      className="w-full px-4 py-2.5 bg-[#061923] border border-[#1F4D5C] rounded-lg text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
                    />
                  </div>

                  {/* E-mail */}
                  <div className="space-y-2">
                    <label htmlFor="manual_email" className="block text-xs font-bold text-[#CBD5E1] uppercase tracking-wide">
                      E-mail do Cliente <span className="text-[#FB7185]">*</span>
                    </label>
                    <input
                      id="manual_email"
                      name="email"
                      type="email"
                      required
                      value={manualForm.email}
                      onChange={handleManualChange}
                      placeholder="Ex: maria.silva@email.com"
                      className="w-full px-4 py-2.5 bg-[#061923] border border-[#1F4D5C] rounded-lg text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <label htmlFor="manual_phone" className="block text-xs font-bold text-[#CBD5E1] uppercase tracking-wide">
                      Telefone <span className="text-[#94A3B8] font-normal lowercase">(opcional)</span>
                    </label>
                    <input
                      id="manual_phone"
                      name="phone"
                      type="text"
                      value={manualForm.phone}
                      onChange={handleManualChange}
                      placeholder="Ex: (11) 99999-9999"
                      className="w-full px-4 py-2.5 bg-[#061923] border border-[#1F4D5C] rounded-lg text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
                    />
                  </div>

                  {/* Perfil Profissional */}
                  <div className="space-y-2">
                    <label htmlFor="manual_profile_type" className="block text-xs font-bold text-[#CBD5E1] uppercase tracking-wide">
                      Perfil Profissional
                    </label>
                    <select
                      id="manual_profile_type"
                      name="profile_type"
                      value={manualForm.profile_type}
                      onChange={handleManualChange}
                      className="w-full px-4 py-2.5 bg-[#061923] border border-[#1F4D5C] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
                    >
                      <option value="unknown">Prefiro responder depois (Desconhecido)</option>
                      <option value="psychologist">Psicólogo(a)</option>
                      <option value="psychopedagogue">Psicopedagogo(a) / Neuropsicopedagogo(a)</option>
                      <option value="both">Atuo nas duas áreas</option>
                    </select>
                  </div>

                  {/* Origem do cadastro */}
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="manual_source" className="block text-xs font-bold text-[#CBD5E1] uppercase tracking-wide">
                      Origem / Canal do Pagamento
                    </label>
                    <select
                      id="manual_source"
                      name="source"
                      value={manualForm.source}
                      onChange={handleManualChange}
                      className="w-full px-4 py-2.5 bg-[#061923] border border-[#1F4D5C] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
                    >
                      <option value="manual_pix">Pagamento via PIX Direto</option>
                      <option value="manual_deposito">Depósito Bancário / Transferência</option>
                      <option value="manual_cortesia">Cortesia / Bônus Especial</option>
                      <option value="manual_outro">Outra Origem Manual</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-[#1F4D5C]/50 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-[#F8FAFC] border-b border-[#1F4D5C]/30 pb-2">
                    Acessos e liberações
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Checkbox Acesso Vitalício */}
                    <label
                      htmlFor="manual_lifetime"
                      className={`flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        manualForm.has_lifetime_access
                          ? 'bg-[#0E2A38] border-[#7DD3FC] shadow-md shadow-[#7DD3FC]/5'
                          : 'bg-[#061923] border-[#1F4D5C] hover:border-[#7DD3FC]/50'
                      }`}
                    >
                      <input
                        id="manual_lifetime"
                        name="has_lifetime_access"
                        type="checkbox"
                        checked={manualForm.has_lifetime_access}
                        onChange={handleManualChange}
                        className="mt-1 w-4 h-4 text-[#061923] bg-[#061923] border-[#1F4D5C] rounded focus:ring-[#7DD3FC]/50 focus:ring-2 accent-[#7DD3FC]"
                      />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider block">
                          Liberar Acesso Vitalício
                        </span>
                        <p className="text-[10px] text-[#94A3B8] leading-normal">
                          Libera acesso permanente a toda a biblioteca de planilhas e ao Assistente GPT Incluso (externo).
                        </p>
                      </div>
                    </label>

                    {/* Checkbox Assistente Pro */}
                    <label
                      htmlFor="manual_pro"
                      className={`flex items-start space-x-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        manualForm.activate_pro
                          ? 'bg-[#0E2A38] border-[#7DD3FC] shadow-md shadow-[#7DD3FC]/5'
                          : 'bg-[#061923] border-[#1F4D5C] hover:border-[#7DD3FC]/50'
                      }`}
                    >
                      <input
                        id="manual_pro"
                        name="activate_pro"
                        type="checkbox"
                        checked={manualForm.activate_pro}
                        onChange={handleManualChange}
                        className="mt-1 w-4 h-4 text-[#061923] bg-[#061923] border-[#1F4D5C] rounded focus:ring-[#7DD3FC]/50 focus:ring-2 accent-[#7DD3FC]"
                      />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider block">
                          Ativar Assistente IA Pro
                        </span>
                        <p className="text-[10px] text-[#94A3B8] leading-normal">
                          Garante assinatura anual com acesso ao assistente avançado de IA para confecção de relatórios.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Campo data de vencimento do Pro condicional */}
                  {manualForm.activate_pro && (
                    <div className="p-4 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl space-y-2 max-w-md animate-fadeIn">
                      <label htmlFor="manual_pro_expiry" className="block text-xs font-bold text-[#CBD5E1] uppercase tracking-wide">
                        Vencimento da Assinatura Pro
                      </label>
                      <input
                        id="manual_pro_expiry"
                        name="pro_expires_at"
                        type="date"
                        value={manualForm.pro_expires_at}
                        onChange={handleManualChange}
                        className="w-full px-4 py-2 bg-[#061923] border border-[#1F4D5C] rounded-lg text-sm text-[#F8FAFC] focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition duration-200"
                      />
                      <p className="text-[10px] text-[#94A3B8] leading-normal">
                        * Opcional. Se deixado em branco, a data de expiração será definida automaticamente para **+1 ano** a partir de hoje.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#1F4D5C]/50">
                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="w-full md:max-w-xs py-3.5 bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] font-bold rounded-xl transition duration-200 shadow-md shadow-[#7DD3FC]/15 flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-[#0E2A38] disabled:text-[#94A3B8]"
                  >
                    {manualLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#061923]/30 border-t-[#061923] rounded-full animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Cadastrar Cliente Manualmente
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
