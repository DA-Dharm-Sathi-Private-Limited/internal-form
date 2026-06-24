import { NextRequest, NextResponse } from 'next/server';
import { trackShipment } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const waybillsStr = searchParams.get('waybills') || '';

  if (!waybillsStr) {
    return fail('waybills query parameter is required', 400);
  }

  const waybills = waybillsStr.split(',').map(w => w.trim()).filter(Boolean);

  const results = await Promise.allSettled(
    waybills.map(async (wb) => {
      const { status, data } = await trackShipment(wb);
      return { waybill: wb, status, data };
    })
  );

  const formattedResults = results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      waybill: "UNKNOWN",
      status: 500,
      error: true
    };
  });

  return NextResponse.json({ success: true, results: formattedResults }, { status: 200 });
});
