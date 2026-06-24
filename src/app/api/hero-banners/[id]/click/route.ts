import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/hero-banners/[id]/click — registra um clique no banner.
// Público (auth opcional no código); hoje a RLS exige authenticated para inserir.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ message: 'Identificador de banner inválido.' }, { status: 400 });
    }

    // Lê o banner com service role para enxergar ativos E inativos — um banner
    // pode ter virado inativo entre o render e o clique, e o engajamento real
    // deve ser registrado mesmo assim. null = deletado/inexistente → 404.
    const adminSupabase = createAdminClient();
    const { data: banner, error: bannerErr } = await adminSupabase
      .from('hero_banners')
      .select('id, position, audience')
      .eq('id', id)
      .maybeSingle();

    if (bannerErr) throw bannerErr;
    if (!banner) {
      return NextResponse.json({ message: 'Banner não encontrado.' }, { status: 404 });
    }

    // user via cookies (null se anônimo). O insert vai pelo client SSR para que
    // a RLS governe: with check (user_id = auth.uid() or user_id is null).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertErr } = await supabase.from('hero_banner_clicks').insert({
      banner_id: banner.id,
      user_id: user?.id ?? null,
      position: banner.position,
      audience_at_click: banner.audience ?? null,
    });

    if (insertErr) {
      // Sem user, a RLS (to authenticated) barra o insert — anônimo não é suportado hoje.
      if (!user) {
        return NextResponse.json(
          { message: 'Autenticação necessária para registrar o clique.' },
          { status: 401 }
        );
      }
      throw insertErr;
    }

    return NextResponse.json({ message: 'Clique registrado.' }, { status: 201 });
  } catch (err: any) {
    console.error('Error in POST hero-banner click API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao registrar o clique.' },
      { status: 500 }
    );
  }
}
