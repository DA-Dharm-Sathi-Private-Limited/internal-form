import { NextRequest } from 'next/server';
import { checkServiceability } from '@/lib/shadowfax';
import { withError, success, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pincodes = searchParams.get('pincodes');

  if (!pincodes) {
    return fail('Missing pincodes query parameter', 400);
  }

  const { status, data } = await checkServiceability(pincodes);
  if (status !== 200) {
    return fail(data?.error || 'Shadowfax serviceability check failed', status);
  }

  return success({ data });
});
