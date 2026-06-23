import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border-subtle bg-white/[0.02] px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-wide text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
