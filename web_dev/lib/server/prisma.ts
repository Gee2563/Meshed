import { env } from "@/lib/config/env";
import { PrismaClient } from "@/lib/server/prisma-client";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = env.DATABASE_URL;
}

// Reuse one Prisma client in development to avoid exhausting connections during hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
