import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE    = `${API_ORIGIN}/api/v2`;

export type ExamStatus = "DRAFT" | "MARK_ENTRY" | "PUBLISHED" | "CANCELLED";

export type ExamType = "TERM_EXAM" | "CLASS_TEST" | "UNIT_TEST";

export interface ExamRecord {
  id: string;
  name: string;
  status: string;
  examStatus: ExamStatus;
  type?: ExamType;
  classId?: string | null;
  subjectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  markEntryLastDate?: string | null;
  publishedDate?: string | null;
  maxMarks?: number | null;
  passMarks?: number | null;
  accademicYear?: { id: string; name: string } | null;
  class?:         { id: string; name: string } | null;
  subject?:       { id: string; name: string } | null;
  _count?: { results: number };
}

export interface ExamListResponse {
  data: ExamRecord[];
  total?: number;
  page?: number;
  limit?: number;
}

// ── Exam CRUD ─────────────────────────────────────────────────────────────────

export const getExams = (
  clientId: string, token: string,
  params?: { accademicYearId?: string; examStatus?: ExamStatus; type?: ExamType; classId?: string; page?: number; limit?: number },
) => {
  const q = new URLSearchParams();
  if (params?.accademicYearId) q.set("accademicYearId", params.accademicYearId);
  if (params?.examStatus)      q.set("examStatus", params.examStatus);
  if (params?.type)            q.set("type", params.type);
  if (params?.classId)         q.set("classId", params.classId);
  if (params?.page)            q.set("page", String(params.page));
  if (params?.limit)           q.set("limit", String(params.limit));
  return apiFetch<ExamListResponse>(`${V2_BASE}/${clientId}/exams?${q}`, token);
};

export const getExam = (clientId: string, token: string, id: string) =>
  apiFetch<ExamRecord>(`${V2_BASE}/${clientId}/exams/${id}`, token);

export const createExam = (
  clientId: string, token: string,
  data: {
    name: string; accademicYearId: string;
    type?: ExamType; classId?: string; subjectId?: string;
    startDate?: string; endDate?: string;
    markEntryLastDate?: string; publishedDate?: string; examStatus?: ExamStatus;
    maxMarks?: number; passMarks?: number;
  },
) =>
  apiFetch<ExamRecord>(`${V2_BASE}/${clientId}/exams`, token, {
    method: "POST", body: JSON.stringify(data),
  });

export const updateExam = (
  clientId: string, token: string, id: string,
  data: Partial<{ name: string; startDate: string | null; endDate: string | null; markEntryLastDate: string | null; publishedDate: string | null; examStatus: ExamStatus; maxMarks: number; passMarks: number }>,
) =>
  apiFetch<ExamRecord>(`${V2_BASE}/${clientId}/exams/${id}`, token, {
    method: "PATCH", body: JSON.stringify(data),
  });

export const deleteExam = (clientId: string, token: string, id: string) =>
  apiFetch<{ message: string }>(`${V2_BASE}/${clientId}/exams/${id}`, token, { method: "DELETE" });

export const generateRanks = (clientId: string, token: string, id: string) =>
  apiFetch<{ ranked: number; classes: number }>(
    `${V2_BASE}/${clientId}/exams/${id}/generate-ranks`, token, { method: "POST" },
  );

// ── Exam config ───────────────────────────────────────────────────────────────

export interface GradeConfigEntry { min: number }
export type GradeConfig = Record<string, GradeConfigEntry>;

export interface ExamConfig {
  id: string;
  clientId: string;
  passedLabel: string;
  failedLabel: string;
  promotedLabel: string;
  withheldLabel: string;
  hideMarks: boolean;
  defaultMaxMarks: number;
  gradeConfig: GradeConfig;
  updatedAt: string;
}

export const getExamConfig = (clientId: string, token: string) =>
  apiFetch<ExamConfig>(`${V2_BASE}/${clientId}/exams/config`, token);

export const updateExamConfig = (
  clientId: string, token: string,
  data: Partial<{
    passedLabel: string; failedLabel: string; promotedLabel: string; withheldLabel: string;
    hideMarks: boolean; defaultMaxMarks: number; gradeConfig: GradeConfig;
  }>,
) =>
  apiFetch<ExamConfig>(`${V2_BASE}/${clientId}/exams/config`, token, {
    method: "PUT", body: JSON.stringify(data),
  });

// ── Subject exam config (sparse) ──────────────────────────────────────────────

export interface SubjectExamConfig {
  id: string;
  subjectId: string;
  examId: string;
  clientId: string;
  maxMarks: number | null;
  gradeConfig: GradeConfig | null;
  subject: { id: string; name: string };
}

export const getSubjectExamConfigs = (clientId: string, token: string, examId: string) =>
  apiFetch<SubjectExamConfig[]>(`${V2_BASE}/${clientId}/exams/${examId}/subject-configs`, token);

export const upsertSubjectExamConfig = (
  clientId: string, token: string, examId: string, subjectId: string,
  data: { maxMarks?: number; gradeConfig?: GradeConfig },
) =>
  apiFetch<SubjectExamConfig>(
    `${V2_BASE}/${clientId}/exams/${examId}/subject-configs/${subjectId}`, token,
    { method: "PUT", body: JSON.stringify(data) },
  );

export const deleteSubjectExamConfig = (clientId: string, token: string, examId: string, subjectId: string) =>
  apiFetch<{ deleted: boolean }>(
    `${V2_BASE}/${clientId}/exams/${examId}/subject-configs/${subjectId}`, token,
    { method: "DELETE" },
  );
