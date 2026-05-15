const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE = `${API_ORIGIN}/api/madrasa`;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export interface StudentRecord {
  id: string;
  name: string;
  adno: string;
  gender: "MALE" | "FEMALE" | null;
  dateOfBirth: string | null;
  parentPhone: string | null;
  parentAltPhone: string | null;
  guardianName: string | null;
  relationToStudent: string | null;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "TRANSFERRED" | "DROPPED_OUT";
  classId: string | null;
  class: { id: string; name: string } | null;
  clientId: string;
  accademicYearId: string | null;
  accademicYear: { id: string; name: string } | null;
  teamId: string | null;
  sectionId: string | null;
  isArchived: boolean;
  createdAt: string;
}

export interface StudentListResponse {
  data: StudentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateStudentPayload {
  name: string;
  adno: string;
  accademicYearId?: string;
  classId?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  parentPhone?: string;
  parentAltPhone?: string;
  guardianName?: string;
  relationToStudent?: string;
  parentPassword?: string;
  status?: string;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {}

export class StudentsApiError extends Error {
  statusCode?: number;
  code?: string;
  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "StudentsApiError";
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
  }
}

async function apiFetch<T>(
  url: string,
  token: string,
  init?: RequestInit & { signal?: AbortSignal },
  retries = MAX_RETRIES,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  init?.signal?.addEventListener("abort", () => controller.abort());

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status >= 500 && retries > 0) {
        clearTimeout(timer);
        await new Promise((r) => setTimeout(r, 500 * (MAX_RETRIES - retries + 1)));
        return apiFetch<T>(url, token, init, retries - 1);
      }
      const msg =
        typeof payload?.message === "string"
          ? payload.message
          : Array.isArray(payload?.message)
            ? payload.message.join(", ")
            : payload?.error ?? "Request failed";
      throw new StudentsApiError(msg, {
        statusCode: payload?.statusCode ?? res.status,
        code: payload?.errorCode,
      });
    }

    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new StudentsApiError("Request timed out", { statusCode: 408 });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface GetStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  status?: string;
  signal?: AbortSignal;
}

export function getStudents(
  clientId: string,
  token: string,
  params: GetStudentsParams = {},
): Promise<StudentListResponse> {
  const { page = 1, limit = 20, search, classId, status, signal } = params;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) q.set("search", search);
  if (classId || status) {
    const filters: Record<string, string> = {};
    if (classId) filters.classId = classId;
    if (status) filters.status = status;
    q.set("filters", JSON.stringify(filters));
  }
  return apiFetch<StudentListResponse>(
    `${V1_BASE}/${clientId}/students?${q}`,
    token,
    { signal },
  );
}

export function getStudent(
  clientId: string,
  token: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V1_BASE}/${clientId}/students/${studentId}`,
    token,
    { signal },
  );
}

export function createStudent(
  clientId: string,
  token: string,
  data: CreateStudentPayload,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V1_BASE}/${clientId}/students`,
    token,
    { method: "POST", body: JSON.stringify(data), signal },
  );
}

export function updateStudent(
  clientId: string,
  token: string,
  studentId: string,
  data: UpdateStudentPayload,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V1_BASE}/${clientId}/students/${studentId}`,
    token,
    { method: "PATCH", body: JSON.stringify(data), signal },
  );
}

export function deleteStudent(
  clientId: string,
  token: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `${V1_BASE}/${clientId}/students/${studentId}`,
    token,
    { method: "DELETE", signal },
  );
}
