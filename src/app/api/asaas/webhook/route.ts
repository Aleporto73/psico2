/**
 * /api/asaas/webhook/route.ts
 * Webhook público para receber notificações de pagamentos do Asaas.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  let body: any;

  try {
    // 1. Validar Token do Webhook
    const incomingToken = request.headers.get('asaas-access-token');
    const systemToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!systemToken || incomingToken !== systemToken) {
      console.warn('Tentativa de acesso ao webhook com token inválido ou ausente.');
      return NextResponse.json({ message: 'Não autorizado.' }, { status: 401 });
    }

    // 2. Obter corpo da requisição
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Payload inválido.' }, { status: 400 });
    }

    const eventId = body.id || `evt_${body.payment?.id || 'unknown'}_${body.event || Date.now()}`;
    const eventType = body.event;
    const payment = body.payment;
    const paymentId = payment?.id;
    const externalReference = payment?.externalReference || '';

    if (!paymentId || !eventType) {
      return NextResponse.json({ message: 'Dados de pagamento ausentes no payload.' }, { status: 400 });
    }

    // Extrair informações do externalReference (slug|email)
    let productSlug = '';
    let userEmail = '';

    if (externalReference && externalReference.includes('|')) {
      const parts = externalReference.split('|');
      productSlug = parts[0]?.trim();
      userEmail = parts[1]?.trim().toLowerCase();
    }

    // Se o externalReference for inválido, registramos o evento mas não processamos lógica de negócio
    if (!productSlug || !userEmail) {
      console.info(`Webhook recebido sem referência válida: externalReference="${externalReference}". Gravando evento.`);
      
      // Inserir em payment_events como processado para evitar retentativas infrutíferas
      await supabase.from('payment_events').insert({
        event_id: eventId,
        payment_id: paymentId,
        event_type: eventType,
        payload: body,
        processed: true,
        error_message: 'Referência externa inválida ou ausente.',
      });

      return NextResponse.json({ message: 'Evento registrado (sem referência de produto/usuário).' }, { status: 200 });
    }

    // 3. Idempotência: Verificar se o evento já foi processado
    const { data: existingEvent, error: findEventErr } = await supabase
      .from('payment_events')
      .select('id, processed')
      .eq('payment_id', paymentId)
      .eq('event_type', eventType)
      .maybeSingle();

    if (findEventErr) {
      console.error('Erro ao verificar idempotência do evento:', findEventErr);
      return NextResponse.json({ message: 'Erro interno ao verificar evento.' }, { status: 500 });
    }

    if (existingEvent?.processed) {
      return NextResponse.json({ message: 'Evento já processado (idempotente).' }, { status: 200 });
    }

    // Se o evento não estiver no banco, inserimos com processed = false
    let eventDbId = '';
    if (!existingEvent) {
      const { data: newEvent, error: insertEventErr } = await supabase
        .from('payment_events')
        .insert({
          event_id: eventId,
          payment_id: paymentId,
          event_type: eventType,
          product_slug: productSlug,
          user_email: userEmail,
          payload: body,
          processed: false,
        })
        .select('id')
        .single();

      if (insertEventErr) {
        // Se der erro de chave duplicada (código PostgreSQL 23505), outro processo inseriu ao mesmo tempo
        if (insertEventErr.code === '23505') {
          const { data: reCheckEvent } = await supabase
            .from('payment_events')
            .select('processed')
            .eq('payment_id', paymentId)
            .eq('event_type', eventType)
            .maybeSingle();

          if (reCheckEvent?.processed) {
            return NextResponse.json({ message: 'Evento já processado (idempotente concurrent).' }, { status: 200 });
          }
        } else {
          console.error('Erro ao registrar evento de pagamento:', insertEventErr);
          return NextResponse.json({ message: 'Erro ao registrar evento no banco.' }, { status: 500 });
        }
      } else {
        eventDbId = newEvent.id;
      }
    } else {
      eventDbId = existingEvent.id;
    }

    // 4. Executar a lógica com base no tipo de evento
    let businessError: string | null = null;

    try {
      if (eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED') {
        // --- LIBERAÇÃO DE ACESSO ---
        
        // A. Obter ou Criar Usuário/Profile
        let profileId = '';
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (existingProfile) {
          profileId = existingProfile.id;
        } else {
          // Criar usuário via Supabase Auth Admin
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: userEmail,
            email_confirm: true,
            user_metadata: {
              name: payment.customerName || '',
              source: 'asaas',
            },
          });

          if (authError) {
            // Cenário de desync: usuário existe em auth.users mas não em profiles.
            // Esse caminho é raro e só ocorre se o trigger handle_new_user falhou anteriormente.
            if (authError.message.includes('already exists') || authError.status === 422) {
              // Busca paginada para não carregar todos os usuários em memória.
              // Percorre no máximo 5 páginas (5.000 usuários) para localizar o e-mail.
              let matchedUserId = '';
              let page = 1;
              const perPage = 1000;
              outerSearch:
              while (page <= 5) {
                const { data: userList } = await supabase.auth.admin.listUsers({ page, perPage });
                const users = userList?.users ?? [];
                for (const u of users) {
                  if (u.email?.toLowerCase() === userEmail) {
                    matchedUserId = u.id;
                    break outerSearch;
                  }
                }
                if (users.length < perPage) break; // última página
                page++;
              }

              if (!matchedUserId) {
                throw new Error(`Usuário reportado como existente em auth mas não localizado por e-mail: ${authError.message}`);
              }

              profileId = matchedUserId;

              // Garantir profile (desync: criar apenas se ausente, sem sobrescrever dados existentes)
              const { data: checkProf } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', profileId)
                .maybeSingle();

              if (!checkProf) {
                await supabase.from('profiles').insert({
                  id: profileId,
                  name: payment.customerName || '',
                  email: userEmail,
                  role: 'customer',
                  profile_type: 'unknown',
                  status: 'active',
                  activation_status: 'pending_activation',
                  source: 'asaas',
                });
              }
            } else {
              throw new Error(`Erro ao criar usuário Auth: ${authError.message}`);
            }
          } else if (authUser?.user) {
            profileId = authUser.user.id;

            // Esperar o trigger ou criar profile fallback se demorar
            let checkRetry = 0;
            let foundProfile = false;
            while (checkRetry < 5) {
              const { data: p } = await supabase.from('profiles').select('id').eq('id', profileId).maybeSingle();
              if (p) {
                foundProfile = true;
                break;
              }
              await new Promise(r => setTimeout(r, 100));
              checkRetry++;
            }

            if (!foundProfile) {
              await supabase.from('profiles').insert({
                id: profileId,
                name: payment.customerName || '',
                email: userEmail,
                role: 'customer',
                profile_type: 'unknown',
                status: 'active',
                activation_status: 'pending_activation',
                source: 'asaas',
              });
            }
          } else {
            throw new Error('Nenhum dado retornado da criação de usuário Auth.');
          }
        }

        // B. Aplicar Liberação Conforme o Produto
        if (productSlug === 'psicoplanilhas-vitalicio') {
          // Obter ID do produto Vitalício
          const { data: prod } = await supabase.from('products').select('id').eq('slug', productSlug).maybeSingle();
          if (!prod) throw new Error(`Produto ${productSlug} não cadastrado no banco.`);

          // Verificar se já existe a compra gravada para evitar duplicidade
          const { data: checkPurchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', profileId)
            .eq('product_id', prod.id)
            .eq('payment_reference', paymentId)
            .maybeSingle();

          if (!checkPurchase) {
            const { error: purError } = await supabase.from('purchases').insert({
              user_id: profileId,
              product_id: prod.id,
              payment_status: 'paid',
              payment_reference: paymentId,
              source: 'asaas',
            });
            if (purError) throw new Error(`Erro ao gravar compra: ${purError.message}`);
          }
        } else if (productSlug === 'assistente-ia-pro') {
          // Obter ID do produto Assistente IA Pro
          const { data: prod } = await supabase.from('products').select('id').eq('slug', productSlug).maybeSingle();
          if (!prod) throw new Error(`Produto ${productSlug} não cadastrado no banco.`);

          // Definir vigência de 1 ano
          const startedAt = new Date();
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);

          // Verificar se já existe a assinatura gravada para este pagamento
          const { data: checkSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', profileId)
            .eq('product_id', prod.id)
            .eq('payment_reference', paymentId)
            .maybeSingle();

          if (!checkSub) {
            const { error: subError } = await supabase.from('subscriptions').insert({
              user_id: profileId,
              product_id: prod.id,
              plan_slug: 'assistente-ia-pro',
              status: 'active',
              started_at: startedAt.toISOString(),
              expires_at: expiresAt.toISOString(),
              payment_reference: paymentId,
              source: 'asaas',
            });
            if (subError) throw new Error(`Erro ao gravar assinatura: ${subError.message}`);
          } else {
            // Se já existe, garante status active e vigência
            await supabase
              .from('subscriptions')
              .update({ status: 'active', expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() })
              .eq('id', checkSub.id);
          }
        }

      } else if (eventType === 'PAYMENT_REFUNDED' || eventType === 'PAYMENT_DELETED') {
        // --- REVOGAÇÃO DE ACESSO (SOFT UPDATE) ---
        
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', userEmail).maybeSingle();
        if (profile) {
          if (productSlug === 'psicoplanilhas-vitalicio') {
            const statusToSet = eventType === 'PAYMENT_REFUNDED' ? 'refunded' : 'cancelled';
            const { error: purUpdateErr } = await supabase
              .from('purchases')
              .update({ payment_status: statusToSet })
              .eq('user_id', profile.id)
              .eq('payment_reference', paymentId);
            
            if (purUpdateErr) throw new Error(`Erro ao atualizar compra Vitalício: ${purUpdateErr.message}`);
          } else if (productSlug === 'assistente-ia-pro') {
            const { error: subUpdateErr } = await supabase
              .from('subscriptions')
              .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', profile.id)
              .eq('payment_reference', paymentId);
            
            if (subUpdateErr) throw new Error(`Erro ao cancelar assinatura Pro: ${subUpdateErr.message}`);
          }
        }

      } else if (eventType === 'PAYMENT_OVERDUE') {
        // --- NOTIFICAÇÃO DE ATRASO ---
        // Registrar log. Não bloqueamos o acesso se a assinatura ainda estiver dentro de expires_at
        console.info(`Cobrança atrasada no Asaas. PaymentID: ${paymentId}, Email: ${userEmail}, Produto: ${productSlug}`);
      }

      // Auditoria de pagamento registrada exclusivamente em payment_events.
      // Não usamos admin_logs para webhooks pois o webhook não opera com admin_id
      // e a tabela payment_events já provê log completo com payload, evento e status.

    } catch (bErr: any) {
      businessError = bErr.message || 'Erro durante processamento da regra de negócio';
      console.error('Erro de negócio ao processar webhook Asaas:', businessError);
    }

    // 5. Atualizar payment_events com status de processamento
    if (eventDbId) {
      await supabase
        .from('payment_events')
        .update({
          processed: !businessError,
          error_message: businessError || null,
        })
        .eq('id', eventDbId);
    }

    if (businessError) {
      // Retorna 500 para o Asaas tentar reenviar se for um erro de processo do nosso lado
      return NextResponse.json({ message: businessError }, { status: 500 });
    }

    return NextResponse.json({ message: 'Webhook processado com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro geral não tratado no webhook Asaas:', error);
    return NextResponse.json({ message: 'Erro interno do servidor.' }, { status: 500 });
  }
}
