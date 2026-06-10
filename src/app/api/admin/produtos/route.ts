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
    const { id, name, slug, type, audience, is_active } = payload;

    if (!name || !slug || !type || !audience) {
      return NextResponse.json(
        { message: 'Nome, Slug, Tipo e Público são campos obrigatórios.' },
        { status: 400 }
      );
    }

    let safeUrls;
    try {
      safeUrls = {
        image_url: normalizeOptionalHttpUrl(payload.image_url, 'URL da imagem'),
        access_url: normalizeOptionalHttpUrl(payload.access_url, 'URL de acesso'),
        tutorial_url: normalizeOptionalHttpUrl(payload.tutorial_url, 'URL do tutorial'),
        video_url: normalizeOptionalHttpUrl(payload.video_url, 'URL do vídeo'),
        checkout_url: normalizeOptionalHttpUrl(payload.checkout_url, 'URL do checkout'),
      };
    } catch (urlErr: any) {
      return NextResponse.json({ message: urlErr.message }, { status: 400 });
    }

    // Rule check: Block spreadsheet types in this route
    if (type === 'spreadsheet') {
      return NextResponse.json(
        { message: 'Não é permitido criar ou alterar produtos do tipo planilha nesta rota.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    if (id) {
      // Fetch previous product to block spreadsheet modifications
      const { data: previous, error: fetchErr } = await adminSupabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !previous) {
        return NextResponse.json({ message: 'Produto não encontrado.' }, { status: 404 });
      }

      if (previous.type === 'spreadsheet') {
        return NextResponse.json(
          { message: 'Não é permitido alterar produtos do tipo planilha.' },
          { status: 400 }
        );
      }

      const { error: updateErr } = await adminSupabase
        .from('products')
        .update({
          name: payload.name,
          slug: payload.slug,
          type: payload.type,
          audience: payload.audience,
          category: payload.category || null,
          description: payload.description || null,
          image_url: safeUrls.image_url,
          access_url: safeUrls.access_url,
          tutorial_url: safeUrls.tutorial_url,
          video_url: safeUrls.video_url,
          checkout_url: safeUrls.checkout_url,
          price: payload.price !== undefined && payload.price !== '' ? Number(payload.price) : null,
          billing_type: payload.billing_type || null,
          is_active: payload.is_active !== undefined ? payload.is_active : true,
          sort_order: payload.sort_order !== undefined ? Number(payload.sort_order) : 0,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Log edit
      await adminSupabase.from('admin_logs').insert({
        admin_id: adminUser?.id,
        action: 'editar produto',
        target_table: 'products',
        target_id: id,
        metadata: {
          name,
          slug,
          previous_active: previous.is_active,
          new_active: is_active,
        },
      });

      return NextResponse.json({ message: 'Produto atualizado com sucesso!' });
    } else {
      // Insert new product
      const { data: newProd, error: insertErr } = await adminSupabase
        .from('products')
        .insert({
          name: payload.name,
          slug: payload.slug,
          type: payload.type,
          audience: payload.audience,
          category: payload.category || null,
          description: payload.description || null,
          image_url: safeUrls.image_url,
          access_url: safeUrls.access_url,
          tutorial_url: safeUrls.tutorial_url,
          video_url: safeUrls.video_url,
          checkout_url: safeUrls.checkout_url,
          price: payload.price !== undefined && payload.price !== '' ? Number(payload.price) : null,
          billing_type: payload.billing_type || null,
          is_active: payload.is_active !== undefined ? payload.is_active : true,
          sort_order: payload.sort_order !== undefined ? Number(payload.sort_order) : 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Log create
      await adminSupabase.from('admin_logs').insert({
        admin_id: adminUser?.id,
        action: 'criar produto',
        target_table: 'products',
        target_id: newProd.id,
        metadata: { name, slug },
      });

      return NextResponse.json({
        message: 'Produto criado com sucesso!',
        data: newProd,
      });
    }
  } catch (err: any) {
    console.error('Error in admin products API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao processar a solicitação. Tente novamente.' },
      { status: 500 }
    );
  }
}
