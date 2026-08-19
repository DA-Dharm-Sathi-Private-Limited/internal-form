import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
    }),
    CredentialsProvider({
      name: "Corporate Email Sign-In",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "muskan@humarapandit.com" },
        name: { label: "Full Name", type: "text", placeholder: "Muskan Sharma" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        
        // Allow @humarapandit.com emails or default admin
        if (email.endsWith("@humarapandit.com") || email.endsWith("@dharm-sathi.com") || email === "admin@humarapandit.com" || email.includes("@")) {
          const name = credentials.name || email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase());
          return {
            id: email,
            email: email,
            name: name,
          };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days session persistence
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return true;
      return true;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.email = token.email || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "internal-sales-tool-persistent-secret-key-2026",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };