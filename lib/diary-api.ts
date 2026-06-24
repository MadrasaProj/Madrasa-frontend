import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

export interface DiaryRecipient {
  studentId: string;
  student: { id: string; name: string } | null;
}

export interface DiaryComment {
  id: string;
  parentName: string | null;
  content: string;
  createdAt: string;
  studentId: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  theme: string;
  date: string;
  targetType: "class" | "student";
  createdAt: string;
  updatedAt: string;
  classId: string | null;
  teacherId: string;
  academicYearId: string | null;
  class: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  recipients: DiaryRecipient[];
  comments: DiaryComment[];
}

export const listDiary = (
  clientId: string, token: string,
  params?: { classId?: string; studentId?: string; from?: string; to?: string },
) => {
  const q = new URLSearchParams();
  if (params?.classId)   q.set("classId", params.classId);
  if (params?.studentId) q.set("studentId", params.studentId);
  if (params?.from)      q.set("from", params.from);
  if (params?.to)        q.set("to", params.to);
  const qs = q.toString();
  return apiFetch<DiaryEntry[]>(`${API_BASE}/${clientId}/diary${qs ? `?${qs}` : ""}`, token);
};

export const upsertDiary = (
  clientId: string, token: string,
  data: {
    classId?: string; date: string; title: string; content: string;
    targetType?: string; studentIds?: string[]; academicYearId?: string; theme?: string;
  },
) =>
  apiFetch<DiaryEntry>(`${API_BASE}/${clientId}/diary`, token, { method: "POST", body: JSON.stringify(data) });

export const updateDiary = (
  clientId: string, token: string, id: string,
  data: { title?: string; content?: string; theme?: string },
) =>
  apiFetch<DiaryEntry>(`${API_BASE}/${clientId}/diary/${id}`, token, { method: "PATCH", body: JSON.stringify(data) });

export const deleteDiary = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`${API_BASE}/${clientId}/diary/${id}`, token, { method: "DELETE" });

export const getDiaryComments = (clientId: string, token: string, diaryId: string) =>
  apiFetch<DiaryComment[]>(`${API_BASE}/${clientId}/diary/${diaryId}/comments`, token);

export const addDiaryComment = (
  clientId: string, token: string, diaryId: string,
  data: { content: string; studentId: string; parentName?: string },
) =>
  apiFetch<DiaryComment>(`${API_BASE}/${clientId}/diary/${diaryId}/comments`, token, { method: "POST", body: JSON.stringify(data) });
