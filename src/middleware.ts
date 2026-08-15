import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect everything except API routes, static files, and the login page
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|hp_logo.png|manifest.json|logo-192.png|sw.js).*)"],
};
