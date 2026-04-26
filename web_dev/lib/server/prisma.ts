import { statSync } from "node:fs";
import { join } from "node:path";

import { env } from "@/lib/config/env";
import { PrismaClient } from "@/lib/server/prisma-client";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = env.DATABASE_URL;
}

function getGeneratedClientSignature() {
  try {
    const generatedSchemaPath = join(process.cwd(), "node_modules/.prisma/client/schema.prisma");
    const stats = statSync(generatedSchemaPath);
    return `${generatedSchemaPath}:${stats.mtimeMs}:${stats.size}`;
  } catch {
    return "unknown-generated-client";
  }
}

// Reuse one Prisma client in development to avoid exhausting connections during hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientSignature?: string;
};

const prismaClientSignature = getGeneratedClientSignature();
const shouldReuseExistingClient =
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma !== undefined &&
  globalForPrisma.prismaClientSignature === prismaClientSignature;

if (!shouldReuseExistingClient && globalForPrisma.prisma) {
  void globalForPrisma.prisma.$disconnect().catch(() => {
    // Best-effort cleanup only; a fresh client will still be created below.
  });
}

export const prisma =
  shouldReuseExistingClient && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : new PrismaClient({
        log: ["warn", "error"],
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientSignature = prismaClientSignature;
}
