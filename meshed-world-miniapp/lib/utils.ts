import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Build conditional class strings and let later Tailwind utilities win when they conflict.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeCount(count: number, singular: string, plural?: string) {
  if (count === 1) {
    return `1 ${singular}`;
  }

  return `${count} ${plural ?? `${singular}s`}`;
}

export function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function safePercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
