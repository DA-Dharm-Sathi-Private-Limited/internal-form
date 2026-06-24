import { NextRequest, NextResponse } from 'next/server';
import connectDB from './mongodb';

export function success(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function fail(error: string, status = 500) {
  return NextResponse.json({ success: false, error }, { status });
}

export function withError(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      console.error(`[${req.method}] ${req.nextUrl.pathname}:`, msg);
      return fail(msg, 500);
    }
  };
}

export function withDb(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    try {
      await connectDB();
      return await handler(req, context);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      console.error(`[${req.method}] ${req.nextUrl.pathname}:`, msg);
      return fail(msg, 500);
    }
  };
}
