import { NextRequest, NextResponse } from 'next/server';
import { getExpectedTAT } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const origin = searchParams.get('origin_pin');
  const dest = searchParams.get('destination_pin');
  const mot = searchParams.get('mot') as 'S' | 'E' | 'N';
  const pickupDate = searchParams.get('expected_pickup_date');

  if (!origin || !dest || !mot) {
    return fail('origin_pin, destination_pin and mot are required parameters', 400);
  }

  const data = await getExpectedTAT(origin, dest, mot, pickupDate || undefined);
  return NextResponse.json(data);
});
