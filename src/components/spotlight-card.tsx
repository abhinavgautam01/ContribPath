"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({ className, onMouseMove, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "spotlight-card rounded-2xl border border-border-subtle bg-surface p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-elevated",
        className
      )}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
        onMouseMove?.(event);
      }}
      {...props}
    />
  );
}
