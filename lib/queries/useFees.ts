import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getPaymentReceipt,
  getStudentFees,
  type ReceiptData,
  type StudentFeeSummary,
} from "@/lib/fees-api";
import type { AuthCtx } from "./useNotifications";

export function useStudentFees(
  ctx: AuthCtx,
  studentId: string,
  options?: Omit<UseQueryOptions<StudentFeeSummary, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<StudentFeeSummary, Error>({
    queryKey: queryKeys.fees.student(ctx.clientId, studentId),
    queryFn: ({ signal }) => getStudentFees(ctx.clientId, ctx.token, studentId, signal),
    enabled: !!ctx.clientId && !!ctx.token && !!studentId,
    ...options,
  });
}

export function useStudentFeesBatch(
  ctx: AuthCtx,
  studentIds: string[],
  options?: Omit<UseQueryOptions<Record<string, StudentFeeSummary | Error>, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<Record<string, StudentFeeSummary | Error>, Error>({
    queryKey: queryKeys.fees.student(ctx.clientId, studentIds.join(",")),
    queryFn: async ({ signal }) => {
      const entries = await Promise.all(
        studentIds.map(async (sid) => {
          try {
            const summary = await getStudentFees(ctx.clientId, ctx.token, sid, signal);
            return [sid, summary] as const;
          } catch (e) {
            return [sid, e instanceof Error ? e : new Error(String(e))] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: !!ctx.clientId && !!ctx.token && studentIds.length > 0,
    ...options,
  });
}

export function usePaymentReceipt(ctx: AuthCtx) {
  return useMutation<ReceiptData, Error, string>({
    mutationFn: (paymentId) => getPaymentReceipt(ctx.clientId, ctx.token, paymentId),
  });
}
