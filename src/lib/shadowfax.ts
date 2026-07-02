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
    "Accept": "application/json",
  };
}

// ──────────────────────────────────────────────
// Serviceability
// ──────────────────────────────────────────────

export interface ServiceabilityParams {
  service: 'seller_pickup' | 'customer_delivery' | 'customer_pickup' | 'seller_delivery' | 'warehouse_pickup' | 'warehouse_return';
  page?: number;
  count?: number;
  pincodes?: string;
}

export async function checkServiceability(params: ServiceabilityParams) {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}/v1/clients/serviceability/`);
  url.searchParams.append('service', params.service);
  if (params.page) url.searchParams.append('page', String(params.page));
  if (params.count) url.searchParams.append('count', String(params.count));
  if (params.pincodes) url.searchParams.append('pincodes', params.pincodes);

  const res = await fetch(url.toString(), { method: 'GET', headers: sfHeaders() });
  const data = await res.json();
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// AWB Generation
// ──────────────────────────────────────────────

export async function generateAWB(count: number = 1) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v3/clients/orders/generate_awb/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify({ count }),
  });
  
  const data = await res.json();

  console.log("responce",data)
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// Create Delivery Request (Warehouse Forward)
// Endpoint: POST /v3/clients/orders/
// ──────────────────────────────────────────────

export interface ShadowfaxCreateDeliveryPayload {
  order_type: 'warehouse';
  order_details: {
    client_order_id: string;
    awb_number?: string;
    actual_weight?: number;
    volumetric_weight?: number;
    product_value: number;
    payment_mode: 'Prepaid' | 'COD';
    cod_amount: number | string;
    promised_delivery_date?: string;
    total_amount?: number;
    eway_bill?: string;
    gstin_number?: string;
    order_service?: string;
  };
  customer_details: {
    name: string;
    contact: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    pincode: number;
    alternate_contact?: string;
    latitude?: string;
    longitude?: string;
    location_type?: string;
  };
  pickup_details: {
    name: string;
    contact: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    pincode: number;
    latitude?: string;
    longitude?: string;
    unique_code?: string;
  };
  rto_details: {
    name: string;
    contact: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    pincode: number;
    unique_code?: string;
  };
  product_details: Array<{
    client_sku_id?: string;
    hsn_code?: string;
    invoice_no?: string;
    sku_name: string;
    sku_id?: string;
    category?: string;
    price: number;
    seller_details?: {
      seller_name?: string;
      seller_address?: string;
      seller_state?: string;
      gstin_number?: string;
    };
    taxes?: {
      cgst?: number;
      sgst?: number;
      igst?: number;
      total_tax?: number;
    };
    additional_details?: {
      requires_extra_care?: string;
      type_extra_care?: string;
      quantity?: number;
    };
  }>;
}

export async function createShipment(payload: ShadowfaxCreateDeliveryPayload) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v3/clients/orders/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// Track Single Order (by AWB)
// ──────────────────────────────────────────────

export async function trackShipment(awbNumber: string) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v4/clients/orders/${awbNumber}/track/`, {
    method: 'GET',
    headers: sfHeaders(),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// Track Multiple Orders (up to 50 AWBs)
// ──────────────────────────────────────────────

export async function trackMultipleShipments(awbNumbers: string[]) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v4/clients/bulk_track/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify({ awb_numbers: awbNumbers }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// Cancel Order
// ──────────────────────────────────────────────

export interface ShadowfaxCancelPayload {
  request_id: string;
  cancel_remarks: string;
}

export async function cancelOrder(payload: ShadowfaxCancelPayload) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v3/clients/orders/cancel/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ──────────────────────────────────────────────
// Update Order Details
// ──────────────────────────────────────────────

export interface ShadowfaxUpdateOrderPayload {
  awb_number: string;
  delivery_details?: {
    contact?: string;
    latitude?: string;
    longitude?: string;
    alternate_contact?: string;
    customer_address?: string;
    pincode?: number;
  };
  pickup_details?: {
    contact?: string;
    alternate_contact?: string;
    latitude?: string | null;
    longitude?: string | null;
    customer_address?: string;
    pincode?: string;
  };
  return_details?: {
    contact?: string;
    latitude?: string;
    longitude?: string;
    email?: string;
    capture_delivery_image?: boolean;
    return_address?: string;
    pincode?: string;
  };
  order_details?: {
    cod_amount?: number;
    eway_bill_number?: string;
    invoice_number?: string;
    return_eway_bill_number?: string;
    actual_weight?: string;
    volumetric_weight?: string;
  };
  status_update?: {
    status?: string | null;
  };
}

export async function updateOrder(payload: ShadowfaxUpdateOrderPayload) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/v3/clients/order_update/`, {
    method: 'POST',
    headers: sfHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}
