import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE    = `${API_ORIGIN}/api/madrasa`;
const V2_BASE    = `${API_ORIGIN}/api/v2`;

export interface TeacherRecord {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  clientId: string;
  classes?: { id: string; name: string }[];
  subjects?: { id: string; name: string; classId?: string; class?: { id: string; name: string } }[];
}

export const getTeachers = (
  clientId: string, token: string,
  params?: { search?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc" },
) => {
  const q = new URLSearchParams();
  if (params?.page)      q.set("page",      String(params.page));
  if (params?.limit)     q.set("limit",     String(params.limit));
  if (params?.search)    q.set("search",    params.search);
  if (params?.sortBy)    q.set("sortBy",    params.sortBy);
  if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
  const qs = q.toString();
  return apiFetch<{ data: TeacherRecord[]; total: number }>(
    `${V2_BASE}/${clientId}/teachers${qs ? `?${qs}` : ""}`, token,
  );
};

export const createTeacher = (
  clientId: string, token: string,
  data: { name: string; username: string; password: string; status?: string },
) =>
  apiFetch<TeacherRecord>(`${V2_BASE}/${clientId}/teachers`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface UpdateTeacherPayload {
  name?: string;
  password?: string;
  status?: string;
  /** Full replacement list — empty array unassigns from all classes */
  classIds?: string[];
  /** period-based only — full replacement list */
  subjectIds?: string[];
}

export const updateTeacher = (
  clientId: string, token: string, id: string,
  data: UpdateTeacherPayload,
) =>
  apiFetch<TeacherRecord>(`${V2_BASE}/${clientId}/teachers/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteTeacher = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`${V2_BASE}/${clientId}/teachers/${id}`, token, {
    method: "DELETE",
  });

/** Payload for one row in a teacher bulk-upsert request. */
export interface BulkUpsertTeacherRow {
  name: string;
  username: string;
  /** Required when creating, optional when updating an existing teacher. */
  password?: string;
  status?: "ACTIVE" | "INACTIVE";
  phone?: string;
  email?: string;
}

/** One entry returned by the bulk-upsert endpoint. */
export interface BulkUpsertTeacherResult {
  /** 1-based row index from the submitted payload (matches spreadsheet row number minus header). */
  rowIndex: number;
  /** Username from the row (echoed back so the UI can match results). */
  username: string;
  name: string;
  /** Whether this row inserted a new teacher or updated an existing one. */
  action: "created" | "updated";
  teacherId: string;
}

export interface BulkUpsertTeachersResponse {
  created: number;
  updated: number;
  failed: number;
  results: BulkUpsertTeacherResult[];
  errors: Array<{ rowIndex: number; username?: string; message: string }>;
}

/**
 * Upsert many teachers in a single request.
 * Backend matches by `username`; missing rows insert, existing rows update.
 */
export const bulkUpsertTeachers = (
  clientId: string,
  token: string,
  rows: BulkUpsertTeacherRow[],
) =>
  apiFetch<BulkUpsertTeachersResponse>(
    `${V2_BASE}/${clientId}/teachers/bulk`,
    token,
    { method: "POST", body: JSON.stringify({ teachers: rows }) },
  );

