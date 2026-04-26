import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CollapsibleCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  headerVisual?: ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
  tone?: "light" | "dark";
};

const tones = {
  light: {
    shell: "border-slate-200/80 bg-white/90 shadow-[0_18px_60px_rgba(21,38,58,0.08)]",
    eyebrow: "text-slate",
    title: "text-ink",
    description: "text-slate",
    toggle: "border-white/80 bg-white/90 text-slate",
  },
  dark: {
    shell: "border-white/15 bg-[linear-gradient(135deg,rgba(21,38,58,0.97),rgba(29,70,109,0.94))] text-white shadow-halo",
    eyebrow: "text-sky-100",
    title: "text-white",
    description: "text-sky-50/85",
    toggle: "border-white/15 bg-white/10 text-sky-50",
  },
} as const;

export function CollapsibleCard({
  eyebrow,
  title,
  description,
  children,
  headerVisual,
  className,
  contentClassName,
  defaultOpen = true,
  tone = "light",
}: CollapsibleCardProps) {
  const theme = tones[tone];

  return (
    <details open={defaultOpen} className={cn("group rounded-[2rem] border", theme.shell, className)}>
      <summary className="cursor-pointer list-none px-6 py-5 sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            {headerVisual ? <div className="mb-3">{headerVisual}</div> : null}
            {eyebrow ? <p className={cn("text-xs font-semibold uppercase tracking-[0.22em]", theme.eyebrow)}>{eyebrow}</p> : null}
            <h2 className={cn(eyebrow ? "mt-2" : "", "font-display text-3xl tracking-tight", theme.title)}>{title}</h2>
            {description ? <p className={cn("mt-3 text-[12px] leading-5", theme.description)}>{description}</p> : null}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
              theme.toggle,
            )}
          >
            Toggle
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </span>
        </div>
      </summary>
      <div className={cn("px-6 pb-6", contentClassName)}>{children}</div>
    </details>
  );
}
