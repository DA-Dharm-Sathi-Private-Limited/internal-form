import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/zoho';
import { withError, fail } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();

  const required = ['customer_id', 'amount', 'date', 'invoice_id'];
  for (const field of required) {
    if (!body[field]) {
      return fail(`${field} is required`, 400);
    }
  }

  const result = await createPayment({
    customer_id: body.customer_id,
    payment_mode: body.payment_mode || 'others',
    amount: Number(body.amount),
    date: body.date,
    invoice_id: body.invoice_id,
    description: body.description,
    reference_number: body.reference_number,
  });

  if (result.status !== 200 && result.status !== 201) {
    console.error('Zoho Payment Recording Failed:', JSON.stringify(result.data, null, 2));
    return NextResponse.json(
      { error: result.data.message || 'Zoho API Error' },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: result.status });
});
