export type UserRole = "executive" | "operator" | "governance" | "admin";

export interface AuthSession {
  username: string;
  role: UserRole;
  authenticated_at: string;
}

export interface UserCredential {
  password: string;
  role: UserRole;
  default_route: string;
}

export const CREDENTIALS: Record<string, UserCredential> = {
  executive: { password: "exec2026", role: "executive", default_route: "/executive" },
  operator: { password: "ops2026", role: "operator", default_route: "/operations/dashboard" },
  governance: { password: "gov2026", role: "governance", default_route: "/governance/incidents" },
  admin: { password: "admin2026", role: "admin", default_route: "/dashboard" },
};

/**
 * Route access matrix. Each key is a route prefix, value is the set of roles allowed.
 * Admin has access to everything — handled in isAuthorized().
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/executive": ["executive"],
  "/operations": ["operator"],
  "/governance": ["governance"],
  "/settings": ["admin"],
  "/dashboard": ["executive", "operator", "governance", "admin"],
};

/** Public routes that bypass auth entirely */
export const PUBLIC_ROUTES = ["/login", "/api", "/_next", "/mock", "/favicon.ico"];

export const SESSION_KEY = "mrdt_session";
export const SESSION_COOKIE = "mrdt_session";

/**
 * Check if a role is authorized to access a given path.
 */
export function isAuthorizedForPath(role: UserRole, path: string): boolean {
  if (role === "admin") return true;

  for (const [prefix, roles] of Object.entries(ROUTE_ACCESS)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return roles.includes(role);
    }
  }

  // Routes not in the matrix are accessible to all authenticated users
  return true;
}

/**
 * Get the default route for a role.
 */
export function getDefaultRoute(role: UserRole): string {
  const entry = Object.values(CREDENTIALS).find((c) => c.role === role);
  return entry?.default_route ?? "/dashboard";
}
