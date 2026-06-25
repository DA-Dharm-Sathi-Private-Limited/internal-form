import { NextRequest } from 'next/server';
import { trackShipment } from '@/lib/shadowfax';
import { withError, success, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest, { params }: { params: Promise<{ clientOrderId: string }> }) => {
  const { clientOrderId } = await params;

  if (!clientOrderId) {
    return fail('Missing client order ID', 400);
  }

  const { status, data } = await trackShipment(clientOrderId);
  if (status !== 200) {
    return fail(data?.error || 'Shadowfax tracking failed', status);
  }

  return success({ data });
});
