"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { DownloadSimple, SpinnerGap, Trash } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";

function downloadJson(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `contribpath-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AccountDataActions() {
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setStatus("Preparing export");
    setError(null);
    try {
      const response = await fetch("/api/v1/me/export");
      if (!response.ok) throw new Error("Export failed");
      downloadJson(await response.json());
      setStatus("Export downloaded");
    } catch {
      setStatus(null);
      setError("Could not export account data.");
    }
  }

  function deleteAccount() {
    setStatus("Deleting account");
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/me", { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
        await signOut({ callbackUrl: "/auth/signin" });
      } catch {
        setStatus(null);
        setError("Could not delete account data.");
      }
    });
  }

  const canDelete = confirmText === "DELETE";

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-8">
      <h2 className="font-display text-2xl font-bold">Privacy controls</h2>
      <p className="mt-2 text-text-secondary">
        Export stored profile, repository, issue, plan, and job metadata as JSON. OAuth tokens are never included.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <MagneticButton type="button" variant="primary" onClick={exportData}>
          <DownloadSimple size={18} />
          Export data
        </MagneticButton>
        {status ? <span className="text-sm text-text-muted">{status}</span> : null}
      </div>
      <div className="mt-8 rounded-xl border border-rose-300/20 bg-rose-300/5 p-5">
        <h3 className="font-display text-xl font-bold text-rose-100">Delete account data</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          This removes stored account rows and user-scoped runtime data. Type DELETE to enable the action.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-border-subtle bg-base px-3 py-2.5 font-mono text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-rose-300/40 focus:ring-2 focus:ring-rose-300/20 sm:max-w-[180px]"
          />
          <MagneticButton type="button" variant="ghost" className="border-rose-300/30 text-rose-100 hover:text-rose-50" disabled={!canDelete || isPending} onClick={deleteAccount}>
            {isPending ? <SpinnerGap className="animate-spin" size={18} /> : <Trash size={18} />}
            Delete account
          </MagneticButton>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
