<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Anthropic_Claude-AI_Powered-6B4FBB?style=for-the-badge" alt="Anthropic Claude" />
  <img src="https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/BullMQ-Job_Queue-DC382D?style=for-the-badge&logo=redis" alt="BullMQ" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🚀 ContribPath</h1>

<p align="center">
  <strong>From zero to first PR in under an hour.</strong>
  <br />
  An AI-powered multi-agent platform that analyzes your GitHub profile, discovers matching open source issues, explains codebases in plain English, and generates step-by-step implementation plans.
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#%EF%B8%8F-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 🎯 The Problem

Getting started with open source contributions is **hard**. New contributors face a brutal onboarding curve:

- **Finding the right project** → hours scanning GitHub, checking if repos are maintained
- **Finding the right issue** → filtering through hundreds of issues, guessing difficulty
- **Understanding the codebase** → cloning, reading source code, understanding architecture
- **Planning the implementation** → figuring out which files to touch, what tests to write
- **Writing the PR** → following conventions, templates, and commit formats

> **ContribPath collapses 4–20 hours of onboarding into a guided 30-minute flow** by using a multi-agent AI pipeline that does the heavy lifting for you.

---

## ✨ Features

### 🔍 Intelligent Skill Analysis
Sign in with GitHub and the AI agent pipeline automatically analyzes your public profile — languages, frameworks, merged PRs, and domain expertise — to build a personalized developer profile.

### 🎯 Personalized Issue Discovery
Discover open source issues tailored to your skills. Repos are filtered for activity, community health, and maintainer responsiveness. No more wasting time on dead projects or already-claimed issues.

### 🧠 AI-Powered Issue Explanations
For every issue, get a plain-English breakdown: what the problem is, which files are involved, potential gotchas, and what to clarify with the maintainer before starting.

### 📋 Step-by-Step Implementation Plans
Generate a numbered implementation plan with specific file pointers, test commands, and local setup instructions — like a senior developer pair programming with you.

### 📝 PR Draft Generator
Auto-generate PR titles and descriptions following the project's conventions, including conventional commits detection and `PULL_REQUEST_TEMPLATE.md` adaptation.

### 🏥 Repository Health Scoring
Every recommended repo is scored on a 0–100 scale across 4 dimensions: commit recency, PR merge time, issue response time, and issue close rate.

### 💾 Issue Management
Save issues for later, dismiss irrelevant ones, filter by difficulty/language/repo, and track your progress through implementation plans with interactive checklists.

---

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Next.js SSR)                     │
│  Landing Page │ Dashboard │ Issue Explorer │ Plan View        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST
┌──────────────────────────────▼──────────────────────────────┐
│                   Next.js API Routes (BFF)                    │
│  /api/auth/*  /api/v1/profile  /api/v1/issues  /api/v1/plan  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┼───────────────────┐
            │                  │                   │
  ┌─────────▼────────┐ ┌──────▼───────┐ ┌─────────▼────────┐
  │ Agent Orchestrator│ │ GitHub API   │ │ LLM Gateway      │
  │ (BullMQ Workers)  │ │ (Octokit)    │ │ (Claude / OpenAI)│
  └────────┬─────────┘ └──────────────┘ └──────────────────┘
           │
  ┌────────▼──────────────────────────────────────────┐
  │               Agent Pipeline (7 Agents)            │
  │  Skill Analysis → Repo Discovery → Health Scoring  │
  │  → Issue Understanding → Codebase Navigation       │
  │  → Implementation Planner → PR Draft               │
  └────────┬──────────────────────────────────────────┘
           │
  ┌────────▼─────────────┐     ┌──────────────────┐
  │  PostgreSQL (Drizzle) │     │  Redis            │
  │  Users, Profiles,     │     │  Cache + BullMQ   │
  │  Issues, Plans, Jobs  │     │  Rate Limiting     │
  └───────────────────────┘     └──────────────────┘
```

### Multi-Agent Pipeline

The core intelligence of ContribPath is a **7-agent pipeline** where each agent is a stateless TypeScript function that reads from and writes to a shared `AgentContext`. Jobs are managed by BullMQ for reliability and retries.

```
                    ┌──────────────────────┐
                    │  1. Skill Analysis   │
                    │     Agent            │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
   ┌──────────▼──────────┐          ┌───────────▼───────────┐
   │  2. Repository      │          │  3. Maintainer        │
   │     Discovery Agent │          │     Activity Agent    │
   └──────────┬──────────┘          └───────────┬───────────┘
              │                                 │
              └────────────────┬────────────────┘
                               │  merge & rank
                    ┌──────────▼───────────┐
                    │  4. Issue            │
                    │     Understanding    │
                    │     Agent (LLM)      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  5. Codebase         │
                    │     Navigation       │
                    │     Agent (LLM)      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  6. Implementation   │
                    │     Planner          │
                    │     Agent (LLM)      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  7. PR Draft         │
                    │     Agent (LLM)      │
                    └──────────────────────┘
```

| Agent | Input | Output | Method |
|---|---|---|---|
| **Skill Analysis** | GitHub token + username | `SkillProfile` (languages, frameworks, difficulty) | GitHub API |
| **Repo Discovery** | `SkillProfile` | Up to 20 ranked repositories | GitHub Search API |
| **Maintainer Activity** | Repository list | Health scores (0–100) per repo | GitHub GraphQL |
| **Issue Understanding** | Issue title, body, comments | Problem summary, time estimate, gotchas | LLM |
| **Codebase Navigation** | Repo + likely files | Function-level pointers, dependencies | GitHub Trees API + LLM |
| **Implementation Planner** | Issue context + file analysis | Numbered step-by-step plan | LLM |
| **PR Draft** | Plan + issue | PR title, description, test summary | LLM |

### Repository Health Scoring Formula

Each discovered repository gets a composite health score:

| Signal | Weight | Scoring |
|---|---|---|
| Days since last commit | 30% | <7d → 100, <30d → 80, <90d → 50, >180d → 0 |
| PR median merge time | 25% | <3d → 100, <7d → 80, <30d → 50, >60d → 0 |
| Issue first-response time | 25% | <1d → 100, <3d → 80, <7d → 50, >14d → 0 |
| Issues closed (90d) | 20% | >80% → 100, >50% → 70, >20% → 40, <20% → 0 |

### Authentication Flow

```
User clicks "Sign in with GitHub"
        │
        ▼
GitHub OAuth (scopes: read:user, read:org)
        │
        ▼
Callback → NextAuth creates DB session
        │
        ▼
GitHub token encrypted (AES-256-GCM) → stored in DB
        │
        ▼
HttpOnly session cookie → browser (token never exposed to client)
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR, API routes, full-stack React |
| **Language** | TypeScript (strict mode) | Type safety across the entire stack |
| **Styling** | Tailwind CSS + custom design tokens | "Obsidian & Neon" dark-mode design system |
| **Animations** | Framer Motion | Physics-based spring animations, staggered entry |
| **Icons** | Phosphor Icons | Developer-tool iconography |
| **Fonts** | Space Grotesk, Inter, JetBrains Mono | Display / body / code typography |
| **Auth** | NextAuth.js v5 | GitHub OAuth with database sessions |
| **Database** | PostgreSQL (via Supabase) | Relational data with JSONB columns |
| **ORM** | Drizzle ORM | Type-safe queries and migrations |
| **Cache** | Redis (Upstash) | Profile caching, rate limiting |
| **Job Queue** | BullMQ + Redis | Durable background agent jobs |
| **LLM** | Anthropic Claude (primary), OpenAI (fallback) | Code reasoning, structured output |
| **GitHub API** | Octokit (REST + GraphQL) | Profile data, repo search, issue fetching |
| **Validation** | Zod | Input validation + LLM output schema validation |
| **Testing** | Vitest + React Testing Library | Unit and integration tests |
| **CI/CD** | GitHub Actions | Typecheck, lint, test, build pipeline |
| **Monitoring** | Sentry + PostHog | Error tracking + product analytics |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** (recommended) or npm
- **PostgreSQL** database (e.g., [Supabase](https://supabase.com), local, or Docker)
- **Redis** instance (e.g., [Upstash](https://upstash.com), [Railway](https://railway.app), or local)
- **GitHub OAuth App** ([Create one here](https://github.com/settings/developers))
- **Anthropic API key** (or OpenAI API key)

### 1. Clone the repository

```bash
git clone https://github.com/abhinavgautam01/ContribPath.git
cd ContribPath
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# GitHub OAuth App
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_READ_ORG=false

# Auth
AUTH_SECRET=your_random_secret_here        # Generate: openssl rand -base64 32
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/contribpath

# Redis
CACHE_REDIS_URL=redis://localhost:6379
QUEUE_REDIS_URL=redis://localhost:6379     # Use a separate durable Redis for production

# Security
TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key  # Generate: openssl rand -hex 32

# LLM Provider
LLM_PROVIDER=anthropic                     # or "openai"
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key             # Optional if using Anthropic

# Monitoring (optional)
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Feature Flags
EMAIL_NOTIFICATIONS_ENABLED=false
```

### 4. Set up the database

```bash
# Generate migrations from Drizzle schema
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### 5. Start the development server

```bash
# Terminal 1: Next.js dev server
pnpm dev

# Terminal 2: Agent worker (processes background jobs)
pnpm worker

# Terminal 3: Retention worker (optional — cleanup cron)
pnpm retention
```

The app will be running at **http://localhost:3000**.

---

## 📁 Project Structure

```
contribpath/
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI pipeline: typecheck, lint, test, build
├── migrations/
│   └── 0000_initial_schema.sql     # Database migration
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (fonts, providers, nav)
│   │   ├── page.tsx                # Landing page (hero + features)
│   │   ├── globals.css             # Design system tokens + base styles
│   │   ├── auth/                   # Sign-in, sign-out, error pages
│   │   ├── dashboard/              # Main hub after login
│   │   ├── profile/                # Skill profile details + preferences
│   │   ├── repos/                  # Discovered repositories list
│   │   ├── issues/                 # Issue browser + detail/plan view
│   │   │   └── [id]/              # Dynamic issue page with explanation
│   │   ├── saved/                  # Saved/bookmarked issues
│   │   ├── settings/               # User preferences + account management
│   │   ├── admin/                  # Admin dashboard (role-gated)
│   │   └── api/
│   │       ├── auth/[...nextauth]/ # NextAuth handler
│   │       ├── health/             # Health check
│   │       ├── ready/              # Readiness probe (DB + Redis)
│   │       └── v1/                 # Product API endpoints
│   │           ├── profile/        # GET profile, POST analyze
│   │           ├── issues/         # CRUD + discover + explain + plan
│   │           ├── repos/          # GET discovered repos
│   │           ├── jobs/           # Job status polling
│   │           ├── account/        # Data export + deletion (GDPR)
│   │           └── preferences/    # User preferences
│   ├── auth.ts                     # NextAuth v5 configuration
│   ├── components/                 # React UI components (27 components)
│   │   ├── magnetic-button.tsx     # Physics-based CTA button
│   │   ├── spotlight-card.tsx      # Mouse-following spotlight card
│   │   ├── skill-card.tsx          # Skill profile display
│   │   ├── issue-card.tsx          # Issue summary card
│   │   ├── plan-timeline.tsx       # Step-by-step plan timeline
│   │   ├── pr-draft-card.tsx       # Terminal-styled PR preview
│   │   ├── job-status-bar.tsx      # Glowing progress indicator
│   │   ├── stat-counter.tsx        # Animated number counter
│   │   └── ...                     # Filters, actions, forms, etc.
│   ├── lib/                        # Business logic & utilities
│   │   ├── agents.ts               # 7-agent pipeline orchestration
│   │   ├── agent-step.ts           # Step wrapper with logging/timing
│   │   ├── codebase-navigation.ts  # Codebase analysis agent
│   │   ├── implementation-plan.ts  # Plan generation agent
│   │   ├── pr-draft.ts             # PR draft generation agent
│   │   ├── github-health.ts        # Repo health scoring
│   │   ├── github-quota.ts         # API rate limit management
│   │   ├── github-errors.ts        # GitHub error handling
│   │   ├── repo-ranking.ts         # Composite scoring algorithm
│   │   ├── rate-limit.ts           # Per-user rate limiting (Redis)
│   │   ├── types.ts                # Shared TypeScript interfaces
│   │   ├── env.ts                  # Validated environment config
│   │   ├── auth/                   # Session, token encryption, auth middleware
│   │   ├── db/                     # Drizzle schema, queries, connection
│   │   ├── queue/                  # BullMQ producer, connection, types
│   │   ├── providers/              # LLM abstraction (Anthropic + OpenAI)
│   │   └── security/               # CSRF, input validation, sanitization
│   ├── styles/                     # Additional style modules
│   ├── test/                       # Test suite (Vitest)
│   └── worker/                     # Background job processors
│       ├── agent-worker.ts         # Main agent job processor
│       └── retention-worker.ts     # Data cleanup cron worker
├── SPEC.md                         # Full product specification (1800+ lines)
├── DESIGN.md                       # "Obsidian & Neon" design system guide
├── drizzle.config.ts               # Drizzle ORM configuration
├── next.config.mjs                 # Next.js configuration + security headers
├── security-headers.mjs            # CSP, HSTS, X-Frame-Options, etc.
├── tailwind.config.ts              # Custom design tokens
├── vitest.config.ts                # Test runner configuration
├── tsconfig.json                   # TypeScript strict configuration
└── package.json                    # Scripts and dependencies
```

---

## 🔌 API Reference

All product endpoints are under `/api/v1/` and require session authentication.

### Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/profile` | Get cached skill profile |
| `POST` | `/api/v1/profile/analyze` | Trigger skill analysis (returns `jobId`) |

### Issues

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/issues` | List discovered issues (paginated, filterable) |
| `POST` | `/api/v1/issues/discover` | Trigger issue discovery (returns `jobId`) |
| `GET` | `/api/v1/issues/:id` | Get full issue detail with AI explanation |
| `PATCH` | `/api/v1/issues/:id` | Save or dismiss an issue |
| `POST` | `/api/v1/issues/:id/explain` | Trigger AI issue explanation |
| `GET` | `/api/v1/issues/:id/plan` | Get implementation plan |
| `POST` | `/api/v1/issues/:id/plan` | Generate implementation plan |

### Repositories

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/repos` | List discovered repos (filterable) |

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/jobs/:id` | Poll job status |

### Account (GDPR)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/account/data` | Export all user data (JSON) |
| `DELETE` | `/api/v1/account` | Delete account and all data |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ready` | Readiness probe (DB + Redis) |

---

## 🔐 Security

ContribPath implements defense-in-depth security:

| Measure | Implementation |
|---|---|
| **Token Encryption** | GitHub access tokens encrypted at rest with AES-256-GCM |
| **Session Security** | HttpOnly, Secure cookies; database-backed sessions |
| **CSRF Protection** | Origin validation on all mutating requests |
| **Input Sanitization** | Zod schemas on all API inputs + XSS sanitization |
| **LLM Sanitization** | Prompt injection filtering before sending user content to LLM |
| **Display Sanitization** | HTML/script stripping on all user-generated content |
| **Rate Limiting** | Per-user Redis sliding window on all endpoints |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| **Minimal OAuth Scopes** | `read:user`, `read:org` only — no write access to repos |
| **GDPR Compliance** | Cookie consent, data export, account deletion |

---

## 🎨 Design System

ContribPath uses a bespoke **"Obsidian & Neon"** design language — a premium, cinematic dark mode with depth-driven UI:

- **Backgrounds**: Deep obsidian (`hsl(240, 10%, 4%)`) with elevated surfaces
- **Accent**: Electric violet (`hsl(267, 100%, 65%)`) + cyan (`hsl(180, 100%, 50%)`)
- **Typography**: Space Grotesk (headings) + Inter (body) + JetBrains Mono (code/metadata)
- **Animations**: Physics-based springs (Framer Motion), staggered entry, spotlight hover effects
- **Cards**: Glassmorphism with mouse-following radial gradient spotlight
- **Buttons**: Magnetic hover lift with neon glow, press-down physics

> See [`DESIGN.md`](./DESIGN.md) for the full design specification.

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with watch mode
pnpm vitest

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

Test coverage includes:
- **Agent logic** — Unit tests with mocked GitHub API and LLM responses
- **API routes** — Integration tests for all endpoints
- **Auth flow** — Session validation and token encryption
- **Security** — CSRF protection, input sanitization, rate limiting
- **Components** — React Testing Library rendering tests

---

## 🚢 Deployment

### Recommended Architecture

| Component | Platform | Notes |
|---|---|---|
| **Web App** | [Vercel](https://vercel.com) | Automatic deployments from `main` |
| **Agent Workers** | [Railway](https://railway.app) | Long-running processes outside serverless |
| **Database** | [Supabase](https://supabase.com) | Managed PostgreSQL |
| **Queue Redis** | [Redis Cloud](https://redis.io/cloud) or Railway | Must support Redis protocol + persistence |
| **Cache Redis** | [Upstash](https://upstash.com) | Serverless Redis for caching + rate limits |

### Environment Requirements

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (durable instance for BullMQ)
- Separate Redis instance for caching (optional, can share)

---

## 🗺️ Roadmap

### ✅ MVP (Current)
- [x] GitHub OAuth login
- [x] Skill analysis from public GitHub data
- [x] Personalized issue discovery
- [x] AI-powered issue explanations
- [x] Step-by-step implementation plans
- [x] PR draft generation
- [x] Repository health scoring
- [x] Persistent sessions with saved issues

### 🔮 Phase 2 (Planned)
- [ ] Autonomous branch creation & draft implementation via GitHub API
- [ ] GitLab and Bitbucket integration
- [ ] Portfolio website parsing for non-GitHub skills
- [ ] Maintainer-side GitHub App for auto-labelling issues
- [ ] Slack / Discord notifications
- [ ] Community leaderboard (Hacktoberfest / GSoC mode)

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/your-feature`
3. **Commit** your changes: `git commit -m 'feat: add your feature'`
4. **Push** to the branch: `git push origin feat/your-feature`
5. **Open** a Pull Request

> **Ironically, you can use ContribPath itself to find issues to work on in this repo! 🔄**

### Development Scripts

```bash
pnpm dev              # Start Next.js dev server
pnpm worker           # Start agent worker
pnpm retention        # Start retention cleanup worker
pnpm build            # Production build
pnpm test             # Run tests
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run database migrations
```

---

## 📄 License

This project is open source. See the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <strong>Built with ❤️ to make open source accessible to everyone.</strong>
  <br />
  <sub>Stop scrolling through GitHub. Start contributing.</sub>
</p>
