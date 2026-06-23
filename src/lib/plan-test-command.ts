import type { Issue } from "@/lib/types";

const extensionLanguage: Record<string, "go" | "typescript" | "python" | "rust"> = {
  ".go": "go",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "typescript",
  ".jsx": "typescript",
  ".py": "python",
  ".rs": "rust"
};

export function inferIssueLanguage(issue: Pick<Issue, "likelyFiles" | "repoId">) {
  const paths = issue.likelyFiles.map((file) => file.path.toLowerCase());
  for (const path of paths) {
    const extension = Object.keys(extensionLanguage).find((candidate) => path.endsWith(candidate));
    if (extension) return extensionLanguage[extension];
  }

  const repoId = issue.repoId.toLowerCase();
  if (repoId.includes("go")) return "go";
  if (repoId.includes("py") || repoId.includes("python")) return "python";
  if (repoId.includes("rust")) return "rust";
  return "typescript";
}

export function testCommandForIssue(issue: Pick<Issue, "likelyFiles" | "repoId">) {
  const language = inferIssueLanguage(issue);
  if (language === "go") return "go test ./...";
  if (language === "python") return "pytest";
  if (language === "rust") return "cargo test";
  return "pnpm test";
}
