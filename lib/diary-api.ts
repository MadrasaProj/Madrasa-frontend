import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

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

export const listDiary = (
  clientId: string, token: string,
  params?: { classId?: string; from?: string; to?: string },
) => {
  const q = new URLSearchParams();
  if (params?.classId) q.set("classId", params.classId);
  if (params?.from)    q.set("from", params.from);
  if (params?.to)      q.set("to", params.to);
  const qs = q.toString();
  return apiFetch<DiaryEntry[]>(`${API_BASE}/${clientId}/diary${qs ? `?${qs}` : ""}`, token);
};

export const upsertDiary = (
  clientId: string, token: string,
  data: { classId: string; date: string; title: string; content: string; academicYearId?: string },
) =>
  apiFetch<DiaryEntry>(`${API_BASE}/${clientId}/diary`, token, { method: "POST", body: JSON.stringify(data) });

export const updateDiary = (
  clientId: string, token: string, id: string,
  data: { title?: string; content?: string },
) =>
  apiFetch<DiaryEntry>(`${API_BASE}/${clientId}/diary/${id}`, token, { method: "PATCH", body: JSON.stringify(data) });

export const deleteDiary = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`${API_BASE}/${clientId}/diary/${id}`, token, { method: "DELETE" });
