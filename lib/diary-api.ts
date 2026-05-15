const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;
const TIMEOUT    = 15_000;

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  classId: string;
  teacherId: string;
  academicYearId: string | null;
  class:   { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
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
      throw new Error(msg);
    }
    return payload as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const listDiary = (
  clientId: string, token: string,
  params?: { classId?: string; from?: string; to?: string },
) => {
  const q = new URLSearchParams();
  if (params?.classId) q.set("classId", params.classId);
  if (params?.from)    q.set("from", params.from);
  if (params?.to)      q.set("to", params.to);
  const qs = q.toString();
  return apiFetch<DiaryEntry[]>(`/${clientId}/diary${qs ? `?${qs}` : ""}`, token);
};

export const upsertDiary = (
  clientId: string, token: string,
  data: { classId: string; date: string; title: string; content: string; academicYearId?: string },
) =>
  apiFetch<DiaryEntry>(`/${clientId}/diary`, token, { method: "POST", body: JSON.stringify(data) });

export const updateDiary = (
  clientId: string, token: string, id: string,
  data: { title?: string; content?: string },
) =>
  apiFetch<DiaryEntry>(`/${clientId}/diary/${id}`, token, { method: "PATCH", body: JSON.stringify(data) });

export const deleteDiary = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`/${clientId}/diary/${id}`, token, { method: "DELETE" });
