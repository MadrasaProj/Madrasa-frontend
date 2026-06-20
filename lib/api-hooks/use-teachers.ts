import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  type UpdateTeacherPayload,
} from "@/lib/teachers-api";

interface TeacherListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useTeachers(params?: TeacherListParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.teachers.list(activeClientId ?? "", params ?? {}),
    queryFn: () => getTeachers(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useCreateTeacher() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; username: string; password: string; status?: string }) =>
      createTeacher(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teachers.all });
    },
  });
}

export function useUpdateTeacher() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherPayload }) =>
      updateTeacher(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teachers.all });
    },
  });
}

export function useDeleteTeacher() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTeacher(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teachers.all });
    },
  });
}
