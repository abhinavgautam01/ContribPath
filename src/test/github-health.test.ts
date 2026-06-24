import { describe, expect, it } from "vitest";
import {
  aggregateRepoHealth,
  daysBetween,
  maintainerHealthNotes,
  median,
  scoreDaysSinceLastCommit,
  scoreIssueResponseDays,
  scoreIssuesClosedPercent,
  scorePrMergeDays,
  unknownRepoHealth
} from "@/lib/github-health";

describe("github health scoring", () => {
  it("scores individual health signals according to the spec thresholds", () => {
    expect(scoreDaysSinceLastCommit(3)).toBe(100);
    expect(scoreDaysSinceLastCommit(45)).toBe(50);
    expect(scoreDaysSinceLastCommit(200)).toBe(0);
    expect(scorePrMergeDays(5)).toBe(80);
    expect(scoreIssueResponseDays(0.5)).toBe(100);
    expect(scoreIssuesClosedPercent(62)).toBe(70);
  });

  it("aggregates weighted health scores and formats the breakdown", () => {
    const result = aggregateRepoHealth({
      daysSinceLastCommit: 3,
      medianPrMergeDays: 5,
      medianIssueResponseDays: 2,
      issuesClosedPercent90d: 62
    });

    expect(result.healthScore).toBe(84);
    expect(result.healthBreakdown.lastCommit).toBe("3 days ago");
    expect(result.healthBreakdown.prMergeRate).toBe("Median 5 days");
    expect(result.healthBreakdown.issueResponseTime).toBe("Median 2 days");
    expect(result.healthBreakdown.issuesClosed90d).toBe("62%");
  });

  it("uses neutral unknown scoring when a signal cannot be measured", () => {
    expect(aggregateRepoHealth({}).healthScore).toBe(50);
    expect(unknownRepoHealth().healthBreakdown.notes?.[0]).toContain("neutral score");
  });

  it("builds maintainer health notes for SPEC edge cases", () => {
    expect(maintainerHealthNotes({ mergeSampleCount: 0, issueResponseSampleCount: 0 })).toEqual([
      "No recent merged PRs; PR merge signal uses neutral score.",
      "No recent issue response samples; response signal uses neutral score."
    ]);
    expect(maintainerHealthNotes({ mergeSampleCount: 5, issueResponseSampleCount: 3, contributorCount: 1 })).toContain(
      "Solo Maintainer: recent activity appears to come from one contributor."
    );
    expect(maintainerHealthNotes({ mergeSampleCount: 5, issueResponseSampleCount: 3, commitHistoryUnavailable: true })).toContain(
      "Commit history unavailable; repository may have been recently transferred."
    );
  });

  it("calculates medians and day differences defensively", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 5])).toBe(3);
    expect(daysBetween("2026-06-01T00:00:00Z", "2026-06-03T12:00:00Z")).toBe(2.5);
    expect(daysBetween("bad", "2026-06-03T12:00:00Z")).toBeNull();
  });
});
