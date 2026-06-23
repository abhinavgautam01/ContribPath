import { auth } from "@/auth";
import { json } from "@/lib/api";
import { getStoredRepos } from "@/lib/db/app-data";
import { parsePaginationParams, parsePositiveInteger } from "@/lib/pagination";
import { defaultRepoFilters, paginate, repoMatchesFilters } from "@/lib/repo-filters";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePaginationParams(searchParams);
  const filters = {
    ...defaultRepoFilters,
    language: searchParams.get("language") ?? defaultRepoFilters.language,
    minScore: parsePositiveInteger(searchParams.get("min_score"), defaultRepoFilters.minScore)
  };
  const session = await auth();
  const storedRepos = session?.user.id && session.user.id !== "user_demo" ? await getStoredRepos(session.user.id) : [];
  const sourceRepos = storedRepos.length ? storedRepos : getState().repos;
  const filtered = sourceRepos.filter((repo) => repoMatchesFilters(repo, filters));
  const { items, pagination } = paginate(filtered, page, limit);
  return json({
    repos: items,
    pagination
  });
}
