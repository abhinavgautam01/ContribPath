import { and, isNotNull, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { skillProfiles } from "@/lib/db/schema";

export const rawGithubSnapshotRetentionMs = 24 * 60 * 60 * 1000;

export function rawGithubSnapshotRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - rawGithubSnapshotRetentionMs);
}

export function rawGithubSnapshotRetentionPatch() {
  return { rawData: null };
}

export async function purgeExpiredRawGithubSnapshots(now = new Date()) {
  const db = getDb();
  if (!db) return { purged: 0, cutoff: rawGithubSnapshotRetentionCutoff(now).toISOString() };
  const cutoff = rawGithubSnapshotRetentionCutoff(now);
  const rows = await db
    .update(skillProfiles)
    .set(rawGithubSnapshotRetentionPatch())
    .where(and(isNotNull(skillProfiles.rawData), lt(skillProfiles.analyzedAt, cutoff)))
    .returning({ id: skillProfiles.id });
  return {
    purged: rows.length,
    cutoff: cutoff.toISOString()
  };
}
