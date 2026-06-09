import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

function normalizeOptionalHttpUrl(value: unknown, fieldLabel: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${fieldLabel} deve ser uma URL válida.`);

  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldLabel} deve ser uma URL válida.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${fieldLabel} deve começar com http:// ou https://.`);
  }

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const payload = await request.json();
    const { id, title, audience, position, is_active } = payload;

    if (!title || !audience || !position) {
      return NextResponse.json(
        { message: 'Título, Público e Posição são campos obrigatórios.' },
        { status: 400 }
      );
    }

    let safeUrls;
    try {
      safeUrls = {
        image_url: normalizeOptionalHttpUrl(payload.image_url, 'URL da imagem'),
        video_url: normalizeOptionalHttpUrl(payload.video_url, 'URL do vídeo'),
        button_url: normalizeOptionalHttpUrl(payload.button_url, 'URL do botão principal'),
        secondary_button_url: normalizeOptionalHttpUrl(payload.secondary_button_url, 'URL do botão secundário'),
      };
    } catch (urlErr: any) {
      return NextResponse.json({ message: urlErr.message }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    if (id) {
      // Fetch previous banner for logging metadata comparison
      const { data: previous, error: fetchErr } = await adminSupabase
        .from('promo_banners')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !previous) {
        return NextResponse.json({ message: 'Banner não encontrado.' }, { status: 404 });
      }

      const { error: updateErr } = await adminSupabase
        .from('promo_banners')
        .update({
          title: payload.title,
          subtitle: payload.subtitle || null,
          audience: payload.audience,
          position: payload.position,
          image_url: safeUrls.image_url,
          video_url: safeUrls.video_url,
          button_text: payload.button_text || null,
          button_url: safeUrls.button_url,
          secondary_button_text: payload.secondary_button_text || null,
          secondary_button_url: safeUrls.secondary_button_url,
          is_active: payload.is_active !== undefined ? payload.is_active : true,
          sort_order: payload.sort_order !== undefined ? Number(payload.sort_order) : 0,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Log edit action
      await adminSupabase.from('admin_logs').insert({
        admin_id: adminUser?.id,
        action: 'editar banner',
        target_table: 'promo_banners',
        target_id: id,
        metadata: {
          title,
          previous_active: previous.is_active,
          new_active: is_active,
        },
      });

      return NextResponse.json({ message: 'Banner atualizado com sucesso!' });
    } else {
      // Insert new banner
      const { data: newBanner, error: insertErr } = await adminSupabase
        .from('promo_banners')
        .insert({
          title: payload.title,
          subtitle: payload.subtitle || null,
          audience: payload.audience,
          position: payload.position,
          image_url: safeUrls.image_url,
          video_url: safeUrls.video_url,
          button_text: payload.button_text || null,
          button_url: safeUrls.button_url,
          secondary_button_text: payload.secondary_button_text || null,
          secondary_button_url: safeUrls.secondary_button_url,
          is_active: payload.is_active !== undefined ? payload.is_active : true,
          sort_order: payload.sort_order !== undefined ? Number(payload.sort_order) : 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Log create action
      await adminSupabase.from('admin_logs').insert({
        admin_id: adminUser?.id,
        action: 'criar banner',
        target_table: 'promo_banners',
        target_id: newBanner.id,
        metadata: { title },
      });

      return NextResponse.json({
        message: 'Banner criado com sucesso!',
        data: newBanner,
      });
    }
  } catch (err: any) {
    console.error('Error in admin banners API:', err);
    return NextResponse.json(
      { message: err.message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
