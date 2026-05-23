import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_ORIGIN
    ? (import.meta as any).env.VITE_API_ORIGIN
    : "http://localhost:3000";
const V2_BASE = `${API_ORIGIN}/api/v2`;

export interface SubjectRecord {
  id: string;
  name: string;
  classId: string;
  teacherId: string | null;
  status: string;
  class?: { id: string; name: string } | null;
  teacher?: { id: string; name: string } | null;
}

export interface GetSubjectsParams {
  classId?: string;
  teacherId?: string;
  status?: string;
  search?: string;
  /** kept for backward compat — ignored by V2 (no server-side pagination for subjects list) */
  page?: number;
  limit?: number;
}

/**
 * Returns { data: SubjectRecord[], total: number } for backward compat with existing callers.
 */
export function getSubjects(
  clientId: string,
  token: string,
  params: GetSubjectsParams = {},
): Promise<{ data: SubjectRecord[]; total: number }> {
  const q = new URLSearchParams();
  if (params.classId)   q.set("classId",   params.classId);
  if (params.teacherId) q.set("teacherId", params.teacherId);
  if (params.status)    q.set("status",    params.status);
  if (params.search)    q.set("search",    params.search);
  const qs = q.toString();
  return apiFetch<SubjectRecord[]>(
    `${V2_BASE}/${clientId}/subjects${qs ? `?${qs}` : ""}`,
    token,
  ).then((data) => ({ data, total: data.length }));
}

export function getSubject(
  clientId: string,
  token: string,
  subjectId: string,
): Promise<SubjectRecord> {
  return apiFetch<SubjectRecord>(`${V2_BASE}/${clientId}/subjects/${subjectId}`, token);
}

export function createSubject(
  clientId: string,
  token: string,
  data: { name: string; classId: string; teacherId?: string },
): Promise<SubjectRecord> {
  return apiFetch<SubjectRecord>(`${V2_BASE}/${clientId}/subjects`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSubject(
  clientId: string,
  token: string,
  subjectId: string,
  data: { name?: string; teacherId?: string | null; status?: string },
): Promise<SubjectRecord> {
  return apiFetch<SubjectRecord>(
    `${V2_BASE}/${clientId}/subjects/${subjectId}`,
    token,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

export function deleteSubject(
  clientId: string,
  token: string,
  subjectId: string,
): Promise<void> {
  return apiFetch(`${V2_BASE}/${clientId}/subjects/${subjectId}`, token, {
    method: "DELETE",
  });
}

export function bulkAssignTeacher(
  clientId: string,
  token: string,
  data: { classId: string; teacherId: string },
): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(
    `${V2_BASE}/${clientId}/subjects/bulk-assign-teacher`,
    token,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}
