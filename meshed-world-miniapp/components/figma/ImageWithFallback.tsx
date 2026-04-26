"use client";

import { useMemo, useState } from "react";

type ImageWithFallbackProps = {
  src: string;
  alt: string;
  className?: string;
};

export function ImageWithFallback({ src, alt, className }: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const fallbackText = useMemo(() => {
    const words = alt.trim().split(/\s+/).filter(Boolean);
    const initials = words.length === 0 ? "UP" : words.map((word) => word.charAt(0).toUpperCase()).slice(0, 2).join("");
    return initials;
  }, [alt]);

  if (hasError) {
    return (
      <div
        className={
          `rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 inline-flex items-center justify-center font-semibold ${className ?? ""}`
        }
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
