import React from "react";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "magnetic-button inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 font-sans text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50";

export function MagneticButton({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" }) {
  return (
    <button
      className={cn(
        base,
        variant === "primary" && "border-accent-primary/70 bg-accent-primary/10 shadow-glow hover:bg-accent-primary/15",
        variant === "ghost" && "border-transparent bg-transparent text-text-secondary hover:text-text-primary",
        variant === "default" && "bg-surface-elevated hover:border-border-hover",
        className
      )}
      {...props}
    />
  );
}

export function MagneticLink({
  className,
  variant = "default",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: "default" | "primary" | "ghost" }) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        variant === "primary" && "border-accent-primary/70 bg-accent-primary/10 shadow-glow hover:bg-accent-primary/15",
        variant === "ghost" && "border-transparent bg-transparent text-text-secondary hover:text-text-primary",
        variant === "default" && "bg-surface-elevated hover:border-border-hover",
        className
      )}
      {...props}
    />
  );
}
