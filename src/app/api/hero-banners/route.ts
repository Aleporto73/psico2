import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const VALID_POSITIONS = ['dashboard', 'planilhas', 'produtos'] as const;

// GET /api/hero-banners?position=X — banners ativos por posição (público).
// Filtragem por audience é feita client-side pelo componente HeroBanner.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');

    if (!position) {
      return NextResponse.json(
        { message: 'Parâmetro "position" é obrigatório.' },
        { status: 400 }
      );
    }

    if (!VALID_POSITIONS.includes(position as (typeof VALID_POSITIONS)[number])) {
      return NextResponse.json(
        { message: `Posição inválida. Use uma de: ${VALID_POSITIONS.join(', ')}.` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error: queryErr } = await supabase
      .from('hero_banners')
      .select('id, image_url, link_url, position, audience, alt_text, sort_order')
      .eq('position', position)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (queryErr) throw queryErr;

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('Error in GET public hero-banners API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao buscar os banners. Tente novamente.' },
      { status: 500 }
    );
  }
}
