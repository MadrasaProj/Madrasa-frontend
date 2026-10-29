import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeFilter, type DatePreset } from "@/components/ui/DateRangeFilter";
import { useAuthStore } from "@/store/auth";
import {
  useStudentStats,
  useFeeSummary,
  useAttendanceSummary,
  useHomeworkSummary,
  useOperationalActivity,
  useParentAdoption,
  useClasses,
} from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import {
  Users,
  IndianRupee,
  ClipboardList,
  BookOpen,
  RefreshCw,
  TrendingUp,
  Activity,
  Smartphone,
  UserCheck,
  UserX,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  PhoneCall,
  GraduationCap,
  CalendarCheck,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageSkeleton } from "@/components/ui/Skeleton";

const GENDER_COLORS = { MALE: "#3b82f6", FEMALE: "#f472b6", OTHER: "#a78bfa" };
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981",
  INACTIVE: "#f59e0b",
  GRADUATED: "#3b82f6",
  TRANSFERRED: "#8b5cf6",
  DROPPED_OUT: "#ef4444",
};
const FEE_COLORS: Record<string, string> = {
  PAID: "#10b981",
  PENDING: "#f59e0b",
  PARTIAL: "#3b82f6",
  OVERDUE: "#ef4444",
  WAIVED: "#9ca3af",
};
const ATT_COLORS: Record<string, string> = {
  PRESENT: "#10b981",
  ABSENT: "#ef4444",
  LATE: "#f59e0b",
  EXCUSED: "#3b82f6",
};

function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return "No access";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminReportsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const [dateRange, setDateRange] = useState<{ from: string; to: string; preset: DatePreset }>({
    from: "",
    to: "",
    preset: "ALL",
  });

  // Modal States for On-Demand Detail Inspection (Lazy Loaded)
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [parentModalStatus, setParentModalStatus] = useState<"ALL" | "ACCESSED" | "NOT_ACCESSED">("NOT_ACCESSED");
  const [parentModalClassId, setParentModalClassId] = useState<string>("ALL");
  const [parentModalSearch, setParentModalSearch] = useState<string>("");
  const [parentModalPage, setParentModalPage] = useState<number>(1);
  const PARENT_MODAL_PAGE_SIZE = 15;

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceModalTab, setAttendanceModalTab] = useState<"PENDING" | "SUBMITTED" | "ALL">("PENDING");
  const [attendanceModalSearch, setAttendanceModalSearch] = useState("");

  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [homeworkModalTab, setHomeworkModalTab] = useState<"PENDING" | "ASSIGNED" | "ALL">("PENDING");
  const [homeworkModalSearch, setHomeworkModalSearch] = useState("");

  const [ibadahModalOpen, setIbadahModalOpen] = useState(false);
  const [ibadahModalTab, setIbadahModalTab] = useState<"PENDING" | "RECORDED" | "ALL">("PENDING");
  const [ibadahModalSearch, setIbadahModalSearch] = useState("");

  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [facultyModalTab, setFacultyModalTab] = useState<"INACTIVE" | "ACTIVE" | "ALL">("INACTIVE");
  const [facultyModalSearch, setFacultyModalSearch] = useState("");

  const qc = useQueryClient();

  const dateParams =
    dateRange.from || dateRange.to
      ? { from: dateRange.from || undefined, to: dateRange.to || undefined }
      : undefined;

  // 1. Core High-Level Analytics Queries
  const {
    data: studentStats,
    isLoading: loadingStudentStats,
    error: studentError,
  } = useStudentStats({ clientId: cid, token });

  const {
    data: feeSummary,
    isLoading: loadingFeeSummary,
    error: feeError,
  } = useFeeSummary({ clientId: cid, token }, ayId || undefined, dateParams);

  const {
    data: attendanceSummary,
    isLoading: loadingAttendanceSummary,
    error: attendanceError,
  } = useAttendanceSummary({ clientId: cid, token }, dateParams);

  const {
    data: homeworkSummary,
    isLoading: loadingHomeworkSummary,
    error: homeworkError,
  } = useHomeworkSummary({ clientId: cid, token }, dateParams);

  // 2. High-Performance Operational Pulse (Aggregated counts across core modules)
  const {
    data: operationalData,
    isLoading: loadingOperational,
  } = useOperationalActivity({ clientId: cid, token }, dateParams);

  // 3. Classes List for Dropdown
  const { data: classesList } = useClasses({ clientId: cid, token });

  // 4. ON-DEMAND Parent Adoption Roster: Fetched ONLY when parent modal is open!
  const {
    data: parentAdoptionData,
    isLoading: loadingParentAdoption,
  } = useParentAdoption(
    { clientId: cid, token },
    {
      from: dateParams?.from,
      to: dateParams?.to,
      classId: parentModalClassId !== "ALL" ? parentModalClassId : undefined,
      status: parentModalStatus,
      q: parentModalSearch.trim() || undefined,
      page: parentModalPage,
      limit: PARENT_MODAL_PAGE_SIZE,
    },
    { enabled: parentModalOpen }
  );

  const students = studentStats ?? null;
  const fees = feeSummary ?? null;
  const attendance = attendanceSummary ?? null;
  const homework = homeworkSummary ?? null;
  const ops = operationalData ?? null;
  const parentReport = parentAdoptionData ?? null;

  const coreLoading =
    loadingStudentStats || loadingFeeSummary || loadingAttendanceSummary || loadingHomeworkSummary;

  const coreError = studentError?.message || feeError?.message || attendanceError?.message || homeworkError?.message || null;

  const load = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.reports.all });
  }, [qc]);

  const genderData =
    students?.byGender.map((g) => ({
      name: g.gender,
      value: g._count.id,
      fill: (GENDER_COLORS as any)[g.gender] ?? "#9ca3af",
    })) ?? [];

  const feeData =
    fees?.byStatus.map((s) => ({
      name: s.status,
      amount: Number(s._sum.paidAmount ?? 0),
      fill: FEE_COLORS[s.status] ?? "#9ca3af",
    })) ?? [];

  const attData =
    attendance?.byStatus.map((s) => ({
      name: s.status,
      count: s._count.id,
      fill: ATT_COLORS[s.status] ?? "#9ca3af",
    })) ?? [];

  const hwData =
    homework?.byStatus.map((s) => ({
      name: s.status.replace("_", " "),
      count: s._count.id,
      fill: s.status === "CHECKED" ? "#10b981" : s.status === "SUBMITTED" ? "#f59e0b" : "#ef4444",
    })) ?? [];

  const openParentInspection = (status: "NOT_ACCESSED" | "ACCESSED" | "ALL", classId = "ALL") => {
    setParentModalStatus(status);
    setParentModalClassId(classId);
    setParentModalSearch("");
    setParentModalPage(1);
    setParentModalOpen(true);
  };

  if (coreLoading && !students) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  // Safe metrics fallbacks
  const parentAccessedCount = ops?.parents?.uniqueAccessed ?? ops?.parents?.uniqueLoggedIn ?? 0;
  const parentInactiveCount = ops?.parents?.notAccessed ?? ops?.parents?.notLoggedIn ?? 0;
  const parentTotalCount = ops?.parents?.totalRegisteredParents ?? 0;
  const parentAdoptionPct = ops?.parents?.adoptionRate ?? 0;

  const classAttTotal = ops?.classAttendance?.totalClasses ?? 0;
  const classAttMarked = ops?.classAttendance?.markedCount ?? 0;
  const classAttPending = ops?.classAttendance?.pendingCount ?? 0;
  const classAttRate = ops?.classAttendance?.submissionRate ?? 0;

  const hwTotalClasses = ops?.homeworkCompliance?.totalClasses ?? 0;
  const hwAssignedCount = ops?.homeworkCompliance?.assignedCount ?? 0;
  const hwPendingCount = ops?.homeworkCompliance?.pendingCount ?? 0;
  const hwComplianceRate = ops?.homeworkCompliance?.complianceRate ?? 0;

  const ibTotalClasses = ops?.ibadahCompliance?.totalClasses ?? 0;
  const ibRecordedCount = ops?.ibadahCompliance?.recordedCount ?? 0;
  const ibPendingCount = ops?.ibadahCompliance?.pendingCount ?? 0;
  const ibComplianceRate = ops?.ibadahCompliance?.complianceRate ?? 0;

  const teacherTotal = ops?.teachers?.totalTeachers ?? 0;
  const teacherActive = ops?.teachers?.uniqueActive ?? 0;
  const teacherInactive = ops?.teachers?.inactiveCount ?? 0;
  const teacherUtilization = ops?.teachers?.utilizationRate ?? 0;
  const teacherCheckedIn = ops?.teachers?.checkedInCount ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Header with Title & Date Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Institutional Reports & Operations"
            subtitle="Real-time compliance monitoring, stakeholder system engagement, and academic analytics."
          />
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
              title="Refresh all metrics"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Coordinated Date Filter */}
        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={setDateRange}
          initialPreset="ALL"
          allowAllTime
        />

        {/* Non-blocking subtle alert if any optional subsystem has an error */}
        {coreError && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Some historical report modules are syncing or unavailable: {coreError}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 1: CORE OPERATIONAL COMPLIANCE & ACCESS PULSE           */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Daily Operations & Compliance Matrix
              </h2>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {dateRange.from ? `${dateRange.from} to ${dateRange.to || dateRange.from}` : "Today / Live Window"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Parent System Access & Engagement */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Parent Portal Access</h3>
                      <p className="text-xs text-gray-500">Families accessed system</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {parentAdoptionPct}% Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Accessed Today</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{parentAccessedCount}</p>
                    <p className="text-[10px] text-gray-400">of {parentTotalCount} registered</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                      <UserX className="w-3.5 h-3.5" />
                      <span>Not Accessed</span>
                    </div>
                    <p className="text-lg font-bold text-rose-600 mt-0.5">{parentInactiveCount}</p>
                    <p className="text-[10px] text-gray-400">in selected date</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, parentAdoptionPct)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => openParentInspection("NOT_ACCESSED")}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Inspect Inactive Families ({parentInactiveCount})</span>
                </button>
              </div>
            </div>

            {/* 2. Class Daily Attendance Compliance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Class Attendance</h3>
                      <p className="text-xs text-gray-500">Daily attendance submission</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {classAttRate}% Submitted
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submitted</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{classAttMarked}</p>
                    <p className="text-[10px] text-gray-400">classes marked</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending</span>
                    </div>
                    <p className="text-lg font-bold text-amber-600 mt-0.5">{classAttPending}</p>
                    <p className="text-[10px] text-gray-400">of {classAttTotal} active classes</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, classAttRate)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => {
                    setAttendanceModalTab(classAttPending > 0 ? "PENDING" : "ALL");
                    setAttendanceModalSearch("");
                    setAttendanceModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>
                    {classAttPending > 0
                      ? `Inspect Pending Classes (${classAttPending})`
                      : "View Attendance Status"}
                  </span>
                </button>
              </div>
            </div>

            {/* 3. Homework / Assignments Compliance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Homework Compliance</h3>
                      <p className="text-xs text-gray-500">Classes with daily homework</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    {hwComplianceRate}% Assigned
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Assigned</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{hwAssignedCount}</p>
                    <p className="text-[10px] text-gray-400">classes active</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>No Homework</span>
                    </div>
                    <p className="text-lg font-bold text-amber-600 mt-0.5">{hwPendingCount}</p>
                    <p className="text-[10px] text-gray-400">classes pending</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, hwComplianceRate)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => {
                    setHomeworkModalTab(hwPendingCount > 0 ? "PENDING" : "ALL");
                    setHomeworkModalSearch("");
                    setHomeworkModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {hwPendingCount > 0
                      ? `Inspect Pending Homework (${hwPendingCount})`
                      : "View Homework Status"}
                  </span>
                </button>
              </div>
            </div>

            {/* 4. Ibadah / Spiritual Tracking Compliance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Ibadah Tracking</h3>
                      <p className="text-xs text-gray-500">Daily prayer & quran records</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {ibComplianceRate}% Recorded
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Classes Logged</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{ibRecordedCount}</p>
                    <p className="text-[10px] text-gray-400">of {ibTotalClasses} classes</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Pending Classes</span>
                    </div>
                    <p className="text-lg font-bold text-rose-600 mt-0.5">{ibPendingCount}</p>
                    <p className="text-[10px] text-gray-400">no entries logged</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ibComplianceRate)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => {
                    setIbadahModalTab(ibPendingCount > 0 ? "PENDING" : "ALL");
                    setIbadahModalSearch("");
                    setIbadahModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition border border-amber-200"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {ibPendingCount > 0
                      ? `Inspect Pending Ibadah (${ibPendingCount})`
                      : "View Ibadah Status"}
                  </span>
                </button>
              </div>
            </div>

            {/* 5. Faculty System Utilization & Diligence */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Faculty Diligence</h3>
                      <p className="text-xs text-gray-500">Teachers active in system</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    {teacherUtilization}% Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Active Faculty</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{teacherActive}</p>
                    <p className="text-[10px] text-gray-400">
                      {teacherCheckedIn > 0 ? `${teacherCheckedIn} checked in` : "logged or worked"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <UserX className="w-3.5 h-3.5" />
                      <span>Inactive</span>
                    </div>
                    <p className="text-lg font-bold text-gray-600 mt-0.5">{teacherInactive}</p>
                    <p className="text-[10px] text-gray-400">of {teacherTotal} faculty</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, teacherUtilization)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => {
                    setFacultyModalTab(teacherInactive > 0 ? "INACTIVE" : "ALL");
                    setFacultyModalSearch("");
                    setFacultyModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition border border-purple-200"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Inspect Faculty Diligence ({teacherActive}/{teacherTotal})</span>
                </button>
              </div>
            </div>

            {/* 6. Quick Action Summary */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-200" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
                    Operations Follow-Up
                  </h3>
                </div>
                <p className="text-xs text-emerald-100">
                  Madrasa operational health based on today's logs and submissions.
                </p>
                <div className="space-y-1.5 pt-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-emerald-500/40">
                    <span>Pending Attendance Classes:</span>
                    <span className="font-bold">{classAttPending}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-emerald-500/40">
                    <span>Classes Without Homework:</span>
                    <span className="font-bold">{hwPendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-emerald-500/40">
                    <span>Inactive Registered Families:</span>
                    <span className="font-bold">{parentInactiveCount}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => openParentInspection("NOT_ACCESSED")}
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 transition text-center shadow-sm"
                >
                  Review Daily Inactivity Roster
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION 2: CLASS-BY-CLASS PARENT ADOPTION PROGRESS BARS         */}
        {/* ============================================================== */}
        {ops?.parents?.classAdoption && ops.parents.classAdoption.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Class-Wise Parent Portal Engagement</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Percentage of enrolled families who accessed the system in each class.
                </p>
              </div>
              <button
                onClick={() => openParentInspection("ALL")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View Full Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ops.parents.classAdoption.map((cls) => (
                <div
                  key={cls.classId}
                  onClick={() => openParentInspection("NOT_ACCESSED", cls.classId)}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition">
                      {cls.className}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full",
                        cls.adoptionRate >= 70
                          ? "bg-emerald-100 text-emerald-800"
                          : cls.adoptionRate >= 40
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      )}
                    >
                      {cls.adoptionRate}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        cls.adoptionRate >= 70
                          ? "bg-emerald-600"
                          : cls.adoptionRate >= 40
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                      style={{ width: `${Math.min(100, cls.adoptionRate)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      <strong className="text-gray-700">{cls.accessedFamilies}</strong> / {cls.totalFamilies} accessed
                    </span>
                    <span className="text-rose-600 font-medium">
                      {cls.notAccessedFamilies} inactive
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: DEMOGRAPHICS & FINANCIAL ANALYTICS                   */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Institutional Demographics & Financial Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Student Demographics */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900">Student Enrollment</h3>
                </div>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                  Total: {students?.total ?? 0}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender Split */}
                <div className="h-44 flex flex-col items-center justify-center">
                  <p className="text-[11px] font-semibold text-gray-500 mb-1">Gender Distribution</p>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={45}
                        innerRadius={25}
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any) => [`${value} students`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500 mt-1">
                    {genderData.map((g) => (
                      <span key={g.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.fill }} />
                        {g.name}: {g.value}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status List */}
                <div className="space-y-2 flex flex-col justify-center">
                  <p className="text-[11px] font-semibold text-gray-500">Status Distribution</p>
                  {students?.byStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                      <span className="flex items-center gap-1.5 font-medium text-gray-700">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#9ca3af" }}
                        />
                        {s.status}
                      </span>
                      <span className="font-bold text-gray-900">{s._count.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fee Collection Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900">Fee Collections</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold">
                    ₹{Number(fees?.totalCollected ?? 0).toLocaleString()} Collected
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl text-center">
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Total Collected</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ₹{Number(fees?.totalCollected ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Total Outstanding</p>
                  <p className="text-lg font-bold text-amber-600">
                    ₹{Number(fees?.totalPending ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ON-DEMAND MODAL 1: PARENT ACCESS ROSTER                         */}
        {/* ============================================================== */}
        <AnimatePresence>
          {parentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Parent Portal Access Roster</h3>
                      <p className="text-xs text-gray-500">
                        Review family engagement, identify inactive parents, and coordinate reminders.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setParentModalOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filters Bar */}
                <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => {
                          setParentModalStatus("NOT_ACCESSED");
                          setParentModalPage(1);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          parentModalStatus === "NOT_ACCESSED"
                            ? "bg-white text-rose-700 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Not Accessed ({parentReport?.summary.notAccessedCount ?? parentInactiveCount})
                      </button>
                      <button
                        onClick={() => {
                          setParentModalStatus("ACCESSED");
                          setParentModalPage(1);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          parentModalStatus === "ACCESSED"
                            ? "bg-white text-emerald-700 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Accessed Today ({parentReport?.summary.accessedCount ?? parentAccessedCount})
                      </button>
                      <button
                        onClick={() => {
                          setParentModalStatus("ALL");
                          setParentModalPage(1);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          parentModalStatus === "ALL"
                            ? "bg-white text-blue-700 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        All Families ({parentReport?.summary.totalFamilies ?? parentTotalCount})
                      </button>
                    </div>

                    {/* Class Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={parentModalClassId}
                        onChange={(e) => {
                          setParentModalClassId(e.target.value);
                          setParentModalPage(1);
                        }}
                        className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ALL">All Classes</option>
                        {(classesList ?? []).map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.division ? `${c.name} - ${c.division}` : c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by student name, guardian name, or admission number..."
                      value={parentModalSearch}
                      onChange={(e) => {
                        setParentModalSearch(e.target.value);
                        setParentModalPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingParentAdoption ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="text-xs">Loading family roster...</p>
                    </div>
                  ) : !parentReport || parentReport.parents.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 space-y-2">
                      <UserCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-gray-700">No families match the filter</p>
                      <p className="text-xs text-gray-400">
                        {parentModalStatus === "NOT_ACCESSED"
                          ? "All families in this selection have accessed the portal today!"
                          : "Try adjusting your search query or class selector."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider bg-gray-50/70">
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Guardian Name</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">Access Status</th>
                            <th className="py-2.5 px-3 text-right">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parentReport.parents.map((fam, idx) => (
                            <tr key={fam.parentPhone || idx} className="hover:bg-gray-50/80 transition">
                              <td className="py-3 px-3">
                                {fam.children.map((c) => (
                                  <div key={c.id} className="font-semibold text-gray-900">
                                    {c.name}{" "}
                                    <span className="text-[10px] text-gray-400 font-normal">
                                      ({c.adno})
                                    </span>
                                  </div>
                                ))}
                              </td>
                              <td className="py-3 px-3 text-gray-700 font-medium">
                                {fam.guardianName || "Guardian"}
                              </td>
                              <td className="py-3 px-3">
                                {fam.children.map((c) => (
                                  <span
                                    key={c.id}
                                    className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium mr-1"
                                  >
                                    {c.className}
                                  </span>
                                ))}
                              </td>
                              <td className="py-3 px-3">
                                {fam.hasAccessed || fam.isLoggedIn ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Active Today</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Not Accessed</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right text-gray-500">
                                {fam.lastAccessAt || fam.lastLoginAt ? (
                                  <div>
                                    <div className="font-medium text-gray-800">
                                      {formatTimeOnly(fam.lastAccessAt || fam.lastLoginAt)}
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                      {fam.lastAction || "Portal Access"}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">No access today</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {parentReport && parentReport.pagination.totalPages > 1 && (
                  <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                    <span>
                      Showing Page {parentReport.pagination.page} of {parentReport.pagination.totalPages} (
                      {parentReport.pagination.total} families)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={parentModalPage <= 1}
                        onClick={() => setParentModalPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={parentModalPage >= parentReport.pagination.totalPages}
                        onClick={() => setParentModalPage((p) => p + 1)}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* ON-DEMAND MODAL 2: CLASS ATTENDANCE SUBMISSIONS                */}
        {/* ============================================================== */}
        <AnimatePresence>
          {attendanceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Class Attendance Submissions</h3>
                      <p className="text-xs text-gray-500">
                        Check which classes have submitted attendance today and contact pending teachers.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAttendanceModalOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setAttendanceModalTab("PENDING")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          attendanceModalTab === "PENDING"
                            ? "bg-white text-amber-800 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Pending ({classAttPending})
                      </button>
                      <button
                        onClick={() => setAttendanceModalTab("SUBMITTED")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          attendanceModalTab === "SUBMITTED"
                            ? "bg-white text-emerald-800 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Submitted ({classAttMarked})
                      </button>
                      <button
                        onClick={() => setAttendanceModalTab("ALL")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          attendanceModalTab === "ALL"
                            ? "bg-white text-gray-900 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        All Classes ({classAttTotal})
                      </button>
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search class or teacher..."
                        value={attendanceModalSearch}
                        onChange={(e) => setAttendanceModalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const marked = ops?.classAttendance?.markedClasses ?? [];
                    const pending = ops?.classAttendance?.pendingClasses ?? [];

                    let list: Array<{
                      id: string;
                      name: string;
                      teacherName: string | null;
                      teacherPhone: string | null;
                      isSubmitted: boolean;
                      recordsCount?: number;
                    }> = [];

                    if (attendanceModalTab === "PENDING") {
                      list = pending.map((p) => ({ ...p, isSubmitted: false }));
                    } else if (attendanceModalTab === "SUBMITTED") {
                      list = marked.map((m) => ({ ...m, isSubmitted: true }));
                    } else {
                      list = [
                        ...pending.map((p) => ({ ...p, isSubmitted: false })),
                        ...marked.map((m) => ({ ...m, isSubmitted: true })),
                      ];
                    }

                    if (attendanceModalSearch.trim()) {
                      const q = attendanceModalSearch.toLowerCase();
                      list = list.filter(
                        (item) =>
                          item.name.toLowerCase().includes(q) ||
                          item.teacherName?.toLowerCase().includes(q)
                      );
                    }

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center text-gray-500 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                          <p className="text-sm font-semibold text-gray-700">
                            {attendanceModalTab === "PENDING"
                              ? "All classes have submitted attendance today!"
                              : "No classes match your filter."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-gray-100">
                        {list.map((c) => (
                          <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">{c.name}</h4>
                              <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <span>Teacher: {c.teacherName || "Unassigned"}</span>
                                {c.teacherPhone && (
                                  <span className="text-gray-400">({c.teacherPhone})</span>
                                )}
                              </p>
                            </div>
                            <div>
                              {c.isSubmitted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Submitted {c.recordsCount ? `(${c.recordsCount})` : ""}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* ON-DEMAND MODAL 3: HOMEWORK COMPLIANCE                         */}
        {/* ============================================================== */}
        <AnimatePresence>
          {homeworkModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Homework Compliance</h3>
                      <p className="text-xs text-gray-500">
                        Review daily homework postings by class and identify pending curriculum assignments.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setHomeworkModalOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setHomeworkModalTab("PENDING")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          homeworkModalTab === "PENDING"
                            ? "bg-white text-amber-800 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        No Homework ({hwPendingCount})
                      </button>
                      <button
                        onClick={() => setHomeworkModalTab("ASSIGNED")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          homeworkModalTab === "ASSIGNED"
                            ? "bg-white text-indigo-800 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Assigned ({hwAssignedCount})
                      </button>
                      <button
                        onClick={() => setHomeworkModalTab("ALL")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          homeworkModalTab === "ALL"
                            ? "bg-white text-gray-900 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        All Classes ({hwTotalClasses})
                      </button>
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search class or teacher..."
                        value={homeworkModalSearch}
                        onChange={(e) => setHomeworkModalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const assigned = ops?.homeworkCompliance?.assignedClasses ?? [];
                    const pending = ops?.homeworkCompliance?.pendingClasses ?? [];

                    let list: Array<{
                      id: string;
                      name: string;
                      teacherName: string | null;
                      teacherPhone: string | null;
                      isAssigned: boolean;
                      titles?: string[];
                      assignmentsCount?: number;
                    }> = [];

                    if (homeworkModalTab === "PENDING") {
                      list = pending.map((p) => ({ ...p, isAssigned: false }));
                    } else if (homeworkModalTab === "ASSIGNED") {
                      list = assigned.map((a) => ({ ...a, isAssigned: true }));
                    } else {
                      list = [
                        ...pending.map((p) => ({ ...p, isAssigned: false })),
                        ...assigned.map((a) => ({ ...a, isAssigned: true })),
                      ];
                    }

                    if (homeworkModalSearch.trim()) {
                      const q = homeworkModalSearch.toLowerCase();
                      list = list.filter(
                        (item) =>
                          item.name.toLowerCase().includes(q) ||
                          item.teacherName?.toLowerCase().includes(q)
                      );
                    }

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center text-gray-500 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-indigo-500 mx-auto" />
                          <p className="text-sm font-semibold text-gray-700">
                            {homeworkModalTab === "PENDING"
                              ? "All classes have homework assignments posted!"
                              : "No classes match your filter."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-gray-100">
                        {list.map((c) => (
                          <div key={c.id} className="py-3 flex items-start justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">{c.name}</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Teacher: {c.teacherName || "Unassigned"}
                              </p>
                              {c.titles && c.titles.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {c.titles.map((t, i) => (
                                    <span
                                      key={i}
                                      className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              {c.isAssigned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{c.assignmentsCount} Assigned</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>No Homework</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* ON-DEMAND MODAL 4: IBADAH TRACKING                             */}
        {/* ============================================================== */}
        <AnimatePresence>
          {ibadahModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Ibadah Tracking Compliance</h3>
                      <p className="text-xs text-gray-500">
                        Monitor daily spiritual logs (prayers, quran pages) by class and designated teachers.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIbadahModalOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setIbadahModalTab("PENDING")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          ibadahModalTab === "PENDING"
                            ? "bg-white text-rose-800 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Pending ({ibPendingCount})
                      </button>
                      <button
                        onClick={() => setIbadahModalTab("RECORDED")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          ibadahModalTab === "RECORDED"
                            ? "bg-white text-amber-800 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Recorded ({ibRecordedCount})
                      </button>
                      <button
                        onClick={() => setIbadahModalTab("ALL")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          ibadahModalTab === "ALL"
                            ? "bg-white text-gray-900 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        All Classes ({ibTotalClasses})
                      </button>
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search class or teacher..."
                        value={ibadahModalSearch}
                        onChange={(e) => setIbadahModalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const recorded = ops?.ibadahCompliance?.recordedClasses ?? [];
                    const pending = ops?.ibadahCompliance?.pendingClasses ?? [];

                    let list: Array<{
                      id: string;
                      name: string;
                      teacherName: string | null;
                      teacherPhone: string | null;
                      isRecorded: boolean;
                      logsCount?: number;
                    }> = [];

                    if (ibadahModalTab === "PENDING") {
                      list = pending.map((p) => ({ ...p, isRecorded: false }));
                    } else if (ibadahModalTab === "RECORDED") {
                      list = recorded.map((r) => ({ ...r, isRecorded: true }));
                    } else {
                      list = [
                        ...pending.map((p) => ({ ...p, isRecorded: false })),
                        ...recorded.map((r) => ({ ...r, isRecorded: true })),
                      ];
                    }

                    if (ibadahModalSearch.trim()) {
                      const q = ibadahModalSearch.toLowerCase();
                      list = list.filter(
                        (item) =>
                          item.name.toLowerCase().includes(q) ||
                          item.teacherName?.toLowerCase().includes(q)
                      );
                    }

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center text-gray-500 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="text-sm font-semibold text-gray-700">
                            {ibadahModalTab === "PENDING"
                              ? "All classes have spiritual tracking recorded today!"
                              : "No classes match your filter."}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-gray-100">
                        {list.map((c) => (
                          <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">{c.name}</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Teacher: {c.teacherName || "Unassigned"}
                              </p>
                            </div>
                            <div>
                              {c.isRecorded ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{c.logsCount} Logs Recorded</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* ON-DEMAND MODAL 5: FACULTY DILIGENCE & UTILIZATION             */}
        {/* ============================================================== */}
        <AnimatePresence>
          {facultyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Faculty Diligence & Utilization</h3>
                      <p className="text-xs text-gray-500">
                        Monitor teacher check-ins, attendance submissions, homework postings, and active time.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFacultyModalOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setFacultyModalTab("INACTIVE")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          facultyModalTab === "INACTIVE"
                            ? "bg-white text-gray-900 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Inactive ({teacherInactive})
                      </button>
                      <button
                        onClick={() => setFacultyModalTab("ACTIVE")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          facultyModalTab === "ACTIVE"
                            ? "bg-white text-purple-700 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        Active ({teacherActive})
                      </button>
                      <button
                        onClick={() => setFacultyModalTab("ALL")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg transition",
                          facultyModalTab === "ALL"
                            ? "bg-white text-blue-700 shadow-sm font-bold"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        All Faculty ({teacherTotal})
                      </button>
                    </div>

                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search faculty by name..."
                        value={facultyModalSearch}
                        onChange={(e) => setFacultyModalSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const list = ops?.teachers?.teacherList ?? [];
                    let filtered = list;

                    if (facultyModalTab === "INACTIVE") {
                      filtered = filtered.filter((t) => !t.isActive);
                    } else if (facultyModalTab === "ACTIVE") {
                      filtered = filtered.filter((t) => t.isActive);
                    }

                    if (facultyModalSearch.trim()) {
                      const q = facultyModalSearch.toLowerCase();
                      filtered = filtered.filter((t) => t.teacherName.toLowerCase().includes(q));
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 text-center text-gray-500 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-purple-500 mx-auto" />
                          <p className="text-sm font-semibold text-gray-700">No faculty members found</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider bg-gray-50/70">
                              <th className="py-2.5 px-3">Faculty Name</th>
                              <th className="py-2.5 px-3">Assigned Class</th>
                              <th className="py-2.5 px-3">Session Check-In</th>
                              <th className="py-2.5 px-3">Attendance Marked</th>
                              <th className="py-2.5 px-3">Homework</th>
                              <th className="py-2.5 px-3">Ibadah Logs</th>
                              <th className="py-2.5 px-3 text-right">Last Active</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filtered.map((t) => (
                              <tr key={t.teacherId} className="hover:bg-gray-50/80 transition">
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-gray-900">{t.teacherName}</div>
                                  {t.phone && <div className="text-[10px] text-gray-400">{t.phone}</div>}
                                </td>
                                <td className="py-3 px-3 text-gray-700">
                                  {t.assignedClasses && t.assignedClasses.length > 0 ? (
                                    t.assignedClasses.map((cls, i) => (
                                      <span
                                        key={i}
                                        className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium mr-1"
                                      >
                                        {cls}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 italic">Subject Teacher</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {t.checkedIn ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Checked In ({formatTimeOnly(t.checkInTime)})</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-[11px]">Not Checked In</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {t.attendanceMarked ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Submitted</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                      <span>Pending</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-semibold text-gray-900">
                                  {t.homeworkCount > 0 ? (
                                    <span className="text-indigo-700 font-bold">{t.homeworkCount} assigned</span>
                                  ) : (
                                    <span className="text-gray-400 font-normal">0</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-semibold text-gray-900">
                                  {t.ibadahCount > 0 ? (
                                    <span className="text-amber-700 font-bold">{t.ibadahCount}</span>
                                  ) : (
                                    <span className="text-gray-400 font-normal">0</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right text-gray-500">
                                  {t.lastActiveAt ? (
                                    <span className="text-gray-700 font-medium">{formatTimeOnly(t.lastActiveAt)}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">No activity</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
