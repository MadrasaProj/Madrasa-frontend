import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_ORIGIN
    ? (import.meta as any).env.VITE_API_ORIGIN
    : "http://localhost:3000";
const V2_BASE = `${API_ORIGIN}/api/v2`;

export interface ClassRecord {
  id: string;
  name: string;
  classLevel?: number | null;
  gradeLevelId?: string | null;
  gradeLevel?: { id: string; name: string; level: number } | null;
  division?: string;
  status: string;
  sectionId: string | null;
  classTeacherId: string | null;
  accademicYearId: string | null;
  studentCount: number;
  subjectCount?: number;
  classTeacher?: { id: string; name: string; username: string } | null;
  accademicYear?: { id: string; name: string } | null;
}

export interface ClassDetail extends ClassRecord {
  subjects?: { id: string; name: string; teacherId: string | null; teacher?: { id: string; name: string } | null }[];
}

export interface CreateClassPayload {
  name: string;
  gradeLevelId?: string;
  division?: string;
  accademicYearId?: string;
  classTeacherId?: string | null;
  sectionId?: string;
}

export interface UpdateClassPayload {
  name?: string;
  gradeLevelId?: string | null;
  division?: string;
  accademicYearId?: string;
  classTeacherId?: string | null;
  sectionId?: string;
  status?: "ACTIVE" | "INACTIVE";
}

interface GetClassesParams {
  search?: string;
  accademicYearId?: string;
  status?: string;
}

/**
 * getAllClasses — 3rd arg is either params object or AbortSignal (backward compat).
 * Old callers: getAllClasses(cid, token, signal)
 * New callers: getAllClasses(cid, token, { search, status })
 */
export function getAllClasses(
  clientId: string,
  token: string,
  paramsOrSignal?: GetClassesParams | AbortSignal,
  signal?: AbortSignal,
): Promise<ClassRecord[]> {
  const isSignal = typeof AbortSignal !== "undefined" && paramsOrSignal instanceof AbortSignal;
  const params = isSignal ? undefined : (paramsOrSignal as GetClassesParams | undefined);
  const sig = isSignal ? (paramsOrSignal as AbortSignal) : signal;

  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.accademicYearId) q.set("accademicYearId", params.accademicYearId);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();

  return apiFetch<ClassRecord[]>(
    `${V2_BASE}/${clientId}/classes${qs ? `?${qs}` : ""}`,
    token,
    sig ? { signal: sig } : undefined,
  );
}

// Alias for backward compat
export const getMyClasses = getAllClasses;

export function getClass(
  clientId: string,
  token: string,
  classId: string,
): Promise<ClassDetail> {
  return apiFetch<ClassDetail>(`${V2_BASE}/${clientId}/classes/${classId}`, token);
}

export function createClass(
  clientId: string,
  token: string,
  data: CreateClassPayload,
): Promise<ClassRecord> {
  return apiFetch<ClassRecord>(`${V2_BASE}/${clientId}/classes`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateClass(
  clientId: string,
  token: string,
  classId: string,
  data: UpdateClassPayload,
): Promise<ClassRecord> {
  return apiFetch<ClassRecord>(`${V2_BASE}/${clientId}/classes/${classId}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface GradeLevelRecord {
  id: string;
  name: string;
  level: number;
}

export function getGradeLevels(
  clientId: string,
  token: string,
): Promise<GradeLevelRecord[]> {
  return apiFetch<GradeLevelRecord[]>(
    `${V2_BASE}/${clientId}/classes/grade-levels`,
    token,
  );
}

export function deleteClass(
  clientId: string,
  token: string,
  classId: string,
): Promise<{ id: string; name: string; status: string }> {
  return apiFetch(`${V2_BASE}/${clientId}/classes/${classId}`, token, {
    method: "DELETE",
  });
}
