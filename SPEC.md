# SPEC.md — Open Source Contribution Agent
## Full End-to-End Web Application Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-06-21

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Personas](#3-user-personas)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack](#5-tech-stack)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Database Schema](#7-database-schema)
8. [Agent System Design](#8-agent-system-design)
9. [API Specification](#9-api-specification)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [Edge Cases & Error Handling](#11-edge-cases--error-handling)
12. [Rate Limiting & Quotas](#12-rate-limiting--quotas)
13. [Security Considerations](#13-security-considerations)
14. [Performance & Caching](#14-performance--caching)
15. [Observability & Logging](#15-observability--logging)
16. [Data Privacy & Compliance](#16-data-privacy--compliance)
17. [Testing Strategy](#17-testing-strategy)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [MVP Scope vs. Future Phases](#19-mvp-scope-vs-future-phases)
20. [Open Questions](#20-open-questions)

---

## 1. Product Overview

**Name:** ContribPath (working title)

**Tagline:** From zero to first PR in under an hour.

**One-liner:** An AI-powered multi-agent web application that analyses a developer's GitHub profile, identifies suitable open source issues, explains the codebase in plain language, and generates an implementation plan — collapsing 4–20 hours of onboarding into a guided 30-minute flow.

### Core User Journey

```
Sign in with GitHub
      │
      ▼
Agent analyses your profile (languages, PRs, stars)
      │
      ▼
Top 10 personalised repository + issue matches displayed
      │
      ▼
User picks an issue
      │
      ▼
AI explains: problem, affected files, fix strategy, time estimate
      │
      ▼
Step-by-step implementation plan generated
      │
      ▼
Draft PR title + description generated
      │
      ▼
User opens issue on GitHub and contributes
```

---

## 2. Goals & Non-Goals

### Goals (MVP)

- GitHub OAuth login; optionally connect GitLab.
- Skill analysis from public GitHub data (no private repo access required).
- Personalised issue discovery ranked by skill fit, project health, and maintainer responsiveness.
- AI-powered issue explanation (problem summary, file pointers, time estimate).
- Step-by-step implementation plan per issue.
- Draft PR description generator.
- Project health scoring (last commit, PR merge rate, issue response time).
- Persistent user session with saved issues and plans.

### Goals (Phase 2)

- Autonomous branch creation and draft implementation via GitHub API.
- GitLab and Bitbucket integration.
- Portfolio website parsing to extract non-GitHub skills.
- Maintainer-side bot / GitHub App for auto-labelling issues.
- Slack / Discord notifications for issue activity.
- Community leaderboard (Hacktoberfest, GSoC mode).

### Non-Goals (explicitly out of scope for MVP)

- Running / executing user code in the cloud.
- Writing or committing code on behalf of the user autonomously.
- Private repository analysis.
- Monetisation / payment flows.
- Mobile native apps.

---

## 3. User Personas

### Persona A — The First-Timer
- Computer science student or bootcamp graduate.
- Has 1–3 personal projects on GitHub, no open source contributions.
- Goal: Get a "good first issue" merged to improve CV.
- Pain point: Doesn't know where to start; overwhelmed by large codebases.

### Persona B — The GSoC / Hacktoberfest Participant
- Intermediate developer with 2–4 years of experience.
- Wants to contribute to a specific ecosystem (e.g., CNCF, Rust, Python).
- Goal: Find meaningful issues that match their skill level.
- Pain point: Wastes time on issues that turn out to be too hard or already claimed.

### Persona C — The Career Switcher
- Backend developer wanting to contribute to frontend projects (or vice versa).
- Has skills but unfamiliar with open source norms.
- Goal: Learn contribution etiquette while making a real contribution.

### Persona D — The Maintainer (Phase 2)
- Maintains a mid-sized open source project.
- Goal: Attract quality first-time contributors; reduce repetitive issue explanation.

---

## 4. System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Next.js)                    │
│  Auth Pages │ Dashboard │ Issue Explorer │ Plan View     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST + SSE
┌──────────────────────────▼──────────────────────────────┐
│                  Next.js API Routes (BFF)                 │
│  /api/auth  /api/v1/profile  /api/v1/issues  /api/v1/plan │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
┌─────────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
│  Agent         │ │  GitHub API  │ │  LLM Gateway │
│  Orchestrator  │ │ REST/GraphQL │ │  (Anthropic/ │
│  (TypeScript)  │ │   octokit)   │ │   OpenAI)    │
└────────┬───────┘ └──────────────┘ └──────────────┘
         │
    ┌────┴──────────────────────────────────┐
    │           Agent Workers               │
    │  ┌──────────┐  ┌──────────────────┐  │
    │  │  Skill   │  │   Repository     │  │
    │  │ Analysis │  │   Discovery      │  │
    │  └──────────┘  └──────────────────┘  │
    │  ┌──────────┐  ┌──────────────────┐  │
    │  │Maintainer│  │     Issue        │  │
    │  │ Activity │  │  Understanding   │  │
    │  └──────────┘  └──────────────────┘  │
    │  ┌──────────┐  ┌──────────────────┐  │
    │  │Codebase  │  │  Implementation  │  │
    │  │Navigation│  │     Planner      │  │
    │  └──────────┘  └──────────────────┘  │
    │  ┌──────────┐                        │
    │  │PR Draft  │                        │
    │  │ Agent    │                        │
    │  └──────────┘                        │
    └───────────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│            PostgreSQL (Supabase)         │
│ users │ auth │ analyses │ issues │ plans  │
└────────────────────────────────────────┘
         │
┌────────▼────────┐   ┌────────────────┐
│ Redis Cache/Rate │   │ Durable Redis  │
│ Limits           │   │ (BullMQ jobs)  │
└─────────────────┘   └────────────────┘
```

### Agent Orchestration Model

Each user action that triggers AI work is enqueued as a **job** in BullMQ. Jobs are picked up by worker processes. Agents are stateless TypeScript functions; they share a common context object passed through the pipeline:

```typescript
interface AgentContext {
  userId: string;
  sessionId: string;
  githubToken: string;           // user's OAuth token (scoped read-only)
  githubUsername: string;
  skillProfile?: SkillProfile;
  candidateRepos?: Repository[];
  selectedIssue?: Issue;
  issueContext?: IssueContext;
  plan?: ImplementationPlan;
}
```

Agent pipeline (sequential with optional parallelism):

```
[Skill Analysis Agent]
        │
        ├──────────────────────────────────┐
        │                                  │
[Repository Discovery Agent]   [Maintainer Activity Agent]
        │                                  │
        └──────────────┬───────────────────┘
                       │ merge & rank
               [Issue Understanding Agent]
                       │
               [Codebase Navigation Agent]  ← spawned on-demand
                       │
               [Implementation Planner Agent]
                       │
               [PR Draft Agent]
```

---

## 5. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, API routes, excellent DX |
| Language | TypeScript (strict) | Type safety across full stack |
| Styling | Tailwind CSS + shadcn/ui customised with `DESIGN.md` tokens | Accessible primitives with a bespoke visual system |
| Motion | Framer Motion + CSS custom properties | Spring interactions, staggered entry, spotlight cards |
| Icons | Phosphor Icons | Consistent developer-tool iconography matching `sample.html` |
| Fonts | Space Grotesk, Inter, JetBrains Mono | Matches the Obsidian & Neon design language |
| Auth | NextAuth.js v5 | GitHub OAuth, session management |
| Database | PostgreSQL via Supabase | Managed Postgres, auth hooks, storage |
| ORM | Drizzle ORM | Type-safe, lightweight, great migrations |
| Cache | Redis (Upstash or managed Redis) | Profile cache, rate limiting |
| Queue | BullMQ + durable Redis (Railway Redis / Redis Cloud) | Background agent jobs; requires Redis protocol support and persistence |
| LLM | Anthropic Claude (primary) | Best at code reasoning |
| GitHub API | Octokit (REST + GraphQL) | Typed, rate-limit-aware |
| Deployment | Vercel (frontend) + Railway (workers) | Scalable, easy CI/CD |
| Monitoring | Sentry + PostHog | Error tracking + product analytics |
| Testing | Vitest + Playwright | Unit, integration, E2E |

---

## 6. Authentication & Authorization

### GitHub OAuth Flow

1. User clicks "Sign in with GitHub".
2. Redirect to `https://github.com/login/oauth/authorize` with scopes:
   - `read:user` — username, avatar, bio
   - `read:org` — org membership (optional; used for filtering org repos)
   - `user:email` — verified email address (optional; request only if email-based notifications are enabled)
3. Callback at `/api/auth/callback/github`.
4. NextAuth creates an HttpOnly session cookie containing only a session identifier.
5. The GitHub access token is encrypted server-side in the database so API routes and workers can use it.
6. Token is **never** sent to the client browser.

### Scopes Policy

The app requests **minimum required scopes**. Public repository metadata, public issues, and public code can be read through authenticated GitHub API calls without requesting `public_repo`. That scope is intentionally excluded in MVP because it grants broader public repository permissions than read-only discovery needs.

If a user declines `read:org`, org repos are excluded from analysis — the app degrades gracefully, not crashes. If `user:email` is declined or not requested, the user's email remains null and email notifications are disabled.

If the user's GitHub access token is revoked or their account is suspended/deleted, the next API request will fail with 401. The app clears the session, redirects to sign-in, and displays: "Your GitHub connection was lost. Please sign in again."

### Session Management

- Sessions expire after 30 days of inactivity using a sliding session window (`maxAge` 30 days, `updateAge` 24 hours).
- GitHub OAuth access tokens are treated as revocable credentials. If expiring user tokens are enabled for the GitHub OAuth app, refresh tokens are stored encrypted and rotated according to GitHub's expiry metadata.
- On token revocation (user disconnects from GitHub settings), next GitHub API request returns 401 → encrypted token is marked revoked, session is cleared, user is redirected to sign-in.

### Role Model (MVP)

| Role | Access |
|---|---|
| `user` | Own profile, own analyses, public repo data |
| `admin` | All user data (internal dashboard only) |

---

## 7. Database Schema

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     TEXT UNIQUE NOT NULL,
  github_login  TEXT NOT NULL,
  email         TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- OAuth credentials for server-side GitHub API access.
-- access_token_encrypted and refresh_token_encrypted are encrypted with app-managed AES-256-GCM keys.
CREATE TABLE oauth_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL DEFAULT 'github',
  provider_account_id     TEXT NOT NULL,
  access_token_encrypted  TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scope                   TEXT NOT NULL,
  token_type              TEXT,
  expires_at              TIMESTAMPTZ,
  revoked_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Server-side web sessions. The browser stores only the opaque session token in an HttpOnly cookie;
-- the database stores a hash of that token.
CREATE TABLE auth_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT UNIQUE NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_auth_sessions_updated_at
  BEFORE UPDATE ON auth_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Skill profiles (cached analysis results)
CREATE TABLE skill_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  languages       JSONB NOT NULL DEFAULT '[]',   -- [{name, percentage, bytes}]
  frameworks      JSONB NOT NULL DEFAULT '[]',
  difficulty      TEXT NOT NULL,                 -- "Beginner" | "Intermediate" | "Advanced"
  preferred_domain TEXT,
  total_repos     INT,
  total_prs       INT,
  raw_data        JSONB,                         -- full GitHub API response snapshot
  analyzed_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(user_id)
);

-- Discovered repositories
CREATE TABLE discovered_repos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id      BIGINT NOT NULL,
  full_name           TEXT NOT NULL,              -- "owner/repo"
  description         TEXT,
  language            TEXT,
  stars               INT,
  forks               INT,
  health_score        INT,                        -- 0–100
  health_breakdown    JSONB,                      -- {lastCommit, prMergeRate, issueResponseTime}
  skill_match_score   INT,                        -- 0–100
  final_score         INT,                        -- weighted composite
  metadata_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  health_expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours'),
  discovered_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_repo_id)
);

-- Issues
CREATE TABLE discovered_issues (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  repo_id             UUID REFERENCES discovered_repos(id) ON DELETE CASCADE,
  github_issue_number INT NOT NULL,
  github_node_id      TEXT,                          -- GitHub global node ID for cross-reference
  title               TEXT NOT NULL,
  body                TEXT,
  labels              JSONB DEFAULT '[]',
  difficulty_estimate TEXT,                       -- "Beginner" | "Intermediate" | "Advanced"
  time_estimate_mins  INT,
  ai_summary          TEXT,
  likely_files        JSONB DEFAULT '[]',         -- [{path, reason}]
  issue_context       JSONB DEFAULT '{}',         -- {problem, context, gotchas, questionsToAsk, type, originalLanguage, stale}
  github_url          TEXT,
  state               TEXT DEFAULT 'open',
  explained_at        TIMESTAMPTZ,
  discovered_at       TIMESTAMPTZ DEFAULT NOW(),
  saved               BOOLEAN DEFAULT FALSE,
  dismissed           BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, repo_id, github_issue_number)
);

-- Implementation plans
CREATE TABLE implementation_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  issue_id        UUID REFERENCES discovered_issues(id) ON DELETE CASCADE,
  steps           JSONB NOT NULL DEFAULT '[]',   -- [{step, description, files, tips}]
  pr_title        TEXT,
  pr_description  TEXT,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, issue_id)
);

-- Agent job tracking
CREATE TABLE agent_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL,                 -- "profile_analysis" | "issue_discovery" | "plan"
  status          TEXT DEFAULT 'queued',         -- "queued" | "running" | "done" | "failed"
  queue_job_id    TEXT,                          -- BullMQ job ID
  result_id       UUID,                          -- FK to the entity created by this job (polymorphic)
  input_payload   JSONB,                         -- job input for idempotency checks
  error           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_skill_profiles_user_id ON skill_profiles(user_id);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_discovered_repos_user_id ON discovered_repos(user_id);
CREATE INDEX idx_discovered_issues_user_id ON discovered_issues(user_id);
CREATE INDEX idx_discovered_issues_repo_id ON discovered_issues(repo_id);
CREATE INDEX idx_agent_jobs_user_id_status ON agent_jobs(user_id, status);
```

---

## 8. Agent System Design

### 8.1 Skill Analysis Agent

**Input:** GitHub OAuth token + username  
**Output:** `SkillProfile`

**Steps:**

1. Fetch user's public repos (up to 100, sorted by `pushed_at`).
2. Aggregate language bytes across all repos → compute percentage distribution.
3. Scan README and `package.json` / `go.mod` / `requirements.txt` / `Cargo.toml` in top 10 repos → extract framework names.
4. Fetch user's merged PRs (via GitHub search API: `is:pr is:merged author:USERNAME`).
5. Examine PR target repos → infer domain (e.g., "CLI tools", "web frameworks", "databases").
6. Score difficulty:
   - Beginner: < 5 merged PRs to external repos, only personal projects
   - Intermediate: 5–20 merged PRs, some to popular repos (> 500 stars)
   - Advanced: > 20 merged PRs, contributions to repos > 5k stars

**Edge Cases:**

- User has 0 public repos → return `difficulty: "Beginner"`, empty languages; skip to default repo suggestions.
- User has repos but no commits (all forks with no changes) → treat as Beginner.
- GitHub API returns 403 (rate limit) → return cached profile if < 24h old; else show "Try again in X minutes."
- User's primary language is one not supported by LLM code analysis (rare markup-only repos) → fall back to "scripting/web" domain.
- Bot/org accounts masquerading as users → detect via `type: "Organization"` in GitHub response; block analysis, show error.

**Output Schema:**

```typescript
interface SkillProfile {
  languages: { name: string; percentage: number }[];
  frameworks: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  preferredDomain: string | null;
  totalRepos: number;
  totalMergedPRs: number;
}
```

---

### 8.2 Repository Discovery Agent

**Input:** `SkillProfile`  
**Output:** Up to 20 ranked `Repository` objects

**Steps:**

1. Construct GitHub Issues Search queries and group results by repository:
   - `is:issue is:open label:"good first issue" language:<primary_language> no:assignee`
   - `is:issue is:open label:"help wanted" language:<primary_language> no:assignee`
   - Query repeated for top 3 languages. Run label queries separately because multiple `label:` qualifiers are treated as an AND filter.
2. Filter out repos where:
   - Last commit > 6 months ago.
   - Open issues count > 1,000 (signal: overwhelmed maintainers).
   - Stars < 50 (signal: no community).
   - Stars > 100,000 (signal: intimidating for beginners; only include if difficulty = Advanced).
   - Repo has `archived: true`.
   - User has already contributed (has merged PR in that repo).
3. Score each remaining repo:

```
skill_match_score = (primary_language_match × 0.5) + (framework_overlap × 0.3) + (domain_match × 0.2)
```

4. Enqueue discovered repos for Maintainer Activity Agent in parallel.

**Edge Cases:**

- GitHub Issues Search returns 0 results for primary language → fallback to "JavaScript" or "Python" as widely-available.
- All top results are the same repo from different queries → deduplicate by `repo.id`.
- User's languages are all Jupyter Notebook / Markdown → treat as Python-adjacent, suggest data science repos.
- GitHub search API quota exhausted (10 req/min unauthenticated, 30/min authenticated) → queue and retry with exponential backoff up to 3 attempts; surface partial results if at least 5 repos found.
- Repo has no `language` tag (e.g., docs-only repos) → include only if skill profile includes `Documentation` or `Technical Writing`.

---

### 8.3 Maintainer Activity Agent

**Input:** List of `Repository` objects  
**Output:** Each repo annotated with `HealthScore` (0–100) and `healthBreakdown`

**Scoring Formula:**

| Signal | Weight | How measured |
|---|---|---|
| Days since last commit | 30% | < 7d → 100, < 30d → 80, < 90d → 50, > 180d → 0 |
| PR median merge time | 25% | < 3d → 100, < 7d → 80, < 30d → 50, > 60d → 0 |
| Issue first-response time | 25% | < 1d → 100, < 3d → 80, < 7d → 50, > 14d → 0 |
| % of issues closed (90d) | 20% | > 80% → 100, > 50% → 70, > 20% → 40, < 20% → 0 |

**Steps:**

1. For each repo, fetch last 20 merged PRs via GraphQL.
2. Compute median time from PR creation to merge.
3. Fetch last 30 issues, find first maintainer response, compute median.
4. Fetch commit activity for last 90 days.
5. Aggregate into `healthScore`.

**Edge Cases:**

- Repo has no merged PRs (brand new) → mark PR merge time as `unknown` and use a neutral score of 50 for that signal rather than treating it as instant or failed.
- Repo is maintained by a single person who batch-merges PRs monthly → low score despite being active; flag as "Solo Maintainer" in UI.
- GraphQL rate limit hit → fall back to REST endpoints for the same data; if both fail, mark health as "Unknown" rather than blocking the result.
- Repo recently transferred ownership (commit history gap) → score based on data available; note "recently transferred" in health breakdown.

---

### 8.4 Issue Understanding Agent

**Input:** Selected `Issue` (title, body, comments, linked PRs, labels)  
**Output:** `IssueContext` object

**Steps:**

1. Fetch full issue body + all comments via GitHub API.
2. Fetch any linked PRs (look for `#123` references in body and comments).
3. Send to LLM with structured prompt:

```
You are a senior open source contributor. Summarise this GitHub issue for a new contributor.

Issue: [title]
Body: [body]
Comments: [top 10 most relevant comments]

Return JSON:
{
  "problem": "...",           // 2-sentence plain-English summary
  "context": "...",           // why this matters
  "likely_files": [{"path": "...", "reason": "..."}],
  "time_estimate_mins": 30,   // realistic estimate
  "difficulty": "Beginner",
  "gotchas": ["..."],         // things that could trip up a newcomer
  "questions_to_ask": ["..."] // what to clarify before starting
}
```

4. Validate LLM JSON response; retry once on invalid JSON.
5. Persist result to `discovered_issues`.

**Edge Cases:**

- Issue body is empty (common with templated "WIP" issues) → use comments only; if no comments either, return summary: "Insufficient information — read the issue and ask the maintainer for clarification."
- Issue is written in a non-English language → detect language, translate summary to English; note original language.
- Issue references files that no longer exist (issue is stale) → flag as "Potentially Stale" in UI.
- Issue has 200+ comments (contentious debate) → summarise only the first 10 and last 5 comments; note "Long discussion — read carefully."
- LLM hallucinates a file path that doesn't exist → Codebase Navigation Agent validates file existence before displaying.
- Issue is actually a feature request disguised as a bug → flag with `type: "feature"` rather than `type: "bug"`.

---

### 8.5 Codebase Navigation Agent

**Input:** `Repository`, `IssueContext` (especially `likely_files`)  
**Output:** Annotated file map + function-level pointers

**Steps:**

1. Use GitHub Trees API (`GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`) to fetch the directory tree, then cap traversal to 3 levels unless `likely_files` names deeper paths.
2. For each file in `likely_files`, fetch its content via GitHub API (not clone).
3. Send file content + issue context to LLM:

```
Given this issue and these files, identify:
1. The exact function or section to modify.
2. Why it's the right place.
3. Any dependencies to be aware of.
```

4. Return structured navigation hints.

**Edge Cases:**

- File is > 1MB → use the raw blob URL when available and read only the relevant byte/line window; skip files too large for GitHub API access and tell the user to inspect them manually.
- Binary files in `likely_files` (e.g., LLM suggests modifying a PNG) → skip with note: "Agent suggested a binary file — likely an error; review manually."
- Monorepo with 10,000+ files → limit tree fetch to top-level + directories named in `likely_files` paths.
- Private subrepo / submodule → skip with note: "Submodule not accessible."
- Minified or auto-generated files (e.g., `dist/`, `vendor/`) → exclude from analysis; note to contributor: "Don't edit generated files."
- Repo uses non-standard directory conventions (e.g., Bazel WORKSPACE) → agent notes the build system and links to its contribution guide.

---

### 8.6 Implementation Planner Agent

**Input:** `IssueContext` + `CodebaseNavigation` output  
**Output:** `ImplementationPlan` with ordered steps

**Steps:**

1. Send combined context to LLM with prompt:

```
Create a numbered implementation plan for a developer fixing this issue.
Each step should be:
- Actionable (starts with a verb)
- Specific to the files identified
- Include the test step
- Include the "how to run locally" step
```

2. Parse LLM output into structured steps.
3. Append standard steps for the language:
   - For Go: `go test ./...`
   - For TypeScript: `npm test` or `pnpm test`
   - For Python: `pytest` or `python -m unittest`
   - For Rust: `cargo test`

**Edge Cases:**

- Repo has no test suite → note: "No tests found. Check if maintainers accept PRs without tests, or ask in the issue."
- Issue requires understanding a complex protocol (e.g., gRPC, WebSockets) → add a "Background reading" step with links.
- Fix requires database migration → explicitly flag: "Schema change — coordinate with maintainers before proceeding."
- Issue is cross-cutting (affects 8+ files) → flag as "Complex issue — may exceed time estimate significantly."
- Plan exceeds 10 steps → compress into phases; note that the issue may be split into sub-issues.

---

### 8.7 PR Draft Agent

**Input:** `ImplementationPlan` + `Issue`  
**Output:** PR title, description, test summary

**Template:**

```markdown
## Summary

[2-3 sentence description of what was changed and why]

## Changes

- [Bullet per meaningful change]

## Testing

[How to verify the fix]

## Related Issue

Closes #[issue_number]
```

**Edge Cases:**

- Repo has a `PULL_REQUEST_TEMPLATE.md` → fetch it and fill in its sections rather than using the default template.
- Repo uses conventional commits (detected via `.commitlintrc`) → suggest commit message format: `fix: <description>`.
- Fix is for a docs-only repo → PR description omits "Testing" section; replaces with "Preview" link placeholder.
- User hasn't made any changes yet (plan not complete) → watermark draft with "⚠️ Draft — complete your implementation before using this."

---

## 9. API Specification

Product API endpoints are under `/api/v1/`. Auth endpoints remain under NextAuth's `/api/auth/*` namespace, and health endpoints remain under `/api/health` and `/api/ready`. Authentication via session cookie (set by NextAuth).

### 9.1 Auth

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/signin` | Initiate GitHub OAuth |
| GET | `/api/auth/callback/github` | OAuth callback (handled by NextAuth) |
| POST | `/api/auth/signout` | Invalidate session |
| GET | `/api/auth/session` | Current session info |

---

### 9.2 Profile

#### `POST /api/v1/profile/analyze`

Triggers skill analysis agent for the authenticated user.

**Request:** (no body; uses session token)

**Response:**
```json
{
  "jobId": "uuid",
  "status": "queued"
}
```

**Errors:**
- `429` — Analysis already running or recently completed (< 1h ago)
- `503` — GitHub API unavailable

---

#### `GET /api/v1/profile`

Returns cached skill profile.

**Response:**
```json
{
  "languages": [{"name": "Go", "percentage": 45.2}],
  "frameworks": ["React", "Node.js"],
  "difficulty": "Intermediate",
  "preferredDomain": "Developer Tools",
  "totalRepos": 23,
  "totalMergedPRs": 7,
  "analyzedAt": "2026-06-21T10:00:00Z",
  "expiresAt": "2026-06-22T10:00:00Z"
}
```

**Errors:**
- `404` — No analysis run yet → redirect to analyze

---

### 9.3 Issues

#### `POST /api/v1/issues/discover`

Triggers Repository Discovery Agent and Maintainer Activity Agent for the authenticated user. Requires an existing skill profile; if the profile is expired, the response instructs the client to re-run profile analysis first.

**Request Body:**
```json
{
  "languages": ["Go", "TypeScript"],
  "difficulty": "Beginner",
  "refresh": false
}
```

All fields are optional. When omitted, values are inferred from the cached skill profile.

**Response:**
```json
{
  "jobId": "uuid",
  "status": "queued"
}
```

**Errors:**
- `404` — No skill profile exists yet
- `409` — Profile is expired; run `/api/v1/profile/analyze`
- `429` — Daily discovery quota reached or discovery already running

---

#### `GET /api/v1/issues`

Returns paginated list of discovered issues for the user.

**Query Params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 10 | Items per page (max 50) |
| `difficulty` | string | all | Filter: Beginner / Intermediate / Advanced |
| `language` | string | all | Filter by language |
| `saved` | bool | false | Show only saved issues |
| `min_health` | int | 0 | Minimum repo health score |

**Response:**
```json
{
  "issues": [
    {
      "id": "uuid",
      "title": "Package info command ignores notes table",
      "repo": {
        "fullName": "owner/repo",
        "stars": 1200,
        "healthScore": 91,
        "language": "Go"
      },
      "labels": ["good first issue", "bug"],
      "difficulty": "Beginner",
      "timeEstimateMins": 45,
      "aiSummary": "The info command doesn't show notes...",
      "saved": false
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

#### `GET /api/v1/issues/:issueId`

Returns full issue detail including `likelyFiles`, `gotchas`, `questionsToAsk`.

---

#### `POST /api/v1/issues/:issueId/explain`

Triggers Issue Understanding Agent for a specific issue. Returns `jobId`.

**Errors:**
- `404` — Issue not in user's discovered list
- `429` — Already explained within last 30 minutes

---

#### `PATCH /api/v1/issues/:issueId`

Update saved/dismissed status.

**Request Body:**
```json
{
  "saved": true,
  "dismissed": false
}
```

---

### 9.4 Plans

#### `POST /api/v1/issues/:issueId/plan`

Triggers Implementation Planner Agent. Returns `jobId`.

**Errors:**
- `404` — Issue not found for this user
- `409` — Issue explanation not yet complete (must explain first)
- `409` — Plan already exists for this issue; response includes the existing plan ID

---

#### `GET /api/v1/issues/:issueId/plan`

Returns implementation plan.

**Response:**
```json
{
  "steps": [
    {
      "step": 1,
      "title": "Add notes table count",
      "description": "In cmd/info.go, locate the countRows() function...",
      "files": ["cmd/info.go"],
      "tips": ["Run go build first to catch syntax errors early"]
    }
  ],
  "prTitle": "fix: include notes table in package info output",
  "prDescription": "## Summary\n...",
  "generatedAt": "2026-06-21T10:30:00Z"
}
```

---

### 9.5 PR Drafts

#### `POST /api/v1/issues/:issueId/pr-draft`

Regenerates a PR title and description from an existing implementation plan. This is optional because the first PR draft is generated with the plan.

**Request Body:**
```json
{
  "tone": "concise",
  "includeTests": true
}
```

**Response:**
```json
{
  "prTitle": "fix: include notes table in package info output",
  "prDescription": "## Summary\n...",
  "generatedAt": "2026-06-21T10:35:00Z"
}
```

**Errors:**
- `404` — Issue or plan not found for this user
- `429` — Daily PR draft quota reached

---

### 9.6 Jobs (Server-Sent Events)

#### `GET /api/v1/jobs/:jobId/status`

SSE endpoint. Streams job status updates to client.

**Stream Events:**

```
id: 1
event: status
data: {"status": "running", "stage": "Fetching GitHub profile...", "progress": 0.2}

id: 2
event: status
data: {"status": "running", "stage": "Analysing languages...", "progress": 0.5}

id: 3
event: complete
data: {"status": "done", "result": {...}}

id: 4
event: error
data: {"status": "failed", "error": "GitHub API rate limit exceeded", "retryAfter": "2026-06-21T11:00:00Z"}
```

**Client handling:** if connection drops, client reconnects with `Last-Event-ID` header; server replays last event.

---

### 9.7 Repositories

#### `GET /api/v1/repos`

Returns discovered repositories with health scores.

**Query Params:** `page`, `limit`, `min_score`, `language`

---

### 9.8 Health & Readiness

#### `GET /api/health`

Returns 200 if the server process is alive. No auth required.

**Response:**
```json
{"status": "ok", "timestamp": "2026-06-21T10:00:00Z"}
```

#### `GET /api/ready`

Returns 200 if all dependencies (DB, Redis, GitHub API) are reachable. Used by load balancers.

**Response:**
```json
{
  "status": "ready",
  "dependencies": {
    "database": "ok",
    "redis": "ok",
    "github": "ok"
  }
}
```

**Errors:**
- `503` — One or more dependencies unreachable; response includes which one failed.

---

### 9.9 Account Data

#### `GET /api/v1/me/export`

Exports the authenticated user's stored data as JSON.

**Response:** JSON object containing user profile, skill profiles, discovered repos, issues, plans, and job metadata. Encrypted OAuth tokens are never included.

#### `DELETE /api/v1/me`

Deletes the authenticated user's account data, revokes local sessions, deletes Redis keys, and marks in-flight jobs as cancelled.

**Response:**
```json
{"status": "deleted"}
```

---

### 9.10 Error Response Format

All errors follow RFC 7807 Problem Details:

```json
{
  "type": "https://contribpath.dev/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "GitHub API quota exhausted. Retry after 2026-06-21T11:00:00Z.",
  "retryAfter": "2026-06-21T11:00:00Z"
}
```

---

## 10. Frontend Pages & Components

### 10.1 Page Map

```
/                       → Landing page (marketing)
/auth/signin            → Sign in with GitHub button
/dashboard              → Post-login home: profile summary + issue feed
/profile                → Full skill profile + edit preferences
/issues                 → Issue browser (filters, search)
/issues/[id]            → Issue detail: summary, files, plan, PR draft
/repos                  → Discovered repositories with health scores
/saved                  → Saved issues list
/settings               → Connected accounts, notification prefs
/admin                  → Internal dashboard (admin role only)
```

---

### 10.2 Visual Design System

The frontend must implement the `DESIGN.md` aesthetic directly. The product should feel like a premium developer tool: dark, tactile, precise, and intentionally crafted. Do not ship the default shadcn theme or generic Tailwind blue/indigo surfaces.

#### Design Tokens

Tokens are defined as CSS custom properties and mapped into `tailwind.config.ts`. Components must consume semantic tokens rather than hard-coded one-off colours.

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `hsl(240, 10%, 4%)` | App background |
| `--bg-surface` | `hsl(240, 10%, 8%)` | Cards and default panels |
| `--bg-surface-elevated` | `hsl(240, 10%, 12%)` | Dropdowns, modals, active surfaces |
| `--accent-primary` | `hsl(267, 100%, 65%)` | Primary CTAs, active state, focus ring |
| `--accent-glow` | `hsla(267, 100%, 65%, 0.15)` | Diffuse neon glow shadows |
| `--accent-secondary` | `hsl(180, 100%, 50%)` | Links, file paths, code pointers |
| `--text-primary` | `hsl(0, 0%, 98%)` | Primary text |
| `--text-secondary` | `hsl(240, 5%, 65%)` | Body copy and metadata |
| `--text-muted` | `hsl(240, 5%, 45%)` | Disabled states and low-priority hints |
| `--border-subtle` | `hsla(0, 0%, 100%, 0.08)` | Default borders |
| `--border-hover` | `hsla(267, 100%, 65%, 0.3)` | Hover borders |

Semantic statuses must be customised to fit the palette, not pulled from default Tailwind colours:

| Status | Visual Treatment |
|---|---|
| Healthy / success | Muted emerald text and border, no flat green fills |
| Warning | Muted amber text and border, low-opacity background |
| Risk / error | Muted rose text and border, low-opacity background |
| Info / link | Cyan text on dark cyan background |

#### Typography

| Role | Font | Requirements |
|---|---|---|
| Display headings | Space Grotesk | Bold, tight tracking, architectural feel |
| Body text | Inter | Readable, neutral, high contrast on dark surfaces |
| Code and metadata | JetBrains Mono | Used for paths, badges, technical counters, time estimates |

Font loading should use `next/font` where possible. If Google-hosted fonts are used, configure preconnect and fallback stacks. Do not scale font size with viewport width; use explicit responsive steps.

#### Layout, Borders, and Surfaces

- Use an 8px spacing grid throughout the app.
- Use generous page spacing (`mb-24` / `mb-32`) for narrative landing sections and tighter but readable spacing inside operational dashboards.
- Use `p-6` or `p-8` for major cards and panels so content does not feel cramped.
- Use `rounded-2xl` (16px) for major panels and cards, `rounded-lg` (8px) for buttons and inputs, and pill shapes only for compact badges.
- Use subtle borders with `--border-subtle`; avoid hard black drop shadows.
- Navigation and floating headers use `backdrop-blur-md` with `bg-surface/60`.
- Use layered violet/cyan glow shadows only for focus, hover, and primary-action emphasis.

#### Motion and Microinteractions

- Buttons use a "magnetic" interaction: hover lifts by 2px, primary glow expands, active press scales to `0.96`, and release returns with a spring.
- Cards implement a cursor-following spotlight using CSS variables (`--mouse-x`, `--mouse-y`) and a radial gradient.
- Interactive card icons slide by 4px on hover and shift to `--accent-primary`.
- Page content enters with staggered fade-up animation: `opacity 0 -> 1`, `translateY(10px) -> 0`, 50ms sibling delay.
- Progress bars fill smoothly and render a glowing leading edge.
- Skill/stat counters animate from 0 to the final value with ease-out timing.
- Implementation-plan checkboxes use a custom animated checkmark; completed steps fade to 50% opacity and strike through the title.
- Skeleton loaders mirror real content shapes and use a dark violet/blue shimmer, not generic gray pulsing blocks.

#### Anti-Template Rules

- Do not use default Tailwind blue or indigo for primary UI.
- Do not use flat gray backgrounds; neutral surfaces must carry the obsidian undertone.
- Do not use stock empty-state SVGs. Empty states must use subtle abstract geometry, ASCII-style art, or generated bespoke assets.
- Do not add decorative gradient orbs or unrelated ambient blobs.
- Do not rely on oversized marketing cards on the first authenticated screen; the dashboard is the product experience.

---

### 10.3 Key Components

#### `<SkillCard />`

Displays the user's detected languages, frameworks, difficulty level, and animated counters for total repos and merged PRs. Includes "Re-analyse" button (disabled if last analysis < 1h ago). Uses mono metadata labels and violet/cyan accents only for meaningful state.

#### `<IssueCard />`

Issue summary card used in the feed. Shows:
- Repo name + stars + health score badge (custom semantic treatment: healthy > 70, warning 40–70, risk < 40)
- Issue title + difficulty badge
- Time estimate chip
- 2-line AI summary preview
- Save / Dismiss actions
- Cursor-following spotlight hover, subtle border glow, and action icon slide

#### `<HealthScoreBadge />`

Visual indicator with tooltip showing breakdown: last commit, PR merge rate, issue response time. Badge text uses JetBrains Mono and avoids default green/yellow/red fills.

#### `<IssueExplainer />`

Core reading panel styled as an intelligence report. Layout is either a split pane or a wide centered reading column (`max-w-3xl`), and the problem summary uses slightly larger editorial typography:
- Problem summary
- Context section
- File map (clickable → opens GitHub in new tab)
- Gotchas accordion
- "Questions to ask maintainer" section
- "Generate Plan" CTA
- Code pointers styled as inline cyan code tokens with dark cyan backgrounds and an "Open in GitHub" tooltip

#### `<ImplementationPlan />`

Vertical timeline / numbered step list. Each step is a connected card with:
- Title + description
- Affected files (with GitHub links)
- Tips (collapsible)
- Completion checkbox (local state only)
- Large muted step number as a structural anchor
- Completed-state fade and animated checkmark

#### `<PRDraftCard />`

Copy-pasteable PR title + description presented in a simulated terminal or code editor window. Includes:
- Copy to clipboard button
- "Open issue on GitHub" direct link
- Disclaimer: "Review this draft before submitting — AI-generated text may need editing."
- Copy success state transforms to a green check and briefly pulses the editor shell

#### `<JobStatusBar />`

Fixed-bottom banner that appears when a background job is running. Shows current stage text (streamed from SSE) and a smooth progress indicator with a glowing leading edge. Disappears on completion, replaced by a toast notification.

#### `<EmptyState />`

Empty states for:
- No repos found → suggest broadening languages
- No issues for difficulty level → suggest trying Intermediate
- Analysis failed → retry button + contact support link
- Include subtle abstract geometry or ASCII-inspired art; no generic stock illustrations

#### `<LoadingSkeleton />`

Shimmer placeholder shown while async data loads. Used for issue cards, skill profiles, and plan steps. Prevents layout shift and uses content-shaped dark violet/blue shimmer.

#### Accessibility Requirements

- WCAG 2.1 AA compliance target.
- All interactive elements keyboard-navigable.
- Screen reader support via `aria-label` and `aria-live` for dynamic content.
- Focus management after navigation and modal interactions.
- Colour contrast ratio ≥ 4.5:1 for text.
- Respect `prefers-reduced-motion`: disable spotlight cursor tracking, counter tick-up, non-essential glow pulses, and staggered page transitions while preserving functional state changes.

#### Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Single column, hamburger nav |
| Tablet | 640–1024px | Two-column dashboard, collapsible sidebar |
| Desktop | > 1024px | Full three-column layout |

---

### 10.4 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  ContribPath          [Search]        [Avatar ▼]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Your Skills                    Recommended Issues      │
│  ┌──────────────────┐           ┌─────────────────────┐ │
│  │ Go  45%          │           │ 🟢 owner/repo  91   │ │
│  │ TS  30%          │           │ Fix notes table...  │ │
│  │ Py  15%          │           │ Beginner · 45 min   │ │
│  │                  │           ├─────────────────────┤ │
│  │ Difficulty:      │           │ 🟡 owner/repo2  63  │ │
│  │ Intermediate     │           │ Add pagination...   │ │
│  │                  │           │ Intermediate · 2h   │ │
│  │ [Re-analyse]     │           ├─────────────────────┤ │
│  └──────────────────┘           │ [Load more]         │ │
│                                 └─────────────────────┘ │
│                                                         │
│  Your Saved Issues (3)                                  │
│  ─────────────────────────────────────────────────────  │
│  [issue cards...]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Edge Cases & Error Handling

### GitHub API

| Scenario | Handling |
|---|---|
| Rate limit exceeded (403 + `X-RateLimit-Remaining: 0`) | Retry after `X-RateLimit-Reset`; show countdown to user |
| Secondary rate limit (429) | Exponential backoff: 1s, 2s, 4s, 8s, max 3 retries |
| Token expired / revoked | Clear session, redirect to sign-in with message |
| GitHub outage (500/503) | Cache last known data; show "Using cached data from [time]" |
| User changes GitHub username | Detect mismatch on next login, re-run analysis |

### LLM

| Scenario | Handling |
|---|---|
| LLM returns invalid JSON | Retry once with stricter prompt; if fails again, return partial data with warning |
| LLM timeout (> 30s) | Return partial result; stream remaining sections as they arrive |
| LLM rate limit | Queue and retry; show estimated wait time to user |
| LLM returns hallucinated file path | Validate against GitHub tree; filter out invalid paths before display |
| LLM context window exceeded | Truncate issue comments to top 10 + last 5; note truncation |

### User Behaviour

| Scenario | Handling |
|---|---|
| User navigates away during analysis | Job continues in background; on return, job status is visible in dashboard |
| User triggers analysis twice rapidly | Second request returns 429 with existing `jobId` |
| User dismisses all issues | Show "Refresh Suggestions" button; trigger new discovery with relaxed filters |
| User saves 100+ issues | Paginate saved list; add bulk-dismiss option |
| User connects GitHub account with 0 public repos | Show friendly onboarding: "Make your first public repo to get started" |
| User is a bot / organisation account | Detect `type: "Organization"`, block analysis, show error |

### Concurrency & Idempotency

| Scenario | Handling |
|---|---|
| Same job enqueued twice (BullMQ duplicate) | Jobs are keyed by `userId + jobType + inputHash`; duplicate detected → return existing `jobId` |
| Two users analyse the same repo simultaneously | Each user's analysis is independent; repo metadata cached in Redis shared across users |
| Agent step hangs (no response > 60s) | Per-step timeout of 60s; on timeout, mark step as failed, retry once, then fail the job |
| Pipeline retry cascade (each of 7 steps retries 3x) | Global retry budget of 5 per pipeline run; once exhausted, fail immediately |
| User deletes account while job is running | Job completes but result write fails (FK violation) → job marked as orphaned, cleaned up by nightly cron |

### Queue / Infrastructure

| Scenario | Handling |
|---|---|
| Worker crash mid-job | BullMQ auto-retries up to 3 times; marks as failed after 3rd attempt |
| Redis connection lost | Job queue pauses; resume when Redis reconnects; durable queue Redis must have persistence enabled so queued jobs survive restarts |
| Database connection pool exhausted | Return 503; alert on-call via Sentry |
| Deployment during active jobs | Graceful shutdown: workers finish current job, drain queue, then restart |

---

## 12. Rate Limiting & Quotas

### Per-User Limits

| Action | Limit |
|---|---|
| Profile re-analysis | 1 per hour |
| Issue discovery | 3 per day |
| Issue explanation | 10 per day |
| Plan generation | 10 per day |
| PR draft generation | 20 per day |

Limits are stored in Redis with TTL. On limit hit, response includes `Retry-After` header.

### GitHub API Budget

The app uses **user OAuth tokens** for all GitHub requests (not a single server token), so each user has their own rate limit bucket (5,000 req/hour authenticated).

Track remaining quota per token; warn user in UI when < 500 requests remain.

### LLM Cost Controls

- Max tokens per request: 4,096 (output) / 16,000 (input).
- Log estimated cost per job to internal analytics.
- Hard cap: if monthly LLM spend exceeds budget threshold, queue non-urgent jobs and alert admin.

---

## 13. Security Considerations

### OAuth Token Handling

- GitHub access tokens stored encrypted at rest in `oauth_accounts` (AES-256-GCM), separate from the browser session cookie.
- Tokens **never** returned to the client or logged.
- All GitHub API calls made server-side or in background workers.

### Prompt Injection

- GitHub issue content is untrusted user data. Before sending to LLM:
  - Strip HTML tags.
  - Wrap in clear XML delimiters: `<issue_content>...</issue_content>`.
  - System prompt instructs LLM to treat content as data, not instructions.
- Monitor for unusual LLM outputs (e.g., instructions to "ignore previous prompt").

### CSRF

- NextAuth handles CSRF tokens automatically for all auth endpoints.
- All state-changing API endpoints validate `Origin` header.

### XSS

- All user-generated content (issue titles, descriptions) rendered with `DOMPurify` sanitisation.
- GitHub Markdown rendered via `react-markdown` with safe renderer (no raw HTML).
- Content Security Policy header set to prevent inline script injection.

### Dependency Security

- Dependabot enabled on GitHub repository.
- `npm audit` run in CI pipeline; fail build on high/critical severity.
- Docker images built from pinned digests.

### Data Minimisation

- Only public GitHub data is fetched.
- No private repo access requested.
- Issue and repo data is stored per-user and inaccessible to other users.
- Raw GitHub API responses deleted from database after 24 hours by a scheduled retention job (only processed results retained).

### Rate Limiting Strategy

- **API routes:** Per-user rate limiting using Redis sliding window (keyed by `userId`).
- **Unauthenticated endpoints:** Per-IP rate limiting (10 req/min) to prevent abuse.
- **DDoS protection:** Vercel's built-in DDoS protection + Cloudflare as DNS proxy for additional shielding.

### Security Event Logging

- Failed authentication attempts logged with IP and user agent.
- Token revocation events logged.
- Unusual LLM output patterns (prompt injection attempts) logged and flagged for review.
- All security logs retained for 90 days minimum.

### LLM Output Sanitisation

- LLM-generated markdown is sanitised with `DOMPurify` before rendering, same as user-generated content.
- URLs in LLM output are validated against an allowlist of domains (github.com, docs sites).
- LLM output containing executable code blocks is wrapped with a "Copy" button but never auto-executed.

---

## 14. Performance & Caching

### Cache Layers

| Data | Cache | TTL |
|---|---|---|
| User skill profile | Redis + DB | 24 hours |
| Repo health scores | Redis | 6 hours |
| GitHub repo metadata | Redis | 1 hour |
| GitHub issue content | Redis | 30 minutes |
| LLM-generated summaries | DB | Indefinite (until issue closed) |
| GitHub file tree | Redis | 2 hours |

### GitHub API Call Reduction

- Use GitHub's `ETag` / `If-None-Match` conditional requests where supported.
- GitHub GraphQL batching: fetch last 20 PRs + last 30 issues in a single GraphQL query.
- Avoid re-fetching repos already in DB if `metadata_expires_at` / `health_expires_at` > now.

### Frontend Performance

- Next.js ISR (Incremental Static Regeneration) for landing page.
- All dashboard data fetched client-side via SWR with stale-while-revalidate.
- Issue list virtualised with `@tanstack/react-virtual` for lists > 50 items.
- Long-running LLM work happens in workers. API routes stream job progress and final structured results via SSE; they do not keep Vercel serverless functions open for the full agent runtime.

### Background Job Priorities

BullMQ queue with 3 priority levels:

| Priority | Jobs |
|---|---|
| High (1) | Profile analysis (user is waiting) |
| Medium (2) | Issue explanation (user just selected an issue) |
| Low (3) | Discovery / pre-loading (background prefetch) |

---

## 15. Observability & Logging

### Structured Logs

All logs are JSON with fields: `userId`, `jobId`, `agentName`, `durationMs`, `status`, `error`.

```json
{
  "level": "info",
  "userId": "uuid",
  "jobId": "uuid",
  "agentName": "SkillAnalysisAgent",
  "durationMs": 1234,
  "status": "success",
  "githubRequestCount": 8
}
```

### Metrics (Exported to PostHog)

- Analysis started / completed / failed per day
- Issues explained per day
- Plans generated per day
- P50 / P95 / P99 latency per agent
- GitHub API quota usage per user
- LLM token usage per job type
- User conversion funnel: signup → analysis → issue viewed → plan generated

### Alerting

| Alert | Threshold |
|---|---|
| Agent failure rate | > 5% over 10 minutes |
| Queue depth | > 100 jobs pending |
| LLM error rate | > 10% over 5 minutes |
| GitHub API 429 rate | > 20% over 1 minute |
| DB connection pool | > 90% utilisation |

---

## 16. Data Privacy & Compliance

### Data Collected

| Data | Source | Retention |
|---|---|---|
| GitHub username, avatar, email | GitHub OAuth | Until account deletion |
| Public repo names and languages | GitHub API | 24 hours raw, indefinite processed |
| Public issue content | GitHub API | 30 minutes cache, indefinite summary |
| AI-generated summaries and plans | LLM | Indefinite (user can delete) |
| Usage events (what buttons clicked) | PostHog | 90 days |

### User Rights

- Users can export their data: `GET /api/v1/me/export` returns JSON of all stored data.
- Users can delete their account: `DELETE /api/v1/me` deletes all DB rows and Redis keys.
- Email (if provided) is never shared with third parties.

### Third-Party Data Sharing

- GitHub API: user token used to read public data only; no data written back to GitHub (in MVP).
- Anthropic API: issue content and code snippets sent for analysis. Users should be informed via Privacy Policy.
- PostHog: anonymised usage events; no PII in event properties.

### Compliance

- GDPR: Lawful basis = consent (user initiates OAuth). Data minimisation applied. Deletion request honoured within 30 days.
- CCPA: California residents can request data export/deletion via account settings.
- ToS of GitHub: application complies with GitHub's [Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies). No scraping; all data fetched via official API.

### Cookie Consent

- Cookie consent banner displayed to EU users on first visit (GDPR requirement).
- Essential cookies (session) allowed without consent; analytics cookies (PostHog) require opt-in.

### Third-Party Data Processing

- Data Processing Agreement (DPA) required with Anthropic before production launch.
- Confirm Anthropic's data retention policy — ensure LLM inputs are not used for model training.
- Privacy Policy must clearly state that issue content is sent to third-party AI providers for analysis.

### Breach Notification

- In the event of a data breach, affected users notified within 72 hours (GDPR requirement).
- Incident response playbook maintained in internal documentation.

---

## 17. Testing Strategy

### Unit Tests (Vitest)

- Each agent function tested in isolation with mocked GitHub API responses.
- LLM responses mocked with representative fixtures (valid JSON, invalid JSON, empty, truncated).
- Scoring formulas (health score, skill match) tested with boundary values.

### Integration Tests (Vitest + test database)

- Full agent pipeline tested against a seeded test database.
- GitHub API responses mocked via `msw` (Mock Service Worker).
- Queue processing tested with Testcontainers or an ephemeral Redis instance. `ioredis-mock` may be used only for narrow unit tests because it does not fully match BullMQ production behaviour.

### E2E Tests (Playwright)

Key user flows covered:

1. Sign in with GitHub → profile analysis completes → issues displayed.
2. Select an issue → explanation generated → plan generated → PR draft visible.
3. Save an issue → appears in saved list.
4. Rate limit hit → error state displayed with retry countdown.
5. Sign out → session cleared → redirected to landing.

### Visual and Interaction Tests

- Playwright screenshots for landing, dashboard, issue detail, plan view, empty states, and settings at mobile, tablet, and desktop widths.
- Assert the design token CSS variables exist on `:root` and that primary buttons/cards consume token-derived classes rather than default Tailwind blue/indigo.
- Verify card spotlight updates `--mouse-x` / `--mouse-y` on pointer movement.
- Verify magnetic button hover and active states expose transform/glow styles.
- Verify plan checkbox completion fades the step and renders the animated checkmark state.
- Verify skeleton loaders use content-shaped dark violet/blue shimmer.
- Verify `prefers-reduced-motion: reduce` disables non-essential stagger, counter, glow, and spotlight animations.

### Load Testing

- Use k6 to simulate 100 concurrent users running profile analysis.
- Target: P95 job completion < 30s, P99 < 60s.
- Queue must not grow unboundedly under load.

### LLM Output Quality

- Maintain a golden dataset of 20 real GitHub issues with manually written expected summaries.
- CI job runs evaluation: compare LLM output against golden set using cosine similarity; alert if score drops > 10%.

---

## 18. Deployment & Infrastructure

### Environments

| Environment | Purpose |
|---|---|
| `local` | Developer machine (docker-compose) |
| `preview` | Per-PR Vercel preview + Railway ephemeral worker |
| `staging` | Pre-production, seeded with test data |
| `production` | Live |

### CI/CD Pipeline (GitHub Actions)

```
PR opened
  → lint (ESLint + TypeScript)
  → unit tests
  → integration tests
  → build check
  → deploy to preview URL
  → E2E tests against preview

Merge to main
  → all above +
  → deploy to staging
  → smoke tests
  → manual approval gate
  → deploy to production
```

### Infrastructure (Production)

- **Vercel:** Next.js app (frontend + API routes). Auto-scaling, edge network.
- **Railway:** BullMQ worker service. Horizontally scalable (add workers as queue grows).
- **Supabase:** PostgreSQL managed database. Daily backups. Point-in-time recovery.
- **Upstash Redis:** Serverless Redis for cache and rate limiting. Billed per request.
- **Railway Redis / Redis Cloud:** Durable Redis backend for BullMQ queues, with persistence enabled.
- **Sentry:** Error tracking for both Vercel and Railway.

### Environment Variable Acquisition Guide

Do not commit real secret values to the repository. Collect values in `.env.local` for local development, then mirror them into Vercel and Railway project secrets for deployed environments.

#### GitHub OAuth

Required variables:

```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Optional scope toggles:

```
GITHUB_OAUTH_READ_ORG=false
EMAIL_NOTIFICATIONS_ENABLED=false
```

How to get them:

1. Open GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Set **Application name** to `ContribPath`.
3. Set **Homepage URL**:
   - Local: `http://localhost:3000`
   - Production: `https://<production-domain>`
4. Set **Authorization callback URL**:
   - Local: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://<production-domain>/api/auth/callback/github`
5. Create the app, then copy `Client ID`.
6. Generate a new client secret and copy it once; GitHub will not show it again.

OAuth scopes requested by the app: `read:user` by default. Set `GITHUB_OAUTH_READ_ORG=true` only when org repository filtering is needed. Set `EMAIL_NOTIFICATIONS_ENABLED=true` only when email-based notifications are enabled; this adds `user:email`.

#### Auth and App URLs

Required variables:

```
AUTH_SECRET=
APP_URL=
```

How to get them:

1. Generate `AUTH_SECRET` locally:
   ```bash
   openssl rand -base64 32
   ```
2. Set `APP_URL` to:
   - Local: `http://localhost:3000`
   - Production: the canonical HTTPS app URL.

`NEXTAUTH_SECRET` may be kept as an alias for older NextAuth deployments, but new configuration should use `AUTH_SECRET`.

#### Token Encryption

Required variable:

```
TOKEN_ENCRYPTION_KEY=
```

How to get it:

1. Generate a separate encryption key:
   ```bash
   openssl rand -base64 32
   ```
2. Store it separately from `AUTH_SECRET`.
3. Never rotate this key without a migration plan for existing encrypted OAuth tokens.

#### Supabase Postgres

Required variable:

```
DATABASE_URL=
```

How to get it:

1. Create a Supabase project.
2. Open Project Settings → Database → Connection string.
3. Use the pooled connection string for serverless API routes where possible.
4. Replace `[YOUR-PASSWORD]` with the database password.
5. Use a separate database or schema for `staging` and `production`.

#### Redis

Required variables:

```
CACHE_REDIS_URL=
QUEUE_REDIS_URL=
```

How to get them:

1. Create an Upstash Redis database for cache/rate limits and copy its Redis URL into `CACHE_REDIS_URL`.
2. Create a durable Redis instance on Railway Redis or Redis Cloud for BullMQ and copy its Redis URL into `QUEUE_REDIS_URL`.
3. Confirm the queue Redis supports blocking commands and persistence; do not use an HTTP-only Redis client for BullMQ workers.

#### LLM Providers

At least one provider key is required. Anthropic is the default provider.

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
LLM_PROVIDER=anthropic
```

How to get them:

1. Anthropic: open Anthropic Console → API Keys → Create key → copy to `ANTHROPIC_API_KEY`.
2. OpenAI fallback: open OpenAI Platform → API keys → Create key → copy to `OPENAI_API_KEY`.
3. Set `LLM_PROVIDER` to `anthropic` for MVP unless testing fallback behaviour.
4. Configure provider retention settings so prompts are not used for model training where the provider offers that control.

#### Sentry

Runtime variable:

```
SENTRY_DSN=
```

Optional CI/source-map variables:

```
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

How to get them:

1. Create a Sentry project for Next.js.
2. Copy the client/server DSN into `SENTRY_DSN`.
3. For source maps, create an auth token with project release permissions and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in CI only.

#### PostHog

Required for analytics if enabled:

```
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

How to get them:

1. Create a PostHog project.
2. Copy the project API key into `NEXT_PUBLIC_POSTHOG_KEY`.
3. Set `NEXT_PUBLIC_POSTHOG_HOST` to the project host, for example `https://us.i.posthog.com` or the EU host shown in PostHog.
4. Analytics must remain opt-in for EU users until cookie consent is granted.

### Secrets Management

All secrets managed via environment variables. No secrets in code or config files.

Required secrets and configuration values (LLM provider keys are required only for enabled providers):
```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_OAUTH_READ_ORG
EMAIL_NOTIFICATIONS_ENABLED
AUTH_SECRET
APP_URL
DATABASE_URL
CACHE_REDIS_URL
QUEUE_REDIS_URL
TOKEN_ENCRYPTION_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
LLM_PROVIDER
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

Deployment rule: Vercel needs frontend/API variables (`AUTH_SECRET`, `APP_URL`, GitHub OAuth, database, cache Redis, LLM, Sentry, PostHog). Railway workers need worker-side variables (`DATABASE_URL`, `QUEUE_REDIS_URL`, `CACHE_REDIS_URL`, `TOKEN_ENCRYPTION_KEY`, GitHub OAuth, and LLM keys). Only `NEXT_PUBLIC_*` variables may be exposed to the browser.

---

## 19. MVP Scope vs. Future Phases

### MVP (Weeks 1–4)

- [ ] GitHub OAuth sign-in
- [ ] Skill Analysis Agent
- [ ] Repository Discovery Agent (search-based)
- [ ] Maintainer Activity Agent (health scoring)
- [ ] Issue Understanding Agent (LLM-powered)
- [ ] Implementation Planner Agent
- [ ] PR Draft Agent
- [ ] Issue feed UI with filters
- [ ] Save / dismiss issues
- [ ] SSE-based job status updates
- [ ] Codebase Navigation Agent (basic — file tree + function pointers via API)
- [ ] Basic rate limiting

### Phase 2 (Weeks 5–8)

- [ ] GitLab integration
- [ ] Portfolio website parsing (extract skills from personal sites)
- [ ] Codebase Navigation Agent (advanced — full repo clone + cross-file context)
- [ ] GitHub App for maintainers (auto-label issues)
- [ ] Slack / Discord webhook notifications

### Phase 3 (Weeks 9–16)

- [ ] Autonomous branch creation (GitHub API)
- [ ] Draft implementation generation (write code)
- [ ] Hacktoberfest / GSoC tracking mode
- [ ] Community leaderboard
- [ ] Email digest (weekly personalised issue suggestions)
- [ ] Mobile-responsive PWA with push notifications

---

## 20. Open Questions

1. **LLM Provider:** Start with Anthropic Claude for code reasoning quality. Should we support a user-supplied API key to reduce costs?

2. **Codebase Navigation depth:** Full repo clone vs. GitHub API file-by-file. Clone gives better context but costs more compute and storage. File-by-file is cheaper but misses cross-file context. Decision needed before building Agent 5.

3. **Issue claiming:** Should we show how many other users are looking at the same issue (to avoid duplicate PR submissions)? Requires cross-user data sharing — privacy implication.

4. **Stale issue detection:** How stale is "too stale"? Issue opened 2 years ago with no recent activity — exclude or warn? Suggest a configurable threshold default of 6 months.

5. **User-supplied GitHub token:** For users who hit rate limits, should they be able to supply a personal access token with broader scopes for better analysis?

6. **Internationalisation:** Initial version English-only. GitHub issues are in many languages. Phase 2 consideration.

7. **Abuse prevention:** Could bad actors use this to scrape GitHub at scale? Mitigate with per-user rate limits + GitHub OAuth (each user burns their own API quota).

8. **Repo size cap:** Should we skip analysis for repos > 500MB (clone size equivalent via API call count)? Suggest yes, with a message: "This repository is very large. Manual exploration recommended."

---

*End of SPEC.md*
