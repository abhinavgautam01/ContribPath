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

export type CodebaseNavigationFileContent = {
  path: string;
  content?: string;
  sizeBytes?: number;
  skippedReason?: string;
};

export function isBinaryPath(path: string) {
  const lower = path.toLowerCase();
  return [...binaryExtensions].some((extension) => lower.endsWith(extension));
}

export function isGeneratedPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.some((segment) => generatedPathSegments.has(segment)) || generatedFilePatterns.some((pattern) => pattern.test(path));
}

function pathDepth(path: string) {
  return path.split("/").filter(Boolean).length;
}

export function capTreePathsForNavigation(treePaths: string[], likelyFiles: Pick<LikelyFile, "path">[]) {
  const likelyPaths = new Set(likelyFiles.map((file) => file.path));
  const likelyDirectories = new Set(
    likelyFiles
      .map((file) => file.path.split("/").filter(Boolean).slice(0, -1).join("/"))
      .filter(Boolean)
  );

  return treePaths.filter((path) => {
    if (pathDepth(path) <= 3 || likelyPaths.has(path)) return true;
    return [...likelyDirectories].some((directory) => path.startsWith(`${directory}/`));
  });
}

export function validateLikelyFilesAgainstTree(issue: Issue, treePaths: string[]): CodebaseNavigationResult {
  const availablePaths = new Set(capTreePathsForNavigation(treePaths, issue.likelyFiles));
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

function issueSearchTerms(issue: Issue) {
  return [...issue.title.split(/\W+/), ...issue.labels, issue.issueContext.type]
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 4);
}

function codeSectionCandidates(content: string) {
  const patterns = [
    /^\s{0,4}(?:export\s+)?(?:async\s+)?function\s+[\w$]+\b/,
    /^\s{0,4}(?:export\s+)?(?:const|let|var)\s+[\w$]+\s*=/,
    /^\s{0,4}(?:export\s+)?class\s+[\w$]+\b/,
    /^\s{0,4}func\s+(?:\([\w\s*]+\)\s*)?[\w]+\b/,
    /^\s{0,4}(?:def|class)\s+[\w_]+\b/,
    /^\s{0,3}#{1,4}\s+\S+/
  ];

  return content
    .split("\n")
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((candidate) => candidate.line && patterns.some((pattern) => pattern.test(candidate.line)));
}

function inferSection(issue: Issue, file: LikelyFile, content: string) {
  const candidates = codeSectionCandidates(content);
  if (!candidates.length) return "Top of file";
  const terms = [...issueSearchTerms(issue), ...file.reason.split(/\W+/).map((term) => term.toLowerCase()).filter((term) => term.length >= 4)];
  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      score: terms.filter((term) => candidate.line.toLowerCase().includes(term)).length
    }))
    .sort((left, right) => right.score - left.score || left.lineNumber - right.lineNumber);
  const selected = scored[0] ?? candidates[0];
  return `${selected.line} (line ${selected.lineNumber})`;
}

function inferDependencies(path: string, content: string) {
  const dependencies = new Set<string>();
  const lines = content.split("\n").slice(0, 160);
  const extension = path.toLowerCase().split(".").pop();

  for (const line of lines) {
    const trimmed = line.trim();
    const jsImport = trimmed.match(/^import\s+.*?\s+from\s+["'](.+?)["']/) ?? trimmed.match(/^const\s+.+?\s*=\s*require\(["'](.+?)["']\)/);
    const goImport = trimmed.match(/^["']?([A-Za-z0-9_.\-\/]+)["']?$/);
    const pyImport = trimmed.match(/^(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))/);

    if ((extension === "ts" || extension === "tsx" || extension === "js" || extension === "jsx") && jsImport?.[1]) dependencies.add(jsImport[1]);
    if (extension === "go" && trimmed.includes("/") && goImport?.[1]) dependencies.add(goImport[1]);
    if (extension === "py" && (pyImport?.[1] || pyImport?.[2])) dependencies.add(pyImport[1] ?? pyImport[2]!);
  }

  return [...dependencies].slice(0, 5);
}

export function annotateLikelyFilesWithNavigationHints(issue: Issue, fileContents: CodebaseNavigationFileContent[]) {
  const contentByPath = new Map(
    fileContents
      .filter((file): file is CodebaseNavigationFileContent & { content: string } => typeof file.content === "string")
      .map((file) => [file.path, file.content])
  );
  return issue.likelyFiles.map((file) => {
    const content = contentByPath.get(file.path);
    if (!content) return file;
    return {
      ...file,
      navigationHint: {
        section: inferSection(issue, file, content),
        reason: `Start near this section because ${file.reason}`,
        dependencies: inferDependencies(file.path, content)
      }
    };
  });
}

export function skippedFileContentGotchas(fileContents: CodebaseNavigationFileContent[]) {
  return fileContents.map((file) => file.skippedReason).filter((reason): reason is string => Boolean(reason));
}
