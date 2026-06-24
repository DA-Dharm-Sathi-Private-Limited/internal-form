import { NextRequest, NextResponse } from 'next/server';
import { checkPincodeServiceability } from '@/lib/delhivery';
import { withError, fail } from '@/lib/api-handler';

export const GET = withError(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return fail('code query parameter is required', 400);
  }

  const data = await checkPincodeServiceability(code);
  return NextResponse.json(data);
});
