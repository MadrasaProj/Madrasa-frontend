import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getTeachers, type TeacherRecord } from "@/lib/teachers-api";
import type { AuthCtx } from "./useNotifications";

export interface UseTeachersParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useTeachers(
  ctx: AuthCtx,
  params?: UseTeachersParams,
  options?: Omit<UseQueryOptions<{ data: TeacherRecord[]; total: number }, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<{ data: TeacherRecord[]; total: number }, Error>({
    queryKey: queryKeys.teachers.list(ctx.clientId, params),
    queryFn: () => getTeachers(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000, // cache for 5 minutes
    ...options,
  });
}
