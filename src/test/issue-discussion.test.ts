import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/demo-data";
import { issueWithDiscussion, selectRelevantIssueComments, type IssueComment } from "@/lib/issue-discussion";

describe("issue discussion preparation", () => {
  it("keeps all comments for normal discussions", () => {
    const comments = [
      { author: "maintainer", body: "Please update the CLI output." },
      { author: "contributor", body: "I can take this." }
    ];

    expect(selectRelevantIssueComments(comments)).toEqual({
      comments,
      longDiscussion: false
    });
  });

  it("keeps first ten and last five comments for very long discussions", () => {
    const comments: IssueComment[] = Array.from({ length: 205 }, (_, index) => ({
      author: `user-${index}`,
      body: `comment-${index}`
    }));

    const selected = selectRelevantIssueComments(comments);

    expect(selected.longDiscussion).toBe(true);
    expect(selected.comments).toHaveLength(15);
    expect(selected.comments[0]?.body).toBe("comment-0");
    expect(selected.comments[9]?.body).toBe("comment-9");
    expect(selected.comments[10]?.body).toBe("comment-200");
    expect(selected.comments[14]?.body).toBe("comment-204");
  });

  it("adds selected comments and long discussion notes to the issue prompt payload", () => {
    const issue = createInitialState().issues[0];
    const comments: IssueComment[] = Array.from({ length: 205 }, (_, index) => ({
      author: `user-${index}`,
      body: `comment-${index}`
    }));

    const enriched = issueWithDiscussion(issue, { body: "Fresh GitHub body", comments });

    expect(enriched.body).toContain("Fresh GitHub body");
    expect(enriched.body).toContain("Comment 1 by user-0: comment-0");
    expect(enriched.body).toContain("Comment 15 by user-204: comment-204");
    expect(enriched.issueContext.gotchas).toContain("Long discussion - read the full GitHub thread carefully before starting.");
  });

  it("uses a clear fallback when issue body and comments are empty", () => {
    const issue = { ...createInitialState().issues[0], body: "" };

    const enriched = issueWithDiscussion(issue, { body: "", comments: [] });

    expect(enriched.body).toBe("Insufficient information - read the issue and ask the maintainer for clarification.");
  });
});
