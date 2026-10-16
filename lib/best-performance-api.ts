import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

export interface BestPerformer {
  studentId: string;
  name: string;
  adno: string;
  score: number;
  totalPrayers: number;
  totalQuranPages: number;
  customCounts?: Record<string, number>;
  daysWithLog: number;
  consistency: number;
  streak: number;
  scorePercentage:number
}

export interface BestPerformanceResponse {
  period: { from: string; to: string };
  totalDays: number;
  enabledPrayers: string[];
  customItems?: {
    key: string;
    label: string;
    type: "boolean" | "number" | "enum";
    min?: number;
    max?: number;
  }[];
  performers: BestPerformer[];
}

export const getBestPerformers = (
  clientId: string,
  token: string,
  params?: { from?: string; to?: string; classId?: string; gender?: string; academicYearId?: string; limit?: number },
) => {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.classId) q.set("classId", params.classId);
  if (params?.gender) q.set("gender", params.gender);
  if (params?.academicYearId) q.set("academicYearId", params.academicYearId);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch<BestPerformanceResponse>(
    `${API_BASE}/${clientId}/best-performance${qs ? `?${qs}` : ""}`,
    token,
  );
};

export interface PillarScore {
  score: number;
  maxScore: number;
}

export interface AttendancePillar extends PillarScore {
  rate: number;
  presentDays: number;
  totalDays: number;
}

export interface HomeworkPillar extends PillarScore {
  rate: number;
  completed: number;
  assigned: number;
}

export interface ExamPillar extends PillarScore {
  averagePercentage: number;
  examsCount: number;
}

export interface IbadahPillar extends PillarScore {
  percentage: number;
  totalPrayers: number;
  totalQuranPages: number;
  streak: number;
  consistency: number;
}

export interface OverallBestPerformer {
  studentId: string;
  name: string;
  adno: string;
  className: string;
  classId: string;
  rank: number;
  totalScore: number;
  totalPercentage: number;
  attendance: AttendancePillar;
  homework: HomeworkPillar;
  exam: ExamPillar;
  ibadah: IbadahPillar;
}

export interface OverallBestPerformanceResponse {
  period: { from: string; to: string };
  totalDays: number;
  totalStudents: number;
  highlights: {
    topPerformer: { studentId: string; name: string; score: number; className: string } | null;
    bestAttendance: { studentId: string; name: string; rate: number; className: string } | null;
    bestHomework: { studentId: string; name: string; rate: number; className: string } | null;
    bestExam: { studentId: string; name: string; averagePercentage: number; className: string } | null;
    bestIbadah: { studentId: string; name: string; percentage: number; className: string } | null;
  } | null;
  performers: OverallBestPerformer[];
}

export const getOverallBestStudents = (
  clientId: string,
  token: string,
  params?: { from?: string; to?: string; classId?: string; gender?: string; academicYearId?: string; limit?: number },
) => {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.classId) q.set("classId", params.classId);
  if (params?.gender) q.set("gender", params.gender);
  if (params?.academicYearId) q.set("academicYearId", params.academicYearId);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch<OverallBestPerformanceResponse>(
    `${API_BASE}/${clientId}/best-performance/overall${qs ? `?${qs}` : ""}`,
    token,
  );
};
