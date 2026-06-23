import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanTimeline } from "@/components/plan-timeline";
import type { ImplementationPlan } from "@/lib/types";

const plan: ImplementationPlan = {
  id: "plan_test",
  issueId: "issue_test",
  steps: [
    {
      step: 1,
      title: "Read the issue",
      description: "Understand the expected behavior.",
      files: ["README.md"],
      tips: ["Check maintainer notes first."]
    }
  ],
  prTitle: "fix: test",
  prDescription: "## Summary\n\nTest",
  generatedAt: "2026-06-21T10:00:00.000Z"
};

describe("PlanTimeline", () => {
  it("toggles completed styling for implementation steps", () => {
    render(<PlanTimeline plan={plan} repoFullName="owner/repo" />);

    const toggle = screen.getByRole("button", { name: "Mark step 1 complete" });
    const title = screen.getByText("Read the issue");

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(title).not.toHaveClass("line-through");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mark step 1 incomplete" })).toBeInTheDocument();
    expect(title).toHaveClass("line-through");
    expect(title.closest(".min-w-0")).toHaveClass("opacity-50");
  });
});
