import type { AgentJob } from "@/lib/types";

export type JobSseEvent = {
  id: number;
  event: "status" | "complete" | "error";
  data: Record<string, unknown>;
};

function statusPayload(job: AgentJob) {
  return {
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    resultId: job.resultId ?? null
  };
}

export function buildJobEvents(job: AgentJob | undefined): JobSseEvent[] {
  if (!job) {
    return [{ id: 1, event: "error", data: { status: "failed", error: "Job not found" } }];
  }

  if (job.status === "failed") {
    return [
      { id: 1, event: "status", data: statusPayload(job) },
      { id: 2, event: "error", data: { status: "failed", error: job.error ?? "Job failed" } }
    ];
  }

  if (job.status === "cancelled") {
    return [
      { id: 1, event: "status", data: statusPayload(job) },
      { id: 2, event: "error", data: { status: "cancelled", error: job.error ?? "Job cancelled" } }
    ];
  }

  if (job.status === "done") {
    return [
      { id: 1, event: "status", data: statusPayload(job) },
      { id: 2, event: "complete", data: { status: "done", result: job.result ?? null, resultId: job.resultId ?? null } }
    ];
  }

  return [{ id: 1, event: "status", data: statusPayload(job) }];
}

export function replayJobEvents(events: JobSseEvent[], lastEventId: string | null) {
  const parsed = Number(lastEventId);
  if (!Number.isFinite(parsed) || parsed <= 0) return events;
  return events.filter((event) => event.id >= parsed);
}

export function encodeSseEvent(event: JobSseEvent) {
  return `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}
