import { apiFetch } from "@/lib/fetch";

const API_ORIGIN =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_ORIGIN) ||
  "http://localhost:3000";
const MADRASA_BASE = `${API_ORIGIN}/api/madrasa`;
const API_BASE = `${API_ORIGIN}/api`;

export interface AcademicYearRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export interface AcademicYearInput {
  name: string;
  /** YYYY-MM-DD, or null to clear the date */
  startDate?: string | null;
  /** YYYY-MM-DD, or null to clear the date */
  endDate?: string | null;
}

export interface GetAcademicYearsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  signal?: AbortSignal;
}

export interface AcademicYearListResponse {
  data: AcademicYearRecord[];
  total: number;
  page: number;
  limit: number;
}

export function getAcademicYears(
  clientId: string,
  token: string,
  params: GetAcademicYearsParams = {},
): Promise<AcademicYearListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 100));
  if (params.sortBy) q.set("sortBy", params.sortBy);
  if (params.sortOrder) q.set("sortOrder", params.sortOrder);
  return apiFetch<AcademicYearListResponse>(
    `${MADRASA_BASE}/${encodeURIComponent(clientId)}/accademicyears?${q.toString()}`,
    token,
    { signal: params.signal },
  );
}

export function createAcademicYear(
  clientId: string,
  token: string,
  data: AcademicYearInput,
): Promise<AcademicYearRecord> {
  return apiFetch<AcademicYearRecord>(
    `${MADRASA_BASE}/${encodeURIComponent(clientId)}/accademicyears`,
    token,
    { method: "POST", body: JSON.stringify(data) },
  );
}

export function updateAcademicYear(
  clientId: string,
  token: string,
  academicYearId: string,
  data: AcademicYearInput,
): Promise<AcademicYearRecord> {
  return apiFetch<AcademicYearRecord>(
    `${MADRASA_BASE}/${encodeURIComponent(clientId)}/accademicyears/${encodeURIComponent(academicYearId)}`,
    token,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

export function deleteAcademicYear(
  clientId: string,
  token: string,
  academicYearId: string,
): Promise<void> {
  return apiFetch<void>(
    `${MADRASA_BASE}/${encodeURIComponent(clientId)}/accademicyears/${encodeURIComponent(academicYearId)}`,
    token,
    { method: "DELETE" },
  );
}

/** Marks an academic year as the organization's current one. */
export function setCurrentAcademicYear(
  clientId: string,
  token: string,
  academicYearId: string,
): Promise<{ id: string; currentAcademicYearId?: string | null }> {
  return apiFetch(
    `${API_BASE}/client/${encodeURIComponent(clientId)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ currentAcademicYearId: academicYearId }),
    },
  );
}
