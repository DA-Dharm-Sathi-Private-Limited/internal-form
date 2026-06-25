import { NextRequest } from 'next/server';
import { cancelOrder } from '@/lib/shadowfax';
import { withError, success, fail } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.client_order_id) {
    return fail('Missing client_order_id', 400);
  }
  if (!body.cancel_remarks) {
    return fail('Missing cancel_remarks', 400);
  }

  const { status, data } = await cancelOrder(body);
  if (status !== 200) {
    return fail(data?.error || 'Shadowfax cancellation failed', status);
  }

  return success({ data });
});
