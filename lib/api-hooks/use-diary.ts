import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  listDiary,
  upsertDiary,
  updateDiary,
  deleteDiary,
} from "@/lib/diary-api";

interface DiaryParams {
  classId?: string;
  studentId?: string;
  from?: string;
  to?: string;
}

export function useDiary(params?: DiaryParams) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.diary.list(activeClientId ?? "", params ?? {}),
    queryFn: () => listDiary(activeClientId!, accessToken!, params),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useUpsertDiary() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      classId: string;
      date: string;
      title: string;
      content: string;
      academicYearId?: string;
    }) => upsertDiary(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diary.all });
    },
  });
}

export function useUpdateDiary() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { title?: string; content?: string };
    }) => updateDiary(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diary.all });
    },
  });
}

export function useDeleteDiary() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDiary(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diary.all });
    },
  });
}
