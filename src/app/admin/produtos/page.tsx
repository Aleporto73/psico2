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
      setErrorMsg('Erro ao carregar catálogo de produtos. Tente novamente.');
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
      console.error('Error toggling product status:', err);
      setErrorMsg('Não foi possível alterar o status do produto. Tente novamente.');
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
      console.error('Error saving product:', err);
      setErrorMsg('Não foi possível salvar o produto. Revise os dados e tente novamente.');
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

  const inputCls = "w-full px-4 py-2.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition";
  const labelCls = "block text-sm font-bold text-[#CBD5E1]";

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#061923] text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-[#1F4D5C] gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#94A3B8] mb-1">
              <Link href="/admin" className="hover:text-[#7DD3FC] transition">Admin</Link>
              <span>/</span>
              <span className="text-[#CBD5E1]">Produtos</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Catálogo de produtos</h1>
            <p className="text-[#CBD5E1] text-base mt-1">Gerencie produtos externos, assistentes virtuais, bundles e treinamentos do sistema.</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleNew}
              className="px-5 py-2.5 text-sm font-bold bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] rounded-xl transition duration-200"
            >
              Novo produto
            </button>
            <Link
              href="/admin"
              className="px-5 py-2.5 text-sm bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] rounded-xl transition duration-200"
            >
              Voltar
            </Link>
          </div>
        </header>

        {/* Alerts */}
        {errorMsg && <div className="p-4 text-base font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl">{errorMsg}</div>}
        {successMsg && <div className="p-4 text-base font-medium text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">{successMsg}</div>}

        {/* Create/Edit Form */}
        {showForm && editingProd && (
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <div className="flex justify-between items-center border-b border-[#1F4D5C] pb-3">
              <h2 className="text-lg font-bold text-[#F8FAFC]">{editingProd.id ? 'Editar produto comercial' : 'Novo produto comercial'}</h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingProd(null); }}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className={labelCls}>Nome do produto (obrigatório)</label>
                <input
                  type="text"
                  value={editingProd.name || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Slug único (obrigatório)</label>
                <input
                  type="text"
                  value={editingProd.slug || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, slug: e.target.value })}
                  className={inputCls}
                  required
                  placeholder="ex: assistente-ia-pro"
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Tipo do produto (obrigatório)</label>
                <select
                  value={editingProd.type || 'external_product'}
                  onChange={(e) => setEditingProd({ ...editingProd, type: e.target.value })}
                  className={inputCls}
                  required
                >
                  <option value="external_product">Produto externo (external_product)</option>
                  <option value="assistant">Assistente (assistant)</option>
                  <option value="bundle">Pacote (bundle)</option>
                  <option value="tutorial">Treinamento/Tutorial (tutorial)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Público-alvo (obrigatório)</label>
                <select
                  value={editingProd.audience || 'all'}
                  onChange={(e) => setEditingProd({ ...editingProd, audience: e.target.value })}
                  className={inputCls}
                  required
                >
                  <option value="all">Todos (all)</option>
                  <option value="psychologist">Psicólogos (psychologist)</option>
                  <option value="psychopedagogue">Psicopedagogos (psychopedagogue)</option>
                  <option value="both">Ambos (both)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Categoria</label>
                <input
                  type="text"
                  value={editingProd.category || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, category: e.target.value })}
                  className={inputCls}
                  placeholder="ex: Recursos de IA"
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProd.price !== null && editingProd.price !== undefined ? editingProd.price : ''}
                  onChange={(e) => setEditingProd({ ...editingProd, price: e.target.value !== '' ? Number(e.target.value) : null })}
                  className={inputCls}
                  placeholder="97.00"
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Tipo de faturamento</label>
                <select
                  value={editingProd.billing_type || 'one_time'}
                  onChange={(e) => setEditingProd({ ...editingProd, billing_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="one_time">Pagamento único (one_time)</option>
                  <option value="yearly">Anual (yearly)</option>
                  <option value="monthly">Mensal (monthly)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>URL de checkout</label>
                <input
                  type="text"
                  value={editingProd.checkout_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, checkout_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link do vídeo informativo</label>
                <input
                  type="text"
                  value={editingProd.video_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, video_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link da imagem / thumbnail</label>
                <input
                  type="text"
                  value={editingProd.image_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, image_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link de acesso interno (se houver)</label>
                <input
                  type="text"
                  value={editingProd.access_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, access_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link de tutorial / documentação</label>
                <input
                  type="text"
                  value={editingProd.tutorial_url || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, tutorial_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className={labelCls}>Descrição do produto</label>
                <textarea
                  value={editingProd.description || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, description: e.target.value })}
                  className={inputCls + " h-24 resize-y"}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Ordem (sort_order)</label>
                <input
                  type="number"
                  value={editingProd.sort_order || 0}
                  onChange={(e) => setEditingProd({ ...editingProd, sort_order: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center space-x-3 pt-7">
                <input
                  type="checkbox"
                  id="is_active_prod"
                  checked={editingProd.is_active !== undefined ? editingProd.is_active : true}
                  onChange={(e) => setEditingProd({ ...editingProd, is_active: e.target.checked })}
                  className="w-5 h-5 rounded bg-[#0E2A38] border-[#1F4D5C] accent-[#7DD3FC]"
                />
                <label htmlFor="is_active_prod" className="text-[#CBD5E1] text-sm font-semibold cursor-pointer">Produto ativo / visível</label>
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingProd(null); }}
                  className="px-5 py-2.5 text-sm border border-[#1F4D5C] text-[#F8FAFC] rounded-xl hover:bg-[#0E2A38] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 text-base font-bold bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] rounded-xl transition shadow-md shadow-[#7DD3FC]/15"
                >
                  Salvar produto
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List Section */}
        <div className="bg-[#0B2430] rounded-2xl border border-[#1F4D5C] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[#CBD5E1]">
              <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto mb-3" />
              Carregando catálogo de produtos...
            </div>
          ) : products.length === 0 ? (
            <div className="p-10 text-center text-[#CBD5E1] space-y-2">
              <p className="text-base">Nenhum produto cadastrado.</p>
              <p className="text-sm text-[#94A3B8]">Clique em "Novo produto" para criar o primeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F4D5C] bg-[#0E2A38] text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Produto</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Público</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4">Faturamento</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F4D5C]/60 text-sm">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#0E2A38]/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-[#F8FAFC]">{prod.name}</div>
                        <div className="text-xs text-[#94A3B8] mt-0.5">{prod.slug}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          prod.type === 'spreadsheet' ? 'text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C]' :
                          prod.type === 'assistant' ? 'text-[#7DD3FC] bg-[#7DD3FC]/10 border border-[#7DD3FC]/20' :
                          prod.type === 'bundle' ? 'text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20' :
                          'text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20'
                        }`}>
                          {prod.type === 'spreadsheet' ? 'Planilha' :
                           prod.type === 'assistant' ? 'Assistente' :
                           prod.type === 'bundle' ? 'Pacote' :
                           prod.type === 'external_product' ? 'Produto ext.' : prod.type}
                        </span>
                      </td>
                      <td className="p-4 text-[#CBD5E1] uppercase tracking-wider text-xs font-semibold">
                        {prod.audience === 'all' ? 'Todos' :
                         prod.audience === 'psychologist' ? 'Psicólogos' :
                         prod.audience === 'psychopedagogue' ? 'Psicopedagogos' : prod.audience}
                      </td>
                      <td className="p-4 text-[#F8FAFC]">
                        {prod.price !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price) : '-'}
                      </td>
                      <td className="p-4 text-[#94A3B8] text-xs">
                        {prod.billing_type === 'one_time' ? 'Único' :
                         prod.billing_type === 'yearly' ? 'Anual' :
                         prod.billing_type === 'monthly' ? 'Mensal' : prod.billing_type || '-'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(prod)}
                          disabled={prod.type === 'spreadsheet'}
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            prod.type === 'spreadsheet'
                              ? 'text-[#94A3B8]/50 bg-[#0E2A38] border border-[#1F4D5C] cursor-not-allowed'
                              : prod.is_active
                              ? 'text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20'
                              : 'text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C]'
                          }`}
                        >
                          {prod.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        {prod.type === 'spreadsheet' ? (
                          <span className="text-xs text-[#94A3B8] italic pr-2">Planilha (somente leitura)</span>
                        ) : (
                          <button
                            onClick={() => handleEdit(prod)}
                            className="px-4 py-2 text-sm font-bold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition"
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
