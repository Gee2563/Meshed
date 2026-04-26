import Link from "next/link";
import type { ReactNode } from "react";
import type { Route } from "next";

import { cn } from "@/lib/utils";

// Share one styling API for both navigational links and in-place button actions.
type ButtonProps = {
  children: ReactNode;
  className?: string;
  href?: Route;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
};

const variants = {
  primary: "bg-accent text-white hover:bg-accentStrong",
  secondary: "bg-white text-ink ring-1 ring-line hover:bg-mist",
  ghost: "bg-transparent text-slate hover:bg-white/80",
};

export function Button({
  children,
  className,
  href,
  type = "button",
  variant = "primary",
  disabled,
  onClick,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className,
  );

  // Render a real navigation element whenever a destination is supplied.
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
