import type { HealthBreakdown } from "@/lib/types";

export interface RepoHealthSignals {
  daysSinceLastCommit?: number | null;
  medianPrMergeDays?: number | null;
  medianIssueResponseDays?: number | null;
  issuesClosedPercent90d?: number | null;
  notes?: string[];
}

export interface RepoHealthResult {
  healthScore: number;
  healthBreakdown: HealthBreakdown;
}

export function scoreDaysSinceLastCommit(days: number | null | undefined) {
  if (days == null) return 50;
  if (days < 7) return 100;
  if (days < 30) return 80;
  if (days < 90) return 50;
  if (days > 180) return 0;
  return 25;
}

export function scorePrMergeDays(days: number | null | undefined) {
  if (days == null) return 50;
  if (days < 3) return 100;
  if (days < 7) return 80;
  if (days < 30) return 50;
  if (days > 60) return 0;
  return 25;
}

export function scoreIssueResponseDays(days: number | null | undefined) {
  if (days == null) return 50;
  if (days < 1) return 100;
  if (days < 3) return 80;
  if (days < 7) return 50;
  if (days > 14) return 0;
  return 25;
}

export function scoreIssuesClosedPercent(percent: number | null | undefined) {
  if (percent == null) return 50;
  if (percent > 80) return 100;
  if (percent > 50) return 70;
  if (percent > 20) return 40;
  return 0;
}

export function aggregateRepoHealth(signals: RepoHealthSignals): RepoHealthResult {
  const lastCommitScore = scoreDaysSinceLastCommit(signals.daysSinceLastCommit);
  const prMergeScore = scorePrMergeDays(signals.medianPrMergeDays);
  const issueResponseScore = scoreIssueResponseDays(signals.medianIssueResponseDays);
  const issuesClosedScore = scoreIssuesClosedPercent(signals.issuesClosedPercent90d);

  return {
    healthScore: Math.round(lastCommitScore * 0.3 + prMergeScore * 0.25 + issueResponseScore * 0.25 + issuesClosedScore * 0.2),
    healthBreakdown: {
      lastCommit: formatDaysAgo(signals.daysSinceLastCommit),
      prMergeRate: formatMedianDays("Median", signals.medianPrMergeDays),
      issueResponseTime: formatMedianDays("Median", signals.medianIssueResponseDays),
      issuesClosed90d: typeof signals.issuesClosedPercent90d === "number" ? `${Math.round(signals.issuesClosedPercent90d)}%` : "Unknown",
      notes: signals.notes
    }
  };
}

export function unknownRepoHealth(note = "Health scoring unavailable; using neutral score."): RepoHealthResult {
  return {
    healthScore: 50,
    healthBreakdown: {
      lastCommit: "Unknown",
      prMergeRate: "Unknown",
      issueResponseTime: "Unknown",
      issuesClosed90d: "Unknown",
      notes: [note]
    }
  };
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] ?? null;
  const left = sorted[middle - 1];
  const right = sorted[middle];
  return typeof left === "number" && typeof right === "number" ? (left + right) / 2 : null;
}

export function daysBetween(start: string | Date, end: string | Date) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return (endMs - startMs) / (24 * 60 * 60 * 1000);
}

function formatDaysAgo(days: number | null | undefined) {
  if (days == null) return "Unknown";
  if (days < 1) return "Today";
  const rounded = Math.round(days);
  return `${rounded} ${rounded === 1 ? "day" : "days"} ago`;
}

function formatMedianDays(prefix: string, days: number | null | undefined) {
  if (days == null) return "Unknown";
  if (days < 1) return `${prefix} ${Math.round(days * 24)} hours`;
  const rounded = Math.round(days * 10) / 10;
  return `${prefix} ${rounded} ${rounded === 1 ? "day" : "days"}`;
}
