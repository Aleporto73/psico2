import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendActivationLink } from '@/utils/auth/activation';

export const runtime = 'nodejs';

const CONTRACT_VERSION = '2026-06-10';
const SUPPORTED_EVENT = 'sale.confirmed';
const TIMESTAMP_TOLERANCE_SECONDS = 300;
const SUPPORTED_ENTITLEMENTS = new Set([
  'psicoplanilhas-vitalicio',
  'assistente-ia-pro',
  'psicoplanilhas-flow',
]);
// Status terminais de sucesso: um reenvio que colida com um destes é ignorado
// como duplicado. 'user_not_found' foi REMOVIDO de propósito — comprador novo
// deixou de ser um fim de linha e passou a ser onboarded (ver POST/ensureBuyer).
const DUPLICATE_SUCCESS_STATUSES = new Set([
  'processed',
  'duplicate_ignored',
  'unsupported_entitlement',
  'unsupported_event_version',
  'out_of_scope_event',
  'invalid_payload',
]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WebhookEventStatus =
  | 'received'
  | 'processed'
  | 'duplicate_ignored'
  | 'user_not_found'
  | 'unsupported_entitlement'
  | 'unsupported_event_version'
  | 'out_of_scope_event'
  | 'invalid_payload'
  | 'failed';

type AdminClient = ReturnType<typeof createAdminClient>;

type PaymentBetaPayload = {
  event?: unknown;
  event_version?: unknown;
  delivery_id?: unknown;
  transaction_id?: unknown;
  entitlement?: {
    code?: unknown;
    expires_at?: unknown;
  } | null;
  customer?: {
    email?: unknown;
  } | null;
  payment?: {
    status?: unknown;
  } | null;
};

type EventRecord = {
  id: string;
  status: WebhookEventStatus;
  delivery_id: string;
  transaction_id: string;
  event: string;
};

type EventRegistrationInput = {
  deliveryId: string;
  transactionId: string;
  event: string;
  eventVersion: string | null;
  entitlementCode: string | null;
  customerEmail: string | null;
  paymentStatus: string | null;
  rawPayload: PaymentBetaPayload | null;
};

type EventRegistrationResult =
  | { kind: 'created'; record: EventRecord }
  | { kind: 'retry'; record: EventRecord }
  | { kind: 'duplicate'; record: EventRecord };

function jsonMessage(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ message, ...(extra ?? {}) }, { status });
}

function getRequiredHeader(request: Request, name: string): string | null {
  const value = request.headers.get(name);
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNormalizedEmail(value: unknown): string | null {
  const email = getString(value);
  if (!email) {
    return null;
  }

  return email.toLowerCase();
}

function parseTimestampSeconds(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDate(value: unknown): Date | null {
  const text = getString(value);
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidSignature(signatureHeader: string, expectedHex: string): boolean {
  const match = /^sha256=([0-9a-f]+)$/i.exec(signatureHeader.trim());
  if (!match) {
    return false;
  }

  const receivedHex = match[1].toLowerCase();
  if (receivedHex.length !== expectedHex.length || receivedHex.length % 2 !== 0) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(receivedHex, 'hex');

  if (expected.length !== received.length || expected.length === 0) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

function maxDate(first: Date, second: Date): Date {
  return first.getTime() >= second.getTime() ? first : second;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return 'Erro interno ao processar webhook PaymentBeta.';
}

async function findExistingEvent(
  supabase: AdminClient,
  deliveryId: string,
  transactionId: string,
  event: string,
): Promise<EventRecord | null> {
  const { data: byDelivery, error: byDeliveryError } = await supabase
    .from('paymentbeta_webhook_events')
    .select('id, status, delivery_id, transaction_id, event')
    .eq('delivery_id', deliveryId)
    .maybeSingle();

  if (byDeliveryError) {
    throw new Error(`Erro ao consultar delivery_id do webhook: ${byDeliveryError.message}`);
  }

  if (byDelivery) {
    return byDelivery as EventRecord;
  }

  const { data: byTransaction, error: byTransactionError } = await supabase
    .from('paymentbeta_webhook_events')
    .select('id, status, delivery_id, transaction_id, event')
    .eq('transaction_id', transactionId)
    .eq('event', event)
    .maybeSingle();

  if (byTransactionError) {
    throw new Error(`Erro ao consultar transaction_id do webhook: ${byTransactionError.message}`);
  }

  return byTransaction ? (byTransaction as EventRecord) : null;
}

type EventAudit = {
  user_id?: string;
  user_created?: boolean;
  onboarding_email_status?: string | null;
  onboarding_email_sent_at?: string | null;
};

async function markEventStatus(
  supabase: AdminClient,
  eventId: string,
  status: WebhookEventStatus,
  errorMessage?: string | null,
  audit?: EventAudit,
) {
  const { error } = await supabase
    .from('paymentbeta_webhook_events')
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
      ...(audit ?? {}),
    })
    .eq('id', eventId);

  if (error) {
    throw new Error(`Erro ao atualizar status do webhook PaymentBeta: ${error.message}`);
  }
}

async function registerEvent(
  supabase: AdminClient,
  input: EventRegistrationInput,
): Promise<EventRegistrationResult> {
  const { data, error } = await supabase
    .from('paymentbeta_webhook_events')
    .insert({
      delivery_id: input.deliveryId,
      transaction_id: input.transactionId,
      event: input.event,
      event_version: input.eventVersion,
      entitlement_code: input.entitlementCode,
      customer_email: input.customerEmail,
      payment_status: input.paymentStatus,
      raw_payload: input.rawPayload,
      status: 'received',
      error_message: null,
      processed_at: null,
    })
    .select('id, status, delivery_id, transaction_id, event')
    .single();

  if (!error && data) {
    return { kind: 'created', record: data as EventRecord };
  }

  if (error?.code !== '23505') {
    throw new Error(`Erro ao registrar webhook PaymentBeta: ${error?.message ?? 'desconhecido'}`);
  }

  const existing = await findExistingEvent(supabase, input.deliveryId, input.transactionId, input.event);
  if (!existing) {
    throw new Error('Conflito de idempotência detectado, mas o evento existente não foi localizado.');
  }

  if (DUPLICATE_SUCCESS_STATUSES.has(existing.status)) {
    return { kind: 'duplicate', record: existing };
  }

  // 'user_not_found' é reprocessável: eventos gravados pelo comportamento antigo
  // (comprador novo tratado como fim de linha) voltam ao onboarding num reenvio.
  // A idempotência do entitlement é garantida pelo upsert + constraints únicas (B1).
  if (
    existing.status === 'failed' ||
    existing.status === 'received' ||
    existing.status === 'user_not_found'
  ) {
    const { error: updateError } = await supabase
      .from('paymentbeta_webhook_events')
      .update({
        event_version: input.eventVersion,
        entitlement_code: input.entitlementCode,
        customer_email: input.customerEmail,
        payment_status: input.paymentStatus,
        raw_payload: input.rawPayload,
        status: 'received',
        error_message: null,
        processed_at: null,
      })
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Erro ao preparar retry do webhook PaymentBeta: ${updateError.message}`);
    }

    return { kind: 'retry', record: existing };
  }

  return { kind: 'duplicate', record: existing };
}

async function getProductId(supabase: AdminClient, slug: string): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao localizar produto ${slug}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Produto ${slug} não cadastrado no Psico2.`);
  }

  return data.id as string;
}

type BuyerProfile = {
  id: string;
  activation_status: string;
};

async function findProfileByEmail(
  supabase: AdminClient,
  normalizedEmail: string,
): Promise<BuyerProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, activation_status')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar profile por e-mail: ${error.message}`);
  }

  return data
    ? { id: data.id as string, activation_status: data.activation_status as string }
    : null;
}

async function findActivationStatusById(
  supabase: AdminClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('activation_status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao confirmar profile do comprador: ${error.message}`);
  }

  return data ? (data.activation_status as string) : null;
}

type ResolvedBuyer = {
  userId: string;
  userCreated: boolean;
  activationStatus: string;
};

/**
 * Garante um usuário para o comprador. Existente é reaproveitado; novo é criado
 * via auth.admin.createUser (sem senha, e-mail já validado pela compra paga).
 * A trigger on_auth_user_created cria o profile com activation_status
 * 'pending_activation'. Nunca duplica: se o auth user já existir, localiza o
 * profile; falhas transitórias são lançadas (status 'failed' + HTTP 500).
 */
async function ensureBuyer(
  supabase: AdminClient,
  normalizedEmail: string,
): Promise<ResolvedBuyer> {
  const existing = await findProfileByEmail(supabase, normalizedEmail);
  if (existing) {
    return {
      userId: existing.id,
      userCreated: false,
      activationStatus: existing.activation_status,
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
  });

  if (error) {
    // Pode ser auth user já existente (sem profile no 1º lookup): localizar,
    // nunca criar um segundo usuário nem inserir profile manualmente.
    const afterConflict = await findProfileByEmail(supabase, normalizedEmail);
    if (afterConflict) {
      return {
        userId: afterConflict.id,
        userCreated: false,
        activationStatus: afterConflict.activation_status,
      };
    }

    throw new Error(`Erro ao criar usuário do comprador: ${error.message}`);
  }

  const createdId = data.user?.id;
  if (!createdId) {
    throw new Error('Criação de usuário não retornou id do comprador.');
  }

  const activationStatus = await findActivationStatusById(supabase, createdId);
  if (!activationStatus) {
    throw new Error('Profile não confirmado após criação do comprador.');
  }

  return { userId: createdId, userCreated: true, activationStatus };
}

async function upsertLifetimePurchase(
  supabase: AdminClient,
  userId: string,
  transactionId: string,
  productId: string,
) {
  const { data: byReference, error: byReferenceError } = await supabase
    .from('purchases')
    .select('id, user_id, product_id')
    .eq('payment_reference', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byReferenceError) {
    throw new Error(`Erro ao consultar purchase por payment_reference: ${byReferenceError.message}`);
  }

  if (byReference && (byReference.user_id !== userId || byReference.product_id !== productId)) {
    throw new Error('payment_reference já está associado a outro usuário ou produto em purchases.');
  }

  const targetPurchase = byReference
    ? byReference
    : await (async () => {
        const { data, error } = await supabase
          .from('purchases')
          .select('id, user_id, product_id')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Erro ao consultar purchase por user_id + product_id: ${error.message}`);
        }

        return data;
      })();

  if (targetPurchase) {
    const { error } = await supabase
      .from('purchases')
      .update({
        payment_status: 'paid',
        payment_reference: transactionId,
        source: 'paymentbeta',
      })
      .eq('id', targetPurchase.id);

    if (error) {
      throw new Error(`Erro ao atualizar purchase vitalícia: ${error.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from('purchases').insert({
    user_id: userId,
    product_id: productId,
    payment_status: 'paid',
    payment_reference: transactionId,
    source: 'paymentbeta',
  });

  if (insertError) {
    throw new Error(`Erro ao inserir purchase vitalícia: ${insertError.message}`);
  }
}

async function upsertAssistantSubscription(
  supabase: AdminClient,
  userId: string,
  transactionId: string,
  productId: string,
  incomingExpiresAt: Date,
) {
  const { data: byReference, error: byReferenceError } = await supabase
    .from('subscriptions')
    .select('id, user_id, product_id, expires_at, renewed_at')
    .eq('payment_reference', transactionId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byReferenceError) {
    throw new Error(`Erro ao consultar subscription por payment_reference: ${byReferenceError.message}`);
  }

  if (byReference && (byReference.user_id !== userId || byReference.product_id !== productId)) {
    throw new Error('payment_reference já está associado a outro usuário ou produto em subscriptions.');
  }

  const targetSubscription = byReference
    ? byReference
    : await (async () => {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, user_id, product_id, expires_at, renewed_at')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Erro ao consultar subscription por user_id + product_id: ${error.message}`);
        }

        return data;
      })();

  if (targetSubscription) {
    const currentExpiresAt = parseIsoDate(targetSubscription.expires_at);
    const finalExpiresAt = currentExpiresAt
      ? maxDate(currentExpiresAt, incomingExpiresAt)
      : incomingExpiresAt;
    const shouldMarkRenewed =
      !currentExpiresAt || finalExpiresAt.getTime() > currentExpiresAt.getTime();

    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_slug: 'assistente-ia-pro',
        status: 'active',
        source: 'paymentbeta',
        payment_reference: transactionId,
        expires_at: finalExpiresAt.toISOString(),
        renewed_at: shouldMarkRenewed ? new Date().toISOString() : targetSubscription.renewed_at,
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetSubscription.id);

    if (error) {
      throw new Error(`Erro ao atualizar assinatura do Assistente IA Pro: ${error.message}`);
    }

    return;
  }

  const nowIso = new Date().toISOString();
  const { error: insertError } = await supabase.from('subscriptions').insert({
    user_id: userId,
    product_id: productId,
    plan_slug: 'assistente-ia-pro',
    status: 'active',
    started_at: nowIso,
    expires_at: incomingExpiresAt.toISOString(),
    payment_reference: transactionId,
    source: 'paymentbeta',
  });

  if (insertError) {
    throw new Error(`Erro ao inserir assinatura do Assistente IA Pro: ${insertError.message}`);
  }
}

async function finalizeInvalidPayload(
  supabase: AdminClient,
  eventId: string,
  message: string,
  status = 400,
) {
  await markEventStatus(supabase, eventId, 'invalid_payload', message);
  return jsonMessage(message, status, { status: 'invalid_payload' });
}

export async function POST(request: Request) {
  const secret = process.env.PAYMENTBETA_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return jsonMessage('Webhook não autorizado.', 401);
  }

  const headerEvent = getRequiredHeader(request, 'X-PaymentBeta-Event');
  const headerDeliveryId = getRequiredHeader(request, 'X-PaymentBeta-Delivery');
  const headerTimestamp = getRequiredHeader(request, 'X-PaymentBeta-Timestamp');
  const signatureHeader = getRequiredHeader(request, 'X-PaymentBeta-Signature');
  const headerVersion = getRequiredHeader(request, 'X-PaymentBeta-Version');

  if (!headerEvent || !headerDeliveryId || !headerTimestamp || !signatureHeader || !headerVersion) {
    return jsonMessage('Headers obrigatórios do PaymentBeta ausentes.', 400);
  }

  const timestampSeconds = parseTimestampSeconds(headerTimestamp);
  if (timestampSeconds === null) {
    return jsonMessage('Timestamp do PaymentBeta inválido.', 400);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > TIMESTAMP_TOLERANCE_SECONDS) {
    return jsonMessage('Timestamp do PaymentBeta fora da janela de tolerância.', 408);
  }

  const rawBody = await request.text();
  const expectedHex = createHmac('sha256', secret)
    .update(`${headerTimestamp}.${headerDeliveryId}.${rawBody}`)
    .digest('hex');

  if (!isValidSignature(signatureHeader, expectedHex)) {
    return jsonMessage('Webhook não autorizado.', 401);
  }

  let payload: PaymentBetaPayload;
  try {
    payload = JSON.parse(rawBody) as PaymentBetaPayload;
  } catch {
    return jsonMessage('Payload JSON inválido.', 400);
  }

  const event = getString(payload.event) ?? headerEvent;
  const eventVersion = getString(payload.event_version);
  const deliveryId = getString(payload.delivery_id);
  const transactionId = getString(payload.transaction_id);
  const entitlementCode = getString(payload.entitlement?.code);
  const customerEmail = getNormalizedEmail(payload.customer?.email);
  const paymentStatus = getString(payload.payment?.status);

  if (!deliveryId || !transactionId) {
    return jsonMessage('delivery_id e transaction_id são obrigatórios.', 400);
  }

  const supabase = createAdminClient();
  let eventRecord: EventRecord | null = null;

  try {
    const registration = await registerEvent(supabase, {
      deliveryId,
      transactionId,
      event,
      eventVersion: eventVersion ?? headerVersion,
      entitlementCode,
      customerEmail,
      paymentStatus,
      rawPayload: payload,
    });

    eventRecord = registration.record;

    if (registration.kind === 'duplicate') {
      return jsonMessage('Evento duplicado ignorado.', 200, {
        status: 'duplicate_ignored',
        previous_status: registration.record.status,
      });
    }

    if (!getString(payload.event)) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'Payload sem event.');
    }

    if (!eventVersion) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'Payload sem event_version.');
    }

    if (!entitlementCode) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'Payload sem entitlement.code.');
    }

    if (!customerEmail || !EMAIL_REGEX.test(customerEmail)) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'Payload sem customer.email válido.');
    }

    if (!paymentStatus) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'Payload sem payment.status.');
    }

    if (deliveryId !== headerDeliveryId) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'delivery_id do payload difere do header assinado.');
    }

    if (event !== headerEvent) {
      return await finalizeInvalidPayload(supabase, eventRecord.id, 'event do payload difere do header assinado.');
    }

    if (headerVersion !== CONTRACT_VERSION || eventVersion !== CONTRACT_VERSION) {
      await markEventStatus(
        supabase,
        eventRecord.id,
        'unsupported_event_version',
        'Versão de contrato do PaymentBeta fora do escopo suportado.',
      );

      return jsonMessage('Versão de evento fora do escopo suportado.', 200, {
        status: 'unsupported_event_version',
      });
    }

    if (event !== SUPPORTED_EVENT) {
      await markEventStatus(
        supabase,
        eventRecord.id,
        'out_of_scope_event',
        'Evento assinado corretamente, mas fora do escopo atual.',
      );

      return jsonMessage('Evento fora do escopo atual.', 200, {
        status: 'out_of_scope_event',
      });
    }

    if (!SUPPORTED_ENTITLEMENTS.has(entitlementCode)) {
      await markEventStatus(
        supabase,
        eventRecord.id,
        'unsupported_entitlement',
        'Entitlement assinado corretamente, mas não suportado pelo Psico2.',
      );

      return jsonMessage('Entitlement fora do escopo suportado.', 200, {
        status: 'unsupported_entitlement',
      });
    }

    // Valida o payload específico do entitlement ANTES de qualquer efeito
    // colateral (não cria usuário se o payload do assistente for inválido).
    let assistantExpiresAt: Date | null = null;
    if (entitlementCode === 'assistente-ia-pro') {
      assistantExpiresAt = parseIsoDate(payload.entitlement?.expires_at);
      if (!assistantExpiresAt) {
        return await finalizeInvalidPayload(
          supabase,
          eventRecord.id,
          'assistente-ia-pro exige entitlement.expires_at válido.',
        );
      }
    }

    // Comprador novo é onboarded (criado + ativação); existente é reaproveitado.
    // Falhas aqui propagam para o catch -> status 'failed' (HTTP 500, retryável).
    const buyer = await ensureBuyer(supabase, customerEmail);

    // Vitalício e Flow são ambos one_time -> gravam em purchases via
    // upsertLifetimePurchase. Flow NUNCA usa subscriptions. Falha em
    // getProductId/upsert propaga ao catch (status 'failed' + HTTP 500):
    // 'processed' só é marcado abaixo se o acesso for realmente gravado.
    if (
      entitlementCode === 'psicoplanilhas-vitalicio' ||
      entitlementCode === 'psicoplanilhas-flow'
    ) {
      const productId = await getProductId(supabase, entitlementCode);
      await upsertLifetimePurchase(supabase, buyer.userId, transactionId, productId);
    } else if (assistantExpiresAt) {
      const productId = await getProductId(supabase, entitlementCode);
      await upsertAssistantSubscription(
        supabase,
        buyer.userId,
        transactionId,
        productId,
        assistantExpiresAt,
      );
    }

    // Gating de e-mail: só dispara para usuário recém-criado OU ainda pendente
    // de ativação. Não reenvia para quem já ativou (activation_status != pending).
    const shouldSendActivation =
      buyer.userCreated || buyer.activationStatus === 'pending_activation';
    let onboardingEmailStatus = 'skipped_already_active';
    let onboardingEmailSentAt: string | null = null;

    if (shouldSendActivation) {
      const origin = new URL(request.url).origin;
      await sendActivationLink(supabase, customerEmail, origin);
      onboardingEmailStatus = 'sent';
      onboardingEmailSentAt = new Date().toISOString();
    }

    await markEventStatus(supabase, eventRecord.id, 'processed', null, {
      user_id: buyer.userId,
      user_created: buyer.userCreated,
      onboarding_email_status: onboardingEmailStatus,
      onboarding_email_sent_at: onboardingEmailSentAt,
    });

    return jsonMessage('Webhook PaymentBeta processado com sucesso.', 200, {
      status: 'processed',
    });
  } catch (error) {
    if (eventRecord?.id) {
      try {
        await markEventStatus(supabase, eventRecord.id, 'failed', safeErrorMessage(error));
      } catch (markError) {
        console.error('Erro ao marcar falha do webhook PaymentBeta:', markError);
      }
    }

    console.error('Erro ao processar webhook PaymentBeta:', error);
    return jsonMessage('Erro interno ao processar webhook PaymentBeta.', 500);
  }
}
