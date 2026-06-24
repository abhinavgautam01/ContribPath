import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jobAccepted, parseJsonResult, parseOptionalJsonResult, problem } from "@/lib/api";

describe("api helpers", () => {
  it("returns the SPEC queued response for accepted jobs", async () => {
    const response = jobAccepted("job_123");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ jobId: "job_123", status: "queued" });
  });

  it("returns RFC7807 problem details", async () => {
    const response = problem(404, "Not Found", "Missing resource");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      type: "https://contribpath.dev/errors/not-found",
      title: "Not Found",
      status: 404,
      detail: "Missing resource"
    });
  });

  it("validates JSON bodies without throwing zod errors", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ saved: "yes" })
    });
    const result = await parseJsonResult(request, z.object({ saved: z.boolean() }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({
        type: "https://contribpath.dev/errors/invalid-request",
        title: "Invalid Request",
        status: 400
      });
    }
  });

  it("reports malformed JSON as an invalid request", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: "{bad-json"
    });
    const result = await parseJsonResult(request, z.object({ saved: z.boolean() }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      await expect(result.response.json()).resolves.toMatchObject({
        detail: "Request body must be valid JSON."
      });
    }
  });

  it("accepts omitted optional JSON bodies with a fallback", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST"
    });
    const result = await parseOptionalJsonResult(request, z.object({ refresh: z.boolean().optional() }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({});
    }
  });

  it("rejects malformed optional JSON bodies", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: "{bad-json"
    });
    const result = await parseOptionalJsonResult(request, z.object({ refresh: z.boolean().optional() }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toMatchObject({
        detail: "Request body must be valid JSON."
      });
    }
  });
});
