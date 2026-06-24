import { NextResponse } from 'next/server';
import { fetchTaxes } from '@/lib/zoho';
import { withError } from '@/lib/api-handler';

export const GET = withError(async () => {
  const res = await fetchTaxes();
  return NextResponse.json(res);
});
