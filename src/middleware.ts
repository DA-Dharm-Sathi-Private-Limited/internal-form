import { NextResponse, NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Vendor Portal Route Protection
  if (pathname.startsWith('/vendor-portal')) {
    if (pathname === '/vendor-portal/login') {
      return NextResponse.next();
    }

    const vendorToken = req.cookies.get('vendor_token')?.value;
    if (!vendorToken) {
      const loginUrl = new URL('/vendor-portal/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Staff Auth Protection via NextAuth
  // @ts-ignore
  return withAuth(req, {
    pages: {
      signIn: "/login",
    },
  });
}

export const config = {
  // Exclude public static files, login routes, api routes, and vendor portal from main staff auth matcher
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|hp_logo.png|manifest.json|logo-192.png|sw.js|vendor-portal/login).*)",
  ],
};
