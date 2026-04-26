"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardTopPanelsProps = {
  gridClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
  leftEyebrow?: string;
  leftHeaderVisual?: ReactNode;
  leftTitle: string;
  leftDescription?: string;
  leftChildren: ReactNode;
  rightEyebrow?: string;
  rightTitle: string;
  rightDescription?: string;
  rightChildren: ReactNode;
};

export function DashboardTopPanels({
  gridClassName,
  leftClassName,
  rightClassName,
  leftEyebrow,
  leftHeaderVisual,
  leftTitle,
  leftDescription,
  leftChildren,
  rightEyebrow,
  rightTitle,
  rightDescription,
  rightChildren,
}: DashboardTopPanelsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("grid gap-6 xl:grid-cols-[1.08fr_0.92fr]", gridClassName)}>
      <section
        className={cn(
          "rounded-[2rem] border border-slate-200/80 bg-white/65 shadow-[0_18px_60px_rgba(21,38,58,0.08)] backdrop-blur",
          leftClassName,
        )}
      >
        <div className="px-6 py-5 sm:px-6 sm:py-6">
          <div className="max-w-3xl">
            {leftHeaderVisual ? <div className="mb-3">{leftHeaderVisual}</div> : null}
            {leftEyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">{leftEyebrow}</p> : null}
            <h2 className={cn(leftEyebrow ? "mt-2" : "", "font-display text-3xl tracking-tight text-ink")}>{leftTitle}</h2>
            {leftDescription ? <p className="mt-3 text-[12px] leading-5 text-slate">{leftDescription}</p> : null}
          </div>
        </div>
        {isOpen ? <div className="px-6 pb-6">{leftChildren}</div> : null}
      </section>

      <section
        className={cn(
          "relative rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(238,242,247,0.84),rgba(255,255,255,0.92))] shadow-[0_18px_60px_rgba(21,38,58,0.08)]",
          rightClassName,
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-6 top-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate sm:top-6"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse dashboard overview cards" : "Expand dashboard overview cards"}
        >
          Toggle
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        <div className="px-6 py-5 sm:px-6 sm:py-6">
          <div className="max-w-3xl pr-24">
            {rightEyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate">{rightEyebrow}</p> : null}
            <h2 className={cn(rightEyebrow ? "mt-2" : "", "font-display text-3xl tracking-tight text-ink")}>{rightTitle}</h2>
            {rightDescription ? <p className="mt-3 text-[12px] leading-5 text-slate">{rightDescription}</p> : null}
          </div>
        </div>
        {isOpen ? <div className="px-6 pb-6">{rightChildren}</div> : null}
      </section>
    </div>
  );
}
