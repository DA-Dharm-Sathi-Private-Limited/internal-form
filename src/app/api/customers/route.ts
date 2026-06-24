import { NextRequest, NextResponse } from 'next/server';
import { searchCustomers, createCustomer } from '@/lib/zoho';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';

  if (q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const result = await searchCustomers(q);
  const customers = result.data?.customers || [];

  return NextResponse.json({ customers }, { status: 200 });
});

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.display_name) {
    return fail('display_name is required', 400);
  }

  const payload: Record<string, unknown> = {
    display_name: body.display_name,
  };

  if (body.email) payload.email = body.email;
  if (body.company_name) payload.company_name = body.company_name;
  if (body.gst_no) payload.gst_no = body.gst_no;
  if (body.gst_treatment) payload.gst_treatment = body.gst_treatment;
  if (body.place_of_contact) payload.place_of_contact = body.place_of_contact;
  if (body.billing_address) {
    payload.billing_address = {
      ...body.billing_address,
      street: body.billing_address.street || body.billing_address.address || '',
      attention: body.billing_address.attention || body.display_name || '',
    };
  }

  if (body.phone) {
    payload.phone = body.phone;
    payload.mobile = body.phone;
  }

  const result = await createCustomer(payload);

  return NextResponse.json(result.data, { status: result.status });
});
