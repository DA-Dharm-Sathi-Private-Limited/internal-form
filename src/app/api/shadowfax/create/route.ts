import { NextRequest } from 'next/server';
import { createShipment } from '@/lib/shadowfax';
import { withError, success, fail } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.client_order_id) {
    return fail('Missing client_order_id', 400);
  }
  if (!body.awb_number) {
    return fail('Missing awb_number', 400);
  }
  if (!body.pickup || !body.warehouse) {
    return fail('Missing pickup or warehouse details', 400);
  }

  const { status, data } = await createShipment(body);
  if (status !== 200 && status !== 201) {
    return fail(data?.error || 'Shadowfax shipment creation failed', status);
  }

  return success({ data });
});
