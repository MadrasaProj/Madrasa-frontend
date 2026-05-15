const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE    = `${API_ORIGIN}/api/madrasa`;
const TIMEOUT    = 15_000;

export interface ExamRecord {
  id: string;
  name: string;
  status: string;
  accademicYear?: { id: string; name: string } | null;
  subject?:       { id: string; name: string } | null;
  class?:         { id: string; name: string } | null;
  client?:        { id: string; name: string } | null;
}

export interface ExamListResponse {
  data: ExamRecord[];
  total?: number;
  page?: number;
  limit?: number;
}

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${V1_BASE}${path}`, {
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

export const getExams = (
  clientId: string, token: string,
  params?: { classId?: string; accademicYearId?: string; page?: number; limit?: number },
) => {
  const q = new URLSearchParams();
  const filters: Record<string, string> = { clientId };
  if (params?.classId)         filters.classId = params.classId;
  if (params?.accademicYearId) filters.accademicYearId = params.accademicYearId;
  q.set("filters", JSON.stringify(filters));
  if (params?.page)  q.set("page",  String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return apiFetch<ExamListResponse>(`/${clientId}/exams?${q}`, token);
};

export const createExam = (
  clientId: string, token: string,
  data: { name: string; classId: string; subjectId: string; accademicYearId: string },
) =>
  apiFetch<ExamRecord>(`/${clientId}/exams`, token, {
    method: "POST",
    body: JSON.stringify({ ...data, clientId }),
  });

export const updateExam = (clientId: string, token: string, id: string, data: Partial<{ name: string }>) =>
  apiFetch<ExamRecord>(`/${clientId}/exams/${id}`, token, { method: "PATCH", body: JSON.stringify(data) });

export const deleteExam = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`/${clientId}/exams/${id}`, token, { method: "DELETE" });
