import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify admin privilege
    const { error: adminAuthErr, status, user: adminUser } = await verifyAdmin();
    if (adminAuthErr) {
      return NextResponse.json({ message: adminAuthErr }, { status });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      profile_type,
      source,
      has_lifetime_access,
      activate_pro,
      pro_expires_at,
    } = body;

    // 2. Validate payload
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { message: 'Nome e E-mail são campos obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { message: 'Formato de e-mail inválido.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 3. Check if user already exists in profiles
    const { data: existingProfile, error: searchErr } = await adminSupabase
      .from('profiles')
      .select('id, role, status, activation_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (searchErr) {
      console.error('Error searching profile:', searchErr);
      return NextResponse.json(
        { message: 'Erro interno ao consultar perfil de usuário.' },
        { status: 500 }
      );
    }

    // TRAVA 1: Se for admin, não pode virar cliente nem ser alterado
    if (existingProfile && existingProfile.role === 'admin') {
      return NextResponse.json(
        { message: 'Este e-mail pertence a um administrador e não pode ser cadastrado como cliente manual.' },
        { status: 400 }
      );
    }

    let userId = '';
    const cleanName = name.trim();
    const cleanSource = source || 'manual_pix';
    const cleanProfileType = profile_type || 'unknown';

    // 4. Create or update profile
    if (existingProfile) {
      userId = existingProfile.id;

      // Update profile safely (never change status or role here)
      const { error: updateErr } = await adminSupabase
        .from('profiles')
        .update({
          name: cleanName,
          phone: phone?.trim() || null,
          profile_type: cleanProfileType,
          source: cleanSource,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateErr) {
        console.error('Error updating existing profile:', updateErr);
        return NextResponse.json(
          { message: 'Erro ao atualizar dados do perfil existente.' },
          { status: 500 }
        );
      }
    } else {
      // User doesn't exist in profiles. Try to create via Supabase Auth Admin.
      const { data: authUser, error: createAuthErr } = await adminSupabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          name: cleanName,
          source: cleanSource,
        },
      });

      if (createAuthErr) {
        // Fallback para caso raro de usuário existir no Auth mas não no profiles table (desync)
        if (createAuthErr.message.includes('already exists') || createAuthErr.status === 422) {
          let matchedUserId = '';
          let page = 1;
          const perPage = 1000;
          outerSearch:
          while (page <= 5) {
            const { data: userList, error: listErr } = await adminSupabase.auth.admin.listUsers({ page, perPage });
            if (listErr || !userList) break;
            const users = userList.users ?? [];
            for (const u of users) {
              if (u.email?.toLowerCase() === normalizedEmail) {
                matchedUserId = u.id;
                break outerSearch;
              }
            }
            if (users.length < perPage) break;
            page++;
          }

          if (!matchedUserId) {
            return NextResponse.json(
              { message: `O usuário já existe na autenticação, mas não pôde ser localizado: ${createAuthErr.message}` },
              { status: 500 }
            );
          }

          userId = matchedUserId;
        } else {
          console.error('Auth user creation error:', createAuthErr);
          return NextResponse.json(
            { message: `Erro ao cadastrar usuário na autenticação: ${createAuthErr.message}` },
            { status: 500 }
          );
        }
      } else if (authUser?.user) {
        userId = authUser.user.id;
      } else {
        return NextResponse.json(
          { message: 'Nenhum dado retornado do Supabase Auth.' },
          { status: 500 }
        );
      }

      // Check if profile was created by database trigger, insert fallback if not
      const { data: checkProfile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!checkProfile) {
        const { error: insertProfileErr } = await adminSupabase.from('profiles').insert({
          id: userId,
          name: cleanName,
          email: normalizedEmail,
          phone: phone?.trim() || null,
          role: 'customer',
          profile_type: cleanProfileType,
          status: 'active',
          activation_status: 'pending_activation',
          source: cleanSource,
        });

        if (insertProfileErr) {
          console.error('Error inserting fallback profile:', insertProfileErr);
          return NextResponse.json(
            { message: 'Erro ao criar perfil de usuário.' },
            { status: 500 }
          );
        }
      }
    }

    // 5. Provision Lifetime access (purchases) if checked
    let lifetimeStatus = 'não liberado';
    if (has_lifetime_access) {
      const { data: vitalicioProduct, error: prodErr } = await adminSupabase
        .from('products')
        .select('id')
        .eq('slug', 'psicoplanilhas-vitalicio')
        .maybeSingle();

      if (prodErr || !vitalicioProduct) {
        return NextResponse.json(
          { message: 'Produto psicoplanilhas-vitalicio não cadastrado no sistema.' },
          { status: 500 }
        );
      }

      const { data: existingPurchase } = await adminSupabase
        .from('purchases')
        .select('id, payment_status')
        .eq('user_id', userId)
        .eq('product_id', vitalicioProduct.id)
        .maybeSingle();

      if (!existingPurchase) {
        const { error: purchaseErr } = await adminSupabase.from('purchases').insert({
          user_id: userId,
          product_id: vitalicioProduct.id,
          payment_status: 'manual',
          source: cleanSource,
        });
        if (purchaseErr) {
          console.error('Error inserting vitalicio purchase:', purchaseErr);
          return NextResponse.json(
            { message: 'Erro ao salvar compra vitalícia.' },
            { status: 500 }
          );
        }
        lifetimeStatus = 'liberado';
      } else {
        // If purchase already exists but has a failed/refunded status, reactivate it to 'manual'
        if (existingPurchase.payment_status !== 'paid' && existingPurchase.payment_status !== 'manual') {
          const { error: purchaseUpdateErr } = await adminSupabase
            .from('purchases')
            .update({ payment_status: 'manual' })
            .eq('id', existingPurchase.id);

          if (purchaseUpdateErr) {
            console.error('Error updating purchase status:', purchaseUpdateErr);
            return NextResponse.json(
              { message: 'Erro ao reativar compra vitalícia.' },
              { status: 500 }
            );
          }
          lifetimeStatus = 'liberado';
        } else {
          lifetimeStatus = 'já existia';
        }
      }
    }

    // 6. Provision Assistente IA Pro (subscriptions) if checked
    let proStatus = 'não ativado';
    let proExpiresAt: string | null = null;
    if (activate_pro) {
      const { data: proProduct, error: prodErr } = await adminSupabase
        .from('products')
        .select('id')
        .eq('slug', 'assistente-ia-pro')
        .maybeSingle();

      if (prodErr || !proProduct) {
        return NextResponse.json(
          { message: 'Produto assistente-ia-pro não cadastrado no sistema.' },
          { status: 500 }
        );
      }

      const expiresAtDate = pro_expires_at
        ? new Date(pro_expires_at)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      proExpiresAt = expiresAtDate.toISOString();

      const { data: existingSub } = await adminSupabase
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', userId)
        .eq('product_id', proProduct.id)
        .maybeSingle();

      if (!existingSub) {
        const { error: subErr } = await adminSupabase.from('subscriptions').insert({
          user_id: userId,
          product_id: proProduct.id,
          plan_slug: 'assistente-ia-pro',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: proExpiresAt,
          source: cleanSource,
        });

        if (subErr) {
          console.error('Error inserting pro subscription:', subErr);
          return NextResponse.json(
            { message: 'Erro ao salvar assinatura manual.' },
            { status: 500 }
          );
        }
        proStatus = 'ativado';
      } else {
        // Update subscription to active status and update expires_at
        const { error: subUpdateErr } = await adminSupabase
          .from('subscriptions')
          .update({
            status: 'active',
            expires_at: proExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);

        if (subUpdateErr) {
          console.error('Error updating sub status:', subUpdateErr);
          return NextResponse.json(
            { message: 'Erro ao atualizar assinatura.' },
            { status: 500 }
          );
        }
        proStatus = 'atualizado';
      }
    }

    // 7. Write admin logs
    await adminSupabase.from('admin_logs').insert({
      admin_id: adminUser?.id,
      action: 'manual_client_create_or_update',
      target_table: 'profiles',
      target_id: userId,
      metadata: {
        email: normalizedEmail,
        source: cleanSource,
        has_lifetime_access: !!has_lifetime_access,
        activate_pro: !!activate_pro,
        pro_expires_at: proExpiresAt,
      },
    });

    // 8. Fetch fresh user details to check final activation status
    const { data: finalProfile } = await adminSupabase
      .from('profiles')
      .select('activation_status')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      message: 'Cliente cadastrado/atualizado com sucesso. Oriente o cliente a ativar o acesso pelo link de ativação.',
      client: {
        id: userId,
        email: normalizedEmail,
        name: cleanName,
        activation_status: finalProfile?.activation_status || 'pending_activation',
        has_lifetime_access: lifetimeStatus,
        pro_status: proStatus,
        pro_expires_at: proExpiresAt,
      },
    });
  } catch (err: any) {
    console.error('Fatal error in manual client API:', err);
    return NextResponse.json(
      { message: err.message || 'Ocorreu um erro interno.' },
      { status: 500 }
    );
  }
}
