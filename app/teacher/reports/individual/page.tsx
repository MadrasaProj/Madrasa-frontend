import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuthStore } from "@/store/auth";
import { useActiveClass } from "@/store/activeClass";
import { useLanguageStore } from "@/store/language";
import { t, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getStudents, type StudentRecord } from "@/lib/students-api";
import { getStudentHomework, listHomework, type StudentHomeworkItem, type HomeworkAssignment } from "@/lib/homework-api";
import { getStudentIbadah, type StudentIbadahLog } from "@/lib/ibadah-api";
import { getStudentAttendance, type AttendanceRecord } from "@/lib/attendance-api";
import { getAttendanceSummary, type AttendanceSummary } from "@/lib/reports-api";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Search,
  SlidersHorizontal,
  Loader2,
  Printer,
  Download,
  CircleCheck,
  Clock3,
  UserCheck,
  UserX,
  Users,
  BookOpen,
  BookMarked,
  FileText,
  ChevronRight,
  Flame,
  Sparkles,
  Calendar,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Date Helpers ─────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    monthStart: toDateString(start),
    today: toDateString(now),
  };
}

// ── Pagination Helper ────────────────────────────────────────────────────────

function reportPageItems(current: number, total: number): Array<number | "ellipsis"> {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous === 2) items.push(previous + 1);
    if (previous && page - previous > 2) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

// ── SVG Semi-Circle Chart (Identical style to fees/page.tsx) ──────────────────

function ReportSemiCircle({
  segments,
  value,
  label,
  description,
}: {
  segments: { value: number; color: string }[];
  value: string;
  label: string;
  description: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let position = 0;
  const point = (fraction: number) => {
    const angle = Math.PI * (1 - fraction);
    return [100 + 78 * Math.cos(angle), 94 - 78 * Math.sin(angle)];
  };

  return (
    <svg viewBox="0 0 200 108" role="img" aria-label={description} className="mx-auto h-24 w-full max-w-52 sm:h-28">
      <path d="M 22 94 A 78 78 0 0 1 178 94" fill="none" stroke="#e5e7eb" strokeWidth="17" strokeLinecap="round" />
      {total > 0 &&
        segments.map((segment, index) => {
          const start = position;
          position += segment.value / total;
          if (segment.value <= 0) return null;
          const [x1, y1] = point(start);
          const [x2, y2] = point(position);
          return (
            <path
              key={index}
              d={`M ${x1} ${y1} A 78 78 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={segment.color}
              strokeWidth="17"
            />
          );
        })}
      <text x="100" y="72" textAnchor="middle" className="fill-gray-950 text-[23px] font-semibold">
        {value}
      </text>
      <text x="100" y="89" textAnchor="middle" className="fill-gray-500 text-[10px] font-medium">
        {label}
      </text>
    </svg>
  );
}

// ── Overview Statistics Card (Identical pattern to FeeStats) ─────────────────

function ReportStats({
  totalStudents,
  shownStudents,
  search,
  from,
  to,
  lang,
  attSummary,
  hwCount,
}: {
  totalStudents: number;
  shownStudents: number;
  search: string;
  from: string;
  to: string;
  lang: Lang;
  attSummary: AttendanceSummary | null;
  hwCount: number;
}) {
  const presentCount = attSummary?.present ?? 0;
  const totalAttendance = attSummary?.total ?? 0;
  const absentCount = attSummary ? Math.max(0, totalAttendance - presentCount) : 0;
  const attendanceRate = attSummary?.rate ?? (totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0);

  const stats = [
    {
      label: t("common", "present", lang) + " " + t("common", "rate", lang),
      value: `${attendanceRate}%`,
      detail: `${presentCount} of ${totalAttendance} records`,
      icon: CircleCheck,
      color: "text-emerald-700",
    },
    {
      label: t("common", "absent", lang),
      value: absentCount,
      detail: "Total absent records",
      icon: UserX,
      color: "text-red-700",
    },
    {
      label: "Assignments",
      value: hwCount,
      detail: "Assigned in this period",
      icon: BookOpen,
      color: "text-blue-700",
    },
    {
      label: "Active Students",
      value: totalStudents,
      detail: "Enrolled in class",
      icon: Users,
      color: "text-primary-700",
    },
    {
      label: "Period Range",
      value: `${from.slice(5)} → ${to.slice(5)}`,
      detail: `${from} to ${to}`,
      icon: Clock3,
      color: "text-amber-700",
    },
    {
      label: "Report Status",
      value: "Ready",
      detail: "Individual tracking enabled",
      icon: Sparkles,
      color: "text-purple-700",
    },
  ];

  return (
    <section className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50">
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums text-gray-950">{totalStudents}</span>
            <span className="text-xs font-medium text-gray-600">
              {t("common", "students", lang)}
            </span>
          </div>
          <span className="rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
            <strong className="tabular-nums">{shownStudents}</strong>{" "}
            {t("teacherPages", "feeResultsShown", lang)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
          <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
            {from} → {to}
          </span>
          {search.trim() && (
            <span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-gray-700 ring-1 ring-gray-200">
              {t("common", "search", lang)}: {search.trim()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-gray-100">
        <div className="min-w-0 bg-white/90 p-3 text-center sm:p-4">
          <h3 className="text-xs font-semibold text-gray-700">Class Attendance</h3>
          <ReportSemiCircle
            segments={[
              { value: presentCount, color: "#059669" },
              { value: absentCount, color: "#dc2626" },
            ]}
            value={`${attendanceRate}%`}
            label={t("common", "present", lang)}
            description={`Attendance: ${attendanceRate}%`}
          />
          <div className="flex justify-center gap-3 text-[11px] text-gray-600">
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />
              {t("common", "present", lang)}
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-red-600" />
              {t("common", "absent", lang)}
            </span>
          </div>
        </div>

        <div className="min-w-0 bg-white/90 p-3 text-center sm:p-4">
          <h3 className="text-xs font-semibold text-gray-700">Assignments & Activity</h3>
          <ReportSemiCircle
            segments={[
              { value: hwCount > 0 ? hwCount : 1, color: "#2563eb" },
              { value: Math.max(0, totalStudents - hwCount), color: "#9ca3af" },
            ]}
            value={String(hwCount)}
            label="Assignments"
            description={`Homework: ${hwCount} items`}
          />
          <div className="flex justify-center gap-3 text-[11px] text-gray-600">
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-blue-600" />
              Active Tasks
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-w-0 bg-white/90 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", stat.color)} />
                <span>{stat.label}</span>
              </div>
              <div className="mt-2 text-base font-semibold tabular-nums text-gray-950 sm:text-lg">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">{stat.detail}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Printable Report Modal (Identical pattern to ReceiptModal in fees) ────────

function ReportPrintModal({
  student,
  from,
  to,
  attendance,
  homework,
  ibadah,
  onClose,
  schoolName,
}: {
  student: StudentRecord;
  from: string;
  to: string;
  attendance: AttendanceRecord[];
  homework: StudentHomeworkItem[];
  ibadah: StudentIbadahLog[];
  onClose: () => void;
  schoolName: string;
}) {
  const { lang } = useLanguageStore();
  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const absentCount = attendance.filter((a) => a.status === "ABSENT").length;
  const leaveCount = attendance.filter((a) => a.status === "LEAVE" || a.status === "SICK").length;
  const totalDays = attendance.length;
  const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  const totalQuranPages = ibadah.reduce((sum, item) => sum + (item.quranPages || 0), 0);
  const prayerDays = ibadah.filter((l) => l.fajr || l.dhuhr || l.asr || l.maghrib || l.isha).length;
  const submittedHw = homework.filter((h) => h.submission?.status === "SUBMITTED" || h.submission?.status === "CHECKED").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="bg-primary-600 px-6 py-5 text-center text-white">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <p className="text-lg font-bold">{schoolName || t("common", "appName", lang)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-widest text-primary-100">
            Individual Student Progress Report
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 text-xs text-gray-800">
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-400">Student Name</span>
                <p className="font-bold text-gray-950 text-sm">{student.name}</p>
              </div>
              <div>
                <span className="text-gray-400">Admission No</span>
                <p className="font-semibold text-gray-900">{student.adno}</p>
              </div>
              <div>
                <span className="text-gray-400">Class</span>
                <p className="font-semibold text-gray-900">{student.class?.name ?? "—"}</p>
              </div>
              <div>
                <span className="text-gray-400">Period</span>
                <p className="font-semibold text-gray-900">{from} to {to}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-bold uppercase tracking-wider text-gray-500 text-[11px]">
              Attendance Summary
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-2">
                <span className="block font-bold text-emerald-800 text-sm">{presentCount}</span>
                <span className="text-[10px] text-emerald-600">Present</span>
              </div>
              <div className="rounded-xl bg-red-50 p-2">
                <span className="block font-bold text-red-800 text-sm">{absentCount}</span>
                <span className="text-[10px] text-red-600">Absent</span>
              </div>
              <div className="rounded-xl bg-amber-50 p-2">
                <span className="block font-bold text-amber-800 text-sm">{leaveCount}</span>
                <span className="text-[10px] text-amber-600">Leave</span>
              </div>
              <div className="rounded-xl bg-primary-50 p-2">
                <span className="block font-bold text-primary-800 text-sm">{attendanceRate}%</span>
                <span className="text-[10px] text-primary-600">Rate</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-bold uppercase tracking-wider text-gray-500 text-[11px]">
              Homework & Ibadah
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-blue-50 p-2">
                <span className="block font-bold text-blue-800 text-sm">
                  {submittedHw}/{homework.length}
                </span>
                <span className="text-[10px] text-blue-600">Homework</span>
              </div>
              <div className="rounded-xl bg-amber-50 p-2">
                <span className="block font-bold text-amber-800 text-sm">{totalQuranPages}</span>
                <span className="text-[10px] text-amber-600">Quran Pages</span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2">
                <span className="block font-bold text-emerald-800 text-sm">{prayerDays}</span>
                <span className="text-[10px] text-emerald-600">Prayer Days</span>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 text-[11px] text-gray-400 flex justify-between items-center">
            <span>Generated on {new Date().toLocaleDateString("en-GB")}</span>
            <span className="font-semibold text-gray-600">Verified by Madrasa</span>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-gray-600"
          >
            {t("common", "close", lang)}
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Printer className="h-4 w-4" /> {t("common", "print", lang)}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Direct jsPDF Vector Report Generation (No HTML Screenshots) ──────────────

async function downloadReportAsPdf({
  student,
  from,
  to,
  attendance,
  homework,
  ibadah,
  schoolName,
  attMetrics,
  hwMetrics,
  ibadahMetrics,
}: {
  student: StudentRecord;
  from: string;
  to: string;
  attendance: AttendanceRecord[];
  homework: StudentHomeworkItem[];
  ibadah: StudentIbadahLog[];
  schoolName: string;
  attMetrics: { present: number; absent: number; leave: number; late: number; total: number; rate: number };
  hwMetrics: { total: number; submitted: number; checked: number; pending: number; rate: number };
  ibadahMetrics: { daysTracked: number; quranPages: number; prayerDays: number };
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // 1. Header Banner
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.roundedRect(margin, currentY, contentWidth, 23, 2.5, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(schoolName || "Smart Madrasa", margin + 6, currentY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(209, 250, 229); // light emerald
  doc.text("INDIVIDUAL STUDENT PROGRESS REPORT", margin + 6, currentY + 16);

  doc.setFontSize(8);
  doc.text(`Period: ${from} to ${to}`, pageWidth - margin - 6, currentY + 8.5, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin - 6, currentY + 16, { align: "right" });

  currentY += 27;

  // 2. Student Information Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 19, 2, 2, "FD");

  // Col 1: Student Name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("STUDENT NAME", margin + 6, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(student.name, margin + 6, currentY + 13);

  // Col 2: Admission No
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("ADMISSION NO", margin + 55, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(student.adno, margin + 55, currentY + 13);

  // Col 3: Class
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("CLASS", margin + 105, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(student.class?.name || "—", margin + 105, currentY + 13);

  // Col 4: Gender & Phone
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("CONTACT & GENDER", margin + 145, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${student.gender || "—"} · ${student.parentPhone || "No phone"}`, margin + 145, currentY + 13);

  currentY += 23;

  // 3. Highlight Metric Cards
  const cardW = (contentWidth - 6) / 3;
  const cardH = 19;

  // Attendance Card
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, "FD");

  doc.setTextColor(6, 95, 70);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("ATTENDANCE RATE", margin + 4, currentY + 5.5);
  doc.setTextColor(2, 44, 34);
  doc.setFontSize(12.5);
  doc.text(`${attMetrics.rate}%`, margin + 4, currentY + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(5, 150, 105);
  doc.text(`${attMetrics.present} of ${attMetrics.total} days present`, margin + 4, currentY + 16.5);

  // Homework Card
  const card2X = margin + cardW + 3;
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(card2X, currentY, cardW, cardH, 2, 2, "FD");

  doc.setTextColor(30, 64, 175);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("HOMEWORK SUBMITTED", card2X + 4, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12.5);
  doc.text(`${hwMetrics.rate}%`, card2X + 4, currentY + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(37, 99, 235);
  doc.text(`${hwMetrics.submitted} of ${hwMetrics.total} tasks completed`, card2X + 4, currentY + 16.5);

  // Ibadah Card
  const card3X = margin + (cardW + 3) * 2;
  doc.setFillColor(254, 243, 199); // amber-50
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(card3X, currentY, cardW, cardH, 2, 2, "FD");

  doc.setTextColor(146, 64, 14);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("QURAN & PRAYERS", card3X + 4, currentY + 5.5);
  doc.setTextColor(69, 26, 3);
  doc.setFontSize(12.5);
  doc.text(`${ibadahMetrics.quranPages} Pages`, card3X + 4, currentY + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 83, 9);
  doc.text(`${ibadahMetrics.prayerDays} prayer days logged`, card3X + 4, currentY + 16.5);

  currentY += cardH + 7;

  // 4. Attendance Breakdown Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`1. Attendance Records (${attendance.length} days)`, margin, currentY);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Present: ${attMetrics.present}  |  Absent: ${attMetrics.absent}  |  Leave: ${attMetrics.leave}  |  Late: ${attMetrics.late}`,
    pageWidth - margin,
    currentY,
    { align: "right" },
  );

  currentY += 3.5;

  // Attendance Table Header
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.rect(margin, currentY, contentWidth, 5.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("Date", margin + 3, currentY + 3.8);
  doc.text("Status", margin + 42, currentY + 3.8);
  doc.text("Notes / Remarks", margin + 85, currentY + 3.8);

  currentY += 5.5;

  if (attendance.length === 0) {
    doc.rect(margin, currentY, contentWidth, 6, "D");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text("No attendance records in this period.", margin + 3, currentY + 4);
    currentY += 6;
  } else {
    for (const rec of attendance) {
      checkPageBreak(5.5);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.15);
      doc.line(margin, currentY + 5.5, margin + contentWidth, currentY + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(31, 41, 55);
      doc.text(rec.date, margin + 3, currentY + 3.8);

      doc.setFont("helvetica", "bold");
      if (rec.status === "PRESENT") {
        doc.setTextColor(5, 150, 105);
      } else if (rec.status === "ABSENT") {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(rec.status, margin + 42, currentY + 3.8);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(rec.notes || "—", margin + 85, currentY + 3.8);

      currentY += 5.5;
    }
  }

  currentY += 5;

  // 5. Homework Assignments Section
  checkPageBreak(18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`2. Homework Assignments (${homework.length} items)`, margin, currentY);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Submitted: ${hwMetrics.submitted}  |  Pending: ${hwMetrics.pending}`, pageWidth - margin, currentY, {
    align: "right",
  });

  currentY += 3.5;

  // Homework Table Header
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.rect(margin, currentY, contentWidth, 5.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("Title", margin + 3, currentY + 3.8);
  doc.text("Subject", margin + 65, currentY + 3.8);
  doc.text("Due Date", margin + 105, currentY + 3.8);
  doc.text("Status", margin + 140, currentY + 3.8);

  currentY += 5.5;

  if (homework.length === 0) {
    doc.rect(margin, currentY, contentWidth, 6, "D");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text("No homework assignments in this period.", margin + 3, currentY + 4);
    currentY += 6;
  } else {
    for (const hw of homework) {
      checkPageBreak(5.5);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.15);
      doc.line(margin, currentY + 5.5, margin + contentWidth, currentY + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(31, 41, 55);
      const title = doc.splitTextToSize(hw.title, 58)[0] || hw.title;
      doc.text(title, margin + 3, currentY + 3.8);
      doc.text(hw.subject?.name || "—", margin + 65, currentY + 3.8);
      doc.text(hw.dueDate ? hw.dueDate.slice(0, 10) : "—", margin + 105, currentY + 3.8);

      const status = (hw.submission?.status || "NOT_SUBMITTED").replace(/_/g, " ");
      const isDone = hw.submission?.status === "SUBMITTED" || hw.submission?.status === "CHECKED";
      doc.setFont("helvetica", "bold");
      if (isDone) {
        doc.setTextColor(37, 99, 235);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(status, margin + 140, currentY + 3.8);

      currentY += 5.5;
    }
  }

  currentY += 5;

  // 6. Ibadah Section
  checkPageBreak(18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`3. Daily Ibadah Tracking (${ibadah.length} logs, ${ibadahMetrics.quranPages} pages)`, margin, currentY);

  currentY += 3.5;

  // Ibadah Table Header
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.rect(margin, currentY, contentWidth, 5.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text("Date", margin + 3, currentY + 3.8);
  doc.text("Fajr", margin + 32, currentY + 3.8);
  doc.text("Dhuhr", margin + 52, currentY + 3.8);
  doc.text("Asr", margin + 72, currentY + 3.8);
  doc.text("Maghrib", margin + 92, currentY + 3.8);
  doc.text("Isha", margin + 115, currentY + 3.8);
  doc.text("Quran Pages", margin + 142, currentY + 3.8);

  currentY += 5.5;

  if (ibadah.length === 0) {
    doc.rect(margin, currentY, contentWidth, 6, "D");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text("No ibadah logs recorded in this period.", margin + 3, currentY + 4);
    currentY += 6;
  } else {
    for (const log of ibadah) {
      checkPageBreak(5.5);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.15);
      doc.line(margin, currentY + 5.5, margin + contentWidth, currentY + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(31, 41, 55);
      doc.text(log.date, margin + 3, currentY + 3.8);
      doc.text(log.fajr || "—", margin + 32, currentY + 3.8);
      doc.text(log.dhuhr || "—", margin + 52, currentY + 3.8);
      doc.text(log.asr || "—", margin + 72, currentY + 3.8);
      doc.text(log.maghrib || "—", margin + 92, currentY + 3.8);
      doc.text(log.isha || "—", margin + 115, currentY + 3.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text(`${log.quranPages || 0} pgs`, margin + 142, currentY + 3.8);

      currentY += 5.5;
    }
  }

  // 7. Signature area
  checkPageBreak(20);
  currentY += 8;
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 8, margin + 55, currentY + 8);
  doc.line(pageWidth - margin - 55, currentY + 8, pageWidth - margin, currentY + 8);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Class Teacher's Signature", margin, currentY + 12);
  doc.text("Principal / Madrasa In-Charge", pageWidth - margin - 55, currentY + 12);

  // 8. Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Smart Madrasa Management System · Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );
  }

  doc.save(`${student.name.replace(/\s+/g, "_")}_Individual_Report.pdf`);
}

// ── Main Page Component ──────────────────────────────────────────────────────

export default function TeacherIndividualReportPage() {
  const { user, accessToken, activeClientId } = useAuthStore();
  const { lang } = useLanguageStore();
  const { activeClassId } = useActiveClass();
  const cid = activeClientId ?? user?.clientId ?? "";
  const token = accessToken ?? "";

  const initialDates = useMemo(() => getInitialDates(), []);
  const [from, setFrom] = useState(initialDates.monthStart);
  const [to, setTo] = useState(initialDates.today);
  const [activeDatePreset, setActiveDatePreset] = useState<"month" | "30days" | "week" | "custom">("month");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const pickerRange = useMemo<DateRange | undefined>(() => {
    return {
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
    };
  }, [from, to]);

  const handleApplyRange = (range: DateRange | undefined) => {
    if (range?.from) {
      const fromStr = toDateString(range.from);
      const toStr = range.to ? toDateString(range.to) : fromStr;
      setFrom(fromStr);
      setTo(toStr);
      setActiveDatePreset("custom");
    }
  };

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSkip, setPageSkip] = useState(0);

  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [classHomework, setClassHomework] = useState<HomeworkAssignment[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [studentHomework, setStudentHomework] = useState<StudentHomeworkItem[]>([]);
  const [studentIbadah, setStudentIbadah] = useState<StudentIbadahLog[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load Students in Class ─────────────────────────────────────────────────

  const loadStudents = useCallback(async () => {
    if (!cid || !token || !activeClassId) {
      setStudents([]);
      setStudentsLoading(false);
      return;
    }
    setStudentsLoading(true);
    setError(null);
    try {
      const res = await getStudents(cid, token, {
        classId: activeClassId,
        limit: 1000,
        status: "ACTIVE",
      });
      setStudents(res.data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStudentsLoading(false);
    }
  }, [cid, token, activeClassId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ── Load Class Summaries (Attendance & Homework) ───────────────────────────

  const loadClassSummaries = useCallback(async () => {
    if (!cid || !token || !activeClassId || from > to) return;
    try {
      const [attRes, hwRes] = await Promise.all([
        getAttendanceSummary(cid, token, from, to).catch(() => null),
        listHomework(cid, token, { classId: activeClassId, from, to }).catch(() => []),
      ]);
      setAttSummary(attRes);
      setClassHomework(hwRes);
    } catch {
      // Non-blocking for list view
    }
  }, [cid, token, activeClassId, from, to]);

  useEffect(() => {
    loadClassSummaries();
  }, [loadClassSummaries]);

  // ── Load Individual Student Detail on Selection ───────────────────────────

  const loadStudentReport = useCallback(
    async (studentId: string) => {
      if (!cid || !token || !studentId || from > to) return;
      setReportLoading(true);
      try {
        const [hwRes, ibRes, attRes] = await Promise.all([
          getStudentHomework(cid, token, studentId),
          getStudentIbadah(cid, token, studentId, { from, to, limit: 500 }),
          getStudentAttendance(cid, token, studentId, { from, to, take: 500 }),
        ]);
        const filteredHw = hwRes.homework.filter(
          (item) => item.dueDate.slice(0, 10) >= from && item.dueDate.slice(0, 10) <= to,
        );
        setStudentHomework(filteredHw);
        setStudentIbadah(ibRes.logs || []);
        setStudentAttendance(attRes.records || []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setReportLoading(false);
      }
    },
    [cid, token, from, to],
  );

  const selectStudent = (student: StudentRecord) => {
    setSelectedStudent(student);
    loadStudentReport(student.id);
  };

  // Re-fetch report if date range changed while drawer is open
  useEffect(() => {
    if (selectedStudent) {
      loadStudentReport(selectedStudent.id);
    }
  }, [from, to, selectedStudent?.id, loadStudentReport]);

  // ── Date Preset Handler ────────────────────────────────────────────────────

  const applyDatePreset = (preset: "month" | "30days" | "week" | "custom") => {
    setActiveDatePreset(preset);
    const now = new Date();
    const todayStr = toDateString(now);

    if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(toDateString(start));
      setTo(todayStr);
    } else if (preset === "30days") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setFrom(toDateString(start));
      setTo(todayStr);
    } else if (preset === "week") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      setFrom(toDateString(start));
      setTo(todayStr);
    }
  };

  // ── Filter & Search Students ───────────────────────────────────────────────

  const searchTerm = search.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm) ||
        s.adno.toLowerCase().includes(searchTerm),
    );
  }, [students, searchTerm]);

  const visibleStudents = filteredStudents.slice(pageSkip, pageSkip + 30);
  const currentPage = Math.floor(pageSkip / 30) + 1;
  const pageCount = Math.ceil(filteredStudents.length / 30);

  useEffect(() => {
    if (!studentsLoading && pageSkip >= filteredStudents.length && pageSkip > 0) {
      setPageSkip(Math.max(0, Math.ceil(filteredStudents.length / 30) - 1) * 30);
    }
  }, [filteredStudents.length, studentsLoading, pageSkip]);

  // ── Student Report Metrics Calculation ─────────────────────────────────────

  const studentAttMetrics = useMemo(() => {
    const present = studentAttendance.filter((a) => a.status === "PRESENT").length;
    const absent = studentAttendance.filter((a) => a.status === "ABSENT").length;
    const leave = studentAttendance.filter((a) => a.status === "LEAVE" || a.status === "SICK").length;
    const late = studentAttendance.filter((a) => a.status === "LATE").length;
    const total = studentAttendance.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, leave, late, total, rate };
  }, [studentAttendance]);

  const studentHwMetrics = useMemo(() => {
    const total = studentHomework.length;
    const submitted = studentHomework.filter(
      (h) => h.submission?.status === "SUBMITTED" || h.submission?.status === "CHECKED",
    ).length;
    const checked = studentHomework.filter((h) => h.submission?.status === "CHECKED").length;
    const pending = total - submitted;
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, checked, pending, rate };
  }, [studentHomework]);

  const studentIbadahMetrics = useMemo(() => {
    const daysTracked = studentIbadah.length;
    const quranPages = studentIbadah.reduce((sum, item) => sum + (item.quranPages || 0), 0);
    const prayerDays = studentIbadah.filter(
      (l) => l.fajr || l.dhuhr || l.asr || l.maghrib || l.isha,
    ).length;
    return { daysTracked, quranPages, prayerDays };
  }, [studentIbadah]);

  // ── Download PDF via jsPDF Data Generation ─────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!selectedStudent) return;
    setExporting(true);
    try {
      await downloadReportAsPdf({
        student: selectedStudent,
        from,
        to,
        attendance: studentAttendance,
        homework: studentHomework,
        ibadah: studentIbadah,
        schoolName: user?.name ?? "",
        attMetrics: studentAttMetrics,
        hwMetrics: studentHwMetrics,
        ibadahMetrics: studentIbadahMetrics,
      });
    } catch (err) {
      console.error("Failed to generate PDF report from data", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title={t("teacherPages", "individualReportTitle", lang) || "Individual Student Report"} />

      {/* ── Search & Filter Drawer Trigger (Identical layout to fees/page.tsx) ── */}
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
        <div className="pt-4! pb-2!">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 p-1.5">
            <InputGroup className="h-10 flex-1 rounded-lg bg-white">
              <InputGroupInput
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageSkip(0);
                }}
                placeholder={t("teacherPages", "searchStudentName", lang)}
                aria-label={t("teacherPages", "searchStudentName", lang)}
                className="h-full text-sm"
              />
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4 text-gray-400" />
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="outline"
              type="button"
              size="icon-lg"
              onClick={() => setFiltersOpen(true)}
              className="h-10 w-10 shrink-0 rounded-xl text-gray-600 hover:bg-gray-100"
              aria-label="Open report filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DrawerContent className="h-dvh max-h-dvh !h-dvh !max-h-dvh [--drawer-content-height:100dvh] [--drawer-content-max-height:100dvh] bg-white p-5 flex flex-col rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]" aria-label="Report filters">
          <div className="mb-4 flex items-center justify-between shrink-0">
            <DrawerTitle className="text-lg font-bold text-gray-900">Report Date Range</DrawerTitle>
            <DrawerClose className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X className="h-5 w-5" />
            </DrawerClose>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-6 pr-1">
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                Presets
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "month", name: "This Month" },
                  { id: "30days", name: "Last 30 Days" },
                  { id: "week", name: "This Week" },
                  { id: "custom", name: "Custom Range" },
                ].map((preset) => (
                  <Button
                    variant="ghost"
                    key={preset.id}
                    onClick={() => {
                      if (preset.id === "custom") {
                        setDatePickerOpen(true);
                      } else {
                        applyDatePreset(preset.id as any);
                      }
                    }}
                    className={cn(
                      "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                      activeDatePreset === preset.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Custom Date Range
              </h3>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setDatePickerOpen(true)}
                className="h-11 w-full justify-start font-normal"
                aria-haspopup="dialog"
                aria-expanded={datePickerOpen}
              >
                <Calendar className="text-muted-foreground" />
                {from} — {to}
              </Button>
            </section>
          </div>

          <DrawerClose className="mt-4 h-11 shrink-0 w-full rounded-xl bg-primary-600 text-sm font-semibold text-white">
            Apply Filters
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <DateRangePicker
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        value={pickerRange}
        onApply={handleApplyRange}
        title="Select Report Date Range"
      />

      {error && <ApiErrorBanner message={error} onRetry={loadStudents} />}

      {/* ── Content View ── */}
      {studentsLoading ? (
        <div data-ui-style="classic" className="card mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-2/3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="p-0! px-4! pt-2!">
            <ReportStats
              totalStudents={students.length}
              shownStudents={filteredStudents.length}
              search={search}
              from={from}
              to={to}
              lang={lang}
              attSummary={attSummary}
              hwCount={classHomework.length}
            />
          </div>

          {/* ── Student List (Card container identical to fees/page.tsx) ── */}
          <div data-ui-style="classic" className="card mx-3 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white p-0! shadow-none">
            {filteredStudents.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                {t("common", "noResults", lang)}
              </div>
            ) : (
              visibleStudents.map((student) => {
                return (
                  <button
                    type="button"
                    key={student.id}
                    aria-label={`${student.name}, ${student.adno}`}
                    onClick={() => selectStudent(student)}
                    className="w-full rounded-none p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">
                          {student.name}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {student.adno}
                          {student.class ? ` · ${student.class.name}` : ""}
                        </span>
                      </span>
                       <ChevronRight className="h-4 w-4 my-auto shrink-0 text-gray-300" />
                    </span>
                    {/* <span className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                      <span className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          {student.gender === "FEMALE" ? "Female" : "Male"}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span>{student.parentPhone || "No parent phone"}</span>
                      </span>
                      <span className="text-right text-xs font-medium text-primary-600">
                        Tap for detailed breakdown
                      </span>
                    </span> */}
                  </button>
                );
              })
            )}
          </div>

          {/* ── Pagination (Identical to fees/page.tsx) ── */}
          {filteredStudents.length > 30 && (
            <div className="mx-3 mt-4 rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-center text-xs tabular-nums text-gray-500">
                {t("teacherPages", "pageOfTotal", lang)
                  .replace("{start}", String(pageSkip + 1))
                  .replace("{end}", String(Math.min(pageSkip + 30, filteredStudents.length)))
                  .replace("{total}", String(filteredStudents.length))}
              </p>
              <Pagination className="mt-2" aria-label="Student report pagination">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text={t("teacherPages", "prevBtn", lang)}
                      aria-disabled={currentPage === 1}
                      tabIndex={currentPage === 1 ? -1 : undefined}
                      className={cn("rounded-lg", currentPage === 1 && "pointer-events-none opacity-40")}
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage > 1) setPageSkip((currentPage - 2) * 30);
                      }}
                    />
                  </PaginationItem>
                  {reportPageItems(currentPage, pageCount).map((item, index) => (
                    <PaginationItem
                      key={item === "ellipsis" ? `ellipsis-${index}` : item}
                      className={
                        item !== "ellipsis" && pageCount > 5 && item !== 1 && item !== currentPage && item !== pageCount
                          ? "hidden sm:block"
                          : undefined
                      }
                    >
                      {item === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={item === currentPage}
                          className={cn("rounded-lg", item === currentPage && "border-primary-200 bg-primary-50 text-primary-700")}
                          onClick={(event) => {
                            event.preventDefault();
                            setPageSkip((item - 1) * 30);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text={t("teacherPages", "nextBtn", lang)}
                      aria-disabled={currentPage === pageCount}
                      tabIndex={currentPage === pageCount ? -1 : undefined}
                      className={cn("rounded-lg", currentPage === pageCount && "pointer-events-none opacity-40")}
                      onClick={(event) => {
                        event.preventDefault();
                        if (currentPage < pageCount) setPageSkip(currentPage * 30);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* ── Individual Student Report Drawer (Identical to fees/page.tsx details drawer) ── */}
      <Drawer
        open={selectedStudent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null);
        }}
        swipeDirection="down"
      >
        <DrawerContent className="h-dvh max-h-dvh !h-dvh !max-h-dvh [--drawer-content-height:100dvh] [--drawer-content-max-height:100dvh] bg-background flex flex-col rounded-t-2xl">
          {selectedStudent && (
            <>
              <div className="shrink-0 border-b px-5 py-4 flex items-center justify-between">
                <div>
                  <DrawerTitle className="text-lg font-semibold">{selectedStudent.name}</DrawerTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedStudent.adno}
                    {selectedStudent.class ? ` · ${selectedStudent.class.name}` : ""}
                    {" · "}
                    <span className="font-medium text-primary-700">
                      {from} to {to}
                    </span>
                  </p>
                </div>
                <DrawerClose className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </DrawerClose>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {reportLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600 mb-2" />
                    <p className="text-sm">Loading student records...</p>
                  </div>
                ) : (
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid h-auto w-full grid-cols-4 mb-4">
                      <TabsTrigger value="overview" className="text-xs py-2">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="attendance" className="text-xs py-2">
                        Attendance
                      </TabsTrigger>
                      <TabsTrigger value="homework" className="text-xs py-2">
                        Homework
                      </TabsTrigger>
                      <TabsTrigger value="ibadah" className="text-xs py-2">
                        Ibadah
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Overview Tab ── */}
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                            <UserCheck className="h-4 w-4" /> Attendance
                          </div>
                          <p className="mt-2 text-xl font-bold tabular-nums text-emerald-950">
                            {studentAttMetrics.rate}%
                          </p>
                          <p className="mt-0.5 text-[11px] text-emerald-700">
                            {studentAttMetrics.present}/{studentAttMetrics.total} days present
                          </p>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
                            <BookOpen className="h-4 w-4" /> Homework
                          </div>
                          <p className="mt-2 text-xl font-bold tabular-nums text-blue-950">
                            {studentHwMetrics.rate}%
                          </p>
                          <p className="mt-0.5 text-[11px] text-blue-700">
                            {studentHwMetrics.submitted}/{studentHwMetrics.total} submitted
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                            <BookMarked className="h-4 w-4" /> Quran
                          </div>
                          <p className="mt-2 text-xl font-bold tabular-nums text-amber-950">
                            {studentIbadahMetrics.quranPages}
                          </p>
                          <p className="mt-0.5 text-[11px] text-amber-700">Pages read</p>
                        </div>

                        <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-800">
                            <Flame className="h-4 w-4" /> Prayers
                          </div>
                          <p className="mt-2 text-xl font-bold tabular-nums text-purple-950">
                            {studentIbadahMetrics.prayerDays}
                          </p>
                          <p className="mt-0.5 text-[11px] text-purple-700">Days active</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                          Attendance Breakdown
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/70 px-3 py-1.5 text-xs font-medium text-emerald-800">
                            <span className="size-2 rounded-full bg-emerald-600" />
                            Present: <strong>{studentAttMetrics.present}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100/70 px-3 py-1.5 text-xs font-medium text-red-800">
                            <span className="size-2 rounded-full bg-red-600" />
                            Absent: <strong>{studentAttMetrics.absent}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/70 px-3 py-1.5 text-xs font-medium text-amber-800">
                            <span className="size-2 rounded-full bg-amber-600" />
                            Leave: <strong>{studentAttMetrics.leave}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100/70 px-3 py-1.5 text-xs font-medium text-blue-800">
                            <span className="size-2 rounded-full bg-blue-600" />
                            Late: <strong>{studentAttMetrics.late}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                          Quick Details
                        </h4>
                        <dl className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <dt className="text-muted-foreground">Admission Number</dt>
                            <dd className="mt-0.5 font-semibold text-gray-900">{selectedStudent.adno}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Parent Phone</dt>
                            <dd className="mt-0.5 font-semibold text-gray-900">{selectedStudent.parentPhone || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Gender</dt>
                            <dd className="mt-0.5 font-semibold text-gray-900">{selectedStudent.gender || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Enrolled Class</dt>
                            <dd className="mt-0.5 font-semibold text-gray-900">{selectedStudent.class?.name || "—"}</dd>
                          </div>
                        </dl>
                      </div>
                    </TabsContent>

                    {/* ── Attendance Tab ── */}
                    <TabsContent value="attendance" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Records ({studentAttendance.length})
                        </h4>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {studentAttMetrics.rate}% Attendance
                        </span>
                      </div>
                      {studentAttendance.length === 0 ? (
                        <p className="py-8 text-center text-xs text-muted-foreground">
                          No attendance records in this period.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                          {studentAttendance.map((rec) => {
                            const isPresent = rec.status === "PRESENT";
                            const isAbsent = rec.status === "ABSENT";
                            return (
                              <div key={rec.id} className="flex items-center justify-between p-3 text-xs">
                                <div>
                                  <span className="font-semibold text-gray-900">{rec.date}</span>
                                  {rec.notes && <p className="text-[11px] text-gray-500 mt-0.5">{rec.notes}</p>}
                                </div>
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                    isPresent && "bg-emerald-50 text-emerald-700",
                                    isAbsent && "bg-red-50 text-red-700",
                                    !isPresent && !isAbsent && "bg-amber-50 text-amber-700",
                                  )}
                                >
                                  {rec.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Homework Tab ── */}
                    <TabsContent value="homework" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Homework ({studentHomework.length})
                        </h4>
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {studentHwMetrics.submitted} Submitted
                        </span>
                      </div>
                      {studentHomework.length === 0 ? (
                        <p className="py-8 text-center text-xs text-muted-foreground">
                          No homework assigned in this period.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {studentHomework.map((hw) => {
                            const isSubmitted = hw.submission?.status === "SUBMITTED" || hw.submission?.status === "CHECKED";
                            return (
                              <div
                                key={hw.id}
                                className="rounded-xl border border-gray-100 bg-white p-3 text-xs space-y-1"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-gray-900">{hw.title}</span>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                      isSubmitted ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700",
                                    )}
                                  >
                                    {(hw.submission?.status || "NOT_SUBMITTED").replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="text-gray-500 text-[11px]">
                                  Due: {hw.dueDate ? hw.dueDate.slice(0, 10) : "—"}
                                  {hw.subject ? ` · Subject: ${hw.subject.name}` : ""}
                                </p>
                                {hw.submission?.teacherNote && (
                                  <p className="mt-1 rounded bg-gray-50 p-1.5 text-[11px] text-gray-600">
                                    Note: {hw.submission.teacherNote}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Ibadah Tab ── */}
                    <TabsContent value="ibadah" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Ibadah Logs ({studentIbadah.length} days)
                        </h4>
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          {studentIbadahMetrics.quranPages} Quran Pages
                        </span>
                      </div>
                      {studentIbadah.length === 0 ? (
                        <p className="py-8 text-center text-xs text-muted-foreground">
                          No ibadah records logged in this period.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                          {studentIbadah.map((log) => (
                            <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-gray-900">{log.date}</span>
                                <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                                  {log.fajr && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Fajr: {log.fajr}</span>}
                                  {log.dhuhr && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Dhuhr: {log.dhuhr}</span>}
                                  {log.asr && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Asr: {log.asr}</span>}
                                  {log.maghrib && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Maghrib: {log.maghrib}</span>}
                                  {log.isha && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Isha: {log.isha}</span>}
                                </div>
                              </div>
                              <span className="shrink-0 font-bold text-amber-700">
                                {log.quranPages || 0} pgs
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>

              {/* ── Drawer Footer with Action Buttons ── */}
              <DrawerFooter className="shrink-0 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <ButtonGroup className="w-full [&>button]:flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setPrintModalOpen(true)}
                  >
                    <Printer className="mr-1.5 h-4 w-4" /> Print
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={exporting || reportLoading}
                    onClick={handleDownloadPdf}
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-1.5 h-4 w-4" /> Download PDF
                      </>
                    )}
                  </Button>
                </ButtonGroup>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* ── Printable Report Preview Modal ── */}
      {printModalOpen && selectedStudent && (
        <ReportPrintModal
          student={selectedStudent}
          from={from}
          to={to}
          attendance={studentAttendance}
          homework={studentHomework}
          ibadah={studentIbadah}
          schoolName={user?.name ?? ""}
          onClose={() => setPrintModalOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
