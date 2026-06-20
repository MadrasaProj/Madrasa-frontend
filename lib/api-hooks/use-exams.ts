import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  generateRanks,
  getExamConfig,
  updateExamConfig,
  getSubjectExamConfigs,
  upsertSubjectExamConfig,
  deleteSubjectExamConfig,
  type ExamStatus,
  type ExamType,
} from "@/lib/exams-api";

interface ExamsParams {
  accademicYearId?: string;
  examStatus?: ExamStatus;
  type?: ExamType;
  classId?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}

export function useExams(params?: ExamsParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.exams.list(activeClientId ?? "", params ?? {}),
    queryFn: () => getExams(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useExam(examId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.exams.detail(activeClientId ?? "", examId),
    queryFn: () => getExam(activeClientId!, accessToken!, examId),
    enabled: !!activeClientId && !!accessToken && !!examId,
  });
}

export function useCreateExam() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      accademicYearId: string;
      type?: ExamType;
      classId?: string;
      subjectId?: string;
      startDate?: string;
      endDate?: string;
      markEntryLastDate?: string;
      publishedDate?: string;
      examStatus?: ExamStatus;
      maxMarks?: number;
      passMarks?: number;
    }) => createExam(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exams.all });
    },
  });
}

export function useUpdateExam() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        name: string;
        startDate: string | null;
        endDate: string | null;
        markEntryLastDate: string | null;
        publishedDate: string | null;
        examStatus: ExamStatus;
        maxMarks: number;
        passMarks: number;
      }>;
    }) => updateExam(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exams.all });
    },
  });
}

export function useDeleteExam() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExam(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exams.all });
    },
  });
}

export function useGenerateRanks() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (examId: string) =>
      generateRanks(activeClientId!, accessToken!, examId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exams.all });
      qc.invalidateQueries({ queryKey: queryKeys.results.all });
    },
  });
}

export function useExamConfig() {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.exams.config(activeClientId ?? ""),
    queryFn: () => getExamConfig(activeClientId!, accessToken!),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useUpdateExamConfig() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<{
      passedLabel: string;
      failedLabel: string;
      promotedLabel: string;
      withheldLabel: string;
      hideMarks: boolean;
      defaultMaxMarks: number;
      gradeConfig: Record<string, { min: number }>;
    }>) => updateExamConfig(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exams.all });
    },
  });
}

export function useSubjectExamConfigs(examId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.exams.subjectConfigs(activeClientId ?? "", examId),
    queryFn: () => getSubjectExamConfigs(activeClientId!, accessToken!, examId),
    enabled: !!activeClientId && !!accessToken && !!examId,
  });
}

export function useUpsertSubjectExamConfig() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      examId,
      subjectId,
      data,
    }: {
      examId: string;
      subjectId: string;
      data: { maxMarks?: number; gradeConfig?: Record<string, { min: number }> };
    }) =>
      upsertSubjectExamConfig(
        activeClientId!,
        accessToken!,
        examId,
        subjectId,
        data,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.exams.subjectConfigs(activeClientId!, vars.examId),
      });
    },
  });
}

export function useDeleteSubjectExamConfig() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      examId,
      subjectId,
    }: {
      examId: string;
      subjectId: string;
    }) =>
      deleteSubjectExamConfig(
        activeClientId!,
        accessToken!,
        examId,
        subjectId,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.exams.subjectConfigs(activeClientId!, vars.examId),
      });
    },
  });
}
