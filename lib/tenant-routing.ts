export type ActorType = "SUPER_ADMIN" | "CLIENT_ADMIN" | "TEACHER" | "PARENT" | "COMMITTEE" | "TEAM_LEADER";
export type RouteRole = "admin" | "teacher" | "parent" | "committee";

type SessionForRedirect = {
  actorType?: ActorType | string;
  role?: RouteRole | string;
  tenantSlug?: string | null;
};

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "localhost",
]);

function isIpLikeHost(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

export function getTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/m\/([^/]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function getTenantSlugFromHost(hostname: string): string | null {
  const host = hostname.split(":")[0].toLowerCase();
  if (!host || host === "localhost" || isIpLikeHost(host)) return null;

  // Handle staging environment
  if (host === "madrasa.feztify.com") {
    return null;
  }
  if (host.endsWith(".madrasa.feztify.com")) {
    const prefix = host.substring(0, host.length - ".madrasa.feztify.com".length);
    const parts = prefix.split(".");
    const subdomain = parts[parts.length - 1];
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
    return subdomain;
  }

  // General fallback (for smartmadrasa.app and local development)
  const parts = host.split(".");
  if (parts.length < 3) return null;

  const subdomain = parts[0];
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

export function detectTenantSlug(
  pathname?: string,
  hostname?: string,
): string | null {
  if (pathname) {
    const byPath = getTenantSlugFromPath(pathname);
    if (byPath) return byPath;
  }

  if (hostname) {
    const byHost = getTenantSlugFromHost(hostname);
    if (byHost) return byHost;
  }

  return null;
}

export function stripTenantPrefix(pathname: string): string {
  const match = pathname.match(/^\/m\/[^/]+(\/.*)?$/i);
  if (!match) return pathname;
  return match[1] || "/";
}

export function getRoleFromPath(pathname: string): RouteRole | null {
  const path = stripTenantPrefix(pathname).toLowerCase();
  const match = path.match(/^\/(admin|teacher|parent|committee)(?:\/|$)/);
  return (match?.[1] as RouteRole | undefined) ?? null;
}

export function withTenantPrefix(
  path: string,
  tenantSlug?: string | null,
): string {
  if (!tenantSlug) return path;
  if (path.startsWith("/m/")) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/m/${tenantSlug}${normalizedPath}`;
}

export function roleHomePath(params: {
  role: "admin" | "teacher" | "parent" | "committee";
  actorType?: ActorType;
  tenantSlug?: string | null;
}): string {
  if (params.tenantSlug && params.actorType !== "SUPER_ADMIN") {
    return `/m/${params.tenantSlug}/${params.role}`;
  }
  return `/${params.role}`;
}

export function tenantLoginPath(
  tenantSlug?: string | null,
  role: RouteRole = "admin",
): string {
  if (!tenantSlug) return "/super-admin/login";
  return `/m/${tenantSlug}/${role}/login`;
}

export function roleFromActorType(actorType?: ActorType | string): RouteRole | null {
  switch (actorType) {
    case "CLIENT_ADMIN":
      return "admin";
    case "TEACHER":
    case "TEAM_LEADER":
      return "teacher";
    case "PARENT":
      return "parent";
    case "COMMITTEE":
      return "committee";
    default:
      return null;
  }
}

export function resolveLoginRedirectPath(params: {
  pathname: string;
  hostname?: string;
  user?: SessionForRedirect | null;
  activeTenantSlug?: string | null;
}): string {
  const { pathname, hostname, user, activeTenantSlug } = params;

  if (user?.actorType === "SUPER_ADMIN") return "/super-admin/login";

  const tenantSlug =
    user?.tenantSlug ??
    activeTenantSlug ??
    detectTenantSlug(pathname, hostname);

  const sessionRole = roleFromActorType(user?.actorType);
  if (sessionRole) return tenantLoginPath(tenantSlug, sessionRole);

  const routeRole = getRoleFromPath(pathname);
  if (routeRole) return tenantLoginPath(tenantSlug, routeRole);

  return tenantLoginPath(tenantSlug);
}
