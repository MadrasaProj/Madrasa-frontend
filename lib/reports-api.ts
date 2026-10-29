import { apiFetch } from "@/lib/fetch";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3000";
const API_BASE   = `${API_ORIGIN}${import.meta.env.VITE_API_BASE_PATH ?? "/api/v2"}`;

export interface StudentStats {
  total: number;
  byStatus: { status: string; _count: { id: number } }[];
  byGender: { gender: string; _count: { id: number } }[];
}

export interface FeeSummary {
  byStatus: { status: string; _sum: { paidAmount: string | null; dueAmount: string | null }; _count: { id: number } }[];
  totalCollected: string | number;
  totalPending:   string | number;
}

export interface AttendanceSummary {
  byStatus: { status: string; _count: { id: number } }[];
  byClass:  { classId: string; _count: { id: number } }[];
  total:    number;
  present:  number;
  rate:     number;
}

export interface HomeworkSummary {
  byStatus: { status: string; _count: { id: number } }[];
  totalAssignments: number;
  total:            number;
  completionRate:   number;
}

export interface TeacherDiligenceItem {
  teacherId: string;
  teacherName: string;
  phone?: string | null;
  isActive: boolean;
  actionsCount: number;
  lastActiveAt: string | null;
  attendanceMarked: number;
  homeworkActions: number;
  diaryActions: number;
  hasLoggedIn: boolean;
  actionsBreakdown: { action: string; label: string; count: number }[];
}

export interface TeacherListItem {
  teacherId: string;
  teacherName: string;
  phone?: string | null;
  assignedClasses?: string[];
  isActive: boolean;
  checkedIn?: boolean;
  checkInTime?: string | null;
  attendanceMarked: boolean;
  homeworkCount: number;
  ibadahCount: number;
  actionsCount: number;
  lastActiveAt: string | null;
}

export interface OperationalActivitySummary {
  dateRange: { from?: string; to?: string };
  parents: {
    uniqueAccessed?: number;
    uniqueLoggedIn?: number;
    notAccessed?: number;
    notLoggedIn?: number;
    totalRegisteredParents: number;
    adoptionRate: number;
    totalEvents?: number;
    totalLoginEvents?: number;
    classAdoption?: {
      classId: string;
      className: string;
      totalFamilies: number;
      accessedFamilies: number;
      notAccessedFamilies: number;
      adoptionRate: number;
    }[];
  };
  classAttendance?: {
    totalClasses: number;
    markedCount: number;
    pendingCount: number;
    submissionRate: number;
    markedClasses: { id: string; name: string; teacherName: string | null; teacherPhone: string | null; recordsCount?: number }[];
    pendingClasses: { id: string; name: string; teacherName: string | null; teacherPhone: string | null }[];
  };
  homeworkCompliance?: {
    totalClasses: number;
    assignedCount: number;
    pendingCount: number;
    complianceRate: number;
    totalAssignments: number;
    assignedClasses: { id: string; name: string; teacherName: string | null; teacherPhone: string | null; assignmentsCount: number; titles: string[] }[];
    pendingClasses: { id: string; name: string; teacherName: string | null; teacherPhone: string | null }[];
  };
  ibadahCompliance?: {
    totalClasses: number;
    recordedCount: number;
    pendingCount: number;
    complianceRate: number;
    totalLogsCount: number;
    recordedClasses: { id: string; name: string; teacherName: string | null; teacherPhone: string | null; logsCount: number }[];
    pendingClasses: { id: string; name: string; teacherName: string | null; teacherPhone: string | null }[];
  };
  teachers: {
    uniqueActive: number;
    totalTeachers: number;
    utilizationRate: number;
    checkedInCount?: number;
    attendanceSubmitters: number;
    homeworkSubmitters: number;
    ibadahRecorders?: number;
    inactiveCount: number;
    teacherList?: TeacherListItem[];
  };
  operations?: {
    totalActions: number;
    byAction: { action: string; label: string; count: number }[];
    byActorType: { actorType: string; count: number }[];
    peakHour: { hour: number; count: number; formatted: string } | null;
  };
  teacherDiligence?: TeacherDiligenceItem[];
}

export interface ActivityLogListResponse {
  total: number;
  data: {
    id: string;
    clientId?: string | null;
    actorId: string;
    actorName?: string | null;
    actorType: string;
    action: string;
    label?: string;
    resource: string;
    resourceId?: string | null;
    meta?: any;
    ip?: string | null;
    createdAt: string;
  }[];
}

export const getStudentStats      = (cid: string, token: string) =>
  apiFetch<StudentStats>(`${API_BASE}/${cid}/reports/student-stats`, token);

export const getFeeSummary        = (cid: string, token: string, ay?: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (ay)   q.set("academicYearId", ay);
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  q.set("tzOffset", String(new Date().getTimezoneOffset()));
  const qs = q.toString();
  return apiFetch<FeeSummary>(`${API_BASE}/${cid}/reports/fee-summary${qs ? `?${qs}` : ""}`, token);
};

export const getAttendanceSummary = (cid: string, token: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  q.set("tzOffset", String(new Date().getTimezoneOffset()));
  const qs = q.toString();
  return apiFetch<AttendanceSummary>(`${API_BASE}/${cid}/reports/attendance-summary${qs ? `?${qs}` : ""}`, token);
};

export const getHomeworkSummary   = (cid: string, token: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  q.set("tzOffset", String(new Date().getTimezoneOffset()));
  const qs = q.toString();
  return apiFetch<HomeworkSummary>(`${API_BASE}/${cid}/reports/homework-summary${qs ? `?${qs}` : ""}`, token);
};

export const getOperationalActivity = (cid: string, token: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to)   q.set("to",   to);
  q.set("tzOffset", String(new Date().getTimezoneOffset()));
  const qs = q.toString();
  return apiFetch<OperationalActivitySummary>(`${API_BASE}/${cid}/reports/operational-activity${qs ? `?${qs}` : ""}`, token);
};

export const getActivityLogs = (
  cid: string,
  token: string,
  params?: {
    actorType?: string;
    action?: string;
    from?: string;
    to?: string;
    q?: string;
    take?: number;
    skip?: number;
  }
) => {
  const q = new URLSearchParams();
  if (params?.actorType) q.set("actorType", params.actorType);
  if (params?.action)    q.set("action",    params.action);
  if (params?.from)      q.set("from",      params.from);
  if (params?.to)        q.set("to",        params.to);
  if (params?.q)         q.set("q",         params.q);
  if (params?.take)      q.set("take",      String(params.take));
  if (params?.skip)      q.set("skip",      String(params.skip));
  const qs = q.toString();
  return apiFetch<ActivityLogListResponse>(`${API_BASE}/${cid}/reports/activity-logs${qs ? `?${qs}` : ""}`, token);
};

export interface ParentAdoptionItem {
  parentPhone: string;
  guardianName: string | null;
  children: {
    id: string;
    name: string;
    adno: string;
    classId: string | null;
    className: string;
  }[];
  hasAccessed?: boolean;
  isLoggedIn: boolean;
  lastLoginAt: string | null;
  lastAccessAt?: string | null;
  lastAction?: string | null;
  loginCount: number;
  method?: string | null;
}

export interface ClassAdoptionItem {
  classId: string;
  className: string;
  totalParents: number;
  accessedParents?: number;
  loggedInParents: number;
  notAccessedParents?: number;
  notLoggedInParents: number;
  adoptionRate: number;
  attendanceMarkedToday: boolean;
  classTeacherName?: string | null;
  classTeacherPhone?: string | null;
}

export interface ParentAdoptionReport {
  dateRange: { from: string; to: string };
  summary: {
    totalFamilies: number;
    accessedCount?: number;
    loggedInCount: number;
    notAccessedCount?: number;
    notLoggedInCount: number;
    adoptionRate: number;
  };
  classBreakdown: ClassAdoptionItem[];
  parents: ParentAdoptionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getParentAdoption = (
  cid: string,
  token: string,
  params?: {
    from?: string;
    to?: string;
    classId?: string;
    status?: "ALL" | "LOGGED_IN" | "NOT_LOGGED_IN" | "ACCESSED" | "NOT_ACCESSED";
    q?: string;
    page?: number;
    limit?: number;
  }
) => {
  const q = new URLSearchParams();
  if (params?.from)    q.set("from",    params.from);
  if (params?.to)      q.set("to",      params.to);
  if (params?.classId) q.set("classId", params.classId);
  if (params?.status)  q.set("status",  params.status);
  if (params?.q)       q.set("q",       params.q);
  if (params?.page)    q.set("page",    String(params.page));
  if (params?.limit)   q.set("limit",   String(params.limit));
  q.set("tzOffset", String(new Date().getTimezoneOffset()));
  const qs = q.toString();
  return apiFetch<ParentAdoptionReport>(`${API_BASE}/${cid}/reports/parent-adoption${qs ? `?${qs}` : ""}`, token);
};
