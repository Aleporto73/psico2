import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

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
          image_url: payload.image_url || null,
          video_url: payload.video_url || null,
          button_text: payload.button_text || null,
          button_url: payload.button_url || null,
          secondary_button_text: payload.secondary_button_text || null,
          secondary_button_url: payload.secondary_button_url || null,
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
          image_url: payload.image_url || null,
          video_url: payload.video_url || null,
          button_text: payload.button_text || null,
          button_url: payload.button_url || null,
          secondary_button_text: payload.secondary_button_text || null,
          secondary_button_url: payload.secondary_button_url || null,
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
