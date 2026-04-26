import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile, spawnSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

function resolveRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function resolvePythonExecutable(repoRoot) {
  const venvPython = path.resolve(repoRoot, "network_pipeline", "venv", "bin", "python");
  const candidates = existsSync(venvPython) ? [venvPython, "python3"] : ["python3"];

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["-c", "import bs4, requests"], {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    });
    if (probe.status === 0) {
      return candidate;
    }
  }

  throw new Error(
    "Python scraper dependencies are missing. Install the network pipeline environment so `bs4` and `requests` are available.",
  );
}

async function run() {
  const jobId = process.argv[2];
  if (!jobId) {
    throw new Error("Missing network preparation job id.");
  }

  const repoRoot = resolveRepoRoot();
  const job = await prisma.networkPreparationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Network preparation job ${jobId} was not found.`);
  }

  const outputDir = path.resolve(repoRoot, "network_pipeline", "data", "staging", "onboarding");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.resolve(outputDir, `${jobId}.json`);

  await prisma.networkPreparationJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      statusMessage: "Inspecting the VC website, generating a custom scraper, and preparing the Meshed network summary.",
      startedAt: new Date(),
      errorMessage: null,
      outputPath,
    },
  });

  try {
    const scraperScript = path.resolve(repoRoot, "network_pipeline", "scripts", "scrape_vc_network.py");
    const pythonExecutable = resolvePythonExecutable(repoRoot);

    await execFileAsync(pythonExecutable, [scraperScript, "--website", job.sourceWebsite, "--output", outputPath], {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
    });

    const payload = JSON.parse(await readFile(outputPath, "utf8"));
    const summary = payload?.summary ?? {};
    const companyCount =
      typeof summary.portfolio_company_count === "number" ? summary.portfolio_company_count : 0;
    const lpCount = typeof summary.lp_contact_count === "number" ? summary.lp_contact_count : 0;

    await prisma.networkPreparationJob.update({
      where: { id: jobId },
      data: {
        status: "READY",
        statusMessage: `Prepared ${companyCount} portfolio companies and ${lpCount} LP or advisor contacts.`,
        result: payload,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.networkPreparationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        statusMessage: "The first network preparation pass did not complete.",
        errorMessage: error instanceof Error ? error.message : "Unknown network preparation error.",
        completedAt: new Date(),
      },
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("[meshed][network-preparation-job] failed", error);
  process.exitCode = 1;
});
