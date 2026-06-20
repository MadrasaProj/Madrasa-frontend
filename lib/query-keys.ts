export const queryKeys = {
  students: {
    all: ["students"] as const,
    list: (clientId: string, params?: unknown) =>
      ["students", "list", clientId, params ?? {}] as const,
    detail: (clientId: string, id: string) =>
      ["students", "detail", clientId, id] as const,
  },
  teachers: {
    all: ["teachers"] as const,
    list: (clientId: string, params?: unknown) =>
      ["teachers", "list", clientId, params ?? {}] as const,
  },
  attendance: {
    all: ["attendance"] as const,
    class: (clientId: string, params?: unknown) =>
      ["attendance", "class", clientId, params ?? {}] as const,
    student: (clientId: string, studentId: string) =>
      ["attendance", "student", clientId, studentId] as const,
  },
  classes: {
    all: ["classes"] as const,
    list: (clientId: string, params?: unknown) =>
      ["classes", "list", clientId, params ?? {}] as const,
    detail: (clientId: string, id: string) =>
      ["classes", "detail", clientId, id] as const,
  },
  subjects: {
    all: ["subjects"] as const,
    list: (clientId: string, params?: unknown) =>
      ["subjects", "list", clientId, params ?? {}] as const,
    detail: (clientId: string, id: string) =>
      ["subjects", "detail", clientId, id] as const,
  },
  exams: {
    all: ["exams"] as const,
    list: (clientId: string, params?: unknown) =>
      ["exams", "list", clientId, params ?? {}] as const,
    detail: (clientId: string, id: string) =>
      ["exams", "detail", clientId, id] as const,
    config: (clientId: string) => ["exams", "config", clientId] as const,
    subjectConfigs: (clientId: string, examId: string) =>
      ["exams", "subjectConfigs", clientId, examId] as const,
  },
  results: {
    all: ["results"] as const,
    list: (clientId: string, params?: unknown) =>
      ["results", "list", clientId, params ?? {}] as const,
    summaries: (clientId: string, params?: unknown) =>
      ["results", "summaries", clientId, params ?? {}] as const,
    classReport: (clientId: string, params?: unknown) =>
      ["results", "classReport", clientId, params ?? {}] as const,
  },
  fees: {
    all: ["fees"] as const,
    feeTypes: (clientId: string) => ["fees", "feeTypes", clientId] as const,
    payments: (clientId: string, params?: unknown) =>
      ["fees", "payments", clientId, params ?? {}] as const,
    receipt: (clientId: string, id: string) =>
      ["fees", "receipt", clientId, id] as const,
    studentFees: (clientId: string, studentId: string) =>
      ["fees", "student", clientId, studentId] as const,
    summary: (clientId: string, academicYearId?: string) =>
      ["fees", "summary", clientId, academicYearId ?? "all"] as const,
  },
  ibadah: {
    all: ["ibadah"] as const,
    class: (clientId: string, params?: unknown) =>
      ["ibadah", "class", clientId, params ?? {}] as const,
    student: (clientId: string, studentId: string) =>
      ["ibadah", "student", clientId, studentId] as const,
    superAdminConfig: ["ibadah", "superAdminConfig"] as const,
  },
  homework: {
    all: ["homework"] as const,
    list: (clientId: string, params?: unknown) =>
      ["homework", "list", clientId, params ?? {}] as const,
    submissions: (clientId: string, homeworkId: string) =>
      ["homework", "submissions", clientId, homeworkId] as const,
    student: (clientId: string, studentId: string) =>
      ["homework", "student", clientId, studentId] as const,
  },
  diary: {
    all: ["diary"] as const,
    list: (clientId: string, params?: unknown) =>
      ["diary", "list", clientId, params ?? {}] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    inbox: (clientId: string, params?: unknown) =>
      ["notifications", "inbox", clientId, params ?? {}] as const,
    sent: (clientId: string, params?: unknown) =>
      ["notifications", "sent", clientId, params ?? {}] as const,
    unreadCount: (clientId: string) =>
      ["notifications", "unreadCount", clientId] as const,
    diaryEvents: (clientId: string, params?: unknown) =>
      ["notifications", "diaryEvents", clientId, params ?? {}] as const,
  },
  leaveRequests: {
    all: ["leaveRequests"] as const,
    my: (clientId: string, params?: unknown) =>
      ["leaveRequests", "my", clientId, params ?? {}] as const,
    pending: (clientId: string, params?: unknown) =>
      ["leaveRequests", "pending", clientId, params ?? {}] as const,
  },
  reports: {
    all: ["reports"] as const,
    studentStats: (clientId: string) =>
      ["reports", "studentStats", clientId] as const,
    feeSummary: (clientId: string, academicYearId?: string) =>
      ["reports", "feeSummary", clientId, academicYearId ?? "all"] as const,
    attendanceSummary: (clientId: string, from?: string, to?: string) =>
      ["reports", "attendanceSummary", clientId, from ?? "", to ?? ""] as const,
    homeworkSummary: (clientId: string) =>
      ["reports", "homeworkSummary", clientId] as const,
  },
  config: {
    all: ["config"] as const,
    client: (clientId: string) => ["config", "client", clientId] as const,
  },
  teacherSession: {
    all: ["teacherSession"] as const,
    today: (clientId: string) => ["teacherSession", "today", clientId] as const,
    todayAll: (clientId: string) =>
      ["teacherSession", "todayAll", clientId] as const,
    history: (clientId: string, params?: unknown) =>
      ["teacherSession", "history", clientId, params ?? {}] as const,
    byTeacher: (clientId: string, teacherId: string) =>
      ["teacherSession", "byTeacher", clientId, teacherId] as const,
    byDate: (clientId: string, date: string) =>
      ["teacherSession", "byDate", clientId, date] as const,
  },
  superAdmin: {
    all: ["superAdmin"] as const,
    clients: ["superAdmin", "clients"] as const,
    clientPayments: (clientId: string) =>
      ["superAdmin", "clientPayments", clientId] as const,
    clientLogs: (clientId: string) =>
      ["superAdmin", "clientLogs", clientId] as const,
    users: ["superAdmin", "users"] as const,
    platformStats: ["superAdmin", "platformStats"] as const,
    activityLogs: (clientId: string) =>
      ["superAdmin", "activityLogs", clientId] as const,
  },
  posters: {
    all: ["posters"] as const,
    list: (clientId: string, params?: unknown) =>
      ["posters", "list", clientId, params ?? {}] as const,
    detail: (clientId: string, posterId: string) =>
      ["posters", "detail", clientId, posterId] as const,
  },
  bestPerformance: {
    all: ["bestPerformance"] as const,
    list: (clientId: string, params?: unknown) =>
      ["bestPerformance", "list", clientId, params ?? {}] as const,
  },
};
