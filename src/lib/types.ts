export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface SkillProfile {
  languages: { name: string; percentage: number; bytes?: number }[];
  frameworks: string[];
  difficulty: Difficulty;
  preferredDomain: string | null;
  totalRepos: number;
  totalMergedPRs: number;
  analyzedAt: string;
  expiresAt: string;
}

export interface HealthBreakdown {
  lastCommit: string;
  prMergeRate: string;
  issueResponseTime: string;
  issuesClosed90d: string;
  notes?: string[];
}

export interface Repository {
  id: string;
  githubRepoId: number;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  healthScore: number;
  healthBreakdown: HealthBreakdown;
  skillMatchScore: number;
  finalScore: number;
}

export interface LikelyFile {
  path: string;
  reason: string;
}

export interface IssueContext {
  problem: string;
  context: string;
  gotchas: string[];
  questionsToAsk: string[];
  type: "bug" | "feature" | "docs" | "maintenance";
  originalLanguage?: string;
  stale?: boolean;
}

export interface Issue {
  id: string;
  repoId: string;
  githubIssueNumber: number;
  githubNodeId: string;
  githubUrl: string;
  title: string;
  body: string;
  labels: string[];
  difficulty: Difficulty;
  timeEstimateMins: number;
  aiSummary: string;
  likelyFiles: LikelyFile[];
  issueContext: IssueContext;
  explainedAt?: string | null;
  saved: boolean;
  dismissed: boolean;
  state: "open" | "closed";
}

export interface IssueExplanationResult {
  issueContext: IssueContext;
  likelyFiles?: LikelyFile[];
  difficulty?: Difficulty;
  timeEstimateMins?: number;
}

export interface PlanStep {
  step: number;
  title: string;
  description: string;
  files: string[];
  tips: string[];
  command?: string;
}

export interface ImplementationPlan {
  id: string;
  issueId: string;
  steps: PlanStep[];
  prTitle: string;
  prDescription: string;
  generatedAt: string;
}

export interface AgentJob {
  id: string;
  type: "profile_analysis" | "issue_discovery" | "issue_explanation" | "plan" | "pr_draft";
  status: JobStatus;
  stage: string;
  progress: number;
  resultId?: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AppState {
  user: {
    id: string;
    githubLogin: string;
    avatarUrl: string;
    role: "user" | "admin";
  };
  profile: SkillProfile;
  repos: Repository[];
  issues: Issue[];
  plans: Record<string, ImplementationPlan>;
  jobs: Record<string, AgentJob>;
}
