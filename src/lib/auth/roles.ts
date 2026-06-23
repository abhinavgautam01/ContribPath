export type AppRole = "user" | "admin";

export function normalizeRole(value: unknown): AppRole {
  return value === "admin" ? "admin" : "user";
}

export function isAdminRole(value: unknown) {
  return normalizeRole(value) === "admin";
}
