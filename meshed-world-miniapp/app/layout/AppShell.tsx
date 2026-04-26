import type { ReactNode } from "react";

// Shared width and padding wrapper so interior pages line up beneath the top navigation.
type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
  );
}
