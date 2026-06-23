"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkSimple, Prohibit } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";
import { cn } from "@/lib/utils";

export function IssueActions({
  issueId,
  initialSaved,
  initialDismissed = false,
  compact = false
}: {
  issueId: string;
  initialSaved: boolean;
  initialDismissed?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(initialSaved);
  const [dismissed, setDismissed] = useState(initialDismissed);
  const [error, setError] = useState<string | null>(null);

  async function patchIssue(patch: { saved?: boolean; dismissed?: boolean }) {
    setError(null);
    const previous = { saved, dismissed };
    if (typeof patch.saved === "boolean") setSaved(patch.saved);
    if (typeof patch.dismissed === "boolean") setDismissed(patch.dismissed);

    try {
      const response = await fetch(`/api/v1/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!response.ok) throw new Error("Issue update failed");
      startTransition(() => router.refresh());
    } catch {
      setSaved(previous.saved);
      setDismissed(previous.dismissed);
      setError("Could not update issue.");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "justify-end")}>
      <MagneticButton
        type="button"
        variant={saved ? "primary" : "default"}
        className={cn(compact && "px-3 py-2")}
        disabled={isPending || dismissed}
        aria-pressed={saved}
        onClick={() => patchIssue({ saved: !saved })}
      >
        <BookmarkSimple size={17} weight={saved ? "fill" : "regular"} />
        {saved ? "Saved" : "Save"}
      </MagneticButton>
      <MagneticButton
        type="button"
        variant="ghost"
        className={cn("text-text-muted hover:text-danger", compact && "px-3 py-2")}
        disabled={isPending || dismissed}
        onClick={() => patchIssue({ dismissed: true })}
      >
        <Prohibit size={17} />
        {dismissed ? "Dismissed" : "Dismiss"}
      </MagneticButton>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
