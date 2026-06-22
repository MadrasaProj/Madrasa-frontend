import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

export type PrayerStatus = 'QALA' | 'ADA' | 'JAMA' | 'NOT_PRAYABLE';

export interface IbadahRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  fajr: PrayerStatus | null;
  dhuhr: PrayerStatus | null;
  asr: PrayerStatus | null;
  maghrib: PrayerStatus | null;
  isha: PrayerStatus | null;
  quranPages: number;
  customData: Record<string, boolean | number> | null;
  notes: string | null;
  academicYearId: string | null;
  recordedBy: string;
  student: { id: string; name: string; adno: string };
  class?: { id: string; name: string } | null;
  teacher?: { id: string; name: string } | null;
}

export interface IbadahConfig {
  id: string;
  enableFajr: boolean;
  enableDhuhr: boolean;
  enableAsr: boolean;
  enableMaghrib: boolean;
  enableIsha: boolean;
  enableQuranPages: boolean;
  customItems: { key: string; label: string; type: "boolean" | "number"; min?: number; max?: number }[];
}

export interface ClassIbadahResponse {
  config: IbadahConfig;
  logs: IbadahRecord[];
}

export interface StudentIbadahLog {
  id: string;
  date: string;
  fajr: PrayerStatus | null;
  dhuhr: PrayerStatus | null;
  asr: PrayerStatus | null;
  maghrib: PrayerStatus | null;
  isha: PrayerStatus | null;
  quranPages: number;
  customData: Record<string, boolean | number> | null;
  notes: string | null;
}

export interface StudentIbadahResponse {
  config: IbadahConfig;
  student: { id: string; name: string; adno: string; class?: { id: string; name: string } | null };
  logs: StudentIbadahLog[];
  streak: number;
  weekly: { fajr: number; dhuhr: number; asr: number; maghrib: number; isha: number; quranPages: number };
}

export interface UpsertStudentIbadahPayload {
  date: string;
  fajr?: PrayerStatus;
  dhuhr?: PrayerStatus;
  asr?: PrayerStatus;
  maghrib?: PrayerStatus;
  isha?: PrayerStatus;
  quranPages?: number;
  customData?: Record<string, boolean | number>;
  notes?: string;
  academicYearId?: string;
}

export interface BulkIbadahEntry {
  studentId: string;
  fajr?: PrayerStatus;
  dhuhr?: PrayerStatus;
  asr?: PrayerStatus;
  maghrib?: PrayerStatus;
  isha?: PrayerStatus;
  quranPages?: number;
  customData?: Record<string, boolean | number>;
  notes?: string;
}

export interface UpdateIbadahConfigPayload {
  enableFajr?: boolean;
  enableDhuhr?: boolean;
  enableAsr?: boolean;
  enableMaghrib?: boolean;
  enableIsha?: boolean;
  enableQuranPages?: boolean;
  customItems?: IbadahConfig["customItems"];
}

class IbadahApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "IbadahApiError";
    this.statusCode = statusCode;
  }
}

/** Teacher/admin reads class ibadah. Supports single date OR from/to range for weekly view. */
export const getClassIbadah = (
  clientId: string,
  token: string,
  params: { classId?: string; date?: string; from?: string; to?: string; academicYearId?: string },
) => {
  const q = new URLSearchParams();
  if (params.classId)        q.set("classId", params.classId);
  if (params.date)           q.set("date", params.date);
  if (params.from)           q.set("from", params.from);
  if (params.to)             q.set("to", params.to);
  if (params.academicYearId) q.set("academicYearId", params.academicYearId);
  const qs = q.toString();
  return apiFetch<ClassIbadahResponse>(`${API_BASE}/${clientId}/ibadah${qs ? `?${qs}` : ""}`, token);
};

/** Admin bulk upsert for a full class (admins only) */
export const bulkUpsertIbadah = (
  clientId: string,
  token: string,
  data: { classId: string; date: string; academicYearId?: string; records: BulkIbadahEntry[] },
) =>
  apiFetch<{ saved: number }>(
    `${API_BASE}/${clientId}/ibadah/bulk`, token,
    { method: "POST", body: JSON.stringify(data) },
  );

/** Parent (or admin) submits/updates ibadah for a single student */
export const upsertStudentIbadah = (
  clientId: string,
  token: string,
  studentId: string,
  payload: UpsertStudentIbadahPayload,
) =>
  apiFetch<StudentIbadahLog>(
    `${API_BASE}/${clientId}/ibadah/student/${studentId}`, token,
    { method: "POST", body: JSON.stringify(payload) },
  );

/** Get ibadah history + streak + weekly + config for one student */
export const getStudentIbadah = (
  clientId: string,
  token: string,
  studentId: string,
  params?: { from?: string; to?: string; limit?: number },
) => {
  const q = new URLSearchParams();
  if (params?.from)  q.set("from", params.from);
  if (params?.to)    q.set("to", params.to);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch<StudentIbadahResponse>(
    `${API_BASE}/${clientId}/ibadah/student/${studentId}${qs ? `?${qs}` : ""}`, token,
  );
};

export const getSuperAdminIbadahConfig = (token: string) =>
  apiFetch<IbadahConfig>(`${API_BASE}/super-admin/ibadah-config`, token);

export const updateSuperAdminIbadahConfig = (token: string, dto: UpdateIbadahConfigPayload) =>
  apiFetch<IbadahConfig>(`${API_BASE}/super-admin/ibadah-config`, token, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
