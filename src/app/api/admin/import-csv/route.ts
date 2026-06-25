import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

interface ImportRecord {
  name: string;
  email: string;
  phone?: string;
  purchase_code?: string;
  purchase_date?: string;
  profile_type?: string;
  source?: string;
}

export async function POST(request: Request) {
  try {
    // 1. Verify admin privilege
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const { clients } = await request.json();

    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json({ message: 'Payload inválido. Array de clientes esperado.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Origin usado para o redirect do email de ativação (/definir-senha)
    const origin = new URL(request.url).origin;

    // Fetch vitalicio product reference
    const { data: vitalicioProduct } = await adminSupabase
      .from('products')
      .select('id')
      .eq('slug', 'psicoplanilhas-vitalicio')
      .single();

    if (!vitalicioProduct) {
      return NextResponse.json({ message: 'Produto psicoplanilhas-vitalicio não encontrado no banco.' }, { status: 500 });
    }

    const stats = {
      total: clients.length,
      imported: 0,
      updated: 0,
      invalid: 0,
      duplicates: 0,
      errors: [] as Array<{ email: string; reason: string }>,
    };

    const processedEmails = new Set<string>();

    for (const record of clients as ImportRecord[]) {
      let { email, name, phone, purchase_code, purchase_date, profile_type, source } = record;

      // Basic email validation & normalization
      if (!email || typeof email !== 'string') {
        stats.invalid++;
        stats.errors.push({ email: 'Vazio', reason: 'E-mail não fornecido.' });
        continue;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        stats.invalid++;
        stats.errors.push({ email: normalizedEmail, reason: 'Formato de e-mail inválido.' });
        continue;
      }

      // Check for duplicates inside the CSV itself
      if (processedEmails.has(normalizedEmail)) {
        stats.duplicates++;
        continue;
      }
      processedEmails.add(normalizedEmail);

      // Normalizing Name
      let cleanName = name?.trim() || '';
      if (!cleanName) {
        cleanName = normalizedEmail.split('@')[0];
      }

      // Normalize Profile Type
      let cleanProfileType = 'unknown';
      if (profile_type) {
        const type = profile_type.trim().toLowerCase();
        if (['psychologist', 'psychopedagogue', 'both'].includes(type)) {
          cleanProfileType = type;
        }
      }

      const cleanSource = source?.trim() || 'old_php_email_import';

      try {
        // A. Check if user already exists in profiles by email
        const { data: existingProfileByEmail, error: searchErr } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (searchErr) throw searchErr;

        let userId = '';

        if (!existingProfileByEmail) {
          // B. Convida o novo cliente: inviteUserByEmail cria o usuário no Auth E
          // dispara o e-mail de migração (template "Invite user") numa só chamada.
          // Se o convite falhar (ex: rate limit do Supabase Auth), o erro propaga
          // para o catch da linha — a falha entra em stats.errors[] e o admin
          // reprocessa o registro depois.
          const { data: invited, error: inviteErr } = await adminSupabase.auth.admin.inviteUserByEmail(
            normalizedEmail,
            {
              redirectTo: `${origin}/definir-senha`,
              data: { name: cleanName },
            },
          );

          if (inviteErr || !invited.user) {
            throw new Error(inviteErr?.message || 'Falha ao convidar usuário na autenticação do Supabase.');
          }

          userId = invited.user.id;
          stats.imported++;
        } else {
          userId = existingProfileByEmail.id;
          stats.updated++;
        }

        // C. Create or update profile in public.profiles (upsert-like behavior)
        const { data: existingProfileById } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!existingProfileById) {
          await adminSupabase.from('profiles').insert({
            id: userId,
            name: cleanName,
            email: normalizedEmail,
            phone: phone?.trim() || null,
            role: 'customer',
            profile_type: cleanProfileType,
            status: 'active',
            activation_status: 'pending_activation',
            source: cleanSource,
            imported_at: new Date().toISOString(),
          });
        } else {
          // Enrich profile metadata without overriding critical fields (role, status)
          await adminSupabase
            .from('profiles')
            .update({
              name: cleanName,
              phone: phone?.trim() || null,
              profile_type: cleanProfileType,
            })
            .eq('id', userId);
        }

        // D. Create purchase manual for psicoplanilhas-vitalicio (idempotent)
        const { data: existingPurchase } = await adminSupabase
          .from('purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('product_id', vitalicioProduct.id)
          .maybeSingle();

        if (!existingPurchase) {
          await adminSupabase.from('purchases').insert({
            user_id: userId,
            product_id: vitalicioProduct.id,
            purchase_code: purchase_code?.trim() || null,
            payment_status: 'manual',
            source: cleanSource,
            purchased_at: purchase_date ? new Date(purchase_date).toISOString() : new Date().toISOString(),
          });
        }

      } catch (err: any) {
        console.error(`Error processing record for ${normalizedEmail}:`, err);
        stats.errors.push({ email: normalizedEmail, reason: 'Falha ao processar este registro. Revise os dados e tente novamente.' });
      }
    }

    // Record administrative action log
    await adminSupabase.from('admin_logs').insert({
      admin_id: adminUser?.id,
      action: 'importar CSV',
      target_table: 'profiles',
      metadata: { stats },
    });

    return NextResponse.json({
      message: 'Processamento de importação concluído!',
      stats,
    });
  } catch (err: any) {
    console.error('Fatal error during CSV import API:', err);
    return NextResponse.json(
      { message: 'Ocorreu um erro durante a importação. Revise o arquivo e tente novamente.' },
      { status: 500 }
    );
  }
}
