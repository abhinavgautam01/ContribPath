import { describe, expect, it } from "vitest";
import { paginate, parsePaginationParams, parsePositiveInteger } from "@/lib/pagination";

describe("pagination helpers", () => {
  it("normalizes invalid pagination query params to SPEC defaults", () => {
    const params = new URLSearchParams({ page: "abc", limit: "0" });

    expect(parsePaginationParams(params)).toEqual({ page: 1, limit: 10 });
  });

  it("caps page size at the API max", () => {
    const params = new URLSearchParams({ page: "2.9", limit: "500" });

    expect(parsePaginationParams(params)).toEqual({ page: 2, limit: 50 });
  });

  it("parses positive integer filters with safe defaults", () => {
    expect(parsePositiveInteger("75", 0)).toBe(75);
    expect(parsePositiveInteger("not-a-number", 0)).toBe(0);
    expect(parsePositiveInteger("-5", 0)).toBe(0);
  });

  it("paginates result sets with metadata", () => {
    const result = paginate(["a", "b", "c"], 2, 2);

    expect(result).toEqual({
      items: ["c"],
      pagination: {
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2
      }
    });
  });
});
