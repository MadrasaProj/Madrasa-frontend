import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getExams, type ExamListResponse, type ExamStatus, type ExamType } from "@/lib/exams-api";
import {
  getClassReport,
  getResults,
  getSummaries,
  type ClassReport,
  type ResultListResponse,
  type SummaryListResponse,
} from "@/lib/results-api";
import type { AuthCtx } from "./useNotifications";

export function useExams(
  ctx: AuthCtx,
  params?: {
    accademicYearId?: string;
    examStatus?: ExamStatus;
    type?: ExamType;
    classId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  },
  options?: Omit<UseQueryOptions<ExamListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ExamListResponse, Error>({
    queryKey: queryKeys.exams.list(ctx.clientId, params),
    queryFn: () => getExams(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}

export function useResults(
  ctx: AuthCtx,
  params: { examId: string; studentId: string; limit?: number; skip?: number; classId?: string; accademicYearId?: string },
  options?: Omit<UseQueryOptions<ResultListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ResultListResponse, Error>({
    queryKey: queryKeys.results.list(ctx.clientId, params),
    queryFn: () => getResults(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token && !!params.examId && !!params.studentId,
    ...options,
  });
}

export function useResultSummaries(
  ctx: AuthCtx,
  params: { examId: string; studentId: string; limit?: number; skip?: number; classId?: string; accademicYearId?: string },
  options?: Omit<UseQueryOptions<SummaryListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<SummaryListResponse, Error>({
    queryKey: queryKeys.results.summaries(ctx.clientId, params),
    queryFn: () => getSummaries(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token && !!params.examId && !!params.studentId,
    ...options,
  });
}

export function useClassReport(
  ctx: AuthCtx,
  params: { examId: string; classId: string },
  options?: Omit<UseQueryOptions<ClassReport, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ClassReport, Error>({
    queryKey: queryKeys.results.classReport(ctx.clientId, params),
    queryFn: () => getClassReport(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token && !!params.examId && !!params.classId,
    ...options,
  });
}
