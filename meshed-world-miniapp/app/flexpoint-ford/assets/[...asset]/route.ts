import { readFile } from "node:fs/promises";
import path from "node:path";

const ASSET_ROOT = path.resolve(process.cwd(), "../network_pipeline/public/flexpoint-ford");

const CONTENT_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function resolveAssetPath(parts: string[]) {
  const safeParts = parts.filter(Boolean);
  const candidate = path.resolve(ASSET_ROOT, ...safeParts);
  const relative = path.relative(ASSET_ROOT, candidate);

  if (!safeParts.length || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return candidate;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      asset: string[];
    }>;
  },
) {
  const { asset } = await context.params;
  const assetPath = resolveAssetPath(asset);

  if (!assetPath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(assetPath);
    const extension = path.extname(assetPath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
