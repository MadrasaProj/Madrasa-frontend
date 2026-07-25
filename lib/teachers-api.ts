import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE    = `${API_ORIGIN}/api/v2`;

export interface TeacherRecord {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  clientId: string;
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  gender?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
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

export const getTeacher = (clientId: string, token: string, id: string) =>
  apiFetch<TeacherRecord>(`${V2_BASE}/${clientId}/teachers/${id}`, token);

export interface CreateTeacherPayload {
  name: string;
  username: string;
  password: string;
  status?: string;
  phone?: string;
  email?: string;
  qualification?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export const createTeacher = (
  clientId: string, token: string,
  data: CreateTeacherPayload,
) =>
  apiFetch<TeacherRecord>(`${V2_BASE}/${clientId}/teachers`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface UpdateTeacherPayload {
  name?: string;
  password?: string;
  status?: string;
  classIds?: string[];
  subjectIds?: string[];
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  gender?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
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

export const uploadTeacherPhoto = (clientId: string, token: string, teacherId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<{ photoUrl: string }>(
    `${V2_BASE}/${clientId}/teachers/${teacherId}/photo`,
    token,
    { method: "POST", body: formData },
  );
};

export const deleteTeacherPhoto = (clientId: string, token: string, teacherId: string) =>
  apiFetch<{ message: string }>(
    `${V2_BASE}/${clientId}/teachers/${teacherId}/photo`,
    token,
    { method: "DELETE" },
  );

/** Payload for one row in a teacher bulk-upsert request. */
export interface BulkUpsertTeacherRow {
  name: string;
  username: string;
  password?: string;
  status?: "ACTIVE" | "INACTIVE";
  phone?: string;
  email?: string;
  qualification?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/** One entry returned by the bulk-upsert endpoint. */
export interface BulkUpsertTeacherResult {
  rowIndex: number;
  username: string;
  name: string;
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
