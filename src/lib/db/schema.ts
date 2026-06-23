import { bigint, boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").notNull().unique(),
  githubLogin: text("github_login").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("github"),
    providerAccountId: text("provider_account_id").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    scope: text("scope").notNull(),
    tokenType: text("token_type"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    providerAccountUnique: uniqueIndex("oauth_accounts_provider_account_unique").on(table.provider, table.providerAccountId)
  })
);

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionTokenHash: text("session_token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const skillProfiles = pgTable(
  "skill_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    languages: jsonb("languages").notNull().default([]),
    frameworks: jsonb("frameworks").notNull().default([]),
    difficulty: text("difficulty").notNull(),
    preferredDomain: text("preferred_domain"),
    totalRepos: integer("total_repos"),
    totalPrs: integer("total_prs"),
    rawData: jsonb("raw_data"),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userProfileUnique: uniqueIndex("skill_profiles_user_unique").on(table.userId)
  })
);

export const discoveredRepos = pgTable(
  "discovered_repos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    githubRepoId: bigint("github_repo_id", { mode: "number" }).notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    language: text("language"),
    stars: integer("stars"),
    forks: integer("forks"),
    healthScore: integer("health_score"),
    healthBreakdown: jsonb("health_breakdown"),
    skillMatchScore: integer("skill_match_score"),
    finalScore: integer("final_score"),
    metadataExpiresAt: timestamp("metadata_expires_at", { withTimezone: true }).defaultNow(),
    healthExpiresAt: timestamp("health_expires_at", { withTimezone: true }).defaultNow(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userRepoUnique: uniqueIndex("discovered_repos_user_repo_unique").on(table.userId, table.githubRepoId)
  })
);

export const discoveredIssues = pgTable(
  "discovered_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    repoId: uuid("repo_id").references(() => discoveredRepos.id, { onDelete: "cascade" }),
    githubIssueNumber: integer("github_issue_number").notNull(),
    githubNodeId: text("github_node_id"),
    title: text("title").notNull(),
    body: text("body"),
    labels: jsonb("labels").default([]),
    difficultyEstimate: text("difficulty_estimate"),
    timeEstimateMins: integer("time_estimate_mins"),
    aiSummary: text("ai_summary"),
    likelyFiles: jsonb("likely_files").default([]),
    issueContext: jsonb("issue_context").default({}),
    githubUrl: text("github_url"),
    state: text("state").default("open"),
    explainedAt: timestamp("explained_at", { withTimezone: true }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).defaultNow(),
    saved: boolean("saved").default(false),
    dismissed: boolean("dismissed").default(false)
  },
  (table) => ({
    userRepoIssueUnique: uniqueIndex("discovered_issues_user_repo_issue_unique").on(table.userId, table.repoId, table.githubIssueNumber)
  })
);

export const implementationPlans = pgTable(
  "implementation_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => discoveredIssues.id, { onDelete: "cascade" }),
    steps: jsonb("steps").notNull().default([]),
    prTitle: text("pr_title"),
    prDescription: text("pr_description"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow()
  },
  (table) => ({
    userIssuePlanUnique: uniqueIndex("implementation_plans_user_issue_unique").on(table.userId, table.issueId)
  })
);

export const agentJobs = pgTable("agent_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  status: text("status").default("queued"),
  queueJobId: text("queue_job_id"),
  resultId: uuid("result_id"),
  inputPayload: jsonb("input_payload"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
