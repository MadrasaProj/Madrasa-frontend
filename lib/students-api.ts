import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ORIGIN) ?? "http://localhost:3000";
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
  confirmParentPasswordChange?: boolean;
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

/**
 * Normalizes a phone string to its canonical 10-digit/digits form.
 * Strips non-digits, leading country code "91" if 12 digits, and leading "0" if 11 digits.
 * Returns null if the phone is missing, invalid, or fewer than 7 digits.
 */
export function getCanonicalPhone(rawPhone?: unknown): string | null {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

export interface CheckParentPhoneResponse {
  exists: boolean;
  count: number;
  hasExistingPassword: boolean;
  students: Array<{
    id: string;
    name: string;
    adno: string;
    className: string | null;
  }>;
}

export function checkParentPhone(
  clientId: string,
  token: string,
  phone: string,
  excludeId?: string,
): Promise<CheckParentPhoneResponse> {
  const params = new URLSearchParams({ phone });
  if (excludeId) params.append("excludeId", excludeId);
  return apiFetch<CheckParentPhoneResponse>(
    `${V2_BASE}/${clientId}/students/check-parent-phone?${params.toString()}`,
    token,
  );
}

// ── Export Students ─────────────────────────────────────────────────────────

export interface ExportStudentsParams {
  classId?: string;
  gender?: "MALE" | "FEMALE" | string;
  status?: string;
  search?: string;
  ids?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  signal?: AbortSignal;
}

export interface ExportedStudentRecord {
  id: string;
  name: string;
  adno: string;
  class: string;
  gender: string;
  dateOfBirth: string;
  guardianName: string;
  parentPhone: string;
  parentAltPhone: string;
  relationToStudent: string;
  parentPassword?: string;
  uid: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalNotes: string;
}

export const STUDENT_EXPORT_COLUMNS = [
  "Name",
  "Admission No",
  "Class",
  "Gender",
  "Date of Birth",
  "Guardian Name",
  "Phone",
  "Alt Phone",
  "Relation",
  "Parent Password",
  "UID",
  "Address",
  "City",
  "State",
  "Country",
  "Pincode",
  "Blood Group",
  "Emergency Contact Name",
  "Emergency Contact Phone",
  "Medical Notes",
] as const;

export async function exportStudentsJson(
  clientId: string,
  token: string,
  params: ExportStudentsParams = {},
): Promise<ExportedStudentRecord[]> {
  const q = new URLSearchParams({ format: "json" });
  if (params.classId && params.classId !== "all") q.set("classId", params.classId);
  if (params.gender && params.gender !== "all") q.set("gender", params.gender);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.ids && params.ids.length > 0) q.set("ids", params.ids.join(","));
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);

  return apiFetch<ExportedStudentRecord[]>(
    `${V2_BASE}/${clientId}/students/export?${q.toString()}`,
    token,
    { signal: params.signal },
  );
}

export async function downloadStudentsCsv(
  clientId: string,
  token: string,
  params: ExportStudentsParams = {},
): Promise<{ filename: string }> {
  const q = new URLSearchParams({ format: "csv" });
  if (params.classId && params.classId !== "all") q.set("classId", params.classId);
  if (params.gender && params.gender !== "all") q.set("gender", params.gender);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.ids && params.ids.length > 0) q.set("ids", params.ids.join(","));
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);

  const res = await fetch(`${V2_BASE}/${clientId}/students/export?${q.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: params.signal,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Export request failed");
    throw new Error(`Export failed (${res.status}): ${errorText}`);
  }

  const blob = await res.blob();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `students-export-${timestamp}.csv`;

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);

  return { filename };
}

export function cleanExportField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (!str) return "";
  if (/^(nil|nill|nilll|null|undefined|na|n\/a|n\.a|n\.a\.|none|-|--|---|—|–|\.|\.\.|\\n|\\N)$/i.test(str)) {
    return "";
  }
  return str;
}

export function cleanPhoneField(val: unknown): string {
  const cleaned = cleanExportField(val);
  if (!cleaned) return "";
  const digits = cleaned.replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits) || digits.length < 5) {
    return "";
  }
  return cleaned;
}

export function cleanDateField(val: unknown): string {
  const cleaned = cleanExportField(val);
  if (!cleaned) return "";
  if (/^(0000-00-00|00\/00\/0000|01\/01\/1970)$/.test(cleaned)) return "";
  return cleaned;
}

export function naturalCompare(a: string | null | undefined, b: string | null | undefined): number {
  const strA = (a ?? "").trim();
  const strB = (b ?? "").trim();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" });
}

export function sortStudentRecords(
  records: ExportedStudentRecord[],
  sortBy: string = "default",
  sortDir: "asc" | "desc" = "asc",
): ExportedStudentRecord[] {
  const dir = sortDir === "desc" ? -1 : 1;

  return [...records].sort((a, b) => {
    if (sortBy === "name") {
      const cmp = naturalCompare(a.name, b.name);
      if (cmp !== 0) return cmp * dir;
      return naturalCompare(a.adno, b.adno);
    }

    if (sortBy === "adno") {
      const cmp = naturalCompare(a.adno, b.adno);
      if (cmp !== 0) return cmp * dir;
      return naturalCompare(a.name, b.name);
    }

    if (sortBy === "class" || sortBy === "className") {
      const cmp = naturalCompare(a.class, b.class);
      if (cmp !== 0) return cmp * dir;
      return naturalCompare(a.adno, b.adno);
    }

    if (sortBy === "guardianName") {
      const cmp = naturalCompare(a.guardianName, b.guardianName);
      if (cmp !== 0) return cmp * dir;
      return naturalCompare(a.name, b.name);
    }

    if (sortBy === "gender") {
      const cmp = naturalCompare(a.gender, b.gender);
      if (cmp !== 0) return cmp * dir;
      return naturalCompare(a.name, b.name);
    }

    // Default: Standard Academic Roster Order: Class (natural) -> Admission No (natural) -> Name
    const classCmp = naturalCompare(a.class, b.class);
    if (classCmp !== 0) return classCmp;

    const adnoCmp = naturalCompare(a.adno, b.adno);
    if (adnoCmp !== 0) return adnoCmp;

    return naturalCompare(a.name, b.name);
  });
}

export async function downloadStudentsXlsx(
  clientId: string,
  token: string,
  params: ExportStudentsParams = {},
  onProgress?: (status: string) => void,
): Promise<{ count: number; filename: string }> {
  onProgress?.("Fetching students data...");
  const records = await exportStudentsJson(clientId, token, params);
  const sortedRecords = sortStudentRecords(records, params.sortBy, params.sortOrder);

  onProgress?.("Generating Excel file...");
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const headers = [...STUDENT_EXPORT_COLUMNS];
  const dataRows: string[][] = sortedRecords.map((r) => [
    cleanExportField(r.name),
    cleanExportField(r.adno),
    cleanExportField(r.class),
    cleanExportField(r.gender),
    cleanDateField(r.dateOfBirth),
    cleanExportField(r.guardianName),
    cleanPhoneField(r.parentPhone),
    cleanPhoneField(r.parentAltPhone),
    cleanExportField(r.relationToStudent),
    "", // Parent Password blank for security and 1:1 round-trip re-import safety
    cleanExportField(r.uid),
    cleanExportField(r.address),
    cleanExportField(r.city),
    cleanExportField(r.state),
    cleanExportField(r.country),
    cleanExportField(r.pincode),
    cleanExportField(r.bloodGroup),
    cleanExportField(r.emergencyContactName),
    cleanPhoneField(r.emergencyContactPhone),
    cleanExportField(r.medicalNotes),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Style header row
  const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "10B981" } } };
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    ws[addr] = ws[addr] ?? { t: "s", v: headers[c] };
    ws[addr].s = headerStyle;
  }

  // Ensure empty cells in all data rows (r >= 1) are truly blank/omitted in the worksheet
  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && (cell.v === "" || cell.v === null || cell.v === undefined)) {
        delete ws[addr];
      }
    }
  }

  // Column widths
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));

  // Add sheet with name "Data" matching the import parser
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `students-export-${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { count: records.length, filename };
}


