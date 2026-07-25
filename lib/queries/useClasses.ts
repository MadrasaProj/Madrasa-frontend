import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAllClasses, getGradeLevels, type ClassRecord, type GradeLevelRecord } from "@/lib/classes-api";
import type { AuthCtx } from "./useNotifications";

export interface UseClassesParams {
  search?: string;
  accademicYearId?: string;
  status?: string;
}

export function useClasses(
  ctx: AuthCtx,
  params?: UseClassesParams,
  options?: Omit<UseQueryOptions<ClassRecord[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ClassRecord[], Error>({
    queryKey: queryKeys.classes.list(ctx.clientId, params),
    queryFn: ({ signal }) => getAllClasses(ctx.clientId, ctx.token, params, signal),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000, // cache for 5 minutes
    ...options,
  });
}

export function useGradeLevels(
  ctx: AuthCtx,
  options?: Omit<UseQueryOptions<GradeLevelRecord[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<GradeLevelRecord[], Error>({
    queryKey: queryKeys.classes.gradeLevels(ctx.clientId),
    queryFn: () => getGradeLevels(ctx.clientId, ctx.token),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 10 * 60_000, // cache for 10 minutes
    ...options,
  });
}
