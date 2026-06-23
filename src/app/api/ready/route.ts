import { json } from "@/lib/api";
import { getReadinessReport } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getReadinessReport();
  return json(report, { status: report.status === "ready" ? 200 : 503 });
}
