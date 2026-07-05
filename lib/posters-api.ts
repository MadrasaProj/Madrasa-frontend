import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const BASE = `${API_ORIGIN}/api/v2`;

export interface PosterRecord {
  id: string;
  title: string;
  sceneData: unknown;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PosterListResponse {
  data: PosterRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePosterPayload {
  title: string;
  sceneData: unknown;
}

export interface UpdatePosterPayload {
  title?: string;
  sceneData?: unknown;
}

export class PostersApiError extends Error {
  statusCode?: number;
  code?: string;
  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "PostersApiError";
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
  }
}

async function publicFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok)
      throw new PostersApiError(
        payload?.message ?? `Request failed (${res.status})`,
        { statusCode: res.status },
      );
    return payload as T;
  } catch (err) {
    if (err instanceof PostersApiError) throw err;
    throw new PostersApiError(
      (err as Error)?.message ?? "Something went wrong.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export function getPosters(
  clientId: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<PosterListResponse> {
  const { page = 1, limit = 20, signal } = params ?? {};
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return publicFetch<PosterListResponse>(`${BASE}/posters?${q}`, {
    signal,
  });
}

export function getPoster(
  clientId: string,
  posterId: string,
  signal?: AbortSignal,
): Promise<PosterRecord> {
  return publicFetch<PosterRecord>(`${BASE}/posters/${posterId}`, {
    signal,
  });
}

export function createPoster(
  clientId: string,
  token: string,
  data: CreatePosterPayload,
  signal?: AbortSignal,
): Promise<PosterRecord> {
  return apiFetch<PosterRecord>(`${BASE}/posters`, token, {
    method: "POST",
    body: JSON.stringify(data),
    signal,
  });
}

export function updatePoster(
  clientId: string,
  token: string,
  posterId: string,
  data: UpdatePosterPayload,
  signal?: AbortSignal,
): Promise<PosterRecord> {
  return apiFetch<PosterRecord>(
    `${BASE}/posters/${posterId}`,
    token,
    { method: "PATCH", body: JSON.stringify(data), signal },
  );
}

export function deletePoster(
  clientId: string,
  token: string,
  posterId: string,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`${BASE}/posters/${posterId}`, token, {
    method: "DELETE",
    signal,
  });
}
