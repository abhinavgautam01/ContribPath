import { auth } from "@/auth";
import { json } from "@/lib/api";
import { buildDemoAccountExport, exportUserData } from "@/lib/db/account-data";
import { hasDatabase } from "@/lib/env";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (hasDatabase() && session?.user.id && session.user.id !== "user_demo") {
    const exported = await exportUserData(session.user.id);
    if (exported) return json(exported);
  }
  return json(buildDemoAccountExport(getState()));
}
