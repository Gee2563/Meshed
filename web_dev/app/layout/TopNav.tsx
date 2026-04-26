import Link from "next/link";
import type { Route } from "next";

import { LogoutButton } from "@/components/LogoutButton";
import type { UserSummary } from "@/lib/types";

// Global navigation switches between anonymous and signed-in states without changing layout structure.
type TopNavProps = {
  currentUser: UserSummary | null;
};

export function TopNav({ currentUser }: TopNavProps) {
  const links: Array<{ href: Route; label: string }> = [
    { href: "/", label: "Home" },
    { href: "/agent", label: "Agent" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/upcycle", label: "Meshed Upcycle" },
    { href: "/awards", label: "Awards" },
    { href: "/ai-summary", label: "AI Summary" },
    ...(currentUser ? [{ href: "/profile", label: "Profile" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-1 py-1">
        <Link href="/" className="min-w-fit">
          <img src="/meshed-logo.png" alt="Meshed" className="h-20 w-auto sm:h-24" />
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-3 sm:justify-center sm:gap-5">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-slate transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <div className="hidden rounded-full border border-line bg-mist px-3 py-2 text-xs text-slate lg:block">
                {currentUser.name}
              </div>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
