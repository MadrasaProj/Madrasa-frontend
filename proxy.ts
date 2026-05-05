import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BYPASS_PREFIXES = [
  "/_next",
  "/api",
  "/icons",
  "/sw.js",
  "/manifest.webmanifest",
  "/favicon",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.nextUrl.hostname.toLowerCase();

  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const tenantLogin = pathname.match(/^\/m\/([^/]+)\/login\/?$/i);
  if (tenantLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/m/${tenantLogin[1].toLowerCase()}/admin/login`;
    return NextResponse.redirect(redirectUrl);
  }

  const tenantRoleLogin = pathname.match(
    /^\/m\/([^/]+)\/(admin|teacher|parent)\/login\/?$/i,
  );
  if (tenantRoleLogin) {
    return NextResponse.next();
  }

  const tenantRoute = pathname.match(
    /^\/m\/([^/]+)\/(admin|teacher|parent|committee)(\/.*)?$/i,
  );
  if (tenantRoute) {
    const role = tenantRoute[2].toLowerCase();
    const rest = tenantRoute[3] ?? "";
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${role}${rest}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  const hostParts = host.split(".");
  const hasSubdomainTenant = hostParts.length >= 3;
  const tenantFromHost = hasSubdomainTenant ? hostParts[0] : null;
  if (
    tenantFromHost &&
    !["www", "app", "api", "admin", "localhost"].includes(tenantFromHost) &&
    pathname === "/"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/m/${tenantFromHost}/admin/login`;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
