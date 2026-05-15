const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE    = `${API_ORIGIN}/api/v2`;
const TIMEOUT    = 15_000;

export interface ClientConfig {
  id: string;
  name: string;
  arabicName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  timezone?: string | null;
  language?: string | null;
  currency?: string | null;
  attendanceMode?: "CLASS_BASED" | "PERIOD_BASED";
  principalName?: string | null;
  principalPhone?: string | null;
}

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${V2_BASE}${path}`, {
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

export const getClientConfig = (clientId: string, token: string) =>
  apiFetch<ClientConfig>(`/${clientId}/config`, token);

export const updateClientConfig = (
  clientId: string, token: string,
  data: Partial<Omit<ClientConfig, "id">>,
) =>
  apiFetch<ClientConfig>(`/${clientId}/config`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
