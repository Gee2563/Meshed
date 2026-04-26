import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { requireCurrentUser } from "@/lib/server/current-user";
import { fail, ok } from "@/lib/server/http";
import { userRepository } from "@/lib/server/repositories/user-repository";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PROFILE_UPLOAD_DIRECTORY = join(process.cwd(), "public", "uploads", "profiles");

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function localUploadPathFromUrl(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/profiles/")) {
    return null;
  }

  return join(PROFILE_UPLOAD_DIRECTORY, basename(url));
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireCurrentUser();
    const formData = await request.formData();
    const uploaded = formData.get("image");

    if (!(uploaded instanceof File)) {
      throw new Error("Choose an image before uploading.");
    }

    if (!(uploaded.type in ALLOWED_IMAGE_TYPES)) {
      throw new Error("Upload a PNG, JPG, or WEBP image.");
    }

    if (uploaded.size > MAX_IMAGE_BYTES) {
      throw new Error("Profile images must be smaller than 5 MB.");
    }

    await mkdir(PROFILE_UPLOAD_DIRECTORY, { recursive: true });

    const extension = ALLOWED_IMAGE_TYPES[uploaded.type];
    const filename = `${currentUser.id}-${randomUUID()}.${extension}`;
    const relativeUrl = `/uploads/profiles/${filename}`;
    const outputPath = join(PROFILE_UPLOAD_DIRECTORY, filename);
    const bytes = Buffer.from(await uploaded.arrayBuffer());

    await writeFile(outputPath, bytes);

    const previousLocalPath = localUploadPathFromUrl(currentUser.profileImageUrl ?? null);
    if (previousLocalPath) {
      await unlink(previousLocalPath).catch(() => {
        // Best-effort cleanup only. TODO: move profile media to persistent object storage before production scale.
      });
    }

    const updatedUser = await userRepository.updateProfile(currentUser.id, {
      profileImageUrl: relativeUrl,
    });

    return ok({
      user: updatedUser,
      imageUrl: relativeUrl,
    });
  } catch (error) {
    return fail(error);
  }
}
