/**
 * /api/asaas/create-checkout/route.ts
 * Endpoint para gerar o link de pagamento do Asaas para compras ou assinaturas.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_slug, email, name } = body;

    // 1. Validações básicas
    if (!product_slug || !email || !name) {
      return NextResponse.json(
        { message: 'Campos obrigatórios ausentes: product_slug, email, name.' },
        { status: 400 }
      );
    }

    if (product_slug !== 'psicoplanilhas-vitalicio' && product_slug !== 'assistente-ia-pro') {
      return NextResponse.json(
        { message: 'Slug de produto inválido ou não suportado nesta integração.' },
        { status: 400 }
      );
    }

    const emailTrim = email.trim().toLowerCase();
    const nameTrim = name.trim();

    // 2. Buscar informações do produto no banco de dados para garantir preço e existência
    const supabase = createAdminClient();
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .eq('slug', product_slug)
      .eq('is_active', true)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { message: 'Produto não encontrado ou inativo.' },
        { status: 404 }
      );
    }

    // 3. Obter configurações do Asaas das variáveis de ambiente
    const apiKey = process.env.ASAAS_API_KEY;
    const baseUrl = process.env.ASAAS_BASE_URL;

    if (!apiKey || !baseUrl) {
      console.error('Configuração do Asaas ausente no servidor.');
      return NextResponse.json(
        { message: 'Erro de configuração do gateway de pagamento.' },
        { status: 500 }
      );
    }

    // 4. Buscar cliente existente na Asaas pelo e-mail
    let customerId = '';
    const customersUrl = `${baseUrl}/customers?email=${encodeURIComponent(emailTrim)}`;
    
    const customersRes = await fetch(customersUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
    });

    if (customersRes.ok) {
      const customersData = await customersRes.json();
      if (customersData.data && customersData.data.length > 0) {
        customerId = customersData.data[0].id;
      }
    }

    // 5. Se cliente não existe, criar no Asaas
    if (!customerId) {
      const createCustomerRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey,
        },
        body: JSON.stringify({
          name: nameTrim,
          email: emailTrim,
          notificationDisabled: true,
        }),
      });

      if (!createCustomerRes.ok) {
        const errText = await createCustomerRes.text();
        console.error('Erro ao criar cliente no Asaas:', errText);
        return NextResponse.json(
          { message: 'Falha ao registrar cliente no gateway de pagamento.' },
          { status: 502 }
        );
      }

      const createdCustomer = await createCustomerRes.json();
      customerId = createdCustomer.id;
    }

    // 6. Criar cobrança no Asaas
    // Vencimento em 3 dias
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const externalReference = `${product_slug}|${emailTrim}`;

    const paymentPayload = {
      customer: customerId,
      billingType: 'UNDEFINED', // Permite PIX, Boleto e Cartão de Crédito
      value: product.price,
      dueDate,
      description: product.name,
      externalReference,
    };

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentRes.ok) {
      const errText = await paymentRes.text();
      console.error('Erro ao criar pagamento no Asaas:', errText);
      return NextResponse.json(
        { message: 'Falha ao gerar link de pagamento.' },
        { status: 502 }
      );
    }

    const paymentData = await paymentRes.json();

    // Retorna a URL da fatura (checkout)
    return NextResponse.json({
      checkoutUrl: paymentData.invoiceUrl,
      paymentId: paymentData.id,
    });
  } catch (error: any) {
    console.error('Erro inesperado no create-checkout:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
