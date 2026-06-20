import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  reviewLeaveRequest,
  type CreateLeaveRequestPayload,
  type ReviewLeaveRequestPayload,
} from "@/lib/leave-requests-api";

export function useMyLeaveRequests(params?: {
  status?: string;
  studentId?: string;
  skip?: number;
  take?: number;
}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.leaveRequests.my(activeClientId ?? "", params ?? {}),
    queryFn: ({ signal }) =>
      getMyLeaveRequests(activeClientId!, accessToken!, params, signal),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function usePendingLeaveRequests(params?: {
  status?: string;
  studentId?: string;
  skip?: number;
  take?: number;
}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.leaveRequests.pending(
      activeClientId ?? "",
      params ?? {},
    ),
    queryFn: ({ signal }) =>
      getPendingLeaveRequests(activeClientId!, accessToken!, params, signal),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useCreateLeaveRequest() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveRequestPayload) =>
      createLeaveRequest(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  });
}

export function useReviewLeaveRequest() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ReviewLeaveRequestPayload;
    }) => reviewLeaveRequest(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  });
}
