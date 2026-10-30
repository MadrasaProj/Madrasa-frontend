import { useState, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeFilter, computePresetRange, type DatePreset } from "@/components/ui/DateRangeFilter";
import { useAuthStore } from "@/store/auth";
import {
  useStudentStats,
  useFeeSummary,
  useAttendanceSummary,
  useHomeworkSummary,
  useOperationalActivity,
  useParentAdoption,
  useClasses,
  useClientConfig,
} from "@/lib/queries";
import type { ParentAdoptionItem } from "@/lib/reports-api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  GraduationCap,
  CalendarCheck,
  Award,
  Download,
  Layers,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Printer,
  Share2,
  Copy,
  Check,
  FileText,
  Image,
  ExternalLink,
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

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string, successLabel: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast.success(successLabel);
  } catch {
    toast.error("Failed to copy text. Please copy manually.");
  }
}

function openWhatsApp(text: string) {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function formatWhatsAppClassMessage({
  className,
  students,
  families,
  dateStr,
  status,
  madrasaName,
}: {
  className: string;
  students?: any[];
  families?: any[];
  dateStr: string;
  status: "NOT_ACCESSED" | "ACCESSED" | "ALL";
  madrasaName?: string;
}): string {
  const list = students ?? families ?? [];
  const inactiveStudents = list.filter((s) => !s.hasAccessed && !s.isLoggedIn);
  const activeStudents = list.filter((s) => s.hasAccessed || s.isLoggedIn);
  const targetList =
    status === "NOT_ACCESSED" ? inactiveStudents : status === "ACCESSED" ? activeStudents : list;

  const title =
    status === "NOT_ACCESSED"
      ? `*${className} - Pending Portal Access*`
      : status === "ACCESSED"
      ? `*${className} - Active Portal Students*`
      : `*${className} - Student Portal Roster*`;

  const lines: string[] = [];
  lines.push(title);
  if (madrasaName) lines.push(madrasaName);
  if (dateStr) lines.push(`Date: ${dateStr}`);
  lines.push("");

  if (targetList.length === 0) {
    lines.push(status === "NOT_ACCESSED" ? "All students active." : "No records found.");
  } else {
    targetList.forEach((s, idx) => {
      const name = s.studentName || s.name || s.children?.[0]?.name || "Student";
      const adno = s.adno || s.children?.[0]?.adno || "";
      const adnoStr = adno ? ` (${adno})` : "";
      lines.push(`${idx + 1}. ${name}${adnoStr}`);
    });
  }

  return lines.join("\n");
}

function formatWhatsAppGlobalMessage({
  groups,
  dateStr,
  status,
  madrasaName,
  summary,
}: {
  groups: Array<{ className: string; students?: any[]; families?: any[] }>;
  dateStr: string;
  status: "NOT_ACCESSED" | "ACCESSED" | "ALL";
  madrasaName?: string;
  summary?: { total: number; accessed: number; notAccessed: number; rate: number };
}): string {
  const lines: string[] = [];
  const statusLabel =
    status === "NOT_ACCESSED"
      ? "Pending Portal Access List"
      : status === "ACCESSED"
      ? "Active Students List"
      : "Student Portal Roster";

  lines.push(`*Madrasa Portal - ${statusLabel}*`);
  if (madrasaName) lines.push(madrasaName);
  if (dateStr) lines.push(`Date: ${dateStr}`);
  if (summary) {
    if (status === "NOT_ACCESSED") {
      lines.push(`Total Inactive: ${summary.notAccessed} Students`);
    } else {
      lines.push(`Total: ${summary.total} | Active: ${summary.accessed} | Inactive: ${summary.notAccessed}`);
    }
  }
  lines.push("");

  groups.forEach((g) => {
    const list = g.students ?? g.families ?? [];
    const inactive = list.filter((s) => !s.hasAccessed && !s.isLoggedIn);
    const active = list.filter((s) => s.hasAccessed || s.isLoggedIn);
    const target = status === "NOT_ACCESSED" ? inactive : status === "ACCESSED" ? active : list;
    if (target.length === 0) return;

    lines.push(`*${g.className} (${target.length})*`);
    target.forEach((s, idx) => {
      const name = s.studentName || s.name || s.children?.[0]?.name || "Student";
      const adno = s.adno || s.children?.[0]?.adno || "";
      const adnoStr = adno ? ` (${adno})` : "";
      lines.push(`${idx + 1}. ${name}${adnoStr}`);
    });
    lines.push("");
  });

  return lines.join("\n").trim();
}

function formatWhatsAppAttendanceReminder({
  pendingClasses,
  dateStr,
  madrasaName,
}: {
  pendingClasses: Array<{ name: string; teacherName: string | null; teacherPhone: string | null }>;
  dateStr: string;
  madrasaName?: string;
}): string {
  const lines: string[] = [];
  lines.push("*Attendance Pending Notice*");
  if (madrasaName) lines.push(madrasaName);
  if (dateStr) lines.push(`Date: ${dateStr}`);
  lines.push("");
  pendingClasses.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p.name}: ${p.teacherName || "Unassigned"}`);
  });
  return lines.join("\n");
}

function formatWhatsAppHomeworkReminder({
  pendingClasses,
  dateStr,
  madrasaName,
}: {
  pendingClasses: Array<{ name: string; teacherName: string | null; teacherPhone: string | null }>;
  dateStr: string;
  madrasaName?: string;
}): string {
  const lines: string[] = [];
  lines.push("*Homework Pending Notice*");
  if (madrasaName) lines.push(madrasaName);
  if (dateStr) lines.push(`Date: ${dateStr}`);
  lines.push("");
  pendingClasses.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p.name}: ${p.teacherName || "Unassigned"}`);
  });
  return lines.join("\n");
}

function formatWhatsAppIbadahReminder({
  pendingClasses,
  dateStr,
  madrasaName,
}: {
  pendingClasses: Array<{ name: string; teacherName: string | null; teacherPhone: string | null }>;
  dateStr: string;
  madrasaName?: string;
}): string {
  const lines: string[] = [];
  lines.push("*Ibadah Tracking Pending Notice*");
  if (madrasaName) lines.push(madrasaName);
  if (dateStr) lines.push(`Date: ${dateStr}`);
  lines.push("");
  pendingClasses.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p.name}: ${p.teacherName || "Unassigned"}`);
  });
  return lines.join("\n");
}

function printClassWiseParentReport({
  groups,
  dateStr,
  status,
  madrasaName,
  summary,
  targetClassName,
}: {
  groups: Array<{ className: string; students?: any[]; families?: any[] }>;
  dateStr: string;
  status: "NOT_ACCESSED" | "ACCESSED" | "ALL";
  madrasaName?: string;
  summary?: { total: number; accessed: number; notAccessed: number; rate: number };
  targetClassName?: string;
}) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Please allow popups to open print preview.");
    return;
  }

  const filteredGroups = targetClassName
    ? groups.filter((g) => g.className === targetClassName)
    : groups;

  let totalStudents = 0;
  let totalActive = 0;
  let totalInactive = 0;

  filteredGroups.forEach((g: any) => {
    const list = g.students ?? g.families ?? [];
    const classTotal = (g.totalStudents && g.totalStudents > 0) ? g.totalStudents : list.length;
    const classActive = typeof g.activeStudents === "number" ? g.activeStudents : list.filter((s: any) => s.hasAccessed || s.isLoggedIn).length;
    const classInactive = typeof g.inactiveStudents === "number" ? g.inactiveStudents : Math.max(0, classTotal - classActive);
    totalStudents += classTotal;
    totalActive += classActive;
    totalInactive += classInactive;
  });

  const finalSummary = summary || {
    total: totalStudents,
    accessed: totalActive,
    notAccessed: totalInactive,
    rate: totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0,
  };

  const statusLabel =
    status === "NOT_ACCESSED"
      ? "INACTIVE STUDENTS LIST"
      : status === "ACCESSED"
      ? "ACTIVE STUDENTS LIST"
      : "STUDENT PORTAL ACCESS LIST";

  const rowsHtml = filteredGroups
    .map((g) => {
      const list = g.students ?? g.families ?? [];
      const classTotal = ((g as any).totalStudents && (g as any).totalStudents > 0) ? (g as any).totalStudents : list.length;
      const active = typeof (g as any).activeStudents === "number" ? (g as any).activeStudents : list.filter((s: any) => s.hasAccessed || s.isLoggedIn).length;
      const inactive = typeof (g as any).inactiveStudents === "number" ? (g as any).inactiveStudents : Math.max(0, classTotal - active);
      const targetList =
        status === "NOT_ACCESSED"
          ? list.filter((s: any) => !s.hasAccessed && !s.isLoggedIn)
          : status === "ACCESSED"
          ? list.filter((s: any) => s.hasAccessed || s.isLoggedIn)
          : list;

      if (targetList.length === 0) return "";

      const studentRows = targetList
        .map((s: any, fIdx: number) => {
          const adno = s.adno || s.children?.[0]?.adno || "—";
          const studentName = s.studentName || s.name || s.children?.[0]?.name || "Student";
          const statusText = s.hasAccessed || s.isLoggedIn ? "Active" : "Not Accessed";
          const lastTime =
            s.lastAccessAt || s.lastLoginAt
              ? formatTimeOnly(s.lastAccessAt || s.lastLoginAt)
              : "—";

          return `
            <tr>
              <td style="text-align: center;">${fIdx + 1}</td>
              <td style="text-align: center; font-family: monospace;">${adno}</td>
              <td style="font-weight: 600;">${studentName}</td>
              <td style="text-align: center;">${statusText}</td>
              <td style="text-align: right;">${lastTime}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="class-block">
          <div class="class-title">${g.className} (Total: ${classTotal} | Active: ${active} | Inactive: ${inactive})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;">#</th>
                <th style="width: 80px; text-align: center;">Adm No</th>
                <th>Student Name</th>
                <th style="width: 90px; text-align: center;">Status</th>
                <th style="width: 90px; text-align: right;">Last Active</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${madrasaName || "Madrasa"} - ${statusLabel} - ${dateStr || "Today"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 25px 30px; position: relative; }
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1.5px solid #111; }
    .header-main { text-align: left; }
    .institution-name { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #000; line-height: 1.2; margin-bottom: 3px; }
    .report-title { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 3px; }
    .report-meta { font-size: 9.5px; color: #4b5563; font-weight: 500; }
    .platform-branding { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; text-align: right; white-space: nowrap; padding-top: 2px; }
    .class-block { margin-bottom: 16px; page-break-inside: avoid; }
    .class-title { font-size: 11px; font-weight: 700; margin-bottom: 4px; padding: 3px 0; border-bottom: 1px solid #333; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th, td { border: 1px solid #4b5563; padding: 4px 6px; font-size: 10px; text-align: left; }
    th { background: #f3f4f6; font-weight: 700; font-size: 9px; text-transform: uppercase; color: #1f2937; letter-spacing: 0.3px; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 9px; color: #6b7280; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-size: 8px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { padding: 0; }
      .class-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="header-main">
      <h1 class="institution-name">${madrasaName || "Madrasa"}</h1>
      <h2 class="report-title">${statusLabel}${targetClassName ? ` • ${targetClassName}` : ""}</h2>
      <p class="report-meta">Date: ${dateStr || "Today"} | Total Students: ${finalSummary.total} | Active: ${finalSummary.accessed} | Not Accessed: ${finalSummary.notAccessed} (${finalSummary.rate}% Active)</p>
    </div>
    <div class="platform-branding">
      Powered by Smart Madrasa
    </div>
  </div>

  ${rowsHtml || '<p style="text-align: center; padding: 20px; color: #6b7280;">No students match the selected filter.</p>'}

  <div class="footer">
    <span>Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    <span class="footer-brand">Smart Madrasa System</span>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

export default function AdminReportsPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const cid = activeClientId ?? "";
  const token = accessToken ?? "";
  const ayId = user?.defaultAcademicYearId ?? "";

  const { data: clientConfig } = useClientConfig({ clientId: cid, token });

  const [dateRange, setDateRange] = useState<{ from: string; to: string; preset: DatePreset }>(() => {
    const range = computePresetRange("TODAY");
    return { ...range, preset: "TODAY" };
  });

  // Modal States for On-Demand Detail Inspection (Lazy Loaded)
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [parentModalStatus, setParentModalStatus] = useState<"ALL" | "ACCESSED" | "NOT_ACCESSED">("NOT_ACCESSED");
  const [parentModalClassId, setParentModalClassId] = useState<string>("ALL");
  const [parentModalSearch, setParentModalSearch] = useState<string>("");
  const [parentModalPage, setParentModalPage] = useState<number>(1);
  const [parentViewMode, setParentViewMode] = useState<"CLASS_WISE" | "FLAT">("CLASS_WISE");
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});
  const [showClassBreakdown, setShowClassBreakdown] = useState(false);
  const PARENT_MODAL_PAGE_SIZE = 500;

  // Non-technical sharing and export states
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappTargetClass, setWhatsappTargetClass] = useState<string>("ALL");
  const [whatsappFilterStatus, setWhatsappFilterStatus] = useState<"NOT_ACCESSED" | "ACCESSED" | "ALL">("NOT_ACCESSED");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

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

  const dateParams = useMemo(() => {
    if (dateRange.preset === "ALL" || dateRange.from === "ALL") {
      return { from: "ALL", to: "ALL" };
    }
    if (dateRange.from || dateRange.to) {
      return { from: dateRange.from || undefined, to: dateRange.to || undefined };
    }
    return undefined;
  }, [dateRange]);

  const displayDateStr = useMemo(() => {
    if (dateRange.preset === "ALL" || dateRange.from === "ALL") return "All Time";
    if (dateRange.from && dateRange.to) {
      return dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} to ${dateRange.to}`;
    }
    return dateRange.from || "Today";
  }, [dateRange]);

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

  // 2. High-Performance Operational Pulse
  const {
    data: operationalData,
  } = useOperationalActivity({ clientId: cid, token }, dateParams);

  // 3. Classes List for Dropdown: Fetched ON-DEMAND only when parent modal is open
  const { data: classesList } = useClasses(
    { clientId: cid, token },
    undefined,
    { enabled: Boolean(cid && token && parentModalOpen) }
  );

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

  const displayMadrasaName =
    clientConfig?.name ||
    ops?.madrasaName ||
    ops?.client?.name ||
    parentReport?.madrasaName ||
    parentReport?.client?.name ||
    user?.madrasaName ||
    (user?.tenantSlug ? `${user.tenantSlug.toUpperCase()} Madrasa` : "Madrasa");

  const madrasaFileSlug = (
    clientConfig?.slug ||
    ops?.client?.slug ||
    displayMadrasaName
  )
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");

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

  const openParentInspection = (status: "NOT_ACCESSED" | "ACCESSED" | "ALL", classId = "ALL") => {
    setParentModalStatus(status);
    setParentModalClassId(classId);
    setParentModalSearch("");
    setParentModalPage(1);
    setParentModalOpen(true);
  };

  const toggleClassCollapse = (clsName: string) => {
    setCollapsedClasses((prev) => ({ ...prev, [clsName]: !prev[clsName] }));
  };

  // Map authoritative class adoption numbers for guaranteed count consistency across views
  const classBreakdownMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of parentReport?.classBreakdown ?? []) {
      map.set(item.className, item);
      if (item.classId) map.set(item.classId, item);
    }
    for (const item of ops?.parents?.classAdoption ?? []) {
      if (!map.has(item.className)) map.set(item.className, item);
      if (item.classId && !map.has(item.classId)) map.set(item.classId, item);
    }
    return map;
  }, [parentReport?.classBreakdown, ops?.parents?.classAdoption]);

  // Group students smartly by class (each student counted separately)
  const classGroupedFamilies = useMemo(() => {
    if (!parentReport?.parents) return [];
    const map = new Map<
      string,
      {
        className: string;
        classId?: string;
        totalStudents: number;
        activeStudents: number;
        inactiveStudents: number;
        families: ParentAdoptionItem[];
        students: ParentAdoptionItem[];
      }
    >();

    for (const student of parentReport.parents) {
      const clsName =
        student.children?.[0]?.className || (student as any).className || "Unassigned";
      const clsId = student.children?.[0]?.classId || (student as any).classId || undefined;

      let existing = map.get(clsName);
      if (!existing) {
        const meta = classBreakdownMap.get(clsName) || (clsId ? classBreakdownMap.get(clsId) : undefined);
        const total = meta?.totalStudents ?? meta?.totalParents ?? meta?.totalFamilies ?? 0;
        const active = meta?.accessedStudents ?? meta?.accessedParents ?? meta?.accessedFamilies ?? 0;
        const inactive = meta?.notAccessedStudents ?? meta?.notAccessedParents ?? meta?.notAccessedFamilies ?? Math.max(0, total - active);

        existing = {
          className: clsName,
          classId: clsId,
          totalStudents: total,
          activeStudents: active,
          inactiveStudents: inactive,
          families: [],
          students: [],
        };
        map.set(clsName, existing);
      }
      existing.families.push(student);
      existing.students.push(student);
    }

    // Sort students in each class naturally by admission number and name
    for (const group of map.values()) {
      group.families.sort((a: any, b: any) => {
        if (a.hasAccessed !== b.hasAccessed) {
          return a.hasAccessed ? 1 : -1;
        }
        const aAdno = a.adno || a.children?.[0]?.adno || "";
        const bAdno = b.adno || b.children?.[0]?.adno || "";
        const aName = a.studentName || a.name || a.children?.[0]?.name || "";
        const bName = b.studentName || b.name || b.children?.[0]?.name || "";
        return (
          aAdno.localeCompare(bAdno, undefined, { numeric: true, sensitivity: "base" }) ||
          aName.localeCompare(bName, undefined, { sensitivity: "base" })
        );
      });
      group.students = group.families;
    }

    return Array.from(map.values()).sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [parentReport?.parents, classBreakdownMap]);

  // Clean, minimal CSV Export Handlers
  const handleDownloadParentCsv = (classIdFilter?: string, targetClassName?: string) => {
    if (!parentReport?.parents) return;
    const filteredStudents = classIdFilter
      ? parentReport.parents.filter(
          (s: any) =>
            s.classId === classIdFilter ||
            s.className === targetClassName ||
            s.children?.some((c: any) => c.classId === classIdFilter || c.className === targetClassName)
        )
      : parentReport.parents;

    const headers = [
      "Class",
      "Admission No",
      "Student Name",
      "Guardian Name",
      "Contact Phone",
      "Status",
      "Last Active Time",
    ];

    const rows = filteredStudents.map((s: any) => {
      const clsName = s.className || s.children?.[0]?.className || "Unassigned";
      const adno = s.adno || s.children?.[0]?.adno || "—";
      const name = s.studentName || s.name || s.children?.[0]?.name || "Student";
      const guardian = s.guardianName || "Guardian";
      const phone = s.parentPhone || "N/A";
      const status = s.hasAccessed || s.isLoggedIn ? "Active Today" : "Not Accessed";
      const lastTime =
        s.lastAccessAt || s.lastLoginAt
          ? formatTimeOnly(s.lastAccessAt || s.lastLoginAt)
          : "No access today";

      return [clsName, adno, name, guardian, phone, status, lastTime];
    });

    const dateSuffix = dateRange.from ? `-${dateRange.from}` : "";
    const statusSuffix =
      parentModalStatus === "NOT_ACCESSED"
        ? "-inactive"
        : parentModalStatus === "ACCESSED"
        ? "-active"
        : "";
    const classSuffix = targetClassName ? `-${targetClassName.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
    downloadCsv(`${madrasaFileSlug}-student-access${statusSuffix}${classSuffix}${dateSuffix}.csv`, headers, rows);
  };

  const handleDownloadAttendanceCsv = () => {
    const marked = ops?.classAttendance?.markedClasses ?? [];
    const pending = ops?.classAttendance?.pendingClasses ?? [];

    const headers = ["Class", "Class Teacher", "Teacher Phone", "Attendance Status", "Records Count"];
    const rows = [
      ...pending.map((p) => [p.name, p.teacherName || "Unassigned", p.teacherPhone || "N/A", "Pending", 0]),
      ...marked.map((m) => [m.name, m.teacherName || "Unassigned", m.teacherPhone || "N/A", "Submitted", m.recordsCount || 0]),
    ];

    const dateSuffix = dateRange.from ? `-${dateRange.from}` : "";
    downloadCsv(`${madrasaFileSlug}-class-attendance${dateSuffix}.csv`, headers, rows);
  };

  const handleDownloadHomeworkCsv = () => {
    const assigned = ops?.homeworkCompliance?.assignedClasses ?? [];
    const pending = ops?.homeworkCompliance?.pendingClasses ?? [];

    const headers = ["Class", "Class Teacher", "Homework Status", "Assignments Count", "Recent Topics"];
    const rows = [
      ...pending.map((p) => [p.name, p.teacherName || "Unassigned", "No Homework", 0, "None"]),
      ...assigned.map((a) => [a.name, a.teacherName || "Unassigned", "Assigned", a.assignmentsCount, (a.titles || []).join(" | ")]),
    ];

    const dateSuffix = dateRange.from ? `-${dateRange.from}` : "";
    downloadCsv(`${madrasaFileSlug}-homework-compliance${dateSuffix}.csv`, headers, rows);
  };

  const handleDownloadIbadahCsv = () => {
    const recorded = ops?.ibadahCompliance?.recordedClasses ?? [];
    const pending = ops?.ibadahCompliance?.pendingClasses ?? [];

    const headers = ["Class", "Class Teacher", "Ibadah Status", "Logged Entries Count"];
    const rows = [
      ...pending.map((p) => [p.name, p.teacherName || "Unassigned", "Pending", 0]),
      ...recorded.map((r) => [r.name, r.teacherName || "Unassigned", "Recorded", r.logsCount || 0]),
    ];

    const dateSuffix = dateRange.from ? `-${dateRange.from}` : "";
    downloadCsv(`${madrasaFileSlug}-ibadah-compliance${dateSuffix}.csv`, headers, rows);
  };

  const handleDownloadFacultyCsv = () => {
    const teachers = ops?.teachers?.teacherList ?? [];
    const headers = [
      "Faculty Name",
      "Phone",
      "Assigned Classes",
      "Session Check-In",
      "Attendance Marked",
      "Homework Assigned",
      "Ibadah Logs",
      "Last Active Time",
    ];
    const rows = teachers.map((t) => [
      t.teacherName,
      t.phone || "N/A",
      (t.assignedClasses || []).join(" / ") || "Subject Teacher",
      t.checkedIn ? `Checked In (${formatTimeOnly(t.checkInTime)})` : "Not Checked In",
      t.attendanceMarked ? "Submitted" : "Pending",
      t.homeworkCount,
      t.ibadahCount,
      t.lastActiveAt ? formatTimeOnly(t.lastActiveAt) : "No activity",
    ]);

    const dateSuffix = dateRange.from ? `-${dateRange.from}` : "";
    downloadCsv(`${madrasaFileSlug}-faculty-diligence${dateSuffix}.csv`, headers, rows);
  };

  const handleDownloadClassAdoptionSummaryCsv = () => {
    const classData = ops?.parents?.classAdoption ?? [];
    const headers = ["Class", "Total Students", "Active Today", "Not Accessed", "Adoption Rate (%)"];
    const rows = classData.map((cls) => [
      cls.className,
      cls.totalFamilies,
      cls.accessedFamilies,
      cls.notAccessedFamilies,
      `${cls.adoptionRate}%`,
    ]);

    const dateSuffix = dateRange.from ? `-${dateRange.from}` : "";
    downloadCsv(`${madrasaFileSlug}-class-adoption-summary${dateSuffix}.csv`, headers, rows);
  };

  const handleDownloadReportImage = async (containerId: string, filename: string) => {
    const el = document.getElementById(containerId);
    if (!el) {
      toast.error("Report content not found");
      return;
    }
    setIsExportingImage(true);
    toast.info("Generating report image snapshot...");
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const target = clonedDoc.getElementById(containerId);
          if (target) {
            target.style.maxHeight = "none";
            target.style.height = "auto";
            target.style.overflow = "visible";
            const scrollables = target.querySelectorAll(".overflow-y-auto, .overflow-x-auto, .overflow-hidden");
            scrollables.forEach((s: any) => {
              s.style.overflow = "visible";
              s.style.maxHeight = "none";
            });
          }
        },
      });
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png", 0.95)
      );
      if (!blob) throw new Error("Could not create image blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Report snapshot saved as PNG!");
    } catch (err: any) {
      toast.error("Failed to generate image: " + (err?.message || "Unknown error"));
    } finally {
      setIsExportingImage(false);
    }
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
          initialPreset="TODAY"
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
        {/* SECTION 1: EXECUTIVE OPERATIONS MATRIX                         */}
        {/* ============================================================== */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Executive Operations Matrix
                </h2>
                <p className="text-xs text-gray-500">
                  {displayDateStr} • Real-time operational compliance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => openParentInspection("NOT_ACCESSED")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Inactive Roster ({parentInactiveCount})</span>
              </button>
            </div>
          </div>

          {/* 4 Clean Executive Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Student Portal Access */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-blue-200 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Portal Access</span>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {parentAdoptionPct}%
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900 tracking-tight">{parentAccessedCount}</span>
                    <span className="text-xs text-gray-500">/ {parentTotalCount} active</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, parentAdoptionPct)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  <strong className="text-rose-600 font-bold">{parentInactiveCount}</strong> pending
                </span>
                <button
                  onClick={() => openParentInspection("NOT_ACCESSED")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
                >
                  <span>Inspect</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Class Attendance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-emerald-200 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Attendance</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {classAttRate}%
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900 tracking-tight">{classAttMarked}</span>
                    <span className="text-xs text-gray-500">/ {classAttTotal} classes</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, classAttRate)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  <strong className="text-amber-600 font-bold">{classAttPending}</strong> pending
                </span>
                <button
                  onClick={() => {
                    setAttendanceModalTab(classAttPending > 0 ? "PENDING" : "ALL");
                    setAttendanceModalSearch("");
                    setAttendanceModalOpen(true);
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-0.5"
                >
                  <span>Review</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Homework Compliance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-indigo-200 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Homework</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {hwComplianceRate}%
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900 tracking-tight">{hwAssignedCount}</span>
                    <span className="text-xs text-gray-500">/ {hwTotalClasses} classes</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, hwComplianceRate)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  <strong className="text-amber-600 font-bold">{hwPendingCount}</strong> pending
                </span>
                <button
                  onClick={() => {
                    setHomeworkModalTab(hwPendingCount > 0 ? "PENDING" : "ALL");
                    setHomeworkModalSearch("");
                    setHomeworkModalOpen(true);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                >
                  <span>Review</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4. Ibadah Tracking */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-amber-200 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Ibadah</span>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    {ibComplianceRate}%
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900 tracking-tight">{ibRecordedCount}</span>
                    <span className="text-xs text-gray-500">/ {ibTotalClasses} classes</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ibComplianceRate)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  <strong className="text-rose-600 font-bold">{ibPendingCount}</strong> pending
                </span>
                <button
                  onClick={() => {
                    setIbadahModalTab(ibPendingCount > 0 ? "PENDING" : "ALL");
                    setIbadahModalSearch("");
                    setIbadahModalOpen(true);
                  }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-0.5"
                >
                  <span>Review</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Executive Ribbon: Faculty Diligence & Class Breakdown Drawer Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs gap-2">
            <div className="flex items-center gap-2 flex-wrap text-gray-600">
              <div className="flex items-center gap-1.5 font-medium">
                <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                <span>Faculty Diligence:</span>
                <strong className="text-gray-900">{teacherActive} of {teacherTotal}</strong>
                <span>active ({teacherUtilization}%)</span>
              </div>
              <button
                onClick={() => {
                  setFacultyModalTab(teacherInactive > 0 ? "INACTIVE" : "ALL");
                  setFacultyModalSearch("");
                  setFacultyModalOpen(true);
                }}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 underline underline-offset-2 ml-1"
              >
                Review Faculty
              </button>
            </div>

            {ops?.parents?.classAdoption && ops.parents.classAdoption.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleDownloadClassAdoptionSummaryCsv}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition shadow-xs"
                  title="Download Class Adoption Summary CSV"
                >
                  <Download className="w-3 h-3 text-gray-500" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => setShowClassBreakdown((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-gray-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition shadow-xs"
                >
                  <Smartphone className="w-3 h-3 text-blue-600" />
                  <span>
                    {showClassBreakdown ? "Hide" : "Show"} Class Breakdown ({ops.parents.classAdoption.length})
                  </span>
                  {showClassBreakdown ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Section: Class-By-Class Student Adoption Breakdown */}
        {showClassBreakdown && ops?.parents?.classAdoption && ops.parents.classAdoption.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Class-Wise Student Engagement Breakdown
              </span>
              <button
                onClick={() => openParentInspection("ALL")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>View Full Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ops.parents.classAdoption.map((cls) => (
                <div
                  key={cls.classId}
                  onClick={() => openParentInspection("NOT_ACCESSED", cls.classId)}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition">
                      {cls.className}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
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
                      <strong className="text-gray-700">{cls.accessedFamilies}</strong> / {cls.totalFamilies} active
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
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[88vh] flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-blue-100 text-blue-700 rounded-xl flex-shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          Student Portal Access Roster
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                          Review student engagement, identify inactive students & export reports
                        </p>
                      </div>
                    </div>

                    {/* Dedicated Top-Right Close Button with large touch target */}
                    <button
                      onClick={() => setParentModalOpen(false)}
                      className="p-2 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 active:bg-gray-300 transition flex-shrink-0 touch-manipulation"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Actions Toolbar - Horizontally scrollable on mobile */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {/* 1. WhatsApp Share */}
                    <button
                      onClick={() => {
                        setWhatsappTargetClass(parentModalClassId !== "ALL" ? parentModalClassId : "ALL");
                        setWhatsappFilterStatus(parentModalStatus);
                        setWhatsappModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Format and share/copy parent reminder text for WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Share</span>
                    </button>

                    {/* 2. Print / PDF */}
                    <button
                      onClick={() =>
                        printClassWiseParentReport({
                          groups: classGroupedFamilies,
                          dateStr: dateRange.from || "Today",
                          status: parentModalStatus,
                          madrasaName: displayMadrasaName,
                          summary: parentReport?.summary
                            ? {
                                total: parentReport.summary.totalFamilies ?? 0,
                                accessed: parentReport.summary.accessedCount ?? 0,
                                notAccessed: parentReport.summary.notAccessedCount ?? 0,
                                rate: parentReport.summary.adoptionRate ?? 0,
                              }
                            : undefined,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Open clean printable view formatted for A4 printing or saving as PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Print / PDF</span>
                    </button>

                    {/* 3. Image Snapshot */}
                    <button
                      onClick={() =>
                        handleDownloadReportImage(
                          "parent-report-view-area",
                          `${madrasaFileSlug}-access-report-${dateRange.from || "today"}`
                        )
                      }
                      disabled={isExportingImage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition text-xs font-semibold shadow-sm disabled:opacity-50 flex-shrink-0"
                      title="Download high-resolution PNG image of the report"
                    >
                      <Image className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isExportingImage ? "Saving..." : "Save Image"}</span>
                    </button>

                    {/* 4. Download CSV */}
                    <button
                      onClick={() => handleDownloadParentCsv()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200 text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Download clean CSV report with student names, classes, guardian names, and contact phones"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filters & View Switcher Bar */}
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
                        {dateRange.preset === "ALL" ? "Accessed (All Time)" : "Accessed Today"} ({parentReport?.summary.accessedCount ?? parentAccessedCount})
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
                        All Students ({parentReport?.summary.totalStudents ?? parentReport?.summary.totalFamilies ?? parentTotalCount})
                      </button>
                    </div>

                    {/* View Mode & Class Filter */}
                    <div className="flex items-center gap-2">
                      <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-medium">
                        <button
                          onClick={() => setParentViewMode("CLASS_WISE")}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition",
                            parentViewMode === "CLASS_WISE"
                              ? "bg-white text-gray-900 shadow-sm font-bold"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                          title="Group by Class"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Class-Wise</span>
                        </button>
                        <button
                          onClick={() => setParentViewMode("FLAT")}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition",
                            parentViewMode === "FLAT"
                              ? "bg-white text-gray-900 shadow-sm font-bold"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                          title="Flat Table Roster"
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                          <span>Flat Roster</span>
                        </button>
                      </div>

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
                      placeholder="Search by student name, guardian name, admission number, or contact phone..."
                      value={parentModalSearch}
                      onChange={(e) => {
                        setParentModalSearch(e.target.value);
                        setParentModalPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Table Content & Snapshot Viewport */}
                <div id="parent-report-view-area" className="flex-1 overflow-y-auto p-4 bg-white">
                  {/* Institutional Header Banner (Madrasa Name as MAIN, Smart Madrasa branding small in corner) */}
                  <div className="mb-4 pb-3 border-b-2 border-gray-900 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
                        {displayMadrasaName}
                      </h2>
                      <p className="text-xs font-bold text-gray-700 tracking-wide mt-0.5">
                        {parentModalStatus === "NOT_ACCESSED"
                          ? "PENDING PORTAL ACCESS ROSTER"
                          : parentModalStatus === "ACCESSED"
                          ? "ACTIVE STUDENTS ACCESS ROSTER"
                          : "STUDENT PORTAL ENGAGEMENT ROSTER"}
                        {parentModalClassId !== "ALL" && (
                          <span className="text-blue-700 font-semibold ml-1.5">
                            • {(classesList ?? []).find((c: any) => c.id === parentModalClassId)?.name || parentModalClassId}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-1">
                        Date: {displayDateStr} • Total: {parentReport?.summary.totalStudents ?? parentReport?.summary.totalFamilies ?? parentTotalCount} • Active: {parentReport?.summary.accessedCount ?? parentAccessedCount} • Inactive: {parentReport?.summary.notAccessedCount ?? parentInactiveCount}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Smart Madrasa
                      </span>
                    </div>
                  </div>

                  {loadingParentAdoption ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="text-xs">Loading student roster...</p>
                    </div>
                  ) : !parentReport || parentReport.parents.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 space-y-2">
                      <UserCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-gray-700">No students match the filter</p>
                      <p className="text-xs text-gray-400">
                        {parentModalStatus === "NOT_ACCESSED"
                          ? "All students in this selection have accessed the portal!"
                          : "Try adjusting your search query or class selector."}
                      </p>
                    </div>
                  ) : parentViewMode === "CLASS_WISE" ? (
                    /* Class-Wise Organized Sections */
                    <div className="space-y-4">
                      {classGroupedFamilies.map((group) => {
                        const isCollapsed = collapsedClasses[group.className] ?? false;
                        const classTotal = group.totalStudents > 0 ? group.totalStudents : group.families.length;
                        const activeInClass = typeof group.activeStudents === "number" && group.totalStudents > 0
                          ? group.activeStudents
                          : group.families.filter((f) => f.hasAccessed || f.isLoggedIn).length;
                        const inactiveInClass = typeof group.inactiveStudents === "number" && group.totalStudents > 0
                          ? group.inactiveStudents
                          : Math.max(0, classTotal - activeInClass);

                        return (
                          <div
                            key={group.className}
                            className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
                          >
                            {/* Class Section Header */}
                            <div className="p-3 bg-gray-50 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/60">
                              <div
                                onClick={() => toggleClassCollapse(group.className)}
                                className="flex items-center gap-2.5 cursor-pointer select-none"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                                <h4 className="text-xs font-bold text-gray-900">{group.className}</h4>
                                <span className="text-[11px] text-gray-500 font-medium">({classTotal} students total)</span>
                                {parentModalStatus === "NOT_ACCESSED" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    {inactiveInClass} Not Accessed
                                  </span>
                                ) : parentModalStatus === "ACCESSED" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {activeInClass} Active Today
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    {activeInClass} Active • {inactiveInClass} Not Accessed
                                  </span>
                                )}
                              </div>

                              {/* Class Action Suite: WhatsApp, Print, CSV */}
                              <div className="flex items-center gap-1.5">
                                {/* 1-Click WhatsApp Copy */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const txt = formatWhatsAppClassMessage({
                                      className: group.className,
                                      families: group.families,
                                      dateStr: dateRange.from || "Today",
                                      status: parentModalStatus,
                                      madrasaName: displayMadrasaName,
                                    });
                                    copyToClipboard(txt, `Copied WhatsApp notice for ${group.className}!`);
                                    setCopiedKey(`wa-${group.className}`);
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition"
                                  title={`Copy WhatsApp reminder text for ${group.className}`}
                                >
                                  {copiedKey === `wa-${group.className}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                                      <span>WhatsApp</span>
                                    </>
                                  )}
                                </button>

                                {/* Direct WhatsApp Share Link */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const txt = formatWhatsAppClassMessage({
                                      className: group.className,
                                      families: group.families,
                                      dateStr: dateRange.from || "Today",
                                      status: parentModalStatus,
                                      madrasaName: displayMadrasaName,
                                    });
                                    openWhatsApp(txt);
                                  }}
                                  className="p-1 text-[11px] font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition"
                                  title={`Open ${group.className} reminder directly in WhatsApp`}
                                >
                                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                                </button>

                                {/* Print This Class */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    printClassWiseParentReport({
                                      groups: [group],
                                      dateStr: dateRange.from || "Today",
                                      status: parentModalStatus,
                                      madrasaName: displayMadrasaName,
                                      targetClassName: group.className,
                                    });
                                  }}
                                  className="p-1 text-[11px] font-semibold rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 transition"
                                  title={`Print / PDF for ${group.className}`}
                                >
                                  <Printer className="w-3 h-3 text-blue-600" />
                                </button>

                                {/* Export CSV for This Class */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadParentCsv(group.classId, group.className);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 transition"
                                  title={`Download CSV for ${group.className}`}
                                >
                                  <Download className="w-3 h-3 text-gray-500" />
                                  <span>CSV</span>
                                </button>
                              </div>
                            </div>

                            {/* Class Students Table */}
                            {!isCollapsed && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase text-[10px] tracking-wider bg-white">
                                      <th className="py-2 px-3 text-center w-10">#</th>
                                      <th className="py-2 px-3">Adm No</th>
                                      <th className="py-2 px-3">Student Name</th>
                                      <th className="py-2 px-3">Guardian Name</th>
                                      <th className="py-2 px-3">Contact Phone</th>
                                      <th className="py-2 px-3">Status</th>
                                      <th className="py-2 px-3 text-right">Last Activity</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {group.families.map((fam, idx) => {
                                      const admNo = fam.adno || fam.children?.[0]?.adno || "-";
                                      const studentName = fam.studentName || fam.name || fam.children?.[0]?.name || "-";

                                      return (
                                        <tr key={fam.studentId || `${fam.parentPhone}-${idx}`} className="hover:bg-gray-50/70 transition">
                                          <td className="py-2.5 px-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                                          <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600">{admNo}</td>
                                          <td className="py-2.5 px-3 font-semibold text-gray-900">{studentName}</td>
                                          <td className="py-2.5 px-3 text-gray-700 font-medium">
                                            {fam.guardianName || "Guardian"}
                                          </td>
                                          <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                                            {fam.parentPhone || "N/A"}
                                          </td>
                                          <td className="py-2.5 px-3">
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
                                          <td className="py-2.5 px-3 text-right text-gray-500">
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
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Flat Roster Table */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider bg-gray-50/70">
                            <th className="py-2.5 px-3 text-center w-10">#</th>
                            <th className="py-2.5 px-3">Adm No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">Guardian Name</th>
                            <th className="py-2.5 px-3">Contact Phone</th>
                            <th className="py-2.5 px-3">Access Status</th>
                            <th className="py-2.5 px-3 text-right">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parentReport.parents.map((fam, idx) => {
                            const admNo = fam.adno || fam.children?.[0]?.adno || "-";
                            const studentName = fam.studentName || fam.name || fam.children?.[0]?.name || "-";
                            const className = fam.className || fam.children?.[0]?.className || "-";

                            return (
                              <tr key={fam.studentId || `${fam.parentPhone}-${idx}`} className="hover:bg-gray-50/80 transition">
                                <td className="py-3 px-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                                <td className="py-3 px-3 font-mono text-[11px] text-gray-600">{admNo}</td>
                                <td className="py-3 px-3 font-semibold text-gray-900">{studentName}</td>
                                <td className="py-3 px-3">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                                    {className}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-gray-700 font-medium">
                                  {fam.guardianName || "Guardian"}
                                </td>
                                <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                                  {fam.parentPhone || "N/A"}
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Institutional Snapshot Footer (Madrasa verification & subtle corner branding) */}
                  <div className="mt-4 pt-2.5 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{displayMadrasaName} • Generated on {new Date().toLocaleDateString()}</span>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400">
                      Powered by Smart Madrasa
                    </span>
                  </div>
                </div>

                {/* Modal Footer with Pagination & Close Button */}
                <div className="p-3 sm:px-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/70 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs text-gray-500">
                    {parentReport ? (
                      <>
                        Page {parentReport.pagination.page} of {Math.max(1, parentReport.pagination.totalPages)} (
                        <strong className="text-gray-700 font-semibold">{parentReport.pagination.total}</strong> students)
                      </>
                    ) : (
                      "Student Portal Roster"
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {parentReport && parentReport.pagination.totalPages > 1 && (
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          disabled={parentModalPage <= 1}
                          onClick={() => setParentModalPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          disabled={parentModalPage >= parentReport.pagination.totalPages}
                          onClick={() => setParentModalPage((p) => p + 1)}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setParentModalOpen(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold transition text-xs shadow-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* INTERACTIVE WHATSAPP PREVIEW & SHARE MODAL                      */}
        {/* ============================================================== */}
        <AnimatePresence>
          {whatsappModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-emerald-50/70 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm flex-shrink-0">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          WhatsApp Shareable Roster
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                          Human-readable formatted list ready to copy or send directly
                        </p>
                      </div>
                    </div>
                    {/* Dedicated Top-Right Close Button */}
                    <button
                      onClick={() => setWhatsappModalOpen(false)}
                      className="p-2 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-emerald-100/60 active:bg-emerald-200 transition flex-shrink-0 touch-manipulation"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/40 space-y-3 flex-shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Class Selector */}
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Class Scope
                      </label>
                      <select
                        value={whatsappTargetClass}
                        onChange={(e) => setWhatsappTargetClass(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="ALL">All Classes (Full Institutional Digest)</option>
                        {classGroupedFamilies.map((g) => (
                          <option key={g.className} value={g.className}>
                            {g.className} ({g.families.length} students)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Mode */}
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Inclusion Filter
                      </label>
                      <div className="inline-flex p-1 bg-gray-200/70 rounded-xl text-xs font-semibold w-full">
                        <button
                          onClick={() => setWhatsappFilterStatus("NOT_ACCESSED")}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg transition text-center",
                            whatsappFilterStatus === "NOT_ACCESSED"
                              ? "bg-white text-rose-700 shadow-sm font-bold"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          Pending Only
                        </button>
                        <button
                          onClick={() => setWhatsappFilterStatus("ACCESSED")}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg transition text-center",
                            whatsappFilterStatus === "ACCESSED"
                              ? "bg-white text-emerald-700 shadow-sm font-bold"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => setWhatsappFilterStatus("ALL")}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg transition text-center",
                            whatsappFilterStatus === "ALL"
                              ? "bg-white text-gray-900 shadow-sm font-bold"
                              : "text-gray-600 hover:text-gray-900"
                          )}
                        >
                          All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Preview Area */}
                <div className="p-4 flex-1 overflow-y-auto bg-slate-100/70 space-y-2">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Message Preview</span>
                    <span className="text-emerald-700 font-medium">Ready to share</span>
                  </div>

                  {(() => {
                    const previewText =
                      whatsappTargetClass === "ALL"
                        ? formatWhatsAppGlobalMessage({
                            groups: classGroupedFamilies,
                            dateStr: dateRange.from || "Today",
                            status: whatsappFilterStatus,
                            madrasaName: displayMadrasaName,
                            summary: parentReport?.summary
                              ? {
                                  total: parentReport.summary.totalFamilies ?? 0,
                                  accessed: parentReport.summary.accessedCount ?? 0,
                                  notAccessed: parentReport.summary.notAccessedCount ?? 0,
                                  rate: parentReport.summary.adoptionRate ?? 0,
                                }
                              : undefined,
                          })
                        : (() => {
                            const group = classGroupedFamilies.find((g) => g.className === whatsappTargetClass);
                            if (!group) return "Select a class to generate WhatsApp message.";
                            return formatWhatsAppClassMessage({
                              className: group.className,
                              families: group.families,
                              dateStr: dateRange.from || "Today",
                              status: whatsappFilterStatus,
                              madrasaName: displayMadrasaName,
                            });
                          })();

                    return (
                      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-[#075E54] text-white px-3.5 py-2 text-xs font-bold flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-300" />
                          <span>WhatsApp Formatted Message</span>
                        </div>
                        <div className="p-3.5 bg-[#efeae2] max-h-72 overflow-y-auto font-sans text-xs text-gray-900 whitespace-pre-wrap leading-relaxed select-text">
                          {previewText}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Modal Footer with 1-Click Copy, Direct WhatsApp Link and Mobile-Friendly Close */}
                <div className="p-3 sm:px-5 border-t border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <span className="text-[11px] text-gray-400 hidden sm:inline">
                    Clean human list format with zero artificial fluff.
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {(() => {
                      const msgText =
                        whatsappTargetClass === "ALL"
                          ? formatWhatsAppGlobalMessage({
                              groups: classGroupedFamilies,
                              dateStr: dateRange.from || "Today",
                              status: whatsappFilterStatus,
                              madrasaName: displayMadrasaName,
                              summary: parentReport?.summary
                                ? {
                                    total: parentReport.summary.totalFamilies ?? 0,
                                    accessed: parentReport.summary.accessedCount ?? 0,
                                    notAccessed: parentReport.summary.notAccessedCount ?? 0,
                                    rate: parentReport.summary.adoptionRate ?? 0,
                                  }
                                : undefined,
                            })
                          : (() => {
                              const group = classGroupedFamilies.find((g) => g.className === whatsappTargetClass);
                              if (!group) return "";
                              return formatWhatsAppClassMessage({
                                className: group.className,
                                families: group.families,
                                dateStr: dateRange.from || "Today",
                                status: whatsappFilterStatus,
                                madrasaName: displayMadrasaName,
                              });
                            })();

                      return (
                        <>
                          <button
                            onClick={() => {
                              copyToClipboard(msgText, "Copied WhatsApp message to clipboard!");
                              setCopiedKey("wa-modal-preview");
                              setTimeout(() => setCopiedKey(null), 2000);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 transition text-xs font-bold shadow-sm"
                          >
                            {copiedKey === "wa-modal-preview" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => openWhatsApp(msgText)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition text-xs font-bold shadow-md"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open WhatsApp</span>
                          </button>

                          <button
                            onClick={() => setWhatsappModalOpen(false)}
                            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold transition text-xs shadow-sm ml-1"
                          >
                            Close
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* ON-DEMAND MODAL 2: CLASS ATTENDANCE SUBMISSIONS                */}
        {/* ============================================================== */}
        <AnimatePresence>
          {attendanceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-emerald-100 text-emerald-700 rounded-xl flex-shrink-0">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          Class Attendance Submissions
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                          Check daily submissions and contact pending teachers
                        </p>
                      </div>
                    </div>
                    {/* Dedicated Top-Right Close Button */}
                    <button
                      onClick={() => setAttendanceModalOpen(false)}
                      className="p-2 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 active:bg-gray-300 transition flex-shrink-0 touch-manipulation"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Actions Toolbar - Mobile friendly scrolling */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => {
                        const pending = ops?.classAttendance?.pendingClasses ?? [];
                        if (pending.length === 0) {
                          toast.info("All classes have submitted attendance today!");
                          return;
                        }
                        const txt = formatWhatsAppAttendanceReminder({
                          pendingClasses: pending,
                          dateStr: dateRange.from || "Today",
                          madrasaName: displayMadrasaName,
                        });
                        copyToClipboard(txt, "Copied WhatsApp attendance notice for pending teachers!");
                        setCopiedKey("wa-attendance");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Copy formatted notice for pending teachers to WhatsApp"
                    >
                      {copiedKey === "wa-attendance" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Notice!</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Notice</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const pending = ops?.classAttendance?.pendingClasses ?? [];
                        if (pending.length === 0) {
                          toast.info("All classes have submitted attendance today!");
                          return;
                        }
                        const txt = formatWhatsAppAttendanceReminder({
                          pendingClasses: pending,
                          dateStr: dateRange.from || "Today",
                          madrasaName: displayMadrasaName,
                        });
                        openWhatsApp(txt);
                      }}
                      className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition border border-emerald-200 flex-shrink-0"
                      title="Open attendance reminder directly in WhatsApp"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <button
                      onClick={handleDownloadAttendanceCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200 text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Download Attendance CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>
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

                {/* Modal Footer with Mobile-Friendly Dismiss */}
                <div className="p-3 sm:px-5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs">
                    {classAttPending > 0 ? (
                      <span className="text-amber-700 font-semibold">{classAttPending} classes pending submission</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">All classes submitted</span>
                    )}
                  </span>
                  <button
                    onClick={() => setAttendanceModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold transition text-xs shadow-sm"
                  >
                    Close
                  </button>
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
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-indigo-100 text-indigo-700 rounded-xl flex-shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          Homework Compliance
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                          Review daily homework postings and contact pending teachers
                        </p>
                      </div>
                    </div>
                    {/* Dedicated Top-Right Close Button */}
                    <button
                      onClick={() => setHomeworkModalOpen(false)}
                      className="p-2 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 active:bg-gray-300 transition flex-shrink-0 touch-manipulation"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Actions Toolbar - Mobile friendly scrolling */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => {
                        const pending = ops?.homeworkCompliance?.pendingClasses ?? [];
                        if (pending.length === 0) {
                          toast.info("All classes have homework assignments posted!");
                          return;
                        }
                        const txt = formatWhatsAppHomeworkReminder({
                          pendingClasses: pending,
                          dateStr: dateRange.from || "Today",
                          madrasaName: displayMadrasaName,
                        });
                        copyToClipboard(txt, "Copied WhatsApp homework notice for pending classes!");
                        setCopiedKey("wa-homework");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Copy formatted notice for classes with missing homework to WhatsApp"
                    >
                      {copiedKey === "wa-homework" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Notice!</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Notice</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const pending = ops?.homeworkCompliance?.pendingClasses ?? [];
                        if (pending.length === 0) {
                          toast.info("All classes have homework assignments posted!");
                          return;
                        }
                        const txt = formatWhatsAppHomeworkReminder({
                          pendingClasses: pending,
                          dateStr: dateRange.from || "Today",
                          madrasaName: displayMadrasaName,
                        });
                        openWhatsApp(txt);
                      }}
                      className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 transition border border-indigo-200 flex-shrink-0"
                      title="Open homework reminder directly in WhatsApp"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                    <button
                      onClick={handleDownloadHomeworkCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200 text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Download Homework Compliance CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>
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

                {/* Modal Footer with Mobile-Friendly Dismiss */}
                <div className="p-3 sm:px-5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs">
                    {hwPendingCount > 0 ? (
                      <span className="text-amber-700 font-semibold">{hwPendingCount} classes missing homework</span>
                    ) : (
                      <span className="text-indigo-700 font-semibold">All classes posted</span>
                    )}
                  </span>
                  <button
                    onClick={() => setHomeworkModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold transition text-xs shadow-sm"
                  >
                    Close
                  </button>
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
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-amber-100 text-amber-700 rounded-xl flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          Ibadah Tracking Compliance
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                          Monitor daily spiritual logs and contact pending teachers
                        </p>
                      </div>
                    </div>
                    {/* Dedicated Top-Right Close Button */}
                    <button
                      onClick={() => setIbadahModalOpen(false)}
                      className="p-2 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 active:bg-gray-300 transition flex-shrink-0 touch-manipulation"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Actions Toolbar - Mobile friendly scrolling */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => {
                        const pending = ops?.ibadahCompliance?.pendingClasses ?? [];
                        if (pending.length === 0) {
                          toast.info("All classes have recorded spiritual tracking today!");
                          return;
                        }
                        const txt = formatWhatsAppIbadahReminder({
                          pendingClasses: pending,
                          dateStr: dateRange.from || "Today",
                          madrasaName: displayMadrasaName,
                        });
                        copyToClipboard(txt, "Copied WhatsApp spiritual tracking notice for pending classes!");
                        setCopiedKey("wa-ibadah");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Copy formatted notice for classes with missing ibadah logs to WhatsApp"
                    >
                      {copiedKey === "wa-ibadah" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Notice!</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Notice</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        const pending = ops?.ibadahCompliance?.pendingClasses ?? [];
                        if (pending.length === 0) {
                          toast.info("All classes have recorded spiritual tracking today!");
                          return;
                        }
                        const txt = formatWhatsAppIbadahReminder({
                          pendingClasses: pending,
                          dateStr: dateRange.from || "Today",
                          madrasaName: displayMadrasaName,
                        });
                        openWhatsApp(txt);
                      }}
                      className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 transition border border-amber-200 flex-shrink-0"
                      title="Open ibadah tracking notice directly in WhatsApp"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                    <button
                      onClick={handleDownloadIbadahCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition border border-amber-200 text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Download Ibadah Tracking CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>
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

                {/* Modal Footer with Mobile-Friendly Dismiss */}
                <div className="p-3 sm:px-5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs">
                    {ibPendingCount > 0 ? (
                      <span className="text-rose-700 font-semibold">{ibPendingCount} classes missing spiritual logs</span>
                    ) : (
                      <span className="text-amber-800 font-semibold">All classes recorded</span>
                    )}
                  </span>
                  <button
                    onClick={() => setIbadahModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold transition text-xs shadow-sm"
                  >
                    Close
                  </button>
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
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-200 w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[88vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 sm:p-2.5 bg-purple-100 text-purple-700 rounded-xl flex-shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          Faculty Diligence & Utilization
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                          Monitor teacher check-ins, attendance submissions & daily logs
                        </p>
                      </div>
                    </div>
                    {/* Dedicated Top-Right Close Button */}
                    <button
                      onClick={() => setFacultyModalOpen(false)}
                      className="p-2 -mr-1 -mt-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 active:bg-gray-300 transition flex-shrink-0 touch-manipulation"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Actions Toolbar - Mobile friendly scrolling */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => {
                        const teachers = ops?.teachers?.teacherList ?? [];
                        const unchecked = teachers.filter((t) => !t.checkedIn && !t.attendanceMarked);
                        if (unchecked.length === 0) {
                          toast.info("All faculty have checked in today!");
                          return;
                        }
                        const lines: string[] = [];
                        lines.push("📢 *Madrasa Staff Notice: Daily Check-In & Diligence*");
                        if (displayMadrasaName) lines.push(`🏛️ *${displayMadrasaName}*`);
                        lines.push(`📅 *Date:* ${dateRange.from || "Today"}`);
                        lines.push(`⚠️ *Pending Check-In (${unchecked.length} Teachers):*`);
                        lines.push("");
                        unchecked.forEach((t, idx) => {
                          const phone = t.phone ? ` (📞 ${t.phone})` : "";
                          const classes = (t.assignedClasses || []).join(" / ") || "Subject Teacher";
                          lines.push(`${idx + 1}. *${t.teacherName}* — ${classes}${phone}`);
                        });
                        lines.push("");
                        lines.push("Kindly check in and update your daily classroom logs on the portal.");
                        lines.push("Jazakumullahu Khairan! 🤲");
                        const txt = lines.join("\n");
                        copyToClipboard(txt, "Copied WhatsApp faculty reminder!");
                        setCopiedKey("wa-faculty");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Copy reminder for teachers who have not checked in to WhatsApp"
                    >
                      {copiedKey === "wa-faculty" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Notice!</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Notice</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadFacultyCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition border border-purple-200 text-xs font-semibold shadow-sm flex-shrink-0"
                      title="Download Faculty Diligence CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>
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
                                      <CheckCircle2 className="w-3.5 h-3.5" />
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

                {/* Modal Footer with Mobile-Friendly Dismiss */}
                <div className="p-3 sm:px-5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs">
                    <strong className="text-purple-700 font-semibold">{teacherActive}</strong> of {teacherTotal} faculty active today
                  </span>
                  <button
                    onClick={() => setFacultyModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold transition text-xs shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
