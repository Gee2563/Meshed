import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/AppProviders";

import "./global.css";

export const metadata: Metadata = {
  title: "Meshed",
  description: "Verified network access for portfolio communities.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-transparent text-ink antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
