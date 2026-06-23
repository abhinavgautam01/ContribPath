import type { Issue } from "@/lib/types";

export type IssueComment = {
  author: string;
  body: string;
};

export type LinkedPullRequest = {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  body: string;
};

export type IssueDiscussion = {
  body: string;
  comments: IssueComment[];
  linkedPullRequests?: LinkedPullRequest[];
};

export const insufficientIssueInformationSummary = "Insufficient information - read the issue and ask the maintainer for clarification.";

const issueReferencePattern = /(?<![\w/])#(\d+)\b/g;

export function extractReferencedIssueNumbers(text: string) {
  return [...new Set([...text.matchAll(issueReferencePattern)].map((match) => Number(match[1])).filter((value) => Number.isInteger(value) && value > 0))];
}

export function extractReferencedIssueNumbersFromDiscussion(discussion: Pick<IssueDiscussion, "body" | "comments">, currentIssueNumber?: number) {
  const text = [discussion.body, ...discussion.comments.map((comment) => comment.body)].join("\n");
  return extractReferencedIssueNumbers(text).filter((number) => number !== currentIssueNumber).slice(0, 10);
}

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

function hasDiscussionContent(discussion: IssueDiscussion) {
  return Boolean(discussion.body.trim() || discussion.comments.some((comment) => comment.body.trim()));
}

export function issueWithDiscussion(issue: Issue, discussion: IssueDiscussion): Issue {
  const selected = selectRelevantIssueComments(discussion.comments);
  const commentBlock = selected.comments
    .map((comment, index) => `Comment ${index + 1} by ${comment.author}: ${comment.body}`)
    .join("\n\n");
  const linkedPullRequestBlock = discussion.linkedPullRequests?.length
    ? discussion.linkedPullRequests
        .map((pull) => `PR #${pull.number} (${pull.state}${pull.merged ? ", merged" : ""}): ${pull.title}\n${pull.body}`)
        .join("\n\n")
    : "";
  const bodyParts = [
    discussion.body || issue.body,
    commentBlock ? `Comments:\n\n${commentBlock}` : "",
    linkedPullRequestBlock ? `Linked pull requests:\n\n${linkedPullRequestBlock}` : ""
  ].filter(Boolean);
  const gotchas = selected.longDiscussion
    ? [...issue.issueContext.gotchas, "Long discussion - read the full GitHub thread carefully before starting."]
    : issue.issueContext.gotchas;
  const insufficientInformation = !hasDiscussionContent(discussion);

  return {
    ...issue,
    body: bodyParts.length ? bodyParts.join("\n\n") : insufficientIssueInformationSummary,
    issueContext: {
      ...issue.issueContext,
      problem: insufficientInformation ? insufficientIssueInformationSummary : issue.issueContext.problem,
      questionsToAsk: insufficientInformation
        ? [
            ...new Set([
              ...issue.issueContext.questionsToAsk,
              "Can you share the expected behavior, actual behavior, and reproduction steps?"
            ])
          ]
        : issue.issueContext.questionsToAsk,
      gotchas: [...new Set(gotchas)]
    }
  };
}
