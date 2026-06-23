import Link from "next/link";
import { CodeBlock, GithubLogo, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { MagneticLink } from "@/components/magnetic-button";
import { hasGitHubOAuth } from "@/lib/env";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/issues", label: "Issues" },
  { href: "/repos", label: "Repos" },
  { href: "/saved", label: "Saved" }
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/60 backdrop-blur-md">
      <div className="content-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <CodeBlock weight="fill" className="text-accent-primary" size={22} />
          ContribPath
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-border-subtle bg-base/60 px-3 py-2 text-sm text-text-muted lg:flex">
            <MagnifyingGlass size={16} />
            Search issues
          </div>
          <MagneticLink href="/auth/signin" variant="primary">
            <GithubLogo size={18} />
            {hasGitHubOAuth() ? "Sign In" : "Demo Sign In"}
          </MagneticLink>
        </div>
      </div>
    </header>
  );
}
