import { NextResponse } from 'next/server';
import { fetchInvoiceSettings } from '@/lib/zoho';
import { withError, success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = withError(async () => {
  const { data } = await fetchInvoiceSettings();
  return success({ settings: data });
});
