import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeeTypeKind = "ONE_TIME" | "RECURRING";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE" | "OTHER";
export type FeePaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE" | "WAIVED";

export interface FeeType {
  id: string;
  name: string;
  description: string | null;
  amount: string;
  kind: FeeTypeKind;
  frequency: string | null;
  dueDay: number | null;
  targetClassIds: string[];
  academicYearId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  _count?: { payments: number };
}

export interface FeePayment {
  id: string;
  dueAmount: string;
  paidAmount: string | null;
  dueDate: string;
  paidAt: string | null;
  method: PaymentMethod | null;
  reference: string | null;
  notes: string | null;
  status: FeePaymentStatus;
  academicYearId: string | null;
  createdAt: string;
  student: { id: string; name: string; adno: string; class?: { id: string; name: string } | null };
  feeType: { id: string; name: string; kind: FeeTypeKind };
  recordedBy?: string | null;
}

export interface ReceiptData {
  id: string;
  dueAmount: string;
  paidAmount: string | null;
  dueDate: string;
  paidAt: string | null;
  method: PaymentMethod | null;
  reference: string | null;
  notes: string | null;
  status: FeePaymentStatus;
  student: { id: string; name: string; adno: string; class?: { name: string } | null };
  feeType: { id: string; name: string; kind: FeeTypeKind };
  client: { name: string; arabicName: string | null; address: string | null; phone: string | null };
}

export interface StudentFeeSummary {
  studentId: string;
  feeTypes: Pick<FeeType, "id" | "name" | "amount" | "kind" | "frequency" | "dueDay">[];
  payments: Omit<FeePayment, "student">[];
  totalDue: number;
  totalPaid: number;
  pendingCount: number;
}

export interface PaymentsListResponse {
  total: number;
  skip: number;
  take: number;
  payments: FeePayment[];
}

export interface CreateFeeTypePayload {
  name: string;
  amount: number;
  kind: FeeTypeKind;
  description?: string;
  frequency?: string;
  dueDay?: number;
  targetClassIds?: string[];
  academicYearId?: string;
  startDate?: string;
  endDate?: string;
}

export interface RecordPaymentPayload {
  studentId: string;
  feeTypeId: string;
  paidAmount: number;
  dueDate?: string;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  academicYearId?: string;
}

export interface UpdatePaymentPayload {
  status?: FeePaymentStatus;
  paidAmount?: number;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export class FeesApiError extends Error {
  statusCode?: number;
  code?: string;
  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "FeesApiError";
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
  }
}

// ─── Fee Types ────────────────────────────────────────────────────────────────

export const getFeeTypes = (clientId: string, token: string, academicYearId?: string, signal?: AbortSignal) =>
  apiFetch<FeeType[]>(`${DEFAULT_API_BASE}/${clientId}/fees/fee-types${academicYearId ? `?academicYearId=${academicYearId}` : ""}`, token, { signal });

export const createFeeType = (clientId: string, token: string, data: CreateFeeTypePayload, signal?: AbortSignal) =>
  apiFetch<FeeType>(`${DEFAULT_API_BASE}/${clientId}/fees/fee-types`, token, { method: "POST", body: JSON.stringify(data), signal });

export const updateFeeType = (clientId: string, token: string, id: string, data: Partial<CreateFeeTypePayload & { status?: string }>, signal?: AbortSignal) =>
  apiFetch<FeeType>(`${DEFAULT_API_BASE}/${clientId}/fees/fee-types/${id}`, token, { method: "PATCH", body: JSON.stringify(data), signal });

export const deleteFeeType = (clientId: string, token: string, id: string, signal?: AbortSignal) =>
  apiFetch<{ message: string }>(`${DEFAULT_API_BASE}/${clientId}/fees/fee-types/${id}`, token, { method: "DELETE", signal });

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface GetPaymentsParams {
  feeTypeId?: string; studentId?: string; classId?: string;
  status?: FeePaymentStatus; academicYearId?: string;
  skip?: number; take?: number; signal?: AbortSignal;
}

export const getPayments = (clientId: string, token: string, params: GetPaymentsParams = {}) => {
  const { signal, ...rest } = params;
  const q = new URLSearchParams();
  Object.entries(rest).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
  const qs = q.toString();
  return apiFetch<PaymentsListResponse>(`${DEFAULT_API_BASE}/${clientId}/fees/payments${qs ? `?${qs}` : ""}`, token, { signal });
};

export const recordPayment = (clientId: string, token: string, data: RecordPaymentPayload, signal?: AbortSignal) =>
  apiFetch<FeePayment>(`${DEFAULT_API_BASE}/${clientId}/fees/payments`, token, { method: "POST", body: JSON.stringify(data), signal });

export const updatePayment = (clientId: string, token: string, id: string, data: UpdatePaymentPayload, signal?: AbortSignal) =>
  apiFetch<FeePayment>(`${DEFAULT_API_BASE}/${clientId}/fees/payments/${id}`, token, { method: "PATCH", body: JSON.stringify(data), signal });

export const getPaymentReceipt = (clientId: string, token: string, id: string, signal?: AbortSignal) =>
  apiFetch<ReceiptData>(`${DEFAULT_API_BASE}/${clientId}/fees/payments/${id}/receipt`, token, { signal });

export const getStudentFees = (clientId: string, token: string, studentId: string, signal?: AbortSignal) =>
  apiFetch<StudentFeeSummary>(`${DEFAULT_API_BASE}/${clientId}/fees/student/${studentId}`, token, { signal });

export const getFeeSummary = (clientId: string, token: string, academicYearId?: string, signal?: AbortSignal) =>
  apiFetch<{ byStatus: any[]; byFeeType: any[] }>(
    `${DEFAULT_API_BASE}/${clientId}/fees/summary${academicYearId ? `?academicYearId=${academicYearId}` : ""}`,
    token, { signal }
  );

export const generatePayments = (clientId: string, token: string, data: { feeTypeId: string; academicYearId?: string; classIds?: string[] }, signal?: AbortSignal) =>
  apiFetch<{ generated: number; total?: number; dueDate?: string; message?: string }>(
    `${DEFAULT_API_BASE}/${clientId}/fees/generate`, token, { method: "POST", body: JSON.stringify(data), signal }
  );
