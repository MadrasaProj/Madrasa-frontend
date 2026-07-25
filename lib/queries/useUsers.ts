import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { apiFetch } from "@/lib/fetch";
import type { AuthCtx } from "./useNotifications";

export interface UserRecord {
  id: string;
  name: string;
}

export function useUsers(
  ctx: AuthCtx,
  options?: Omit<UseQueryOptions<{ data: UserRecord[] }, Error>, "queryKey" | "queryFn">,
) {
  const url = `${import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000"}/api/v2/${ctx.clientId}/users`;
  return useQuery<{ data: UserRecord[] }, Error>({
    queryKey: queryKeys.users.list(ctx.clientId),
    queryFn: () => apiFetch<{ data: UserRecord[] }>(url, ctx.token),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 10 * 60_000, // cache for 10 minutes
    ...options,
  });
}
