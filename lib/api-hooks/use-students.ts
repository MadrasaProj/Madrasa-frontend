import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  type GetStudentsParams,
  type CreateStudentPayload,
  type UpdateStudentPayload,
} from "@/lib/students-api";

export function useStudents(params: GetStudentsParams = {}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.students.list(activeClientId ?? "", params),
    queryFn: ({ signal }) =>
      getStudents(activeClientId!, accessToken!, { ...params, signal }),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useStudent(studentId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.students.detail(activeClientId ?? "", studentId),
    queryFn: ({ signal }) =>
      getStudent(activeClientId!, accessToken!, studentId, signal),
    enabled: !!activeClientId && !!accessToken && !!studentId,
  });
}

export function useCreateStudent() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentPayload) =>
      createStudent(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}

export function useUpdateStudent() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentPayload }) =>
      updateStudent(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}

export function useDeleteStudent() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      deleteStudent(activeClientId!, accessToken!, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
}
