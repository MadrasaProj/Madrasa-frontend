import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;

export type LeaveReasonType = "LEAVE" | "SICK";
export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  reasonType: LeaveReasonType;
  description: string;
  status: LeaveRequestStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string; adno: string; class?: { id: string; name: string } | null };
  reviewedBy: { id: string; name: string } | null;
}

export interface LeaveRequestsListResponse {
  total: number;
  skip: number;
  take: number;
  requests: LeaveRequest[];
}

export interface CreateLeaveRequestPayload {
  studentId: string;
  reasonType: LeaveReasonType;
  description: string;
  startDate: string;
  endDate?: string;
  academicYearId?: string;
}

export interface ReviewLeaveRequestPayload {
  status: "APPROVED" | "REJECTED";
  reviewNote?: string;
}

export const createLeaveRequest = (clientId: string, token: string, data: CreateLeaveRequestPayload, signal?: AbortSignal) =>
  apiFetch<LeaveRequest>(`${DEFAULT_API_BASE}/${clientId}/leave-requests`, token, { method: "POST", body: JSON.stringify(data), signal });

export const getMyLeaveRequests = (clientId: string, token: string, params?: { status?: string; studentId?: string; skip?: number; take?: number }, signal?: AbortSignal) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.studentId) q.set("studentId", params.studentId);
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.take) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<LeaveRequestsListResponse>(`${DEFAULT_API_BASE}/${clientId}/leave-requests/my${qs ? `?${qs}` : ""}`, token, { signal });
};

export const getPendingLeaveRequests = (clientId: string, token: string, params?: { status?: string; studentId?: string; skip?: number; take?: number }, signal?: AbortSignal) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.studentId) q.set("studentId", params.studentId);
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.take) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<LeaveRequestsListResponse>(`${DEFAULT_API_BASE}/${clientId}/leave-requests/pending${qs ? `?${qs}` : ""}`, token, { signal });
};

export const reviewLeaveRequest = (clientId: string, token: string, id: string, data: ReviewLeaveRequestPayload, signal?: AbortSignal) =>
  apiFetch<LeaveRequest>(`${DEFAULT_API_BASE}/${clientId}/leave-requests/${id}/review`, token, { method: "PATCH", body: JSON.stringify(data), signal });
