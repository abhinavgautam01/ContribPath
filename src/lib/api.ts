import { NextResponse } from "next/server";
import { z } from "zod";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function problem(status: number, title: string, detail: string, init?: ResponseInit) {
  return NextResponse.json(
    {
      type: `https://contribpath.dev/errors/${title.toLowerCase().replaceAll(" ", "-")}`,
      title,
      status,
      detail
    },
    { ...init, status }
  );
}

export type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonResult<T>(request: Request, schema: z.ZodSchema<T>): Promise<ParseJsonResult<T>> {
  const body = await request.json().catch(() => undefined);
  if (body === undefined) {
    return {
      ok: false,
      response: problem(400, "Invalid Request", "Request body must be valid JSON.")
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: problem(400, "Invalid Request", parsed.error.issues.map((issue) => issue.message).join("; "))
    };
  }

  return { ok: true, data: parsed.data };
}

export async function parseOptionalJsonResult<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  fallbackBody: unknown = {}
): Promise<ParseJsonResult<T>> {
  const text = await request.text().catch(() => undefined);
  if (text === undefined) {
    return {
      ok: false,
      response: problem(400, "Invalid Request", "Request body must be valid JSON.")
    };
  }

  let body = fallbackBody;
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      return {
        ok: false,
        response: problem(400, "Invalid Request", "Request body must be valid JSON.")
      };
    }
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: problem(400, "Invalid Request", parsed.error.issues.map((issue) => issue.message).join("; "))
    };
  }

  return { ok: true, data: parsed.data };
}

export function absoluteUrl(path: string) {
  const base = process.env.APP_URL || "http://localhost:3000";
  return new URL(path, base).toString();
}
