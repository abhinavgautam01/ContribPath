import { describe, expect, it } from "vitest";
import {
  buildIssueSearchQueries,
  contributedRepositorySet,
  discoverySearchLanguages,
  githubSearchRetryBackoffMs,
  hasUserContributedToRepository,
  isGitHubSearchQuotaError,
  isDocumentationProfile,
  largeFileRawBlobNote,
  largeFileRawBlobWindowBytes,
  largeFileSkipReason,
  readRawBlobWindow,
  repositoryFullNameFromApiUrl,
  retryGitHubSearch,
  shouldIncludeLanguageTaggedRepo,
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

  it("normalizes contributed repositories from GitHub API URLs", () => {
    expect(repositoryFullNameFromApiUrl("https://api.github.com/repos/Owner/Repo")).toBe("owner/repo");
    expect(repositoryFullNameFromApiUrl("https://api.github.com/user/repos")).toBeNull();
    expect(contributedRepositorySet({ contributedRepositories: ["Owner/Repo", " other/Project "] })).toEqual(
      new Set(["owner/repo", "other/project"])
    );
  });

  it("excludes repositories the user has already contributed to", () => {
    expect(hasUserContributedToRepository({ contributedRepositories: ["owner/repo"] }, "Owner/Repo")).toBe(true);
    expect(hasUserContributedToRepository({ contributedRepositories: ["owner/repo"] }, "owner/other")).toBe(false);
  });

  it("only includes no-language repositories for documentation-oriented profiles", () => {
    const developerProfile: Pick<SkillProfile, "languages" | "frameworks" | "preferredDomain"> = {
      languages: [{ name: "TypeScript", percentage: 100 }],
      frameworks: ["React"],
      preferredDomain: "Developer Tools"
    };
    const docsProfile: Pick<SkillProfile, "languages" | "frameworks" | "preferredDomain"> = {
      languages: [{ name: "Technical Writing", percentage: 100 }],
      frameworks: [],
      preferredDomain: "Documentation"
    };

    expect(isDocumentationProfile(developerProfile)).toBe(false);
    expect(isDocumentationProfile(docsProfile)).toBe(true);
    expect(shouldIncludeLanguageTaggedRepo({ language: null }, developerProfile)).toBe(false);
    expect(shouldIncludeLanguageTaggedRepo({ language: null }, docsProfile)).toBe(true);
    expect(shouldIncludeLanguageTaggedRepo({ language: "TypeScript" }, developerProfile)).toBe(true);
  });

  it("reads only a bounded byte range from raw blobs for large files", async () => {
    const calls: RequestInit[] = [];
    const content = await readRawBlobWindow("https://raw.githubusercontent.com/owner/repo/main/big.ts", async (_url, init) => {
      calls.push(init);
      return {
        ok: true,
        text: async () => "x".repeat(largeFileRawBlobWindowBytes + 10)
      };
    });

    expect(calls[0]?.headers).toEqual({ Range: `bytes=0-${largeFileRawBlobWindowBytes - 1}` });
    expect(content).toHaveLength(largeFileRawBlobWindowBytes);
  });

  it("uses clear contributor notes for large file raw snippets and skips", () => {
    expect(largeFileRawBlobNote("src/big.ts", 2_000_000)).toContain("only the first 65536 bytes");
    expect(largeFileSkipReason("src/big.ts")).toBe("File src/big.ts is larger than 1MB and no raw blob URL was available; inspect the GitHub blob manually.");
  });
});
