import { purgeExpiredRawGithubSnapshots } from "@/lib/db/retention";

async function main() {
  const result = await purgeExpiredRawGithubSnapshots();
  console.log(
    JSON.stringify({
      level: "info",
      jobId: "retention:raw-github-snapshots",
      agentName: "DataRetentionJob",
      status: "success",
      ...result
    })
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "error",
      jobId: "retention:raw-github-snapshots",
      agentName: "DataRetentionJob",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown retention failure"
    })
  );
  process.exitCode = 1;
});
