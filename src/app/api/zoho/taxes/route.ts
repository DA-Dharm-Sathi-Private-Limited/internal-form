import { NextResponse } from 'next/server';
import { fetchTaxes } from '@/lib/zoho';
import { withError, success } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const GET = withError(async () => {
  const { data } = await fetchTaxes();
  return success({ taxes: data });
});
