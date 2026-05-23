import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const V2_BASE    = `${API_ORIGIN}/api/v2`;

// ── Raw result record (per subject per student) ───────────────────────────────

export interface ResultRecord {
  id: string;
  score: number;
  totalMarks: number;
  grade?: string | null;
  rank?: number | null;
  isPassed?: boolean | null;
  percentage?: number | null;
  classId?: string;
  updatedAt?: string;
  subject?:  { id: string; name: string } | null;
  exam?:     { id: string; name: string; examStatus: string } | null;
  student?:  { id: string; name: string; adno: string } | null;
  class?:    { id: string; name: string } | null;
  markedBy?: { id: string; name: string } | null;
}

export interface ResultListResponse {
  data: ResultRecord[];
  total?: number;
}

// ── Summary (per student per exam) ───────────────────────────────────────────

export type ResultStatus = "PASSED" | "FAILED" | "PROMOTED" | "WITHHELD";
export type TotalGrade   = "DISTINCTION" | "FIRST_CLASS" | "SECOND_CLASS" | "THIRD_CLASS" | "TOP_PLUS" | "FAILED";

export interface ExamSummary {
  id: string;
  examId: string;
  classId: string;
  totalScore: number | null;
  totalMaxMarks: number | null;
  totalPercentage: number | null;
  rank: number | null;
  finalStatus: ResultStatus | null;
  totalGrade: TotalGrade | null;
  updatedAt: string;
  student: { id: string; name: string; adno: string; gender: string };
  class:   { id: string; name: string };
  setBy?:  { id: string; name: string } | null;
}

export interface SummaryListResponse {
  data: ExamSummary[];
  total: number;
  skip: number;
  limit: number;
}

// ── Class report (pivoted: one row per student) ───────────────────────────────

export interface SubjectMeta { id: string; name: string; maxMarks: number }

export interface MarkData {
  score: number; maxMarks: number;
  grade: string | null; isPassed: boolean | null; percentage: number | null;
}

export interface ClassReportRow {
  student: { id: string; name: string; adno: string; gender: string };
  summary: {
    totalScore: number | null; totalMaxMarks: number | null;
    totalPercentage: number | null; rank: number | null;
    finalStatus: ResultStatus | null; totalGrade: TotalGrade | null;
  };
  marks: Record<string, MarkData>;
}

export interface ClassReportConfig {
  hideMarks: boolean;
  passedLabel: string; failedLabel: string;
  promotedLabel: string; withheldLabel: string;
}

export interface ClassReport {
  exam: {
    id: string; name: string; type: string; examStatus: string;
    startDate?: string | null; endDate?: string | null; publishedDate?: string | null;
  };
  class: { id: string; name: string; classTeacher?: { id: string; name: string } | null };
  clientName?: string | null;
  clientLogo?: string | null;
  subjects: SubjectMeta[];
  config: ClassReportConfig;
  students: ClassReportRow[];
  stats: { totalStudents: number; passedCount: number; failedCount: number; rankedCount: number; classAverage: number };
}

// ── API functions ─────────────────────────────────────────────────────────────

export const getResults = (
  clientId: string, token: string,
  params: { examId?: string; studentId?: string; classId?: string; accademicYearId?: string; limit?: number; skip?: number },
) => {
  const q = new URLSearchParams();
  if (params.examId)          q.set("examId", params.examId);
  if (params.studentId)       q.set("studentId", params.studentId);
  if (params.classId)         q.set("classId", params.classId);
  if (params.accademicYearId) q.set("accademicYearId", params.accademicYearId);
  if (params.limit)           q.set("limit", String(params.limit));
  if (params.skip)            q.set("skip", String(params.skip));
  return apiFetch<ResultListResponse>(`${V2_BASE}/${clientId}/results?${q}`, token);
};

export interface BulkResultItem { subjectId: string; studentId: string; score: number; totalMarks?: number }

export const bulkUpsertResults = (
  clientId: string, token: string,
  data: { examId: string; classId: string; accademicYearId: string; results: BulkResultItem[] },
) =>
  apiFetch<{ saved: number }>(`${V2_BASE}/${clientId}/results/bulk`, token, {
    method: "POST", body: JSON.stringify(data),
  });

export const deleteResult = (clientId: string, token: string, id: string) =>
  apiFetch<{ deleted: boolean }>(`${V2_BASE}/${clientId}/results/${id}`, token, { method: "DELETE" });

export const updateResult = (
  clientId: string, token: string, id: string,
  data: { score?: number; totalMarks?: number },
) =>
  apiFetch<ResultRecord>(`${V2_BASE}/${clientId}/results/${id}`, token, {
    method: "PATCH", body: JSON.stringify(data),
  });

export const getSummaries = (
  clientId: string, token: string,
  params: { examId?: string; classId?: string; studentId?: string; accademicYearId?: string; limit?: number; skip?: number },
) => {
  const q = new URLSearchParams();
  if (params.examId)          q.set("examId", params.examId);
  if (params.classId)         q.set("classId", params.classId);
  if (params.studentId)       q.set("studentId", params.studentId);
  if (params.accademicYearId) q.set("accademicYearId", params.accademicYearId);
  if (params.limit)           q.set("limit", String(params.limit));
  if (params.skip)            q.set("skip", String(params.skip));
  return apiFetch<SummaryListResponse>(`${V2_BASE}/${clientId}/results/summaries?${q}`, token);
};

export const computeSummary = (
  clientId: string, token: string,
  data: { examId: string; classId: string; accademicYearId?: string },
) =>
  apiFetch<{ computed: number; ranked: number; students: number }>(
    `${V2_BASE}/${clientId}/results/summaries/compute`, token,
    { method: "POST", body: JSON.stringify(data) },
  );

export const setFinalStatus = (
  clientId: string, token: string,
  studentId: string, examId: string,
  data: { finalStatus: ResultStatus; totalGrade?: TotalGrade | null },
) =>
  apiFetch<ExamSummary>(
    `${V2_BASE}/${clientId}/results/summaries/${studentId}?examId=${examId}`, token,
    { method: "PATCH", body: JSON.stringify(data) },
  );

export const getClassReport = (
  clientId: string, token: string,
  params: { examId: string; classId: string },
) => {
  const q = new URLSearchParams({ examId: params.examId, classId: params.classId });
  return apiFetch<ClassReport>(`${V2_BASE}/${clientId}/results/class-report?${q}`, token);
};

// ── Grade utilities ───────────────────────────────────────────────────────────

export function calcGradeFromConfig(score: number, maxMarks: number, gradeConfig?: Record<string, { min: number }> | null): string {
  const pct = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
  if (gradeConfig) {
    const sorted = Object.entries(gradeConfig).sort(([, a], [, b]) => b.min - a.min);
    for (const [grade, { min }] of sorted) if (pct >= min) return grade;
  }
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 36) return "D+";
  return "D";
}

export const calcGrade = (score: number, totalMarks = 100) => calcGradeFromConfig(score, totalMarks, null);

export const GRADE_COLORS: Record<string, string> = {
  "A+": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "A":  "text-teal-700 bg-teal-50 border-teal-200",
  "B+": "text-blue-700 bg-blue-50 border-blue-200",
  "B":  "text-indigo-700 bg-indigo-50 border-indigo-200",
  "C+": "text-amber-700 bg-amber-50 border-amber-200",
  "C":  "text-yellow-700 bg-yellow-50 border-yellow-200",
  "D+": "text-orange-700 bg-orange-50 border-orange-200",
  "D":  "text-red-700 bg-red-50 border-red-200",
};

export const FINAL_STATUS_COLORS: Record<string, string> = {
  PASSED:   "text-emerald-700 bg-emerald-50",
  FAILED:   "text-red-700 bg-red-50",
  PROMOTED: "text-blue-700 bg-blue-50",
  WITHHELD: "text-amber-700 bg-amber-50",
};

export const TOTAL_GRADE_LABELS: Record<TotalGrade, string> = {
  DISTINCTION:  "Distinction",
  FIRST_CLASS:  "First Class",
  SECOND_CLASS: "Second Class",
  THIRD_CLASS:  "Third Class",
  TOP_PLUS:     "Top Plus",
  FAILED:       "Failed",
};
