"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("muskan@humarapandit.com");
  const [name, setName] = useState("Muskan Sharma");
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleLogin = () => {
    setIsLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your corporate email.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        name: name.trim() || email.split("@")[0],
        redirect: false,
        callbackUrl: "/",
      });

      if (res?.error) {
        setErrorMsg("Invalid credentials. Please use an official email.");
      } else {
        // Save persistent user session in localStorage as fallback
        localStorage.setItem("user_session_email", email);
        localStorage.setItem("user_session_name", name);
        router.push("/");
        router.refresh();
      }
    } catch {
      setErrorMsg("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-70px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[var(--bg-app)] overflow-hidden">
      <div className="w-full max-w-md space-y-6 z-10 bg-[var(--bg-card)] border border-[var(--border)] p-8 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/hp_logo.png"
            alt="Humara Pandit Logo"
            width={140}
            height={42}
            className="mb-3 object-contain dark:mix-blend-normal"
          />
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--accent)] bg-clip-text text-transparent sm:text-3xl">
            Internal Sales Portal
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-xs">
            Sign in with your corporate account to access dashboard, revenue metrics & quick receipt tool.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Corporate Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. muskan@humarapandit.com"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Salesperson Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Muskan Sharma"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Continue to Dashboard →"}
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-[var(--border)] w-full"></div>
          <span className="bg-[var(--bg-card)] px-3 text-xs text-[var(--text-secondary)] absolute">
            OR
          </span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span>Sign in with Google OAuth</span>
        </button>
      </div>
    </div>
  );
}
