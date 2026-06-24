import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const VALID_POSITIONS = ['dashboard', 'planilhas', 'produtos'] as const;
const VALID_AUDIENCES = ['all', 'psychologist', 'psychopedagogue', 'both'] as const;
const BUCKET = 'hero-banners';

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

// Extrai o path do objeto no bucket a partir de uma URL pública do Storage.
// Retorna null se a URL não pertencer ao bucket hero-banners.
function extractBucketPath(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = imageUrl.slice(idx + marker.length);
  return path ? decodeURIComponent(path) : null;
}

// PATCH /api/admin/hero-banners/[id] — atualiza banner (parcial)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const { id } = await params;
    const payload = await request.json();
    const adminSupabase = createAdminClient();

    const { data: previous, error: fetchErr } = await adminSupabase
      .from('hero_banners')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !previous) {
      return NextResponse.json({ message: 'Banner não encontrado.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    try {
      if (payload.image_url !== undefined) {
        const img = normalizeOptionalHttpUrl(payload.image_url, 'URL da imagem');
        if (!img) {
          return NextResponse.json(
            { message: 'URL da imagem é obrigatória.' },
            { status: 400 }
          );
        }
        updates.image_url = img;
      }
      if (payload.link_url !== undefined) {
        updates.link_url = normalizeOptionalHttpUrl(payload.link_url, 'URL do link');
      }
    } catch (urlErr: any) {
      return NextResponse.json({ message: urlErr.message }, { status: 400 });
    }

    if (payload.position !== undefined) {
      if (!VALID_POSITIONS.includes(payload.position)) {
        return NextResponse.json(
          { message: `Posição inválida. Use uma de: ${VALID_POSITIONS.join(', ')}.` },
          { status: 400 }
        );
      }
      updates.position = payload.position;
    }

    if (payload.audience !== undefined) {
      if (!VALID_AUDIENCES.includes(payload.audience)) {
        return NextResponse.json(
          { message: `Público inválido. Use um de: ${VALID_AUDIENCES.join(', ')}.` },
          { status: 400 }
        );
      }
      updates.audience = payload.audience;
    }

    if (payload.alt_text !== undefined) {
      updates.alt_text = payload.alt_text || null;
    }
    if (payload.is_active !== undefined) {
      updates.is_active = Boolean(payload.is_active);
    }
    if (payload.sort_order !== undefined) {
      updates.sort_order = Number(payload.sort_order);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'Nenhum campo válido para atualizar.' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateErr } = await adminSupabase
      .from('hero_banners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await adminSupabase.from('admin_logs').insert({
      admin_id: adminUser?.id,
      action: 'editar hero banner',
      target_table: 'hero_banners',
      target_id: id,
      metadata: {
        previous_active: previous.is_active,
        new_active: updated.is_active,
        fields: Object.keys(updates),
      },
    });

    return NextResponse.json({ message: 'Banner atualizado com sucesso!', data: updated });
  } catch (err: any) {
    console.error('Error in PATCH admin hero-banners API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao atualizar o banner. Tente novamente.' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/hero-banners/[id] — deleta banner + remove imagem do bucket
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const { id } = await params;
    const adminSupabase = createAdminClient();

    const { data: existing, error: fetchErr } = await adminSupabase
      .from('hero_banners')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ message: 'Banner não encontrado.' }, { status: 404 });
    }

    // Best-effort: remove o arquivo do bucket se a imagem pertence a ele.
    const bucketPath = extractBucketPath(existing.image_url);
    if (bucketPath) {
      const { error: removeErr } = await adminSupabase.storage
        .from(BUCKET)
        .remove([bucketPath]);
      if (removeErr) {
        console.warn(
          `Falha ao remover imagem do bucket (${bucketPath}), prosseguindo com delete da row:`,
          removeErr.message
        );
      }
    }

    const { error: deleteErr } = await adminSupabase
      .from('hero_banners')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    await adminSupabase.from('admin_logs').insert({
      admin_id: adminUser?.id,
      action: 'deletar hero banner',
      target_table: 'hero_banners',
      target_id: id,
      metadata: { position: existing.position, removed_image: bucketPath },
    });

    return NextResponse.json({ message: 'Banner removido com sucesso!' });
  } catch (err: any) {
    console.error('Error in DELETE admin hero-banners API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao remover o banner. Tente novamente.' },
      { status: 500 }
    );
  }
}
