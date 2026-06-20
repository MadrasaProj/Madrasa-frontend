import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getResults,
  bulkUpsertResults,
  deleteResult,
  updateResult,
  getSummaries,
  computeSummary,
  setFinalStatus,
  getClassReport,
} from "@/lib/results-api";

interface ResultsParams {
  examId?: string;
  studentId?: string;
  classId?: string;
  accademicYearId?: string;
  limit?: number;
  skip?: number;
}

export function useResults(params: ResultsParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.results.list(activeClientId ?? "", params),
    queryFn: () => getResults(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useSummaries(params: ResultsParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.results.summaries(activeClientId ?? "", params),
    queryFn: () => getSummaries(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useClassReport(params: { examId: string; classId: string }) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.results.classReport(activeClientId ?? "", params),
    queryFn: () => getClassReport(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken && !!params.examId && !!params.classId,
  });
}

export function useBulkUpsertResults() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      examId: string;
      classId: string;
      accademicYearId: string;
      results: { subjectId: string; studentId: string; score: number; totalMarks?: number }[];
    }) => bulkUpsertResults(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.results.all });
    },
  });
}

export function useDeleteResult() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResult(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.results.all });
    },
  });
}

export function useUpdateResult() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { score?: number; totalMarks?: number };
    }) => updateResult(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.results.all });
    },
  });
}

export function useComputeSummary() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      examId: string;
      classId: string;
      accademicYearId?: string;
    }) => computeSummary(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.results.all });
    },
  });
}

export function useSetFinalStatus() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      examId,
      data,
    }: {
      studentId: string;
      examId: string;
      data: { finalStatus: import("@/lib/results-api").ResultStatus; totalGrade?: import("@/lib/results-api").TotalGrade | null };
    }) => setFinalStatus(activeClientId!, accessToken!, studentId, examId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.results.all });
    },
  });
}
