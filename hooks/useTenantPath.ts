import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getTenantSlugFromPath, withTenantPrefix } from "@/lib/tenant-routing";

export function useTenantPath() {
  const { pathname } = useLocation();
  const tenantSlug = getTenantSlugFromPath(pathname);

  return useCallback(
    (path: string) => withTenantPrefix(path, tenantSlug),
    [tenantSlug],
  );
}
