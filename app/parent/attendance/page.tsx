import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { AlertCircle, CalendarDays, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const DAY_HEADER_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"];
import {
  getStudentAttendance,
  type StudentAttendanceResponse,
  type AttendanceStatus,
} from "@/lib/attendance-api";

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

const isPositive = (s: AttendanceStatus) => s === "PRESENT" || s === "EXCUSED";

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

  const locale = lang === "ml" ? "ml-IN" : "en-US";
  const effectiveId = activeStudentId ?? (user?.accessibleStudentIds?.[0] ?? "");
  const activeStudent = user?.accessibleStudents?.find((s) => s.id === effectiveId);

  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const loadData = () => setRetryKey((k) => k + 1);

  useEffect(() => {
    if (!effectiveId || !accessToken || !user?.clientId) return;
    const controller = new AbortController();
    let mounted = true;
    setLoading(true);
    setError(null);

    getStudentAttendance(
      user.clientId,
      accessToken,
      effectiveId,
      user.defaultAcademicYearId ? { academicYearId: user.defaultAcademicYearId } : undefined,
      controller.signal,
    )
      .then((res)  => { if (mounted) setData(res); })
      .catch((err: Error) => { if (!mounted) return; if (err.name !== "AbortError") setError(err.message); })
      .finally(()  => { if (mounted) setLoading(false); });

    return () => { mounted = false; controller.abort(); };
  }, [effectiveId, accessToken, user?.clientId, retryKey]);

  const presentCount  = (data?.summary?.PRESENT  ?? 0) + (data?.summary?.EXCUSED ?? 0);
  const absentCount   = (data?.summary?.ABSENT   ?? 0);
  const otherCount    = (data?.summary?.LATE     ?? 0) + (data?.summary?.LEAVE  ?? 0) + (data?.summary?.SICK ?? 0);
  const total         = data?.total ?? 0;
  const percentage    = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const pctColor      = percentage >= 80 ? "text-emerald-400" : percentage >= 60 ? "text-amber-400" : "text-red-400";
  const ringColor     = percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 52;
  const dashOffset    = circumference * (1 - percentage / 100);

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

      {loading && (
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

      {error && <ApiErrorBanner message={error} onRetry={loadData} />}

      {!loading && !error && data && (
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
                          status && "bg-gradient-to-tr",
                          status === "PRESENT" && "from-emerald-200 to-transparent border border-emerald-200/50",
                          status === "ABSENT" && "from-red-200 to-transparent border border-red-200/50",
                          status === "LATE" && "from-amber-200 to-transparent border border-amber-200/50",
                          status === "EXCUSED" && "from-blue-200 to-transparent border border-blue-200/50",
                          status === "LEAVE" && "from-amber-200 to-transparent border border-amber-200/50",
                          status === "SICK" && "from-orange-200 to-transparent border border-orange-200/50",
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
