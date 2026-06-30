import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  addDiaryComment,
  listDiary,
  type DiaryComment,
  type DiaryEntry,
} from "@/lib/diary-api";
import type { AuthCtx } from "./useNotifications";

export function useDiaryList(
  ctx: AuthCtx,
  params?: { classId?: string; studentId?: string; from?: string; to?: string },
  options?: Omit<UseQueryOptions<DiaryEntry[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<DiaryEntry[], Error>({
    queryKey: queryKeys.diary.list(ctx.clientId, params),
    queryFn: () => listDiary(ctx.clientId, ctx.token, params),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}

export interface AddDiaryCommentArgs {
  diaryId: string;
  content: string;
  studentId: string;
  parentName?: string;
}

export function useAddDiaryComment(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<DiaryComment, Error, AddDiaryCommentArgs>({
    mutationFn: ({ diaryId, content, studentId, parentName }) =>
      addDiaryComment(ctx.clientId, ctx.token, diaryId, { content, studentId, parentName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diary.all });
    },
  });
}
