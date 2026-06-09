import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify admin session
    const { error, status, user: adminUser } = await verifyAdmin();
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const { id: clientId } = await params;
    const { action, metadata } = await request.json();

    if (!action) {
      return NextResponse.json({ message: 'Ação não especificada.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Fetch target client profile
    const { data: clientProfile, error: profileErr } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (profileErr || !clientProfile) {
      return NextResponse.json({ message: 'Cliente não encontrado.' }, { status: 404 });
    }

    const destructiveActions = ['bloquear', 'cancelar-vitalicio', 'cancelar-pro'];

    if (destructiveActions.includes(action)) {
      if (clientProfile.id === adminUser?.id) {
        return NextResponse.json(
          { message: 'Ação bloqueada: um admin não pode aplicar ação destrutiva em si mesmo.' },
          { status: 403 }
        );
      }

      if (clientProfile.role === 'admin') {
        return NextResponse.json(
          { message: 'Ação bloqueada: contas admin não podem sofrer ações destrutivas por esta tela.' },
          { status: 403 }
        );
      }
    }

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/definir-senha`;

    // Fetch product references
    const { data: vitalicioProduct } = await adminSupabase
      .from('products')
      .select('id')
      .eq('slug', 'psicoplanilhas-vitalicio')
      .single();

    const { data: proProduct } = await adminSupabase
      .from('products')
      .select('id')
      .eq('slug', 'assistente-ia-pro')
      .single();

    // ==========================================
    // PROCESS ACTIONS
    // ==========================================

    switch (action) {
      case 'reenviar-ativacao': {
        const { error: resetErr } = await adminSupabase.auth.resetPasswordForEmail(
          clientProfile.email,
          { redirectTo }
        );

        if (resetErr) throw resetErr;

        // Record admin log
        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'reenviar ativação',
          target_table: 'profiles',
          target_id: clientId,
          metadata: { email: clientProfile.email },
        });

        return NextResponse.json({ message: 'Link de ativação reenviado com sucesso!' });
      }

      case 'enviar-reset': {
        const { error: resetErr } = await adminSupabase.auth.resetPasswordForEmail(
          clientProfile.email,
          { redirectTo }
        );

        if (resetErr) throw resetErr;

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'enviar reset',
          target_table: 'profiles',
          target_id: clientId,
          metadata: { email: clientProfile.email },
        });

        return NextResponse.json({ message: 'Link de recuperação de senha enviado com sucesso!' });
      }

      case 'bloquear': {
        const { error: updateErr = null } = await adminSupabase
          .from('profiles')
          .update({ status: 'blocked' })
          .eq('id', clientId);

        if (updateErr) throw updateErr;

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'bloquear usuário',
          target_table: 'profiles',
          target_id: clientId,
          metadata: { previous_status: clientProfile.status },
        });

        return NextResponse.json({ message: 'Cliente bloqueado com sucesso!' });
      }

      case 'desbloquear': {
        const { error: updateErr = null } = await adminSupabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', clientId);

        if (updateErr) throw updateErr;

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'desbloquear usuário',
          target_table: 'profiles',
          target_id: clientId,
          metadata: { previous_status: clientProfile.status },
        });

        return NextResponse.json({ message: 'Cliente desbloqueado com sucesso!' });
      }

      case 'liberar-vitalicio': {
        if (!vitalicioProduct) {
          return NextResponse.json({ message: 'Produto psicoplanilhas-vitalicio não cadastrado.' }, { status: 400 });
        }

        // Check if manual purchase already exists
        const { data: existingPurchase } = await adminSupabase
          .from('purchases')
          .select('*')
          .eq('user_id', clientId)
          .eq('product_id', vitalicioProduct.id)
          .maybeSingle();

        if (existingPurchase) {
          // Reactivate existing purchase
          await adminSupabase
            .from('purchases')
            .update({ payment_status: 'manual' })
            .eq('id', existingPurchase.id);
        } else {
          // Create new manual purchase
          await adminSupabase.from('purchases').insert({
            user_id: clientId,
            product_id: vitalicioProduct.id,
            payment_status: 'manual',
            source: 'admin',
          });
        }

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'liberar acesso vitalício',
          target_table: 'purchases',
          target_id: clientId,
          metadata: { product_slug: 'psicoplanilhas-vitalicio' },
        });

        return NextResponse.json({ message: 'Acesso vitalício liberado com sucesso!' });
      }

      case 'cancelar-vitalicio': {
        if (!vitalicioProduct) {
          return NextResponse.json({ message: 'Produto psicoplanilhas-vitalicio não cadastrado.' }, { status: 400 });
        }

        // Cancel all purchases of this product for this user
        const { error: cancelErr = null } = await adminSupabase
          .from('purchases')
          .update({ payment_status: 'cancelled' })
          .eq('user_id', clientId)
          .eq('product_id', vitalicioProduct.id);

        if (cancelErr) throw cancelErr;

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'cancelar acesso vitalício',
          target_table: 'purchases',
          target_id: clientId,
          metadata: { product_slug: 'psicoplanilhas-vitalicio' },
        });

        return NextResponse.json({ message: 'Acesso vitalício cancelado com sucesso!' });
      }

      case 'ativar-pro': {
        if (!proProduct) {
          return NextResponse.json({ message: 'Produto assistente-ia-pro não cadastrado.' }, { status: 400 });
        }

        const expiresAt = metadata?.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        // Check if subscription already exists
        const { data: existingSub } = await adminSupabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', clientId)
          .eq('product_id', proProduct.id)
          .maybeSingle();

        if (existingSub) {
          await adminSupabase
            .from('subscriptions')
            .update({
              status: 'manual',
              expires_at: expiresAt,
              renewed_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);
        } else {
          await adminSupabase.from('subscriptions').insert({
            user_id: clientId,
            product_id: proProduct.id,
            plan_slug: 'assistente-ia-pro',
            status: 'manual',
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
            source: 'admin',
          });
        }

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'ativar Assistente Pro',
          target_table: 'subscriptions',
          target_id: clientId,
          metadata: { expires_at: expiresAt },
        });

        return NextResponse.json({ message: 'Assistente IA Pro ativado com sucesso!' });
      }

      case 'alterar-vencimento-pro': {
        if (!proProduct) {
          return NextResponse.json({ message: 'Produto assistente-ia-pro não cadastrado.' }, { status: 400 });
        }

        const expiresAt = metadata?.expires_at;
        if (!expiresAt) {
          return NextResponse.json({ message: 'Data de vencimento não especificada.' }, { status: 400 });
        }

        const { data: existingSub } = await adminSupabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', clientId)
          .eq('product_id', proProduct.id)
          .maybeSingle();

        if (!existingSub) {
          return NextResponse.json({ message: 'Assinatura ativa não encontrada.' }, { status: 404 });
        }

        await adminSupabase
          .from('subscriptions')
          .update({
            expires_at: expiresAt,
          })
          .eq('id', existingSub.id);

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'alterar vencimento',
          target_table: 'subscriptions',
          target_id: clientId,
          metadata: { previous_expires_at: existingSub.expires_at, new_expires_at: expiresAt },
        });

        return NextResponse.json({ message: 'Vencimento alterado com sucesso!' });
      }

      case 'cancelar-pro': {
        if (!proProduct) {
          return NextResponse.json({ message: 'Produto assistente-ia-pro não cadastrado.' }, { status: 400 });
        }

        await adminSupabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('user_id', clientId)
          .eq('product_id', proProduct.id);

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'cancelar Assistente Pro',
          target_table: 'subscriptions',
          target_id: clientId,
          metadata: { product_slug: 'assistente-ia-pro' },
        });

        return NextResponse.json({ message: 'Assistente IA Pro cancelado com sucesso!' });
      }

      default:
        return NextResponse.json({ message: `Ação '${action}' desconhecida.` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Fatal error executing admin action:', err);
    return NextResponse.json(
      { message: err.message || 'Erro ao executar a ação administrativa.' },
      { status: 500 }
    );
  }
}
