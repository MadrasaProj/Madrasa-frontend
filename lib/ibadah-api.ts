const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;
const TIMEOUT  = 15_000;

export interface IbadahRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  quranPages: number;
  notes: string | null;
  academicYearId: string | null;
  recordedBy: string;
  student: { id: string; name: string; adno: string };
}

export interface BulkIbadahEntry {
  studentId: string;
  fajr?: boolean;
  dhuhr?: boolean;
  asr?: boolean;
  maghrib?: boolean;
  isha?: boolean;
  quranPages?: number;
  notes?: string;
}

export interface StudentIbadahResponse {
  student: { id: string; name: string; adno: string };
  logs: {
    id: string; date: string;
    fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean;
    quranPages: number; notes: string | null;
  }[];
  streak: number;
  weekly: {
    fajr: number; dhuhr: number; asr: number; maghrib: number; isha: number;
    quranPages: number;
  };
}

class IbadahApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "IbadahApiError";
    this.statusCode = statusCode;
  }
}

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
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
      const msg =
        typeof payload?.message === "string" ? payload.message :
        Array.isArray(payload?.message) ? payload.message.join(", ") :
        payload?.error ?? "Request failed";
      throw new IbadahApiError(msg, res.status);
    }
    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new IbadahApiError("Request timed out", 408);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const getClassIbadah = (
  clientId: string,
  token: string,
  params: { classId?: string; date?: string; academicYearId?: string },
) => {
  const q = new URLSearchParams();
  if (params.classId)       q.set("classId", params.classId);
  if (params.date)          q.set("date", params.date);
  if (params.academicYearId) q.set("academicYearId", params.academicYearId);
  const qs = q.toString();
  return apiFetch<IbadahRecord[]>(
    `/${clientId}/ibadah${qs ? `?${qs}` : ""}`, token,
  );
};

export const bulkUpsertIbadah = (
  clientId: string,
  token: string,
  data: { classId: string; date: string; academicYearId?: string; records: BulkIbadahEntry[] },
) =>
  apiFetch<{ saved: number }>(
    `/${clientId}/ibadah/bulk`, token,
    { method: "POST", body: JSON.stringify(data) },
  );

export const getStudentIbadah = (
  clientId: string,
  token: string,
  studentId: string,
  params?: { from?: string; to?: string },
) => {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to)   q.set("to", params.to);
  const qs = q.toString();
  return apiFetch<StudentIbadahResponse>(
    `/${clientId}/ibadah/student/${studentId}${qs ? `?${qs}` : ""}`, token,
  );
};
