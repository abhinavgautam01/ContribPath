import { describe, expect, it } from "vitest";
import {
  buildIssueSearchQueries,
  discoverySearchLanguages,
  githubSearchRetryBackoffMs,
  isGitHubSearchQuotaError,
  retryGitHubSearch,
  shouldReturnPartialDiscovery
} from "@/lib/providers/github";
import type { SkillProfile } from "@/lib/types";

const profile = (languages: SkillProfile["languages"]): Pick<SkillProfile, "languages"> => ({ languages });

describe("GitHub issue discovery query planning", () => {
  it("builds separate label queries for each top language", () => {
    expect(buildIssueSearchQueries(["TypeScript"])).toEqual([
      {
        language: "TypeScript",
        label: "good first issue",
        q: 'is:issue is:open label:"good first issue" language:TypeScript no:assignee'
      },
      {
        language: "TypeScript",
        label: "help wanted",
        q: 'is:issue is:open label:"help wanted" language:TypeScript no:assignee'
      }
    ]);
  });

  it("uses at most the top three profile languages", () => {
    expect(
      discoverySearchLanguages(
        profile([
          { name: "TypeScript", percentage: 50 },
          { name: "Go", percentage: 25 },
          { name: "Rust", percentage: 15 },
          { name: "Ruby", percentage: 10 }
        ])
      )
    ).toEqual(["TypeScript", "Go", "Rust"]);
  });

  it("falls back for empty or notebook/documentation-heavy profiles", () => {
    expect(discoverySearchLanguages(profile([]))).toEqual(["JavaScript", "Python"]);
    expect(discoverySearchLanguages(profile([{ name: "Jupyter Notebook", percentage: 70 }, { name: "Markdown", percentage: 30 }]))).toEqual(["Python"]);
  });

  it("classifies search quota failures for retry and partial discovery", () => {
    const primaryQuota = { status: 403, response: { headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1782048000" } } };

    expect(githubSearchRetryBackoffMs).toEqual([1000, 2000, 4000]);
    expect(isGitHubSearchQuotaError(primaryQuota)).toBe(true);
    expect(isGitHubSearchQuotaError({ status: 429 })).toBe(true);
    expect(isGitHubSearchQuotaError({ status: 503 })).toBe(false);
    expect(shouldReturnPartialDiscovery(4, primaryQuota)).toBe(false);
    expect(shouldReturnPartialDiscovery(5, primaryQuota)).toBe(true);
  });

  it("retries quota-limited GitHub searches before returning a successful result", async () => {
    const waits: number[] = [];
    let attempts = 0;

    const result = await retryGitHubSearch(
      async () => {
        attempts += 1;
        if (attempts < 3) throw { status: 429 };
        return "ok";
      },
      async (ms) => {
        waits.push(ms);
      }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(waits).toEqual([1000, 2000]);
  });
});
