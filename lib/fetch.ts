// Shared fetch utility for all API lib files.
// Classifies network/timeout errors into human-readable messages.

export class ApiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_ERROR = "Cannot reach server. Check your internet connection.";
export const TIMEOUT_ERROR = "Request timed out. Please try again.";
export const SERVER_ERROR  = "Server error. Please try again later.";
export const AUTH_ERROR    = "Session expired. Please log in again.";

function extractMessage(payload: unknown, status: number): string {
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.errors)) {
    return p.errors.map((e: any) => e.message || `${e.fieldName || e.field} is invalid`).join(", ");
  }
  if (typeof p?.message === "string") return p.message;
  if (Array.isArray(p?.message))      return (p!.message as string[]).join(", ");
  if (typeof p?.error === "string")   return p.error;
  if (status === 401) return AUTH_ERROR;
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "Resource not found.";
  if (status >= 500)  return SERVER_ERROR;
  return `Request failed (${status})`;
}

export async function apiFetch<T>(
  url: string,
  token: string,
  init?: RequestInit,
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      throw new ApiError(extractMessage(payload, res.status), String(res.status));
    }

    return payload as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const msg = (err as Error)?.message ?? "";
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError(TIMEOUT_ERROR, "TIMEOUT");
    }
    if (
      msg === "Failed to fetch" ||
      msg.includes("NetworkError") ||
      msg.includes("Network request failed") ||
      msg.includes("ERR_CONNECTION_REFUSED") ||
      msg.includes("ECONNREFUSED")
    ) {
      throw new ApiError(NETWORK_ERROR, "NETWORK");
    }

    throw new ApiError(msg || "Something went wrong.", "UNKNOWN");
  } finally {
    clearTimeout(timer);
  }
}
