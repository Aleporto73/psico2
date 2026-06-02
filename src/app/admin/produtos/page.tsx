'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  type: string;
  audience: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  access_url: string | null;
  tutorial_url: string | null;
  video_url: string | null;
  checkout_url: string | null;
  price: number | null;
  billing_type: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function AdminProdutosPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [editingProd, setEditingProd] = useState<Partial<Product> | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setErrorMsg(err.message || 'Erro ao carregar catálogo de produtos.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (prod: Product) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Rule boundary: Check spreadsheet type blocking
    if (prod.type === 'spreadsheet') {
      setErrorMsg('Não é permitido alterar produtos do tipo planilha.');
      return;
    }

    try {
      const res = await fetch('/api/admin/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prod,
          is_active: !prod.is_active,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao alternar status do produto.');

      setSuccessMsg(`Status do produto "${prod.name}" alterado com sucesso!`);
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!editingProd?.name || !editingProd?.slug || !editingProd?.type || !editingProd?.audience) {
      setErrorMsg('Nome, Slug, Tipo e Público são campos obrigatórios.');
      return;
    }

    // Rule boundary
    if (editingProd.type === 'spreadsheet') {
      setErrorMsg('Não é permitido criar ou alterar para o tipo planilha.');
      return;
    }

    try {
      const res = await fetch('/api/admin/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProd),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar produto.');

      setSuccessMsg(editingProd.id ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
      setShowForm(false);
      setEditingProd(null);
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEdit = (prod: Product) => {
    if (prod.type === 'spreadsheet') {
      setErrorMsg('Não é permitido editar produtos do tipo planilha nesta fase.');
      return;
    }
    setEditingProd(prod);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingProd({
      name: '',
      slug: '',
      type: 'external_product',
      audience: 'all',
      category: '',
      description: '',
      image_url: '',
      access_url: '',
      tutorial_url: '',
      video_url: '',
      checkout_url: '',
      price: null,
      billing_type: 'one_time',
      is_active: true,
      sort_order: 0,
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen p-8 bg-slate-955 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-slate-800 space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-amber-500 transition">Admin</Link>
              <span>/</span>
              <span className="text-slate-300">Produtos</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Catálogo de Produtos</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie produtos externos, assistentes virtuais, bundles e treinamentos do sistema.</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleNew}
              className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-lg transition duration-200"
            >
              Novo Produto Comercial
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition duration-200"
            >
              Voltar ao Início
            </Link>
          </div>
        </header>

        {/* Alerts */}
        {errorMsg && <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{errorMsg}</div>}
        {successMsg && <div className="p-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">{successMsg}</div>}

        {/* Create/Edit Form */}
        {showForm && editingProd && (
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold text-white">{editingProd.id ? 'Editar Produto Comercial' : 'Novo Produto Comercial'}</h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingProd(null); }}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Nome do Produto (Obrigatório)</label>
                <input
                  type="text"
                  value={editingProd.name || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Slug Único (Obrigatório)</label>
                <input
                  type="text"
                  value={editingProd.slug || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  required
                  placeholder="ex: assistente-ia-pro"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Tipo do Produto (Obrigatório)</label>
                <select
                  value={editingProd.type || 'external_product'}
                  onChange={(e) => setEditingProd({ ...editingProd, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  required
                >
                  <option value="external_product">Produto Externo (external_product)</option>
                  <option value="assistant">Assistente (assistant)</option>
                  <option value="bundle">Pacote (bundle)</option>
                  <option value="tutorial">Treinamento/Tutorial (tutorial)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Público Alvo (Obrigatório)</label>
                <select
                  value={editingProd.audience || 'all'}
                  onChange={(e) => setEditingProd({ ...editingProd, audience: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  required
                >
                  <option value="all">Todos (all)</option>
                  <option value="psychologist">Psicólogos (psychologist)</option>
                  <option value="psychopedagogue">Psicopedagogos (psychopedagogue)</option>
                  <option value="both">Ambos (both)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Categoria</label>
                <input
                  type="text"
                  value={editingProd.category || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  placeholder="ex: Recursos de IA"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProd.price !== null && editingProd.price !== undefined ? editingProd.price : ''}
                  onChange={(e) => setEditingProd({ ...editingProd, price: e.target.value !== '' ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  placeholder="97.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Tipo de Faturamento</label>
                <select
                  value={editingProd.billing_type || 'one_time'}
                  onChange={(e) => setEditingProd({ ...editingProd, billing_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="one_time">Pagamento Único (one_time)</option>
                  <option value="yearly">Anual (yearly)</option>
                  <option value="monthly">Mensal (monthly)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">URL de Checkout</label>
                <input
                  type="text"
                  value={editingProd.checkout_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, checkout_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link do Vídeo Informativo (YouTube embed ou URL)</label>
                <input
                  type="text"
                  value={editingProd.video_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, video_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link da Imagem / Thumbnail</label>
                <input
                  type="text"
                  value={editingProd.image_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link de Acesso Interno (se houver)</label>
                <input
                  type="text"
                  value={editingProd.access_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, access_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link de Tutorial / Documentação</label>
                <input
                  type="text"
                  value={editingProd.tutorial_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, tutorial_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-400 text-xs font-medium">Descrição do Produto</label>
                <textarea
                  value={editingProd.description || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, description: e.target.value })}
                  className="w-full h-20 px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Ordem (sort_order)</label>
                <input
                  type="number"
                  value={editingProd.sort_order || 0}
                  onChange={(e) => setEditingProd({ ...editingProd, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active_prod"
                  checked={editingProd.is_active !== undefined ? editingProd.is_active : true}
                  onChange={(e) => setEditingProd({ ...editingProd, is_active: e.target.checked })}
                  className="rounded bg-slate-955 border-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_active_prod" className="text-slate-300 text-xs font-medium uppercase tracking-wider cursor-pointer">Produto Ativo / Visível</label>
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingProd(null); }}
                  className="px-4 py-2 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List Section */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Carregando catálogo de produtos...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum produto cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4">Produto</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Público</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4">Faturamento</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-900/30 transition">
                      <td className="p-4">
                        <div className="font-semibold text-white">{prod.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{prod.slug}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                          prod.type === 'spreadsheet' ? 'text-slate-400 bg-slate-800/40 border border-slate-800' :
                          prod.type === 'assistant' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' :
                          prod.type === 'bundle' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                          'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                        }`}>
                          {prod.type === 'spreadsheet' ? 'Planilha' :
                           prod.type === 'assistant' ? 'Assistente' :
                           prod.type === 'bundle' ? 'Pacote' :
                           prod.type === 'external_product' ? 'Produto Ext.' : prod.type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                        {prod.audience === 'all' ? 'Todos' :
                         prod.audience === 'psychologist' ? 'Psicólogos' :
                         prod.audience === 'psychopedagogue' ? 'Psicopedagogos' : prod.audience}
                      </td>
                      <td className="p-4 text-slate-200">
                        {prod.price !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price) : '-'}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        {prod.billing_type === 'one_time' ? 'Único' :
                         prod.billing_type === 'yearly' ? 'Anual' :
                         prod.billing_type === 'monthly' ? 'Mensal' : prod.billing_type || '-'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(prod)}
                          disabled={prod.type === 'spreadsheet'}
                          className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                            prod.type === 'spreadsheet'
                              ? 'text-slate-600 bg-slate-900 border border-slate-850 cursor-not-allowed'
                              : prod.is_active
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-slate-500 bg-slate-900 border border-slate-800'
                          }`}
                        >
                          {prod.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {prod.type === 'spreadsheet' ? (
                          <span className="text-xs text-slate-500 italic pr-2">Planilha (Somente Leitura)</span>
                        ) : (
                          <button
                            onClick={() => handleEdit(prod)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
