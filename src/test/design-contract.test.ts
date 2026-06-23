import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("DESIGN.md implementation contract", () => {
  it("defines required Obsidian & Neon CSS tokens", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    [
      "--bg-base",
      "--bg-surface",
      "--bg-surface-elevated",
      "--accent-primary",
      "--accent-secondary",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--border-subtle"
    ].forEach((token) => expect(css).toContain(token));
  });

  it("implements spotlight and magnetic interaction classes", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    expect(css).toContain(".spotlight-card");
    expect(css).toContain("--mouse-x");
    expect(css).toContain(".magnetic-button");
    expect(css).toContain("prefers-reduced-motion");
  });
});
