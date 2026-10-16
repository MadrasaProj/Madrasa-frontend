import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { AlertCircle, CalendarDays, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Calendar, Filter } from "lucide-react";

const DAY_HEADER_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"];
import type { AttendanceStatus } from "@/lib/attendance-api";
import { useStudentAttendance } from "@/lib/queries";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; labelMl: string; dot: string; bg: string }
> = {
  PRESENT:  { label: "Present",  labelMl: "ഹാജർ",     dot: "bg-emerald-500", bg: "bg-emerald-50"  },
  ABSENT:   { label: "Absent",   labelMl: "ഗൈർഹാജർ", dot: "bg-red-500",     bg: "bg-red-50"      },
  LATE:     { label: "Late",     labelMl: "വൈകി",      dot: "bg-amber-500",   bg: "bg-amber-50"    },
  EXCUSED:  { label: "Excused",  labelMl: "അനുവദിച്ച", dot: "bg-blue-400",   bg: "bg-blue-50"     },
  LEAVE:    { label: "Leave",    labelMl: "ലീവ്",       dot: "bg-amber-400",  bg: "bg-amber-50"    },
  SICK:     { label: "Sick",     labelMl: "അസുഖം",     dot: "bg-orange-400", bg: "bg-orange-50"   },
};

function monthKey(dateStr: string) { return dateStr.slice(0, 7); }

function monthLabel(key: string, locale: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

const DAY_HEADERS = DAY_HEADER_KEYS;

export default function ParentAttendancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();
  const [searchParams] = useSearchParams();

  const locale = lang === "ml" ? "ml-IN" : "en-US";
  const effectiveId = activeStudentId ?? (user?.accessibleStudentIds?.[0] ?? "");
  const activeStudent = user?.accessibleStudents?.find((s) => s.id === effectiveId);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
  const activeMonthKey = `${currentYear}-${currentMonthNum}`; // e.g. "2026-10" in local timezone
  const todayStr = `${currentYear}-${currentMonthNum}-${String(now.getDate()).padStart(2, "0")}`;

  // Read optional date parameter for highlight if present
  const paramDate = searchParams.get("date");
  const paramMonth = searchParams.get("month");

  const { data, isLoading, error, refetch, isRefetching } = useStudentAttendance(
    { clientId: user?.clientId ?? "", token: accessToken ?? "" },
    effectiveId,
    user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : undefined,
  );

  const presentCount  = (data?.summary?.PRESENT  ?? 0) + (data?.summary?.EXCUSED ?? 0);
  const absentCount   = (data?.summary?.ABSENT   ?? 0);
  const otherCount    = (data?.summary?.LATE     ?? 0) + (data?.summary?.LEAVE  ?? 0) + (data?.summary?.SICK ?? 0);
  const total         = data?.total ?? 0;
  const percentage    = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const pctColor      = percentage >= 80 ? "text-emerald-400" : percentage >= 60 ? "text-amber-400" : "text-red-400";
  const ringColor     = percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 52;
  const dashOffset    = circumference * (1 - percentage / 100);

  // Always include the current active month in chronological order
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(activeMonthKey);
    if (paramMonth) set.add(paramMonth);
    if (data?.records?.length) {
      for (const r of data.records) set.add(monthKey(r.date));
    }
    return Array.from(set).sort();
  }, [data?.records, activeMonthKey, paramMonth]);

  // Default view is ALWAYS the current active month (Issue 10)
  const [selectedMonth, setSelectedMonth] = useState<string>(activeMonthKey);
  const [viewMode, setViewMode] = useState<"calendar" | "range">("calendar");
  const [rangePreset, setRangePreset] = useState<"THIS_MONTH" | "LAST_MONTH" | "LAST_90" | "ALL" | "CUSTOM">("THIS_MONTH");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));

  const applyRangePreset = (p: typeof rangePreset) => {
    setRangePreset(p);
    const n = new Date();
    const today = n.toISOString().slice(0, 10);
    if (p === "THIS_MONTH") {
      const d = new Date(n.getFullYear(), n.getMonth(), 1);
      setCustomFrom(d.toISOString().slice(0, 10));
      setCustomTo(today);
    } else if (p === "LAST_MONTH") {
      const first = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const last = new Date(n.getFullYear(), n.getMonth(), 0);
      setCustomFrom(first.toISOString().slice(0, 10));
      setCustomTo(last.toISOString().slice(0, 10));
    } else if (p === "LAST_90") {
      const d = new Date(n);
      d.setDate(d.getDate() - 90);
      setCustomFrom(d.toISOString().slice(0, 10));
      setCustomTo(today);
    } else if (p === "ALL") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  // Sync if explicit month query param changes and user requested it
  useEffect(() => {
    if (paramMonth && paramMonth === activeMonthKey) {
      setSelectedMonth(activeMonthKey);
    }
  }, [paramMonth, activeMonthKey]);

  // Current month key: falls back to activeMonthKey if selectedMonth is not in available list
  const currentMonth = availableMonths.includes(selectedMonth)
    ? selectedMonth
    : activeMonthKey;

  const monthIndex = availableMonths.indexOf(currentMonth);

  const [cy, cm] = currentMonth ? currentMonth.split("-").map(Number) : [0, 0];
  const calendarDays = currentMonth ? getCalendarDays(cy, cm - 1) : [];
  const dayRecords = useMemo(() => {
    if (!currentMonth || !data?.records) return new Map<string, AttendanceStatus>();
    const map = new Map<string, AttendanceStatus>();
    for (const r of data.records) {
      if (r.date.startsWith(currentMonth)) map.set(r.date.slice(0, 10), r.status);
    }
    return map;
  }, [currentMonth, data?.records]);

  const filteredRangeRecords = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((r) => {
      const d = r.date.slice(0, 10);
      return (!customFrom || d >= customFrom) && (!customTo || d <= customTo);
    });
  }, [data?.records, customFrom, customTo]);

  const rangeSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let sick = 0;
    let late = 0;
    let excused = 0;
    for (const r of filteredRangeRecords) {
      if (r.status === "PRESENT") present++;
      else if (r.status === "ABSENT") absent++;
      else if (r.status === "LEAVE") leave++;
      else if (r.status === "SICK") sick++;
      else if (r.status === "LATE") late++;
      else if (r.status === "EXCUSED") excused++;
    }
    const effectivePresent = present + excused;
    const totalDays = filteredRangeRecords.length;
    const pct = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0;
    return { present, absent, leave, sick, late, excused, totalDays, pct };
  }, [filteredRangeRecords]);

  const errorMessage = error instanceof Error ? error.message : null;

  if (!user?.clientId) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Session expired. Please log in again.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!effectiveId) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} back />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No students linked to your account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={t("parentPages", "attendanceTitle", lang)}
        subtitle={activeStudent?.name}
        back
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-3xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-5 w-24 mt-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {errorMessage && <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />}

      {!isLoading && !errorMessage && data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          {/* ── Hero card ──────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-3xl p-5 text-white">
            <div className="flex items-end gap-6">
              <div className="flex-1 space-y-2">
                <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">
                  {t("parentPages", "attendanceRate", lang)}
                </p>
                <p className="text-white/80 text-sm">
                  {activeStudent?.name}
                  {activeStudent?.className ? ` · ${activeStudent.className}` : ""}
                </p>
                <div className="space-y-2 pt-2">

                <div className="flex w-full gap-6">
                    <div className="flex flex-1 items-center justify-between border-b border-white/20 pb-1.5">
                    <span className="text-[11px] text-emerald-200 lowercase">{t("parentPages", "presentLower", lang)}</span>
                    <span className="text-lg font-black">{presentCount}</span>
                  </div>
                  <div className="flex flex-1  items-center justify-between border-b border-white/20 pb-1.5">
                    <span className="text-[11px] text-emerald-200 lowercase">{t("parentPages", "absentLower", lang)}</span>
                    <span className="text-lg font-black">{absentCount}</span>
                  </div>
                </div>
                  {otherCount > 0 && (
                    <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
                      <span className="text-[11px] text-emerald-200 lowercase">{t("parentPages", "otherLower", lang)}</span>
                      <span className="text-lg font-black">{otherCount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pb-1.5  border-b border-white/20">
                    <span className="text-[11px] text-emerald-200 lowercase">{t("parentPages", "totalLower", lang)}</span>
                    <span className="text-lg font-black">{total}</span>
                  </div>
                </div>
              </div>
              <div className="relative shrink-0">
                <svg width="140" height="140" className="-rotate-90 drop-shadow-md">
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={percentage >= 80 ? "#ffffff" : percentage >= 60 ? "#ffffff" : "#ffffff"} />
                      <stop offset="100%" stopColor={percentage >= 80 ? "#22c55e" : percentage >= 60 ? "#eab308" : "#ef4444"} />
                    </linearGradient>
                  </defs>
                  <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="18" />
                  <circle
                    cx="70" cy="70" r="52" fill="none"
                    stroke="url(#ringGrad)" strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-black">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>

          {/* ── View Mode Toggle ───────────────────────────────────────── */}
          <div className="flex bg-gray-100 p-1 rounded-2xl gap-1 max-w-md">
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
                viewMode === "calendar" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-800",
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{lang === "ml" ? "മാസ കലണ്ടർ" : "Month Calendar"}</span>
            </button>
            <button
              onClick={() => setViewMode("range")}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
                viewMode === "range" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-800",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === "ml" ? "കസ്റ്റം തീയതി ഫിൽട്ടർ" : "Custom Date Range"}</span>
            </button>
          </div>

          {viewMode === "calendar" ? (
            <div className="space-y-4 lg:flex lg:gap-4 lg:items-start lg:space-y-0">
              {/* ── Calendar ────────────────────────────────────────────────────── */}
              {availableMonths.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center lg:flex-1">
                  <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-gray-400 text-sm">
                    {t("parentPages", "noAttendanceRecords", lang)}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:max-w-sm lg:flex-1">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={() => {
                        const prevIdx = Math.max(monthIndex - 1, 0);
                        setSelectedMonth(availableMonths[prevIdx]);
                      }}
                      disabled={monthIndex <= 0}
                      className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-gray-800">
                        {currentMonth ? monthLabel(currentMonth, locale) : ""}
                      </h2>
                      {currentMonth !== activeMonthKey && (
                        <button
                          onClick={() => setSelectedMonth(activeMonthKey)}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title={lang === "ml" ? "നിലവിലെ മാസത്തിലേക്ക് പോകുക" : "Jump to active month"}
                        >
                          {lang === "ml" ? "ഈ മാസം" : "Current"}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const nextIdx = Math.min(monthIndex + 1, availableMonths.length - 1);
                        setSelectedMonth(availableMonths[nextIdx]);
                      }}
                      disabled={monthIndex >= availableMonths.length - 1}
                      className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {DAY_HEADERS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-1">
                        {t("parentPages", d as any, lang)}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentMonth}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-7 gap-1"
                    >
                      {calendarDays.map((day, i) => {
                        if (day === null) {
                          return <div key={`e-${i}`} />;
                        }
                        const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
                        const status = dayRecords.get(dateStr) ?? null;
                        const isToday = dateStr === todayStr;
                        const isTargetDate = dateStr === paramDate;

                        return (
                          <div
                            key={dateStr}
                            className={cn(
                              "aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                              status && "bg-gradient-to-tr",
                              status === "PRESENT" && "from-emerald-200 to-transparent border border-emerald-200/50",
                              status === "ABSENT" && "from-red-200 to-transparent border border-red-200/50",
                              status === "LATE" && "from-amber-200 to-transparent border border-amber-200/50",
                              status === "EXCUSED" && "from-blue-200 to-transparent border border-blue-200/50",
                              status === "LEAVE" && "from-amber-200 to-transparent border border-amber-200/50",
                              status === "SICK" && "from-orange-200 to-transparent border border-orange-200/50",
                              !status && "bg-gray-50/50",
                              isToday && "ring-2 ring-emerald-400 ring-offset-1",
                              isTargetDate && "ring-2 ring-indigo-500 ring-offset-1 shadow-md bg-indigo-50/50",
                            )}>
                            <span className={cn(
                              "text-sm font-semibold",
                              status === "PRESENT" && "text-emerald-700",
                              status === "ABSENT" && "text-red-700",
                              status === "LATE" && "text-amber-700",
                              status === "EXCUSED" && "text-blue-700",
                              status === "LEAVE" && "text-amber-700",
                              status === "SICK" && "text-orange-700",
                              !status && "text-gray-300",
                              isToday && !status && "text-emerald-600",
                            )}>
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED", "LEAVE", "SICK"] as AttendanceStatus[]).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <div key={s} className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                          <span className="text-[10px] text-gray-500">{cfg[lang === "ml" ? "labelMl" : "label"]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Daily Log ──────────────────────────────────────────────────── */}
              {currentMonth && (() => {
                const monthRecs = data?.records.filter((r) => r.date.startsWith(currentMonth)) ?? [];
                return monthRecs.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:flex-1 lg:max-w-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      {monthLabel(currentMonth, locale)}
                    </p>
                    <div className="space-y-2">
                      {monthRecs.map((rec) => {
                        const cfg = STATUS_CONFIG[rec.status];
                        const d = new Date(rec.date);
                        const day = d.getDate();
                        const dayName = d.toLocaleDateString(locale, { weekday: "short" });
                        return (
                          <div key={rec.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className={cn("w-0.5 h-8 rounded-full shrink-0", cfg.dot)} />
                            <div className="text-center shrink-0">
                              <p className="text-[10px] text-gray-400 leading-none">{dayName}</p>
                              <p className="text-base font-bold text-gray-800 leading-tight">{day}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {cfg[lang === "ml" ? "labelMl" : "label"]}
                              </p>
                              {rec.notes && <p className="text-xs text-gray-400 truncate">{rec.notes}</p>}
                            </div>
                            <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            /* ── Custom Range View ────────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Filter Range</span>
                    {customFrom && customTo && (
                      <span className="text-[11px] font-normal normal-case text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                        {customFrom} to {customTo}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "THIS_MONTH", label: "This Month" },
                        { id: "LAST_MONTH", label: "Last Month" },
                        { id: "LAST_90", label: "Last 90 Days" },
                        { id: "ALL", label: "All Year" },
                        { id: "CUSTOM", label: "Custom" },
                      ] as { id: typeof rangePreset; label: string }[]
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyRangePreset(p.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer",
                          rangePreset === p.id
                            ? "bg-emerald-600 text-white font-semibold shadow-sm"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {rangePreset === "CUSTOM" && (
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">From:</span>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">To:</span>
                      <input
                        type="date"
                        value={customTo}
                        max={todayStr}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Range Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">Present</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{rangeSummary.present + rangeSummary.excused}</p>
                </div>
                <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-red-800 uppercase tracking-wide">Absent</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{rangeSummary.absent}</p>
                </div>
                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Leave / Sick</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{rangeSummary.leave + rangeSummary.sick}</p>
                </div>
                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4">
                  <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">Period Attendance</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{rangeSummary.pct}%</p>
                </div>
              </div>

              {/* Range Records List */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">
                  Attendance History ({filteredRangeRecords.length} days)
                </h3>
                {filteredRangeRecords.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No attendance records found for this period.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredRangeRecords.map((rec) => {
                      const cfg = STATUS_CONFIG[rec.status];
                      const d = new Date(rec.date);
                      const dateFormatted = d.toLocaleDateString(locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <div key={rec.id} className="py-2.5 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                            <div>
                              <p className="font-medium text-gray-800">{dateFormatted}</p>
                              {rec.notes && <p className="text-xs text-gray-400">{rec.notes}</p>}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-semibold",
                              cfg.bg,
                              rec.status === "PRESENT" ? "text-emerald-700" : rec.status === "ABSENT" ? "text-red-700" : "text-amber-700",
                            )}
                          >
                            {cfg[lang === "ml" ? "labelMl" : "label"]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pb-8" />
        </motion.div>
      )}
    </DashboardLayout>
  );
}
