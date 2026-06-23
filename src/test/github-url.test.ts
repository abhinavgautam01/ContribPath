import { describe, expect, it } from "vitest";
import { buildGitHubBlobUrl } from "@/lib/github-url";

describe("github url helpers", () => {
  it("builds encoded blob links for repository files", () => {
    expect(buildGitHubBlobUrl("owner/repo", "docs/my file.md")).toBe("https://github.com/owner/repo/blob/HEAD/docs/my%20file.md");
  });

  it("rejects invalid repository names and traversal paths", () => {
    expect(buildGitHubBlobUrl("owner", "README.md")).toBeNull();
    expect(buildGitHubBlobUrl("owner/repo", "../secret")).toBeNull();
    expect(buildGitHubBlobUrl("owner/repo", " ")).toBeNull();
  });
});
