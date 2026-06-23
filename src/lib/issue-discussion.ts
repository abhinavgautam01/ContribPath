import type { Issue } from "@/lib/types";

export type IssueComment = {
  author: string;
  body: string;
};

export type IssueDiscussion = {
  body: string;
  comments: IssueComment[];
};

export function selectRelevantIssueComments(comments: IssueComment[]) {
  if (comments.length <= 200) {
    return {
      comments,
      longDiscussion: false
    };
  }

  return {
    comments: [...comments.slice(0, 10), ...comments.slice(-5)],
    longDiscussion: true
  };
}

export function issueWithDiscussion(issue: Issue, discussion: IssueDiscussion): Issue {
  const selected = selectRelevantIssueComments(discussion.comments);
  const commentBlock = selected.comments
    .map((comment, index) => `Comment ${index + 1} by ${comment.author}: ${comment.body}`)
    .join("\n\n");
  const bodyParts = [discussion.body || issue.body, commentBlock ? `Comments:\n\n${commentBlock}` : ""].filter(Boolean);
  const gotchas = selected.longDiscussion
    ? [...issue.issueContext.gotchas, "Long discussion - read the full GitHub thread carefully before starting."]
    : issue.issueContext.gotchas;

  return {
    ...issue,
    body: bodyParts.length ? bodyParts.join("\n\n") : "Insufficient information - read the issue and ask the maintainer for clarification.",
    issueContext: {
      ...issue.issueContext,
      gotchas: [...new Set(gotchas)]
    }
  };
}
