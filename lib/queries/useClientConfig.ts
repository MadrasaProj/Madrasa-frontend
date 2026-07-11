import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getClientConfig, type ClientConfig } from "@/lib/config-api";
import type { AuthCtx } from "./useNotifications";

export function useClientConfig(
  ctx: AuthCtx,
  options?: Omit<UseQueryOptions<ClientConfig, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ClientConfig, Error>({
    queryKey: queryKeys.config.client(ctx.clientId),
    queryFn: () => getClientConfig(ctx.clientId, ctx.token),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 10 * 60_000,
    ...options,
  });
}
