const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

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

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  // Propagate caller's abort to ours
  signal?.addEventListener("abort", () => controller.abort());

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit & { signal?: AbortSignal },
  retries = MAX_RETRIES,
): Promise<T> {
  const { signal, cleanup } = withTimeout(init?.signal);

  try {
    const res = await fetch(`${DEFAULT_API_BASE}${path}`, {
      ...init,
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Retry on 5xx (server errors), not on 4xx (client errors)
      if (res.status >= 500 && retries > 0) {
        cleanup();
        await new Promise((r) => setTimeout(r, 500 * (MAX_RETRIES - retries + 1)));
        return apiFetch<T>(path, token, init, retries - 1);
      }

      const msg =
        typeof payload?.message === "string"
          ? payload.message
          : Array.isArray(payload?.message)
            ? payload.message.join(", ")
            : payload?.error ?? "Request failed";

      throw new AttendanceApiError(msg, {
        statusCode: payload?.statusCode ?? res.status,
        code: payload?.errorCode,
      });
    }

    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new AttendanceApiError("Request timed out", { statusCode: 408 });
    }
    throw err;
  } finally {
    cleanup();
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
    `/${clientId}/attendance?${q}`,
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
  return apiFetch<BulkUpsertResponse>(`/${clientId}/attendance`, token, {
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
    `/${clientId}/attendance/${attendanceId}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
    },
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
    `/${clientId}/attendance/student/${studentId}${qs ? `?${qs}` : ""}`,
    token,
    { signal },
  );
}
