import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V1_BASE = `${API_ORIGIN}/api/madrasa`;
const V2_BASE = `${API_ORIGIN}/api/v2`;

export interface StudentRecord {
  id: string;
  name: string;
  uid?: string | null;
  adno: string;
  gender: "MALE" | "FEMALE" | null;
  dateOfBirth: string | null;
  parentPhone: string | null;
  parentAltPhone: string | null;
  parentEmail: string | null;
  guardianName: string | null;
  relationToStudent: string | null;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "TRANSFERRED" | "DROPPED_OUT";
  classId: string | null;
  class: { id: string; name: string } | null;
  clientId: string;
  accademicYearId: string | null;
  accademicYear: { id: string; name: string } | null;
  teamId: string | null;
  sectionId: string | null;
  isArchived: boolean;
  photo: string | null;
  photoUrl?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  bloodGroup: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes: string | null;
  createdAt: string;
}

export interface StudentListResponse {
  data: StudentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateStudentPayload {
  name: string;
  uid?: string | null;
  adno: string;
  accademicYearId?: string;
  classId?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  parentPhone?: string;
  parentAltPhone?: string;
  parentEmail?: string;
  guardianName?: string;
  relationToStudent?: string;
  parentPassword?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {}

/** Maps field name → error message, e.g. { adno: "Admission number already in use" } */
export type FieldErrors = Record<string, string>;

export class StudentsApiError extends Error {
  statusCode?: number;
  code?: string;
  fieldErrors?: FieldErrors;
  constructor(message: string, opts?: { statusCode?: number; code?: string; fieldErrors?: FieldErrors }) {
    super(message);
    this.name = "StudentsApiError";
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
    this.fieldErrors = opts?.fieldErrors;
  }
}

export interface GetStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  gender?: "MALE" | "FEMALE";
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  signal?: AbortSignal;
}

export function getStudents(
  clientId: string,
  token: string,
  params: GetStudentsParams = {},
): Promise<StudentListResponse> {
  const { page = 1, limit = 20, search, classId, gender, status, sortBy, sortOrder, signal } = params;
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) q.set("search", search);
  if (sortBy) q.set("sortBy", sortBy);
  if (sortOrder) q.set("sortOrder", sortOrder);
  const filters: Record<string, string> = {};
  if (classId) filters.classId = classId;
  if (gender) filters.gender = gender;
  if (status) filters.status = status;
  if (Object.keys(filters).length) q.set("filters", JSON.stringify(filters));
  return apiFetch<StudentListResponse>(
    `${V1_BASE}/${clientId}/students?${q}`,
    token,
    { signal },
  );
}

export function getStudent(
  clientId: string,
  token: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V1_BASE}/${clientId}/students/${studentId}`,
    token,
    { signal },
  );
}

export function createStudent(
  clientId: string,
  token: string,
  data: CreateStudentPayload,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V1_BASE}/${clientId}/students`,
    token,
    { method: "POST", body: JSON.stringify(data), signal },
  );
}

export function updateStudent(
  clientId: string,
  token: string,
  studentId: string,
  data: UpdateStudentPayload,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V1_BASE}/${clientId}/students/${studentId}`,
    token,
    { method: "PATCH", body: JSON.stringify(data), signal },
  );
}

export function getStudentProfileV2(
  clientId: string,
  token: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentRecord> {
  return apiFetch<StudentRecord>(
    `${V2_BASE}/${clientId}/students/${studentId}`,
    token,
    { signal },
  );
}

export async function uploadStudentPhoto(
  clientId: string,
  token: string,
  studentId: string,
  file: File,
): Promise<{ id: string; photo: string; photoUrl: string | null }> {
  const formData = new FormData();
  formData.append("photo", file);

  const url = `${V2_BASE}/${clientId}/students/${studentId}/photo`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(err.message || "Upload failed");
  }

  return res.json();
}

export function deleteStudent(
  clientId: string,
  token: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `${V1_BASE}/${clientId}/students/${studentId}`,
    token,
    { method: "DELETE", signal },
  );
}

export interface BulkImportResponse {
  message: string;
  total: number;
}

export function bulkImportStudents(
  clientId: string,
  token: string,
  rows: CreateStudentPayload[],
): Promise<BulkImportResponse> {
  return apiFetch<BulkImportResponse>(
    `${V1_BASE}/${clientId}/students/bulk`,
    token,
    { method: "POST", body: JSON.stringify(rows) },
  );
}

export interface BulkImportResponseV2 {
  message: string;
  imported: Array<{ rowIndex: number; action: "created" | "updated" }>;
  failed: Array<{ rowIndex: number; message: string }>;
}

export function bulkDeleteStudents(
  clientId: string,
  token: string,
  ids: string[],
): Promise<{ message: string; count: number }> {
  return apiFetch<{ message: string; count: number }>(
    `${V1_BASE}/${clientId}/students/bulk`,
    token,
    { method: "DELETE", body: JSON.stringify(ids) },
  );
}

export function bulkImportStudentsV2(
  clientId: string,
  token: string,
  rows: CreateStudentPayload[],
): Promise<BulkImportResponseV2> {
  return apiFetch<BulkImportResponseV2>(
    `${V2_BASE}/${clientId}/students/bulk`,
    token,
    { method: "POST", body: JSON.stringify(rows) },
  );
}
