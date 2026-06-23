CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'github',
  provider_account_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scope TEXT NOT NULL,
  token_type TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  languages JSONB NOT NULL DEFAULT '[]',
  frameworks JSONB NOT NULL DEFAULT '[]',
  difficulty TEXT NOT NULL,
  preferred_domain TEXT,
  total_repos INT,
  total_prs INT,
  raw_data JSONB,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS discovered_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  language TEXT,
  stars INT,
  forks INT,
  health_score INT,
  health_breakdown JSONB,
  skill_match_score INT,
  final_score INT,
  metadata_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  health_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours'),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_repo_id)
);

CREATE TABLE IF NOT EXISTS discovered_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  repo_id UUID REFERENCES discovered_repos(id) ON DELETE CASCADE,
  github_issue_number INT NOT NULL,
  github_node_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  labels JSONB DEFAULT '[]',
  difficulty_estimate TEXT,
  time_estimate_mins INT,
  ai_summary TEXT,
  likely_files JSONB DEFAULT '[]',
  issue_context JSONB DEFAULT '{}',
  github_url TEXT,
  state TEXT DEFAULT 'open',
  explained_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  saved BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, repo_id, github_issue_number)
);

CREATE TABLE IF NOT EXISTS implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES discovered_issues(id) ON DELETE CASCADE,
  steps JSONB NOT NULL DEFAULT '[]',
  pr_title TEXT,
  pr_description TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, issue_id)
);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  queue_job_id TEXT,
  result_id UUID,
  input_payload JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_profiles_user_id ON skill_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_discovered_repos_user_id ON discovered_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_discovered_issues_user_id ON discovered_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_discovered_issues_repo_id ON discovered_issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id_status ON agent_jobs(user_id, status);
