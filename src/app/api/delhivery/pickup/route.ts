import { NextRequest, NextResponse } from 'next/server';
import { createPickupRequest } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.pickup_time || !body.pickup_date || !body.pickup_location || !body.expected_package_count) {
    return fail('Missing required pickup fields', 400);
  }

  const { status, data } = await createPickupRequest(body);

  const hasError = status !== 200 || data.error || (data.pr && (Array.isArray(data.pr) || typeof data.pr === 'string'));

  if (hasError) {
    console.error('[Pickup Scheduling Failed]', {
      requestBody: body,
      statusCode: status,
      delhiveryResponse: data
    });
  }

  return NextResponse.json(data, { status });
});
