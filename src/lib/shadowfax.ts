export function getShadowfaxToken(): string {
  const token = process.env.SHADOWFAX_API_TOKEN;
  if (!token) {
    throw new Error('Missing SHADOWFAX_API_TOKEN in environment variables');
  }
  return token;
}

export function getBaseUrl(): string {
  const env = process.env.SHADOWFAX_ENV || 'staging';
  return env === 'production'
    ? 'https://dale.shadowfax.in/api'
    : 'https://dale.staging.shadowfax.in/api';
}

function sfHeaders() {
  return {
    Authorization: `Token ${getShadowfaxToken()}`,
    'Content-Type': 'application/json',
  };
}

export interface ShadowfaxServiceabilityResponse {
  success: boolean;
  data?: Array<{
    pincode: string;
    serviceable: boolean;
    message?: string;
  }>;
  error?: string;
}

export async function checkServiceability(pincodes: string) {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/v1/clients/serviceability/`);
  url.searchParams.append('service', 'customer_pickup');
  url.searchParams.append('pincodes', pincodes);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: sfHeaders(),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export interface ShadowfaxGenerateAWBResponse {
  success: boolean;
  awbs?: string[];
  error?: string;
}

export async function generateAWB(count: number = 1) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v3/clients/orders/generate_awb/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify({ count }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export interface ShadowfaxCreateOrderPayload {
  client_order_id: string;
  awb_number: string;
  pickup: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  warehouse: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    sku: string;
    product_name: string;
    quantity: number;
  }>;
  cod_amount?: number;
  payment_mode?: 'Prepaid' | 'COD';
}

export async function createShipment(payload: ShadowfaxCreateOrderPayload) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v1/clients/orders/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export interface ShadowfaxTrackingResponse {
  awb_number?: string;
  status?: string;
  current_location?: string;
  rider_name?: string;
  rider_contact?: string;
  error?: string;
  [key: string]: unknown;
}

export async function trackShipment(clientOrderId: string) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v4/clients/orders/${clientOrderId}/`, {
    method: 'GET',
    headers: sfHeaders(),
  });
  const data = await res.json();
  return { status: res.status, data };
}

export interface ShadowfaxCancelPayload {
  client_order_id: string;
  cancel_remarks: string;
}

export async function cancelOrder(payload: ShadowfaxCancelPayload) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v1/clients/cancel_order/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}
