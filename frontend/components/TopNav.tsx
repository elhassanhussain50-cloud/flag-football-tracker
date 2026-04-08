"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

const HIDE_ON = ["/login", "/register"];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDE_ON.includes(pathname)) return null;

  async function handleSignOut() {
    await auth.logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 h-14"
      style={{
        background: "rgba(13,13,15,0.92)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 no-underline">
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center font-display font-800 text-xs"
          style={{ background: "var(--accent)", color: "#0d0d0f" }}
        >
          ST
        </div>
        <span
          className="font-display text-lg font-700 tracking-wider uppercase"
          style={{ color: "var(--text-primary)" }}
        >
          SnapTag
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-widest transition-colors"
          style={{ color: pathname === "/" ? "var(--accent)" : "var(--text-secondary)" }}
        >
          Games
        </Link>
      </nav>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded transition-colors"
        style={{
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
      >
        Sign out
      </button>
    </header>
  );
}
