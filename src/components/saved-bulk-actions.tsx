"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Prohibit, SpinnerGap } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";

export function SavedBulkActions({ visibleIds, allIds }: { visibleIds: string[]; allIds: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function dismiss(issueIds: string[]) {
    setError("");
    const response = await fetch("/api/v1/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueIds, dismissed: true })
    });

    if (!response.ok) {
      setError("Could not bulk-dismiss saved issues.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <MagneticButton type="button" variant="ghost" disabled={isPending || !visibleIds.length} onClick={() => dismiss(visibleIds)}>
          {isPending ? <SpinnerGap className="animate-spin" size={17} /> : <Prohibit size={17} />}
          Dismiss visible
        </MagneticButton>
        <MagneticButton type="button" variant="ghost" className="border-rose-300/30 text-rose-100 hover:text-rose-50" disabled={isPending || !allIds.length} onClick={() => dismiss(allIds)}>
          <Prohibit size={17} />
          Dismiss all saved
        </MagneticButton>
      </div>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
    </div>
  );
}
