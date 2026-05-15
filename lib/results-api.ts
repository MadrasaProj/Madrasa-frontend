const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE    = `${API_ORIGIN}/api/madrasa`;
const TIMEOUT    = 15_000;

export interface ResultRecord {
  id: string;
  score: number;
  status: string;
  subject?:       { id: string; name: string } | null;
  exam?:          { id: string; name: string } | null;
  student?:       { id: string; name: string; adno: string } | null;
  class?:         { id: string; name: string } | null;
  accademicYear?: { id: string; name: string } | null;
}

export interface ResultListResponse {
  data: ResultRecord[];
  total?: number;
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

export const getResults = (
  clientId: string, token: string,
  params: { examId?: string; studentId?: string; classId?: string; accademicYearId?: string; limit?: number },
) => {
  const q = new URLSearchParams();
  const filters: Record<string, string> = { clientId };
  if (params.examId)          filters.examId = params.examId;
  if (params.studentId)       filters.studentId = params.studentId;
  if (params.classId)         filters.classId = params.classId;
  if (params.accademicYearId) filters.accademicYearId = params.accademicYearId;
  q.set("filters", JSON.stringify(filters));
  if (params.limit) q.set("limit", String(params.limit));
  return apiFetch<ResultListResponse>(`/${clientId}/results?${q}`, token);
};

export const createResult = (
  clientId: string, token: string,
  data: { subjectId: string; examId: string; studentId: string; classId: string; score: number; accademicYearId: string },
) =>
  apiFetch<ResultRecord>(`/${clientId}/results`, token, {
    method: "POST",
    body: JSON.stringify({ ...data, clientId }),
  });

export const updateResult = (clientId: string, token: string, id: string, data: { score: number }) =>
  apiFetch<ResultRecord>(`/${clientId}/results/${id}`, token, { method: "PATCH", body: JSON.stringify(data) });

export const deleteResult = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`/${clientId}/results/${id}`, token, { method: "DELETE" });

// Bulk upsert: create or update each result
export async function bulkUpsertResults(
  clientId: string, token: string,
  items: { subjectId: string; examId: string; studentId: string; classId: string; score: number; accademicYearId: string; existingId?: string }[],
) {
  const ops = items.map((item) =>
    item.existingId
      ? updateResult(clientId, token, item.existingId, { score: item.score })
      : createResult(clientId, token, item),
  );
  return Promise.all(ops);
}
