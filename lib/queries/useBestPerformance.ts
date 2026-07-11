import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getBestPerformers,
  type BestPerformanceResponse,
} from "@/lib/best-performance-api";
import type { AuthCtx } from "./useNotifications";

export function useBestPerformers(
  ctx: AuthCtx,
  params?: { from?: string; to?: string; classId?: string; academicYearId?: string; limit?: number },
  options?: Omit<UseQueryOptions<BestPerformanceResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<BestPerformanceResponse, Error>({
    queryKey: queryKeys.bestPerformance.list(ctx.clientId, params),
    queryFn: () => getBestPerformers(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}
