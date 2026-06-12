import { getPublicSiteUrl } from '../site-url';

export type MercadoPagoPreference = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
  live_mode?: boolean;
};

/** MP genera init_point según el tipo de credencial (prueba o producción). */
export function getMercadoPagoCheckoutUrl(preference: MercadoPagoPreference): string {
  if (!preference.init_point) {
    throw new Error('Mercado Pago no devolvió URL de checkout');
  }
  return preference.init_point;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

export function getMercadoPagoFallbackLink(): string | null {
  const link = process.env.MERCADOPAGO_PAYMENT_LINK?.trim();
  if (!link) return null;
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  return `https://${link}`;
}

export function getMercadoPagoPaymentInfo() {
  const api = isMercadoPagoConfigured();
  const paymentLink = getMercadoPagoFallbackLink();
  return {
    available: api,
    mode: api ? ('api' as const) : null,
    paymentLink,
    linkOnlyFallback: !api && Boolean(paymentLink),
  };
}

export async function createMercadoPagoPreference(params: {
  orderId: number;
  title: string;
  total: number;
  payerEmail?: string;
}): Promise<MercadoPagoPreference> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'Mercado Pago no está configurado. Agrega MERCADOPAGO_ACCESS_TOKEN en .env.local'
    );
  }

  const baseUrl = getPublicSiteUrl();
  const unitPrice = Math.round(params.total * 100) / 100;
  if (unitPrice <= 0) throw new Error('El total del pedido debe ser mayor a cero');

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          id: String(params.orderId),
          title: params.title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'MXN',
        },
      ],
      external_reference: String(params.orderId),
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      back_urls: {
        success: `${baseUrl}/mis-pedidos?pago=ok&pedido=${params.orderId}`,
        failure: `${baseUrl}/mis-pedidos?pago=error&pedido=${params.orderId}`,
        pending: `${baseUrl}/mis-pedidos?pago=pendiente&pedido=${params.orderId}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'MALCRIADOS',
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    }),
  });

  const data = (await res.json()) as MercadoPagoPreference & {
    message?: string;
    error?: string;
    code?: string;
    status?: number;
  };
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        'El Access Token de Mercado Pago no es válido o no tiene permisos. En developers.mercadopago.com genera un token nuevo (Credenciales de producción) y actualízalo en Fly o .env.local.'
      );
    }
    throw new Error(data.message || data.error || 'No se pudo crear el pago en Mercado Pago');
  }

  return data;
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('Mercado Pago no configurado');

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as {
    status?: string;
    external_reference?: string;
    transaction_amount?: number;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message || 'No se pudo consultar el pago');
  }

  return data;
}

export async function findApprovedPaymentForOrder(orderId: number) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('Mercado Pago no configurado');

  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = (await res.json()) as {
    results?: Array<{ status?: string; transaction_amount?: number }>;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message || 'No se pudo buscar pagos');
  }

  return data.results?.find((p) => p.status === 'approved') ?? null;
}
