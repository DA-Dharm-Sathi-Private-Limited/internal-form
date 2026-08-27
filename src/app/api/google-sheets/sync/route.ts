import { NextRequest, NextResponse } from 'next/server';
import { appendOrderToGoogleSheet, SyncOrderRow } from '@/lib/google-sheets';
import { withError, fail } from '@/lib/api-handler';

export const POST = withError(async (request: NextRequest) => {
  const body = await request.json() as SyncOrderRow;

  if (!body.awb || !body.invoiceNumber) {
    return fail('awb and invoiceNumber are required for Google Sheet sync', 400);
  }

  const result = await appendOrderToGoogleSheet(body);

  if (!result.success) {
    return fail(result.error || 'Failed to sync with Google Sheets', 500);
  }

  return NextResponse.json({ success: true, message: 'Synced to Google Sheet successfully' });
});
