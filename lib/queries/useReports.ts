import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getStudentStats,
  getFeeSummary,
  getAttendanceSummary,
  getHomeworkSummary,
  type StudentStats,
  type FeeSummary,
  type AttendanceSummary,
  type HomeworkSummary,
} from "@/lib/reports-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentStats(
  ctx: AuthCtx,
  options?: Omit<UseQueryOptions<StudentStats, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentStats, Error>({
    queryKey: queryKeys.reports.studentStats(ctx.clientId),
    queryFn: () => getStudentStats(ctx.clientId, ctx.token),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000, // cache for 5 minutes
    ...options,
  });
}

export function useFeeSummary(
  ctx: AuthCtx,
  ay?: string,
  options?: Omit<UseQueryOptions<FeeSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<FeeSummary, Error>({
    queryKey: queryKeys.reports.feeSummary(ctx.clientId, ay),
    queryFn: () => getFeeSummary(ctx.clientId, ctx.token, ay),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useAttendanceSummary(
  ctx: AuthCtx,
  params?: { from?: string; to?: string },
  options?: Omit<UseQueryOptions<AttendanceSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<AttendanceSummary, Error>({
    queryKey: queryKeys.reports.attendanceSummary(ctx.clientId, params?.from, params?.to),
    queryFn: () => getAttendanceSummary(ctx.clientId, ctx.token, params?.from, params?.to),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useHomeworkSummary(
  ctx: AuthCtx,
  options?: Omit<UseQueryOptions<HomeworkSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<HomeworkSummary, Error>({
    queryKey: queryKeys.reports.homeworkSummary(ctx.clientId),
    queryFn: () => getHomeworkSummary(ctx.clientId, ctx.token),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000,
    ...options,
  });
}
