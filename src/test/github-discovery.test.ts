import { describe, expect, it } from "vitest";
import { buildIssueSearchQueries, discoverySearchLanguages } from "@/lib/providers/github";
import type { SkillProfile } from "@/lib/types";

const profile = (languages: SkillProfile["languages"]): Pick<SkillProfile, "languages"> => ({ languages });

describe("GitHub issue discovery query planning", () => {
  it("builds separate label queries for each top language", () => {
    expect(buildIssueSearchQueries(["TypeScript"])).toEqual([
      {
        language: "TypeScript",
        label: "good first issue",
        q: 'is:issue is:open label:"good first issue" language:TypeScript no:assignee'
      },
      {
        language: "TypeScript",
        label: "help wanted",
        q: 'is:issue is:open label:"help wanted" language:TypeScript no:assignee'
      }
    ]);
  });

  it("uses at most the top three profile languages", () => {
    expect(
      discoverySearchLanguages(
        profile([
          { name: "TypeScript", percentage: 50 },
          { name: "Go", percentage: 25 },
          { name: "Rust", percentage: 15 },
          { name: "Ruby", percentage: 10 }
        ])
      )
    ).toEqual(["TypeScript", "Go", "Rust"]);
  });

  it("falls back for empty or notebook/documentation-heavy profiles", () => {
    expect(discoverySearchLanguages(profile([]))).toEqual(["JavaScript", "Python"]);
    expect(discoverySearchLanguages(profile([{ name: "Jupyter Notebook", percentage: 70 }, { name: "Markdown", percentage: 30 }]))).toEqual(["Python"]);
  });
});
