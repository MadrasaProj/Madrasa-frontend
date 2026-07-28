/**
 * Centralised, type-safe query-key factory.
 *
 * Why this exists:
 *  - One place to find/rename a key.
 *  - `queryKeys.X.all` produces the prefix used to invalidate an entire
 *    domain (e.g. `queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })`).
 *  - Concrete builders return tuples — TanStack Query's `queryKey` option
 *    uses structural equality on arrays, so deterministic shape matters.
 *
 * Convention used everywhere: the first segment is the domain ("notifications"),
 * the second is the resource ("list", "detail", "count"), and remaining
 * segments are the parameters that uniquely identify the row(s).
 */
export const queryKeys = {
  notifications: {
    all: ["notifications"] as const,
    list: (cid: string, params?: object) =>
      ["notifications", "list", cid, params ?? {}] as const,
    unreadCount: (cid: string) => ["notifications", "unreadCount", cid] as const,
    diaryEvents: (cid: string, params: { from: string; to: string; classId?: string }) =>
      ["notifications", "diaryEvents", cid, params] as const,
  },

  attendance: {
    all: ["attendance"] as const,
    student: (cid: string, sid: string, params?: object) =>
      ["attendance", "student", cid, sid, params ?? {}] as const,
  },

  fees: {
    all: ["fees"] as const,
    student: (cid: string, sid: string) => ["fees", "student", cid, sid] as const,
    receipt: (cid: string, pid: string) => ["fees", "receipt", cid, pid] as const,
  },

  homework: {
    all: ["homework"] as const,
    student: (cid: string, sid: string) => ["homework", "student", cid, sid] as const,
    list: (cid: string, params?: object) => ["homework", "list", cid, params ?? {}] as const,
  },

  ibadah: {
    all: ["ibadah"] as const,
    student: (cid: string, sid: string, params?: object) =>
      ["ibadah", "student", cid, sid, params ?? {}] as const,
  },

  leaveRequests: {
    all: ["leaveRequests"] as const,
    my: (cid: string, params?: object) =>
      ["leaveRequests", "my", cid, params ?? {}] as const,
  },

  diary: {
    all: ["diary"] as const,
    list: (cid: string, params?: object) =>
      ["diary", "list", cid, params ?? {}] as const,
    comments: (cid: string, diaryId: string) => ["diary", "comments", cid, diaryId] as const,
  },

  bestPerformance: {
    all: ["bestPerformance"] as const,
    list: (cid: string, params?: object) =>
      ["bestPerformance", "list", cid, params ?? {}] as const,
  },

  exams: {
    all: ["exams"] as const,
    list: (cid: string, params?: object) =>
      ["exams", "list", cid, params ?? {}] as const,
  },

  results: {
    all: ["results"] as const,
    list: (cid: string, params?: object) =>
      ["results", "list", cid, params ?? {}] as const,
    summaries: (cid: string, params?: object) =>
      ["results", "summaries", cid, params ?? {}] as const,
    classReport: (cid: string, params?: object) =>
      ["results", "classReport", cid, params ?? {}] as const,
  },

  teachers: {
    all: ["teachers"] as const,
    list: (cid: string, params?: object) => ["teachers", "list", cid, params ?? {}] as const,
  },

  classes: {
    all: ["classes"] as const,
    list: (cid: string, params?: object) => ["classes", "list", cid, params ?? {}] as const,
    gradeLevels: (cid: string) => ["classes", "gradeLevels", cid] as const,
  },

  students: {
    all: ["students"] as const,
    list: (cid: string, params?: object) => ["students", "list", cid, params ?? {}] as const,
    profile: (cid: string, sid: string) => ["students", "profile", cid, sid] as const,
    fullFromParent: (sid: string) => ["students", "fullFromParent", sid] as const,
  },

  users: {
    all: ["users"] as const,
    list: (cid: string) => ["users", "list", cid] as const,
  },

  superAdmin: {
    all: ["superAdmin"] as const,
    clients: () => ["superAdmin", "clients"] as const,
  },

  reports: {
    all: ["reports"] as const,
    studentStats: (cid: string) => ["reports", "studentStats", cid] as const,
    feeSummary: (cid: string, ay?: string) => ["reports", "feeSummary", cid, ay ?? ""] as const,
    attendanceSummary: (cid: string, from?: string, to?: string) => ["reports", "attendanceSummary", cid, from ?? "", to ?? ""] as const,
    homeworkSummary: (cid: string) => ["reports", "homeworkSummary", cid] as const,
  },

  config: {
    all: ["config"] as const,
    client: (cid: string) => ["config", "client", cid] as const,
  },

  socialFrames: {
    all: ["socialFrames"] as const,
    list: (cid: string, params?: object) =>
      ["socialFrames", "list", cid, params ?? {}] as const,
    detail: (cid: string, id: string) => ["socialFrames", "detail", cid, id] as const,
  },
} as const;
