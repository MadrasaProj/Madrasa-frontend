import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getClassIbadah,
  bulkUpsertIbadah,
  upsertStudentIbadah,
  getStudentIbadah,
  getSuperAdminIbadahConfig,
  updateSuperAdminIbadahConfig,
  type BulkIbadahEntry,
  type UpsertStudentIbadahPayload,
  type UpdateIbadahConfigPayload,
} from "@/lib/ibadah-api";

interface ClassIbadahParams {
  classId?: string;
  date?: string;
  from?: string;
  to?: string;
  academicYearId?: string;
}

interface StudentIbadahParams {
  studentId: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useClassIbadah(params: ClassIbadahParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.ibadah.class(activeClientId ?? "", params),
    queryFn: () => getClassIbadah(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useStudentIbadah(params: StudentIbadahParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.ibadah.student(activeClientId ?? "", params.studentId),
    queryFn: () =>
      getStudentIbadah(
        activeClientId!,
        accessToken!,
        params.studentId,
        params,
      ),
    enabled: !!activeClientId && !!accessToken && !!params.studentId,
  });
}

export function useBulkUpsertIbadah() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      classId: string;
      date: string;
      academicYearId?: string;
      records: BulkIbadahEntry[];
    }) => bulkUpsertIbadah(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ibadah.all });
    },
  });
}

export function useUpsertStudentIbadah() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      payload,
    }: {
      studentId: string;
      payload: UpsertStudentIbadahPayload;
    }) =>
      upsertStudentIbadah(activeClientId!, accessToken!, studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ibadah.all });
    },
  });
}

export function useSuperAdminIbadahConfig() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.ibadah.superAdminConfig,
    queryFn: () => getSuperAdminIbadahConfig(accessToken!),
    enabled: !!accessToken,
  });
}

export function useUpdateSuperAdminIbadahConfig() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateIbadahConfigPayload) =>
      updateSuperAdminIbadahConfig(accessToken!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ibadah.all });
    },
  });
}
