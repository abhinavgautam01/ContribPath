import { MagneticLink } from "@/components/magnetic-button";
import type { ReactNode } from "react";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center">
      <pre className="mx-auto mb-6 w-fit text-left font-mono text-xs leading-4 text-accent-secondary/70" aria-hidden>
        {`╭────────────╮
│  ◆  ◇  ◆  │
│ ◇  ───  ◇ │
│  ◆  ◇  ◆  │
╰────────────╯`}
      </pre>
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-text-secondary">{body}</p>
      {action ?? (
        <MagneticLink href="/issues" variant="primary" className="mt-6">
          Clear filters
        </MagneticLink>
      )}
    </div>
  );
}
