import type { AppState, ImplementationPlan, Issue, Repository, SkillProfile } from "@/lib/types";

const now = new Date("2026-06-21T10:00:00.000Z");
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

export const demoProfile: SkillProfile = {
  languages: [
    { name: "TypeScript", percentage: 42, bytes: 780000 },
    { name: "Go", percentage: 29, bytes: 520000 },
    { name: "Python", percentage: 18, bytes: 330000 },
    { name: "Rust", percentage: 11, bytes: 198000 }
  ],
  frameworks: ["React", "Next.js", "Node.js", "PostgreSQL", "Tailwind CSS"],
  difficulty: "Intermediate",
  preferredDomain: "Developer Tools",
  totalRepos: 23,
  totalMergedPRs: 7,
  analyzedAt: now.toISOString(),
  expiresAt: tomorrow.toISOString()
};

export const demoRepos: Repository[] = [
  {
    id: "repo_lumi",
    githubRepoId: 8213371,
    fullName: "luminous-dev/lumi",
    description: "A package registry explorer for terminal-first developers.",
    language: "Go",
    stars: 1280,
    forks: 143,
    healthScore: 91,
    healthBreakdown: {
      lastCommit: "3 days ago",
      prMergeRate: "Median 2.4 days",
      issueResponseTime: "Median 9 hours",
      issuesClosed90d: "84%",
      notes: ["Responsive maintainers", "Beginner-friendly labels are curated"]
    },
    skillMatchScore: 88,
    finalScore: 90
  },
  {
    id: "repo_astrokit",
    githubRepoId: 9142112,
    fullName: "orbit-labs/astrokit",
    description: "Reusable dashboard primitives for open-source data products.",
    language: "TypeScript",
    stars: 5320,
    forks: 410,
    healthScore: 76,
    healthBreakdown: {
      lastCommit: "11 days ago",
      prMergeRate: "Median 5.8 days",
      issueResponseTime: "Median 2 days",
      issuesClosed90d: "62%",
      notes: ["Maintainers batch reviews twice weekly"]
    },
    skillMatchScore: 94,
    finalScore: 85
  },
  {
    id: "repo_pytrail",
    githubRepoId: 6291144,
    fullName: "maple-labs/pytrail",
    description: "A Python CLI for tracing data pipeline execution locally.",
    language: "Python",
    stars: 860,
    forks: 89,
    healthScore: 64,
    healthBreakdown: {
      lastCommit: "28 days ago",
      prMergeRate: "Median 12 days",
      issueResponseTime: "Median 4 days",
      issuesClosed90d: "48%",
      notes: ["Solo maintainer", "Expect slower review"]
    },
    skillMatchScore: 72,
    finalScore: 68
  }
];

export const demoIssues: Issue[] = [
  {
    id: "issue_notes_table",
    repoId: "repo_lumi",
    githubIssueNumber: 214,
    githubNodeId: "I_kwDOLumi214",
    githubUrl: "https://github.com/luminous-dev/lumi/issues/214",
    title: "Package info command ignores notes table",
    body: "The info command currently displays package metadata, but notes attached by maintainers are missing from the output.",
    labels: ["good first issue", "bug", "cli"],
    difficulty: "Beginner",
    timeEstimateMins: 45,
    aiSummary: "The package info command fetches counts for core metadata but skips maintainer notes. The likely fix is a small query and formatter update in the info command path.",
    likelyFiles: [
      { path: "cmd/info.go", reason: "Owns the info command query and output formatting." },
      { path: "internal/models/package.go", reason: "PackageInfo needs a notes count field for scanning." }
    ],
    issueContext: {
      problem: "The `info` command does not show package notes even though the database already stores them.",
      context: "New contributors can fix this without learning the whole project because the issue is isolated to one CLI command and one model.",
      gotchas: ["Check existing output snapshot tests before changing labels.", "Avoid editing generated files in dist/."],
      questionsToAsk: ["Should notes be counted or fully listed in the CLI output?"],
      type: "bug"
    },
    explainedAt: new Date("2026-06-21T10:15:00.000Z").toISOString(),
    saved: false,
    dismissed: false,
    state: "open"
  },
  {
    id: "issue_filter_persistence",
    repoId: "repo_astrokit",
    githubIssueNumber: 88,
    githubNodeId: "I_kwDOAstro88",
    githubUrl: "https://github.com/orbit-labs/astrokit/issues/88",
    title: "Persist dashboard filters in the URL",
    body: "Filters reset when users share dashboard links, which makes collaboration harder.",
    labels: ["help wanted", "frontend", "good first issue"],
    difficulty: "Intermediate",
    timeEstimateMins: 120,
    aiSummary: "Dashboard filters should be mirrored into query parameters and restored on load. The work touches the filter state hook and dashboard route component.",
    likelyFiles: [
      { path: "src/hooks/use-dashboard-filters.ts", reason: "Central filter state management lives here." },
      { path: "src/app/dashboard/page.tsx", reason: "Reads URL params and renders filter controls." }
    ],
    issueContext: {
      problem: "Dashboard filters are local-only, so shared links lose user-selected context.",
      context: "URL persistence improves collaboration and makes bug reports reproducible.",
      gotchas: ["Avoid pushing history entries on every keystroke.", "Keep existing default filter behavior."],
      questionsToAsk: ["Should all filters be shareable or only stable filters like status and owner?"],
      type: "feature"
    },
    explainedAt: new Date("2026-06-21T10:20:00.000Z").toISOString(),
    saved: true,
    dismissed: false,
    state: "open"
  },
  {
    id: "issue_pytrail_docs",
    repoId: "repo_pytrail",
    githubIssueNumber: 52,
    githubNodeId: "I_kwDOPytrail52",
    githubUrl: "https://github.com/maple-labs/pytrail/issues/52",
    title: "Document local plugin discovery",
    body: "Users can write local plugins but the documentation does not show the discovery rules.",
    labels: ["documentation", "help wanted"],
    difficulty: "Beginner",
    timeEstimateMins: 35,
    aiSummary: "The plugin discovery behavior exists but is undocumented. This is a docs-first issue with a light source-code read to verify exact directory precedence.",
    likelyFiles: [
      { path: "docs/plugins.md", reason: "Primary user-facing plugin documentation." },
      { path: "pytrail/plugins/discovery.py", reason: "Source of truth for discovery order." }
    ],
    issueContext: {
      problem: "Plugin discovery works, but users have no clear guide for local plugin folders.",
      context: "Good documentation will reduce repeated maintainer questions and help new plugin authors.",
      gotchas: ["Verify discovery order in code instead of guessing.", "Docs-only PRs should include preview screenshots if supported."],
      questionsToAsk: ["Should examples include Windows paths?"],
      type: "docs"
    },
    explainedAt: new Date("2026-06-21T10:25:00.000Z").toISOString(),
    saved: false,
    dismissed: false,
    state: "open"
  }
];

export const demoPlans: Record<string, ImplementationPlan> = {
  issue_notes_table: {
    id: "plan_issue_notes_table",
    issueId: "issue_notes_table",
    steps: [
      {
        step: 1,
        title: "Trace the info command query",
        description: "Open cmd/info.go and locate the query builder used by the package info command.",
        files: ["cmd/info.go"],
        tips: ["Read nearby count helpers before changing SQL."]
      },
      {
        step: 2,
        title: "Add the notes count",
        description: "Join the notes table or add a correlated count so package notes appear beside existing package metadata.",
        files: ["cmd/info.go", "internal/models/package.go"],
        tips: ["Keep the new field nullable-safe for packages with no notes."]
      },
      {
        step: 3,
        title: "Update output formatting",
        description: "Render the notes count in the same table style as dependencies and versions.",
        files: ["cmd/info.go"],
        tips: ["Use the existing formatter helper instead of adding custom spacing."]
      },
      {
        step: 4,
        title: "Run focused tests",
        description: "Run the command tests and update snapshots only if the output change is intentional.",
        files: ["cmd/info_test.go"],
        command: "go test ./cmd/...",
        tips: ["Attach before/after CLI output to the PR."]
      }
    ],
    prTitle: "fix: include notes in package info output",
    prDescription:
      "## Summary\n\nAdds package notes to the info command output so maintainers can see note coverage from the CLI.\n\n## Changes\n\n- Adds notes count to the package info query\n- Extends the package info model\n- Updates info output formatting\n\n## Testing\n\n- go test ./cmd/...\n\n## Related Issue\n\nCloses #214",
    generatedAt: new Date("2026-06-21T10:30:00.000Z").toISOString()
  }
};

export function createInitialState(): AppState {
  return {
    user: {
      id: "user_demo",
      githubLogin: "demo-contributor",
      avatarUrl: "https://github.com/github.png",
      role: "user"
    },
    profile: demoProfile,
    repos: demoRepos,
    issues: demoIssues,
    plans: demoPlans,
    jobs: {}
  };
}
