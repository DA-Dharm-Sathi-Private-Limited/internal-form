import { NextRequest } from 'next/server';
import { getVendorFromSession } from '@/lib/vendor-auth';
import { withError, fail, success } from '@/lib/api-handler';

export const GET = withError(async () => {
  const vendor = await getVendorFromSession();
  if (!vendor) {
    return fail('Not authenticated as vendor', 401);
  }

  return success({ vendor });
});
