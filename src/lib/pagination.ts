export type PaginationParams = {
  page: number;
  limit: number;
};

export function parsePositiveInteger(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  return typeof max === "number" ? Math.min(normalized, max) : normalized;
}

export function parsePaginationParams(searchParams: URLSearchParams, defaults: PaginationParams = { page: 1, limit: 10 }, maxLimit = 50) {
  return {
    page: parsePositiveInteger(searchParams.get("page"), defaults.page),
    limit: parsePositiveInteger(searchParams.get("limit"), defaults.limit, maxLimit)
  };
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
  const start = (normalizedPage - 1) * normalizedLimit;

  return {
    items: items.slice(start, start + normalizedLimit),
    pagination: {
      total: items.length,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages: Math.max(1, Math.ceil(items.length / normalizedLimit))
    }
  };
}
