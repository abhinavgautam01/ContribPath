export const PROFILE_REANALYZE_COOLDOWN_MS = 60 * 60 * 1000;

export class ProfileAnalysisBlockedError extends Error {
  constructor(
    message: string,
    public readonly code: "organization-account"
  ) {
    super(message);
    this.name = "ProfileAnalysisBlockedError";
  }
}

export function getProfileReanalysisState(analyzedAt: string, now = Date.now()) {
  const analyzedAtMs = Date.parse(analyzedAt);
  if (Number.isNaN(analyzedAtMs)) {
    return { canReanalyze: true, waitMinutes: 0 };
  }
  const remainingMs = PROFILE_REANALYZE_COOLDOWN_MS - (now - analyzedAtMs);
  return {
    canReanalyze: remainingMs <= 0,
    waitMinutes: Math.max(0, Math.ceil(remainingMs / 60000))
  };
}

export function assertAnalyzableGitHubAccount(account: { type?: string | null }) {
  if (account.type === "Organization") {
    throw new ProfileAnalysisBlockedError("Organization accounts cannot be analysed as contributor profiles.", "organization-account");
  }
}
