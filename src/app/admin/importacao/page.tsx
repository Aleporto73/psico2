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
      
      // Reset Form
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
    <div className="min-h-screen p-8 bg-slate-950 text-slate-100 pb-16">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-amber-500 transition font-medium">Admin</Link>
              <span className="text-slate-700">/</span>
              <span className="text-slate-300 font-medium">Controle de Clientes</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Adicionar Clientes</h1>
            <p className="text-slate-400 text-sm mt-1">Importe em massa via arquivo CSV ou cadastre clientes individuais que pagaram offline.</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-lg transition duration-200"
          >
            Voltar ao Admin
          </Link>
        </header>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => {
              setActiveTab('csv');
              setErrorMsg(null);
              setManualError(null);
            }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition duration-200 ${
              activeTab === 'csv'
                ? 'border-amber-500 text-amber-400 bg-slate-900/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Importar arquivo CSV
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              setErrorMsg(null);
              setManualError(null);
            }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition duration-200 ${
              activeTab === 'manual'
                ? 'border-amber-500 text-amber-400 bg-slate-900/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            👤 Cadastro manual individual
          </button>
        </div>

        {/* ==========================================================
            TAB: IMPORTAR CSV
            ========================================================== */}
        {activeTab === 'csv' && (
          <div className="space-y-6">
            {/* Error Alert */}
            {errorMsg && (
              <div className="p-4 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Steps Description */}
            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-sm leading-relaxed">
              <h3 className="font-bold text-slate-200">Instruções para importação via CSV:</h3>
              <ul className="list-disc pl-5 text-slate-300 space-y-1">
                <li>Os clientes serão importados com o status <strong className="text-amber-400">Pendente de Ativação</strong>.</li>
                <li>A importação é <strong className="text-slate-200">idempotente</strong>: rodar o mesmo arquivo não cria compras duplicadas.</li>
                <li>Para cada cliente, será liberado o acesso vitalício às planilhas (<strong className="text-emerald-400">psicoplanilhas-vitalicio</strong>).</li>
                <li>O Assistente IA Pro permanecerá bloqueado por padrão até que comprem a assinatura.</li>
              </ul>
            </div>

            {/* Upload Control */}
            {!importResult && (
              <div className="p-8 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 text-center space-y-4">
                <div className="max-w-md mx-auto">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Upload de arquivo CSV</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-3 font-medium">Formatos aceitos. Mínimo obrigatório: `name,email`. Recomendado: `name,email,phone,purchase_code,profile_type`.</p>
                </div>

                {csvText && (
                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={validating}
                      onClick={handleValidate}
                      className="px-6 py-2.5 text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition"
                    >
                      {validating ? 'Validando dados...' : 'Validar CSV'}
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
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Total de Linhas</span>
                    <div className="text-2xl font-bold mt-1 text-slate-100">{rawRecords.length}</div>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-emerald-400 text-xs uppercase tracking-wider font-bold">Válidos para Importar</span>
                    <div className="text-2xl font-bold mt-1 text-emerald-400">{validRecords.length}</div>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-amber-500 text-xs uppercase tracking-wider font-bold">Duplicados no CSV</span>
                    <div className="text-2xl font-bold mt-1 text-amber-500">{duplicateEmails.length}</div>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-red-400 text-xs uppercase tracking-wider font-bold">E-mails Inválidos</span>
                    <div className="text-2xl font-bold mt-1 text-red-400">{invalidRecords.length}</div>
                  </div>
                </div>

                {/* List preview of valid clients */}
                {validRecords.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-900/90 font-bold border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
                      <span className="text-sm text-slate-200">Prévia dos clientes válidos (exibindo até 5)</span>
                      <button
                        disabled={loading}
                        onClick={handleImport}
                        className="px-5 py-2.5 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg transition"
                      >
                        {loading ? 'Importando registros...' : 'Confirmar e Importar Clientes'}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950 text-slate-300 text-xs font-bold uppercase tracking-wider">
                            <th className="p-3.5">Nome</th>
                            <th className="p-3.5">E-mail</th>
                            <th className="p-3.5">Perfil</th>
                            <th className="p-3.5">Telefone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                          {validRecords.slice(0, 5).map((rec, i) => (
                            <tr key={i} className="hover:bg-slate-900/50">
                              <td className="p-3.5 text-slate-100 font-semibold">{rec.name}</td>
                              <td className="p-3.5 text-slate-300">{rec.email}</td>
                              <td className="p-3.5 text-slate-300">{rec.profile_type || 'psychologist'}</td>
                              <td className="p-3.5 text-slate-400">{rec.phone || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* List of invalid records if any */}
                {invalidRecords.length > 0 && (
                  <div className="p-5 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2">
                    <h4 className="font-bold text-red-400 text-sm">Linhas ignoradas com erro (E-mails inválidos/ausentes)</h4>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
                      {invalidRecords.map((rec, i) => (
                        <li key={i}>
                          <strong>{rec.name}</strong> ({rec.email}) - <span className="text-red-400 font-medium">{rec.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Final Importation Success Report */}
            {importResult && (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                    ✓ Importação Concluída com Sucesso!
                  </div>
                  <h2 className="text-2xl font-bold text-white pt-2">Relatório de Migração</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Processados</span>
                    <div className="text-xl font-bold mt-1 text-slate-200">{importResult.total}</div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold text-emerald-400">Novos Criados</span>
                    <div className="text-xl font-bold mt-1 text-emerald-400">{importResult.imported}</div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold text-amber-500">Atualizados</span>
                    <div className="text-xl font-bold mt-1 text-amber-500">{importResult.updated + importResult.duplicates}</div>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
                    <span className="text-slate-400 text-[10px] uppercase font-bold text-red-400">Erros</span>
                    <div className="text-xl font-bold mt-1 text-red-400">{importResult.errors.length}</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-4 bg-red-950/15 border border-red-500/20 rounded-lg space-y-2 text-xs">
                    <h4 className="font-bold text-red-400 text-sm">Falhas no processamento dos registros</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((err: any, i: number) => (
                        <div key={i} className="text-slate-300">
                          • Email: <strong className="text-slate-100">{err.email}</strong> - <span className="text-red-400">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-4">
                  <button
                    onClick={() => setImportResult(null)}
                    className="px-6 py-2.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg border border-slate-800 transition"
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
              <div className="p-4 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                ⚠️ {manualError}
              </div>
            )}

            {/* Manual Creation Success Screen */}
            {manualResult && (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                    ✓ Cliente Cadastrado / Atualizado!
                  </div>
                  <h2 className="text-2xl font-bold text-white pt-2">Resumo da Concessão Manual</h2>
                  <p className="text-xs text-slate-300 max-w-md mx-auto pt-1">
                    As permissões foram atualizadas com sucesso para o usuário cadastrado.
                  </p>
                </div>

                <div className="max-w-xl mx-auto bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400 font-medium">Nome do Cliente</span>
                    <span className="text-slate-100 font-bold">{manualResult.client.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400 font-medium">E-mail</span>
                    <span className="text-slate-100 font-bold">{manualResult.client.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400 font-medium">Status do Perfil</span>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 uppercase">
                      {manualResult.client.activation_status === 'active' ? 'Senha Definida' : 'Pendente de Ativação'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-400 font-medium">Acesso Vitalício às Planilhas</span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${manualResult.client.has_lifetime_access !== 'não liberado' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-900 border border-slate-800'} uppercase`}>
                      {manualResult.client.has_lifetime_access}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400 font-medium">Status do Assistente IA Pro</span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${manualResult.client.pro_status !== 'não ativado' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-slate-500 bg-slate-900 border border-slate-800'} uppercase`}>
                      {manualResult.client.pro_status}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl max-w-xl mx-auto text-xs text-amber-400/90 leading-relaxed text-center font-medium">
                  📢 <strong>Próximo passo obrigatório:</strong> {manualResult.message}
                </div>

                <div className="text-center pt-4">
                  <button
                    onClick={() => setManualResult(null)}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                  >
                    Cadastrar Outro Cliente
                  </button>
                </div>
              </div>
            )}

            {/* Cadastro Manual Form */}
            {!manualResult && (
              <form onSubmit={handleManualSubmit} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Cliente Manualmente</h3>
                  <p className="text-xs text-slate-400 mt-1">Insira os dados do cliente e configure a liberação de produtos de forma manual.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Nome */}
                  <div className="space-y-1.5">
                    <label htmlFor="manual_name" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Nome do Cliente <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="manual_name"
                      name="name"
                      type="text"
                      required
                      value={manualForm.name}
                      onChange={handleManualChange}
                      placeholder="Ex: Dra. Maria Silva"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"
                    />
                  </div>

                  {/* E-mail */}
                  <div className="space-y-1.5">
                    <label htmlFor="manual_email" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      E-mail do Cliente <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="manual_email"
                      name="email"
                      type="email"
                      required
                      value={manualForm.email}
                      onChange={handleManualChange}
                      placeholder="Ex: maria.silva@email.com"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1.5">
                    <label htmlFor="manual_phone" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Telefone <span className="text-slate-500 font-normal">(opcional)</span>
                    </label>
                    <input
                      id="manual_phone"
                      name="phone"
                      type="text"
                      value={manualForm.phone}
                      onChange={handleManualChange}
                      placeholder="Ex: (11) 99999-9999"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"
                    />
                  </div>

                  {/* Perfil Profissional */}
                  <div className="space-y-1.5">
                    <label htmlFor="manual_profile_type" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Perfil Profissional
                    </label>
                    <select
                      id="manual_profile_type"
                      name="profile_type"
                      value={manualForm.profile_type}
                      onChange={handleManualChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500/50 transition"
                    >
                      <option value="unknown">Prefiro responder depois (Desconhecido)</option>
                      <option value="psychologist">Psicólogo(a)</option>
                      <option value="psychopedagogue">Psicopedagogo(a) / Neuropsicopedagogo(a)</option>
                      <option value="both">Atuo nas duas áreas</option>
                    </select>
                  </div>

                  {/* Origem do cadastro */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="manual_source" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Origem / Canal do Pagamento
                    </label>
                    <select
                      id="manual_source"
                      name="source"
                      value={manualForm.source}
                      onChange={handleManualChange}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500/50 transition"
                    >
                      <option value="manual_pix">Pagamento via PIX Direto</option>
                      <option value="manual_deposito">Depósito Bancário / Transferência</option>
                      <option value="manual_cortesia">Cortesia / Bônus Especial</option>
                      <option value="manual_outro">Outra Origem Manual</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-200">Acessos e Liberações de Produtos</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Checkbox Acesso Vitalício */}
                    <div className="flex items-start space-x-3 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                      <input
                        id="manual_lifetime"
                        name="has_lifetime_access"
                        type="checkbox"
                        checked={manualForm.has_lifetime_access}
                        onChange={handleManualChange}
                        className="mt-1 w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500/50 focus:ring-2 accent-amber-500"
                      />
                      <div className="space-y-1">
                        <label htmlFor="manual_lifetime" className="text-xs font-bold text-slate-200 uppercase tracking-wider cursor-pointer">
                          Liberar Acesso Vitalício
                        </label>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Libera acesso permanente a toda a biblioteca de planilhas e ao Assistente GPT Incluso (externo).
                        </p>
                      </div>
                    </div>

                    {/* Checkbox Assistente Pro */}
                    <div className="flex items-start space-x-3 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                      <input
                        id="manual_pro"
                        name="activate_pro"
                        type="checkbox"
                        checked={manualForm.activate_pro}
                        onChange={handleManualChange}
                        className="mt-1 w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500/50 focus:ring-2 accent-amber-500"
                      />
                      <div className="space-y-1">
                        <label htmlFor="manual_pro" className="text-xs font-bold text-slate-200 uppercase tracking-wider cursor-pointer">
                          Ativar Assistente IA Pro
                        </label>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Garante assinatura anual com acesso ao assistente avançado de IA para confecção de relatórios.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campo data de vencimento do Pro condicional */}
                  {manualForm.activate_pro && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 max-w-md">
                      <label htmlFor="manual_pro_expiry" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                        Vencimento da Assinatura Pro
                      </label>
                      <input
                        id="manual_pro_expiry"
                        name="pro_expires_at"
                        type="date"
                        value={manualForm.pro_expires_at}
                        onChange={handleManualChange}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500/50 transition"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        * Opcional. Se deixado em branco, a data de expiração será definida automaticamente para **+1 ano** a partir de hoje.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="w-full md:max-w-xs py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition duration-200 shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {manualLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      '👤 Cadastrar Cliente Manualmente'
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
