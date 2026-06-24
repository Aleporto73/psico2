import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const VALID_POSITIONS = ['dashboard', 'planilhas', 'produtos'] as const;
const VALID_AUDIENCES = ['all', 'psychologist', 'psychopedagogue', 'both'] as const;

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

function requireHttpUrl(value: unknown, fieldLabel: string): string {
  const normalized = normalizeOptionalHttpUrl(value, fieldLabel);
  if (!normalized) throw new Error(`${fieldLabel} é obrigatória.`);
  return normalized;
}

// GET /api/admin/hero-banners — lista todos (ativos + inativos)
export async function GET() {
  try {
    const { error, status } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const adminSupabase = createAdminClient();
    const { data, error: queryErr } = await adminSupabase
      .from('hero_banners')
      .select('*')
      .order('position', { ascending: true })
      .order('sort_order', { ascending: true });

    if (queryErr) throw queryErr;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Error in GET admin hero-banners API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao listar os banners. Tente novamente.' },
      { status: 500 }
    );
  }
}

// POST /api/admin/hero-banners — cria banner
export async function POST(request: Request) {
  try {
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const payload = await request.json();
    const { position, audience } = payload;

    if (!position || !VALID_POSITIONS.includes(position)) {
      return NextResponse.json(
        { message: `Posição inválida. Use uma de: ${VALID_POSITIONS.join(', ')}.` },
        { status: 400 }
      );
    }

    if (audience !== undefined && audience !== null && !VALID_AUDIENCES.includes(audience)) {
      return NextResponse.json(
        { message: `Público inválido. Use um de: ${VALID_AUDIENCES.join(', ')}.` },
        { status: 400 }
      );
    }

    let imageUrl: string;
    let linkUrl: string | null;
    try {
      imageUrl = requireHttpUrl(payload.image_url, 'URL da imagem');
      linkUrl = normalizeOptionalHttpUrl(payload.link_url, 'URL do link');
    } catch (urlErr: any) {
      return NextResponse.json({ message: urlErr.message }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: newBanner, error: insertErr } = await adminSupabase
      .from('hero_banners')
      .insert({
        image_url: imageUrl,
        link_url: linkUrl,
        position,
        audience: audience || 'all',
        alt_text: payload.alt_text || null,
        is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
        sort_order: payload.sort_order !== undefined ? Number(payload.sort_order) : 0,
        created_by: adminUser?.id ?? null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    await adminSupabase.from('admin_logs').insert({
      admin_id: adminUser?.id,
      action: 'criar hero banner',
      target_table: 'hero_banners',
      target_id: newBanner.id,
      metadata: { position, audience: newBanner.audience },
    });

    return NextResponse.json(
      { message: 'Banner criado com sucesso!', data: newBanner },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error in POST admin hero-banners API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao criar o banner. Tente novamente.' },
      { status: 500 }
    );
  }
}
