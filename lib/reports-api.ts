import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

export interface StudentStats {
  total: number;
  byStatus: { status: string; _count: { id: number } }[];
  byGender: { gender: string; _count: { id: number } }[];
}

export interface FeeSummary {
  byStatus: { status: string; _sum: { paidAmount: string | null; dueAmount: string | null }; _count: { id: number } }[];
  totalCollected: string | number;
  totalPending:   string | number;
}

export interface AttendanceSummary {
  byStatus: { status: string; _count: { id: number } }[];
  byClass:  { classId: string; _count: { id: number } }[];
  total:    number;
  present:  number;
  rate:     number;
}

export interface HomeworkSummary {
  byStatus: { status: string; _count: { id: number } }[];
  totalAssignments: number;
  total:            number;
  completionRate:   number;
}

export const getStudentStats      = (cid: string, token: string) =>
  apiFetch<StudentStats>(`${API_BASE}/${cid}/reports/student-stats`, token);

export const getFeeSummary        = (cid: string, token: string, ay?: string) =>
  apiFetch<FeeSummary>(`${API_BASE}/${cid}/reports/fee-summary${ay ? `?academicYearId=${ay}` : ""}`, token);

export const getAttendanceSummary = (cid: string, token: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  const qs = q.toString();
  return apiFetch<AttendanceSummary>(`${API_BASE}/${cid}/reports/attendance-summary${qs ? `?${qs}` : ""}`, token);
};

export const getHomeworkSummary   = (cid: string, token: string) =>
  apiFetch<HomeworkSummary>(`${API_BASE}/${cid}/reports/homework-summary`, token);
