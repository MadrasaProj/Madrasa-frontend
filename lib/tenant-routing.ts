export type ActorType = "SUPER_ADMIN" | "CLIENT_ADMIN" | "TEACHER" | "PARENT" | "COMMITTEE";

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
  role: "admin" | "teacher" | "parent" | "committee" = "admin",
): string {
  if (!tenantSlug) return "/super-admin/login";
  return `/m/${tenantSlug}/${role}/login`;
}
