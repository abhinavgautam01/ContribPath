import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/badge";
import { MagneticButton } from "@/components/magnetic-button";
import { signIn } from "@/auth";
import { hasGitHubOAuth } from "@/lib/env";

export default function SignInPage() {
  const provider = hasGitHubOAuth() ? "github" : "demo";

  async function signInAction() {
    "use server";
    await signIn(provider, { redirectTo: "/dashboard" });
  }

  return (
    <>
      <AppNav />
      <main className="content-shell flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <section className="w-full max-w-xl rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-glow">
          <Badge className="border-accent-secondary/25 bg-[var(--accent-secondary-bg)] text-accent-secondary">Demo auth</Badge>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight">Connect GitHub</h1>
          <p className="mt-3 text-text-secondary">
            Local demo mode routes directly to the dashboard. Add GitHub OAuth variables from `SPEC.md` to enable real sign-in later.
          </p>
          <form action={signInAction} className="mt-8">
            <MagneticButton variant="primary" type="submit">
              <GithubLogo size={20} />
              {hasGitHubOAuth() ? "Continue with GitHub" : "Continue in demo mode"}
            </MagneticButton>
          </form>
        </section>
      </main>
    </>
  );
}
