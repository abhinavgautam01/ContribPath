const repoFullNamePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function buildGitHubBlobUrl(repoFullName: string, filePath: string, ref = "HEAD") {
  const cleanPath = filePath.trim();
  if (!repoFullNamePattern.test(repoFullName) || !cleanPath || cleanPath.includes("..")) return null;
  const encodedPath = cleanPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  if (!encodedPath) return null;
  return `https://github.com/${repoFullName}/blob/${encodeURIComponent(ref)}/${encodedPath}`;
}
