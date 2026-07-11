import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  type CreateLeaveRequestPayload,
  type LeaveRequestsListResponse,
} from "@/lib/leave-requests-api";
import type { AuthCtx } from "./useNotifications";

export function useMyLeaveRequests(
  ctx: AuthCtx,
  params?: { status?: string; studentId?: string; skip?: number; take?: number },
  options?: Omit<UseQueryOptions<LeaveRequestsListResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<LeaveRequestsListResponse, Error>({
    queryKey: queryKeys.leaveRequests.my(ctx.clientId, params),
    queryFn: ({ signal }) => getMyLeaveRequests(ctx.clientId, ctx.token, params, signal),
    enabled: !!ctx.clientId && !!ctx.token,
    ...options,
  });
}

export function useCreateLeaveRequest(ctx: AuthCtx) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateLeaveRequestPayload, { previous?: LeaveRequestsListResponse[] }>({
    mutationFn: (payload) => createLeaveRequest(ctx.clientId, ctx.token, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  });
}
