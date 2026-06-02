'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  audience: string;
  position: string;
  image_url: string | null;
  video_url: string | null;
  button_text: string | null;
  button_url: string | null;
  secondary_button_text: string | null;
  secondary_button_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function AdminBannersPage() {
  const supabase = createClient();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      console.error('Error fetching banners:', err);
      setErrorMsg(err.message || 'Erro ao carregar banners.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...banner,
          is_active: !banner.is_active,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao alternar status do banner.');

      setSuccessMsg(`Status do banner "${banner.title}" alterado com sucesso!`);
      fetchBanners();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!editingBanner?.title || !editingBanner?.audience || !editingBanner?.position) {
      setErrorMsg('Título, Público e Posição são obrigatórios.');
      return;
    }

    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBanner),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar banner.');

      setSuccessMsg(editingBanner.id ? 'Banner atualizado!' : 'Banner criado com sucesso!');
      setShowForm(false);
      setEditingBanner(null);
      fetchBanners();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingBanner({
      title: '',
      subtitle: '',
      audience: 'all',
      position: 'dashboard_middle',
      image_url: '',
      video_url: '',
      button_text: '',
      button_url: '',
      secondary_button_text: '',
      secondary_button_url: '',
      is_active: true,
      sort_order: 0,
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen p-8 bg-slate-955 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-slate-800 space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-amber-500 transition">Admin</Link>
              <span>/</span>
              <span className="text-slate-300">Banners Comerciais</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Vídeo-Banners Comerciais</h1>
            <p className="text-slate-400 text-sm mt-1">Configure os banners promocionais segmentados exibidos no painel do cliente.</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleNew}
              className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition duration-200"
            >
              Novo Banner
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition duration-200"
            >
              Voltar ao Início
            </Link>
          </div>
        </header>

        {/* Success/Error messages */}
        {errorMsg && <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{errorMsg}</div>}
        {successMsg && <div className="p-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">{successMsg}</div>}

        {/* Edit/Create Form Section */}
        {showForm && editingBanner && (
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold text-white">{editingBanner.id ? 'Editar Banner' : 'Novo Banner'}</h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingBanner(null); }}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Título (Obrigatório)</label>
                <input
                  type="text"
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Subtítulo</label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Público Alvo (Obrigatório)</label>
                <select
                  value={editingBanner.audience || 'all'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, audience: e.target.value })}
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
                <label className="text-slate-400 text-xs font-medium">Posição no Painel (Obrigatório)</label>
                <input
                  type="text"
                  value={editingBanner.position || 'dashboard_middle'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, position: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link do Vídeo (YouTube embed ou URL de vídeo)</label>
                <input
                  type="text"
                  value={editingBanner.video_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, video_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link da Imagem / Thumbnail</label>
                <input
                  type="text"
                  value={editingBanner.image_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Texto do Botão Principal</label>
                <input
                  type="text"
                  value={editingBanner.button_text || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link do Botão Principal (CTA)</label>
                <input
                  type="text"
                  value={editingBanner.button_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, button_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Texto do Botão Secundário</label>
                <input
                  type="text"
                  value={editingBanner.secondary_button_text || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, secondary_button_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Link do Botão Secundário</label>
                <input
                  type="text"
                  value={editingBanner.secondary_button_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, secondary_button_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-medium">Ordem de Exibição (sort_order)</label>
                <input
                  type="number"
                  value={editingBanner.sort_order || 0}
                  onChange={(e) => setEditingBanner({ ...editingBanner, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingBanner.is_active !== undefined ? editingBanner.is_active : true}
                  onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_active" className="text-slate-300 text-xs font-medium uppercase tracking-wider cursor-pointer">Banner Ativo / Visível</label>
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingBanner(null); }}
                  className="px-4 py-2 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-955 rounded-lg transition"
                >
                  Salvar Banner
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Banners List Section */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Carregando lista de banners...</div>
          ) : banners.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum banner cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4">Título / Subtítulo</th>
                    <th className="p-4">Público</th>
                    <th className="p-4">Posição</th>
                    <th className="p-4">Vídeo</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {banners.map((banner) => (
                    <tr key={banner.id} className="hover:bg-slate-900/30 transition">
                      <td className="p-4">
                        <div className="font-semibold text-white">{banner.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{banner.subtitle || 'Sem subtítulo'}</div>
                      </td>
                      <td className="p-4 text-slate-300 uppercase tracking-wider text-xs font-semibold">
                        {banner.audience === 'all' ? 'Todos' :
                         banner.audience === 'psychologist' ? 'Psicólogos' :
                         banner.audience === 'psychopedagogue' ? 'Psicopedagogos' : banner.audience}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">{banner.position}</td>
                      <td className="p-4 text-slate-400 text-xs">
                        {banner.video_url ? '🎬 Sim' : 'Não'}
                      </td>
                      <td className="p-4 text-slate-300">{banner.sort_order}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(banner)}
                          className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                            banner.is_active
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-slate-500 bg-slate-900 border border-slate-800'
                          }`}
                        >
                          {banner.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-350 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
                        >
                          Editar
                        </button>
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
