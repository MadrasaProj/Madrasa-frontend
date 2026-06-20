import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getAllClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  type CreateClassPayload,
  type UpdateClassPayload,
} from "@/lib/classes-api";

interface ClassesParams {
  search?: string;
  accademicYearId?: string;
  status?: string;
}

export function useClasses(params?: ClassesParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.classes.list(activeClientId ?? "", params ?? {}),
    queryFn: () => getAllClasses(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useClassDetail(classId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.classes.detail(activeClientId ?? "", classId),
    queryFn: () => getClass(activeClientId!, accessToken!, classId),
    enabled: !!activeClientId && !!accessToken && !!classId,
  });
}

export function useCreateClass() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClassPayload) =>
      createClass(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.classes.all });
    },
  });
}

export function useUpdateClass() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      classId,
      data,
    }: {
      classId: string;
      data: UpdateClassPayload;
    }) => updateClass(activeClientId!, accessToken!, classId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.classes.all });
    },
  });
}

export function useDeleteClass() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (classId: string) =>
      deleteClass(activeClientId!, accessToken!, classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.classes.all });
    },
  });
}
