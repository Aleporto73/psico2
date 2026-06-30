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

    const destructiveActions = ['bloquear', 'cancelar-vitalicio', 'cancelar-pro', 'cancelar-flow'];

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

    // maybeSingle (não single): se a migration do Flow não estiver aplicada neste
    // ambiente, flowProduct fica null e os cases liberar/cancelar-flow respondem 400
    // limpo, em vez de derrubar TODAS as ações desta rota com erro de "no rows".
    const { data: flowProduct } = await adminSupabase
      .from('products')
      .select('id')
      .eq('slug', 'psicoplanilhas-flow')
      .maybeSingle();

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

        // Só cria/reativa se ainda não houver acesso ativo (paid OU manual).
        // limit(1)+maybeSingle evita erro PGRST116 em linhas duplicadas: purchases
        // não tem unique por (user_id, product_id).
        const { data: activeVitalicio } = await adminSupabase
          .from('purchases')
          .select('id')
          .eq('user_id', clientId)
          .eq('product_id', vitalicioProduct.id)
          .in('payment_status', ['paid', 'manual'])
          .limit(1)
          .maybeSingle();

        if (!activeVitalicio) {
          // Reativa compra anterior cancelada/estornada, se existir; senão cria nova manual.
          const { data: inactiveVitalicio } = await adminSupabase
            .from('purchases')
            .select('id')
            .eq('user_id', clientId)
            .eq('product_id', vitalicioProduct.id)
            .limit(1)
            .maybeSingle();

          if (inactiveVitalicio) {
            const { error: reactErr } = await adminSupabase
              .from('purchases')
              .update({ payment_status: 'manual' })
              .eq('id', inactiveVitalicio.id);
            if (reactErr) throw new Error(`Erro ao reativar acesso vitalício: ${reactErr.message}`);
          } else {
            const { error: insErr } = await adminSupabase.from('purchases').insert({
              user_id: clientId,
              product_id: vitalicioProduct.id,
              payment_status: 'manual',
              source: 'admin',
            });
            if (insErr) throw new Error(`Erro ao liberar acesso vitalício: ${insErr.message}`);
          }
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

        // Only cancel manual purchases — paid purchases must follow the official refund flow
        const { error: cancelErr = null } = await adminSupabase
          .from('purchases')
          .update({ payment_status: 'cancelled' })
          .eq('user_id', clientId)
          .eq('product_id', vitalicioProduct.id)
          .eq('payment_status', 'manual');

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

      case 'liberar-flow': {
        if (!flowProduct) {
          return NextResponse.json({ message: 'Produto psicoplanilhas-flow não cadastrado.' }, { status: 400 });
        }

        // Só cria/reativa se ainda não houver acesso ativo (paid OU manual).
        // limit(1)+maybeSingle evita erro de múltiplas linhas: purchases não tem
        // unique por (user_id, product_id), e o webhook futuro também grava aqui.
        const { data: activeFlow } = await adminSupabase
          .from('purchases')
          .select('id')
          .eq('user_id', clientId)
          .eq('product_id', flowProduct.id)
          .in('payment_status', ['paid', 'manual'])
          .limit(1)
          .maybeSingle();

        if (!activeFlow) {
          // Reativa uma compra anterior cancelada/estornada, se existir; senão cria nova manual.
          const { data: inactiveFlow } = await adminSupabase
            .from('purchases')
            .select('id')
            .eq('user_id', clientId)
            .eq('product_id', flowProduct.id)
            .limit(1)
            .maybeSingle();

          if (inactiveFlow) {
            const { error: reactErr } = await adminSupabase
              .from('purchases')
              .update({ payment_status: 'manual' })
              .eq('id', inactiveFlow.id);
            if (reactErr) throw new Error(`Erro ao reativar acesso Flow: ${reactErr.message}`);
          } else {
            const { error: insErr } = await adminSupabase.from('purchases').insert({
              user_id: clientId,
              product_id: flowProduct.id,
              payment_status: 'manual',
              source: 'admin',
            });
            if (insErr) throw new Error(`Erro ao liberar acesso Flow: ${insErr.message}`);
          }
        }

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'liberar acesso flow',
          target_table: 'purchases',
          target_id: clientId,
          metadata: { product_slug: 'psicoplanilhas-flow' },
        });

        return NextResponse.json({ message: 'Acesso ao PsicoPlanilhas Flow liberado com sucesso!' });
      }

      case 'cancelar-flow': {
        if (!flowProduct) {
          return NextResponse.json({ message: 'Produto psicoplanilhas-flow não cadastrado.' }, { status: 400 });
        }

        // PROTEÇÃO: cancela APENAS acesso manual. O filtro .eq('payment_status','manual')
        // garante que compras pagas ('paid') NÃO são tocadas — elas devem seguir o
        // fluxo de pagamento/estorno oficial, nunca cancelamento administrativo manual.
        const { error: cancelErr = null } = await adminSupabase
          .from('purchases')
          .update({ payment_status: 'cancelled' })
          .eq('user_id', clientId)
          .eq('product_id', flowProduct.id)
          .eq('payment_status', 'manual');

        if (cancelErr) throw new Error(`Erro ao cancelar acesso Flow: ${cancelErr.message}`);

        await adminSupabase.from('admin_logs').insert({
          admin_id: adminUser?.id,
          action: 'cancelar acesso flow',
          target_table: 'purchases',
          target_id: clientId,
          metadata: { product_slug: 'psicoplanilhas-flow' },
        });

        return NextResponse.json({ message: 'Acesso manual ao PsicoPlanilhas Flow cancelado com sucesso!' });
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
              status: 'active',
              expires_at: expiresAt,
              renewed_at: new Date().toISOString(),
              source: 'admin',
            })
            .eq('id', existingSub.id);
        } else {
          await adminSupabase.from('subscriptions').insert({
            user_id: clientId,
            product_id: proProduct.id,
            plan_slug: 'assistente-ia-pro',
            status: 'active',
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
        return NextResponse.json({ message: 'Ação administrativa desconhecida.' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Fatal error executing admin action:', err);
    return NextResponse.json(
      { message: 'Erro ao executar a ação administrativa. Tente novamente.' },
      { status: 500 }
    );
  }
}
