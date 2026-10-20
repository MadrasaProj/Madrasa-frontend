import { useState, useMemo, useId } from "react";
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
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

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
  const chartId = useId().replace(/:/g, "");

  const locale = lang === "ml" ? "ml-IN" : "en-US";
  const effectiveId = activeStudentId ?? (user?.accessibleStudentIds?.[0] ?? "");

  const [monthIndex, setMonthIndex] = useState(0);

  const { data, isLoading, error, refetch } = useStudentAttendance(
    { clientId: user?.clientId ?? "", token: accessToken ?? "" },
    effectiveId,
    user?.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : undefined,
  );

  const presentCount  = (data?.summary?.PRESENT  ?? 0) + (data?.summary?.EXCUSED ?? 0);
  const absentCount   = (data?.summary?.ABSENT   ?? 0);
  const otherCount    = (data?.summary?.LATE     ?? 0) + (data?.summary?.LEAVE  ?? 0) + (data?.summary?.SICK ?? 0);
  const total         = data?.total ?? 0;
  const percentage    = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const chartConfig = {
    present: { label: t("parentPages", "presentLower", lang), color: "#059669" },
    absent: { label: t("parentPages", "absentLower", lang), color: "#ef4444" },
    other: { label: t("parentPages", "otherLower", lang), color: "#e5e7eb" },
  } satisfies ChartConfig;
  const chartData = [
    { key: "present", value: presentCount },
    { key: "absent", value: absentCount },
    { key: "other", value: total > 0 ? Math.max(otherCount, total - presentCount - absentCount) : 1 },
  ];

  const availableMonths = useMemo(() => {
    if (!data?.records.length) return [];
    const set = new Set<string>();
    for (const r of data.records) set.add(monthKey(r.date));
    return Array.from(set).sort();
  }, [data?.records]);

  const currentMonth = availableMonths[monthIndex] ?? "";
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const errorMessage = error instanceof Error ? error.message : null;

  if (!user?.clientId) {
    return (
      <DashboardLayout>
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} />
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
        <PageHeader title={t("parentPages", "attendanceTitle", lang)} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No students linked to your account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title={t("parentPages", "attendanceTitle", lang)} />

      {isLoading && (
        <div className="mx-auto max-w-lg space-y-5">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {errorMessage && <ApiErrorBanner message={errorMessage} onRetry={() => refetch()} />}

      {!isLoading && !errorMessage && data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-lg space-y-5">
          <section className="rounded-3xl border border-gray-100 bg-white px-5 py-7 text-center sm:px-8">
            <ChartContainer
              config={chartConfig}
              className="mx-auto h-[150px] w-[260px] max-w-full"
              role="img"
              aria-label={`${t("parentPages", "attendanceRate", lang)}: ${percentage}%`}
            >
              <PieChart accessibilityLayer>
                <defs>
                  <linearGradient id={`${chartId}-present`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#047857" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                  <linearGradient id={`${chartId}-absent`} x1="0%" y1="0%" x2="100%" y2="0%">
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
                  outerRadius={110}
                  cornerRadius={8}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={entry.key === "other" ? "var(--color-other)" : `url(#${chartId}-${entry.key})`}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div  style={{
              transform: "translate(-50%, -170px)",
            }} className="  absolute left-1/2 top-1/2  text-center">

            <p className="-mt-2 text-4xl font-bold tracking-tight text-gray-900">{percentage}%</p>
            <p className="mt-1 text-xs font-medium text-gray-500">{t("parentPages", "attendanceRate", lang)}</p>
            </div>
            <div className={cn("mt-7 grid divide-x divide-gray-200 border-t border-gray-100 pt-5", otherCount > 0 ? "grid-cols-4" : "grid-cols-3")}>
              <div className="min-w-0 px-1">
                <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{presentCount}</p>
                <p className="mt-0.5 text-xs text-gray-500">{t("parentPages", "presentLower", lang)}</p>
              </div>
              <div className="min-w-0 px-1">
                <p className="text-xl font-semibold text-red-600 sm:text-2xl">{absentCount}</p>
                <p className="mt-0.5 text-xs text-gray-500">{t("parentPages", "absentLower", lang)}</p>
              </div>
              {otherCount > 0 && (
                <div className="min-w-0 px-1">
                  <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{otherCount}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{t("parentPages", "otherLower", lang)}</p>
                </div>
              )}
              <div className="min-w-0 px-1">
                <p className="text-xl font-semibold text-gray-900 sm:text-2xl">{total}</p>
                <p className="mt-0.5 text-xs text-gray-500">{t("parentPages", "totalLower", lang)}</p>
              </div>
            </div>
          </section>

          {/* ── Calendar ────────────────────────────────────────────────────── */}
          {availableMonths.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">
                {t("parentPages", "noAttendanceRecords", lang)}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setMonthIndex((i) => Math.max(i - 1, 0))}
                  disabled={monthIndex === 0}
                  className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="text-sm font-bold text-gray-800">
                  {currentMonth ? monthLabel(currentMonth, locale) : ""}
                </h2>
                <button
                  onClick={() => setMonthIndex((i) => Math.min(i + 1, availableMonths.length - 1))}
                  disabled={monthIndex === availableMonths.length - 1}
                  className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors"
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
                    const cfg = status ? STATUS_CONFIG[status] : null;
                    const isToday = dateStr === todayStr;

                    return (
                      <div
                        key={dateStr}
                        className={cn(
                          "aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                          cfg?.bg,
                          !status && "bg-gray-50/50",
                          isToday && "ring-2 ring-emerald-400 ring-offset-1",
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

          <div className="pb-8" />
        </motion.div>
      )}
    </DashboardLayout>
  );
}
