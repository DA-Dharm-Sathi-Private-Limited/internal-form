import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabel } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const waybill = searchParams.get('waybill');
  const pdfSize = searchParams.get('pdf_size') || 'A4';

  if (!waybill) {
    return fail('waybill query parameter is required', 400);
  }

  const { status, data } = await generateShippingLabel(waybill, pdfSize);
  return NextResponse.json(data, { status });
});
