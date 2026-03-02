"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AppNavbar({ email }: { email: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const initial = email.charAt(0).toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-black/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-white"
          >
            <Image src="/logo.svg" alt="Open Mandi" width={32} height={32} className="h-8 w-auto" />
            Open Mandi
          </Link>
          <span className="text-zinc-700">|</span>
          <span className="text-sm text-zinc-400">Exchange</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Docs
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
            title={email}
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
