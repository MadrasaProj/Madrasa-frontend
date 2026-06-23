import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "SICK" | "LATE" | "EXCUSED";

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  class?: { id: string; name: string };
  markedBy?: { id: string; name: string };
}

export interface ClassAttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  student: { id: string; name: string; adno: string };
  markedBy?: { id: string; name: string };
  class?: { id: string; name: string };
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface StudentAttendanceResponse {
  studentId: string;
  total: number;
  skip: number;
  take: number;
  summary: Partial<Record<AttendanceStatus, number>>;
  records: AttendanceRecord[];
}

export interface ClassAttendanceResponse {
  total: number;
  skip: number;
  take: number;
  records: ClassAttendanceRecord[];
}

export interface BulkUpsertResponse {
  saved: number;
  date: string;
  classId: string;
}

export class AttendanceApiError extends Error {
  statusCode?: number;
  code?: string;
  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "AttendanceApiError";
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
  }
}


export function getClassAttendance(
  clientId: string,
  token: string,
  params: { date: string; classId?: string; academicYearId?: string; skip?: number; take?: number },
  signal?: AbortSignal,
): Promise<ClassAttendanceResponse> {
  const q = new URLSearchParams({ date: params.date });
  if (params.classId) q.set("classId", params.classId);
  if (params.academicYearId) q.set("academicYearId", params.academicYearId);
  if (params.skip !== undefined) q.set("skip", String(params.skip));
  if (params.take !== undefined) q.set("take", String(params.take));
  return apiFetch<ClassAttendanceResponse>(
    `${DEFAULT_API_BASE}/${clientId}/attendance?${q}`,
    token,
    { signal },
  );
}

export function bulkUpsertAttendance(
  clientId: string,
  token: string,
  body: {
    classId: string;
    date: string;
    academicYearId?: string;
    records: AttendanceEntry[];
  },
  signal?: AbortSignal,
): Promise<BulkUpsertResponse> {
  return apiFetch<BulkUpsertResponse>(`${DEFAULT_API_BASE}/${clientId}/attendance`, token, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export function updateAttendanceRecord(
  clientId: string,
  token: string,
  attendanceId: string,
  data: { status?: AttendanceStatus; notes?: string },
  signal?: AbortSignal,
): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>(
    `${DEFAULT_API_BASE}/${clientId}/attendance/${attendanceId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
    },
  );
}

export function bulkDeleteAttendance(
  clientId: string,
  token: string,
  params: { date: string; classId: string },
  signal?: AbortSignal,
): Promise<{ deleted: number; date: string; classId: string }> {
  const q = new URLSearchParams({ date: params.date, classId: params.classId });
  return apiFetch<{ deleted: number; date: string; classId: string }>(
    `${DEFAULT_API_BASE}/${clientId}/attendance/bulk?${q}`,
    token,
    { method: "DELETE", signal },
  );
}

export function deleteAttendanceRecord(
  clientId: string,
  token: string,
  attendanceId: string,
  signal?: AbortSignal,
): Promise<{ deleted: boolean; id: string }> {
  return apiFetch<{ deleted: boolean; id: string }>(
    `${DEFAULT_API_BASE}/${clientId}/attendance/${attendanceId}`,
    token,
    { method: "DELETE", signal },
  );
}

export function getStudentAttendance(
  clientId: string,
  token: string,
  studentId: string,
  params?: { academicYearId?: string; from?: string; to?: string; skip?: number; take?: number },
  signal?: AbortSignal,
): Promise<StudentAttendanceResponse> {
  const q = new URLSearchParams();
  if (params?.academicYearId) q.set("academicYearId", params.academicYearId);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.skip !== undefined) q.set("skip", String(params.skip));
  if (params?.take !== undefined) q.set("take", String(params.take));
  const qs = q.toString();
  return apiFetch<StudentAttendanceResponse>(
    `${DEFAULT_API_BASE}/${clientId}/attendance/student/${studentId}${qs ? `?${qs}` : ""}`,
    token,
    { signal },
  );
}
