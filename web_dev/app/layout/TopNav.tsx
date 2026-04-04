import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/LogoutButton";
import type { UserSummary } from "@/lib/types";

// Global navigation switches between anonymous and signed-in states without changing layout structure.
type TopNavProps = {
  currentUser: UserSummary | null;
};

export function TopNav({ currentUser }: TopNavProps) {
  // The profile route only makes sense once Meshed knows which user record belongs to this session.
  const links: Array<{ href: Route; label: string }> = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    ...(currentUser ? [{ href: `/people/${currentUser.id}` as Route, label: "My Profile" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-fit">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
            Meshed
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-slate">Portfolio Network MVP</p>
        </div>
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
          ) : (
            <Button href="/" variant="secondary">
              Start with Dynamic
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
