import path from "node:path";
import { spawn } from "node:child_process";

import { ApiError } from "@/lib/server/http";
import { networkPreparationJobRepository } from "@/lib/server/repositories/network-preparation-job-repository";

function resolveJobRunnerScriptPath() {
  return path.resolve(process.cwd(), "scripts", "run-network-preparation-job.mjs");
}

export const vcNetworkPreparationAgentService = {
  async enqueue(jobId: string) {
    const job = await networkPreparationJobRepository.findById(jobId);
    if (!job) {
      throw new ApiError(404, "Network preparation job not found.");
    }

    const child = spawn(process.execPath, [resolveJobRunnerScriptPath(), jobId], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      env: process.env,
    });

    child.unref();

    return {
      jobId,
      status: job.status,
      statusMessage: job.statusMessage,
    };
  },
};
