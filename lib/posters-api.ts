import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const BASE = `${API_ORIGIN}/api/v2`;

export interface PosterRecord {
  id: string;
  title: string;
  imageUrl: string;
  clientId: string | null;
  createdAt: string;
}

export interface PosterListResponse {
  data: PosterRecord[];
  total: number;
  page: number;
  limit: number;
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

export function getPosters(
  clientId?: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<PosterListResponse> {
  const { page = 1, limit = 20, signal } = params ?? {};
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const url = clientId ? `${BASE}/${clientId}/posters?${q}` : `${BASE}/posters?${q}`;
  return fetch(url, { signal }).then((r) => r.json());
}

export function uploadPoster(
  clientId: string | undefined,
  token: string,
  title: string,
  file: File,
): Promise<PosterRecord> {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("file", file);
  const url = clientId ? `${BASE}/${clientId}/posters` : `${BASE}/posters`;
  return apiFetch<PosterRecord>(url, token, {
    method: "POST",
    body: formData,
  });
}

export function deletePoster(
  clientId: string | undefined,
  token: string,
  posterId: string,
): Promise<{ message: string }> {
  const url = clientId
    ? `${BASE}/${clientId}/posters/${posterId}`
    : `${BASE}/posters/${posterId}`;
  return apiFetch<{ message: string }>(
    url,
    token,
    { method: "DELETE" },
  );
}

export function getPosterDownloadUrl(clientId: string | undefined, posterId: string): string {
  return clientId
    ? `${BASE}/${clientId}/posters/${posterId}/download`
    : `${BASE}/posters/${posterId}/download`;
}
