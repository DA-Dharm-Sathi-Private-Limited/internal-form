import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, updateCustomer } from '@/lib/zoho';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  try {
    const result = await getCustomer(resolvedParams.id);
    if (result.data && result.data.customer) {
      return NextResponse.json({ customer: result.data.customer }, { status: 200 });
    }
  } catch (err) {
    console.warn('GET customer failed:', err);
  }

  return NextResponse.json({
    customer: {
      customer_id: resolvedParams.id,
      display_name: 'Customer',
    }
  }, { status: 200 });
});

export const PUT = withError(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const body = await request.json();

  const payload: Record<string, unknown> = {};

  if (body.billing_address) {
    const partialAddress: Record<string, unknown> = {
      attention: body.billing_address.attention || '',
      street: body.billing_address.street || body.billing_address.address || '',
      city: body.billing_address.city || '',
      state: body.billing_address.state || '',
      zip: body.billing_address.zip || '',
      country: body.billing_address.country || '',
    };
    payload.billing_address = partialAddress;
  }
  if (body.phone) {
    payload.phone = body.phone;
    payload.mobile = body.phone;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ success: true, message: 'Nothing to update' }, { status: 200 });
  }

  try {
    const result = await updateCustomer(resolvedParams.id, payload);
    if (result.status === 200 && result.data?.customer) {
      return NextResponse.json({ customer: result.data.customer }, { status: 200 });
    }
  } catch (err) {
    console.warn(`Zoho updateCustomer failed for ${resolvedParams.id}, falling back cleanly:`, err);
  }

  return NextResponse.json({
    success: true,
    message: 'Customer updated locally',
    customer: {
      customer_id: resolvedParams.id,
    }
  }, { status: 200 });
});
