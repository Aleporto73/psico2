'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface HeroBanner {
  id: string;
  image_url: string;
  link_url: string | null;
  position: 'dashboard' | 'planilhas' | 'produtos';
  audience: 'all' | 'psychologist' | 'psychopedagogue' | 'both';
  alt_text: string | null;
  is_active: boolean;
  sort_order: number;
  clicks_7d?: number;
  created_at?: string;
  updated_at?: string;
}

type BannerForm = {
  id?: string;
  image_url?: string;
  link_url?: string;
  position?: HeroBanner['position'];
  audience?: HeroBanner['audience'];
  alt_text?: string;
  is_active?: boolean;
  sort_order?: number;
};

const POSITION_LABELS: Record<HeroBanner['position'], string> = {
  dashboard: 'Dashboard (topo)',
  planilhas: 'Planilhas (sticky)',
  produtos: 'Produtos (topo)',
};

const AUDIENCE_LABELS: Record<HeroBanner['audience'], string> = {
  all: 'Todos',
  psychologist: 'Psicólogos',
  psychopedagogue: 'Psicopedagogos',
  both: 'Ambos',
};

export default function AdminBannersCanvaPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BannerForm | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroBanner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBanners();
  }, []);

  // Limpa a object URL do preview ao desmontar / trocar arquivo
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const fetchBanners = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/hero-banners');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao carregar banners.');
      setBanners(json.data || []);
    } catch (err: any) {
      console.error('Error fetching hero banners:', err);
      setErrorMsg(err.message || 'Erro ao carregar banners. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNew = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setEditing({
      position: 'dashboard',
      audience: 'all',
      link_url: '',
      alt_text: '',
      is_active: true,
      sort_order: 0,
    });
    setShowForm(true);
  };

  const handleEdit = (banner: HeroBanner) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setEditing({
      id: banner.id,
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      position: banner.position,
      audience: banner.audience,
      alt_text: banner.alt_text || '',
      is_active: banner.is_active,
      sort_order: banner.sort_order,
    });
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (filePreview) URL.revokeObjectURL(filePreview);
    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  // Faz upload do arquivo selecionado e retorna a URL pública.
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/hero-banners/upload', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Falha ao enviar a imagem.');
    return json.data.publicUrl as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const isEdit = Boolean(editing.id);

    // Imagem é obrigatória na criação
    if (!isEdit && !selectedFile) {
      setErrorMsg('Selecione uma imagem para o banner.');
      return;
    }
    if (!editing.position) {
      setErrorMsg('Selecione a posição do banner.');
      return;
    }

    setSaving(true);
    try {
      // 1. Upload (se houver novo arquivo)
      let imageUrl = editing.image_url;
      if (selectedFile) {
        setUploading(true);
        imageUrl = await uploadImage(selectedFile);
        setUploading(false);
      }

      // 2. Monta payload comum
      const body: Record<string, unknown> = {
        link_url: editing.link_url?.trim() || null,
        position: editing.position,
        audience: editing.audience || 'all',
        alt_text: editing.alt_text?.trim() || null,
        is_active: editing.is_active ?? true,
        sort_order: Number(editing.sort_order) || 0,
      };
      if (imageUrl) body.image_url = imageUrl;

      // 3. Cria ou atualiza
      const res = await fetch(
        isEdit ? `/api/admin/hero-banners/${editing.id}` : '/api/admin/hero-banners',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao salvar o banner.');

      setSuccessMsg(isEdit ? 'Banner atualizado com sucesso!' : 'Banner criado com sucesso!');
      resetForm();
      fetchBanners();
    } catch (err: any) {
      console.error('Error saving hero banner:', err);
      setErrorMsg(err.message || 'Não foi possível salvar o banner. Tente novamente.');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/hero-banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao alternar status.');
      fetchBanners();
    } catch (err: any) {
      console.error('Error toggling hero banner:', err);
      setErrorMsg(err.message || 'Não foi possível alterar o status. Tente novamente.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/hero-banners/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Erro ao remover o banner.');
      setSuccessMsg('Banner removido com sucesso!');
      setDeleteTarget(null);
      fetchBanners();
    } catch (err: any) {
      console.error('Error deleting hero banner:', err);
      setErrorMsg(err.message || 'Não foi possível remover o banner. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Estilos compartilhados ──────────────────────────────────────────────────

  const inputCls =
    'w-full px-4 py-2.5 bg-[#0E2A38] border border-[#1F4D5C] rounded-xl text-base text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#7DD3FC] focus:ring-1 focus:ring-[#7DD3FC] transition';
  const labelCls = 'block text-sm font-bold text-[#CBD5E1]';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#061923] text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center pb-6 border-b border-[#1F4D5C] gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#94A3B8] mb-1">
              <Link href="/admin" className="hover:text-[#7DD3FC] transition">Admin</Link>
              <span>/</span>
              <span className="text-[#CBD5E1]">Banners Canva</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Banners Canva (HeroBanner)</h1>
            <p className="text-[#CBD5E1] text-base mt-1">Suba imagens prontas do Canva e escolha onde elas aparecem. Sem deploy.</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleNew}
              className="px-5 py-2.5 text-sm font-bold bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] rounded-xl transition duration-200"
            >
              Subir novo banner
            </button>
            <Link
              href="/admin"
              className="px-5 py-2.5 text-sm bg-[#0E2A38] hover:bg-[#123340] text-[#F8FAFC] border border-[#1F4D5C] rounded-xl transition duration-200"
            >
              Voltar
            </Link>
          </div>
        </header>

        {/* Mensagens */}
        {errorMsg && <div className="p-4 text-base font-medium text-[#FB7185] bg-[#FB7185]/10 border border-[#FB7185]/20 rounded-xl">{errorMsg}</div>}
        {successMsg && <div className="p-4 text-base font-medium text-[#34D399] bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">{successMsg}</div>}

        {/* Painel de criação / edição */}
        {showForm && editing && (
          <div className="p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <div className="flex justify-between items-center border-b border-[#1F4D5C] pb-3">
              <h2 className="text-lg font-bold text-[#F8FAFC]">{editing.id ? 'Editar banner' : 'Novo banner'}</h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-semibold"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Upload de imagem */}
              <div className="md:col-span-2 space-y-2">
                <label className={labelCls}>
                  Imagem do banner {editing.id ? '(opcional — deixe vazio para manter a atual)' : '(obrigatória)'}
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-40 h-24 shrink-0 rounded-xl border border-[#1F4D5C] bg-[#0E2A38] overflow-hidden flex items-center justify-center">
                    {filePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={filePreview} alt="Pré-visualização" className="w-full h-full object-cover" />
                    ) : editing.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editing.image_url} alt="Imagem atual" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-[#94A3B8]">Sem imagem</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="block text-sm text-[#CBD5E1] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#7DD3FC] file:text-[#061923] hover:file:bg-[#67E8F9] file:cursor-pointer cursor-pointer"
                    />
                    <p className="text-xs text-[#94A3B8]">PNG, JPEG ou WebP. Máx. 5MB.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Posição (obrigatório)</label>
                <select
                  value={editing.position || 'dashboard'}
                  onChange={(e) => setEditing({ ...editing, position: e.target.value as HeroBanner['position'] })}
                  className={inputCls}
                  required
                >
                  <option value="dashboard">Dashboard (topo)</option>
                  <option value="planilhas">Planilhas (sticky)</option>
                  <option value="produtos">Produtos (topo)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Público-alvo</label>
                <select
                  value={editing.audience || 'all'}
                  onChange={(e) => setEditing({ ...editing, audience: e.target.value as HeroBanner['audience'] })}
                  className={inputCls}
                >
                  <option value="all">Todos (all)</option>
                  <option value="psychologist">Psicólogos (psychologist)</option>
                  <option value="psychopedagogue">Psicopedagogos (psychopedagogue)</option>
                  <option value="both">Ambos (both)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Link de destino (opcional)</label>
                <input
                  type="text"
                  value={editing.link_url || ''}
                  onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                  className={inputCls}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Texto alternativo / alt (opcional)</label>
                <input
                  type="text"
                  value={editing.alt_text || ''}
                  onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })}
                  className={inputCls}
                  placeholder="Descrição da imagem para acessibilidade"
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Ordem de exibição (sort_order)</label>
                <input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center space-x-3 pt-7">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-5 h-5 rounded bg-[#0E2A38] border-[#1F4D5C] accent-[#7DD3FC]"
                />
                <label htmlFor="is_active" className="text-[#CBD5E1] text-sm font-semibold cursor-pointer">Banner ativo / visível</label>
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 text-sm border border-[#1F4D5C] text-[#F8FAFC] rounded-xl hover:bg-[#0E2A38] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 text-base font-bold bg-[#7DD3FC] hover:bg-[#67E8F9] text-[#061923] rounded-xl transition shadow-md shadow-[#7DD3FC]/15 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Enviando imagem...' : saving ? 'Salvando...' : 'Salvar banner'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de banners */}
        <div className="bg-[#0B2430] rounded-2xl border border-[#1F4D5C] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[#CBD5E1]">
              <div className="w-8 h-8 border-2 border-[#1F4D5C] border-t-[#7DD3FC] rounded-full animate-spin mx-auto mb-3" />
              Carregando banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="p-10 text-center text-[#CBD5E1] space-y-2">
              <p className="text-base">Nenhum banner cadastrado.</p>
              <p className="text-sm text-[#94A3B8]">Clique em "Subir novo banner" para criar o primeiro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F4D5C] bg-[#0E2A38] text-[#CBD5E1] text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Imagem</th>
                    <th className="p-4">Posição</th>
                    <th className="p-4">Público</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Cliques (7d)</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F4D5C]/60 text-sm">
                  {banners.map((banner) => (
                    <tr key={banner.id} className="hover:bg-[#0E2A38]/50 transition">
                      <td className="p-4">
                        <div className="w-24 h-14 rounded-lg border border-[#1F4D5C] bg-[#0E2A38] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={banner.image_url} alt={banner.alt_text || 'Banner'} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-4 text-[#CBD5E1] text-xs font-semibold">{POSITION_LABELS[banner.position] || banner.position}</td>
                      <td className="p-4 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">{AUDIENCE_LABELS[banner.audience] || banner.audience}</td>
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
                      <td className={`p-4 font-semibold ${(banner.clicks_7d ?? 0) > 0 ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'}`}>
                        {banner.clicks_7d ?? 0}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="px-4 py-2 text-sm font-bold text-[#F8FAFC] bg-[#0E2A38] hover:bg-[#123340] border border-[#1F4D5C] rounded-xl transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteTarget(banner)}
                            className="px-4 py-2 text-sm font-bold text-[#FB7185] bg-[#FB7185]/10 hover:bg-[#FB7185]/20 border border-[#FB7185]/20 rounded-xl transition"
                          >
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Overlay de confirmação de exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md p-6 bg-[#0B2430] rounded-2xl border border-[#1F4D5C] space-y-5">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F8FAFC]">Remover banner?</h3>
              <p className="text-sm text-[#CBD5E1]">
                Esta ação remove o banner e a imagem do bucket permanentemente. Não dá para desfazer.
              </p>
            </div>
            <div className="w-32 h-20 rounded-lg border border-[#1F4D5C] bg-[#0E2A38] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deleteTarget.image_url} alt={deleteTarget.alt_text || 'Banner'} className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 text-sm border border-[#1F4D5C] text-[#F8FAFC] rounded-xl hover:bg-[#0E2A38] transition disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-bold text-[#061923] bg-[#FB7185] hover:bg-[#f43f5e] rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? 'Removendo...' : 'Sim, remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
