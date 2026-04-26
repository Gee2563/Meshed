"use client";

import Image from "next/image";
import { useId, useMemo, useState, type ChangeEvent } from "react";

type ProfileImageUploaderProps = {
  initialImageUrl?: string | null;
  displayName: string;
  label?: string;
  description?: string;
  compact?: boolean;
  onUploaded?: (imageUrl: string) => void;
};

type UploadResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    imageUrl?: string;
  };
};

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "M";
}

export function ProfileImageUploader({
  initialImageUrl = null,
  displayName,
  label = "Profile image",
  description = "Upload a headshot or brand image for your Meshed profile.",
  compact = false,
  onUploaded,
}: ProfileImageUploaderProps) {
  const inputId = useId();
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = useMemo(() => initialsForName(displayName), [displayName]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as UploadResponse | null;
      const nextImageUrl = body?.data?.imageUrl;
      if (!response.ok || !body?.ok || !nextImageUrl) {
        throw new Error(body?.error ?? "Unable to upload your profile image.");
      }

      setImageUrl(nextImageUrl);
      onUploaded?.(nextImageUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload your profile image.");
    } finally {
      setPending(false);
      event.target.value = "";
    }
  }

  const frameSizeClass = compact ? "h-20 w-20" : "h-28 w-28";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={compact ? "flex items-center gap-4" : "flex flex-col items-start gap-4 sm:flex-row sm:items-center"}>
        <div
          className={`relative ${frameSizeClass} overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] shadow-sm`}
        >
          {imageUrl ? (
            <Image src={imageUrl} alt={`${displayName} profile image`} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold tracking-tight text-slate-500">
              {initials}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 ${
                pending ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {pending ? "Uploading..." : imageUrl ? "Replace image" : "Upload image"}
            </label>
            {imageUrl ? <span className="text-xs font-medium text-emerald-700">Image ready</span> : null}
          </div>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="sr-only" />
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
