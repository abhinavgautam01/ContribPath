import { buildJobEvents, encodeSseEvent, replayJobEvents } from "@/lib/job-events";
import { getQueuedAgentJob } from "@/lib/queue/job-status";
import { getState } from "@/lib/store";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { jobId } = await params;
  const encoder = new TextEncoder();
  const job = getState().jobs[jobId] ?? (await getQueuedAgentJob(jobId));
  const events = replayJobEvents(buildJobEvents(job), request.headers.get("Last-Event-ID"));

  const stream = new ReadableStream({
    start(controller) {
      events.forEach((event) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
