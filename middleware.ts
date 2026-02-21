import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/api", "/_next", "/mock", "/favicon.ico"];
const SESSION_COOKIE = "mrdt_session";

const ROUTE_ACCESS: Record<string, string[]> = {
  "/executive": ["executive", "admin"],
  "/operations": ["operator", "admin"],
  "/governance": ["governance", "admin"],
  "/settings": ["admin"],
  "/dashboard": ["executive", "operator", "governance", "admin"],
};

const DEFAULT_ROUTES: Record<string, string> = {
  executive: "/executive",
  operator: "/operations/dashboard",
  governance: "/governance/incidents",
  admin: "/dashboard",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Read session cookie
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  let role: string;
  try {
    const session = JSON.parse(decodeURIComponent(cookie.value));
    role = session.role;
  } catch {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check route authorization
  if (role !== "admin") {
    for (const [prefix, roles] of Object.entries(ROUTE_ACCESS)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (!roles.includes(role)) {
          const defaultRoute = DEFAULT_ROUTES[role] ?? "/dashboard";
          const redirectUrl = new URL(defaultRoute, request.url);
          return NextResponse.redirect(redirectUrl);
        }
        break;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mock/).*)"],
};
