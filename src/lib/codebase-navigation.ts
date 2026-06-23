import type { Issue, LikelyFile } from "@/lib/types";

const binaryExtensions = new Set([
  ".avif",
  ".bin",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".zip"
]);

const generatedPathSegments = new Set(["dist", "build", "coverage", "vendor", "node_modules", ".next", "out"]);
const generatedFilePatterns = [/\.min\.[cm]?js$/i, /\.generated\./i, /(^|\/)package-lock\.json$/i, /(^|\/)pnpm-lock\.yaml$/i];

export type CodebaseNavigationResult = {
  likelyFiles: LikelyFile[];
  issueContextPatch: Pick<Issue["issueContext"], "gotchas" | "stale">;
};

export function isBinaryPath(path: string) {
  const lower = path.toLowerCase();
  return [...binaryExtensions].some((extension) => lower.endsWith(extension));
}

export function isGeneratedPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.some((segment) => generatedPathSegments.has(segment)) || generatedFilePatterns.some((pattern) => pattern.test(path));
}

export function validateLikelyFilesAgainstTree(issue: Issue, treePaths: string[]): CodebaseNavigationResult {
  const availablePaths = new Set(treePaths);
  const gotchas = [...issue.issueContext.gotchas];
  const likelyFiles: LikelyFile[] = [];
  let stale = false;

  for (const file of issue.likelyFiles) {
    if (isBinaryPath(file.path)) {
      gotchas.push(`Agent suggested binary file ${file.path}; review manually before editing.`);
      continue;
    }
    if (isGeneratedPath(file.path)) {
      gotchas.push(`Don't edit generated file ${file.path}; find the source file instead.`);
      continue;
    }
    if (!availablePaths.has(file.path)) {
      stale = true;
      gotchas.push(`Suggested file ${file.path} was not found in the current repository tree.`);
      continue;
    }
    likelyFiles.push({
      ...file,
      reason: file.reason.includes("Validated against GitHub tree") ? file.reason : `${file.reason} Validated against GitHub tree.`
    });
  }

  if (!likelyFiles.length && issue.likelyFiles.length) {
    stale = true;
  }

  return {
    likelyFiles,
    issueContextPatch: {
      gotchas: [...new Set(gotchas)],
      stale: stale || issue.issueContext.stale
    }
  };
}
