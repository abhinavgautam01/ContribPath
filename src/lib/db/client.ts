import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, hasDatabase } from "@/lib/env";
import * as schema from "@/lib/db/schema";

let cached: PostgresJsDatabase<typeof schema> | null = null;

export function getDb() {
  if (!hasDatabase()) return null;
  if (!cached) {
    const client = postgres(env.DATABASE_URL!, {
      prepare: false,
      max: 5
    });
    cached = drizzle(client, { schema });
  }
  return cached;
}
