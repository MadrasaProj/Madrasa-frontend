const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE    = `${API_ORIGIN}/api/madrasa`;
const TIMEOUT    = 10_000;

export interface SubjectRecord {
  id: string;
  name: string;
  status: string;
  class?: { id: string; name: string } | null;
}

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${V1_BASE}${path}`, {
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

export const getSubjects = (clientId: string, token: string, classId?: string) => {
  const q = new URLSearchParams();
  const filters: Record<string, string> = { clientId };
  if (classId) filters.classId = classId;
  q.set("filters", JSON.stringify(filters));
  q.set("limit", "100");
  return apiFetch<{ data: SubjectRecord[] }>(`/${clientId}/subjects?${q}`, token);
};
