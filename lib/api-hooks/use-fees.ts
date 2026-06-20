import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { queryKeys } from "@/lib/query-keys";
import {
  getFeeTypes,
  createFeeType,
  updateFeeType,
  deleteFeeType,
  getPayments,
  recordPayment,
  updatePayment,
  getPaymentReceipt,
  getStudentFees,
  getFeeSummary,
  cancelPayment,
  undoCancelPayment,
  generatePayments,
  type GetPaymentsParams,
  type CreateFeeTypePayload,
  type RecordPaymentPayload,
  type UpdatePaymentPayload,
} from "@/lib/fees-api";

export function useFeeTypes(academicYearId?: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.fees.feeTypes(activeClientId ?? ""),
    queryFn: ({ signal }) =>
      getFeeTypes(activeClientId!, accessToken!, academicYearId, signal),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useCreateFeeType() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeeTypePayload) =>
      createFeeType(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function useUpdateFeeType() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateFeeTypePayload & { status?: string }>;
    }) => updateFeeType(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function useDeleteFeeType() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeeType(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function usePayments(params: GetPaymentsParams = {}) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.fees.payments(activeClientId ?? "", params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      getPayments(activeClientId!, accessToken!, { ...params, signal }),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useRecordPayment() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentPayload) =>
      recordPayment(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function useUpdatePayment() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePaymentPayload;
    }) => updatePayment(activeClientId!, accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function usePaymentReceipt(id: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.fees.receipt(activeClientId ?? "", id),
    queryFn: ({ signal }) =>
      getPaymentReceipt(activeClientId!, accessToken!, id, signal),
    enabled: !!activeClientId && !!accessToken && !!id,
  });
}

export function useStudentFees(studentId: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.fees.studentFees(activeClientId ?? "", studentId),
    queryFn: ({ signal }) =>
      getStudentFees(activeClientId!, accessToken!, studentId, signal),
    enabled: !!activeClientId && !!accessToken && !!studentId,
  });
}

export function useFeeSummary(academicYearId?: string) {
  const { activeClientId, accessToken } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.fees.summary(activeClientId ?? "", academicYearId),
    queryFn: ({ signal }) =>
      getFeeSummary(activeClientId!, accessToken!, academicYearId, signal),
    enabled: !!activeClientId && !!accessToken,
  });
}

export function useCancelPayment() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelPayment(activeClientId!, accessToken!, id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function useUndoCancelPayment() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      undoCancelPayment(activeClientId!, accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}

export function useGeneratePayments() {
  const { activeClientId, accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      feeTypeId: string;
      academicYearId?: string;
      classIds?: string[];
    }) => generatePayments(activeClientId!, accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.fees.all });
    },
  });
}
