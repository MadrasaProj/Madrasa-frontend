const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;
const TIMEOUT    = 15_000;

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.message ?? "Request failed");
    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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
  apiFetch<StudentStats>(`/${cid}/reports/student-stats`, token);

export const getFeeSummary        = (cid: string, token: string, ay?: string) =>
  apiFetch<FeeSummary>(`/${cid}/reports/fee-summary${ay ? `?academicYearId=${ay}` : ""}`, token);

export const getAttendanceSummary = (cid: string, token: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  const qs = q.toString();
  return apiFetch<AttendanceSummary>(`/${cid}/reports/attendance-summary${qs ? `?${qs}` : ""}`, token);
};

export const getHomeworkSummary   = (cid: string, token: string) =>
  apiFetch<HomeworkSummary>(`/${cid}/reports/homework-summary`, token);
