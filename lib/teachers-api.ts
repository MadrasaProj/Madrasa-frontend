const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE    = `${API_ORIGIN}/api/madrasa`;
const V2_BASE    = `${API_ORIGIN}/api/v2`;
const TIMEOUT    = 15_000;

export interface TeacherRecord {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  clientId: string;
  classes?: { id: string; name: string }[];
  subjects?: { id: string; name: string; classId?: string }[];
}

async function apiFetch<T>(base: string, path: string, token: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${base}${path}`, {
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

export const getTeachers = (
  clientId: string, token: string,
  _params?: { search?: string; page?: number; limit?: number },
) =>
  apiFetch<{ data: TeacherRecord[]; total: number }>(V2_BASE, `/${clientId}/teachers`, token);

export const createTeacher = (
  clientId: string, token: string,
  data: { name: string; username: string; password: string; email?: string; phone?: string },
) =>
  apiFetch<TeacherRecord>(V1_BASE, `/${clientId}/users`, token, {
    method: "POST",
    body: JSON.stringify({ ...data, role: "TEACHER", clientId }),
  });

export const updateTeacher = (
  clientId: string, token: string, id: string,
  data: { name?: string; email?: string; phone?: string },
) =>
  apiFetch<TeacherRecord>(V1_BASE, `/${clientId}/users/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
