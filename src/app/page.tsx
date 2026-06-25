"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  return <></>;
}
