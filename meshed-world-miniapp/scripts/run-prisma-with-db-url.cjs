#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const [, , ...prismaArgs] = process.argv;
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/run-prisma-with-db-url.cjs <prisma-args...>");
  process.exit(1);
}

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/meshed";

const result = spawnSync("prisma", prismaArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
