import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const appRoot = process.cwd();
loadEnvFile(path.resolve(appRoot, ".env.local"));
loadEnvFile(path.resolve(appRoot, ".env"));
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/meshed";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.worldVerificationNullifier.count();
  const deleted = await prisma.worldVerificationNullifier.deleteMany();

  console.log(
    JSON.stringify(
      {
        ok: true,
        removed: {
          worldVerificationNullifiers: deleted.count,
        },
        previousCounts: {
          worldVerificationNullifiers: count,
        },
        note: "World replay mappings were cleared. Existing users, sessions, and worldVerified flags were left intact.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[meshed][reset-world-replay-mappings] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
