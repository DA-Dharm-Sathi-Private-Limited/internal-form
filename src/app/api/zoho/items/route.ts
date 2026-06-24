import { NextResponse } from 'next/server';
import { fetchAllActiveItems } from '@/lib/zoho';
import { withError, success } from '@/lib/api-handler';

export const GET = withError(async () => {
  const items = await fetchAllActiveItems();
  return success({ items });
});
