import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const BUCKET = 'hero-banners';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// POST /api/admin/hero-banners/upload — upload de imagem, retorna URL pública
export async function POST(request: Request) {
  try {
    const { error, status } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { message: 'Envio inválido. Use multipart/form-data com o campo "file".' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: 'Arquivo de imagem é obrigatório no campo "file".' },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json(
        { message: 'Formato inválido. Aceitos: PNG, JPEG ou WebP.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ message: 'Arquivo vazio.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { message: 'Arquivo muito grande. Tamanho máximo: 5MB.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await adminSupabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadErr) {
      console.error('Error uploading hero banner image:', uploadErr);
      return NextResponse.json(
        { message: 'Falha ao enviar a imagem. Tente novamente.' },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json(
      { message: 'Imagem enviada com sucesso!', data: { path, publicUrl } },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error in POST admin hero-banners upload API:', err);
    return NextResponse.json(
      { message: 'Erro interno ao enviar a imagem. Tente novamente.' },
      { status: 500 }
    );
  }
}
