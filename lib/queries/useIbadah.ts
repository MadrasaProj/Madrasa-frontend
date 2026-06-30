import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getStudentIbadah,
  upsertStudentIbadah,
  type StudentIbadahLog,
  type StudentIbadahResponse,
  type UpsertStudentIbadahPayload,
} from "@/lib/ibadah-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentIbadah(
  ctx: AuthCtx,
  studentId: string,
  params?: { from?: string; to?: string; limit?: number },
  options?: Omit<UseQueryOptions<StudentIbadahResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentIbadahResponse, Error>({
    queryKey: queryKeys.ibadah.student(ctx.clientId, studentId, params),
    queryFn: () => getStudentIbadah(ctx.clientId, ctx.token, studentId, params),
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}

/**
 * Save a day's ibadah log. We optimistically update the matching log in
 * the cached list (and prepend it if the date is new) so the form gives
 * immediate feedback. On error we roll back.
 */
export function useUpsertStudentIbadah(ctx: AuthCtx, studentId: string) {
  const qc = useQueryClient();
  return useMutation<StudentIbadahLog, Error, UpsertStudentIbadahPayload, { previous?: StudentIbadahResponse }>({
    mutationFn: (payload) => upsertStudentIbadah(ctx.clientId, ctx.token, studentId, payload),
    onMutate: async (payload) => {
      const key = queryKeys.ibadah.student(ctx.clientId, studentId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<StudentIbadahResponse>(key);
      if (previous) {
        const dayKey = payload.date.split("T")[0];
        const idx = previous.logs.findIndex((l) => l.date.split("T")[0] === dayKey);
        const optimisticLog: StudentIbadahLog = {
          id: `optimistic-${dayKey}`,
          date: payload.date,
          fajr: payload.fajr ?? null,
          dhuhr: payload.dhuhr ?? null,
          asr: payload.asr ?? null,
          maghrib: payload.maghrib ?? null,
          isha: payload.isha ?? null,
          quranPages: payload.quranPages ?? 0,
          customData: payload.customData ?? null,
          notes: payload.notes ?? null,
        };
        const logs =
          idx >= 0
            ? previous.logs.map((l, i) => (i === idx ? optimisticLog : l))
            : [optimisticLog, ...previous.logs].sort((a, b) => b.date.localeCompare(a.date));
        qc.setQueryData<StudentIbadahResponse>(key, { ...previous, logs });
      }
      return { previous };
    },
    onError: (_e, _v, ctxOnMutate) => {
      if (ctxOnMutate?.previous) {
        qc.setQueryData(
          queryKeys.ibadah.student(ctx.clientId, studentId),
          ctxOnMutate.previous,
        );
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.ibadah.student(ctx.clientId, studentId) });
    },
  });
}
