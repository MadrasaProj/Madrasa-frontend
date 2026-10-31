import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getBestPerformers,
  getOverallBestStudents,
  type BestPerformanceResponse,
  type OverallBestPerformanceResponse,
} from "@/lib/best-performance-api";
import type { AuthCtx } from "./useNotifications";

export function useBestPerformers(
  ctx: AuthCtx,
  params?: { from?: string; to?: string; classId?: string; gender?: string; academicYearId?: string; limit?: number },
  options?: Omit<UseQueryOptions<BestPerformanceResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<BestPerformanceResponse, Error>({
    queryKey: queryKeys.bestPerformance.list(ctx.clientId, params),
    queryFn: () => getBestPerformers(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}

export function useOverallBestStudents(
  ctx: AuthCtx,
  params?: { from?: string; to?: string; classId?: string; gender?: string; academicYearId?: string; limit?: number },
  options?: Omit<UseQueryOptions<OverallBestPerformanceResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<OverallBestPerformanceResponse, Error>({
    queryKey: ["best-performance", "overall", ctx.clientId, params],
    queryFn: () => getOverallBestStudents(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}
