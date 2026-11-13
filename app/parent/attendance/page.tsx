import { useState, useMemo, useId, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
} from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

const DAY_HEADER_KEYS = [
  "daySun",
  "dayMon",
  "dayTue",
  "dayWed",
  "dayThu",
  "dayFri",
  "daySat",
];
import type { AttendanceStatus } from "@/lib/attendance-api";
import { useStudentAttendance } from "@/lib/queries";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; labelMl: string; dot: string; bg: string }
> = {
  PRESENT: {
    label: "Present",
    labelMl: "ഹാജർ",
    dot: "bg-primary-500",
    bg: "bg-primary-50",
  },
  ABSENT: {
    label: "Absent",
    labelMl: "ഗൈർഹാജർ",
    dot: "bg-red-500",
    bg: "bg-red-50",
  },
  LATE: {
    label: "Late",
    labelMl: "വൈകി",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
  },
  EXCUSED: {
    label: "Excused",
    labelMl: "അനുവദിച്ച",
    dot: "bg-blue-400",
    bg: "bg-blue-50",
  },
  LEAVE: {
    label: "Leave",
    labelMl: "ലീവ്",
    dot: "bg-amber-400",
    bg: "bg-amber-50",
  },
  SICK: {
    label: "Sick",
    labelMl: "അസുഖം",
    dot: "bg-orange-400",
    bg: "bg-orange-50",
  },
};

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

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
  const chartId = useId().replace(/:/g, "");
  const [searchParams] = useSearchParams();

  const locale = lang === "ml" ? "ml-IN" : "en-US";
  const effectiveId = activeStudentId ?? user?.accessibleStudentIds?.[0] ?? "";

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
  const activeMonthKey = `${currentYear}-${currentMonthNum}`; // e.g. "2026-10" in local timezone
  const todayStr = `${currentYear}-${currentMonthNum}-${String(now.getDate()).padStart(2, "0")}`;

  // Read optional date parameter for highlight if present
  const paramDate = searchParams.get("date");
  const paramMonth = searchParams.get("month");

  const { data, isLoading, error, refetch } = useStudentAttendance(
    { clientId: user?.clientId ?? "", token: accessToken ?? "" },
    effectiveId,
    user?.defaultAcademicYearId
      ? { academicYearId: user.defaultAcademicYearId }
      : undefined,
  );

  const presentCount =
    (data?.summary?.PRESENT ?? 0) + (data?.summary?.EXCUSED ?? 0);
  const absentCount = data?.summary?.ABSENT ?? 0;
  const otherCount =
    (data?.summary?.LATE ?? 0) +
    (data?.summary?.LEAVE ?? 0) +
    (data?.summary?.SICK ?? 0);
  const total = data?.total ?? 0;
  const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const chartConfig = {
    present: {
      label: t("parentPages", "presentLower", lang),
      color: "var(--primary)",
    },
    absent: { label: t("parentPages", "absentLower", lang), color: "#ef4444" },
    other: { label: t("parentPages", "otherLower", lang), color: "#e5e7eb" },
  } satisfies ChartConfig;
  const chartData = [
    { key: "present", value: presentCount },
    { key: "absent", value: absentCount },
    {
      key: "other",
      value:
        total > 0
          ? Math.max(otherCount, total - presentCount - absentCount)
          : 1,
    },
  ];

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
    if (!currentMonth || !data?.records)
      return new Map<string, AttendanceStatus>();
    const map = new Map<string, AttendanceStatus>();
    for (const r of data.records) {
      if (r.date.startsWith(currentMonth))
        map.set(r.date.slice(0, 10), r.status);
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
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">
            Session expired. Please log in again.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!effectiveId) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">
            No students linked to your account.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "attendanceTitle", lang)} />

      {isLoading && (
        <div className="  space-y-5">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {errorMessage && (
        <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />
      )}

      {!isLoading && !errorMessage && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="  space-y-5"
        >
          <section className="rounded-3xl relative  bg-white px-5 py-7 text-center sm:px-8">
            <ChartContainer
              config={chartConfig}
              className="mx-auto h-[150px] w-[260px] max-w-full"
              role="img"
              aria-label={`${t("parentPages", "attendanceRate", lang)}: ${percentage}%`}
            >
              <PieChart accessibilityLayer>
                <defs>
                  <linearGradient
                    id={`${chartId}-present`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#047857" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                  <linearGradient
                    id={`${chartId}-absent`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#fca5a5" />
                  </linearGradient>
                </defs>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="key"
                  startAngle={180}
                  endAngle={0}
                  cx="50%"
                  cy="95%"
                  innerRadius={70}
                  outerRadius={90}
                  cornerRadius={3}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={
                        entry.key === "other"
                          ? "var(--color-other)"
                          : `url(#${chartId}-${entry.key})`
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div
              style={{
                transform: "translate(-50%, -30px)",
              }}
              className="  absolute left-1/2 top-1/2  text-center"
            >
              <p className="-mt-2 text-3xl font-bold tracking-tight text-gray-900">
                {percentage}%
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {t("parentPages", "attendanceRate", lang)}
              </p>
            </div>
            <div
              className={cn(
                "mt-7 grid divide-x divide-gray-200 border-t border-gray-100 pt-5",
                otherCount > 0 ? "grid-cols-4" : "grid-cols-3",
              )}
            >
              <div className="min-w-0 px-1">
                <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  {presentCount}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("parentPages", "presentLower", lang)}
                </p>
              </div>
              <div className="min-w-0 px-1">
                <p className="text-xl font-semibold text-red-600 sm:text-2xl">
                  {absentCount}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("parentPages", "absentLower", lang)}
                </p>
              </div>
              {otherCount > 0 && (
                <div className="min-w-0 px-1">
                  <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                    {otherCount}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t("parentPages", "otherLower", lang)}
                  </p>
                </div>
              )}
              <div className="min-w-0 px-1">
                <p className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  {total}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("parentPages", "totalLower", lang)}
                </p>
              </div>
            </div>
          </section>

         

       
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
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors cursor-pointer"
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
                              status === "PRESENT" && "from-primary-200 to-transparent border border-primary-200/50",
                              status === "ABSENT" && "from-red-200 to-transparent border border-red-200/50",
                              status === "LATE" && "from-amber-200 to-transparent border border-amber-200/50",
                              status === "EXCUSED" && "from-blue-200 to-transparent border border-blue-200/50",
                              status === "LEAVE" && "from-amber-200 to-transparent border border-amber-200/50",
                              status === "SICK" && "from-orange-200 to-transparent border border-orange-200/50",
                              !status && "bg-gray-50/50",
                              isToday && "ring-2 ring-primary-400 ring-offset-1",
                              isTargetDate && "ring-2 ring-indigo-500 ring-offset-1 shadow-md bg-indigo-50/50",
                            )}>
                            <span className={cn(
                              "text-sm font-semibold",
                              status === "PRESENT" && "text-primary-700",
                              status === "ABSENT" && "text-red-700",
                              status === "LATE" && "text-amber-700",
                              status === "EXCUSED" && "text-blue-700",
                              status === "LEAVE" && "text-amber-700",
                              status === "SICK" && "text-orange-700",
                              !status && "text-gray-300",
                              isToday && !status && "text-primary-600",
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
          

          <div className="pb-8" />
        </motion.div>
      )}
    </DashboardLayout>
  );
}
