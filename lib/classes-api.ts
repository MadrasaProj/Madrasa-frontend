const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH ?? "/api/v2";
const DEFAULT_API_BASE = `${API_ORIGIN}${API_BASE_PATH}`;
const DEFAULT_TIMEOUT_MS = 15_000;

export interface ClassRecord {
  id: string;
  name: string;
  sectionId: string | null;
  classTeacherId: string | null;
  accademicYearId: string | null;
  studentCount: number;
}

export class ClassesApiError extends Error {
  statusCode?: number;
  code?: string;
  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "ClassesApiError";
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
  }
}

async function apiFetch<T>(
  path: string,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const res = await fetch(`${DEFAULT_API_BASE}${path}`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof payload?.message === "string"
          ? payload.message
          : payload?.error ?? "Request failed";
      throw new ClassesApiError(msg, {
        statusCode: payload?.statusCode ?? res.status,
        code: payload?.errorCode,
      });
    }

    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ClassesApiError("Request timed out", { statusCode: 408 });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function getMyClasses(
  clientId: string,
  token: string,
  signal?: AbortSignal,
): Promise<ClassRecord[]> {
  return apiFetch<ClassRecord[]>(`/${clientId}/classes`, token, signal);
}

export function getAllClasses(
  clientId: string,
  token: string,
  signal?: AbortSignal,
): Promise<ClassRecord[]> {
  return apiFetch<ClassRecord[]>(`/${clientId}/classes`, token, signal);
}
