import { Worker } from "bullmq";
import type { RedisOptions } from "ioredis";
import { runIssueDiscovery, runIssueDiscoveryForUser, runPlanner, runPlannerForUser, runProfileAnalysis, runProfileAnalysisForUser } from "@/lib/agents";
import { getStoredIssue } from "@/lib/db/app-data";
import type { DiscoveryPreferencePatch } from "@/lib/discovery-preferences";
import { findIssue } from "@/lib/store";
import { getQueueRedis } from "@/lib/queue/redis";

const connection = getQueueRedis();

if (!connection) {
  console.error("QUEUE_REDIS_URL is required to start the worker.");
  process.exit(1);
}

const worker = new Worker(
  "agent-jobs",
  async (job) => {
    if (job.name === "profile_analysis") {
      if (typeof job.data.userId === "string" && job.data.userId !== "current") {
        return runProfileAnalysisForUser(job.data.userId);
      }
      return runProfileAnalysis();
    }
    if (job.name === "issue_discovery") {
      const preferences = job.data.preferences as DiscoveryPreferencePatch | undefined;
      if (typeof job.data.userId === "string" && job.data.userId !== "current") {
        return runIssueDiscoveryForUser(job.data.userId, preferences);
      }
      return runIssueDiscovery(preferences);
    }
    if (job.name === "plan") {
      const issueId = job.data.issueId as string;
      if (typeof job.data.userId === "string" && job.data.userId !== "current") {
        const storedIssue = await getStoredIssue(job.data.userId, issueId);
        if (!storedIssue) throw new Error(`Issue not found: ${issueId}`);
        return runPlannerForUser(job.data.userId, storedIssue);
      }
      const issue = findIssue(issueId);
      if (!issue) throw new Error(`Issue not found: ${issueId}`);
      return runPlanner(issue);
    }
    throw new Error(`Unsupported job type: ${job.name}`);
  },
  { connection: connection as unknown as RedisOptions }
);

worker.on("completed", (job) => {
  console.log(JSON.stringify({ level: "info", jobId: job.id, status: "completed" }));
});

worker.on("failed", (job, error) => {
  console.error(JSON.stringify({ level: "error", jobId: job?.id, status: "failed", error: error.message }));
});
