import { NextRequest, NextResponse } from 'next/server';
import { VENDOR_COOKIE_NAME } from '@/lib/vendor-auth';
import { withError } from '@/lib/api-handler';

export const POST = withError(async () => {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set(VENDOR_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
});
