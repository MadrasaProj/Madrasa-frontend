import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const BASE = `${API_ORIGIN}/api/v2`;

export interface SocialFrameRecord {
  id: string;
  title: string;
  sceneData: unknown;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialFrameListResponse {
  data: SocialFrameRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSocialFramePayload {
  title: string;
  sceneData: unknown;
}

export interface UpdateSocialFramePayload {
  title?: string;
  sceneData?: unknown;
}

export class SocialFramesApiError extends Error {
  statusCode?: number;
  code?: string;
  constructor(message: string, opts?: { statusCode?: number; code?: string }) {
    super(message);
    this.name = "SocialFramesApiError";
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
    if (!res.ok) throw new SocialFramesApiError(payload?.message ?? `Request failed (${res.status})`, { statusCode: res.status });
    return payload as T;
  } catch (err) {
    if (err instanceof SocialFramesApiError) throw err;
    throw new SocialFramesApiError((err as Error)?.message ?? "Something went wrong.");
  } finally {
    clearTimeout(timer);
  }
}

export function getSocialFrames(
  clientId: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<SocialFrameListResponse> {
  const { page = 1, limit = 20, signal } = params ?? {};
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return publicFetch<SocialFrameListResponse>(`${BASE}/${clientId}/social-frames?${q}`, { signal });
}

export function getSocialFrame(
  clientId: string,
  frameId: string,
  signal?: AbortSignal,
): Promise<SocialFrameRecord> {
  return publicFetch<SocialFrameRecord>(`${BASE}/${clientId}/social-frames/${frameId}`, { signal });
}

export function createSocialFrame(
  clientId: string,
  token: string,
  data: CreateSocialFramePayload,
  signal?: AbortSignal,
): Promise<SocialFrameRecord> {
  return apiFetch<SocialFrameRecord>(
    `${BASE}/${clientId}/social-frames`,
    token,
    { method: "POST", body: JSON.stringify(data), signal },
  );
}

export function updateSocialFrame(
  clientId: string,
  token: string,
  frameId: string,
  data: UpdateSocialFramePayload,
  signal?: AbortSignal,
): Promise<SocialFrameRecord> {
  return apiFetch<SocialFrameRecord>(
    `${BASE}/${clientId}/social-frames/${frameId}`,
    token,
    { method: "PATCH", body: JSON.stringify(data), signal },
  );
}

export function deleteSocialFrame(
  clientId: string,
  token: string,
  frameId: string,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `${BASE}/${clientId}/social-frames/${frameId}`,
    token,
    { method: "DELETE", signal },
  );
}
