import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  bulkAssignTeacher,
  type GetSubjectsParams,
} from "@/lib/subjects-api";

export function useSubjects(params: GetSubjectsParams = {}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.subjects.list(activeClientId ?? "", params),
    queryFn: () => getSubjects(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useSubject(subjectId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.subjects.detail(activeClientId ?? "", subjectId),
    queryFn: () => getSubject(activeClientId!, accessToken!, subjectId),
    enabled: !!activeClientId && !!accessToken && !!subjectId,
  });
}

export function useCreateSubject() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      classId: string;
      teacherId?: string;
      maxMarks?: number;
      gradeConfig?: Record<string, { min: number }>;
    }) => createSubject(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}

export function useUpdateSubject() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      subjectId,
      data,
    }: {
      subjectId: string;
      data: {
        name?: string;
        teacherId?: string | null;
        status?: string;
        maxMarks?: number | null;
        gradeConfig?: Record<string, { min: number }> | null;
      };
    }) => updateSubject(activeClientId!, accessToken!, subjectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}

export function useDeleteSubject() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) =>
      deleteSubject(activeClientId!, accessToken!, subjectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}

export function useBulkAssignTeacher() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { classId: string; teacherId: string }) =>
      bulkAssignTeacher(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subjects.all });
    },
  });
}
