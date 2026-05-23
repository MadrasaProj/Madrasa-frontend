import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiErrorBanner } from "@/components/ui/ApiErrorBanner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { AlertCircle, CalendarDays, CheckCircle2, XCircle, Clock, FileX } from "lucide-react";
import {
  getStudentAttendance,
  type StudentAttendanceResponse,
  type AttendanceStatus,
} from "@/lib/attendance-api";

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; labelMl: string; bar: string; icon: typeof CheckCircle2; iconColor: string; bg: string }
> = {
  PRESENT:  { label: "Present",  labelMl: "ഹാജർ",     bar: "bg-emerald-500", icon: CheckCircle2, iconColor: "text-emerald-500", bg: "bg-emerald-50" },
  ABSENT:   { label: "Absent",   labelMl: "ഗൈർഹാജർ", bar: "bg-red-500",     icon: XCircle,      iconColor: "text-red-500",     bg: "bg-red-50"     },
  LATE:     { label: "Late",     labelMl: "വൈകി",      bar: "bg-amber-500",   icon: Clock,        iconColor: "text-amber-500",   bg: "bg-amber-50"   },
  EXCUSED:  { label: "Excused",  labelMl: "അനുവദിച്ച", bar: "bg-blue-400",   icon: CheckCircle2, iconColor: "text-blue-400",    bg: "bg-blue-50"    },
  LEAVE:    { label: "Leave",    labelMl: "ലീവ്",       bar: "bg-amber-400",  icon: Clock,        iconColor: "text-amber-400",   bg: "bg-amber-50"   },
  SICK:     { label: "Sick",     labelMl: "അസുഖം",     bar: "bg-orange-400", icon: Clock,        iconColor: "text-orange-400",  bg: "bg-orange-50"  },
};

const isPositive = (s: AttendanceStatus) => s === "PRESENT" || s === "EXCUSED";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDay(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short" }),
    day: d.getDate(),
    month: d.toLocaleDateString(locale, { month: "short" }),
    full: d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }),
  };
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string, locale: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-3xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-5 w-24 mt-2" />
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ParentAttendancePage() {
  const { lang } = useLanguageStore();
  const { user, accessToken, activeStudentId } = useAuthStore();

  const locale = lang === "ml" ? "ml-IN" : "en-US";
  const effectiveId = activeStudentId ?? (user?.accessibleStudentIds?.[0] ?? "");
  const activeStudent = user?.accessibleStudents?.find((s) => s.id === effectiveId);

  const [data, setData]       = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

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

  // ── Stats ──────────────────────────────────────────────────────────────────

  const presentCount  = (data?.summary?.PRESENT  ?? 0) + (data?.summary?.EXCUSED ?? 0);
  const absentCount   = (data?.summary?.ABSENT   ?? 0);
  const otherCount    = (data?.summary?.LATE     ?? 0) + (data?.summary?.LEAVE  ?? 0) + (data?.summary?.SICK ?? 0);
  const total         = data?.total ?? 0;
  const percentage    = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const pctColor      = percentage >= 80 ? "text-emerald-400" : percentage >= 60 ? "text-amber-400" : "text-red-400";
  const ringColor     = percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 40;
  const dashOffset    = circumference * (1 - percentage / 100);

  // ── Month-grouped records ──────────────────────────────────────────────────

  const grouped = useMemo(() => {
    if (!data?.records.length) return [];
    const map = new Map<string, typeof data.records>();
    for (const rec of data.records) {
      const k = monthKey(rec.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(rec);
    }
    return Array.from(map.entries());
  }, [data?.records]);

  // ── Early exits ───────────────────────────────────────────────────────────

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

      {loading && <LoadingSkeleton />}

      {error && <ApiErrorBanner message={error} onRetry={loadData} />}

      {!loading && !error && data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

          {/* ── Hero card ──────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-emerald-700 to-teal-600 rounded-3xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">
                  {lang === "ml" ? "ഒരു ദൃഷ്ടിയിൽ" : "At a Glance"}
                </p>
                <p className="text-white/80 text-sm">
                  {activeStudent?.name}
                  {activeStudent?.className ? ` · ${activeStudent.className}` : ""}
                </p>
                <p className={cn("text-5xl font-black mt-2", pctColor.replace("text-", "text-"))}
                   style={{ color: ringColor }}>
                  {percentage}%
                </p>
                <p className="text-emerald-200 text-xs mt-1">
                  {lang === "ml" ? "ഹാജർ നിരക്ക്" : "Attendance Rate"}
                </p>
              </div>

              {/* SVG ring */}
              <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={ringColor} strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
            </div>

            {/* Stat chips */}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2 text-center">
                <p className="text-lg font-black">{presentCount}</p>
                <p className="text-[10px] text-emerald-200">{lang === "ml" ? "ഹാജർ" : "Present"}</p>
              </div>
              <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2 text-center">
                <p className="text-lg font-black">{absentCount}</p>
                <p className="text-[10px] text-emerald-200">{lang === "ml" ? "ഗൈർഹാജർ" : "Absent"}</p>
              </div>
              {otherCount > 0 && (
                <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2 text-center">
                  <p className="text-lg font-black">{otherCount}</p>
                  <p className="text-[10px] text-emerald-200">{lang === "ml" ? "മറ്റുള്ളവ" : "Other"}</p>
                </div>
              )}
              <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2 text-center">
                <p className="text-lg font-black">{total}</p>
                <p className="text-[10px] text-emerald-200">{lang === "ml" ? "ആകെ" : "Total"}</p>
              </div>
            </div>
          </div>

          {/* ── Records ────────────────────────────────────────────────────── */}
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileX className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">
                {lang === "ml" ? "റെക്കോർഡുകൾ ഒന്നും കണ്ടെത്തിയില്ല" : "No attendance records found"}
              </p>
            </div>
          ) : (
            grouped.map(([month, recs], gi) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.06 }}
              >
                {/* Month header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {monthLabel(month, locale)}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {recs.filter((r) => isPositive(r.status)).length}/{recs.length}
                  </span>
                </div>

                {/* Records for this month */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {recs.map((rec, i) => {
                    const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.ABSENT;
                    const Icon = cfg.icon;
                    const { weekday, day, month: mon } = formatDay(rec.date, locale);
                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: gi * 0.06 + i * 0.025 }}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {/* Left color bar */}
                        <div className={cn("w-1 self-stretch rounded-full shrink-0", cfg.bar)} />

                        {/* Date block */}
                        <div className="w-10 text-center shrink-0">
                          <p className="text-[10px] text-gray-400 uppercase leading-none">{weekday}</p>
                          <p className="text-xl font-black text-gray-800 leading-tight">{day}</p>
                          <p className="text-[10px] text-gray-400 leading-none">{mon}</p>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {cfg[lang === "ml" ? "labelMl" : "label"]}
                          </p>
                          {(rec.class?.name || rec.notes) && (
                            <p className="text-xs text-gray-400 truncate">
                              {[rec.class?.name, rec.notes].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>

                        {/* Icon */}
                        <Icon className={cn("w-5 h-5 shrink-0", cfg.iconColor)} />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))
          )}

          <div className="pb-8" />
        </motion.div>
      )}
    </DashboardLayout>
  );
}
