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

// ── SVG Icon ─────────────────────────────────────────────────────────────────

function IconPlay() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
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

  const inputCls = "w-full px-4 py-2.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition";
  const labelCls = "block text-sm font-bold text-[#CBD5E1]";

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#061923] text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-[#1F4D5C] gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#94A3B8] mb-1">
              <Link href="/admin" className="hover:text-[#7DD3FC] transition">Admin</Link>
              <span>/</span>
              <span className="text-[#CBD5E1]">Banners comerciais</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Vídeo-banners comerciais</h1>
            <p className="text-[#CBD5E1] text-base mt-1">Configure os banners promocionais segmentados exibidos no painel do cliente.</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleNew}
              className="px-5 py-2.5 text-sm font-bold bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] rounded-xl transition duration-200"
            >
              Novo banner
            </button>
            <Link
              href="/admin"
              className="px-5 py-2.5 text-sm bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] rounded-xl transition duration-200"
            >
              Voltar
            </Link>
          </div>
        </header>

        {/* Success/Error messages */}
        {errorMsg && <div className="p-4 text-base font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl">{errorMsg}</div>}
        {successMsg && <div className="p-4 text-base font-medium text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">{successMsg}</div>}

        {/* Edit/Create Form Section */}
        {showForm && editingBanner && (
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <div className="flex justify-between items-center border-b border-[#1F4D5C] pb-3">
              <h2 className="text-lg font-bold text-[#F8FAFC]">{editingBanner.id ? 'Editar banner' : 'Novo banner'}</h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingBanner(null); }}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className={labelCls}>Título (obrigatório)</label>
                <input
                  type="text"
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Subtítulo</label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Público-alvo (obrigatório)</label>
                <select
                  value={editingBanner.audience || 'all'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, audience: e.target.value })}
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
                <label className={labelCls}>Posição no painel (obrigatório)</label>
                <input
                  type="text"
                  value={editingBanner.position || 'dashboard_middle'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, position: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link do vídeo</label>
                <input
                  type="text"
                  value={editingBanner.video_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, video_url: e.target.value })}
                  className={inputCls}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link da imagem / thumbnail</label>
                <input
                  type="text"
                  value={editingBanner.image_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Texto do botão principal</label>
                <input
                  type="text"
                  value={editingBanner.button_text || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link do botão principal (CTA)</label>
                <input
                  type="text"
                  value={editingBanner.button_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, button_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Texto do botão secundário</label>
                <input
                  type="text"
                  value={editingBanner.secondary_button_text || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, secondary_button_text: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link do botão secundário</label>
                <input
                  type="text"
                  value={editingBanner.secondary_button_url || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, secondary_button_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Ordem de exibição (sort_order)</label>
                <input
                  type="number"
                  value={editingBanner.sort_order || 0}
                  onChange={(e) => setEditingBanner({ ...editingBanner, sort_order: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center space-x-3 pt-7">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingBanner.is_active !== undefined ? editingBanner.is_active : true}
                  onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                  className="w-5 h-5 rounded bg-[#0E2A38] border-[#1F4D5C] accent-[#7DD3FC]"
                />
                <label htmlFor="is_active" className="text-[#CBD5E1] text-sm font-semibold cursor-pointer">Banner ativo / visível</label>
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingBanner(null); }}
                  className="px-5 py-2.5 text-sm border border-[#1F4D5C] text-[#F8FAFC] rounded-xl hover:bg-[#0E2A38] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 text-base font-bold bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] rounded-xl transition shadow-md shadow-[#7DD3FC]/15"
                >
                  Salvar banner
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Banners List Section */}
        <div className="bg-[#0B2430] rounded-2xl border border-[#1F4D5C] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[#CBD5E1]">
              <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto mb-3" />
              Carregando lista de banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="p-10 text-center text-[#CBD5E1] space-y-2">
              <p className="text-base">Nenhum banner cadastrado.</p>
              <p className="text-sm text-[#94A3B8]">Clique em "Novo banner" para criar o primeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F4D5C] bg-[#0E2A38] text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Título / Subtítulo</th>
                    <th className="p-4">Público</th>
                    <th className="p-4">Posição</th>
                    <th className="p-4">Vídeo</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F4D5C]/60 text-sm">
                  {banners.map((banner) => (
                    <tr key={banner.id} className="hover:bg-[#0E2A38]/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-[#F8FAFC]">{banner.title}</div>
                        <div className="text-xs text-[#94A3B8] mt-0.5">{banner.subtitle || 'Sem subtítulo'}</div>
                      </td>
                      <td className="p-4 text-[#CBD5E1] text-xs font-semibold uppercase tracking-wider">
                        {banner.audience === 'all' ? 'Todos' :
                         banner.audience === 'psychologist' ? 'Psicólogos' :
                         banner.audience === 'psychopedagogue' ? 'Psicopedagogos' : banner.audience}
                      </td>
                      <td className="p-4 text-[#94A3B8] text-xs">{banner.position}</td>
                      <td className="p-4 text-[#CBD5E1] text-xs">
                        {banner.video_url ? (
                          <span className="inline-flex items-center gap-1 text-[#7DD3FC]"><IconPlay /> Sim</span>
                        ) : 'Não'}
                      </td>
                      <td className="p-4 text-[#F8FAFC]">{banner.sort_order}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(banner)}
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            banner.is_active
                              ? 'text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20'
                              : 'text-[#94A3B8] bg-[#0E2A38] border border-[#1F4D5C]'
                          }`}
                        >
                          {banner.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="px-4 py-2 text-sm font-bold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition"
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
