import { NextRequest, NextResponse } from 'next/server';
import { trackShipment } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const waybill = searchParams.get('waybill') || undefined;
  const refIds = searchParams.get('ref_ids') || undefined;

  if (!waybill && !refIds) {
    return fail('waybill or ref_ids query parameter is required', 400);
  }

  const { status, data } = await trackShipment(waybill, refIds);
  return NextResponse.json(data, { status });
});
