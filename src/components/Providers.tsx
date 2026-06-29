"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

function AuthSync({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      setAuth({
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      });
    } else {
      setAuth(null);
    }
    setInitialized();
  }, [session, status, setAuth, setInitialized]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync>{children}</AuthSync>
    </SessionProvider>
  );
}
