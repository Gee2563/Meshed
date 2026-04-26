import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/AppProviders";
import { getCurrentUser } from "@/lib/server/current-user";
import { TopNav } from "@/app/layout/TopNav";

import "./global.css";

export const metadata: Metadata = {
  title: "Meshed",
  description: "Verified network access for portfolio communities.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-transparent text-ink antialiased">
        <AppProviders>
          <TopNav currentUser={currentUser} />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
