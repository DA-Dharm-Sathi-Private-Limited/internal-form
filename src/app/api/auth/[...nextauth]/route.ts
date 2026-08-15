import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: any = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }: { user: any }) {
      if (user.email && user.email.endsWith("@humarapandit.com")) {
        return true;
      }
      return false; // Return false to deny access
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };