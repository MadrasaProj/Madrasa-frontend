import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getStudentStats,
  getFeeSummary,
  getAttendanceSummary,
  getHomeworkSummary,
  getOperationalActivity,
  getActivityLogs,
  getParentAdoption,
  type StudentStats,
  type FeeSummary,
  type AttendanceSummary,
  type HomeworkSummary,
  type OperationalActivitySummary,
  type ActivityLogListResponse,
  type ParentAdoptionReport,
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
  params?: { from?: string; to?: string },
  options?: Omit<UseQueryOptions<FeeSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<FeeSummary, Error>({
    queryKey: queryKeys.reports.feeSummary(ctx.clientId, ay, params?.from, params?.to),
    queryFn: () => getFeeSummary(ctx.clientId, ctx.token, ay, params?.from, params?.to),
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
  params?: { from?: string; to?: string },
  options?: Omit<UseQueryOptions<HomeworkSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<HomeworkSummary, Error>({
    queryKey: queryKeys.reports.homeworkSummary(ctx.clientId, params?.from, params?.to),
    queryFn: () => getHomeworkSummary(ctx.clientId, ctx.token, params?.from, params?.to),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useOperationalActivity(
  ctx: AuthCtx,
  params?: { from?: string; to?: string },
  options?: Omit<UseQueryOptions<OperationalActivitySummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<OperationalActivitySummary, Error>({
    queryKey: queryKeys.reports.operationalActivity(ctx.clientId, params?.from, params?.to),
    queryFn: () => getOperationalActivity(ctx.clientId, ctx.token, params?.from, params?.to),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 2 * 60_000, // 2 minutes staleTime
    ...options,
  });
}

export function useActivityLogs(
  ctx: AuthCtx,
  params?: {
    actorType?: string;
    action?: string;
    from?: string;
    to?: string;
    q?: string;
    take?: number;
    skip?: number;
  },
  options?: Omit<UseQueryOptions<ActivityLogListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ActivityLogListResponse, Error>({
    queryKey: queryKeys.reports.activityLogs(ctx.clientId, params),
    queryFn: () => getActivityLogs(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 60_000,
    ...options,
  });
}

export function useParentAdoption(
  ctx: AuthCtx,
  params?: {
    from?: string;
    to?: string;
    classId?: string;
    status?: "ALL" | "LOGGED_IN" | "NOT_LOGGED_IN" | "ACCESSED" | "NOT_ACCESSED";
    q?: string;
    page?: number;
    limit?: number;
  },
  options?: Omit<UseQueryOptions<ParentAdoptionReport, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ParentAdoptionReport, Error>({
    queryKey: queryKeys.reports.parentAdoption(ctx.clientId, params),
    queryFn: () => getParentAdoption(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    staleTime: 60_000,
    ...options,
  });
}
